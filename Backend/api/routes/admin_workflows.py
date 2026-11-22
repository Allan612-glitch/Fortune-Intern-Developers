from datetime import datetime, timedelta, timezone
from statistics import median
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from Backend.api.deps import can_manage_staff, get_current_admin, get_current_user
from Backend.api.routes.audit import ORDER, evidence
from Backend.core.audit import record_audit_event
from Backend.core.config import settings
from Backend.core.staff_access import WORKSPACE_PERMISSIONS, role_definitions, staff_permissions
from Backend.database import get_session
from Database.admin_records import FinanceRecord, SupportTicket, WorkspaceRole
from Database.placement_records import Placement
from Database.reconciliation_records import InvoiceMatch
from Database.models import application, application_status_history, audit_event, program, user

router = APIRouter(prefix="/api/admin", tags=["admin workflows"])


class NameInput(BaseModel):
    name: str = Field(min_length=2, max_length=180)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value):
        if len(value.strip()) < 2:
            raise ValueError("Enter a name")
        return value.strip()


class AccountInput(NameInput):
    email: str = Field(max_length=254, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class RoleInput(NameInput):
    name: str = Field(min_length=2, max_length=80)
    permissions: list[str] = Field(min_length=1, max_length=len(WORKSPACE_PERMISSIONS))


@router.get("/work-summary")
def work_summary(account: user = Depends(get_current_admin), session: Session = Depends(get_session)):
    today = datetime.now(timezone.utc).date()
    waiting = select(func.count(Placement.id)).where(Placement.status == "proposed")
    unmatched = select(func.count(FinanceRecord.id)).outerjoin(InvoiceMatch, InvoiceMatch.payment_id == FinanceRecord.id).where(
        FinanceRecord.kind == "payment", FinanceRecord.test_mode.is_(False), InvoiceMatch.payment_id.is_(None),
    )
    overdue = select(func.count(SupportTicket.id)).where(SupportTicket.status != "closed", SupportTicket.due_date < today)
    placements, payments, support = session.exec(select(waiting.scalar_subquery(), unmatched.scalar_subquery(), overdue.scalar_subquery())).one()
    return {"placements": placements, "payments": payments, "support": support}


@router.get("/opportunity-outcomes")
def opportunity_outcomes(account: user = Depends(get_current_admin), session: Session = Depends(get_session)):
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=30)
    open_verified = session.exec(select(func.count()).select_from(program).where(
        program.status == "open", program.cycle_closed_at.is_(None), or_(program.deadline.is_(None), program.deadline > now),
        program.opportunity["employer_verified"].as_boolean().is_(True),
    )).one()
    submitted = session.exec(select(func.count()).select_from(application).where(application.created_at >= cutoff)).one()
    placed = session.exec(select(func.count()).select_from(Placement).join(application, application.id == Placement.application_id)
                          .where(application.created_at >= cutoff, Placement.status.in_(("student_accepted", "started", "completed")))).one()
    first_updates = session.exec(select(application.created_at, func.min(application_status_history.created_at))
                                 .join(application_status_history, application_status_history.application_id == application.id)
                                 .where(application.created_at >= cutoff, application_status_history.previous_status.is_not(None))
                                 .group_by(application.id, application.created_at)).all()
    hours = [max(0.0, (first - submitted_at).total_seconds() / 3600) for submitted_at, first in first_updates]
    return {"open_verified": open_verified, "submitted": submitted, "placed": placed,
            "median_hours_to_status_update": round(median(hours), 1) if hours else None}


@router.get("/recent-activity")
def recent_activity(account: user = Depends(get_current_admin), session: Session = Depends(get_session)):
    events = session.exec(select(audit_event).where(audit_event.module != "audit").order_by(*ORDER).limit(10)).all()
    return [evidence(event) for event in events]


@router.get("/recipient-search")
def recipient_search(q: str = Query(min_length=2, max_length=120),
                     account: user = Depends(get_current_user), session: Session = Depends(get_session)):
    if not can_manage_staff(account) and not set(staff_permissions(account)) & {"finance", "support"}:
        raise HTTPException(403, "Access required")
    q = f"%{q.strip()}%"
    rows = session.exec(select(user.id, user.name, user.email).where(
        user.deletion_requested_at.is_(None), user.is_admin.is_(False),
        func.lower(user.email) != (settings.admin_email or "").lower(),
        or_(user.name.ilike(q), user.email.ilike(q))).order_by(user.name, user.id).limit(15)).all()
    return [{"id": uid, "name": name, "email": email} for uid, name, email in rows]


@router.post("/users", status_code=201)
def create_account(payload: AccountInput, request: Request,
                   admin: user = Depends(get_current_admin), session: Session = Depends(get_session)):
    email = payload.email.lower()
    if email == (settings.admin_email or "").lower() or session.exec(select(user.id).where(func.lower(user.email) == email)).first():
        raise HTTPException(409, "An account already uses this email")
    account = user(name=payload.name, email=email)
    session.add(account)
    record_audit_event(session, request, actor_id=admin.id, action="user.created", object_type="user",
                       object_id=str(account.id))
    try:
        session.commit()
    except IntegrityError as error:
        session.rollback()
        raise HTTPException(409, "An account already uses this email") from error
    return {"id": account.id, "name": account.name}


@router.patch("/users/{account_id}")
def edit_account(account_id: UUID, payload: NameInput, request: Request,
                 admin: user = Depends(get_current_admin), session: Session = Depends(get_session)):
    account = session.exec(select(user).where(user.id == account_id).with_for_update()).first()
    if not account or can_manage_staff(account) or account.deletion_requested_at:
        raise HTTPException(404, "The account cannot be edited here")
    before = account.name
    account.name = payload.name
    if before != account.name:
        session.add(account)
        record_audit_event(session, request, actor_id=admin.id, action="user.updated", object_type="user",
                           object_id=str(account.id), changes={"name": (before, account.name)})
        session.commit()
    return {"id": account.id, "name": account.name}


@router.post("/workspace-roles")
@router.put("/workspace-roles/{role_id}")
def save_role(payload: RoleInput, request: Request, role_id: str | None = None,
              admin: user = Depends(get_current_admin), session: Session = Depends(get_session)):
    definitions = role_definitions(session)
    if role_id is not None and role_id not in definitions:
        raise HTTPException(404, "Role was not found")
    if not set(payload.permissions) <= set(WORKSPACE_PERMISSIONS):
        raise HTTPException(422, "Select valid permissions")
    if payload.name.casefold() == "administrator" or any(
            role["name"].casefold() == payload.name.casefold() and key != role_id for key, role in definitions.items()):
        raise HTTPException(409, "That role name is already in use")
    key = role_id if role_id else f"role-{uuid4().hex[:24]}"
    role = session.get(WorkspaceRole, key)
    if role is None:
        role = WorkspaceRole(id=key, name=payload.name, permissions=[])
    before = definitions.get(key, {})
    role.name = payload.name
    role.permissions = sorted(set(payload.permissions))
    session.add(role)
    record_audit_event(session, request, actor_id=admin.id, action="staff.role_definition.saved", object_type="staff",
                       object_id=key, changes={"name": (before.get("name"), role.name),
                                               "permissions": (",".join(before.get("permissions", [])), ",".join(role.permissions))})
    session.commit()
    return role
