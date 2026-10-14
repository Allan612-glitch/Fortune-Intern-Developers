import asyncio
import threading
import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch
from urllib.parse import parse_qs, urlsplit
from uuid import uuid4

from fastapi import BackgroundTasks, HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlmodel import Session, SQLModel

from Backend.api.routes.admin import update_application_status
from Backend.api.routes.applications import create_application
from Backend.api.routes.auth import login, send_password_reset_email
from Backend.api.routes.dashboard import get_dashboard
from Backend.api.routes.notifications import list_notifications, mark_all_notifications_read, unread_count
from Backend.api.routes.profiles import upload_profile_document
from Backend.api.routes.programs import get_program
from Backend.api.routes.auth import verify_email
from Backend.core.captcha import verify_turnstile
from Backend.core.config import settings
from Backend.core.rate_limit import enforce_rate_limit
from Backend.core.security import (
    hash_one_time_secret,
    hash_password,
    verify_one_time_secret,
)
from Backend.core.uploads import read_validated_document
from Backend.main import create_app
from Database.models import (
    application,
    notification,
    program,
    rate_limit_bucket,
    registration_verification,
    user,
)
from Database.schemas import AdminApplicationStatusRequest, LoginRequest, VerifyEmailRequest


class TestUploadValidation(unittest.TestCase):
    def test_accepts_pdf_with_matching_signature(self):
        class Upload:
            filename = "resume.pdf"

            async def read(self, size=-1):
                return b"%PDF-1.7\n"[:size]

        content, filename, media_type = asyncio.run(
            read_validated_document(Upload(), "Resume")
        )
        self.assertEqual(content, b"%PDF-1.7\n")
        self.assertEqual(filename, "resume.pdf")
        self.assertEqual(media_type, "application/pdf")

    def test_rejects_mismatched_signature(self):
        class Upload:
            filename = "resume.pdf"

            async def read(self, size=-1):
                return b"not a PDF"[:size]

        with self.assertRaises(HTTPException) as raised:
            asyncio.run(read_validated_document(Upload(), "Resume"))
        self.assertEqual(raised.exception.status_code, 422)

    def test_rejects_upload_over_size_limit(self):
        class Upload:
            filename = "resume.pdf"

            async def read(self, size=-1):
                return b"%PDF-" + b"x" * (size - 4)

        with self.assertRaises(HTTPException) as raised:
            asyncio.run(read_validated_document(Upload(), "Resume"))
        self.assertEqual(raised.exception.status_code, 413)


class TestProfileDocumentUploadThreading(unittest.TestCase):
    def test_rate_limit_and_save_run_outside_the_event_loop_thread(self):
        event_loop_thread = threading.get_ident()
        worker_threads = []
        order = []
        request = SimpleNamespace(
            client=SimpleNamespace(host="127.0.0.1"),
        )
        account = SimpleNamespace(id="6ee34857-1454-4905-8fa9-fc99e866923d")
        response = object()

        def record_rate_limit(*args, **kwargs):
            worker_threads.append(threading.get_ident())
            order.append("rate_limit")
            self.assertEqual(args[2], "profile-document-upload")
            self.assertEqual(kwargs["identity_limit"], 20)

        async def read_document(file, label):
            self.assertIsNotNone(file)
            self.assertEqual(label, "Document")
            order.append("read")
            return b"%PDF-1.7", "document.pdf", "application/pdf"

        def save_document(session, saved_account, content, filename, content_type):
            self.assertIsNotNone(session)
            self.assertIs(saved_account, account)
            self.assertEqual(content, b"%PDF-1.7")
            self.assertEqual(filename, "document.pdf")
            self.assertEqual(content_type, "application/pdf")
            worker_threads.append(threading.get_ident())
            order.append("save")
            return response

        with (
            patch(
                "Backend.api.routes.profiles.enforce_rate_limit",
                side_effect=record_rate_limit,
            ),
            patch(
                "Backend.api.routes.profiles.read_validated_document",
                new=read_document,
            ),
            patch(
                "Backend.api.routes.profiles._save_profile_document",
                side_effect=save_document,
            ),
        ):
            result = asyncio.run(
                upload_profile_document(
                    request,
                    object(),
                    account,
                    Mock(),
                )
            )

        self.assertIs(result, response)
        self.assertEqual(order, ["rate_limit", "read", "save"])
        self.assertTrue(worker_threads)
        self.assertTrue(
            all(thread_id != event_loop_thread for thread_id in worker_threads)
        )


class TestPersistentRateLimit(unittest.TestCase):
    def test_blocks_requests_after_identity_limit(self):
        engine = create_engine("sqlite://")
        rate_limit_bucket.__table__.create(engine)
        request = SimpleNamespace(client=SimpleNamespace(host="127.0.0.1"))

        with Session(engine) as session:
            for _ in range(2):
                enforce_rate_limit(
                    session,
                    request,
                    "test-action",
                    "person@example.test",
                    ip_limit=10,
                    identity_limit=2,
                    window_seconds=60,
                )
            with self.assertRaises(HTTPException) as raised:
                enforce_rate_limit(
                    session,
                    request,
                    "test-action",
                    "person@example.test",
                    ip_limit=10,
                    identity_limit=2,
                    window_seconds=60,
                )
            self.assertEqual(raised.exception.status_code, 429)
            self.assertIn("Retry-After", raised.exception.headers)

    def test_ip_limit_blocks_different_identities_on_a_shared_address(self):
        engine = create_engine("sqlite://")
        rate_limit_bucket.__table__.create(engine)
        request = SimpleNamespace(client=SimpleNamespace(host="127.0.0.1"))

        with Session(engine) as session:
            for identity in ("student-a", "student-b"):
                enforce_rate_limit(
                    session,
                    request,
                    "shared-ip-action",
                    identity,
                    ip_limit=2,
                    identity_limit=10,
                    window_seconds=60,
                )
            with self.assertRaises(HTTPException) as raised:
                enforce_rate_limit(
                    session,
                    request,
                    "shared-ip-action",
                    "student-c",
                    ip_limit=2,
                    identity_limit=10,
                    window_seconds=60,
                )
            self.assertEqual(raised.exception.status_code, 429)

    def test_identity_limit_is_independent_for_users_on_the_same_ip(self):
        engine = create_engine("sqlite://")
        rate_limit_bucket.__table__.create(engine)
        request = SimpleNamespace(client=SimpleNamespace(host="127.0.0.1"))

        with Session(engine) as session:
            for identity in ("student-a", "student-b"):
                enforce_rate_limit(
                    session,
                    request,
                    "per-identity-action",
                    identity,
                    ip_limit=10,
                    identity_limit=1,
                    window_seconds=60,
                )
            with self.assertRaises(HTTPException) as raised:
                enforce_rate_limit(
                    session,
                    request,
                    "per-identity-action",
                    "student-a",
                    ip_limit=10,
                    identity_limit=1,
                    window_seconds=60,
                )
            self.assertEqual(raised.exception.status_code, 429)

    def test_ip_limit_fallback_allows_a_verified_challenge(self):
        engine = create_engine("sqlite://")
        rate_limit_bucket.__table__.create(engine)
        request = SimpleNamespace(client=SimpleNamespace(host="127.0.0.1"))
        challenge_passed = []

        with Session(engine) as session:
            for _ in range(2):
                enforce_rate_limit(
                    session,
                    request,
                    "challenge-action",
                    "student",
                    ip_limit=2,
                    identity_limit=10,
                    window_seconds=60,
                )
            enforce_rate_limit(
                session,
                request,
                "challenge-action",
                "student",
                ip_limit=2,
                identity_limit=10,
                window_seconds=60,
                on_ip_limit=lambda: challenge_passed.append(True),
            )
        self.assertEqual(challenge_passed, [True])


class TestVerificationCodeGuessLimit(unittest.TestCase):
    def test_five_invalid_guesses_block_the_current_code(self):
        engine = create_engine("sqlite://")
        registration_verification.__table__.create(engine)
        registration = registration_verification(
            name="Test Student",
            email="student@example.test",
            password_hash="password-hash",
            code_hash=hash_one_time_secret("123456", "registration-code"),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
        )
        with Session(engine) as session:
            session.add(registration)
            session.commit()
            request = SimpleNamespace(client=SimpleNamespace(host="127.0.0.1"))
            with (
                patch("Backend.api.routes.auth.enforce_rate_limit"),
                patch("Backend.api.routes.auth.verify_one_time_secret", return_value=False),
            ):
                for attempt in range(1, 6):
                    with self.assertRaises(HTTPException) as raised:
                        verify_email(
                            VerifyEmailRequest(email=registration.email, code="000000"),
                            request,
                            session,
                        )
                    expected_status = 429 if attempt == 5 else 400
                    self.assertEqual(raised.exception.status_code, expected_status)

                with self.assertRaises(HTTPException) as raised:
                    verify_email(
                        VerifyEmailRequest(email=registration.email, code="000000"),
                        request,
                        session,
                    )
                self.assertEqual(raised.exception.status_code, 429)


class TestResetEmailEncoding(unittest.TestCase):
    def test_reset_link_preserves_plus_in_email_address(self):
        with (
            patch("Backend.api.routes.auth.settings.resend_api_key", "test-key"),
            patch("Backend.api.routes.auth.settings.resend_from_email", "from@example.test"),
            patch("Backend.api.routes.auth.settings.frontend_url", "https://example.test"),
            patch("Backend.api.routes.auth.resend.Emails.send") as send_email,
        ):
            send_password_reset_email("first+tag@example.test", "reset-token")

        reset_link = send_email.call_args.args[0]["text"].splitlines()[2]
        query = parse_qs(urlsplit(reset_link).query)
        self.assertEqual(query["email"], ["first+tag@example.test"])
        self.assertEqual(query["token"], ["reset-token"])


class TestOneTimeSecretHashing(unittest.TestCase):
    def test_hash_is_fast_purpose_separated_and_supports_legacy_hashes(self):
        digest = hash_one_time_secret("123456", "registration-code")
        self.assertTrue(digest.startswith("hmac-sha256:"))
        self.assertTrue(verify_one_time_secret("123456", digest, "registration-code"))
        self.assertFalse(verify_one_time_secret("123456", digest, "password-reset"))
        self.assertFalse(verify_one_time_secret("000000", digest, "registration-code"))

        legacy_digest = hash_password("legacy-token")
        self.assertTrue(
            verify_one_time_secret("legacy-token", legacy_digest, "password-reset")
        )


class TestLoginRateLimitScope(unittest.TestCase):
    def test_login_identity_limit_is_scoped_to_source_ip(self):
        request = SimpleNamespace(client=SimpleNamespace(host="192.0.2.20"))
        session = Mock()
        session.exec.return_value.first.return_value = None
        with (
            patch("Backend.api.routes.auth.enforce_rate_limit") as rate_limit,
            self.assertRaises(HTTPException),
        ):
            login(
                LoginRequest(email="person@example.test", password="incorrect"),
                request,
                session,
            )

        self.assertEqual(rate_limit.call_args.args[3], "person@example.test:192.0.2.20")
        self.assertEqual(rate_limit.call_args.kwargs["identity_limit"], 10)


class TestNotificationQueryBounds(unittest.TestCase):
    def test_count_read_all_and_list_are_database_bounded(self):
        engine = create_engine("sqlite://")
        notification.__table__.create(engine)
        account = user(id=uuid4(), name="Test", email="test@example.test")
        with Session(engine) as session:
            session.add_all([
                notification(user_id=account.id, message="unread one", read=False),
                notification(user_id=account.id, message="unread two", read=False),
                notification(user_id=account.id, message="read", read=True),
            ])
            session.commit()

            self.assertEqual(unread_count(account, session), {"count": 2})
            page = list_notifications(account, session, limit=1, offset=1)
            self.assertEqual(len(page), 1)
            self.assertEqual(mark_all_notifications_read(account, session), {"updated": 2})
            self.assertEqual(unread_count(account, session), {"count": 0})


class TestDashboardAggregates(unittest.TestCase):
    def test_dashboard_uses_aggregate_totals_and_keeps_recent_applications(self):
        engine = create_engine("sqlite://")
        SQLModel.metadata.create_all(engine)
        account = user(name="Test", email="dashboard@example.test")
        first_program = program(name="First", description="", status="open")
        second_program = program(name="Second", description="", status="open")
        with Session(engine) as session:
            session.add_all([account, first_program, second_program])
            session.commit()
            session.add_all([
                application(
                    user_id=account.id,
                    program_id=first_program.id,
                    status="accepted",
                    applicant_name="Applicant One",
                ),
                application(
                    user_id=account.id,
                    program_id=second_program.id,
                    status="submitted",
                    applicant_name="Applicant Two",
                ),
            ])
            session.commit()

            result = get_dashboard(account, session)

        self.assertEqual(result.total_applications, 2)
        self.assertEqual(result.active_applications, 1)
        self.assertEqual(result.accepted_applications, 1)
        self.assertEqual(result.open_programs, 2)
        self.assertEqual(len(result.recent_applications), 2)


class TestProgramLookup(unittest.TestCase):
    def test_malformed_program_id_returns_not_found_without_querying(self):
        session = Mock()
        with self.assertRaises(HTTPException) as raised:
            get_program("not-a-uuid", session)

        self.assertEqual(raised.exception.status_code, 404)
        self.assertEqual(raised.exception.detail, "Program not found")
        session.get.assert_not_called()


class TestUnexpectedErrorMiddleware(unittest.TestCase):
    def test_internal_errors_keep_cors_security_and_request_logging(self):
        application = create_app()

        def fail():
            raise RuntimeError("sensitive internal detail")

        application.add_api_route("/_test-unhandled-error", fail, methods=["GET"])
        origin = settings.cors_origins[0]

        with self.assertLogs("Backend.main", level="INFO") as captured:
            response = TestClient(application).get(
                "/_test-unhandled-error",
                headers={"Origin": origin},
            )

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.headers["access-control-allow-origin"], origin)
        self.assertEqual(response.headers["cache-control"], "no-store")
        self.assertEqual(response.headers["x-content-type-options"], "nosniff")
        self.assertEqual(
            response.headers["x-request-id"],
            response.json()["request_id"],
        )
        self.assertNotIn("sensitive internal detail", response.text)
        self.assertTrue(any("unhandled request error" in line for line in captured.output))
        self.assertTrue(any("request completed" in line for line in captured.output))


class TestAcceptedApplicationDocuments(unittest.TestCase):
    def test_failed_document_delivery_is_reported_and_can_be_retried(self):
        application_id = uuid4()
        applicant_id = uuid4()
        program_id = uuid4()
        row = SimpleNamespace(
            id=application_id,
            user_id=applicant_id,
            program_id=program_id,
            status="submitted",
            documents_sent=False,
            resume_filename=None,
            applicant_name="Test Student",
            gender=None,
            student_index_number=None,
            year_of_study=None,
            suggested_company=None,
            applicant_institution="Test University",
            applicant_course="Computer Science",
            applicant_contact=None,
            host_company_name=None,
            host_company_address=None,
            created_at=datetime.now(timezone.utc),
        )
        applicant = SimpleNamespace(
            id=applicant_id,
            name="Test Student",
            email="student@example.test",
        )
        program_record = SimpleNamespace(
            id=program_id,
            name="Test Internship",
            company="Test Company",
            location="Accra",
        )
        admin = SimpleNamespace(id=uuid4())
        request = SimpleNamespace()
        session = Mock()

        def get_record(model, record_id):
            self.assertIsNotNone(record_id)
            return {
                application: row,
                program: program_record,
                user: applicant,
            }[model]

        session.get.side_effect = get_record

        with (
            patch("Backend.api.routes.admin.record_audit_event"),
            patch(
                "Backend.api.routes.admin.documents.build_recommendation_letter_pdf",
                return_value=b"letter",
            ),
            patch(
                "Backend.api.routes.admin.documents.build_assessment_form_pdf",
                return_value=b"assessment",
            ),
            patch(
                "Backend.api.routes.admin.send_application_documents_email",
                side_effect=RuntimeError("email unavailable"),
            ),
            self.assertLogs("Backend.api.routes.admin", level="ERROR"),
        ):
            with self.assertRaises(HTTPException) as raised:
                update_application_status(
                    str(application_id),
                    AdminApplicationStatusRequest(status="Accepted"),
                    request,
                    admin,
                    session,
                )

        self.assertEqual(raised.exception.status_code, 503)
        self.assertEqual(row.status, "accepted")
        self.assertFalse(row.documents_sent)
        self.assertEqual(session.commit.call_count, 1)

        with (
            patch("Backend.api.routes.admin.record_audit_event"),
            patch(
                "Backend.api.routes.admin.send_application_documents_email",
            ) as send_documents,
        ):
            response = update_application_status(
                str(application_id),
                AdminApplicationStatusRequest(status="accepted"),
                request,
                admin,
                session,
            )

        self.assertEqual(response.status, "accepted")
        self.assertTrue(row.documents_sent)
        self.assertEqual(session.commit.call_count, 2)
        send_documents.assert_called_once()


class TestTurnstileVerification(unittest.TestCase):
    @patch("Backend.core.captcha.urlopen")
    @patch("Backend.core.captcha.settings.turnstile_secret_key", "test-secret")
    def test_accepts_a_successful_turnstile_response(self, urlopen):
        response = Mock()
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=None)
        response.read.return_value = b'{"success": true}'
        urlopen.return_value = response

        verify_turnstile("challenge-token", "127.0.0.1")

        request = urlopen.call_args.args[0]
        self.assertIn(b"secret=test-secret", request.data)
        self.assertIn(b"response=challenge-token", request.data)

    def test_rejects_a_missing_turnstile_token_as_a_challenge(self):
        with self.assertRaises(HTTPException) as raised:
            verify_turnstile(None, "127.0.0.1")

        self.assertEqual(raised.exception.status_code, 403)
        self.assertEqual(raised.exception.detail["code"], "captcha_required")


class TestApplicationProgramSelection(unittest.TestCase):
    def test_blocking_application_work_runs_outside_the_event_loop_thread(self):
        event_loop_thread = threading.get_ident()
        worker_threads = []
        order = []
        account = SimpleNamespace(
            id="6ee34857-1454-4905-8fa9-fc99e866923d",
            name="Test Student",
            email="student@example.test",
        )
        response = object()
        receipt = SimpleNamespace(
            to_email=account.email,
            student_name=account.name,
            program_name="Approved opportunity",
            year_of_study="Not provided",
            company="Example Company",
            reference="application-reference",
            submitted_at="2026-10-13",
        )
        background_tasks = BackgroundTasks()

        def record_rate_limit(*args, **kwargs):
            self.assertEqual(args[2], "application-create")
            self.assertEqual(kwargs["identity_limit"], 10)
            worker_threads.append(threading.get_ident())
            order.append("rate_limit")

        async def read_payload():
            order.append("parse")
            return {"program_name": "Approved opportunity"}

        def prepare_application(session, saved_account, fields):
            self.assertIsNotNone(session)
            self.assertIs(saved_account, account)
            self.assertEqual(fields.program_name, "Approved opportunity")
            worker_threads.append(threading.get_ident())
            order.append("prepare")
            return object()

        def save_application(session, request, saved_account, prepared, resume):
            self.assertIsNotNone(session)
            self.assertIsNotNone(request)
            self.assertIs(saved_account, account)
            self.assertIsNotNone(prepared)
            self.assertIsNone(resume)
            worker_threads.append(threading.get_ident())
            order.append("save")
            return response, receipt

        request = SimpleNamespace(
            headers={"content-type": "application/json"},
            client=SimpleNamespace(host="127.0.0.1"),
            json=read_payload,
        )
        with (
            patch(
                "Backend.api.routes.applications.enforce_rate_limit",
                side_effect=record_rate_limit,
            ),
            patch(
                "Backend.api.routes.applications._prepare_application",
                side_effect=prepare_application,
            ),
            patch(
                "Backend.api.routes.applications._save_application",
                side_effect=save_application,
            ),
        ):
            result = asyncio.run(
                create_application(request, background_tasks, account, Mock())
            )

        self.assertIs(result, response)
        self.assertEqual(order, ["rate_limit", "parse", "prepare", "save"])
        self.assertTrue(
            all(thread_id != event_loop_thread for thread_id in worker_threads)
        )
        self.assertEqual(len(background_tasks.tasks), 1)

    def test_unknown_program_name_does_not_create_public_catalog_entry(self):
        event_loop_thread = threading.get_ident()
        worker_threads = []
        account = SimpleNamespace(
            id="6ee34857-1454-4905-8fa9-fc99e866923d",
            name="Test Student",
            email="student@example.test",
        )
        session = Mock()
        session.exec.return_value.first.return_value = None

        def record_query(*args):
            self.assertTrue(args)
            worker_threads.append(threading.get_ident())
            return session.exec.return_value

        session.exec.side_effect = record_query
        request = SimpleNamespace(
            headers={"content-type": "application/json"},
            client=SimpleNamespace(host="127.0.0.1"),
            json=AsyncMock(return_value={"program_name": "Unapproved opportunity"}),
        )

        def record_rate_limit(*args, **kwargs):
            worker_threads.append(threading.get_ident())
            self.assertEqual(args[2], "application-create")
            self.assertEqual(kwargs["identity_limit"], 10)

        with (
            patch(
                "Backend.api.routes.applications.enforce_rate_limit",
                side_effect=record_rate_limit,
            ),
            self.assertRaises(HTTPException) as raised,
        ):
            asyncio.run(create_application(request, BackgroundTasks(), account, session))

        self.assertEqual(raised.exception.status_code, 404)
        self.assertEqual(raised.exception.detail, "Program not found")
        self.assertGreaterEqual(len(worker_threads), 3)
        self.assertTrue(
            all(thread_id != event_loop_thread for thread_id in worker_threads)
        )
        session.add.assert_not_called()
        session.commit.assert_not_called()


if __name__ == "__main__":
    unittest.main()
