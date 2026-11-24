from datetime import datetime, timedelta, timezone
from hashlib import sha256
from secrets import token_urlsafe
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from Backend.api.deps import can_manage_staff, get_current_admin, get_current_user
from Backend.core.audit import record_audit_event
from Backend.core.staff_access import role_definitions
from Backend.database import get_session
from Database.models import audit_event, staff_invitation, user

router = APIRouter(tags=["staff"])


def staff_account(row: user) -> dict:
    return {"id": str(row.id), "name": row.name, "email": row.email,
            "role": row.staff_role if not row.is_admin else "owner",
            "status": "suspended" if row.is_suspended else row.staff_status or "active",
            "protected": row.is_admin}


def invite_status(row: staff_invitation) -> str:
    return "invited" if row.expires_at.replace(tzinfo=timezone.utc) > datetime.now(timezone.utc) else "expired"


class StaffInvite(BaseModel):
    email: str = Field(max_length=254, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    role: str = Field(min_length=1, max_length=32)


class AcceptInvite(BaseModel):
    token: str = Field(min_length=32, max_length=128)


class StaffChange(BaseModel):
    ids: list[UUID] = Field(min_length=1, max_length=50)
    action: Literal["suspend", "restore", "revoke"]
    kind: Literal["accounts", "invitations"] = "accounts"


@router.get("/api/admin/staff")
def get_staff(admin: user = Depends(get_current_admin), session: Session = Depends(get_session)):
    accounts = session.exec(select(user).where(
        user.is_admin.is_(True) | user.staff_role.is_not(None) | (user.id == admin.id),
    ).order_by(user.name, user.id)).all()
    invites = session.exec(select(staff_invitation).where(staff_invitation.token_hash.is_not(None))
                           .order_by(staff_invitation.created_at.desc())).all()
    return {
        "accounts": [staff_account(row) if row.id != admin.id or row.is_admin else
                     {**staff_account(row), "role": "owner", "protected": True} for row in accounts],
        "invitations": [{"id": str(row.id), "email": row.email, "role": row.role,
                         "status": invite_status(row), "expires_at": row.expires_at.isoformat()} for row in invites],
        "roles": list(role_definitions(session).values()),
    }


@router.post("/api/admin/staff/invitations")
def invite_staff(payload: StaffInvite, request: Request, admin: user = Depends(get_current_admin), session: Session = Depends(get_session)):
    if payload.role not in role_definitions(session):
        raise HTTPException(422, "Choose an existing staff role")
    email = payload.email.strip().lower()
    token = token_urlsafe(32)
    invitation = session.exec(select(staff_invitation).where(staff_invitation.email == email).with_for_update()).first()
    account = session.exec(select(user).where(func.lower(user.email) == email).with_for_update()).first()
    if account and (can_manage_staff(account) or account.staff_status in {"active", "suspended"}):
        raise HTTPException(status_code=409, detail="This account already has a staff assignment")
    expires = datetime.now(timezone.utc) + timedelta(days=7)
    if invitation is None:
        invitation = staff_invitation(email=email, role=payload.role, expires_at=expires)
    invitation.role = payload.role
    invitation.token_hash = sha256(token.encode()).hexdigest()
    invitation.expires_at = expires
    session.add(invitation)
    record_audit_event(session, request, actor_id=admin.id, action="staff.invited",
                       object_type="staff_invitation", object_id=str(invitation.id))
    try:
        session.commit()
    except IntegrityError as error:
        session.rollback()
        raise HTTPException(status_code=409, detail="An invitation was created concurrently. Refresh and try again.") from error
    return {"token": token, "expires_at": expires.isoformat()}


@router.post("/api/staff/invitations/accept")
def accept_staff_invitation(payload: AcceptInvite, request: Request, account: user = Depends(get_current_user), session: Session = Depends(get_session)):
    digest = sha256(payload.token.encode()).hexdigest()
    invitation = session.exec(select(staff_invitation).where(staff_invitation.token_hash == digest).with_for_update()).first()
    if invitation is None or invite_status(invitation) == "expired" or invitation.email != account.email.lower():
        raise HTTPException(status_code=400, detail="This invitation is invalid for your account or has expired")
    account = session.exec(select(user).where(user.id == account.id).with_for_update().execution_options(populate_existing=True)).one()
    if can_manage_staff(account) or account.staff_status in {"active", "suspended"}:
        raise HTTPException(status_code=409, detail="This account already has a staff assignment")
    account.staff_role = invitation.role
    account.staff_status = "active"
    invitation.token_hash = None
    session.add(account)
    session.add(invitation)
    invitation_event = session.exec(select(audit_event.id).where(
        audit_event.action == "staff.invited", audit_event.object_id == str(invitation.id),
    ).order_by(audit_event.created_at.desc(), audit_event.id.desc()).limit(1)).first()
    record_audit_event(session, request, actor_id=account.id, action="staff.invitation.accepted",
                       object_type="staff_invitation", object_id=str(invitation.id), parent_id=invitation_event,
                       changes={"staff_status": ("invited", "active"), "staff_role": (None, invitation.role)})
    session.commit()
    return {"role": account.staff_role}


@router.post("/api/admin/staff/bulk")
def bulk_staff_change(payload: StaffChange, request: Request, admin: user = Depends(get_current_admin), session: Session = Depends(get_session)):
    ids = set(payload.ids)
    if payload.kind == "invitations":
        if payload.action != "revoke":
            raise HTTPException(status_code=422, detail="Pending invitations can only be revoked")
        rows = session.exec(select(staff_invitation).where(
            staff_invitation.id.in_(ids), staff_invitation.token_hash.is_not(None),
        ).order_by(staff_invitation.id).with_for_update()).all()
    else:
        rows = session.exec(select(user).where(user.id.in_(ids)).order_by(user.id).with_for_update()).all()
        if any(can_manage_staff(row) or not row.staff_role or row.staff_status == "revoked" for row in rows):
            raise HTTPException(status_code=409, detail="One or more selected accounts cannot be changed")
    if len(rows) != len(ids):
        raise HTTPException(status_code=404, detail="One or more selected records are no longer available")
    next_status = {"suspend": "suspended", "restore": "active", "revoke": "revoked"}[payload.action]
    changed = len(rows) if payload.kind == "invitations" else sum(row.staff_status != next_status for row in rows)
    parent = record_audit_event(session, request, actor_id=admin.id, action=f"staff.bulk.{payload.action}",
                               object_type="staff", object_id=None,
                               result="partial" if 0 < changed < len(rows) else "skipped" if not changed else "success",
                               context={"targeted": len(rows), "processed": changed, "skipped": len(rows) - changed,
                                        "failed": 0, "record_ids": [str(row.id) for row in rows]})
    for row in rows:
        previous = "invited" if payload.kind == "invitations" else row.staff_status
        if payload.kind == "invitations":
            row.token_hash = None
        elif previous == next_status:
            continue
        else:
            row.staff_status = next_status
        session.add(row)
        record_audit_event(session, request, actor_id=admin.id, action=f"staff.{payload.action}",
                           object_type="staff_invitation" if payload.kind == "invitations" else "user",
                           object_id=str(row.id), parent_id=parent.id, changes={"staff_status": (previous, next_status)})
    session.commit()
    return {"updated": len(rows)}


class StaffRoleChange(BaseModel):
    role: str = Field(min_length=1, max_length=32)


@router.put("/api/admin/staff/{account_id}/role")
def change_staff_role(account_id: UUID, payload: StaffRoleChange, request: Request, admin: user = Depends(get_current_admin), session: Session = Depends(get_session)):
    account = session.exec(select(user).where(user.id == account_id).with_for_update()).first()
    if account is None or can_manage_staff(account) or account.staff_status not in {"active", "suspended"}:
        raise HTTPException(status_code=404, detail="This staff assignment is unavailable")
    if payload.role not in role_definitions(session):
        raise HTTPException(422, "Choose an existing staff role")
    previous_role = account.staff_role
    account.staff_role = payload.role
    session.add(account)
    record_audit_event(session, request, actor_id=admin.id, action="staff.role.update",
                       object_type="user", object_id=str(account_id), changes={"staff_role": (previous_role, account.staff_role)})
    session.commit()
    return staff_account(account)
