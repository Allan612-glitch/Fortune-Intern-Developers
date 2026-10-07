from datetime import datetime, timezone
from uuid import UUID
import logging

from botocore.exceptions import BotoCoreError, ClientError
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import Response
from sqlmodel import Session, select

from Backend.api.deps import get_current_admin
from Backend.core import documents, storage
from Backend.core.audit import record_audit_event
from Backend.core.mailer import send_application_documents_email
from Backend.database import get_session
from Database.models import (
	announcement,
	application,
	application_status_history,
	notification,
	program,
	user,
)
from Database.schemas import (
	AdminApplicationStatusRequest,
	ApplicationStatusHistoryResponse,
	AdminProgramCreateRequest,
	AdminProgramUpdateRequest,
	AdminUserResponse,
	AnnouncementCreateRequest,
	AnnouncementResponse,
	ApplicationResponse,
	ProgramResponse,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/mentors")
def list_admin_mentors(_: user = Depends(get_current_admin)):
	# Mentorship feature is disabled (see Backend/api/routes/mentorship.py); kept as a stub so the admin dashboard still loads.
	return []


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
def list_users(request: Request, admin: user = Depends(get_current_admin), session: Session = Depends(get_session)):
	rows = session.exec(select(user).order_by(user.created_at.desc())).all()
	record_audit_event(session, request, actor_id=admin.id, action="users.list", object_type="user", object_id="all")
	session.commit()
	return [AdminUserResponse(id=str(row.id), name=row.name, email=row.email, is_admin=row.is_admin, is_suspended=row.is_suspended) for row in rows]


@router.put("/users/{user_id}/suspension", response_model=AdminUserResponse)
def update_user_suspension(user_id: str, suspended: bool, request: Request, admin: user = Depends(get_current_admin), session: Session = Depends(get_session)):
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
	record_audit_event(session, request, actor_id=admin.id, action="user.suspension.update", object_type="user", object_id=str(row.id))
	session.commit()
	session.refresh(row)
	return AdminUserResponse(id=str(row.id), name=row.name, email=row.email, is_admin=row.is_admin, is_suspended=row.is_suspended)


@router.get("/applications", response_model=list[ApplicationResponse])
def list_admin_applications(request: Request, admin: user = Depends(get_current_admin), session: Session = Depends(get_session)):
	rows = session.exec(select(application).order_by(application.created_at.desc())).all()
	results = []
	for row in rows:
		program_record = session.get(program, row.program_id)
		results.append(ApplicationResponse(
			id=str(row.id), user_id=str(row.user_id), program_id=str(row.program_id),
			program_name=program_record.name if program_record else "Program",
			status=row.status, resume_filename=row.resume_filename,
			applicant_name=row.applicant_name, gender=row.gender,
			student_index_number=row.student_index_number, year_of_study=row.year_of_study,
			suggested_company=row.suggested_company,
			applicant_institution=row.applicant_institution, applicant_course=row.applicant_course,
			applicant_contact=row.applicant_contact, host_company_name=row.host_company_name,
			host_company_address=row.host_company_address,
			created_at=row.created_at.isoformat(),
		))
	record_audit_event(session, request, actor_id=admin.id, action="applications.list", object_type="application", object_id="all")
	session.commit()
	return results


@router.get(
	"/applications/{application_id}/history",
	response_model=list[ApplicationStatusHistoryResponse],
)
def get_admin_application_status_history(
	application_id: str,
	request: Request,
	admin: user = Depends(get_current_admin),
	session: Session = Depends(get_session),
):
	try:
		row = session.get(application, UUID(application_id))
	except ValueError:
		row = None
	if not row:
		raise HTTPException(status_code=404, detail="Application not found")
	entries = session.exec(
		select(application_status_history)
		.where(application_status_history.application_id == row.id)
		.order_by(application_status_history.created_at.asc())
	).all()
	record_audit_event(
		session, request, actor_id=admin.id, action="application.history.read",
		object_type="application", object_id=str(row.id),
	)
	session.commit()
	return [
		ApplicationStatusHistoryResponse(
			previous_status=entry.previous_status,
			new_status=entry.new_status,
			created_at=entry.created_at.isoformat(),
		)
		for entry in entries
	]


@router.post("/programs", response_model=ProgramResponse, status_code=status.HTTP_201_CREATED)
def create_program(payload: AdminProgramCreateRequest, request: Request, admin: user = Depends(get_current_admin), session: Session = Depends(get_session)):
	if not payload.name.strip():
		raise HTTPException(status_code=422, detail="Program name is required")
	row = program(name=payload.name.strip(), description=payload.description.strip(), company=payload.company.strip(), category=payload.category.strip(), status=payload.status.strip(), location=payload.location.strip(), duration=payload.duration.strip(), skills=", ".join(payload.skills), deadline=parse_deadline(payload.deadline))
	session.add(row)
	record_audit_event(session, request, actor_id=admin.id, action="program.create", object_type="program", object_id=str(row.id))
	session.commit()
	session.refresh(row)
	return program_response(row)


@router.put("/programs/{program_id}", response_model=ProgramResponse)
def update_program(program_id: str, payload: AdminProgramUpdateRequest, request: Request, admin: user = Depends(get_current_admin), session: Session = Depends(get_session)):
	try:
		row = session.get(program, UUID(program_id))
	except ValueError:
		row = None
	if not row:
		raise HTTPException(status_code=404, detail="Program not found")
	for field in ("name", "description", "company", "category", "status", "location", "duration"):
		setattr(row, field, getattr(payload, field).strip())
	row.skills = ", ".join(payload.skills)
	row.deadline = parse_deadline(payload.deadline)
	session.add(row)
	record_audit_event(session, request, actor_id=admin.id, action="program.update", object_type="program", object_id=str(row.id))
	session.commit()
	session.refresh(row)
	return program_response(row)


@router.put("/applications/{application_id}/status", response_model=ApplicationResponse)
def update_application_status(application_id: str, payload: AdminApplicationStatusRequest, request: Request, admin: user = Depends(get_current_admin), session: Session = Depends(get_session)):
	requested_status = payload.status.strip().lower()
	if requested_status == "under_review":
		requested_status = "review"
	allowed_transitions = {
		"submitted": {"review", "shortlisted", "interview", "accepted", "rejected", "withdrawn"},
		"review": {"shortlisted", "interview", "accepted", "rejected", "withdrawn"},
		"shortlisted": {"interview", "accepted", "rejected", "withdrawn"},
		"interview": {"accepted", "rejected", "withdrawn"},
		"accepted": set(),
		"rejected": set(),
		"withdrawn": set(),
	}
	if requested_status not in allowed_transitions:
		raise HTTPException(status_code=422, detail="Unsupported application status")
	try:
		row = session.get(application, UUID(application_id))
	except ValueError:
		row = None
	if not row:
		raise HTTPException(status_code=404, detail="Application not found")
	if requested_status not in allowed_transitions.get(row.status, set()):
		raise HTTPException(status_code=409, detail="Invalid application status transition")
	previous_status = row.status
	row.status = requested_status
	session.add(row)
	session.add(application_status_history(
		application_id=row.id,
		actor_id=admin.id,
		previous_status=previous_status,
		new_status=requested_status,
	))
	record_audit_event(
		session, request, actor_id=admin.id, action="application.status.update",
		object_type="application", object_id=str(row.id),
	)
	if requested_status in {"accepted", "rejected"}:
		decision = "accepted" if requested_status == "accepted" else "rejected"
		session.add(notification(
			user_id=row.user_id,
			message=f"Your application was {decision} by the Fortune Intern Network team.",
			target_type="application",
			target_id=str(row.id),
			read="false",
		))
	session.commit()
	program_record = session.get(program, row.program_id)
	program_name = program_record.name if program_record else "Program"

	if payload.status == "accepted" and not row.documents_sent:
		applicant = session.get(user, row.user_id)
		if applicant:
			try:
				reference_no = f"FIN/{datetime.now(timezone.utc).year}/{str(row.id)[:8].upper()}"
				letter_pdf = documents.build_recommendation_letter_pdf(
					student_name=applicant.name,
					institution=row.applicant_institution or "Not specified",
					program_course=row.applicant_course,
					contact=row.applicant_contact,
					email=applicant.email,
					host_company=row.host_company_name or (program_record.company if program_record else "Fortune Intern Network"),
					host_location=row.host_company_address or (program_record.location if program_record else None),
					reference_no=reference_no,
				)
				assessment_pdf = documents.build_assessment_form_pdf()
				send_application_documents_email(
					to_email=applicant.email,
					student_name=applicant.name,
					program_name=program_name,
					letter_pdf=letter_pdf,
					assessment_pdf=assessment_pdf,
				)
				row.documents_sent = True
				session.add(row)
				session.commit()
			except (BotoCoreError, ClientError, RuntimeError):
				logging.getLogger(__name__).exception("Failed to send application documents for application %s", row.id)

	return ApplicationResponse(
		id=str(row.id), user_id=str(row.user_id), program_id=str(row.program_id),
		program_name=program_name, status=row.status, resume_filename=row.resume_filename,
		applicant_name=row.applicant_name, gender=row.gender,
		student_index_number=row.student_index_number, year_of_study=row.year_of_study,
		suggested_company=row.suggested_company,
		applicant_institution=row.applicant_institution, applicant_course=row.applicant_course,
		applicant_contact=row.applicant_contact, host_company_name=row.host_company_name,
		host_company_address=row.host_company_address, created_at=row.created_at.isoformat(),
	)


@router.get("/applications/{application_id}/resume")
def download_application_resume(application_id: str, request: Request, admin: user = Depends(get_current_admin), session: Session = Depends(get_session)):
	try:
		row = session.get(application, UUID(application_id))
	except ValueError:
		row = None
	if not row or not row.resume_path:
		raise HTTPException(status_code=404, detail="Resume not found")
	try:
		content, content_type = storage.download_resume(row.resume_path)
	except (BotoCoreError, ClientError, RuntimeError):
		record_audit_event(session, request, actor_id=admin.id, action="resume.download", object_type="application", object_id=application_id, result="failure")
		session.commit()
		raise
	record_audit_event(session, request, actor_id=admin.id, action="resume.download", object_type="application", object_id=application_id)
	session.commit()
	filename = row.resume_filename or "resume"
	return Response(
		content=content,
		media_type=content_type or "application/octet-stream",
		headers={"Content-Disposition": storage.build_attachment_content_disposition(filename)},
	)


@router.get("/applications/{application_id}/resume-url")
def get_admin_resume_download_url(application_id: str, request: Request, admin: user = Depends(get_current_admin), session: Session = Depends(get_session)):
	try:
		row = session.get(application, UUID(application_id))
	except ValueError:
		row = None
	if not row or not row.resume_path:
		raise HTTPException(status_code=404, detail="Resume not found")
	filename = row.resume_filename or "resume"
	try:
		url = storage.get_resume_download_url(row.resume_path, filename)
	except Exception:
		record_audit_event(session, request, actor_id=admin.id, action="resume.signed_url", object_type="application", object_id=application_id, result="failure")
		session.commit()
		raise
	record_audit_event(session, request, actor_id=admin.id, action="resume.signed_url", object_type="application", object_id=application_id)
	session.commit()
	return {"url": url}


@router.post("/announcements", response_model=AnnouncementResponse, status_code=status.HTTP_201_CREATED)
def create_announcement(payload: AnnouncementCreateRequest, request: Request, admin: user = Depends(get_current_admin), session: Session = Depends(get_session)):
	row = announcement(title=payload.title.strip(), content=payload.content.strip())
	session.add(row)
	for recipient in session.exec(select(user)).all():
		session.add(notification(
			user_id=recipient.id,
			message=f"New announcement: {row.title}",
			target_type="announcement",
			target_id=str(row.id),
			read="false",
		))
	record_audit_event(session, request, actor_id=admin.id, action="announcement.create", object_type="announcement", object_id=str(row.id))
	session.commit()
	session.refresh(row)
	return AnnouncementResponse(id=str(row.id), title=row.title, content=row.content, created_at=row.created_at.isoformat())


@router.get("/announcements", response_model=list[AnnouncementResponse])
def list_announcements(request: Request, admin: user = Depends(get_current_admin), session: Session = Depends(get_session)):
	rows = session.exec(select(announcement).order_by(announcement.created_at.desc())).all()
	record_audit_event(session, request, actor_id=admin.id, action="announcements.list", object_type="announcement", object_id="all")
	session.commit()
	return [AnnouncementResponse(id=str(row.id), title=row.title, content=row.content, created_at=row.created_at.isoformat()) for row in rows]
