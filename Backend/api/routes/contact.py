from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field, field_validator
from sqlmodel import Session

from Backend.core.config import settings
from Backend.core.mailer import send_contact_message
from Backend.core.rate_limit import enforce_rate_limit
from Backend.database import get_session
from Database.schemas import MessageResponse

router = APIRouter(prefix="/api/contact", tags=["contact"])


class ContactMessageRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(
        min_length=3,
        max_length=254,
        pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
    )
    message: str = Field(min_length=1, max_length=5000)
    consent: bool

    @field_validator("name", "email", "message")
    @classmethod
    def strip_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be blank")
        return value


@router.post("", response_model=MessageResponse)
def submit_contact_message(
    payload: ContactMessageRequest,
    request: Request,
    session: Session = Depends(get_session),
):
    if not payload.consent:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Consent is required to send this enquiry",
        )

    enforce_rate_limit(
        session,
        request,
        "contact_submission",
        payload.email,
        ip_limit=10,
        identity_limit=3,
        window_seconds=3600,
    )
    try:
        send_contact_message(
            to_email=settings.contact_email,
            name=payload.name,
            email=payload.email,
            message=payload.message,
        )
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to send your message right now. Please email us directly.",
        ) from error

    return MessageResponse(message="Your message has been sent.")
