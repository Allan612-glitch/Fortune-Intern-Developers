from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from Backend.api.deps import get_current_admin, get_current_user
from Backend.database import get_session
from Database.models import chapter_application, user
from Database.schemas import (
    ChapterApplicationCreateRequest,
    ChapterApplicationResponse,
    ChapterApplicationStatusUpdate,
)

router = APIRouter(prefix="/api/chapter-applications", tags=["chapter applications"])


def _response(
    application: chapter_application,
    applicant: user | None = None,
) -> ChapterApplicationResponse:
    return ChapterApplicationResponse(
        id=str(application.id),
        chapter_id=application.chapter_id,
        chapter_name=application.chapter_name,
        position_title=application.position_title,
        motivation=application.motivation,
        status=application.status,
        created_at=application.created_at.isoformat(),
        updated_at=application.updated_at.isoformat(),
        applicant_name=applicant.name if applicant else None,
        applicant_email=applicant.email if applicant else None,
    )


@router.post("", response_model=ChapterApplicationResponse, status_code=status.HTTP_201_CREATED)
def create_chapter_application(
    payload: ChapterApplicationCreateRequest,
    session: Session = Depends(get_session),
    account: user = Depends(get_current_user),
):
    existing = session.exec(
        select(chapter_application).where(
            chapter_application.user_id == account.id,
            chapter_application.chapter_id == payload.chapter_id,
            chapter_application.position_title == payload.position_title,
            chapter_application.status != "rejected",
        )
    ).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have an active application for this position",
        )

    application = chapter_application(
        user_id=account.id,
        chapter_id=payload.chapter_id,
        chapter_name=payload.chapter_name,
        position_title=payload.position_title,
        motivation=payload.motivation.strip(),
        status="pending",
    )
    session.add(application)
    try:
        session.commit()
    except IntegrityError as error:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have an active application for this position",
        ) from error
    session.refresh(application)
    return _response(application)


@router.get("/mine", response_model=list[ChapterApplicationResponse])
def list_my_chapter_applications(
    session: Session = Depends(get_session),
    account: user = Depends(get_current_user),
):
    applications = session.exec(
        select(chapter_application)
        .where(chapter_application.user_id == account.id)
        .order_by(chapter_application.created_at.desc())
    ).all()
    return [_response(application) for application in applications]


@router.get("", response_model=list[ChapterApplicationResponse])
def list_chapter_applications(
    session: Session = Depends(get_session),
    _: user = Depends(get_current_admin),
):
    applications = session.exec(
        select(chapter_application).order_by(chapter_application.created_at.desc())
    ).all()
    return [
        _response(application, session.get(user, application.user_id))
        for application in applications
    ]


@router.patch("/{application_id}/status", response_model=ChapterApplicationResponse)
def update_chapter_application_status(
    application_id: UUID,
    payload: ChapterApplicationStatusUpdate,
    session: Session = Depends(get_session),
    _: user = Depends(get_current_admin),
):
    application = session.get(chapter_application, application_id)
    if application is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chapter application not found",
        )
    application.status = payload.status
    application.updated_at = datetime.now(timezone.utc)
    session.add(application)
    session.commit()
    session.refresh(application)
    return _response(application, session.get(user, application.user_id))
