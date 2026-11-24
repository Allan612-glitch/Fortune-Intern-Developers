from datetime import datetime, timedelta, timezone
from ipaddress import ip_address, ip_network
import json
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy import cast, String, func, or_
from sqlmodel import Session, select

from Backend.api.deps import get_current_admin, workspace_permission
from Backend.core.admin_reports import table_report
from Backend.core.audit import record_audit_event
from Backend.database import get_session
from Database.models import application, announcement, audit_event, program, user

router = APIRouter(prefix="/api/admin", tags=["audit"])
ORDER = (audit_event.created_at.desc(), audit_event.id.desc())
EXPORT_LIMIT = 1000
operations_access = workspace_permission("operations")


class Filters(BaseModel):
    q: str = Field(default="", max_length=150)
    actor: str = Field(default="", max_length=180)
    module: str = Field(default="", max_length=60)
    action: str = Field(default="", max_length=100)
    outcome: str = Field(default="", max_length=40)
    entity: str = Field(default="", max_length=100)
    entity_type: str = Field(default="", max_length=60)
    correlation: UUID | None = None
    workflow: str = Field(default="", max_length=100)
    as_of: datetime | None = None
    date_from: datetime | None = None
    date_to: datetime | None = None


def as_utc(value: datetime) -> datetime:
    return value.astimezone(timezone.utc) if value.tzinfo else value.replace(tzinfo=timezone.utc)


def filtered_events(filters: Filters):
    statement = select(audit_event)
    fields = {
        "module": func.coalesce(audit_event.module, audit_event.object_type),
        "action": audit_event.action, "outcome": audit_event.result,
        "entity": audit_event.object_id, "entity_type": audit_event.object_type,
        "correlation": audit_event.correlation_id, "workflow": audit_event.workflow_id,
    }
    for name, field in fields.items():
        if value := getattr(filters, name):
            statement = statement.where(field == value)
    if filters.actor:
        statement = statement.where(or_(
            cast(audit_event.actor_id, String).icontains(filters.actor, autoescape=True),
            audit_event.actor_name.icontains(filters.actor, autoescape=True),
        ))
    if filters.q:
        statement = statement.where(or_(
            audit_event.action.icontains(filters.q, autoescape=True),
            audit_event.object_id.icontains(filters.q, autoescape=True),
            audit_event.actor_name.icontains(filters.q, autoescape=True),
            audit_event.object_type.icontains(filters.q, autoescape=True),
        ))
    if filters.date_from and filters.date_to and as_utc(filters.date_from) > as_utc(filters.date_to):
        raise HTTPException(status_code=422, detail="Start date must precede end date")
    if filters.date_from:
        statement = statement.where(audit_event.created_at >= as_utc(filters.date_from))
    if filters.date_to:
        statement = statement.where(audit_event.created_at < as_utc(filters.date_to))
    if filters.as_of:
        statement = statement.where(audit_event.created_at <= as_utc(filters.as_of))
    return statement.order_by(*ORDER)


def origin(ip: str | None) -> str | None:
    if not ip:
        return None
    try:
        address = ip_address(ip)
        prefix = 24 if address.version == 4 else 48
        return str(ip_network(f"{ip}/{prefix}", strict=False))
    except ValueError:
        return None


def evidence(row: audit_event, full: bool = False) -> dict:
    event = {
        "id": str(row.id), "timestamp": as_utc(row.created_at).isoformat(),
        "actor_id": str(row.actor_id) if row.actor_id else None, "actor_name": row.actor_name,
        "actor_type": row.actor_type, "actor_role": row.actor_role, "action": row.action,
        "module": row.module or row.object_type, "entity_type": row.object_type,
        "entity_id": row.object_id, "outcome": row.result,
        "correlation_id": str(row.correlation_id) if row.correlation_id else None,
        "workflow_id": row.workflow_id, "parent_id": str(row.parent_id) if row.parent_id else None,
        "retry_of_id": str(row.retry_of_id) if row.retry_of_id else None,
        "reversal_of_id": str(row.reversal_of_id) if row.reversal_of_id else None,
    }
    if full:
        event.update(origin_network=origin(row.source_ip), service="Fortune Intern API", details=row.details)
    return event


class AuditQuery(Filters):
    limit: int = Field(default=30, ge=1, le=100)
    offset: int = Field(default=0, ge=0, le=1_000_000)
    opened: bool = False


@router.get("/audit")
def list_events(
    filters: Annotated[AuditQuery, Query()],
    request: Request,
    account: user = Depends(get_current_admin), session: Session = Depends(get_session),
):
    filters.as_of = filters.as_of or datetime.now(timezone.utc)
    rows = session.exec(filtered_events(filters).offset(filters.offset).limit(filters.limit + 1)).all()
    # Record initial access without creating a new event on every filter edit or page.
    if filters.opened:
        record_audit_event(session, request, actor_id=account.id, action="audit.access", object_type="audit", object_id=None)
        session.commit()
    return {"events": [evidence(row) for row in rows[:filters.limit]], "has_more": len(rows) > filters.limit,
            "as_of": as_utc(filters.as_of).isoformat()}


@router.get("/audit/{event_id}")
def inspect_event(
    event_id: UUID, request: Request, offset: int = Query(default=0, ge=0, le=1_000_000),
    account: user = Depends(get_current_admin), session: Session = Depends(get_session),
):
    row = session.get(audit_event, event_id)
    if not row:
        raise HTTPException(status_code=404, detail="Audit event not found or no longer retained")
    branches = session.exec(select(audit_event).where(or_(
        audit_event.parent_id == event_id, audit_event.retry_of_id == event_id, audit_event.reversal_of_id == event_id,
    )).order_by(audit_event.created_at, audit_event.id).offset(offset).limit(21)).all()
    data = {"event": evidence(row, True), "related": [evidence(child) for child in branches[:20]], "has_more": len(branches) > 20}
    if offset == 0:
        record_audit_event(session, request, actor_id=account.id, action="audit.inspect", object_type="audit", object_id=str(event_id))
        session.commit()
    return data


class AuditExport(BaseModel):
    format: Literal["pdf", "xlsx", "json"]
    filters: Filters = Field(default_factory=Filters)


@router.post("/audit/export")
def export_events(payload: AuditExport, request: Request, account: user = Depends(get_current_admin), session: Session = Depends(get_session)):
    entries = session.exec(filtered_events(payload.filters).limit(EXPORT_LIMIT + 1)).all()
    if len(entries) > EXPORT_LIMIT:
        raise HTTPException(status_code=422, detail="Narrow filters to export at most 1,000 events")
    records = [evidence(row, True) for row in entries]
    # PDF filters are useful provenance. Do not echo free-form searches or actor names into PDFs.
    metadata = payload.filters.model_dump(mode="json", exclude_defaults=True)
    filter_summary = " · ".join(f"{key}: {value}" for key, value in metadata.items() if key not in {"q", "actor"})
    if "q" in metadata or "actor" in metadata:
        filter_summary = (filter_summary + " · " if filter_summary else "") + "Text or actor filter applied"
    if payload.format == "json":
        content = json.dumps({"generated_at": datetime.now(timezone.utc).isoformat(), "timezone": "UTC",
                              "filters": metadata, "events": records}, indent=2)
        response = Response(content, media_type="application/json", headers={
            "Content-Disposition": 'attachment; filename="audit-trail.json"', "Cache-Control": "no-store",
        })
    else:
        headers = ["UTC timestamp", "Actor", "Action", "Module", "Record", "Outcome", "Event ID"]
        rows = [[item["timestamp"], item["actor_name"] or item["actor_id"], item["action"], item["module"],
                 item["entity_id"], item["outcome"], item["id"]] for item in records]
        response = table_report("Audit trail", headers, rows, payload.format == "pdf", subtitle=filter_summary or "All events")
    record_audit_event(session, request, actor_id=account.id, action="audit.export", object_type="audit", object_id=None,
                       context={"format": payload.format, "result_count": len(records)})
    session.commit()
    return response


@router.get("/operations")
def operations(account: user = Depends(operations_access), session: Session = Depends(get_session)):
    days = 30
    since = datetime.now(timezone.utc) - timedelta(days=days)
    by_status = dict(session.exec(select(application.status, func.count(application.id)).group_by(application.status)).all())
    audit_outcomes = dict(session.exec(select(audit_event.result, func.count(audit_event.id))
        .where(audit_event.created_at >= since, audit_event.object_type != "audit").group_by(audit_event.result)).all())
    return {
        "days": days, "since": since.isoformat(), "application_statuses": by_status,
        "new_applications": session.exec(select(func.count(application.id)).where(application.created_at >= since)).one(),
        "new_accounts": session.exec(select(func.count(user.id)).where(user.created_at >= since)).one(),
        "announcements": session.exec(select(func.count(announcement.id)).where(announcement.created_at >= since)).one(),
        "open_programs": session.exec(select(func.count(program.id)).where(
            program.status == "open", program.cycle_closed_at.is_(None),
            or_(program.deadline.is_(None), program.deadline > datetime.now(timezone.utc)),
        )).one(),
        "audit_outcomes": audit_outcomes,
    }
