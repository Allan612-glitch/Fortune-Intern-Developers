from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session, select

from Backend.api.deps import get_current_user
from Backend.api.routes.programs import serialize_program
from Backend.core.audit import record_audit_event
from Backend.database import get_session
from Database.models import application, program, user
from Database.opportunity_schemas import StudentOpportunityUpdate
from Database.placement_records import Employer, Placement, PlacementOpening
from Database.student_opportunity import StudentOpportunity

router = APIRouter(prefix="/api/student", tags=["student opportunities"])
ACTIVE_APPLICATIONS = ("submitted", "applied", "review", "under_review", "shortlisted", "interview")


def is_open(row, now):
    deadline = row.deadline
    if deadline and deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)
    return row.status == "open" and row.cycle_closed_at is None and (not deadline or deadline > now)


def saved_record(row, listing):
    return {"program": serialize_program(listing), "saved": row.saved, "remind": row.remind,
            "has_draft": row.draft is not None, "updated_at": row.updated_at}


@router.get("/opportunities")
def student_opportunities(account: user = Depends(get_current_user), session: Session = Depends(get_session)):
    rows = session.exec(select(StudentOpportunity, program).join(program, program.id == StudentOpportunity.program_id)
                        .where(StudentOpportunity.user_id == account.id)
                        .order_by(StudentOpportunity.updated_at.desc(), StudentOpportunity.program_id)).all()
    return [saved_record(row, listing) for row, listing in rows]


@router.get("/opportunities/{program_id}")
def fetch_opportunity(program_id: UUID, account: user = Depends(get_current_user), session: Session = Depends(get_session)):
    if session.get(program, program_id) is None:
        raise HTTPException(404, "Program not found")
    row = session.get(StudentOpportunity, (account.id, program_id))
    return {"saved": bool(row and row.saved), "remind": bool(row and row.remind), "draft": row.draft if row else None}


@router.patch("/opportunities/{program_id}")
def update_opportunity(program_id: UUID, payload: StudentOpportunityUpdate,
                       account: user = Depends(get_current_user), session: Session = Depends(get_session)):
    listing = session.get(program, program_id)
    if listing is None:
        raise HTTPException(404, "Program not found")
    # Serialise saves, draft updates and draft cleanup for this account.
    session.exec(select(user.id).where(user.id == account.id).with_for_update()).one()
    row = session.get(StudentOpportunity, (account.id, program_id))
    if row is None:
        row = StudentOpportunity(user_id=account.id, program_id=program_id)
    if (payload.saved or payload.remind or payload.draft is not None) and not is_open(listing, datetime.now(timezone.utc)):
        raise HTTPException(409, "This opportunity has closed")
    if payload.saved is not None:
        row.saved = payload.saved
    if payload.remind is not None:
        if payload.remind and not row.saved:
            raise HTTPException(422, "Save this opportunity before enabling a reminder")
        row.remind = payload.remind
    if not row.saved:
        row.remind = False
    if "draft" in payload.model_fields_set:
        row.draft = payload.draft.model_dump() if payload.draft is not None else None
    if row.saved or row.draft is not None:
        row.updated_at = datetime.now(timezone.utc)
        session.add(row)
    elif row in session:
        session.delete(row)
    session.commit()
    return {"saved": row.saved, "remind": row.remind, "draft": row.draft}


def placement_statement(owner_id):
    return (select(Placement, PlacementOpening.title, Employer.name, application.certificate_approved, application.letter_reference)
            .join(application, application.id == Placement.application_id)
            .join(PlacementOpening, PlacementOpening.id == Placement.opening_id)
            .join(Employer, Employer.id == PlacementOpening.employer_id)
            .where(application.user_id == owner_id, Placement.status != "proposed"))


@router.get("/placements")
def student_placements(account: user = Depends(get_current_user), session: Session = Depends(get_session)):
    rows = session.exec(placement_statement(account.id).order_by(Placement.start_date.desc(), Placement.id).limit(100)).all()
    return [{"id": row.id, "application_id": row.application_id, "title": title, "employer": employer, "status": row.status,
             "start_date": row.start_date, "end_date": row.end_date, "supervisor": row.supervisor_name,
             "certificate_approved": approved, "placement_files_available": bool(letter_reference)}
            for row, title, employer, approved, letter_reference in rows]


@router.post("/placements/{placement_id}/accept")
def accept_offer(placement_id: UUID, request: Request,
                 account: user = Depends(get_current_user), session: Session = Depends(get_session)):
    row = session.exec(select(Placement).join(application, application.id == Placement.application_id)
                       .where(Placement.id == placement_id, application.user_id == account.id,
                              Placement.status != "proposed").with_for_update(of=Placement)).first()
    if row is None:
        raise HTTPException(404, "Placement not found")
    if row.status == "student_accepted":
        return {"status": row.status}
    if row.status != "employer_confirmed":
        raise HTTPException(409, "This placement cannot be accepted")
    row.status = "student_accepted"
    session.add(row)
    record_audit_event(session, request, actor_id=account.id, action="placement.accepted", object_type="placement",
                       object_id=str(row.id), workflow_id=str(row.application_id), changes={"status": ("employer_confirmed", row.status)})
    session.commit()
    return {"status": row.status}


@router.get("/actions")
def student_actions(account: user = Depends(get_current_user), session: Session = Depends(get_session)):
    now = datetime.now(timezone.utc)
    today = now.date()
    reviews = session.exec(select(application, program.name, program.opportunity)
                           .join(program, program.id == application.program_id)
                           .where(application.user_id == account.id, application.status.in_(ACTIVE_APPLICATIONS))
                           .order_by(application.updated_at.desc(), application.id)).all()
    actions = []
    for row, name, details in reviews:
        next_step = row.student_update or {}
        expected = (details or {}).get("response_by")
        path = f"/app/applications?ref={row.id}"
        if next_step.get("kind") in {"action", "interview"}:
            actions.append({"id": f"step-{row.id}", "title": f"{'Interview' if next_step['kind'] == 'interview' else 'Action requested'} · {name}",
                            "due": next_step.get("due"), "path": path})
        if row.document_request:
            actions.append({"id": f"docs-{row.id}", "title": f"Documents requested · {name}", "due": None, "path": path})
        if expected and expected < today.isoformat():
            actions.append({"id": f"late-{row.id}", "title": f"Follow up on {name}", "due": expected, "path": path})
    offers = session.exec(placement_statement(account.id).where(Placement.status == "employer_confirmed")).all()
    actions.extend({"id": f"placement-{row.id}", "title": f"Review placement offer · {title}", "due": None, "path": "/app/placements"}
                   for row, title, *_ in offers)
    reminders = session.exec(select(program).join(StudentOpportunity, StudentOpportunity.program_id == program.id)
                             .where(StudentOpportunity.user_id == account.id, StudentOpportunity.remind.is_(True),
                                    program.status == "open", program.cycle_closed_at.is_(None),
                                    program.deadline > now, program.deadline <= now + timedelta(days=3),
                                    ~select(application.id).where(application.user_id == account.id, application.program_id == program.id).exists())
                             .order_by(program.deadline, program.id)).all()
    actions.extend({"id": f"deadline-{row.id}", "title": f"Application deadline · {row.name}",
                    "due": row.deadline.date().isoformat(), "path": f"/app/programs/{row.id}"} for row in reminders)
    return sorted(actions, key=lambda item: (item["due"] or "9999-12-31", item["id"]))[:12]
