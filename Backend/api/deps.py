from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session

from Backend.core.security import get_user_id_from_token
from Backend.database import get_session
from Database.models import user
from Backend.core.config import settings

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    session: Session = Depends(get_session),
) -> user:
    user_id = get_user_id_from_token(credentials)
    account = session.get(user, user_id)
    if not account:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists",
        )
    if account.is_suspended:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account suspended")
    return account


def get_current_admin(account: user = Depends(get_current_user)) -> user:
    if not account.is_admin and account.email.lower() != (settings.admin_email or "").lower():
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator access required")
    return account
