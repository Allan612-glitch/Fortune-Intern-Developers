from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlmodel import Session, select

from Backend.api.deps import get_optional_current_user
from Backend.database import get_session
from Backend.core.config import settings
from Database.models import announcement, user, user_profile
from Database.schemas import AnnouncementResponse

router = APIRouter(prefix="/api/announcements", tags=["announcements"])


@router.get("", response_model=list[AnnouncementResponse])
def list_public_announcements(
    account: user | None = Depends(get_optional_current_user),
    session: Session = Depends(get_session),
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    query = select(announcement)
    if account is None:
        query = query.where(announcement.target_university.is_(None))
    elif not (
        account.is_admin
        or account.email.lower() == (settings.admin_email or "").lower()
    ):
        profile = session.exec(
            select(user_profile).where(user_profile.user_id == account.id)
        ).first()
        if profile and profile.university:
            query = query.where(
                or_(
                    announcement.target_university.is_(None),
                    announcement.target_university == profile.university,
                )
            )
        else:
            query = query.where(announcement.target_university.is_(None))

    rows = session.exec(
        query.order_by(announcement.created_at.desc()).offset(offset).limit(limit)
    ).all()
    return [
        AnnouncementResponse(
            id=str(row.id),
            title=row.title,
            content=row.content,
            created_at=row.created_at.isoformat(),
            target_university=row.target_university,
        )
        for row in rows
    ]