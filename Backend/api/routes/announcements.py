from fastapi import APIRouter, Depends, Query
from sqlalchemy import String, func, or_
from sqlmodel import Session, select

from Backend.api.deps import get_optional_current_user
from Backend.database import get_session
from Backend.core.config import settings
from Backend.core.universities import canonical_university, university_match_values
from Database.models import announcement, notification, user, user_profile
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
    public = (announcement.audience == "all") & announcement.target_university.is_(None)
    if account is None:
        query = query.where(public)
    elif not (
        account.is_admin
        or account.email.lower() == (settings.admin_email or "").lower()
    ):
        profile = session.exec(select(user_profile).where(user_profile.user_id == account.id)).first()
        # UUIDs are hyphenated in PostgreSQL and stored compactly in SQLite.
        addressed = select(notification.id).where(
            notification.user_id == account.id, notification.target_type == "announcement",
            func.replace(notification.target_id, "-", "") == func.replace(func.cast(announcement.id, String), "-", ""),
        ).exists()
        scopes = [public, addressed]
        if profile and profile.university:
            scopes.append((announcement.audience.in_(("university", "all"))) &
                func.lower(func.trim(announcement.target_university)).in_(university_match_values(profile.university)))
        query = query.where(or_(*scopes))

    rows = session.exec(
        query.order_by(announcement.created_at.desc()).offset(offset).limit(limit)
    ).all()
    return [
        AnnouncementResponse(
            id=str(row.id),
            title=row.title,
            content=row.content,
            created_at=row.created_at.isoformat(),
            target_university=canonical_university(row.target_university),
            category=row.category,
        )
        for row in rows
    ]