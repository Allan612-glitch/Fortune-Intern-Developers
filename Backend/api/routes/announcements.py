from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from Backend.database import get_session
from Database.models import announcement
from Database.schemas import AnnouncementResponse

router = APIRouter(prefix="/api/announcements", tags=["announcements"])


@router.get("", response_model=list[AnnouncementResponse])
def list_public_announcements(session: Session = Depends(get_session)):
    rows = session.exec(select(announcement).order_by(announcement.created_at.desc())).all()
    return [AnnouncementResponse(id=str(row.id), title=row.title, content=row.content, created_at=row.created_at.isoformat()) for row in rows]