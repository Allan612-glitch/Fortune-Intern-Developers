from datetime import datetime, timedelta, timezone
import hmac
from hashlib import sha256
from uuid import UUID

import jwt
from fastapi import HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from pwdlib import PasswordHash

from Backend.core.config import settings

password_hash = PasswordHash.recommended()
ONE_TIME_HASH_PREFIX = "hmac-sha256:"


def hash_one_time_secret(secret: str, purpose: str) -> str:
    digest = hmac.new(
        settings.jwt_secret.encode(),
        f"{purpose}\0{secret}".encode(),
        sha256,
    ).hexdigest()
    return f"{ONE_TIME_HASH_PREFIX}{digest}"


def verify_one_time_secret(secret: str, stored_hash: str, purpose: str) -> bool:
    if stored_hash.startswith(ONE_TIME_HASH_PREFIX):
        return hmac.compare_digest(hash_one_time_secret(secret, purpose), stored_hash)
    return verify_password(secret, stored_hash)


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, password_hash_value: str) -> bool:
    return password_hash.verify(password, password_hash_value)


def create_access_token(user_id: UUID, token_version: int = 0) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    payload = {"sub": str(user_id), "ver": token_version, "exp": expires_at}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def get_user_id_from_token(
    credentials: HTTPAuthorizationCredentials | None,
) -> tuple[UUID, int]:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
        token_version = payload.get("ver", 0)
        if not isinstance(token_version, int) or token_version < 0:
            raise ValueError("Invalid token version")
        return UUID(payload["sub"]), token_version
    except (jwt.InvalidTokenError, KeyError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
