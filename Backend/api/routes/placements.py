from datetime import date, datetime, timezone
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func
from sqlmodel import Session, select

from Backend.api.deps import workspace_permission
from Backend.core.audit import record_audit_event
from Backend.database import get_session
from Database.models import application, notification, program, user
from Database.placement_records import Employer, PlacementOpening, Placement

router = APIRouter(prefix="/api/admin/placements", tags=["placements"])
placement_access = workspace_permission("placements")

TRANSITIONS = {
    "proposed": {"employer_confirmed", "cancelled"},
    "employer_confirmed": {"student_accepted", "cancelled"},
    "student_accepted": {"started", "cancelled"},
    "started": {"completed", "cancelled"},
    "completed": set(),
    "cancelled": set(),
}


class PlacementInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


class EmployerInput(PlacementInput):
    name: str = Field(min_length=1, max_length=160)
    contact_email: str = Field(default="", max_length=254, pattern=r"^(?:[^@\s]+@[^@\s]+\.[^@\s]+)?$")
    location: str = Field(default="", max_length=160)


class OpeningInput(PlacementInput):
    employer_id: UUID
    program_id: UUID
    title: str = Field(min_length=1, max_length=160)
    capacity: int = Field(ge=1, le=10000)


class OpeningChange(PlacementInput):
    active: bool
    capacity: int = Field(ge=1, le=10000)


class Assignment(PlacementInput):
    application_id: UUID
    opening_id: UUID
    supervisor_name: str = Field(default="", max_length=160)


class Progress(PlacementInput):
    status: Literal["proposed", "employer_confirmed", "student_accepted", "started", "completed", "cancelled"]
    supervisor_name: str | None = Field(default=None, max_length=160)
    start_date: date | None = None
    end_date: date | None = None
    feedback: str | None = Field(default=None, max_length=2000)


def save(session, request, actor, row, action, changes=None):
    session.add(row)
    record_audit_event(session, request, actor_id=actor.id, action=action, object_type="placement",
                       object_id=str(row.id), workflow_id=str(row.id), changes=changes)
    session.commit()
    return row


def occupancy(session, opening_id):
    return session.exec(select(func.count(Placement.id)).where(
        Placement.opening_id == opening_id, Placement.status != "cancelled",
    )).one()


@router.get("/catalog")
def catalog(actor: user = Depends(placement_access), session: Session = Depends(get_session)):
    used = select(Placement.opening_id, func.count(Placement.id).label("occupied")).where(
        Placement.status != "cancelled",
    ).group_by(Placement.opening_id).subquery()
    openings = session.exec(select(PlacementOpening, Employer.name, program.name, func.coalesce(used.c.occupied, 0))
                            .join(Employer, Employer.id == PlacementOpening.employer_id)
                            .join(program, program.id == PlacementOpening.program_id)
                            .outerjoin(used, used.c.opening_id == PlacementOpening.id)
                            .order_by(PlacementOpening.active.desc(), PlacementOpening.title, PlacementOpening.id)).all()
    return {
        "employers": session.exec(select(Employer).order_by(Employer.name, Employer.id)).all(),
        "programs": [{"id": key, "name": name} for key, name in session.exec(select(program.id, program.name)
                      .where(program.status == "open", program.cycle_closed_at.is_(None)).order_by(program.name, program.id))],
        "openings": [{**row.model_dump(), "employer": employer, "program": name, "available": row.capacity - occupied}
                     for row, employer, name, occupied in openings],
    }


@router.post("/employers", status_code=201)
def add_employer(payload: EmployerInput, request: Request, actor: user = Depends(placement_access), session: Session = Depends(get_session)):
    return save(session, request, actor, Employer(**payload.model_dump()), "placement.employer.created")


@router.put("/employers/{employer_id}")
def change_employer(employer_id: UUID, payload: EmployerInput, request: Request,
                    actor: user = Depends(placement_access), session: Session = Depends(get_session)):
    row = session.get(Employer, employer_id, with_for_update=True)
    if row is None:
        raise HTTPException(404, "Employer was not found")
    row.sqlmodel_update(payload.model_dump())
    return save(session, request, actor, row, "placement.employer.updated")


@router.post("/openings", status_code=201)
def add_opening(payload: OpeningInput, request: Request, actor: user = Depends(placement_access), session: Session = Depends(get_session)):
    if not session.get(Employer, payload.employer_id) or not session.get(program, payload.program_id):
        raise HTTPException(422, "Select an existing employer and program")
    return save(session, request, actor, PlacementOpening(**payload.model_dump()), "placement.opening.created")


@router.put("/openings/{opening_id}")
def change_opening(opening_id: UUID, payload: OpeningChange, request: Request,
                   actor: user = Depends(placement_access), session: Session = Depends(get_session)):
    row = session.get(PlacementOpening, opening_id, with_for_update=True)
    if row is None:
        raise HTTPException(404, "Opening was not found")
    if payload.capacity < occupancy(session, row.id):
        raise HTTPException(409, "Capacity cannot be lower than the number of places used")
    row.sqlmodel_update(payload.model_dump())
    return save(session, request, actor, row, "placement.opening.updated")


@router.get("/candidates")
def candidates(opening_id: UUID, q: str = Query(default="", max_length=150),
               actor: user = Depends(placement_access), session: Session = Depends(get_session)):
    opening = session.get(PlacementOpening, opening_id)
    if opening is None:
        raise HTTPException(404, "Opening was not found")
    query = (select(application.id, application.applicant_name, user.name)
             .join(user, user.id == application.user_id)
             .outerjoin(Placement, Placement.application_id == application.id)
             .where(application.program_id == opening.program_id, application.status == "accepted",
                    user.is_suspended.is_(False), user.deletion_requested_at.is_(None),
                    (Placement.id.is_(None) | (Placement.status == "cancelled"))))
    term = q.strip()
    if term:
        query = query.where(application.applicant_name.icontains(term, autoescape=True) | user.name.icontains(term, autoescape=True))
    return [{"id": key, "name": applicant or account} for key, applicant, account in
            session.exec(query.order_by(application.created_at.desc(), application.id).limit(30))]


@router.get("")
def list_placements(stage: str = "", application_id: UUID | None = None, page: int = Query(default=1, ge=1, le=10000),
                    actor: user = Depends(placement_access), session: Session = Depends(get_session)):
    if stage and stage not in TRANSITIONS:
        raise HTTPException(422, "Choose a placement stage")
    query = (select(Placement, application.applicant_name, user.name, PlacementOpening.title, Employer.name)
             .join(application, application.id == Placement.application_id)
             .join(user, user.id == application.user_id)
             .join(PlacementOpening, PlacementOpening.id == Placement.opening_id)
             .join(Employer, Employer.id == PlacementOpening.employer_id))
    if stage:
        query = query.where(Placement.status == stage)
    if application_id:
        query = query.where(Placement.application_id == application_id)
    rows = session.exec(query.order_by(Placement.id).offset((page - 1) * 25).limit(26)).all()
    return {"more": len(rows) > 25, "items": [
        {**row.model_dump(), "student": applicant or account, "opening": title, "employer": employer}
        for row, applicant, account, title, employer in rows[:25]
    ]}


@router.post("", status_code=201)
def assign_placement(payload: Assignment, request: Request, actor: user = Depends(placement_access), session: Session = Depends(get_session)):
    candidate = session.get(application, payload.application_id, with_for_update=True)
    opening = session.get(PlacementOpening, payload.opening_id, with_for_update=True)
    if (candidate is None or opening is None or candidate.status != "accepted"
            or candidate.program_id != opening.program_id):
        raise HTTPException(422, "Choose an accepted application from the opening’s program")
    owner = session.get(user, candidate.user_id)
    if owner is None or owner.is_suspended or owner.deletion_requested_at is not None:
        raise HTTPException(409, "The student account is unavailable")
    existing = session.exec(select(Placement).where(Placement.application_id == candidate.id).with_for_update()).first()
    if existing and existing.status != "cancelled":
        raise HTTPException(409, "This application already has a placement")
    if not opening.active or occupancy(session, opening.id) >= opening.capacity:
        raise HTTPException(409, "There are no places available")
    row = Placement(**payload.model_dump()) if not existing else existing
    if existing:
        row.sqlmodel_update({**payload.model_dump(), "status": "proposed", "start_date": None, "end_date": None, "feedback": ""})
    return save(session, request, actor, row, "placement.assigned", {"status": ("cancelled" if existing else None, "proposed")})


@router.patch("/{placement_id}")
def advance_placement(placement_id: UUID, payload: Progress, request: Request,
                      actor: user = Depends(placement_access), session: Session = Depends(get_session)):
    row = session.get(Placement, placement_id, with_for_update=True)
    if row is None:
        raise HTTPException(404, "Placement was not found")
    previous = row.status
    if previous in {"completed", "cancelled"} or (payload.status != previous and payload.status not in TRANSITIONS[previous]):
        raise HTTPException(409, "Placement cannot move to this stage")
    updates = payload.model_dump(exclude_none=True)
    start = updates.get("start_date", row.start_date)
    end = updates.get("end_date", row.end_date)
    today = datetime.now(timezone.utc).date()
    if end and (not start or end < start):
        raise HTTPException(422, "End date must be on or after the start date")
    if payload.status in {"started", "completed"} and (not start or start > today):
        raise HTTPException(422, "Enter a start date on or before today")
    if payload.status == "completed" and (not end or end > today):
        raise HTTPException(422, "Enter an end date on or before today")
    row.sqlmodel_update(updates)
    if payload.status in {"employer_confirmed", "started", "completed", "cancelled"} and payload.status != previous:
        candidate = session.get(application, row.application_id)
        status = payload.status.replace("_", " ")
        session.add(notification(user_id=candidate.user_id, message=f"Internship placement update: {status}.",
                                 target_type="application", target_id=str(candidate.id), read=False))
    return save(session, request, actor, row, "placement.updated", {"status": (previous, row.status)})
