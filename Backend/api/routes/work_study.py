from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query, Request, status
from sqlmodel import Session, select

from Backend.api.deps import get_current_user, workspace_applications
from Backend.api.routes.applications import _validated_date_of_birth
from Backend.core.age import requires_minor_review
from Backend.core.audit import record_audit_event
from Backend.core.rate_limit import enforce_rate_limit
from Backend.database import get_session
from Database.models import user, work_study_registration
from Database.schemas import WorkStudyCreateRequest, WorkStudyResponse

router = APIRouter(prefix="/api/work-study", tags=["work study"])


def _response(row: work_study_registration) -> WorkStudyResponse:
    return WorkStudyResponse(
        id=row.id,
        applicant_name=row.applicant_name,
        email=row.email,
        phone=row.phone,
        institution=row.institution,
        chapter=row.chapter,
        preferred_role=row.preferred_role,
        availability=row.availability,
        weekly_hours=row.weekly_hours,
        consented_at=row.consented_at,
        created_at=row.created_at,
        requires_minor_review=requires_minor_review(row.date_of_birth, row.created_at),
    )


@router.post("", response_model=WorkStudyResponse, status_code=status.HTTP_201_CREATED)
def create_registration(
    payload: WorkStudyCreateRequest,
    request: Request,
    account: user = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    enforce_rate_limit(session, request, "work-study-create", str(account.id),
                       ip_limit=500, identity_limit=10, window_seconds=60, identity_window_seconds=3600)
    birth_date = _validated_date_of_birth(payload.date_of_birth)
    now = datetime.now(timezone.utc)
    row = work_study_registration(
        user_id=account.id, applicant_name=payload.applicant_name, email=account.email,
        date_of_birth=birth_date, phone=payload.phone, institution=payload.institution,
        chapter=payload.chapter, preferred_role=payload.preferred_role,
        availability=payload.availability, weekly_hours=payload.weekly_hours,
        consented_at=now, created_at=now,
    )
    session.add(row)
    record_audit_event(session, request, actor_id=account.id, action="work_study.create",
                       object_type="work_study", object_id=str(row.id), workflow_id=str(row.id))
    session.commit()
    session.refresh(row)
    return _response(row)


@router.get("/mine", response_model=list[WorkStudyResponse])
def list_my_registrations(
    account: user = Depends(get_current_user),
    session: Session = Depends(get_session),
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    rows = session.exec(select(work_study_registration)
                        .where(work_study_registration.user_id == account.id)
                        .order_by(work_study_registration.created_at.desc(), work_study_registration.id.desc())
                        .offset(offset).limit(limit)).all()
    return [_response(row) for row in rows]


@router.get("", response_model=list[WorkStudyResponse])
def list_registrations(
    request: Request,
    account: user = Depends(workspace_applications),
    session: Session = Depends(get_session),
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    rows = session.exec(select(work_study_registration)
                        .order_by(work_study_registration.created_at.desc(), work_study_registration.id.desc())
                        .offset(offset).limit(limit)).all()
    record_audit_event(session, request, actor_id=account.id, action="work_study.list",
                       object_type="work_study", object_id=None, context={"result_count": len(rows)})
    session.commit()
    return [_response(row) for row in rows]
