import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import HTTPException
from sqlalchemy import create_engine, event
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, select

from Backend.api.routes.auth import AccountDeletionRequest, delete_account
from Backend.api.routes.maintenance import purge_deleted_accounts
from Backend.api.deps import get_current_user
from Backend.core.account_deletion import purge_expired_accounts
from Backend.core.config import settings
from Database.models import (
    application,
    application_status_history,
    audit_event,
    education_record,
    notification,
    password_reset,
    profile_document,
    program,
    user,
    user_profile,
    user_settings,
)


class TestAccountDeletion(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        event.listen(
            self.engine,
            "connect",
            lambda connection, _: connection.execute("PRAGMA foreign_keys=ON"),
        )
        SQLModel.metadata.create_all(self.engine)
        self.session = Session(self.engine)
        self.account = user(name="Test User", email="delete@example.test")
        self.program = program(name="Internship", description="Test program")
        self.session.add_all([self.account, self.program])
        self.session.commit()
        self.session.refresh(self.account)
        self.session.refresh(self.program)
        self.request = SimpleNamespace(client=SimpleNamespace(host="127.0.0.1"))

    def tearDown(self):
        self.session.close()
        self.engine.dispose()

    def test_requires_exact_delete_confirmation(self):
        with self.assertRaises(HTTPException) as raised:
            delete_account(
                AccountDeletionRequest(confirmation="DELETE"),
                self.request,
                self.account,
                self.session,
            )

        self.assertEqual(raised.exception.status_code, 422)
        self.assertIsNotNone(self.session.get(user, self.account.id))

    def test_cleanup_endpoint_requires_cron_secret(self):
        with patch.object(settings, "cron_secret", "test-cron-secret"):
            with self.assertRaises(HTTPException) as raised:
                purge_deleted_accounts(None, self.session)

        self.assertEqual(raised.exception.status_code, 401)

    def test_deletion_request_retains_account_and_related_data(self):
        application_row = application(
            user_id=self.account.id,
            program_id=self.program.id,
            status="submitted",
            resume_path="resumes/test-user.pdf",
        )
        document = profile_document(
            user_id=self.account.id,
            filename="profile.pdf",
            storage_path="profile-documents/test-user.pdf",
            file_size=1,
        )
        self.session.add_all(
            [
                application_row,
                document,
                user_profile(user_id=self.account.id),
                education_record(
                    user_id=self.account.id,
                    institution="University",
                    qualification="Degree",
                    programme="Computing",
                ),
                notification(user_id=self.account.id, message="Test notification"),
                user_settings(
                    user_id=self.account.id,
                    setting_name="theme",
                    setting_value="light",
                ),
                password_reset(
                    user_id=self.account.id,
                    token_hash="test-hash",
                    expires_at=datetime.now(timezone.utc),
                ),
            ]
        )
        self.session.commit()
        self.session.refresh(application_row)

        with patch("Backend.core.account_deletion.storage.delete_file") as delete_file:
            response = delete_account(
                AccountDeletionRequest(confirmation="delete"),
                self.request,
                self.account,
                self.session,
            )

        self.assertEqual(response.status_code, 204)
        delete_file.assert_not_called()
        retained_account = self.session.get(user, self.account.id)
        self.assertIsNotNone(retained_account)
        self.assertIsNotNone(retained_account.deletion_requested_at)
        self.assertEqual(retained_account.token_version, 1)
        self.assertEqual(len(self.session.exec(select(application)).all()), 1)
        self.assertEqual(len(self.session.exec(select(profile_document)).all()), 1)
        self.assertEqual(len(self.session.exec(select(user_profile)).all()), 1)
        self.assertEqual(len(self.session.exec(select(education_record)).all()), 1)
        self.assertEqual(len(self.session.exec(select(notification)).all()), 1)
        self.assertEqual(len(self.session.exec(select(user_settings)).all()), 1)
        self.assertEqual(len(self.session.exec(select(password_reset)).all()), 1)
        self.assertEqual(
            self.session.exec(select(application_status_history)).all(),
            [],
        )
        deletion_event = self.session.exec(
            select(audit_event).where(audit_event.action == "account.delete")
        ).one()
        self.assertEqual(deletion_event.actor_id, self.account.id)
        with (
            patch(
                "Backend.api.deps.get_user_id_from_token",
                return_value=(self.account.id, 1),
            ),
            self.assertRaises(HTTPException) as raised,
        ):
            get_current_user(self.request, None, self.session)
        self.assertEqual(raised.exception.status_code, 403)

    def test_purge_only_removes_accounts_after_30_days(self):
        deletion_requested_at = datetime.now(timezone.utc) - timedelta(days=30)
        self.account.deletion_requested_at = deletion_requested_at
        self.session.add(self.account)
        self.session.add(
            application(
                user_id=self.account.id,
                program_id=self.program.id,
                status="submitted",
                resume_path="resumes/test-user.pdf",
            )
        )
        self.session.add(
            profile_document(
                user_id=self.account.id,
                filename="profile.pdf",
                storage_path="profile-documents/test-user.pdf",
                file_size=1,
            )
        )
        self.session.add(
            audit_event(
                actor_id=self.account.id,
                action="account.delete",
                object_type="user",
                object_id=None,
                source_ip="127.0.0.1",
            )
        )
        self.session.commit()

        with patch("Backend.core.account_deletion.storage.delete_file") as delete_file:
            self.assertEqual(
                purge_expired_accounts(
                    self.session,
                    now=deletion_requested_at + timedelta(days=30) - timedelta(seconds=1),
                ),
                0,
            )
            self.assertIsNotNone(self.session.get(user, self.account.id))

            self.assertEqual(
                purge_expired_accounts(
                    self.session,
                    now=deletion_requested_at + timedelta(days=30),
                ),
                1,
            )

        self.assertCountEqual(
            [call.args[0] for call in delete_file.call_args_list],
            ["resumes/test-user.pdf", "profile-documents/test-user.pdf"],
        )
        self.assertIsNone(self.session.get(user, self.account.id))
        self.assertEqual(self.session.exec(select(application)).all(), [])
        self.assertEqual(self.session.exec(select(profile_document)).all(), [])
        self.assertEqual(self.session.exec(select(audit_event)).all(), [])

    def test_authorized_cleanup_endpoint_runs_expiry_purge(self):
        with patch.object(settings, "cron_secret", "test-cron-secret"):
            response = purge_deleted_accounts(
                "Bearer test-cron-secret",
                self.session,
            )

        self.assertEqual(response, {"purged": 0})
