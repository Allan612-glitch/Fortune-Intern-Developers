import re
from uuid import UUID, uuid4

from fastapi import Request
from sqlmodel import Session

from Database.models import audit_event, user

SAFE_CHANGE_FIELDS = frozenset({
    "permissions", "status", "staff_role", "staff_status", "is_suspended", "category", "audience",
    "amount_minor", "record_date", "deadline", "documents_sent", "certificate_approved",
    "internship_start_date", "internship_end_date", "reviewer_id", "review_due_date", "employer_verified",
})
REDACTED_CHANGE_FIELDS = frozenset({"name", "description", "company", "location", "duration", "skills", "title", "content", "profile_picture", "document", "document_request", "student_update", "resolution"})
SAFE_CONTEXT_FIELDS = frozenset({
    "targeted", "processed", "skipped", "failed", "record_ids", "program_id",
    "error_category", "format", "recipient_count", "result_count", "reason",
})
SAFE_CODE = re.compile(r"^[a-zA-Z0-9 ,._:/+\-]{1,100}$")


def safe_value(value):
    if value is None or isinstance(value, (int, bool)):
        return value
    if isinstance(value, str) and SAFE_CODE.fullmatch(value):
        return value
    return "[redacted]"


def record_audit_event(
    session: Session,
    request: Request,
    *,
    actor_id: UUID | None,
    action: str,
    object_type: str,
    object_id: str | None,
    result: str = "success",
    changes: dict | None = None,
    context: dict | None = None,
    parent_id: UUID | None = None,
    retry_of_id: UUID | None = None,
    reversal_of_id: UUID | None = None,
    workflow_id: str | None = None,
    actor_type: str | None = None,
) -> audit_event:
    # Free-text business data and credentials never enter the change history.
    details = {"changes": {
        field: {"before": safe_value(values[0]), "after": safe_value(values[1])}
        if field in SAFE_CHANGE_FIELDS else {"before": "[redacted]" if values[0] else None,
                                             "after": "[redacted]" if values[1] else None}
        for field, values in (changes or {}).items()
        if field in SAFE_CHANGE_FIELDS | REDACTED_CHANGE_FIELDS and values[0] != values[1]
    }, "context": {
        field: [safe_value(item) for item in value[:100]] if isinstance(value, list) else safe_value(value)
        for field, value in (context or {}).items() if field in SAFE_CONTEXT_FIELDS
    }}
    state = getattr(request, "state", None)
    correlation_id = getattr(state, "audit_correlation_id", None) or uuid4()
    if state is not None:
        state.audit_correlation_id = correlation_id
    actor = session.get(user, actor_id) if actor_id else None
    if not isinstance(actor, user):
        actor = None
    module = {
        "staff_invitation": "staff", "application_bulk": "application",
        "user_bulk": "user", "program_bulk": "program",
    }.get(object_type, object_type)
    if action.startswith("staff."):
        module = "staff"
    event = audit_event(
        actor_id=actor_id, actor_name=actor.name[:180] if actor else None,
        actor_type=actor_type or ("account" if actor_id else "anonymous"),
        actor_role=("administrator" if actor.is_admin else getattr(actor, "staff_role", None) or "student") if actor else None,
        action=action, module=module, object_type=object_type,
        object_id=object_id, source_ip=request.client.host if request.client else None,
        result=result, details=details, correlation_id=correlation_id,
        workflow_id=workflow_id, parent_id=parent_id, retry_of_id=retry_of_id,
        reversal_of_id=reversal_of_id,
    )
    session.add(event)
    return event


def permit_retention_delete(session: Session, entity: str, entity_id: str) -> None:
    """Scope PostgreSQL retention deletion to one entity for this transaction."""
    if session.get_bind().dialect.name == "postgresql":
        from sqlalchemy import text
        session.execute(text("SELECT set_config('fortune.audit_retention_scope', :scope, true)"),
                        {"scope": f"{entity}:{UUID(entity_id)}"})
