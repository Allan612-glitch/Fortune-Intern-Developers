from datetime import datetime, timedelta, timezone
from hashlib import sha256
import logging

from fastapi import HTTPException, Request, status
from sqlalchemy import case
from sqlalchemy.dialects.postgresql import insert as postgresql_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlmodel import Session

from Database.models import rate_limit_bucket

logger = logging.getLogger(__name__)


def enforce_rate_limit(
    session: Session,
    request: Request,
    action: str,
    identity: str,
    *,
    ip_limit: int,
    identity_limit: int,
    window_seconds: int,
) -> None:
    now = datetime.now(timezone.utc)
    window_start = datetime.fromtimestamp(
        int(now.timestamp()) // window_seconds * window_seconds,
        tz=timezone.utc,
    )
    client_ip = request.client.host if request.client else "unknown"
    subjects = (
        ("ip", client_ip, ip_limit),
        ("identity", identity.strip().lower(), identity_limit),
    )
    dialect = session.get_bind().dialect.name
    insert = {
        "postgresql": postgresql_insert,
        "sqlite": sqlite_insert,
    }.get(dialect)
    if insert is None:
        raise RuntimeError(f"Rate limiting is not supported for database dialect {dialect!r}")

    allowed = True
    for subject_type, subject, limit in subjects:
        digest = sha256(f"{action}\0{subject_type}\0{subject}".encode()).hexdigest()
        bucket_key = f"{action}:{digest}"
        statement = insert(rate_limit_bucket).values(
            key=bucket_key,
            window_started_at=window_start,
            count=1,
        )
        table = rate_limit_bucket.__table__
        reset_window = table.c.window_started_at < window_start
        statement = statement.on_conflict_do_update(
            index_elements=[table.c.key],
            set_={
                "window_started_at": case(
                    (reset_window, window_start),
                    else_=table.c.window_started_at,
                ),
                "count": case(
                    (reset_window, 1),
                    (table.c.count <= limit, table.c.count + 1),
                    else_=table.c.count,
                ),
            },
        ).returning(table.c.count)
        count = session.exec(statement).scalar_one()
        allowed = allowed and count <= limit

    session.commit()
    if not allowed:
        retry_after = max(
            1,
            int((window_start + timedelta(seconds=window_seconds) - now).total_seconds()),
        )
        logger.warning(
            "request rate limit exceeded",
            extra={
                "rate_limit_action": action,
                "source_ip": client_ip,
                "retry_after": retry_after,
            },
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please try again later.",
            headers={"Retry-After": str(retry_after)},
        )
