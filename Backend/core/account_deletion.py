from datetime import datetime, timedelta, timezone

from sqlalchemy import delete
from sqlmodel import SQLModel, Session, select

from Backend.core import storage
from Database.models import application, audit_event, profile_document, user

ACCOUNT_DELETION_RETENTION = timedelta(days=30)
ACCOUNT_DELETION_BATCH_SIZE = 10


def purge_account(session: Session, account: user) -> None:
    applications = session.exec(
        select(application).where(application.user_id == account.id)
    ).all()
    documents = session.exec(
        select(profile_document).where(profile_document.user_id == account.id)
    ).all()
    storage_paths = {
        *(row.resume_path for row in applications if row.resume_path),
        *(row.storage_path for row in documents),
    }
    for storage_path in storage_paths:
        storage.delete_file(storage_path)

    session.execute(
        delete(audit_event).where(audit_event.actor_id == account.id)
    )
    for table in reversed(SQLModel.metadata.sorted_tables):
        for foreign_key in table.foreign_keys:
            if (
                foreign_key.target_fullname == "users.id"
                and foreign_key.ondelete != "SET NULL"
            ):
                session.execute(
                    delete(table).where(foreign_key.parent == account.id)
                )
    session.delete(account)
    session.commit()


def purge_expired_accounts(
    session: Session,
    *,
    now: datetime | None = None,
    limit: int = ACCOUNT_DELETION_BATCH_SIZE,
) -> int:
    cutoff = (now or datetime.now(timezone.utc)) - ACCOUNT_DELETION_RETENTION
    accounts = session.exec(
        select(user)
        .where(user.deletion_requested_at <= cutoff)
        .order_by(user.deletion_requested_at)
        .limit(limit)
    ).all()
    for account in accounts:
        purge_account(session, account)
    return len(accounts)
