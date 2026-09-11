from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from Backend.api.deps import get_current_user
from Backend.database import get_session
from Database.models import application, program, user
from Database.schemas import ApplicationCreateRequest, ApplicationResponse

router = APIRouter(prefix="/api/applications", tags=["applications"])


def serialize_application(row: application, program_name: str) -> ApplicationResponse:
    return ApplicationResponse(
        id=str(row.id),
        user_id=str(row.user_id),
        program_id=str(row.program_id),
        program_name=program_name,
        status=row.status,
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


@router.post("", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
def create_application(
    payload: ApplicationCreateRequest,
    account: user = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if not payload.program_name.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Program name is required",
        )

    program_name = payload.program_name.strip()
    program_record = session.exec(select(program).where(program.name == program_name)).first()
    if not program_record:
        program_record = program(
            name=program_name,
            description=f"Submitted by {account.name}",
        )
        session.add(program_record)
        session.commit()
        session.refresh(program_record)

    new_application = application(
        user_id=account.id,
        program_id=program_record.id,
        status="submitted",
    )
    session.add(new_application)
    session.commit()
    session.refresh(new_application)

    return serialize_application(new_application, program_name)
