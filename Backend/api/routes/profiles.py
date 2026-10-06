from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlmodel import Session, select

from Backend.api.deps import get_current_user
from Backend.core import storage
from Backend.database import get_session
from Database.models import profile_document, user, user_profile
from Database.schemas import ProfileDocumentResponse, ProfileResponse, ProfileUpdateRequest

router = APIRouter(prefix="/api/profile", tags=["profile"])
ALLOWED_DOCUMENT_EXTENSIONS = {".pdf", ".doc", ".docx"}


def serialize_profile(profile: user_profile) -> ProfileResponse:
    return ProfileResponse(
        id=str(profile.id),
        user_id=str(profile.user_id),
        bio=profile.bio,
        profile_picture=profile.profile_picture,
        major=profile.major,
        graduation_year=profile.graduation_year,
        university=profile.university,
        course=profile.course,
        year_of_study=profile.year_of_study,
        skills=profile.skills,
        experience=profile.experience or [],
        cgpa=profile.cgpa,
        cgpa_scale=profile.cgpa_scale,
        phone_number=profile.phone_number,
        location=profile.location,
        email_notifications=profile.email_notifications,
        sms_notifications=profile.sms_notifications,
        opportunity_alerts=profile.opportunity_alerts,
    )


@router.get("", response_model=ProfileResponse)
def get_profile(
    account: user = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    profile = session.exec(
        select(user_profile).where(user_profile.user_id == account.id)
    ).first()

    if not profile:
        profile = user_profile(
            user_id=account.id,
            bio="",
            profile_picture="",
            major="",
            graduation_year=None,
            university="",
            course="",
            year_of_study=None,
            skills="",
            phone_number="",
            location="",
            email_notifications=True,
            sms_notifications=False,
            opportunity_alerts=True,
        )
        session.add(profile)
        session.commit()
        session.refresh(profile)

    return serialize_profile(profile)


@router.put("", response_model=ProfileResponse)
def update_profile(
    payload: ProfileUpdateRequest,
    account: user = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    profile = session.exec(
        select(user_profile).where(user_profile.user_id == account.id)
    ).first()

    if not profile:
        profile = user_profile(user_id=account.id)
        session.add(profile)

    updates = payload.model_dump(exclude_unset=True)
    if "experience" in updates and payload.experience is not None:
        updates["experience"] = [item.model_dump() for item in payload.experience]
    for field, value in updates.items():
        setattr(profile, field, value)
    profile.updated_at = datetime.now(timezone.utc)

    session.add(profile)
    session.commit()
    session.refresh(profile)
    return serialize_profile(profile)


def serialize_document(row: profile_document) -> ProfileDocumentResponse:
    return ProfileDocumentResponse(
        id=str(row.id),
        filename=row.filename,
        content_type=row.content_type,
        file_size=row.file_size,
        created_at=row.created_at.isoformat(),
    )


@router.get("/documents", response_model=list[ProfileDocumentResponse])
def list_profile_documents(
    account: user = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    rows = session.exec(
        select(profile_document)
        .where(profile_document.user_id == account.id)
        .order_by(profile_document.created_at.desc())
    ).all()
    return [serialize_document(row) for row in rows]


@router.post("/documents", response_model=ProfileDocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_profile_document(
    file: UploadFile = File(...),
    account: user = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    filename = Path(file.filename or "").name
    extension = Path(filename).suffix.lower()
    if not filename or extension not in ALLOWED_DOCUMENT_EXTENSIONS:
        raise HTTPException(status_code=422, detail="Document must be a PDF, DOC, or DOCX file")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=422, detail="The selected document is empty")
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Documents must be 10 MB or smaller")

    storage_path = f"profile-documents/{account.id}/{uuid4()}{extension}"
    try:
        storage.upload_file(storage_path, content, content_type=file.content_type)
    except Exception as error:
        raise HTTPException(status_code=503, detail="Profile document storage is unavailable") from error

    row = profile_document(
        user_id=account.id,
        filename=filename,
        storage_path=storage_path,
        content_type=file.content_type,
        file_size=len(content),
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return serialize_document(row)


@router.get("/documents/{document_id}/download")
def download_profile_document(
    document_id: str,
    account: user = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    try:
        row = session.get(profile_document, UUID(document_id))
    except ValueError:
        row = None
    if not row or row.user_id != account.id:
        raise HTTPException(status_code=404, detail="Document not found")
    try:
        content, content_type = storage.download_file(row.storage_path)
    except Exception as error:
        raise HTTPException(status_code=503, detail="Profile document storage is unavailable") from error
    return Response(
        content=content,
        media_type=content_type or "application/octet-stream",
        headers={"Content-Disposition": storage.build_attachment_content_disposition(row.filename)},
    )


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_profile_document(
    document_id: str,
    account: user = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    try:
        row = session.get(profile_document, UUID(document_id))
    except ValueError:
        row = None
    if not row or row.user_id != account.id:
        raise HTTPException(status_code=404, detail="Document not found")
    try:
        storage.delete_file(row.storage_path)
    except Exception as error:
        raise HTTPException(status_code=503, detail="Profile document storage is unavailable") from error
    session.delete(row)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
