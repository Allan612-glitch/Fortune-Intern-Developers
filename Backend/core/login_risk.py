from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime, timezone
from hashlib import sha256
import hmac
import ipaddress

from fastapi import Request
from sqlalchemy import case
from sqlalchemy.dialects.postgresql import insert as postgresql_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlmodel import Session

from Backend.core.config import settings
from Database.models import rate_limit_bucket

RISK_WINDOW_SECONDS = 600
MEDIUM_RISK_MIN_ATTEMPTS = 5
MEDIUM_RISK_FAILURE_RATIO = 0.85
HIGH_RISK_MIN_ATTEMPTS = 12
HIGH_RISK_FAILURE_RATIO = 0.9


@dataclass(frozen=True)
class LoginRisk:
    attempts: int
    failures: int

    @property
    def failure_ratio(self) -> float:
        return self.failures / self.attempts if self.attempts else 0.0

    @property
    def high(self) -> bool:
        return (
            self.attempts >= HIGH_RISK_MIN_ATTEMPTS
            and self.failure_ratio >= HIGH_RISK_FAILURE_RATIO
        )

    @property
    def medium(self) -> bool:
        return (
            self.attempts >= MEDIUM_RISK_MIN_ATTEMPTS
            and self.failure_ratio >= MEDIUM_RISK_FAILURE_RATIO
        )


def request_client_fingerprint(request: Request) -> str:
    headers = (
        request.headers.get("user-agent", ""),
        request.headers.get("sec-ch-ua", ""),
        request.headers.get("sec-ch-ua-platform", ""),
        request.headers.get("sec-ch-ua-mobile", ""),
    )
    material = "\0".join(value.strip()[:512].lower() for value in headers)
    return hmac.new(
        settings.jwt_secret.encode(),
        f"http-client\0{material}".encode(),
        sha256,
    ).hexdigest()


def request_risk_keys(
    request: Request,
    client_fingerprint: str,
) -> tuple[str, ...]:
    keys = [f"client:{client_fingerprint}"]
    client_ip = request.client.host if request.client else None
    if not client_ip:
        return tuple(keys)

    try:
        address = ipaddress.ip_address(client_ip.split("%", maxsplit=1)[0])
    except ValueError:
        return tuple(keys)

    prefix_length = 24 if address.version == 4 else 64
    network = ipaddress.ip_network(f"{address}/{prefix_length}", strict=False)
    network_fingerprint = hmac.new(
        settings.jwt_secret.encode(),
        f"source-network\0{network}".encode(),
        sha256,
    ).hexdigest()
    keys.append(f"network:{network_fingerprint}")
    return tuple(keys)


def _bucket_key(fingerprint: str) -> str:
    return f"login-risk:{fingerprint}"


def _current_bucket_risk(bucket: rate_limit_bucket | None) -> LoginRisk:
    if bucket is None:
        return LoginRisk(attempts=0, failures=0)
    now = datetime.now(timezone.utc)
    window_start = datetime.fromtimestamp(
        int(now.timestamp()) // RISK_WINDOW_SECONDS * RISK_WINDOW_SECONDS,
        tz=timezone.utc,
    )
    stored_window = bucket.window_started_at
    if stored_window.tzinfo is None:
        stored_window = stored_window.replace(tzinfo=timezone.utc)
    if stored_window < window_start:
        return LoginRisk(attempts=0, failures=0)

    return LoginRisk(
        attempts=bucket.count,
        failures=bucket.failure_count,
    )


def get_login_risk(
    session: Session,
    fingerprints: str | Sequence[str],
) -> LoginRisk:
    keys = (fingerprints,) if isinstance(fingerprints, str) else fingerprints
    risks = [
        _current_bucket_risk(session.get(rate_limit_bucket, _bucket_key(fingerprint)))
        for fingerprint in keys
    ]
    return max(
        risks,
        key=lambda risk: (
            risk.high,
            risk.medium,
            risk.failure_ratio,
            risk.attempts,
        ),
        default=LoginRisk(attempts=0, failures=0),
    )


def record_login_outcome(
    session: Session,
    fingerprints: str | Sequence[str],
    *,
    failed: bool,
) -> None:
    now = datetime.now(timezone.utc)
    window_start = datetime.fromtimestamp(
        int(now.timestamp()) // RISK_WINDOW_SECONDS * RISK_WINDOW_SECONDS,
        tz=timezone.utc,
    )
    dialect = session.get_bind().dialect.name
    insert = {
        "postgresql": postgresql_insert,
        "sqlite": sqlite_insert,
    }.get(dialect)
    if insert is None:
        raise RuntimeError(f"Login risk tracking is not supported for database dialect {dialect!r}")

    table = rate_limit_bucket.__table__
    reset_window = table.c.window_started_at < window_start
    keys = (fingerprints,) if isinstance(fingerprints, str) else fingerprints
    for fingerprint in keys:
        statement = insert(rate_limit_bucket).values(
            key=_bucket_key(fingerprint),
            window_started_at=window_start,
            count=1,
            failure_count=int(failed),
        )
        statement = statement.on_conflict_do_update(
            index_elements=[table.c.key],
            set_={
                "window_started_at": case(
                    (reset_window, window_start),
                    else_=table.c.window_started_at,
                ),
                "count": case(
                    (reset_window, 1),
                    else_=table.c.count + 1,
                ),
                "failure_count": case(
                    (reset_window, int(failed)),
                    else_=table.c.failure_count + int(failed),
                ),
            },
        )
        session.exec(statement)
    session.commit()
