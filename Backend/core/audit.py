from uuid import UUID

from fastapi import Request
from sqlmodel import Session

from Database.models import audit_event


def record_audit_event(
    session: Session,
    request: Request,
    *,
    actor_id: UUID | None,
    action: str,
    object_type: str,
    object_id: str | None,
    result: str = "success",
) -> None:
    session.add(
        audit_event(
            actor_id=actor_id,
            action=action,
            object_type=object_type,
            object_id=object_id,
            source_ip=request.client.host if request.client else None,
            result=result,
        )
    )
