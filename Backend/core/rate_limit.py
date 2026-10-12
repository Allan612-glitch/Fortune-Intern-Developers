from datetime import datetime, timezone
from hashlib import sha256
import logging
from collections.abc import Callable

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
    identity_window_seconds: int | None = None,
    on_ip_limit: Callable[[], None] | None = None,
) -> None:
    now = datetime.now(timezone.utc)
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

    ip_limited = False
    identity_limited = False
    for subject_type, subject, limit in subjects:
        subject_window_seconds = (
            window_seconds
            if subject_type == "ip" or identity_window_seconds is None
            else identity_window_seconds
        )
        window_start = datetime.fromtimestamp(
            int(now.timestamp()) // subject_window_seconds * subject_window_seconds,
            tz=timezone.utc,
        )
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
        if count > limit:
            if subject_type == "ip":
                ip_limited = True
            else:
                identity_limited = True

    session.commit()
    if identity_limited:
        subject_window_seconds = identity_window_seconds or window_seconds
        window_end = datetime.fromtimestamp(
            (int(now.timestamp()) // subject_window_seconds + 1) * subject_window_seconds,
            tz=timezone.utc,
        )
        retry_after = max(
            1,
            int((window_end - now).total_seconds()),
        )
        logger.warning(
            "request rate limit exceeded",
            extra={
                "rate_limit_action": action,
                "source_ip": client_ip,
                "rate_limit_subject": "identity",
                "retry_after": retry_after,
            },
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please try again later.",
            headers={"Retry-After": str(retry_after)},
        )
    if ip_limited:
        if on_ip_limit is not None:
            on_ip_limit()
            return
        window_end = datetime.fromtimestamp(
            (int(now.timestamp()) // window_seconds + 1) * window_seconds,
            tz=timezone.utc,
        )
        retry_after = max(
            1,
            int((window_end - now).total_seconds()),
        )
        logger.warning(
            "request rate limit exceeded",
            extra={
                "rate_limit_action": action,
                "source_ip": client_ip,
                "rate_limit_subject": "ip",
                "retry_after": retry_after,
            },
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please try again later.",
            headers={"Retry-After": str(retry_after)},
        )
