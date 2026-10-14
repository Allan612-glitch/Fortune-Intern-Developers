from dataclasses import dataclass, replace
from pathlib import Path
from uuid import UUID, uuid4

from botocore.exceptions import BotoCoreError, ClientError
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, status
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response
from sqlalchemy.exc import IntegrityError
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


@dataclass(frozen=True)
class _ApplicationFields:
    program_id: str
    program_name: str
    institution: str
    course: str
    contact: str
    company_name: str
    company_address: str
    applicant_name: str
    gender: str
    student_index_number: str
    year_of_study: str
    suggested_company: str


@dataclass(frozen=True)
class _PreparedApplication:
    fields: _ApplicationFields
    program_id: UUID
    program_name: str
    program_company: str | None


@dataclass(frozen=True)
class _ApplicationReceipt:
    to_email: str
    student_name: str
    program_name: str
    year_of_study: str
    company: str
    reference: str
    submitted_at: str


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


def _prepare_application(
    session: Session,
    account: user,
    fields: _ApplicationFields,
) -> _PreparedApplication:
    applying_for_self = (
        not fields.applicant_name
        or fields.applicant_name.casefold() == account.name.casefold()
    )
    if applying_for_self:
        profile = session.exec(
            select(user_profile).where(user_profile.user_id == account.id)
        ).first()
        fields = replace(
            fields,
            applicant_name=fields.applicant_name or account.name,
            institution=fields.institution or (profile.university or "" if profile else ""),
            course=fields.course
            or ((profile.course or profile.major or "") if profile else ""),
            contact=fields.contact
            or ((profile.phone_number or "") if profile else ""),
            student_index_number=fields.student_index_number
            or ((profile.student_index_number or "") if profile else ""),
            year_of_study=fields.year_of_study
            or (
                str(profile.year_of_study)
                if profile and profile.year_of_study is not None
                else ""
            ),
        )

    program_record = None
    if fields.program_id:
        try:
            program_record = session.get(program, UUID(fields.program_id))
        except ValueError:
            program_record = None
        if not program_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Program not found",
            )

    program_name = (
        program_record.name if program_record else fields.program_name
    ).strip()
    if not program_name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Program name is required",
        )

    program_record = program_record or session.exec(
        select(program).where(program.name == program_name)
    ).first()
    if not program_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Program not found",
        )

    duplicate_identity = application.applicant_name == fields.applicant_name
    if fields.student_index_number:
        duplicate_identity = or_(
            duplicate_identity,
            application.student_index_number == fields.student_index_number,
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

    return _PreparedApplication(
        fields=fields,
        program_id=program_record.id,
        program_name=program_name,
        program_company=program_record.company,
    )


def _save_application(
    session: Session,
    request: Request,
    account: user,
    prepared: _PreparedApplication,
    resume_document: tuple[bytes, str, str] | None,
) -> tuple[ApplicationResponse, _ApplicationReceipt]:
    fields = prepared.fields
    resume_filename = None
    resume_path = None
    if resume_document is not None:
        content, resume_filename, verified_content_type = resume_document
        extension = Path(resume_filename).suffix.lower()
        resume_path = f"resumes/{account.id}/{uuid4()}{extension}"
        try:
            storage.upload_resume(
                resume_path,
                content,
                content_type=verified_content_type,
            )
        except (BotoCoreError, ClientError, RuntimeError) as error:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Resume storage is not configured",
            ) from error

    new_application = application(
        user_id=account.id,
        program_id=prepared.program_id,
        status="submitted",
        resume_filename=resume_filename,
        resume_path=resume_path,
        applicant_institution=fields.institution or None,
        applicant_course=fields.course or None,
        applicant_contact=fields.contact or None,
        host_company_name=fields.company_name or None,
        host_company_address=fields.company_address or None,
        applicant_name=fields.applicant_name or None,
        gender=fields.gender or None,
        student_index_number=fields.student_index_number or None,
        year_of_study=fields.year_of_study or None,
        suggested_company=fields.suggested_company or None,
    )
    session.add(new_application)
    session.add(
        notification(
            user_id=account.id,
            message=f"Your application for {prepared.program_name} was submitted successfully.",
            target_type="application",
            target_id=str(new_application.id),
            read=False,
        )
    )
    session.add(
        application_status_history(
            application_id=new_application.id,
            actor_id=account.id,
            previous_status=None,
            new_status=new_application.status,
        )
    )
    record_audit_event(
        session,
        request,
        actor_id=account.id,
        action="application.create",
        object_type="application",
        object_id=str(new_application.id),
    )
    try:
        session.commit()
    except IntegrityError as error:
        session.rollback()
        if resume_path:
            try:
                storage.delete_file(resume_path)
            except (BotoCoreError, ClientError, RuntimeError):
                raise RuntimeError(
                    "Application creation failed and the uploaded resume could not be cleaned up"
                ) from error
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have an active application for this program",
        ) from error
    session.refresh(new_application)

    return (
        serialize_application(new_application, prepared.program_name),
        _ApplicationReceipt(
            to_email=account.email,
            student_name=new_application.applicant_name or account.name,
            program_name=prepared.program_name,
            year_of_study=new_application.year_of_study or "Not provided",
            company=(
                new_application.host_company_name
                or new_application.suggested_company
                or prepared.program_company
                or ""
            ),
            reference=str(new_application.id),
            submitted_at=new_application.created_at.strftime("%Y-%m-%d"),
        ),
    )


@router.get("", response_model=list[ApplicationResponse])
def list_applications(
    account: user = Depends(get_current_user),
    session: Session = Depends(get_session),
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    rows = session.exec(
        select(application)
        .where(application.user_id == account.id)
        .order_by(application.created_at.desc())
        .offset(offset)
        .limit(limit)
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
    await run_in_threadpool(
        enforce_rate_limit,
        session, request, "application-create", str(account.id),
        ip_limit=500,
        identity_limit=10,
        window_seconds=60,
        identity_window_seconds=3600,
    )
    content_type = request.headers.get("content-type", "")
    resume = None
    if content_type.startswith("multipart/form-data"):
        form = await request.form()
        fields = _ApplicationFields(
            program_id=str(form.get("program_id") or ""),
            program_name=str(form.get("program_name") or ""),
            institution=str(form.get("university") or form.get("institution") or "").strip(),
            course=str(form.get("course") or "").strip(),
            contact=str(form.get("phone") or form.get("contact") or "").strip(),
            company_name=str(form.get("companyName") or form.get("company_name") or "").strip(),
            company_address=str(form.get("companyAddress") or form.get("company_address") or "").strip(),
            applicant_name=str(form.get("applicant_name") or "").strip(),
            gender=str(form.get("gender") or "").strip(),
            student_index_number=str(form.get("student_index_number") or "").strip(),
            year_of_study=str(form.get("year_of_study") or "").strip(),
            suggested_company=str(form.get("suggested_company") or "").strip(),
        )
        resume = form.get("resume")
    else:
        payload = await request.json()
        fields = _ApplicationFields(
            program_id=str(payload.get("program_id") or ""),
            program_name=str(payload.get("program_name") or ""),
            institution=str(payload.get("university") or payload.get("institution") or "").strip(),
            course=str(payload.get("course") or "").strip(),
            contact=str(payload.get("phone") or payload.get("contact") or "").strip(),
            company_name=str(payload.get("companyName") or payload.get("company_name") or "").strip(),
            company_address=str(payload.get("companyAddress") or payload.get("company_address") or "").strip(),
            applicant_name=str(payload.get("applicant_name") or "").strip(),
            gender=str(payload.get("gender") or "").strip(),
            student_index_number=str(payload.get("student_index_number") or "").strip(),
            year_of_study=str(payload.get("year_of_study") or "").strip(),
            suggested_company=str(payload.get("suggested_company") or "").strip(),
        )

    prepared = await run_in_threadpool(
        _prepare_application,
        session,
        account,
        fields,
    )

    resume_document = None
    if resume is not None and getattr(resume, "filename", None):
        resume_document = await read_validated_document(resume, "Resume")

    response, receipt = await run_in_threadpool(
        _save_application,
        session,
        request,
        account,
        prepared,
        resume_document,
    )
    background_tasks.add_task(
        send_application_received_email,
        to_email=receipt.to_email,
        student_name=receipt.student_name,
        program_name=receipt.program_name,
        year_of_study=receipt.year_of_study,
        company=receipt.company,
        reference=receipt.reference,
        submitted_at=receipt.submitted_at,
    )

    return response
