from datetime import datetime, timedelta, timezone
from typing import Literal
from uuid import UUID

import resend
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from Backend.api.deps import workspace_applications
from Backend.core.audit import record_audit_event
from Backend.core.config import settings
from Backend.database import get_session
from Database.followup_records import ApplicationMessage
from Database.models import application, user

router = APIRouter(prefix="/api/admin/applications", tags=["application follow-ups"])
Template = Literal["document_reminder", "status_update"]
TEMPLATES = {
    "document_reminder": ("Documents needed for your internship application",
                          "Please open your application notifications to see which documents the team needs."),
    "status_update": ("Check your Fortune Intern application status",
                      "Sign in to see the latest status of your application."),
}


class MessageInput(BaseModel):
    id: UUID
    template: Template


def response(row):
    return {"id": row.id, "template": row.template, "status": row.status,
            "attempts": row.attempts, "created_at": row.created_at}


def get_application(session, application_id):
    row = session.get(application, application_id)
    if row is None:
        raise HTTPException(404, "Application not found")
    return row


def dispatch(session, request, actor, row, owner):
    if row.status == "accepted":
        return response(row)
    if owner.is_suspended or owner.deletion_requested_at is not None or row.recipient_email != owner.email:
        raise HTTPException(409, "The original recipient is no longer available")
    timestamp = row.created_at
    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) - timestamp > timedelta(hours=20):
        raise HTTPException(409, "The retry window ended. Review the provider history before sending again")
    if row.attempts >= 5:
        raise HTTPException(409, "This message reached the retry limit")
    if not settings.resend_api_key or not settings.resend_from_email:
        raise HTTPException(503, "Email is not configured")
    subject, text = TEMPLATES[row.template]
    resend.api_key = settings.resend_api_key
    try:
        result = resend.Emails.send({
            "from": settings.resend_from_email, "to": [row.recipient_email],
            "subject": subject, "text": f"{text}\n\n{settings.frontend_url.rstrip('/')}/app/applications",
        }, {"idempotency_key": f"application-message/{row.id}"})
        row.status = "accepted"
        row.provider_id = result["id"]
    except Exception:  # The provider outcome is uncertain. A retry uses the same idempotency key.
        row.status = "failed"
    row.attempts += 1
    record_audit_event(session, request, actor_id=actor.id, action="application.follow_up.email",
                       object_type="application", object_id=str(row.application_id), workflow_id=str(row.application_id),
                       result="success" if row.status == "accepted" else "failure", context={"reason": row.template})
    session.add(row)
    session.commit()
    return response(row)


@router.get("/{application_id}/messages")
def history(application_id: UUID, actor: user = Depends(workspace_applications), session: Session = Depends(get_session)):
    get_application(session, application_id)
    rows = session.exec(select(ApplicationMessage).where(ApplicationMessage.application_id == application_id)
                        .order_by(ApplicationMessage.created_at.desc(), ApplicationMessage.id.desc()).limit(25))
    return [response(row) for row in rows]


@router.post("/{application_id}/messages")
def send_message(application_id: UUID, payload: MessageInput, request: Request,
                 actor: user = Depends(workspace_applications), session: Session = Depends(get_session)):
    candidate = get_application(session, application_id)
    if payload.template == "document_reminder" and (not candidate.document_request or candidate.status in {"accepted", "rejected", "withdrawn"}):
        raise HTTPException(422, "Open a document request before sending a reminder")
    owner = session.get(user, candidate.user_id)
    if owner is None:
        raise HTTPException(404, "Applicant was not found")
    existing = session.get(ApplicationMessage, payload.id, with_for_update=True)
    if existing is not None:
        if existing.application_id != application_id or existing.template != payload.template:
            raise HTTPException(409, "This request ID is already in use")
        return response(existing)
    row = ApplicationMessage(id=payload.id, application_id=application_id, template=payload.template, recipient_email=owner.email)
    session.add(row)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        existing = session.get(ApplicationMessage, payload.id)
        if existing and existing.application_id == application_id and existing.template == payload.template:
            return response(existing)
        raise
    row = session.get(ApplicationMessage, row.id, with_for_update=True)
    return dispatch(session, request, actor, row, owner)


@router.post("/{application_id}/messages/{message_id}/retry")
def retry_message(application_id: UUID, message_id: UUID, request: Request,
                  actor: user = Depends(workspace_applications), session: Session = Depends(get_session)):
    candidate = get_application(session, application_id)
    row = session.get(ApplicationMessage, message_id, with_for_update=True)
    if row is None or row.application_id != application_id:
        raise HTTPException(404, "Follow-up was not found")
    if row.template == "document_reminder" and (not candidate.document_request or candidate.status in {"accepted", "rejected", "withdrawn"}):
        raise HTTPException(409, "This application no longer has an open document request")
    owner = session.get(user, candidate.user_id)
    if owner is None:
        raise HTTPException(404, "Applicant was not found")
    return dispatch(session, request, actor, row, owner)
