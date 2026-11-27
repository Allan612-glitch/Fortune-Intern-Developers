from Backend.api.routes.programs import serialize_program
from datetime import datetime, timezone
from io import BytesIO
from typing import Literal
from uuid import UUID
import logging

from botocore.exceptions import BotoCoreError, ClientError
from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request, status
from fastapi.responses import Response
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
from sqlalchemy import String, and_, case, cast, func, or_
from sqlmodel import Session, select

from Backend.api.deps import (can_manage_staff, get_current_admin, workspace_announcements,
                              workspace_applications, workspace_programs, workspace_users)
from Backend.core import age, documents, storage
from Backend.core.audit import record_audit_event
from Backend.core.config import settings
from Backend.core.staff_access import role_definitions
from Backend.core.universities import canonical_university, university_match_values
from Backend.core.mailer import (
	send_application_documents_email,
	send_announcement_emails,
	send_certificate_available_email,
)
from Backend.database import get_session
from Database.followup_records import ApplicationMessage
from Database.models import (
	audit_event,
	announcement,
	application,
	application_status_history,
	notification,
	program,
	user,
	user_profile,
)
from Database.schemas import (
	AdminApplicationStatusRequest,
	AdminCertificateApprovalRequest,
	AdminApplicationResponse,
	AdminApplicationStatusHistoryResponse,
	AdminReviewUpdate,
	AdminProgramCreateRequest,
	AdminProgramUpdateRequest,
	AdminUserResponse,
	AnnouncementCreateRequest,
	AnnouncementResponse,
	ApplicationResponse,
	ProgramResponse,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])


program_response = serialize_program


def parse_deadline(value: str | None):
	if not value:
		return None
	try:
		deadline = datetime.fromisoformat(value.replace("Z", "+00:00"))
	except ValueError:
		raise HTTPException(status_code=422, detail="Deadline must be a valid ISO date")
	return deadline.replace(tzinfo=timezone.utc) if deadline.tzinfo is None else deadline


def _application_reference(session: Session, row: application) -> str:
	year_start = datetime(row.created_at.year, 1, 1, tzinfo=row.created_at.tzinfo)
	year_end = datetime(row.created_at.year + 1, 1, 1, tzinfo=row.created_at.tzinfo)
	previous_applications = session.exec(
		select(func.count(application.id)).where(
			application.created_at >= year_start,
			application.created_at < year_end,
			or_(
				application.created_at < row.created_at,
				and_(
					application.created_at == row.created_at,
					application.id < row.id,
				),
			),
		)
	).one()
	return f"FIN/{row.created_at.year}/{previous_applications + 1:04d}"


def _stable_letter_reference(row: application) -> str:
	return f"FIN/{row.created_at.year}/{row.id.hex.upper()}"


APPLICATION_FILTER_STATUSES = {
	"queue": ("submitted", "applied", "review", "under_review"),
	"Submitted": ("submitted", "applied"),
	"Under Review": ("review", "under_review"),
	"Shortlisted": ("shortlisted", "interview"),
	"Accepted": ("accepted", "offered"),
	"Rejected": ("rejected",),
	"Withdrawn": ("withdrawn",),
}


@router.get("/overview")
def get_admin_overview(
	admin: user = Depends(get_current_admin),
	session: Session = Depends(get_session),
) -> dict[str, int]:
	now = datetime.now(timezone.utc)
	all_users, students = session.exec(select(
		func.count(user.id), func.count(user.id).filter(user.is_admin.is_(False), user.staff_status.is_distinct_from("active"), user.staff_status.is_distinct_from("suspended")),
	)).one()
	return {
		"awaiting_review": session.exec(
			select(func.count(application.id)).where(
				application.status.in_(APPLICATION_FILTER_STATUSES["queue"]),
			)
		).one(),
		"open_programs": session.exec(
			select(func.count(program.id)).where(
				program.status == "open",
				program.cycle_closed_at.is_(None),
				or_(program.deadline.is_(None), program.deadline > now),
			)
		).one(),
		"users": all_users,
		"students": students,
		"announcements": session.exec(select(func.count(announcement.id))).one(),
	}


@router.get("/users", response_model=list[AdminUserResponse])
def list_users(
	request: Request,
	admin: user = Depends(workspace_users),
	session: Session = Depends(get_session),
	limit: int = Query(default=100, ge=1, le=200),
	offset: int = Query(default=0, ge=0),
	q: str = Query(default="", max_length=150),
	account_status: Literal["all", "active", "suspended"] = Query(default="all", alias="status"),
	role: Literal["all", "student", "admin"] = Query(default="all"),
):
	statement = select(user)
	if not can_manage_staff(admin) and role == "admin":
		raise HTTPException(status_code=403, detail="Staff directory access is required")
	if role == "student" or not can_manage_staff(admin):
		statement = statement.where(user.is_admin.is_(False), user.staff_status.is_distinct_from("active"), user.staff_status.is_distinct_from("suspended"))
	elif role == "admin":
		statement = statement.where(user.is_admin.is_(True))
	term = q.strip()
	if term:
		statement = statement.where(or_(
			user.name.icontains(term, autoescape=True),
			user.email.icontains(term, autoescape=True),
		))
	if account_status != "all":
		statement = statement.where(user.is_suspended.is_(account_status == "suspended"))
	rows = session.exec(
		statement.order_by(user.created_at.desc(), user.id.desc()).offset(offset).limit(limit)
	).all()
	return [AdminUserResponse(id=str(row.id), name=row.name, email=row.email, is_admin=row.is_admin, is_suspended=row.is_suspended) for row in rows]


@router.put("/users/{user_id}/suspension", response_model=AdminUserResponse)
def update_user_suspension(user_id: str, suspended: bool, request: Request, admin: user = Depends(workspace_users), session: Session = Depends(get_session)):
	try:
		row = session.get(user, UUID(user_id))
	except ValueError:
		row = None
	if not row:
		raise HTTPException(status_code=404, detail="User not found")
	if can_manage_staff(row) or row.staff_status in {"active", "suspended"}:
		raise HTTPException(status_code=403, detail="Manage this account in Staff & Access")
	previous = row.is_suspended
	row.is_suspended = suspended
	session.add(row)
	record_audit_event(session, request, actor_id=admin.id, action="user.suspension.update", object_type="user", object_id=str(row.id),
		changes={"is_suspended": (previous, suspended)})
	session.commit()
	session.refresh(row)
	return AdminUserResponse(id=str(row.id), name=row.name, email=row.email, is_admin=row.is_admin, is_suspended=row.is_suspended)


@router.put("/users/bulk-suspension", response_model=list[AdminUserResponse])
def update_user_bulk_suspension(
	request: Request,
	user_ids: list[UUID] = Body(..., min_length=1, max_length=50),
	suspended: bool = Body(...),
	admin: user = Depends(workspace_users),
	session: Session = Depends(get_session),
):
	ids = set(user_ids)
	rows = session.exec(select(user).where(user.id.in_(ids)).order_by(user.id).with_for_update()).all()
	if len(rows) != len(ids):
		raise HTTPException(status_code=404, detail="One or more selected users no longer exist")
	if any(can_manage_staff(row) or row.staff_status in {"active", "suspended"} for row in rows):
		raise HTTPException(status_code=403, detail="Admin accounts cannot be changed in bulk")
	changed = sum(row.is_suspended != suspended for row in rows)
	parent = record_audit_event(session, request, actor_id=admin.id, action="user.bulk_suspension",
		object_type="user_bulk", object_id=None, result="partial" if 0 < changed < len(rows) else "skipped" if not changed else "success",
		context={"targeted": len(rows), "processed": changed, "skipped": len(rows) - changed, "failed": 0,
		         "record_ids": [str(row.id) for row in rows]})
	for row in rows:
		if row.is_suspended == suspended:
			continue
		previous = row.is_suspended
		row.is_suspended = suspended
		session.add(row)
		record_audit_event(session, request, actor_id=admin.id, action="user.suspension.update", object_type="user", object_id=str(row.id),
			parent_id=parent.id, changes={"is_suspended": (previous, suspended)})
	result = [
		AdminUserResponse(id=str(row.id), name=row.name, email=row.email, is_admin=row.is_admin, is_suspended=row.is_suspended)
		for row in rows
	]
	session.commit()
	return result


OPEN_APPLICATION_STATUSES = ("submitted", "applied", "review", "under_review", "shortlisted", "interview")


def application_review_filter(review, admin_id):
	if review == "failed_followups":
		return select(ApplicationMessage.id).where(
			ApplicationMessage.application_id == application.id, ApplicationMessage.status.in_(("failed", "queued")),
		).exists()
	criteria = {
		"mine": application.reviewer_id == admin_id,
		"unassigned": application.reviewer_id.is_(None),
		"overdue": application.review_due_date < datetime.now(timezone.utc).date(),
		"awaiting_documents": application.document_request.is_not(None),
	}
	return and_(application.status.in_(OPEN_APPLICATION_STATUSES), criteria[review])


def review_details(row, reviewer_name):
	return {"reviewer_id": row.reviewer_id, "reviewer_name": reviewer_name,
		"review_due_date": row.review_due_date, "document_request": row.document_request, "student_update": row.student_update}


@router.get("/applications/review-counts")
def application_review_counts(admin: user = Depends(workspace_applications), session: Session = Depends(get_session)):
	return dict(zip(
		("mine", "unassigned", "overdue", "awaiting_documents", "failed_followups"),
		session.exec(select(*(
			func.count().filter(application_review_filter(kind, admin.id))
			for kind in ("mine", "unassigned", "overdue", "awaiting_documents", "failed_followups")
		)).select_from(application)).one(),
	))


def eligible_reviewers(session):
	roles = [key for key, info in role_definitions(session).items() if "applications" in info["permissions"]]
	return select(user.id, user.name).where(
		user.is_suspended.is_(False), user.deletion_requested_at.is_(None),
		or_(user.is_admin.is_(True),
			func.lower(user.email) == (settings.admin_email or "").lower(),
			and_(user.staff_status == "active", user.staff_role.in_(roles))),
	)


@router.get("/applications/reviewers")
def list_application_reviewers(admin: user = Depends(workspace_applications), session: Session = Depends(get_session)):
	return [{"id": key, "name": name} for key, name in session.exec(eligible_reviewers(session).order_by(user.name, user.id))]


@router.patch("/applications/{application_id}/review")
def update_application_review(
	application_id: UUID, payload: AdminReviewUpdate, request: Request,
	admin: user = Depends(workspace_applications), session: Session = Depends(get_session),
):
	row = session.get(application, application_id, with_for_update=True)
	if row is None:
		raise HTTPException(404, "Application not found")
	if row.status not in OPEN_APPLICATION_STATUSES:
		raise HTTPException(409, "This application is closed")
	fields = payload.model_fields_set
	reviewer_id = payload.reviewer_id if "reviewer_id" in fields else row.reviewer_id
	reviewer = session.get(user, reviewer_id) if reviewer_id is not None else None
	if "reviewer_id" in fields and reviewer_id is not None:
		if session.exec(eligible_reviewers(session).where(user.id == reviewer_id)).first() is None:
			raise HTTPException(422, "Choose an active reviewer with application access")
	due_date = payload.review_due_date if "review_due_date" in fields else row.review_due_date
	document_request = row.document_request
	if "document_request" in fields:
		document_request = (payload.document_request or "").strip() or None
	student_update = row.student_update
	if "student_update" in fields:
		student_update = payload.student_update.model_dump(mode="json") if payload.student_update else None
	changes = {
		"student_update": (row.student_update, student_update),
		"reviewer_id": (row.reviewer_id, reviewer_id),
		"review_due_date": (row.review_due_date, due_date),
		"document_request": (row.document_request, document_request),
	}
	if any(before != after for before, after in changes.values()):
		previous_request = row.document_request
		row.reviewer_id = reviewer_id
		row.review_due_date = due_date
		row.document_request = document_request
		row.student_update = student_update
		if student_update and changes["student_update"][0] != student_update:
			session.add(notification(user_id=row.user_id, message="A new update is available for your application.",
				target_type="application", target_id=str(row.id), read=False))
		if document_request and document_request != previous_request:
			session.add(notification(
				user_id=row.user_id, message=f"Documents requested for your application: {document_request}",
				target_type="application", target_id=str(row.id), read=False,
			))
		session.add(row)
		record_audit_event(session, request, actor_id=admin.id, action="application.review.update",
			object_type="application", object_id=str(row.id), workflow_id=str(row.id),
			changes={key: tuple(str(value) if value is not None else None for value in pair)
				for key, pair in changes.items()})
		session.commit()
	return review_details(row, reviewer.name if reviewer else None)


@router.get("/applications", response_model=list[AdminApplicationResponse])
def list_admin_applications(
	request: Request,
	admin: user = Depends(workspace_applications),
	session: Session = Depends(get_session),
	limit: int = Query(default=100, ge=1, le=200),
	offset: int = Query(default=0, ge=0),
	q: str = Query(default="", max_length=150),
	status_filter: Literal["all", "queue", "Submitted", "Under Review", "Shortlisted", "Accepted", "Rejected", "Withdrawn"] = Query(default="all", alias="status"),
	user_id: UUID | None = Query(default=None, alias="user"),
	program_id: UUID | None = Query(default=None, alias="program"),
	review: Literal["all", "mine", "unassigned", "overdue", "awaiting_documents", "failed_followups"] = "all",
):
	statement = select(application, program.name, user.name).outerjoin(program, program.id == application.program_id).outerjoin(user, user.id == application.reviewer_id)
	if program_id is not None:
		statement = statement.where(application.program_id == program_id)
	if user_id is not None:
		statement = statement.where(application.user_id == user_id)
	if status_filter != "all":
		statement = statement.where(application.status.in_(APPLICATION_FILTER_STATUSES[status_filter]))
	if review != "all":
		statement = statement.where(application_review_filter(review, admin.id))
	term = q.strip()
	if term:
		statement = statement.where(or_(
			application.applicant_name.icontains(term, autoescape=True),
			application.host_company_name.icontains(term, autoescape=True),
			program.name.icontains(term, autoescape=True),
			application.student_index_number.icontains(term, autoescape=True),
			application.letter_reference.icontains(term, autoescape=True),
			func.replace(cast(application.id, String), "-", "").icontains(term.replace("-", "") or term, autoescape=True),
		))
	rows = session.exec(
		statement.order_by(
			case((application_review_filter("overdue", admin.id), 0), else_=1),
			application.created_at.desc(), application.id.desc(),
		).offset(offset).limit(limit)
	).all()
	results = []
	for row, program_name, reviewer_name in rows:
		results.append(AdminApplicationResponse(
			**review_details(row, reviewer_name),
			id=str(row.id), user_id=str(row.user_id), program_id=str(row.program_id) if row.program_id else None,
			program_name=program_name or ("Personal internship" if row.program_id is None else "Program"),
			status=row.status, resume_filename=row.resume_filename,
			documents_sent=row.documents_sent,
			supervisor_assessment_filename=getattr(row, "supervisor_assessment_filename", None),
			certificate_approved=getattr(row, "certificate_approved", False),
			internship_start_date=getattr(row, "internship_start_date", None),
			internship_end_date=getattr(row, "internship_end_date", None),
			applicant_name=row.applicant_name, gender=row.gender,
			student_index_number=row.student_index_number, year_of_study=row.year_of_study,
			suggested_company=row.suggested_company,
			requires_minor_review=age.requires_minor_review(
				getattr(row, "date_of_birth", None),
				row.created_at,
			),
			applicant_institution=row.applicant_institution, applicant_course=row.applicant_course,
			applicant_contact=row.applicant_contact, host_company_name=row.host_company_name,
			host_company_address=row.host_company_address,
			created_at=row.created_at.isoformat(),
		))
	return results


MAX_APPLICATION_EXPORT_ROWS = 50
MAX_APPLICATION_EXPORT_BYTES = 20 * 1024 * 1024


@router.post("/applications/export")
def export_admin_applications(
	request: Request,
	application_ids: list[UUID] = Body(..., embed=True, min_length=1, max_length=MAX_APPLICATION_EXPORT_ROWS),
	admin: user = Depends(workspace_applications),
	session: Session = Depends(get_session),
):
	if len(set(application_ids)) != len(application_ids):
		raise HTTPException(status_code=422, detail="Duplicate application IDs are not allowed")

	rows = session.exec(
		select(application, user.email, program.name)
		.join(user, user.id == application.user_id)
		.outerjoin(program, program.id == application.program_id)
		.where(application.id.in_(application_ids))
		.order_by(application.created_at.desc())
	).all()
	if len(rows) != len(application_ids):
		raise HTTPException(status_code=404, detail="One or more selected applications no longer exist")

	workbook = Workbook()
	worksheet = workbook.active
	worksheet.title = "Applications"
	headers = [
		"Application ID",
		"Applicant Name",
		"Email",
		"Phone",
		"Gender",
		"Student Index Number",
		"Institution",
		"Course",
		"Year of Study",
		"Program",
		"Company",
		"Company Address",
		"Suggested Company",
		"Status",
		"Submitted At",
		"Resume Filename",
	]
	worksheet.append(headers)
	for cell in worksheet[1]:
		cell.data_type = "s"
		cell.font = Font(bold=True, color="FFFFFF")
		cell.fill = PatternFill("solid", fgColor="2D3561")

	exported_text_bytes = 0
	for row, email, program_name in rows:
		values = [
			str(row.id),
			row.applicant_name or "",
			email or "",
			row.applicant_contact or "",
			row.gender or "",
			row.student_index_number or "",
			row.applicant_institution or "",
			row.applicant_course or "",
			row.year_of_study or "",
			program_name or ("Personal internship" if row.program_id is None else "Program"),
			row.host_company_name or "",
			row.host_company_address or "",
			row.suggested_company or "",
			row.status,
			row.created_at.isoformat(),
			row.resume_filename or "",
		]
		exported_text_bytes += sum(
			len(value.encode("utf-8")) for value in values if isinstance(value, str)
		)
		if exported_text_bytes > MAX_APPLICATION_EXPORT_BYTES:
			raise HTTPException(status_code=413, detail="Export exceeds the 20 MB download limit")
		worksheet.append(values)
		for cell in worksheet[worksheet.max_row]:
			if isinstance(cell.value, str):
				cell.data_type = "s"

	for column in worksheet.columns:
		worksheet.column_dimensions[column[0].column_letter].width = min(
			max(max(len(str(cell.value or "")) for cell in column) + 2, 12),
			40,
		)
	worksheet.freeze_panes = "A2"
	worksheet.auto_filter.ref = worksheet.dimensions

	output = BytesIO()
	workbook.save(output)
	content = output.getvalue()
	if len(content) > MAX_APPLICATION_EXPORT_BYTES:
		raise HTTPException(status_code=413, detail="Export exceeds the 20 MB download limit")

	record_audit_event(
		session,
		request,
		actor_id=admin.id,
		action="applications.export",
		object_type="application",
		object_id=f"{len(application_ids)} selected",
	)
	session.commit()
	filename = f"applications-{datetime.now(timezone.utc):%Y%m%d-%H%M%S}.xlsx"
	return Response(
		content=content,
		media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		headers={"Content-Disposition": f'attachment; filename="{filename}"'},
	)


@router.get(
	"/applications/{application_id}/history",
	response_model=list[AdminApplicationStatusHistoryResponse],
)
def get_admin_application_status_history(
	application_id: str,
	request: Request,
	admin: user = Depends(workspace_applications),
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
		AdminApplicationStatusHistoryResponse(
			reason=entry.reason,
			previous_status=entry.previous_status,
			new_status=entry.new_status,
			created_at=entry.created_at.isoformat(),
		)
		for entry in entries
	]


@router.get("/applications/{application_id}/assessment")
def download_supervisor_assessment(
	application_id: str,
	request: Request,
	admin: user = Depends(workspace_applications),
	session: Session = Depends(get_session),
):
	try:
		row = session.get(application, UUID(application_id))
	except ValueError:
		row = None
	if not row or not row.supervisor_assessment_path:
		raise HTTPException(status_code=404, detail="Supervisor assessment not found")
	try:
		content, content_type = storage.download_file(row.supervisor_assessment_path)
	except (BotoCoreError, ClientError, RuntimeError) as error:
		record_audit_event(
			session, request, actor_id=admin.id, action="application.assessment.download",
			object_type="application", object_id=application_id, result="failure",
		)
		session.commit()
		raise HTTPException(status_code=503, detail="Assessment storage is unavailable") from error
	record_audit_event(
		session, request, actor_id=admin.id, action="application.assessment.download",
		object_type="application", object_id=application_id,
	)
	session.commit()
	return Response(
		content=content,
		media_type=content_type or "application/octet-stream",
		headers={"Content-Disposition": storage.build_attachment_content_disposition(
			row.supervisor_assessment_filename or "supervisor-assessment",
		)},
	)


@router.post("/applications/{application_id}/certificate-approval", response_model=ApplicationResponse)
def approve_application_certificate(
	application_id: str,
	payload: AdminCertificateApprovalRequest,
	request: Request,
	admin: user = Depends(workspace_applications),
	session: Session = Depends(get_session),
):
	try:
		row = session.get(application, UUID(application_id))
	except ValueError:
		row = None
	if not row:
		raise HTTPException(status_code=404, detail="Application not found")
	if row.status != "accepted" or not row.documents_sent or not row.supervisor_assessment_path:
		raise HTTPException(
			status_code=409,
			detail="An accepted application with a submitted supervisor assessment is required",
		)
	if payload.internship_end_date < payload.internship_start_date:
		raise HTTPException(status_code=422, detail="Internship end date cannot be before its start date")
	if row.certificate_approved:
		raise HTTPException(status_code=409, detail="The completion certificate is already approved")

	applicant = session.get(user, row.user_id)
	if not applicant:
		raise HTTPException(status_code=404, detail="Applicant not found")
	program_record = session.get(program, row.program_id) if row.program_id else None
	program_name = program_record.name if program_record else "Personal internship"
	try:
		send_certificate_available_email(
			to_email=applicant.email,
			student_name=row.applicant_name or applicant.name,
			program_name=program_name,
			application_url=f"{settings.frontend_url.rstrip('/')}/app/applications",
		)
	except RuntimeError as error:
		logging.getLogger(__name__).exception(
			"Failed to notify applicant about certificate approval for application %s",
			row.id,
		)
		raise HTTPException(
			status_code=503,
			detail="Certificate approval notification could not be sent",
		) from error

	row.certificate_approved = True
	row.certificate_approved_at = datetime.now(timezone.utc)
	row.internship_start_date = payload.internship_start_date
	row.internship_end_date = payload.internship_end_date
	session.add(row)
	session.add(notification(
		user_id=row.user_id,
		message=f"Your completion certificate for {program_name} is ready to download.",
		target_type="application",
		target_id=str(row.id),
		read=False,
	))
	record_audit_event(
		session, request, actor_id=admin.id, action="application.certificate.approve",
		object_type="application", object_id=str(row.id), workflow_id=str(row.id),
		changes={"certificate_approved": (False, True), "internship_start_date": (None, payload.internship_start_date.isoformat()),
		         "internship_end_date": (None, payload.internship_end_date.isoformat())},
	)
	session.commit()
	session.refresh(row)
	return ApplicationResponse(
		id=str(row.id), user_id=str(row.user_id), program_id=str(row.program_id) if row.program_id else None,
		program_name=program_name, status=row.status, resume_filename=row.resume_filename,
		documents_sent=row.documents_sent,
		supervisor_assessment_filename=getattr(row, "supervisor_assessment_filename", None),
		certificate_approved=getattr(row, "certificate_approved", False),
		internship_start_date=getattr(row, "internship_start_date", None),
		internship_end_date=getattr(row, "internship_end_date", None),
		applicant_name=row.applicant_name, gender=row.gender,
		student_index_number=row.student_index_number, year_of_study=row.year_of_study,
		suggested_company=row.suggested_company,
		requires_minor_review=age.requires_minor_review(
			getattr(row, "date_of_birth", None),
			row.created_at,
		),
		applicant_institution=row.applicant_institution, applicant_course=row.applicant_course,
		applicant_contact=row.applicant_contact, host_company_name=row.host_company_name,
		host_company_address=row.host_company_address, created_at=row.created_at.isoformat(),
	)


def validated_opportunity(payload, deadline, prior=None, company_changed=False):
    if payload.opportunity is None:
        return {**prior, "employer_verified": False} if prior and company_changed else prior
    details = payload.opportunity.model_dump(mode="json")
    if payload.opportunity.response_by and deadline and payload.opportunity.response_by < deadline.date():
        raise HTTPException(422, "Expected response date cannot be before the application deadline")
    if details["employer_verified"] and not payload.company.strip():
        raise HTTPException(422, "Enter the verified employer name")
    return details


@router.post("/programs", response_model=ProgramResponse, status_code=status.HTTP_201_CREATED)
def create_program(payload: AdminProgramCreateRequest, request: Request, admin: user = Depends(workspace_programs), session: Session = Depends(get_session)):
	if not payload.name.strip():
		raise HTTPException(status_code=422, detail="Program name is required")
	requested_status = payload.status.strip().lower()
	if requested_status != "open":
		if requested_status != "closed":
			raise HTTPException(status_code=422, detail="Unsupported program status")
		raise HTTPException(status_code=422, detail="Program cycles close automatically at their deadline")
	row = program(name=payload.name.strip(), description=payload.description.strip(), company=payload.company.strip(), category=payload.category.strip(), status="open", location=payload.location.strip(), duration=payload.duration.strip(), skills=", ".join(payload.skills), deadline=parse_deadline(payload.deadline))
	row.opportunity = validated_opportunity(payload, row.deadline)
	session.add(row)
	record_audit_event(session, request, actor_id=admin.id, action="program.create", object_type="program", object_id=str(row.id),
		changes={"employer_verified": (None, (row.opportunity or {}).get("employer_verified"))})
	session.commit()
	session.refresh(row)
	return program_response(row)


@router.put("/programs/{program_id}", response_model=ProgramResponse)
def update_program(program_id: str, payload: AdminProgramUpdateRequest, request: Request, admin: user = Depends(workspace_programs), session: Session = Depends(get_session)):
	try:
		row = session.get(program, UUID(program_id))
	except ValueError:
		row = None
	if not row:
		raise HTTPException(status_code=404, detail="Program not found")
	requested_status = payload.status.strip().lower()
	if requested_status != "open":
		if requested_status != "closed":
			raise HTTPException(status_code=422, detail="Unsupported program status")
		raise HTTPException(status_code=422, detail="Program cycles close automatically at their deadline")
	fields = ("name", "description", "company", "category", "location", "duration", "skills")
	previous = {field: getattr(row, field) for field in fields}
	previous_deadline = row.deadline.isoformat() if row.deadline else None
	for field in fields[:-1]:
		setattr(row, field, getattr(payload, field).strip())
	row.skills = ", ".join(payload.skills)
	row.deadline = parse_deadline(payload.deadline)
	previous_verified = (row.opportunity or {}).get("employer_verified", False)
	row.opportunity = validated_opportunity(payload, row.deadline, row.opportunity, previous["company"] != row.company)
	session.add(row)
	record_audit_event(session, request, actor_id=admin.id, action="program.update", object_type="program", object_id=str(row.id),
		changes={**{field: (previous[field], getattr(row, field)) for field in fields},
		         "deadline": (previous_deadline, row.deadline.isoformat() if row.deadline else None),
		         "employer_verified": (previous_verified, (row.opportunity or {}).get("employer_verified", False))})
	session.commit()
	session.refresh(row)
	return program_response(row)


@router.delete("/programs/{program_id}", response_model=ProgramResponse)
def remove_program(program_id: str, request: Request, admin: user = Depends(workspace_programs), session: Session = Depends(get_session)):
	try:
		row = session.get(program, UUID(program_id))
	except ValueError:
		row = None
	if not row:
		raise HTTPException(status_code=404, detail="Program not found")
	row.status = "closed"
	session.add(row)
	record_audit_event(session, request, actor_id=admin.id, action="program.remove", object_type="program", object_id=str(row.id))
	session.commit()
	session.refresh(row)
	return program_response(row)


@router.put("/applications/{application_id}/status", response_model=ApplicationResponse)
def update_application_status(application_id: str, payload: AdminApplicationStatusRequest, request: Request, admin: user = Depends(workspace_applications), session: Session = Depends(get_session)):
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
		row = session.get(application, UUID(application_id), with_for_update=True)
	except ValueError:
		row = None
	if not row:
		raise HTTPException(status_code=404, detail="Application not found")
	retrying_documents = (
		requested_status == "accepted"
		and row.status == "accepted"
		and not row.documents_sent
	)
	if (
		requested_status not in allowed_transitions.get({"applied": "submitted", "under_review": "review"}.get(row.status, row.status), set())
		and not retrying_documents
	):
		raise HTTPException(status_code=409, detail="Invalid application status transition")
	if requested_status == "accepted" and not retrying_documents and getattr(row, "document_request", None):
		raise HTTPException(409, "Resolve the open document request before accepting this application")
	decision_event = None
	if not retrying_documents:
		previous_status = row.status
		row.status = requested_status
		if requested_status == "accepted" and getattr(row, "letter_reference", None) is None:
			row.letter_reference = _stable_letter_reference(row)
		session.add(row)
		session.add(application_status_history(
			application_id=row.id,
			actor_id=admin.id,
			previous_status=previous_status,
			new_status=requested_status,
			reason=payload.reason,
		))
		decision_event = record_audit_event(
			session, request, actor_id=admin.id, action="application.status.update",
			object_type="application", object_id=str(row.id), workflow_id=str(row.id),
			result="rejected" if requested_status == "rejected" else "success",
			changes={"status": (previous_status, requested_status)},
			context={"reason": payload.reason} if payload.reason else None,
		)
		decision_id = decision_event.id
		if requested_status in {"accepted", "rejected"}:
			decision = "accepted" if requested_status == "accepted" else "rejected"
			session.add(notification(
				user_id=row.user_id,
				message=f"Your application was {decision} by the Fortune Intern Network team.",
				target_type="application",
				target_id=str(row.id),
				read=False,
			))
		session.commit()
	program_record = session.get(program, row.program_id) if row.program_id else None
	program_name = program_record.name if program_record else "Personal internship"

	if requested_status == "accepted" and not row.documents_sent:
		retry_id = None
		if retrying_documents:
			retry_id = session.exec(select(audit_event.id).where(
				audit_event.object_type == "application", audit_event.object_id == str(row.id),
				audit_event.action == "application.documents.delivery", audit_event.result == "failure",
			).order_by(audit_event.created_at.desc(), audit_event.id.desc()).limit(1)).first()
		delivery_parent = decision_id if decision_event is not None else None
		applicant = session.get(user, row.user_id)
		if not applicant:
			raise HTTPException(status_code=404, detail="Applicant not found")
		try:
			reference_no = getattr(row, "letter_reference", None) or _stable_letter_reference(row)
			if getattr(row, "letter_reference", None) is None:
				row.letter_reference = reference_no
				session.add(row)
				session.commit()
			letter_pdf = documents.build_application_recommendation(row, applicant, program_record, reference_no)
			assessment_pdf = documents.build_assessment_form_pdf()
			send_application_documents_email(
				to_email=applicant.email,
				student_name=applicant.name,
				program_name=program_name,
				letter_pdf=letter_pdf,
				assessment_pdf=assessment_pdf,
			)
		except (BotoCoreError, ClientError, RuntimeError, ValueError) as error:
			logging.getLogger(__name__).exception(
				"Failed to send application documents for application %s",
				row.id,
			)
			record_audit_event(session, request, actor_id=admin.id, action="application.documents.delivery",
				object_type="application", object_id=str(row.id), result="failure", workflow_id=str(row.id),
				parent_id=delivery_parent, retry_of_id=retry_id, context={"error_category": type(error).__name__})
			session.commit()
			raise HTTPException(
				status_code=503,
				detail="Application documents could not be sent; retry the accepted status update",
			) from error
		row.documents_sent = True
		session.add(row)
		record_audit_event(session, request, actor_id=admin.id, action="application.documents.delivery",
			object_type="application", object_id=str(row.id), workflow_id=str(row.id),
			parent_id=delivery_parent, retry_of_id=retry_id, changes={"documents_sent": (False, True)})
		session.commit()

	return ApplicationResponse(
		id=str(row.id), user_id=str(row.user_id), program_id=str(row.program_id) if row.program_id else None,
		program_name=program_name, status=row.status, resume_filename=row.resume_filename,
		documents_sent=row.documents_sent,
		supervisor_assessment_filename=getattr(row, "supervisor_assessment_filename", None),
		certificate_approved=getattr(row, "certificate_approved", False),
		internship_start_date=getattr(row, "internship_start_date", None),
		internship_end_date=getattr(row, "internship_end_date", None),
		applicant_name=row.applicant_name, gender=row.gender,
		student_index_number=row.student_index_number, year_of_study=row.year_of_study,
		suggested_company=row.suggested_company,
		requires_minor_review=age.requires_minor_review(
			getattr(row, "date_of_birth", None),
			row.created_at,
		),
		applicant_institution=row.applicant_institution, applicant_course=row.applicant_course,
		applicant_contact=row.applicant_contact, host_company_name=row.host_company_name,
		host_company_address=row.host_company_address, created_at=row.created_at.isoformat(),
	)


@router.get("/applications/{application_id}/resume")
def download_application_resume(application_id: str, request: Request, admin: user = Depends(workspace_applications), session: Session = Depends(get_session)):
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
def get_admin_resume_download_url(application_id: str, request: Request, admin: user = Depends(workspace_applications), session: Session = Depends(get_session)):
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


def announcement_response(row: announcement) -> AnnouncementResponse:
	return AnnouncementResponse(
		id=str(row.id), title=row.title, content=row.content, category=row.category,
		created_at=row.created_at.isoformat(), target_university=canonical_university(row.target_university),
		audience_label=row.audience_label,
	)


@router.post("/announcements", response_model=AnnouncementResponse, status_code=status.HTTP_201_CREATED)
def create_announcement(payload: AnnouncementCreateRequest, request: Request, admin: user = Depends(workspace_announcements), session: Session = Depends(get_session)):
	target_university = canonical_university(payload.target_university)
	audience = "university" if payload.audience == "all" and target_university else payload.audience
	recipient_query = select(user.id, user.email, user_profile.email_notifications).outerjoin(
		user_profile, user_profile.user_id == user.id
	).where(user.is_admin.is_(False), user.is_suspended.is_(False), user.deletion_requested_at.is_(None),
	        user.staff_status.is_distinct_from("active"), user.staff_status.is_distinct_from("suspended"))
	audience_label = None
	if audience == "university":
		if not target_university:
			raise HTTPException(status_code=422, detail="Select a university")
		audience_label = target_university
		recipient_query = recipient_query.where(func.lower(func.trim(user_profile.university)).in_(university_match_values(target_university)))
	elif audience == "students":
		if not payload.student_ids:
			raise HTTPException(status_code=422, detail="Select at least one student")
		audience_label = f"{len(set(payload.student_ids))} selected students"
		recipient_query = recipient_query.where(user.id.in_(payload.student_ids))
	elif audience == "application_status":
		statuses = APPLICATION_FILTER_STATUSES.get(payload.target or "")
		if not statuses or payload.target == "queue":
			raise HTTPException(status_code=422, detail="Select an application status")
		audience_label = f"Applicants · {payload.target}"
		recipient_query = recipient_query.where(user.id.in_(select(application.user_id).where(application.status.in_(statuses))))
	elif audience == "program":
		try:
			listing = session.get(program, UUID(payload.target or ""))
		except ValueError:
			listing = None
		if not listing:
			raise HTTPException(status_code=422, detail="Select a program")
		audience_label = f"Applicants · {listing.name}"
		recipient_query = recipient_query.where(user.id.in_(select(application.user_id).where(application.program_id == listing.id)))
	recipients = session.exec(recipient_query).all()
	if audience == "students" and len(recipients) != len(set(payload.student_ids)):
		raise HTTPException(status_code=422, detail="Some selected students are unavailable")
	if audience in {"students", "application_status", "program"} and not recipients:
		raise HTTPException(status_code=422, detail="No active students match this audience")
	if not payload.title.strip() or not payload.content.strip():
		raise HTTPException(status_code=422, detail="Title and message are required")
	row = announcement(
		title=payload.title.strip(), content=payload.content.strip(), category=payload.category,
		audience=audience, audience_label=audience_label,
		target_university=target_university if audience == "university" else None,
	)
	session.add(row)
	for recipient_id, _, _ in recipients:
		session.add(notification(user_id=recipient_id, message=f"New announcement: {row.title}",
			target_type="announcement", target_id=str(row.id), read=False))
	published_event = record_audit_event(session, request, actor_id=admin.id, action="announcement.create",
		object_type="announcement", object_id=str(row.id), changes={"category": (None, row.category), "audience": (None, audience)},
		context={"recipient_count": len(recipients)})
	result = announcement_response(row)
	parent_id = published_event.id
	session.commit()
	dispatch = send_announcement_emails(to_emails=[email for _, email, opted_in in recipients if email and opted_in is not False],
		title=result.title, content=result.content)
	if isinstance(dispatch, tuple):
		sent, failed, skipped = dispatch
		if sent or failed or skipped:
			outcome = "partial" if failed and sent else "failure" if failed else "skipped" if skipped else "success"
			record_audit_event(session, request, actor_id=admin.id, action="announcement.email.dispatch",
				object_type="announcement", object_id=result.id, parent_id=parent_id, result=outcome,
				context={"processed": sent, "failed": failed, "skipped": skipped, "targeted": sent + failed + skipped})
			session.commit()
	return result


@router.get("/announcements", response_model=list[AnnouncementResponse])
def list_announcements(
	request: Request,
	admin: user = Depends(workspace_announcements),
	session: Session = Depends(get_session),
	limit: int = Query(default=100, ge=1, le=200),
	offset: int = Query(default=0, ge=0),
	q: str = Query(default="", max_length=150),
	category: Literal["all", "payments", "refund", "system", "general"] = Query(default="all"),
):
	statement = select(announcement)
	if category != "all":
		statement = statement.where(announcement.category == category)
	term = q.strip()
	if term:
		statement = statement.where(or_(
			announcement.title.icontains(term, autoescape=True),
			announcement.target_university.icontains(term, autoescape=True),
			announcement.audience_label.icontains(term, autoescape=True),
		))
	rows = session.exec(statement.order_by(announcement.created_at.desc(), announcement.id.desc()).offset(offset).limit(limit)).all()
	return [announcement_response(row) for row in rows]


@router.delete("/announcements/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_announcement(announcement_id: str, request: Request, admin: user = Depends(workspace_announcements), session: Session = Depends(get_session)) -> None:
	try:
		row = session.get(announcement, UUID(announcement_id))
	except ValueError:
		row = None
	if not row:
		raise HTTPException(status_code=404, detail="Announcement not found")
	session.delete(row)
	record_audit_event(session, request, actor_id=admin.id, action="announcement.delete", object_type="announcement", object_id=str(row.id))
	session.commit()


@router.post("/programs/bulk-unpublish", response_model=list[ProgramResponse])
def unpublish_programs(
	request: Request,
	ids: list[UUID] = Body(..., embed=True, min_length=1, max_length=50),
	admin: user = Depends(workspace_programs),
	session: Session = Depends(get_session),
):
	selected = set(ids)
	rows = session.exec(select(program).where(program.id.in_(selected)).order_by(program.id).with_for_update()).all()
	if len(rows) != len(selected):
		raise HTTPException(status_code=404, detail="One or more selected programs no longer exist")
	changed = sum(row.status != "closed" for row in rows)
	parent = record_audit_event(session, request, actor_id=admin.id, action="program.bulk_unpublish",
		object_type="program_bulk", object_id=None, result="partial" if 0 < changed < len(rows) else "skipped" if not changed else "success",
		context={"targeted": len(rows), "processed": changed, "skipped": len(rows) - changed, "failed": 0,
		         "record_ids": [str(row.id) for row in rows]})
	for row in rows:
		if row.status == "closed":
			continue
		previous = row.status
		row.status = "closed"
		session.add(row)
		record_audit_event(session, request, actor_id=admin.id, action="program.remove",
			object_type="program", object_id=str(row.id), parent_id=parent.id, changes={"status": (previous, "closed")})
	result = [program_response(row) for row in rows]
	session.commit()
	return result


@router.get("/users/{user_id}/photo")
def get_admin_user_photo(user_id: UUID, admin: user = Depends(workspace_users), session: Session = Depends(get_session)):
	account = session.get(user, user_id)
	if account is None or (not can_manage_staff(admin) and (can_manage_staff(account) or account.staff_status in {"active", "suspended"})):
		raise HTTPException(status_code=404, detail="Account not found")
	return {"photo": session.exec(select(user_profile.profile_picture).where(user_profile.user_id == user_id)).first()}


@router.get("/applications/{application_id}/photo")
def get_admin_application_photo(application_id: UUID, admin: user = Depends(workspace_applications), session: Session = Depends(get_session)):
	row = session.get(application, application_id)
	if row is None:
		raise HTTPException(status_code=404, detail="Application not found")
	return {"photo": session.exec(select(user_profile.profile_picture).where(user_profile.user_id == row.user_id)).first()}


@router.get("/programs", response_model=list[ProgramResponse])
def list_admin_programs(
	q: str = Query(default="", max_length=150),
	limit: int = Query(default=26, ge=1, le=51),
	offset: int = Query(default=0, ge=0),
	admin: user = Depends(workspace_programs),
	session: Session = Depends(get_session),
):
	statement = select(program)
	term = q.strip()
	if term:
		statement = statement.where(or_(
			program.name.icontains(term, autoescape=True), program.company.icontains(term, autoescape=True),
			program.category.icontains(term, autoescape=True), program.location.icontains(term, autoescape=True),
			program.duration.icontains(term, autoescape=True),
		))
	rows = session.exec(statement.order_by(program.created_at.desc(), program.id.desc()).offset(offset).limit(limit)).all()
	return [program_response(row) for row in rows]


@router.get("/programs/{program_id}/application-summary")
def get_program_application_summary(
	program_id: UUID,
	admin: user = Depends(workspace_applications),
	session: Session = Depends(get_session),
):
	if session.get(program, program_id) is None:
		raise HTTPException(status_code=404, detail="Program not found")
	scope = application.program_id == program_id
	counts = dict(session.exec(select(application.status, func.count(application.id))
				   .where(scope).group_by(application.status)).all())
	accounts = session.exec(select(func.count(func.distinct(application.user_id))).where(scope)).one()
	return {"total": sum(counts.values()), "applicant_accounts": accounts, "statuses": counts}


@router.get("/announcements/recipients")
def search_announcement_recipients(
	q: str = Query(min_length=2, max_length=100),
	admin: user = Depends(workspace_announcements),
	session: Session = Depends(get_session),
):
	term = q.strip()
	if len(term) < 2:
		return []
	rows = session.exec(select(user.id, user.name, user.email).where(
		user.is_admin.is_(False), user.is_suspended.is_(False), user.deletion_requested_at.is_(None),
		user.staff_status.is_distinct_from("active"), user.staff_status.is_distinct_from("suspended"),
		or_(user.name.icontains(term, autoescape=True), user.email.icontains(term, autoescape=True)),
	).order_by(user.name, user.id).limit(20)).all()
	return [{"id": str(account_id), "name": name, "email": email} for account_id, name, email in rows]
