"""Email delivery for internship application documents (recommendation letter + assessment form)."""
import logging

import resend

from Backend.core.config import settings

logger = logging.getLogger(__name__)


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
