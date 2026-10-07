import asyncio
import unittest
from types import SimpleNamespace

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlmodel import Session

from Backend.core.rate_limit import enforce_rate_limit
from Backend.core.uploads import read_validated_document
from Database.models import rate_limit_bucket


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


if __name__ == "__main__":
    unittest.main()
