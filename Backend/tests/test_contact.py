import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from Backend.database import get_session
from Backend.main import create_app


class TestContactEndpoint(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.dependency_overrides[get_session] = lambda: None
        self.client = TestClient(self.app)

    def tearDown(self):
        self.client.close()
        self.app.dependency_overrides.clear()

    def test_sends_consented_submission_to_contact_email(self):
        payload = {
            "name": "Test Sender",
            "email": "sender@example.com",
            "message": "Please contact me.",
            "consent": True,
        }
        with (
            patch("Backend.api.routes.contact.enforce_rate_limit") as rate_limit,
            patch("Backend.api.routes.contact.send_contact_message") as deliver,
        ):
            response = self.client.post("/api/contact", json=payload)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"message": "Your message has been sent."})
        rate_limit.assert_called_once()
        deliver.assert_called_once_with(
            to_email="fortuneintern.gh@gmail.com",
            name="Test Sender",
            email="sender@example.com",
            message="Please contact me.",
        )

    def test_rejects_submission_without_consent(self):
        payload = {
            "name": "Test Sender",
            "email": "sender@example.com",
            "message": "Please contact me.",
            "consent": False,
        }
        with (
            patch("Backend.api.routes.contact.enforce_rate_limit") as rate_limit,
            patch("Backend.api.routes.contact.send_contact_message") as deliver,
        ):
            response = self.client.post("/api/contact", json=payload)

        self.assertEqual(response.status_code, 422)
        rate_limit.assert_not_called()
        deliver.assert_not_called()

    def test_reports_delivery_failure_without_a_success_response(self):
        payload = {
            "name": "Test Sender",
            "email": "sender@example.com",
            "message": "Please contact me.",
            "consent": True,
        }
        with (
            patch("Backend.api.routes.contact.enforce_rate_limit"),
            patch(
                "Backend.api.routes.contact.send_contact_message",
                side_effect=RuntimeError("email provider unavailable"),
            ),
        ):
            response = self.client.post("/api/contact", json=payload)

        self.assertEqual(response.status_code, 503)
        self.assertEqual(
            response.json()["detail"],
            "Unable to send your message right now. Please email us directly.",
        )
