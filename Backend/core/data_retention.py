from datetime import datetime, timezone

from sqlalchemy import delete
from sqlmodel import Session, select

from Backend.core import storage
from Database.models import (
    application,
    application_status_history,
    audit_event,
    consent_log,
    notification,
    program,
)

APPLICATION_RETENTION_YEARS = 3
CONSENT_RETENTION_YEARS = 3
RETENTION_BATCH_SIZE = 100
PROGRAM_CLOSURE_BATCH_SIZE = 500


def add_calendar_years(value: datetime, years: int) -> datetime:
    try:
        return value.replace(year=value.year + years)
    except ValueError:
        return value.replace(year=value.year + years, day=28)


def close_expired_program_cycles(
    session: Session,
    *,
    now: datetime | None = None,
    limit: int = PROGRAM_CLOSURE_BATCH_SIZE,
) -> int:
    current_time = now or datetime.now(timezone.utc)
    expired_programs = session.exec(
        select(program)
        .where(
            program.deadline <= current_time,
            program.cycle_closed_at.is_(None),
            program.status == "open",
        )
        .order_by(program.deadline)
        .limit(limit)
    ).all()
    for row in expired_programs:
        deadline = row.deadline
        if deadline is None:
            continue
        row.cycle_closed_at = (
            deadline.replace(tzinfo=timezone.utc)
            if deadline.tzinfo is None
            else deadline
        )
        row.status = "closed"
        session.add(row)
    if expired_programs:
        session.commit()
    return len(expired_programs)


def purge_expired_retained_data(
    session: Session,
    *,
    now: datetime | None = None,
    limit: int = RETENTION_BATCH_SIZE,
) -> tuple[int, int]:
    current_time = now or datetime.now(timezone.utc)
    application_cutoff = add_calendar_years(
        current_time,
        -APPLICATION_RETENTION_YEARS,
    )
    expired_applications = session.exec(
        select(application)
        .join(program, application.program_id == program.id)
        .where(program.cycle_closed_at <= application_cutoff)
        .order_by(program.cycle_closed_at, application.created_at)
        .limit(limit)
    ).all()

    for row in expired_applications:
        if row.resume_path:
            storage.delete_file(row.resume_path)
        application_id = str(row.id)
        session.execute(
            delete(application_status_history).where(
                application_status_history.application_id == row.id
            )
        )
        session.execute(
            delete(notification).where(
                notification.target_type == "application",
                notification.target_id == application_id,
            )
        )
        session.execute(
            delete(audit_event).where(
                audit_event.object_type == "application",
                audit_event.object_id == application_id,
            )
        )
        session.delete(row)
        session.commit()

    expired_consents = session.exec(
        select(consent_log.id)
        .where(consent_log.expires_at <= current_time)
        .order_by(consent_log.expires_at)
        .limit(limit)
    ).all()
    if expired_consents:
        session.execute(
            delete(consent_log).where(consent_log.id.in_(expired_consents))
        )
        session.commit()

    return len(expired_applications), len(expired_consents)
