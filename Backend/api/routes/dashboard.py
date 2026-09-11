from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from Backend.api.deps import get_current_user
from Backend.database import get_session
from Database.models import application, program, user, user_profile
from Database.schemas import DashboardApplication, DashboardResponse

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardResponse)
def get_dashboard(
	account: user = Depends(get_current_user),
	session: Session = Depends(get_session),
):
	profile = session.exec(
		select(user_profile).where(user_profile.user_id == account.id)
	).first()
	profile_values = [
		profile.bio if profile else None,
		profile.profile_picture if profile else None,
		profile.university if profile else None,
		profile.course if profile else None,
		profile.major if profile else None,
		profile.year_of_study if profile else None,
		profile.graduation_year if profile else None,
		profile.skills if profile else None,
		profile.phone_number if profile else None,
		profile.location if profile else None,
	]
	profile_completion = round(sum(bool(value) for value in profile_values) / len(profile_values) * 100)

	applications = session.exec(
		select(application)
		.where(application.user_id == account.id)
		.order_by(application.created_at.desc())
	).all()
	status_counts = {}
	recent_applications = []
	for row in applications:
		status_key = row.status.lower()
		status_counts[status_key] = status_counts.get(status_key, 0) + 1
		if len(recent_applications) < 5:
			program_record = session.get(program, row.program_id)
			recent_applications.append(
				DashboardApplication(
					id=str(row.id),
					program_name=program_record.name if program_record else "Program",
					status=row.status,
					created_at=row.created_at.isoformat(),
				)
			)

	now = datetime.now(timezone.utc)
	open_programs = session.exec(
		select(program).where(program.status == "open")
	).all()
	deadlines = [item.deadline for item in open_programs if item.deadline and item.deadline >= now]

	return DashboardResponse(
		profile_completion=profile_completion,
		total_applications=len(applications),
		active_applications=sum(
			count for status_key, count in status_counts.items()
			if status_key not in {"rejected", "withdrawn", "accepted"}
		),
		interviews=status_counts.get("interview", 0),
		accepted_applications=status_counts.get("accepted", 0),
		rejected_applications=status_counts.get("rejected", 0),
		open_programs=len(open_programs),
		next_deadline=min(deadlines).isoformat() if deadlines else None,
		recent_applications=recent_applications,
	)
