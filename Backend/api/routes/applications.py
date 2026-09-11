from pathlib import Path
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import FileResponse
from sqlmodel import Session, select

from Backend.api.deps import get_current_user
from Backend.database import get_session
from Database.models import application, notification, program, user
from Database.schemas import ApplicationCreateRequest, ApplicationResponse

router = APIRouter(prefix="/api/applications", tags=["applications"])
UPLOADS_DIR = Path(__file__).resolve().parents[2] / "uploads" / "resumes"
ALLOWED_RESUME_EXTENSIONS = {".pdf", ".doc", ".docx"}


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
    resume_path = Path(row.resume_path).resolve()
    if UPLOADS_DIR.resolve() not in resume_path.parents or not resume_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
    return FileResponse(resume_path, filename=row.resume_filename or resume_path.name)


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
        UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
        stored_name = f"{account.id}_{uuid4()}{extension}"
        destination = UPLOADS_DIR / stored_name
        content = await resume.read()
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Resume must be 10 MB or smaller")
        destination.write_bytes(content)
        resume_filename = Path(resume.filename).name
        resume_path = str(destination)

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

    return serialize_application(new_application, program_name)
