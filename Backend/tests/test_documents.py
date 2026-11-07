import unittest
from datetime import datetime, timezone
from unittest.mock import patch

from Backend.core.documents import build_recommendation_letter_pdf


class TestRecommendationLetterVerification(unittest.TestCase):
    def test_letter_includes_clickable_verification_link_and_qr_code(self):
        reference = "FIN/2026/ABC123"
        with patch(
            "Backend.core.documents.settings.frontend_url",
            "https://frontend.example.test/",
        ):
            letter_pdf = build_recommendation_letter_pdf(
                student_name="Test Student",
                institution="Test University",
                program_course="Computer Science",
                contact=None,
                email="student@example.test",
                host_company="Test Company",
                host_location="Accra",
                reference_no=reference,
                letter_date=datetime(2026, 11, 7, tzinfo=timezone.utc),
            )

        self.assertTrue(letter_pdf.startswith(b"%PDF"))
        self.assertIn(
            f"https://frontend.example.test/verify-letter?reference={reference}".encode(),
            letter_pdf,
        )


if __name__ == "__main__":
    unittest.main()
