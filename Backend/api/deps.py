from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session

from Backend.core.rate_limit import enforce_rate_limit
from Backend.core.security import get_user_id_from_token
from Backend.database import get_session
from Database.models import user
from Backend.core.config import settings
from Backend.core.staff_access import staff_permissions

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    session: Session = Depends(get_session),
) -> user:
    user_id, token_version = get_user_id_from_token(credentials)
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
    if account.deletion_requested_at is not None:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is scheduled for deletion",
        )
    if account.token_version != token_version:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired",
        )
    enforce_rate_limit(
        session,
        request,
        "authenticated-api",
        str(account.id),
        ip_limit=500,
        identity_limit=40,
        window_seconds=60,
    )
    return account


def get_optional_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    session: Session = Depends(get_session),
) -> user | None:
    if credentials is None:
        return None
    return get_current_user(request, credentials, session)


def get_current_admin(account: user = Depends(get_current_user)) -> user:
    if not account.is_admin and account.email.lower() != (settings.admin_email or "").lower():
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator access required")
    return account


def can_manage_staff(account: user) -> bool:
    return account.is_admin or account.email.lower() == (settings.admin_email or "").lower()


def check_workspace_permission(account: user, permission: str) -> None:
    if not can_manage_staff(account) and permission not in staff_permissions(account):
        raise HTTPException(status_code=403, detail="You do not have access to this section")


def workspace_permission(permission: str):
    def authorize(account: user = Depends(get_current_user)) -> user:
        check_workspace_permission(account, permission)
        return account
    return authorize


workspace_applications = workspace_permission("applications")
workspace_programs = workspace_permission("programs")
workspace_announcements = workspace_permission("announcements")
workspace_users = workspace_permission("users")
