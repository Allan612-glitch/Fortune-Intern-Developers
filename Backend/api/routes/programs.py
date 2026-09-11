from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from Backend.database import get_session
from Database.models import program
from Database.schemas import ProgramResponse

router = APIRouter(prefix="/api/programs", tags=["programs"])


def serialize_program(row: program) -> ProgramResponse:
	return ProgramResponse(
		id=str(row.id),
		name=row.name,
		description=row.description or "",
		company=row.company,
		category=row.category,
		status=row.status,
		location=row.location,
		duration=row.duration,
		skills=[skill.strip() for skill in (row.skills or "").split(",") if skill.strip()],
		deadline=row.deadline.isoformat() if row.deadline else None,
	)


@router.get("", response_model=list[ProgramResponse])
def list_programs(
	search: str | None = Query(default=None, max_length=100),
	category: str | None = Query(default=None, max_length=50),
	status: str = Query(default="open", max_length=30),
	session: Session = Depends(get_session),
):
	statement = select(program).order_by(program.created_at.desc())
	if status != "all":
		statement = statement.where(program.status == status)
	if category and category.lower() != "all":
		statement = statement.where(program.category == category)
	if search:
		search_value = f"%{search.strip()}%"
		statement = statement.where(
			(program.name.ilike(search_value))
			| (program.description.ilike(search_value))
			| (program.company.ilike(search_value))
			| (program.skills.ilike(search_value))
		)
	return [serialize_program(row) for row in session.exec(statement).all()]


@router.get("/{program_id}", response_model=ProgramResponse)
def get_program(program_id: str, session: Session = Depends(get_session)):
	try:
		row = session.get(program, program_id)
	except (TypeError, ValueError):
		row = None
	if not row:
		raise HTTPException(status_code=404, detail="Program not found")
	return serialize_program(row)
