import unittest
from unittest.mock import patch

from Backend.core.mailer import send_application_received_email


class TestApplicationReceivedEmail(unittest.TestCase):
    def test_includes_student_details_in_requested_order(self):
        with (
            patch("Backend.core.mailer.settings.resend_api_key", "test-api-key"),
            patch("Backend.core.mailer.settings.resend_from_email", "no-reply@example.com"),
            patch("Backend.core.mailer.resend.Emails.send") as send,
        ):
            send_application_received_email(
                to_email="student@example.com",
                student_name="Test Student",
                institution="Test University",
                program_of_study="Computer Science",
                year_of_study="Level 300",
                company="Test Company",
                role="Financial Advisor",
                reference="application-reference",
                submitted_at="2026-11-12",
            )

        message = send.call_args.args[0]
        summary_labels = (
            "Institution:",
            "Program:",
            "Year:",
            "Company:",
            "Role:",
            "Reference:",
            "Submission date:",
        )
        positions = [message["text"].index(label) for label in summary_labels]
        self.assertEqual(positions, sorted(positions))
        for value in (
            "Test University",
            "Computer Science",
            "Level 300",
            "Test Company",
            "Financial Advisor",
        ):
            self.assertIn(value, message["text"])
            self.assertIn(value, message["html"])
