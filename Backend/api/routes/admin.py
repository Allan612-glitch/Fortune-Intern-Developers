from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlmodel import Session, select

from Backend.api.deps import get_current_admin
from Backend.core import storage
from Backend.database import get_session
from Database.models import announcement, application, notification, program, user
from Database.schemas import (
	AdminApplicationStatusRequest,
	AdminProgramCreateRequest,
	AdminProgramUpdateRequest,
	AdminUserResponse,
	AnnouncementCreateRequest,
	AnnouncementResponse,
	ApplicationResponse,
	ProgramResponse,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])


def program_response(row: program) -> ProgramResponse:
	return ProgramResponse(
		id=str(row.id), name=row.name, description=row.description or "", company=row.company,
		category=row.category, status=row.status, location=row.location, duration=row.duration,
		skills=[item.strip() for item in (row.skills or "").split(",") if item.strip()],
		deadline=row.deadline.isoformat() if row.deadline else None,
	)


def parse_deadline(value: str | None):
	if not value:
		return None
	try:
		return datetime.fromisoformat(value.replace("Z", "+00:00"))
	except ValueError:
		raise HTTPException(status_code=422, detail="Deadline must be a valid ISO date")


@router.get("/users", response_model=list[AdminUserResponse])
def list_users(_: user = Depends(get_current_admin), session: Session = Depends(get_session)):
	return [AdminUserResponse(id=str(row.id), name=row.name, email=row.email, is_admin=row.is_admin, is_suspended=row.is_suspended) for row in session.exec(select(user).order_by(user.created_at.desc())).all()]


@router.put("/users/{user_id}/suspension", response_model=AdminUserResponse)
def update_user_suspension(user_id: str, suspended: bool, admin: user = Depends(get_current_admin), session: Session = Depends(get_session)):
	try:
		row = session.get(user, UUID(user_id))
	except ValueError:
		row = None
	if not row:
		raise HTTPException(status_code=404, detail="User not found")
	if row.id == admin.id and suspended:
		raise HTTPException(status_code=400, detail="You cannot suspend your own admin account")
	row.is_suspended = suspended
	session.add(row)
	session.commit()
	session.refresh(row)
	return AdminUserResponse(id=str(row.id), name=row.name, email=row.email, is_admin=row.is_admin, is_suspended=row.is_suspended)


@router.get("/applications", response_model=list[ApplicationResponse])
def list_admin_applications(_: user = Depends(get_current_admin), session: Session = Depends(get_session)):
	rows = session.exec(select(application).order_by(application.created_at.desc())).all()
	results = []
	for row in rows:
		program_record = session.get(program, row.program_id)
		results.append(ApplicationResponse(
			id=str(row.id), user_id=str(row.user_id), program_id=str(row.program_id),
			program_name=program_record.name if program_record else "Program",
			status=row.status, resume_filename=row.resume_filename,
			created_at=row.created_at.isoformat(),
		))
	return results


@router.post("/programs", response_model=ProgramResponse, status_code=status.HTTP_201_CREATED)
def create_program(payload: AdminProgramCreateRequest, _: user = Depends(get_current_admin), session: Session = Depends(get_session)):
	if not payload.name.strip():
		raise HTTPException(status_code=422, detail="Program name is required")
	row = program(name=payload.name.strip(), description=payload.description.strip(), company=payload.company.strip(), category=payload.category.strip(), status=payload.status.strip(), location=payload.location.strip(), duration=payload.duration.strip(), skills=", ".join(payload.skills), deadline=parse_deadline(payload.deadline))
	session.add(row)
	session.commit()
	session.refresh(row)
	return program_response(row)


@router.put("/programs/{program_id}", response_model=ProgramResponse)
def update_program(program_id: str, payload: AdminProgramUpdateRequest, _: user = Depends(get_current_admin), session: Session = Depends(get_session)):
	row = session.get(program, UUID(program_id))
	if not row:
		raise HTTPException(status_code=404, detail="Program not found")
	for field in ("name", "description", "company", "category", "status", "location", "duration"):
		setattr(row, field, getattr(payload, field).strip())
	row.skills = ", ".join(payload.skills)
	row.deadline = parse_deadline(payload.deadline)
	session.add(row)
	session.commit()
	session.refresh(row)
	return program_response(row)


@router.put("/applications/{application_id}/status", response_model=ApplicationResponse)
def update_application_status(application_id: str, payload: AdminApplicationStatusRequest, _: user = Depends(get_current_admin), session: Session = Depends(get_session)):
	allowed = {"submitted", "review", "interview", "accepted", "rejected", "withdrawn"}
	if payload.status not in allowed:
		raise HTTPException(status_code=422, detail="Unsupported application status")
	try:
		row = session.get(application, UUID(application_id))
	except ValueError:
		row = None
	if not row:
		raise HTTPException(status_code=404, detail="Application not found")
	row.status = payload.status
	session.add(row)
	if payload.status in {"accepted", "rejected"}:
		decision = "accepted" if payload.status == "accepted" else "rejected"
		session.add(notification(
			user_id=row.user_id,
			message=f"Your application was {decision} by the Fortune Intern Network team.",
			target_type="application",
			target_id=str(row.id),
			read="false",
		))
	session.commit()
	program_record = session.get(program, row.program_id)
	return ApplicationResponse(id=str(row.id), user_id=str(row.user_id), program_id=str(row.program_id), program_name=program_record.name if program_record else "Program", status=row.status, resume_filename=row.resume_filename, created_at=row.created_at.isoformat())


@router.get("/applications/{application_id}/resume")
def download_application_resume(application_id: str, _: user = Depends(get_current_admin), session: Session = Depends(get_session)):
	try:
		row = session.get(application, UUID(application_id))
	except ValueError:
		row = None
	if not row or not row.resume_path:
		raise HTTPException(status_code=404, detail="Resume not found")
	content, content_type = storage.download_resume(row.resume_path)
	filename = row.resume_filename or "resume"
	return Response(
		content=content,
		media_type=content_type or "application/octet-stream",
		headers={"Content-Disposition": f'attachment; filename="{filename}"'},
	)


@router.post("/announcements", response_model=AnnouncementResponse, status_code=status.HTTP_201_CREATED)
def create_announcement(payload: AnnouncementCreateRequest, _: user = Depends(get_current_admin), session: Session = Depends(get_session)):
	row = announcement(title=payload.title.strip(), content=payload.content.strip())
	session.add(row)
	session.commit()
	session.refresh(row)
	return AnnouncementResponse(id=str(row.id), title=row.title, content=row.content, created_at=row.created_at.isoformat())


@router.get("/announcements", response_model=list[AnnouncementResponse])
def list_announcements(_: user = Depends(get_current_admin), session: Session = Depends(get_session)):
	rows = session.exec(select(announcement).order_by(announcement.created_at.desc())).all()
	return [AnnouncementResponse(id=str(row.id), title=row.title, content=row.content, created_at=row.created_at.isoformat()) for row in rows]
