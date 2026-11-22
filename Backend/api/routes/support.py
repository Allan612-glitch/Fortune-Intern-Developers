import asyncio
import os
from datetime import date, datetime, timezone
from time import monotonic
from typing import Literal
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func, or_
from sqlmodel import Session, select

from Backend.api.deps import get_current_user, workspace_permission
from Backend.api.routes.finance import ExportInput
from Backend.core.admin_reports import table_report
from Backend.core.audit import record_audit_event
from Backend.core.config import settings
from Backend.database import get_session
from Database.admin_records import SupportTicket, TicketUpdate
from Database.models import notification, user

router = APIRouter(tags=["support", "operations"])
support_access = workspace_permission("support")
operations_access = workspace_permission("operations")
TicketStatus = Literal["open", "in_progress", "closed"]


class TicketInput(BaseModel):
    account_id: UUID | None = None
    title: str = Field(min_length=3, max_length=160)
    description: str = Field(min_length=3, max_length=4000)
    category: Literal["general", "payment", "refund", "application", "system"]
    priority: Literal["normal", "high", "urgent"] = "normal"

    @field_validator("title", "description")
    @classmethod
    def reject_blank(cls, value):
        if len(value.strip()) < 3:
            raise ValueError("Enter at least three characters")
        return value.strip()


class TicketChange(BaseModel):
    ids: list[UUID] = Field(min_length=1, max_length=50)
    status: TicketStatus
    note: str = Field(max_length=2000)
    assign_to_me: bool = False
    due_date: date | None = None
    resolution: str | None = Field(default=None, max_length=2000)


def ticket_audit(session, request, account, action, ticket_id=None, **kwargs):
    return record_audit_event(session, request, actor_id=account.id, action=action, object_type="support",
                              object_id=str(ticket_id) if ticket_id else None, **kwargs)


def create_ticket(payload, request, account, subject, session):
    ticket = SupportTicket(account_id=subject.id, title=payload.title, description=payload.description,
                           category=payload.category, priority=payload.priority)
    session.add(ticket)
    ticket_audit(session, request, account, "support.ticket.opened", ticket.id,
                 changes={"status": (None, "open"), "category": (None, ticket.category)})
    session.commit()
    return ticket


@router.post("/api/admin/support", status_code=201)
def open_admin_ticket(payload: TicketInput, request: Request,
                      account: user = Depends(support_access), session: Session = Depends(get_session)):
    subject = session.get(user, payload.account_id) if payload.account_id else account
    if subject is None:
        raise HTTPException(404, "Account was not found")
    return create_ticket(payload, request, account, subject, session)


@router.post("/api/support", status_code=201)
def open_own_ticket(payload: TicketInput, request: Request,
                    account: user = Depends(get_current_user), session: Session = Depends(get_session)):
    payload.priority = "normal"
    return create_ticket(payload, request, account, account, session)


@router.get("/api/support")
def list_own_tickets(account: user = Depends(get_current_user), session: Session = Depends(get_session)):
    return session.exec(select(SupportTicket).where(SupportTicket.account_id == account.id)
                        .order_by(SupportTicket.updated_at.desc(), SupportTicket.id.desc()).limit(50)).all()


@router.get("/api/admin/support")
def list_tickets(status: TicketStatus | None = None, overdue: bool = False, account_id: UUID | None = None, q: str = Query(default="", max_length=120),
                 page: int = Query(default=1, ge=1, le=10000),
                 account: user = Depends(support_access), session: Session = Depends(get_session)):
    stmt = select(SupportTicket)
    if account_id is not None:
        stmt = stmt.where(SupportTicket.account_id == account_id)
    if status:
        stmt = stmt.where(SupportTicket.status == status)
    if overdue:
        stmt = stmt.where(SupportTicket.status != "closed", SupportTicket.due_date < datetime.now(timezone.utc).date())
    if q.strip():
        term = f"%{q.strip()}%"
        stmt = stmt.where(or_(SupportTicket.title.ilike(term), SupportTicket.category.ilike(term)))
    total = session.exec(select(func.count()).select_from(stmt.subquery())).one()
    items = session.exec(stmt.order_by(SupportTicket.updated_at.desc(), SupportTicket.id.desc())
                         .offset((page - 1) * 25).limit(25)).all()
    return {"items": items, "total": total}


@router.get("/api/admin/support/{ticket_id}")
def ticket_detail(ticket_id: UUID, account: user = Depends(support_access), session: Session = Depends(get_session)):
    ticket = session.get(SupportTicket, ticket_id)
    if ticket is None:
        raise HTTPException(404, "Ticket was not found")
    subject = session.get(user, ticket.account_id)
    assignee = session.get(user, ticket.assignee_id) if ticket.assignee_id else None
    updates = session.exec(select(TicketUpdate, user.name).outerjoin(user, user.id == TicketUpdate.actor_id)
                           .where(TicketUpdate.ticket_id == ticket_id)
                           .order_by(TicketUpdate.created_at.desc(), TicketUpdate.id.desc()).limit(100)).all()
    return {"ticket": ticket, "requester": subject.name if subject else None,
            "assignee": assignee.name if assignee else None,
            "updates": [{**update.model_dump(), "actor": name} for update, name in updates]}


@router.post("/api/admin/support/update")
def change_tickets(payload: TicketChange, request: Request,
                   account: user = Depends(support_access), session: Session = Depends(get_session)):
    ids = set(payload.ids)
    records = session.exec(select(SupportTicket).where(SupportTicket.id.in_(ids))
                           .order_by(SupportTicket.id).with_for_update()).all()
    if len(records) != len(ids):
        raise HTTPException(404, "Some selected tickets were not found")
    note = payload.note.strip()
    if not note:
        raise HTTPException(422, "Add a note explaining the update")
    if payload.status == "closed" and any(ticket.status != "in_progress" for ticket in records):
        raise HTTPException(409, "Move the selected tickets to In progress before closing them")
    if payload.status == "in_progress" and any(ticket.status == "closed" for ticket in records):
        raise HTTPException(409, "Reopen closed tickets before processing them")
    parent = None
    if len(records) > 1:
        parent = ticket_audit(session, request, account, "support.ticket.bulk_updated",
                              context={"targeted": len(records), "processed": len(records), "record_ids": [str(row.id) for row in records]})
    for ticket in records:
        previous = ticket.status
        previous_due = ticket.due_date
        previous_resolution = ticket.resolution
        ticket.status = payload.status
        if "due_date" in payload.model_fields_set:
            ticket.due_date = payload.due_date
        if ticket.status != "closed":
            ticket.resolution = None
        elif payload.resolution and (text := payload.resolution.strip()):
            ticket.resolution = text
            session.add(notification(user_id=ticket.account_id, message="A support ticket was closed. Open Support to see the resolution.",
                                     target_type="support", target_id=str(ticket.id), read=False))
        if payload.assign_to_me:
            ticket.assignee_id = account.id
        ticket.updated_at = datetime.now(timezone.utc)
        session.add(TicketUpdate(ticket_id=ticket.id, actor_id=account.id, status=ticket.status, note=note))
        ticket_audit(session, request, account, "support.ticket.updated", ticket.id,
                     changes={"status": (previous, ticket.status),
                              "deadline": (str(previous_due) if previous_due else None, str(ticket.due_date) if ticket.due_date else None),
                              "resolution": (previous_resolution, ticket.resolution)}, parent_id=parent.id if parent else None)
    session.commit()
    return {"updated": len(records)}


@router.post("/api/admin/support/export")
def export_tickets(payload: ExportInput, request: Request,
                   account: user = Depends(support_access), session: Session = Depends(get_session)):
    records = session.exec(select(SupportTicket).where(SupportTicket.id.in_(set(payload.ids)))
                           .order_by(SupportTicket.updated_at.desc(), SupportTicket.id)).all()
    if len(records) != len(set(payload.ids)):
        raise HTTPException(404, "Some selected tickets were not found")
    response = table_report("Support tickets", ["Ticket", "Title", "Category", "Priority", "Status", "Updated (UTC)"],
                            [[str(r.id), r.title, r.category, r.priority, r.status, r.updated_at.isoformat()]
                             for r in records], payload.format == "pdf")
    ticket_audit(session, request, account, "support.export",
                 context={"format": payload.format, "result_count": len(records)})
    session.commit()
    return response


@router.get("/api/admin/system-health")
async def check_health(request: Request, account: user = Depends(operations_access)):
    paths = (("/healthz", "API"), ("/readyz", "Database"), ("/api/programs", "Programs"))
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=request.app, raise_app_exceptions=False),
                                 base_url="http://health.internal") as client:
        async def probe(path, label):
            start = monotonic()
            try:
                response = await asyncio.wait_for(client.get(path, follow_redirects=True), timeout=4)
                return {"label": label, "route": path, "status": "Healthy" if response.is_success else "Failed",
                        "http_status": response.status_code, "duration_ms": round((monotonic() - start) * 1000)}
            except (TimeoutError, httpx.HTTPError):
                return {"label": label, "route": path, "status": "Unavailable", "http_status": None, "duration_ms": None}

        results = await asyncio.gather(*(probe(path, label) for path, label in paths))
    return {"checked_at": datetime.now(timezone.utc), "checks": results, "integrations": [
        {"label": "Paystack", "configured": bool(os.getenv("PAYSTACK_SECRET_KEY"))},
        {"label": "Document email", "configured": bool(settings.resend_api_key and settings.resend_from_email)},
    ]}
