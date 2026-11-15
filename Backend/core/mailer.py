"""Email delivery for application receipts, announcements, and internship documents."""
from html import escape
import logging
import time

import resend
from resend.exceptions import RateLimitError

from Backend.core.config import settings

logger = logging.getLogger(__name__)

ANNOUNCEMENT_EMAIL_BATCH_SIZE = 100
ANNOUNCEMENT_EMAIL_BATCH_INTERVAL_SECONDS = 0.12
ANNOUNCEMENT_EMAIL_MAX_RATE_LIMIT_RETRIES = 3


def _send_announcement_batch(emails: list[resend.Emails.SendParams]) -> None:
    for attempt in range(ANNOUNCEMENT_EMAIL_MAX_RATE_LIMIT_RETRIES + 1):
        try:
            resend.Batch.send(emails)
            return
        except RateLimitError as error:
            if attempt == ANNOUNCEMENT_EMAIL_MAX_RATE_LIMIT_RETRIES:
                raise

            retry_after = next(
                (
                    value
                    for name, value in error.headers.items()
                    if name.lower() == "retry-after"
                ),
                None,
            )
            try:
                delay = float(retry_after) if retry_after is not None else 0
            except ValueError:
                delay = 0
            time.sleep(max(delay, 0.5 * (2**attempt)))


def send_announcement_emails(
    *,
    to_emails: list[str],
    title: str,
    content: str,
) -> None:
    if not to_emails:
        return
    if not all((settings.resend_api_key, settings.resend_from_email)):
        logger.warning(
            "Skipping announcement email: RESEND_API_KEY/RESEND_FROM_EMAIL not configured"
        )
        return

    safe_title = escape(title)
    safe_content = escape(content).replace("\n", "<br>")
    resend.api_key = settings.resend_api_key
    emails: list[resend.Emails.SendParams] = [
        {
            "from": settings.resend_from_email,
            "to": [to_email],
            "subject": "New announcement from Fortune Intern Network",
            "text": f"{title}\n\n{content}\n\nFortune Intern Network",
            "html": (
                "<h1>New announcement</h1>"
                f"<h2>{safe_title}</h2>"
                f"<p>{safe_content}</p>"
                "<p>Fortune Intern Network</p>"
            ),
        }
        for to_email in to_emails
    ]

    for offset in range(0, len(emails), ANNOUNCEMENT_EMAIL_BATCH_SIZE):
        if offset:
            time.sleep(ANNOUNCEMENT_EMAIL_BATCH_INTERVAL_SECONDS)
        batch = emails[offset : offset + ANNOUNCEMENT_EMAIL_BATCH_SIZE]
        try:
            _send_announcement_batch(batch)
        except Exception:
            logger.exception(
                "Failed to send announcement email batch for recipients %d-%d",
                offset + 1,
                offset + len(batch),
            )


def send_application_received_email(
        *,
        to_email: str,
        student_name: str,
        institution: str,
        program_of_study: str,
        year_of_study: str,
        company: str,
        role: str,
        reference: str,
        submitted_at: str,
) -> None:
        if not all((settings.resend_api_key, settings.resend_from_email)):
                logger.warning("Skipping application receipt email: RESEND_API_KEY/RESEND_FROM_EMAIL not configured")
                return

        values = {
                "student_name": escape(student_name),
                "institution": escape(institution),
                "program_of_study": escape(program_of_study),
                "year_of_study": escape(year_of_study),
                "company": escape(company),
                "role": escape(role),
                "reference": escape(reference),
                "submitted_at": escape(submitted_at),
        }
        text = (
                f"Dear {student_name},\n\n"
                "Thank you for applying to the Fortune Intern Programme.\n\n"
                "Application Summary\n"
                f"Institution: {institution}\n"
                f"Program: {program_of_study}\n"
                f"Year: {year_of_study}\n"
                f"Company: {company}\n"
                f"Role: {role}\n"
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
                <tr><td style="padding:8px 0;font-weight:bold">Institution</td><td style="padding:8px 0">{values['institution']}</td></tr>
                <tr><td style="padding:8px 0;font-weight:bold">Program</td><td style="padding:8px 0">{values['program_of_study']}</td></tr>
                <tr><td style="padding:8px 0;font-weight:bold">Year</td><td style="padding:8px 0">{values['year_of_study']}</td></tr>
                <tr><td style="padding:8px 0;font-weight:bold">Company</td><td style="padding:8px 0">{values['company']}</td></tr>
                <tr><td style="padding:8px 0;font-weight:bold">Role</td><td style="padding:8px 0">{values['role']}</td></tr>
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
        raise RuntimeError(
            "RESEND_API_KEY and RESEND_FROM_EMAIL must be configured to send application documents"
        )

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
    except Exception as error:
        logger.exception("Failed to send application documents email to %s", to_email)
        raise RuntimeError("Unable to send application documents email") from error


def send_certificate_available_email(
    *,
    to_email: str,
    student_name: str,
    program_name: str,
    application_url: str,
) -> None:
    if not all((settings.resend_api_key, settings.resend_from_email)):
        raise RuntimeError(
            "RESEND_API_KEY and RESEND_FROM_EMAIL must be configured to notify applicants"
        )

    safe_name = escape(student_name)
    safe_program = escape(program_name)
    safe_url = escape(application_url, quote=True)
    resend.api_key = settings.resend_api_key
    try:
        resend.Emails.send({
            "from": settings.resend_from_email,
            "to": [to_email],
            "subject": "Your Fortune Intern Network certificate is ready",
            "text": (
                f"Hi {student_name},\n\n"
                f"Your supervisor assessment for {program_name} has been reviewed and your "
                "completion certificate is now available. Sign in and open My Applications, "
                "then Track Application to download it.\n\n"
                f"Open your dashboard: {application_url}\n\n"
                "Fortune Intern Network"
            ),
            "html": (
                "<p>Hi " + safe_name + ",</p>"
                "<p>Your supervisor assessment for <strong>" + safe_program + "</strong> "
                "has been reviewed and your completion certificate is now available.</p>"
                "<p>Sign in and open <strong>My Applications</strong>, then "
                "<strong>Track Application</strong> to download it.</p>"
                f'<p><a href="{safe_url}">Open your dashboard</a></p>'
                "<p>Fortune Intern Network</p>"
            ),
        })
    except Exception as error:
        logger.exception("Failed to notify applicant about certificate availability")
        raise RuntimeError("Unable to send certificate availability email") from error


def send_contact_message(
    *,
    to_email: str,
    name: str,
    email: str,
    message: str,
) -> None:
    if not all((settings.resend_api_key, settings.resend_from_email)):
        raise RuntimeError(
            "RESEND_API_KEY and RESEND_FROM_EMAIL must be configured to deliver contact messages"
        )

    resend.api_key = settings.resend_api_key
    try:
        resend.Emails.send({
            "from": settings.resend_from_email,
            "to": [to_email],
            "reply_to": email,
            "subject": "New contact form enquiry",
            "text": f"Name: {name}\nEmail: {email}\n\n{message}",
            "html": (
                "<h2>New contact form enquiry</h2>"
                f"<p><strong>Name:</strong> {escape(name)}</p>"
                f"<p><strong>Email:</strong> {escape(email)}</p>"
                f"<p>{escape(message).replace(chr(10), '<br>')}</p>"
            ),
        })
    except Exception as error:
        logger.exception("Failed to deliver contact form submission")
        raise RuntimeError("Unable to send contact form message") from error
