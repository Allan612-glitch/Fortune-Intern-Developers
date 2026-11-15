import unittest
from datetime import date, datetime, timezone
from types import SimpleNamespace
from typing import cast
from unittest.mock import Mock, patch
from uuid import uuid4

from fastapi import HTTPException, Request
from sqlmodel import Session

from Backend.api.routes.admin import approve_application_certificate
from Backend.api.routes.applications import download_completion_certificate
from Backend.core.certificates import build_completion_certificate_pdf
from Database.models import user
from Database.schemas import AdminCertificateApprovalRequest


class TestCompletionCertificatePdf(unittest.TestCase):
    def test_builds_a_personalized_pdf(self):
        fields = {
            "name": "Alex Example",
            "inst": "Test University",
            "prog": "Software Engineering Intern — Test Company",
            "start": "10th June, 2026",
            "end": "11th September, 2026",
            "duration": "Three months",
            "grade": "with commendable performance",
            "certno": "FIN/CERT/2026/0001",
            "issued": "14th November, 2026",
            "sname": "Emmanuel Amoasi",
            "srole": "Managing Director",
        }

        rendered = build_completion_certificate_pdf(fields)

        self.assertTrue(rendered.startswith(b"%PDF-"))
        self.assertTrue(rendered.rstrip().endswith(b"%%EOF"))
        self.assertIn(b"Alex Example", rendered)
        self.assertIn(b"Test University", rendered)
        self.assertIn(b"Test Company", rendered)
        self.assertIn(b"Three months", rendered)
        self.assertIn(b"commendable performance", rendered)


class TestCertificateApprovalGate(unittest.TestCase):
    def test_applicant_cannot_download_before_admin_approval(self):
        account_id = uuid4()
        row = SimpleNamespace(
            user_id=account_id,
            status="accepted",
            supervisor_assessment_path="assessments/test.pdf",
            certificate_approved=False,
        )
        session = Mock()
        session.get.return_value = row

        with self.assertRaises(HTTPException) as raised:
            download_completion_certificate(
                str(uuid4()),
                Mock(),
                SimpleNamespace(id=account_id),
                session,
            )

        self.assertEqual(raised.exception.status_code, 403)

    def test_approved_download_returns_personalized_pdf_attachment(self):
        account_id = uuid4()
        program_id = uuid4()
        row = SimpleNamespace(
            id=uuid4(),
            user_id=account_id,
            program_id=program_id,
            status="accepted",
            supervisor_assessment_path="assessments/test.pdf",
            certificate_approved=True,
            certificate_approved_at=datetime(2026, 11, 12, tzinfo=timezone.utc),
            internship_start_date=date(2026, 6, 10),
            internship_end_date=date(2026, 9, 11),
            host_company_name="Test Company",
            created_at=datetime(2026, 6, 1, tzinfo=timezone.utc),
            applicant_name="Alex Example",
            applicant_institution="Test University",
        )
        program = SimpleNamespace(
            name="Software Engineering Intern",
            company="Test Company",
            duration="Three months",
        )
        session = Mock()
        session.get.side_effect = [row, program]

        with patch("Backend.api.routes.applications.record_audit_event"):
            response = download_completion_certificate(
                str(row.id),
                Mock(),
                SimpleNamespace(id=account_id, name="Account Name"),
                session,
            )

        self.assertEqual(response.media_type, "application/pdf")
        self.assertTrue(response.body.startswith(b"%PDF-"))
        self.assertIn("attachment", response.headers["content-disposition"])
        self.assertIn(row.id.hex[:8].upper(), response.headers["content-disposition"])
        self.assertTrue(response.headers["content-disposition"].endswith(".pdf"))
        self.assertIn(b"Alex Example", response.body)
        self.assertIn(b"Test University", response.body)
        self.assertIn(b"Test Company", response.body)

    def test_admin_cannot_approve_without_a_submitted_assessment(self):
        row = SimpleNamespace(
            status="accepted",
            documents_sent=True,
            supervisor_assessment_path=None,
        )
        session = Mock()
        session.get.return_value = row

        with (
            patch("Backend.api.routes.admin.send_certificate_available_email") as send_email,
            self.assertRaises(HTTPException) as raised,
        ):
            approve_application_certificate(
                str(uuid4()),
                AdminCertificateApprovalRequest(
                    internship_start_date=date(2026, 6, 10),
                    internship_end_date=date(2026, 9, 11),
                ),
                cast(Request, Mock()),
                cast(user, SimpleNamespace(id=uuid4())),
                cast(Session, session),
            )

        self.assertEqual(raised.exception.status_code, 409)
        send_email.assert_not_called()

    def test_admin_cannot_approve_with_reversed_internship_dates(self):
        row = SimpleNamespace(
            status="accepted",
            documents_sent=True,
            supervisor_assessment_path="assessments/test.pdf",
            certificate_approved=False,
        )
        session = Mock()
        session.get.return_value = row

        with (
            patch("Backend.api.routes.admin.send_certificate_available_email") as send_email,
            self.assertRaises(HTTPException) as raised,
        ):
            approve_application_certificate(
                str(uuid4()),
                AdminCertificateApprovalRequest(
                    internship_start_date=date(2026, 9, 11),
                    internship_end_date=date(2026, 6, 10),
                ),
                cast(Request, Mock()),
                cast(user, SimpleNamespace(id=uuid4())),
                cast(Session, session),
            )

        self.assertEqual(raised.exception.status_code, 422)
        send_email.assert_not_called()

    def test_admin_approval_persists_dates_and_notifies_applicant(self):
        application_id = uuid4()
        applicant_id = uuid4()
        program_id = uuid4()
        row = SimpleNamespace(
            id=application_id,
            user_id=applicant_id,
            program_id=program_id,
            status="accepted",
            documents_sent=True,
            supervisor_assessment_path="assessments/test.pdf",
            supervisor_assessment_filename="assessment.pdf",
            certificate_approved=False,
            applicant_name="Alex Example",
            resume_filename=None,
            gender=None,
            student_index_number=None,
            year_of_study=None,
            suggested_company=None,
            date_of_birth=None,
            created_at=datetime(2026, 6, 1, tzinfo=timezone.utc),
            applicant_institution="Test University",
            applicant_course="Computer Science",
            applicant_contact=None,
            host_company_name="Test Company",
            host_company_address=None,
        )
        applicant = SimpleNamespace(
            id=applicant_id,
            name="Alex Example",
            email="alex@example.test",
        )
        program = SimpleNamespace(id=program_id, name="Software Engineering")
        session = Mock()
        session.get.side_effect = [row, applicant, program]
        payload = AdminCertificateApprovalRequest(
            internship_start_date=date(2026, 6, 10),
            internship_end_date=date(2026, 9, 11),
        )

        with (
            patch("Backend.api.routes.admin.send_certificate_available_email") as send_email,
            patch("Backend.api.routes.admin.record_audit_event"),
        ):
            response = approve_application_certificate(
                str(application_id),
                payload,
                cast(Request, Mock()),
                cast(user, SimpleNamespace(id=uuid4())),
                cast(Session, session),
            )

        self.assertTrue(row.certificate_approved)
        self.assertEqual(row.internship_start_date, date(2026, 6, 10))
        self.assertEqual(row.internship_end_date, date(2026, 9, 11))
        self.assertEqual(response.internship_start_date, date(2026, 6, 10))
        self.assertEqual(response.internship_end_date, date(2026, 9, 11))
        send_email.assert_called_once()


if __name__ == "__main__":
    unittest.main()
