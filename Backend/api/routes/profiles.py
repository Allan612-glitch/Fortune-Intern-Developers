from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID, uuid4

from botocore.exceptions import BotoCoreError, ClientError
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from fastapi.responses import Response
from sqlmodel import Session, select

from Backend.api.deps import get_current_user
from Backend.core import storage
from Backend.core.audit import record_audit_event
from Backend.database import get_session
from Backend.core.rate_limit import enforce_rate_limit
from Backend.core.uploads import read_validated_document
from Database.models import education_record, profile_document, user, user_profile
from Database.schemas import (
    EducationRecordCreateRequest,
    EducationRecordResponse,
    EducationRecordUpdateRequest,
    ProfileDocumentResponse,
    ProfileResponse,
    ProfileUpdateRequest,
)

router = APIRouter(prefix="/api/profile", tags=["profile"])


def serialize_profile(profile: user_profile) -> ProfileResponse:
    return ProfileResponse(
        id=str(profile.id),
        user_id=str(profile.user_id),
        bio=profile.bio,
        profile_picture=profile.profile_picture,
        student_index_number=profile.student_index_number,
        qualification_type=profile.qualification_type,
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


def serialize_education(row: education_record) -> EducationRecordResponse:
    return EducationRecordResponse(
        id=str(row.id),
        institution=row.institution,
        qualification=row.qualification,
        programme=row.programme,
        start_year=row.start_year,
        end_year=row.end_year,
        is_current=row.is_current,
        cgpa=row.cgpa,
        cgpa_scale=row.cgpa_scale,
        student_index_number=row.student_index_number,
        created_at=row.created_at.isoformat(),
        updated_at=row.updated_at.isoformat(),
    )


@router.get("/education", response_model=list[EducationRecordResponse])
def list_education_records(
    account: user = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    rows = session.exec(
        select(education_record)
        .where(education_record.user_id == account.id)
        .order_by(education_record.created_at.desc())
    ).all()
    return [serialize_education(row) for row in rows]


@router.post("/education", response_model=EducationRecordResponse, status_code=status.HTTP_201_CREATED)
def create_education_record(
    payload: EducationRecordCreateRequest,
    account: user = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    row = education_record(
        user_id=account.id,
        **payload.model_dump(),
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return serialize_education(row)


@router.put("/education/{education_id}", response_model=EducationRecordResponse)
def update_education_record(
    education_id: str,
    payload: EducationRecordUpdateRequest,
    account: user = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    try:
        row = session.get(education_record, UUID(education_id))
    except ValueError:
        row = None
    if not row or row.user_id != account.id:
        raise HTTPException(status_code=404, detail="Education record not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    row.updated_at = datetime.now(timezone.utc)
    session.add(row)
    session.commit()
    session.refresh(row)
    return serialize_education(row)


@router.delete("/education/{education_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_education_record(
    education_id: str,
    account: user = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    try:
        row = session.get(education_record, UUID(education_id))
    except ValueError:
        row = None
    if not row or row.user_id != account.id:
        raise HTTPException(status_code=404, detail="Education record not found")
    session.delete(row)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


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
    request: Request,
    file: UploadFile = File(...),
    account: user = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    enforce_rate_limit(
        session, request, "profile-document-upload", str(account.id),
        ip_limit=500,
        identity_limit=20,
        window_seconds=60,
        identity_window_seconds=3600,
    )
    content, filename, content_type = await read_validated_document(file, "Document")
    extension = Path(filename).suffix.lower()

    storage_path = f"profile-documents/{account.id}/{uuid4()}{extension}"
    try:
        storage.upload_file(storage_path, content, content_type=content_type)
    except (BotoCoreError, ClientError, RuntimeError) as error:
        raise HTTPException(status_code=503, detail="Profile document storage is unavailable") from error

    row = profile_document(
        user_id=account.id,
        filename=filename,
        storage_path=storage_path,
        content_type=content_type,
        file_size=len(content),
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return serialize_document(row)


@router.get("/documents/{document_id}/download")
def download_profile_document(
    document_id: str,
    request: Request,
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
    except (BotoCoreError, ClientError, RuntimeError) as error:
        record_audit_event(
            session, request, actor_id=account.id, action="document.download",
            object_type="profile_document", object_id=document_id, result="failure",
        )
        session.commit()
        raise HTTPException(status_code=503, detail="Profile document storage is unavailable") from error
    record_audit_event(
        session, request, actor_id=account.id, action="document.download",
        object_type="profile_document", object_id=document_id,
    )
    session.commit()
    return Response(
        content=content,
        media_type=content_type or "application/octet-stream",
        headers={"Content-Disposition": storage.build_attachment_content_disposition(row.filename)},
    )


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_profile_document(
    document_id: str,
    request: Request,
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
    except (BotoCoreError, ClientError, RuntimeError) as error:
        raise HTTPException(status_code=503, detail="Profile document storage is unavailable") from error
    record_audit_event(
        session, request, actor_id=account.id, action="document.delete",
        object_type="profile_document", object_id=document_id,
    )
    session.delete(row)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
