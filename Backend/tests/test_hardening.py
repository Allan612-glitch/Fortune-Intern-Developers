import asyncio
import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

from fastapi import BackgroundTasks, HTTPException
from sqlalchemy import create_engine
from sqlmodel import Session

from Backend.api.routes.applications import create_application
from Backend.api.routes.auth import verify_email
from Backend.core.captcha import verify_turnstile
from Backend.core.rate_limit import enforce_rate_limit
from Backend.core.uploads import read_validated_document
from Database.models import rate_limit_bucket, registration_verification
from Database.schemas import VerifyEmailRequest


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
            code_hash="code-hash",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
        )
        with Session(engine) as session:
            session.add(registration)
            session.commit()
            request = SimpleNamespace(client=SimpleNamespace(host="127.0.0.1"))
            with (
                patch("Backend.api.routes.auth.enforce_rate_limit"),
                patch("Backend.api.routes.auth.verify_password", return_value=False),
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
    def test_unknown_program_name_does_not_create_public_catalog_entry(self):
        account = SimpleNamespace(
            id="6ee34857-1454-4905-8fa9-fc99e866923d",
            name="Test Student",
            email="student@example.test",
        )
        session = Mock()
        session.exec.return_value.first.return_value = None
        request = SimpleNamespace(
            headers={"content-type": "application/json"},
            client=SimpleNamespace(host="127.0.0.1"),
            json=AsyncMock(return_value={"program_name": "Unapproved opportunity"}),
        )

        with (
            patch("Backend.api.routes.applications.enforce_rate_limit"),
            self.assertRaises(HTTPException) as raised,
        ):
            asyncio.run(create_application(request, BackgroundTasks(), account, session))

        self.assertEqual(raised.exception.status_code, 404)
        self.assertEqual(raised.exception.detail, "Program not found")
        session.add.assert_not_called()
        session.commit.assert_not_called()


if __name__ == "__main__":
    unittest.main()
