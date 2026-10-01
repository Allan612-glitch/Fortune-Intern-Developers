from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID, uuid4

import resend
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import Response
from sqlmodel import Session, select

from Backend.api.deps import get_current_user
from Backend.core import documents, storage
from Backend.core.config import settings
from Backend.database import get_session
from Database.models import application, notification, program, user, user_profile
from Database.schemas import ApplicationCreateRequest, ApplicationResponse

router = APIRouter(prefix="/api/applications", tags=["applications"])
ALLOWED_RESUME_EXTENSIONS = {".pdf", ".doc", ".docx"}


def send_application_documents_email(
    *,
    to_email: str,
    student_name: str,
    program_name: str,
    letter_pdf: bytes,
    assessment_pdf: bytes,
) -> None:
    if not all((settings.resend_api_key, settings.resend_from_email)):
        return

    resend.api_key = settings.resend_api_key
    try:
        resend.Emails.send({
            "from": settings.resend_from_email,
            "to": [to_email],
            "subject": f"Your Fortune Intern Network application documents — {program_name}",
            "text": (
                f"Hi {student_name},\n\n"
                f"Thank you for applying to {program_name} through Fortune Intern Network. "
                "Attached are your internship recommendation letter and a blank assessment form "
                "for your host supervisor to complete at the end of your attachment.\n\n"
                "Best of luck!\nFortune Intern Network"
            ),
            "attachments": [
                {
                    "filename": "FIN_Recommendation_Letter.pdf",
                    "content": list(letter_pdf),
                    "content_type": "application/pdf",
                },
                {
                    "filename": "FIN_Assessment_Form.pdf",
                    "content": list(assessment_pdf),
                    "content_type": "application/pdf",
                },
            ],
        })
    except Exception:
        pass


def serialize_application(row: application, program_name: str) -> ApplicationResponse:
    return ApplicationResponse(
        id=str(row.id),
        user_id=str(row.user_id),
        program_id=str(row.program_id),
        program_name=program_name,
        status=row.status,
        resume_filename=row.resume_filename,
        created_at=row.created_at.isoformat(),
    )


@router.get("", response_model=list[ApplicationResponse])
def list_applications(
    account: user = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    rows = session.exec(
        select(application)
        .where(application.user_id == account.id)
        .order_by(application.created_at.desc())
    ).all()

    results = []
    for row in rows:
        program_record = session.get(program, row.program_id)
        results.append(serialize_application(row, program_record.name if program_record else "Program"))
    return results


@router.get("/{application_id}", response_model=ApplicationResponse)
def get_application(
    application_id: str,
    account: user = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    try:
        row = session.get(application, UUID(application_id))
    except ValueError:
        row = None
    if not row or row.user_id != account.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    program_record = session.get(program, row.program_id)
    return serialize_application(row, program_record.name if program_record else "Program")


@router.get("/{application_id}/resume")
def download_resume(
    application_id: str,
    account: user = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    try:
        row = session.get(application, UUID(application_id))
    except ValueError:
        row = None
    if not row or row.user_id != account.id or not row.resume_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
    content, content_type = storage.download_resume(row.resume_path)
    filename = row.resume_filename or "resume"
    return Response(
        content=content,
        media_type=content_type or "application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
async def create_application(
    request: Request,
    account: user = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    content_type = request.headers.get("content-type", "")
    resume = None
    if content_type.startswith("multipart/form-data"):
        form = await request.form()
        program_id_value = str(form.get("program_id") or "")
        program_name_value = str(form.get("program_name") or "")
        resume = form.get("resume")
    else:
        payload = await request.json()
        program_id_value = str(payload.get("program_id") or "")
        program_name_value = str(payload.get("program_name") or "")

    program_record = None
    if program_id_value:
        try:
            program_record = session.get(program, UUID(program_id_value))
        except ValueError:
            program_record = None
        if not program_record:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Program not found")

    program_name = (program_record.name if program_record else program_name_value).strip()
    if not program_name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Program name is required",
        )

    program_record = program_record or session.exec(select(program).where(program.name == program_name)).first()
    if not program_record:
        program_record = program(
            name=program_name,
            description=f"Submitted by {account.name}",
            company="Fortune Intern Network",
            category="Internship",
            status="open",
            location="Remote",
            duration="3 months",
        )
        session.add(program_record)
        session.commit()
        session.refresh(program_record)

    resume_filename = None
    resume_path = None
    if resume is not None and getattr(resume, "filename", None):
        extension = Path(resume.filename).suffix.lower()
        if extension not in ALLOWED_RESUME_EXTENSIONS:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Resume must be a PDF, DOC, or DOCX file")
        content = await resume.read()
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Resume must be 10 MB or smaller")
        stored_key = f"resumes/{account.id}/{uuid4()}{extension}"
        try:
            storage.upload_resume(stored_key, content, content_type=resume.content_type)
        except RuntimeError as error:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Resume storage is not configured") from error
        resume_filename = Path(resume.filename).name
        resume_path = stored_key

    new_application = application(
        user_id=account.id,
        program_id=program_record.id,
        status="submitted",
        resume_filename=resume_filename,
        resume_path=resume_path,
    )
    session.add(new_application)
    session.add(notification(
        user_id=account.id,
        message=f"Your application for {program_name} was submitted successfully.",
        target_type="application",
        target_id=str(new_application.id),
        read="false",
    ))
    session.commit()
    session.refresh(new_application)

    profile_record = session.exec(select(user_profile).where(user_profile.user_id == account.id)).first()
    institution = (profile_record.university if profile_record and profile_record.university else None) or "Not specified"
    program_course = profile_record.course if profile_record else None
    contact = profile_record.phone_number if profile_record else None
    reference_no = f"FIN/{datetime.now(timezone.utc).year}/{str(new_application.id)[:8].upper()}"

    try:
        letter_pdf = documents.build_recommendation_letter_pdf(
            student_name=account.name,
            institution=institution,
            program_course=program_course,
            contact=contact,
            email=account.email,
            host_company=program_record.company,
            host_location=program_record.location,
            reference_no=reference_no,
        )
        assessment_pdf = documents.build_assessment_form_pdf()
        send_application_documents_email(
            to_email=account.email,
            student_name=account.name,
            program_name=program_name,
            letter_pdf=letter_pdf,
            assessment_pdf=assessment_pdf,
        )
    except Exception:
        pass

    return serialize_application(new_application, program_name)
