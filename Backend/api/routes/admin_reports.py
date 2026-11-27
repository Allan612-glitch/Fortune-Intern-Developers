from datetime import datetime, timezone
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from Backend.api.deps import can_manage_staff, check_workspace_permission, get_current_user
from Backend.api.routes.staff import invite_status, staff_account
from Backend.core.admin_reports import table_report
from Backend.core.audit import record_audit_event
from Backend.core.staff_access import role_definitions
from Backend.database import get_session
from Database.models import announcement, application, program, staff_invitation, user

router = APIRouter(prefix="/api/admin/reports", tags=["admin"])


class ReportRequest(BaseModel):
    ids: list[UUID] = Field(default_factory=list, max_length=50)
    format: Literal["pdf", "xlsx"]


def date_label(value) -> str:
    return value.strftime("%d %b %Y") if value else ""


@router.post("/{table}")
def export_report(
    table: Literal["applications", "users", "staff", "invitations", "roles", "programs", "announcements"],
    payload: ReportRequest,
    request: Request,
    account: user = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    check_workspace_permission(account, table)
    roles = role_definitions(session) if table in {"roles", "staff", "invitations"} else {}
    ids = set(payload.ids)
    if table != "roles" and (not ids or len(ids) != len(payload.ids)):
        raise HTTPException(status_code=422, detail="Select up to 50 distinct records")
    if table == "roles":
        title, headers = "Staff roles", ["Role", "Workspace section"]
        rows = [[role["name"], ", ".join(role["permissions"])] for role in roles.values()]
        rows.insert(0, ["Administrator", "All sections"])
    elif table == "applications":
        title, headers = "Applications", ["Applicant", "Program", "Institution", "Contact", "Status", "Submitted"]
        records = session.exec(select(application, program.name).outerjoin(program, program.id == application.program_id)
                               .where(application.id.in_(ids)).order_by(application.created_at.desc(), application.id)).all()
        rows = [[app.applicant_name, name or ("Personal internship" if app.program_id is None else "Program"), app.applicant_institution, app.applicant_contact,
                 app.status.replace("_", " ").title(), date_label(app.created_at)] for app, name in records]
    elif table == "programs":
        title, headers = "Programs", ["Program", "Company", "Category", "Location", "Duration", "Deadline", "Status"]
        records = session.exec(select(program).where(program.id.in_(ids)).order_by(program.name, program.id)).all()
        now = datetime.now(timezone.utc)
        rows = [[r.name, r.company, r.category, r.location, r.duration, date_label(r.deadline),
                 "Closed" if r.cycle_closed_at else "Expired" if r.status == "open" and r.deadline and r.deadline.replace(tzinfo=timezone.utc) <= now else r.status.title()] for r in records]
    elif table == "announcements":
        title, headers = "Announcements", ["Title", "Category", "Audience", "Published", "Message"]
        records = session.exec(select(announcement).where(announcement.id.in_(ids)).order_by(announcement.created_at.desc(), announcement.id)).all()
        rows = [[r.title, r.category.title(), r.audience_label or r.target_university or "All students", date_label(r.created_at), r.content] for r in records]
    elif table == "invitations":
        title, headers = "Staff invitations", ["Email", "Role", "Status", "Expires"]
        records = session.exec(select(staff_invitation).where(staff_invitation.id.in_(ids), staff_invitation.token_hash.is_not(None))
                               .order_by(staff_invitation.email)).all()
        rows = [[r.email, roles.get(r.role, {}).get("name", r.role), invite_status(r).title(), date_label(r.expires_at)] for r in records]
    else:
        title, headers = ("Staff accounts" if table == "staff" else "Student accounts"), ["Name", "Email", "Role", "Status"]
        records = session.exec(select(user).where(user.id.in_(ids)).order_by(user.name, user.id)).all()
        rows = []
        for r in records:
            if table == "staff" and (can_manage_staff(r) or r.staff_role):
                status = staff_account(r)["status"]
                rows.append([r.name, r.email, "Administrator" if can_manage_staff(r) else roles.get(r.staff_role, {}).get("name", r.staff_role or ""), status.title()])
            elif table == "users" and not can_manage_staff(r) and r.staff_status not in {"active", "suspended"}:
                rows.append([r.name, r.email, "Student", "Suspended" if r.is_suspended else "Active"])
    if table != "roles" and len(rows) != len(ids):
        raise HTTPException(status_code=404, detail="Some selected records are unavailable in this report")
    response = table_report(title, headers, rows, payload.format == "pdf")
    record_audit_event(session, request, actor_id=account.id, action="report.export", object_type=table, object_id=f"{len(rows)} records")
    session.commit()
    return response
