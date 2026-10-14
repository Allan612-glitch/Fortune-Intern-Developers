from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select

from Backend.database import get_session
from Database.models import announcement
from Database.schemas import AnnouncementResponse

router = APIRouter(prefix="/api/announcements", tags=["announcements"])


@router.get("", response_model=list[AnnouncementResponse])
def list_public_announcements(
    session: Session = Depends(get_session),
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    rows = session.exec(
        select(announcement)
        .order_by(announcement.created_at.desc())
        .offset(offset)
        .limit(limit)
    ).all()
    return [AnnouncementResponse(id=str(row.id), title=row.title, content=row.content, created_at=row.created_at.isoformat()) for row in rows]