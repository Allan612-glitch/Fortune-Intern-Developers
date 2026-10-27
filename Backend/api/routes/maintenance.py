import hmac
import logging

from botocore.exceptions import BotoCoreError, ClientError
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlmodel import Session

from Backend.core.account_deletion import purge_expired_accounts
from Backend.core.config import settings
from Backend.database import get_session

router = APIRouter(prefix="/api/maintenance", tags=["maintenance"])
logger = logging.getLogger(__name__)


@router.get("/purge-deleted-accounts")
def purge_deleted_accounts(
    authorization: str | None = Header(default=None),
    session: Session = Depends(get_session),
):
    secret = settings.cron_secret
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Scheduled account cleanup is not configured",
        )
    if not authorization or not hmac.compare_digest(
        authorization,
        f"Bearer {secret}",
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid cleanup authorization",
        )

    try:
        purged = purge_expired_accounts(session)
    except (BotoCoreError, ClientError, RuntimeError) as error:
        logger.exception("scheduled account deletion purge failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Account cleanup could not complete",
        ) from error
    return {"purged": purged}
