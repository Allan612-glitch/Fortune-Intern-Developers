from pathlib import Path
from uuid import UUID, uuid4

from botocore.exceptions import BotoCoreError, ClientError
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from fastapi.responses import Response
from sqlmodel import Session, or_, select

from Backend.api.deps import get_current_user
from Backend.core import storage
from Backend.core.audit import record_audit_event
from Backend.core.mailer import send_application_received_email
from Backend.core.rate_limit import enforce_rate_limit
from Backend.core.uploads import read_validated_document
from Backend.database import get_session
from Database.models import (
    application,
    application_status_history,
    notification,
    program,
    user,
    user_profile,
)
from Database.schemas import (
    ApplicationResponse,
    ApplicationStatusHistoryResponse,
)

router = APIRouter(prefix="/api/applications", tags=["applications"])


def serialize_application(row: application, program_name: str) -> ApplicationResponse:
    return ApplicationResponse(
        id=str(row.id),
        user_id=str(row.user_id),
        program_id=str(row.program_id),
        program_name=program_name,
        status=row.status,
        resume_filename=row.resume_filename,
        applicant_name=row.applicant_name,
        gender=row.gender,
        student_index_number=row.student_index_number,
        year_of_study=row.year_of_study,
        suggested_company=row.suggested_company,
        applicant_institution=row.applicant_institution,
        applicant_course=row.applicant_course,
        applicant_contact=row.applicant_contact,
        host_company_name=row.host_company_name,
        host_company_address=row.host_company_address,
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


@router.get(
    "/{application_id}/history",
    response_model=list[ApplicationStatusHistoryResponse],
)
def get_application_status_history(
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
    entries = session.exec(
        select(application_status_history)
        .where(application_status_history.application_id == row.id)
        .order_by(application_status_history.created_at.asc())
    ).all()
    return [
        ApplicationStatusHistoryResponse(
            previous_status=entry.previous_status,
            new_status=entry.new_status,
            created_at=entry.created_at.isoformat(),
        )
        for entry in entries
    ]


@router.get("/{application_id}/resume")
def download_resume(
    application_id: str,
    request: Request,
    account: user = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    try:
        row = session.get(application, UUID(application_id))
    except ValueError:
        row = None
    if not row or row.user_id != account.id or not row.resume_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
    try:
        content, content_type = storage.download_resume(row.resume_path)
    except (BotoCoreError, ClientError, RuntimeError) as error:
        record_audit_event(
            session, request, actor_id=account.id, action="resume.download",
            object_type="application", object_id=application_id, result="failure",
        )
        session.commit()
        raise HTTPException(status_code=503, detail="Resume storage is unavailable") from error
    record_audit_event(
        session, request, actor_id=account.id, action="resume.download",
        object_type="application", object_id=application_id,
    )
    session.commit()
    filename = row.resume_filename or "resume"
    return Response(
        content=content,
        media_type=content_type or "application/octet-stream",
        headers={"Content-Disposition": storage.build_attachment_content_disposition(filename)},
    )


@router.get("/{application_id}/resume-url")
def get_resume_download_url(
    application_id: str,
    request: Request,
    account: user = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    try:
        row = session.get(application, UUID(application_id))
    except ValueError:
        row = None
    if not row or row.user_id != account.id or not row.resume_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
    filename = row.resume_filename or "resume"
    try:
        url = storage.get_resume_download_url(row.resume_path, filename)
    except (BotoCoreError, ClientError, RuntimeError) as error:
        record_audit_event(
            session, request, actor_id=account.id, action="resume.signed_url",
            object_type="application", object_id=application_id, result="failure",
        )
        session.commit()
        raise HTTPException(status_code=503, detail="Resume storage is unavailable") from error
    record_audit_event(
        session, request, actor_id=account.id, action="resume.signed_url",
        object_type="application", object_id=application_id,
    )
    session.commit()
    return {"url": url}


@router.post("", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
async def create_application(
    request: Request,
    background_tasks: BackgroundTasks,
    account: user = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    enforce_rate_limit(
        session, request, "application-create", str(account.id),
        ip_limit=20, identity_limit=10, window_seconds=3600,
    )
    content_type = request.headers.get("content-type", "")
    resume = None
    if content_type.startswith("multipart/form-data"):
        form = await request.form()
        program_id_value = str(form.get("program_id") or "")
        program_name_value = str(form.get("program_name") or "")
        resume = form.get("resume")
        institution_value = str(form.get("university") or form.get("institution") or "").strip()
        course_value = str(form.get("course") or "").strip()
        contact_value = str(form.get("phone") or form.get("contact") or "").strip()
        company_name_value = str(form.get("companyName") or form.get("company_name") or "").strip()
        company_address_value = str(form.get("companyAddress") or form.get("company_address") or "").strip()
        applicant_name_value = str(form.get("applicant_name") or "").strip()
        gender_value = str(form.get("gender") or "").strip()
        student_index_value = str(form.get("student_index_number") or "").strip()
        year_of_study_value = str(form.get("year_of_study") or "").strip()
        suggested_company_value = str(form.get("suggested_company") or "").strip()
    else:
        payload = await request.json()
        program_id_value = str(payload.get("program_id") or "")
        program_name_value = str(payload.get("program_name") or "")
        institution_value = str(payload.get("university") or payload.get("institution") or "").strip()
        course_value = str(payload.get("course") or "").strip()
        contact_value = str(payload.get("phone") or payload.get("contact") or "").strip()
        company_name_value = str(payload.get("companyName") or payload.get("company_name") or "").strip()
        company_address_value = str(payload.get("companyAddress") or payload.get("company_address") or "").strip()
        applicant_name_value = str(payload.get("applicant_name") or "").strip()
        gender_value = str(payload.get("gender") or "").strip()
        student_index_value = str(payload.get("student_index_number") or "").strip()
        year_of_study_value = str(payload.get("year_of_study") or "").strip()
        suggested_company_value = str(payload.get("suggested_company") or "").strip()

    applying_for_self = (
        not applicant_name_value
        or applicant_name_value.casefold() == account.name.casefold()
    )
    if applying_for_self:
        profile = session.exec(
            select(user_profile).where(user_profile.user_id == account.id)
        ).first()
        applicant_name_value = applicant_name_value or account.name
        if profile:
            institution_value = institution_value or profile.university or ""
            course_value = course_value or profile.course or profile.major or ""
            contact_value = contact_value or profile.phone_number or ""
            student_index_value = student_index_value or profile.student_index_number or ""
            if not year_of_study_value and profile.year_of_study is not None:
                year_of_study_value = str(profile.year_of_study)

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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Program not found")
    duplicate_identity = application.applicant_name == applicant_name_value
    if student_index_value:
        duplicate_identity = or_(
            duplicate_identity,
            application.student_index_number == student_index_value,
        )
    if applying_for_self:
        duplicate_identity = or_(
            duplicate_identity,
            application.applicant_name.is_(None),
        )
    existing_application = session.exec(
        select(application).where(
            application.user_id == account.id,
            application.program_id == program_record.id,
            application.status != "withdrawn",
            duplicate_identity,
        )
    ).first()
    if existing_application:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have an active application for this program",
        )

    resume_filename = None
    resume_path = None
    if resume is not None and getattr(resume, "filename", None):
        content, original_filename, verified_content_type = await read_validated_document(resume, "Resume")
        extension = Path(original_filename).suffix.lower()
        stored_key = f"resumes/{account.id}/{uuid4()}{extension}"
        try:
            storage.upload_resume(stored_key, content, content_type=verified_content_type)
        except (BotoCoreError, ClientError, RuntimeError) as error:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Resume storage is not configured") from error
        resume_filename = original_filename
        resume_path = stored_key

    new_application = application(
        user_id=account.id,
        program_id=program_record.id,
        status="submitted",
        resume_filename=resume_filename,
        resume_path=resume_path,
        applicant_institution=institution_value or None,
        applicant_course=course_value or None,
        applicant_contact=contact_value or None,
        host_company_name=company_name_value or None,
        host_company_address=company_address_value or None,
        applicant_name=applicant_name_value or None,
        gender=gender_value or None,
        student_index_number=student_index_value or None,
        year_of_study=year_of_study_value or None,
        suggested_company=suggested_company_value or None,
    )
    session.add(new_application)
    session.add(notification(
        user_id=account.id,
        message=f"Your application for {program_name} was submitted successfully.",
        target_type="application",
        target_id=str(new_application.id),
        read="false",
    ))
    session.add(
        application_status_history(
            application_id=new_application.id,
            actor_id=account.id,
            previous_status=None,
            new_status=new_application.status,
        )
    )
    record_audit_event(
        session, request, actor_id=account.id, action="application.create",
        object_type="application", object_id=str(new_application.id),
    )
    session.commit()
    session.refresh(new_application)
    background_tasks.add_task(
        send_application_received_email,
        to_email=account.email,
        student_name=new_application.applicant_name or account.name,
        program_name=program_name,
        year_of_study=new_application.year_of_study or "Not provided",
        company=(
            new_application.host_company_name
            or new_application.suggested_company
            or program_record.company
        ),
        reference=str(new_application.id),
        submitted_at=new_application.created_at.strftime("%Y-%m-%d"),
    )

    return serialize_application(new_application, program_name)
