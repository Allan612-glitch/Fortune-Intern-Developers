import importlib.util
from dataclasses import replace
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import patch
from uuid import uuid4

from alembic.migration import MigrationContext
from alembic.operations import Operations
from fastapi import HTTPException, Response
from sqlalchemy import create_engine, inspect, text
from sqlmodel import Session, SQLModel, select

from Backend.api.routes.applications import (
    _ApplicationFields,
    _prepare_application,
    _validated_date_of_birth,
    serialize_application,
    verify_letter,
)
from Backend.api.routes.auth import register, verify_email
from Backend.core.data_retention import (
    add_calendar_years,
    close_expired_program_cycles,
    purge_expired_retained_data,
)
from Database.models import (
    application,
    application_status_history,
    audit_event,
    consent_log,
    notification,
    program,
    registration_verification,
    user,
)
from Database.schemas import RegisterRequest, VerifyEmailRequest


def load_privacy_migration():
    migration_path = (
        Path(__file__).resolve().parents[2]
        / "Database"
        / "Database"
        / "migrations"
        / "versions"
        / "j3f4b7c8d901_privacy_consent_retention_and_letter_verification.py"
    )
    spec = importlib.util.spec_from_file_location(
        "privacy_consent_retention_migration",
        migration_path,
    )
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load migration at {migration_path}")
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    return migration


class TestConsentRecording(unittest.TestCase):
    def test_registration_consents_are_recorded_after_email_verification(self):
        engine = create_engine("sqlite://")
        SQLModel.metadata.create_all(engine)
        request = SimpleNamespace(
            client=SimpleNamespace(host="127.0.0.1"),
            headers={},
        )
        with Session(engine) as session:
            with (
                patch("Backend.api.routes.auth.enforce_rate_limit"),
                patch("Backend.api.routes.auth.send_verification_email"),
                patch("Backend.api.routes.auth.randbelow", return_value=123456),
            ):
                register(
                    RegisterRequest(
                        name="Test Applicant",
                        email="applicant@example.test",
                        password="long-password",
                        terms_accepted=True,
                        privacy_accepted=True,
                    ),
                    request,
                    session,
                )

            pending = session.exec(select(registration_verification)).one()
            accepted_at = pending.terms_accepted_at
            self.assertEqual(pending.privacy_accepted_at, accepted_at)

            with (
                patch("Backend.api.routes.auth.enforce_rate_limit"),
                patch("Backend.api.routes.auth.verify_one_time_secret", return_value=True),
                patch("Backend.api.routes.auth.request_client_fingerprint", return_value="test"),
                patch("Backend.api.routes.auth.create_auth_response", return_value="token"),
            ):
                result = verify_email(
                    VerifyEmailRequest(
                        email="applicant@example.test",
                        code="123456",
                    ),
                    request,
                    Response(),
                    session,
                )

            self.assertEqual(result, "token")
            account = session.exec(select(user)).one()
            self.assertEqual(account.terms_accepted_at, accepted_at)
            self.assertEqual(account.privacy_accepted_at, accepted_at)
            log_entries = session.exec(
                select(consent_log).where(consent_log.account_id == account.id)
            ).all()
            self.assertEqual(
                {entry.consent_type for entry in log_entries},
                {"terms", "privacy"},
            )
            self.assertTrue(all(entry.accepted_at == accepted_at for entry in log_entries))
        engine.dispose()

    def test_registration_rejects_missing_policy_acceptance(self):
        engine = create_engine("sqlite://")
        with Session(engine) as session:
            with self.assertRaises(HTTPException) as raised:
                register(
                    RegisterRequest(
                        name="Test Applicant",
                        email="applicant@example.test",
                        password="long-password",
                    ),
                    SimpleNamespace(client=None),
                    session,
                )
        self.assertEqual(raised.exception.status_code, 422)
        engine.dispose()


class TestApplicationAgeAndLetterVerification(unittest.TestCase):
    def test_application_age_is_validated_at_submission(self):
        today = datetime.now(timezone.utc).date()
        adult = date(today.year - 18, today.month, today.day).isoformat()
        self.assertEqual(_validated_date_of_birth(adult), date.fromisoformat(adult))

        minor = date(today.year - 17, 1, 1).isoformat()
        self.assertEqual(_validated_date_of_birth(minor), date.fromisoformat(minor))

        child = date(today.year - 15, 1, 1).isoformat()
        with self.assertRaises(HTTPException) as raised:
            _validated_date_of_birth(child)
        self.assertEqual(raised.exception.status_code, 403)

        tomorrow = (today + timedelta(days=1)).isoformat()
        with self.assertRaises(HTTPException) as raised:
            _validated_date_of_birth(tomorrow)
        self.assertEqual(raised.exception.status_code, 422)

    def test_minor_application_enters_review(self):
        engine = create_engine("sqlite://")
        SQLModel.metadata.create_all(engine)
        today = datetime.now(timezone.utc).date()
        minor_birth_date = date(today.year - 17, 1, 1).isoformat()
        with Session(engine) as session:
            applicant = user(name="Test Applicant", email="applicant@example.test")
            internship = program(name="Summer Internship", description="Test program")
            session.add_all([applicant, internship])
            session.commit()
            fields = _ApplicationFields(
                program_id=str(internship.id),
                program_name=internship.name,
                institution="Test University",
                course="Computing",
                contact="",
                company_name="",
                company_address="",
                applicant_name=applicant.name,
                gender="",
                student_index_number="",
                year_of_study="",
                suggested_company="",
                date_of_birth=minor_birth_date,
            )

            prepared = _prepare_application(session, applicant, fields)

            self.assertEqual(prepared.initial_status, "review")
            response = serialize_application(
                application(
                    user_id=applicant.id,
                    program_id=internship.id,
                    status=prepared.initial_status,
                    date_of_birth=prepared.date_of_birth,
                    created_at=datetime.now(timezone.utc),
                ),
                internship.name,
            )
            self.assertTrue(response.requires_minor_review)
            adult_birth_date = date(today.year - 18, 1, 1).isoformat()
            adult_prepared = _prepare_application(
                session,
                applicant,
                replace(fields, date_of_birth=adult_birth_date),
            )
            self.assertEqual(adult_prepared.initial_status, "submitted")
        engine.dispose()

    def test_decided_application_allows_reapplication_but_active_one_does_not(self):
        engine = create_engine("sqlite://")
        SQLModel.metadata.create_all(engine)
        with Session(engine) as session:
            applicant = user(name="Test Applicant", email="applicant@example.test")
            internship = program(name="Summer Internship", description="Test program")
            session.add_all([applicant, internship])
            session.commit()
            fields = _ApplicationFields(
                program_id=str(internship.id),
                program_name=internship.name,
                institution="Test University",
                course="Computing",
                contact="",
                company_name="",
                company_address="",
                applicant_name=applicant.name,
                gender="",
                student_index_number="INDEX-1",
                year_of_study="",
                suggested_company="",
                date_of_birth="2000-01-01",
            )
            session.add(application(
                user_id=applicant.id,
                program_id=internship.id,
                status="rejected",
                applicant_name=applicant.name,
                student_index_number="INDEX-1",
            ))
            session.commit()

            prepared = _prepare_application(session, applicant, fields)
            session.add(application(
                user_id=applicant.id,
                program_id=prepared.program_id,
                status=prepared.initial_status,
                applicant_name=prepared.fields.applicant_name,
                student_index_number=prepared.fields.student_index_number,
                date_of_birth=prepared.date_of_birth,
            ))
            session.commit()

            with self.assertRaises(HTTPException) as raised:
                _prepare_application(session, applicant, fields)

            self.assertEqual(raised.exception.status_code, 409)
            self.assertEqual(
                raised.exception.detail,
                "You already have an active application for this program",
            )
        engine.dispose()

    def test_public_letter_lookup_verifies_only_sent_accepted_documents(self):
        engine = create_engine("sqlite://")
        SQLModel.metadata.create_all(engine)
        with Session(engine) as session:
            applicant = user(name="Test Applicant", email="applicant@example.test")
            internship = program(name="Summer Internship", description="Test program")
            session.add_all([applicant, internship])
            session.commit()
            row = application(
                user_id=applicant.id,
                program_id=internship.id,
                status="accepted",
                documents_sent=True,
                letter_reference="FIN/2026/ABC123",
                applicant_name=applicant.name,
                applicant_institution="Test University",
            )
            session.add(row)
            session.commit()

            request = SimpleNamespace(client=SimpleNamespace(host="127.0.0.1"))
            with patch("Backend.api.routes.applications.enforce_rate_limit"):
                result = verify_letter(request, "FIN/2026/ABC123", session)
            self.assertTrue(result.valid)
            self.assertFalse(hasattr(result, "email"))
            self.assertFalse(hasattr(result, "applicant_name"))

            row.documents_sent = False
            session.add(row)
            session.commit()
            with (
                patch("Backend.api.routes.applications.enforce_rate_limit"),
                self.assertRaises(HTTPException) as raised,
            ):
                verify_letter(request, "FIN/2026/ABC123", session)
            self.assertEqual(raised.exception.status_code, 404)
        engine.dispose()

    def test_deadline_automatically_closes_program_and_blocks_applications(self):
        engine = create_engine("sqlite://")
        SQLModel.metadata.create_all(engine)
        with Session(engine) as session:
            applicant = user(name="Test Applicant", email="applicant@example.test")
            now = datetime.now(timezone.utc)
            expired_program = program(
                name="Expired Internship",
                description="Deadline has passed",
                deadline=now - timedelta(seconds=1),
            )
            future_program = program(
                name="Future Internship",
                description="Deadline has not passed",
                deadline=now + timedelta(days=1),
            )
            no_deadline_program = program(
                name="Open-ended Internship",
                description="No deadline",
            )
            session.add_all(
                [applicant, expired_program, future_program, no_deadline_program]
            )
            session.commit()

            self.assertEqual(close_expired_program_cycles(session, now=now), 1)
            session.refresh(expired_program)
            session.refresh(future_program)
            session.refresh(no_deadline_program)
            self.assertEqual(expired_program.status, "closed")
            self.assertEqual(
                expired_program.cycle_closed_at.replace(tzinfo=timezone.utc),
                now - timedelta(seconds=1),
            )
            self.assertEqual(future_program.status, "open")
            self.assertIsNone(future_program.cycle_closed_at)
            self.assertEqual(no_deadline_program.status, "open")
            self.assertIsNone(no_deadline_program.cycle_closed_at)

            fields = _ApplicationFields(
                program_id=str(expired_program.id),
                program_name=expired_program.name,
                institution="Test University",
                course="Computing",
                contact="",
                company_name="",
                company_address="",
                applicant_name=applicant.name,
                gender="",
                student_index_number="",
                year_of_study="",
                suggested_company="",
                date_of_birth="2000-01-01",
            )
            with self.assertRaises(HTTPException) as raised:
                _prepare_application(session, applicant, fields)
            self.assertEqual(raised.exception.status_code, 409)

    def test_deadline_blocks_application_even_before_scheduled_job_runs(self):
        engine = create_engine("sqlite://")
        SQLModel.metadata.create_all(engine)
        with Session(engine) as session:
            applicant = user(name="Test Applicant", email="applicant@example.test")
            expired_program = program(
                name="Expired Internship",
                description="Deadline has passed",
                deadline=datetime.now(timezone.utc) - timedelta(seconds=1),
            )
            session.add_all([applicant, expired_program])
            session.commit()
            fields = _ApplicationFields(
                program_id=str(expired_program.id),
                program_name=expired_program.name,
                institution="Test University",
                course="Computing",
                contact="",
                company_name="",
                company_address="",
                applicant_name=applicant.name,
                gender="",
                student_index_number="",
                year_of_study="",
                suggested_company="",
                date_of_birth="2000-01-01",
            )
            with self.assertRaises(HTTPException) as raised:
                _prepare_application(session, applicant, fields)
            self.assertEqual(raised.exception.status_code, 409)
        engine.dispose()


class TestRetentionEnforcement(unittest.TestCase):
    def test_closed_program_applications_and_expired_consent_logs_are_purged(self):
        engine = create_engine("sqlite://")
        SQLModel.metadata.create_all(engine)
        now = datetime(2026, 11, 4, tzinfo=timezone.utc)
        cutoff = add_calendar_years(now, -3)
        with Session(engine) as session:
            applicant = user(name="Test Applicant", email="applicant@example.test")
            expired_program = program(
                name="Expired Cycle",
                description="Closed over three years ago",
                cycle_closed_at=cutoff,
            )
            current_program = program(
                name="Current Cycle",
                description="Not yet eligible for deletion",
                cycle_closed_at=cutoff + timedelta(seconds=1),
            )
            session.add_all([applicant, expired_program, current_program])
            session.commit()
            expired_application = application(
                user_id=applicant.id,
                program_id=expired_program.id,
                status="accepted",
                resume_path="resumes/expired.pdf",
            )
            retained_application = application(
                user_id=applicant.id,
                program_id=current_program.id,
                status="submitted",
            )
            expired_consent = consent_log(
                account_id=applicant.id,
                consent_type="terms",
                accepted_at=now - timedelta(days=10),
                account_closed_at=now - timedelta(days=3),
                expires_at=now,
            )
            active_consent = consent_log(
                account_id=applicant.id,
                consent_type="privacy",
                accepted_at=now - timedelta(days=10),
            )
            session.add_all(
                [
                    expired_application,
                    retained_application,
                    expired_consent,
                    active_consent,
                ]
            )
            session.commit()
            session.add_all(
                [
                    application_status_history(
                        application_id=expired_application.id,
                        new_status="accepted",
                    ),
                    notification(
                        user_id=applicant.id,
                        message="Application notification",
                        target_type="application",
                        target_id=str(expired_application.id),
                    ),
                    audit_event(
                        actor_id=applicant.id,
                        action="application.create",
                        object_type="application",
                        object_id=str(expired_application.id),
                    ),
                ]
            )
            session.commit()
            expired_application_id = expired_application.id
            retained_application_id = retained_application.id
            expired_consent_id = expired_consent.id
            active_consent_id = active_consent.id

            with patch("Backend.core.data_retention.storage.delete_file") as delete_file:
                result = purge_expired_retained_data(session, now=now)

            self.assertEqual(result, (1, 1))
            delete_file.assert_called_once_with("resumes/expired.pdf")
            self.assertIsNone(session.get(application, expired_application_id))
            self.assertIsNotNone(session.get(application, retained_application_id))
            self.assertIsNone(session.get(consent_log, expired_consent_id))
            self.assertIsNotNone(session.get(consent_log, active_consent_id))
            self.assertEqual(session.exec(select(application_status_history)).all(), [])
            self.assertEqual(session.exec(select(notification)).all(), [])
            self.assertEqual(session.exec(select(audit_event)).all(), [])
        engine.dispose()

    def test_migration_adds_storage_and_backfills_letter_references(self):
        engine = create_engine("sqlite://")
        first_id = str(uuid4())
        second_id = str(uuid4())
        with engine.begin() as connection:
            connection.execute(text("CREATE TABLE users (id CHAR(32) PRIMARY KEY)"))
            connection.execute(
                text("CREATE TABLE registration_verifications (id CHAR(32) PRIMARY KEY)")
            )
            connection.execute(text("CREATE TABLE programs (id CHAR(32) PRIMARY KEY)"))
            connection.execute(
                text(
                    "CREATE TABLE applications ("
                    "id CHAR(32) PRIMARY KEY, created_at DATETIME NOT NULL)"
                )
            )
            connection.execute(
                text(
                    "INSERT INTO applications (id, created_at) VALUES "
                    "(:first_id, '2025-01-01 00:00:00'), "
                    "(:second_id, '2025-02-01 00:00:00')"
                ),
                {"first_id": first_id, "second_id": second_id},
            )

        migration = load_privacy_migration()
        with engine.begin() as connection:
            context = MigrationContext.configure(connection)
            with Operations.context(context):
                migration.upgrade()

        with engine.connect() as connection:
            columns = {
                column["name"]
                for column in inspect(connection).get_columns("applications")
            }
            self.assertIn("date_of_birth", columns)
            self.assertIn("letter_reference", columns)
            self.assertEqual(
                connection.execute(
                    text(
                        "SELECT letter_reference FROM applications "
                        "WHERE id = :first_id"
                    ),
                    {"first_id": first_id},
                ).scalar_one(),
                "FIN/2025/0001",
            )
            self.assertEqual(
                connection.execute(
                    text("SELECT COUNT(*) FROM consent_logs")
                ).scalar_one(),
                0,
            )
        engine.dispose()


if __name__ == "__main__":
    unittest.main()
