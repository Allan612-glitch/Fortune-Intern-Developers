from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from Backend.api.deps import get_current_admin
from Backend.database import get_session
from Database.models import chapter_directory, user
from Database.schemas import ChapterDirectoryResponse, ChapterDirectoryUpdate

router = APIRouter(prefix="/api/chapters", tags=["chapters"])


def _response(directory: chapter_directory) -> ChapterDirectoryResponse:
    return ChapterDirectoryResponse(
        chapters=directory.chapters,
        executives=directory.executives,
        updated_at=directory.updated_at.isoformat(),
    )


@router.get("", response_model=ChapterDirectoryResponse | None)
def get_chapter_directory(session: Session = Depends(get_session)):
    directory = session.get(chapter_directory, "default")
    return _response(directory) if directory is not None else None


@router.put("", response_model=ChapterDirectoryResponse)
def save_chapter_directory(
    payload: ChapterDirectoryUpdate,
    session: Session = Depends(get_session),
    _: user = Depends(get_current_admin),
):
    directory = session.get(chapter_directory, "default")
    if directory is None:
        directory = chapter_directory(
            id="default",
            chapters=[chapter.model_dump() for chapter in payload.chapters],
            executives=[executive.model_dump() for executive in payload.executives],
        )
    else:
        directory.chapters = [chapter.model_dump() for chapter in payload.chapters]
        directory.executives = [executive.model_dump() for executive in payload.executives]
        directory.updated_at = datetime.now(timezone.utc)

    session.add(directory)
    try:
        session.commit()
    except IntegrityError as error:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The chapter directory changed concurrently. Reload and try again.",
        ) from error
    session.refresh(directory)
    return _response(directory)
