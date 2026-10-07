"""Email delivery for application receipts and internship documents."""
from html import escape
import logging

import resend

from Backend.core.config import settings

logger = logging.getLogger(__name__)


def send_application_received_email(
        *,
        to_email: str,
        student_name: str,
        program_name: str,
        year_of_study: str,
        company: str,
        reference: str,
        submitted_at: str,
) -> None:
        if not all((settings.resend_api_key, settings.resend_from_email)):
                logger.warning("Skipping application receipt email: RESEND_API_KEY/RESEND_FROM_EMAIL not configured")
                return

        values = {
                "student_name": escape(student_name),
                "program_name": escape(program_name),
                "year_of_study": escape(year_of_study),
                "company": escape(company),
                "reference": escape(reference),
                "submitted_at": escape(submitted_at),
        }
        text = (
                f"Dear {student_name},\n\n"
                "Thank you for applying to the Fortune Intern Programme.\n\n"
                "Application Summary\n"
                f"Program: {program_name}\n"
                f"Year: {year_of_study}\n"
                f"Company: {company}\n"
                f"Reference: {reference}\n"
                f"Submission date: {submitted_at}\n\n"
                "Questions? Contact fortuneintern.gh@gmail.com or 0257038948.\n\n"
                "Best regards,\nThe Fortune Intern Team"
        )
        html = f"""<!doctype html>
<html lang="en">
    <body style="margin:0;padding:24px;background:#f4f5f8;font-family:Arial,sans-serif;color:#1a1f3a">
        <main style="max-width:600px;margin:0 auto;padding:32px;background:#fff;border:1px solid #e1e4eb;border-radius:12px">
            <h1 style="margin:0 0 24px;color:#2d3561;font-size:24px">Fortune Intern</h1>
            <p>Dear {values['student_name']},</p>
            <p>Thank you for applying to the Fortune Intern Programme. We have received your application.</p>
            <h2 style="margin:28px 0 12px;font-size:18px">Application Summary</h2>
            <table style="width:100%;border-collapse:collapse">
                <tr><td style="padding:8px 0;font-weight:bold">Program</td><td style="padding:8px 0">{values['program_name']}</td></tr>
                <tr><td style="padding:8px 0;font-weight:bold">Year</td><td style="padding:8px 0">{values['year_of_study']}</td></tr>
                <tr><td style="padding:8px 0;font-weight:bold">Company</td><td style="padding:8px 0">{values['company']}</td></tr>
                <tr><td style="padding:8px 0;font-weight:bold">Reference</td><td style="padding:8px 0">{values['reference']}</td></tr>
                <tr><td style="padding:8px 0;font-weight:bold">Submission date</td><td style="padding:8px 0">{values['submitted_at']}</td></tr>
            </table>
            <p style="margin-top:28px">Questions? Contact fortuneintern.gh@gmail.com or 0257038948.</p>
            <p>Best regards,<br>The Fortune Intern Team</p>
        </main>
    </body>
</html>"""

        resend.api_key = settings.resend_api_key
        try:
                resend.Emails.send({
                        "from": settings.resend_from_email,
                        "to": [to_email],
                        "subject": "Application Received - Fortune Intern",
                        "text": text,
                        "html": html,
                })
        except Exception:
                logger.exception("Failed to send application receipt email to %s", to_email)


def send_application_documents_email(
    *,
    to_email: str,
    student_name: str,
    program_name: str,
    letter_pdf: bytes,
    assessment_pdf: bytes,
) -> None:
    if not all((settings.resend_api_key, settings.resend_from_email)):
        logger.warning("Skipping application documents email: RESEND_API_KEY/RESEND_FROM_EMAIL not configured")
        return

    resend.api_key = settings.resend_api_key
    try:
        resend.Emails.send({
            "from": settings.resend_from_email,
            "to": [to_email],
            "subject": f"Your Fortune Intern Network application documents — {program_name}",
            "text": (
                f"Hi {student_name},\n\n"
                f"Congratulations! Your application for {program_name} has been accepted by the "
                "Fortune Intern Network team. Attached are your internship recommendation letter "
                "and a blank assessment form for your host supervisor to complete at the end of "
                "your attachment.\n\n"
                "Best of luck!\nFortune Intern Network"
            ),
            "attachments": [
                {
                    "filename": "FIN_Recommendation_Letter.pdf",
                    "content": list(letter_pdf),
                    "content_type": "application/pdf",
                },
                {
                    "filename": "FIN_Assessment_Form.pdf",
                    "content": list(assessment_pdf),
                    "content_type": "application/pdf",
                },
            ],
        })
    except Exception:
        logger.exception("Failed to send application documents email to %s", to_email)
