import unittest
from unittest.mock import patch

from Backend.core.mailer import (
    send_application_received_email,
    send_announcement_emails,
    send_certificate_available_email,
)
from resend.exceptions import RateLimitError


class TestAnnouncementEmail(unittest.TestCase):
    def test_batches_announcement_content_as_text_and_safe_html(self):
        with (
            patch("Backend.core.mailer.settings.resend_api_key", "test-api-key"),
            patch("Backend.core.mailer.settings.resend_from_email", "no-reply@example.com"),
            patch("Backend.core.mailer.resend.Batch.send") as send,
        ):
            send_announcement_emails(
                to_emails=["student@example.com"],
                title="Important <update>",
                content="First line\nSecond line",
            )

        message = send.call_args.args[0][0]
        self.assertEqual(message["to"], ["student@example.com"])
        self.assertIn("Important <update>", message["text"])
        self.assertIn("First line\nSecond line", message["text"])
        self.assertIn("Important &lt;update&gt;", message["html"])
        self.assertIn("First line<br>Second line", message["html"])

    def test_splits_large_audiences_into_resend_batch_limit(self):
        recipients = [f"student-{index}@example.test" for index in range(201)]
        with (
            patch("Backend.core.mailer.settings.resend_api_key", "test-api-key"),
            patch("Backend.core.mailer.settings.resend_from_email", "no-reply@example.com"),
            patch("Backend.core.mailer.resend.Batch.send") as send,
            patch("Backend.core.mailer.time.sleep"),
        ):
            send_announcement_emails(
                to_emails=recipients,
                title="Update",
                content="Details",
            )

        self.assertEqual([len(call.args[0]) for call in send.call_args_list], [100, 100, 1])
        self.assertEqual(send.call_args_list[0].args[0][0]["to"], [recipients[0]])
        self.assertEqual(send.call_args_list[-1].args[0][0]["to"], [recipients[-1]])

    def test_retries_resend_rate_limit_errors(self):
        rate_limit_error = RateLimitError(
            message="Too many requests",
            error_type="rate_limit_exceeded",
            code=429,
            headers={"retry-after": "2"},
        )
        with (
            patch("Backend.core.mailer.settings.resend_api_key", "test-api-key"),
            patch("Backend.core.mailer.settings.resend_from_email", "no-reply@example.com"),
            patch(
                "Backend.core.mailer.resend.Batch.send",
                side_effect=[rate_limit_error, None],
            ) as send,
            patch("Backend.core.mailer.time.sleep") as sleep,
        ):
            send_announcement_emails(
                to_emails=["student@example.com"],
                title="Update",
                content="Details",
            )

        self.assertEqual(send.call_count, 2)
        sleep.assert_called_once_with(2.0)


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


class TestCertificateAvailableEmail(unittest.TestCase):
    def test_notifies_applicant_with_dashboard_link(self):
        with (
            patch("Backend.core.mailer.settings.resend_api_key", "test-api-key"),
            patch("Backend.core.mailer.settings.resend_from_email", "no-reply@example.com"),
            patch("Backend.core.mailer.resend.Emails.send") as send,
        ):
            send_certificate_available_email(
                to_email="student@example.com",
                student_name="Test Student",
                program_name="Software Engineering",
                application_url="https://frontend.example.test/app/applications",
            )

        message = send.call_args.args[0]
        self.assertIn("certificate is now available", message["text"])
        self.assertIn("https://frontend.example.test/app/applications", message["html"])
        self.assertIn("Track Application", message["text"])
