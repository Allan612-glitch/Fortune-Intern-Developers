import json
import logging
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from fastapi import HTTPException, status

from Backend.core.config import settings

logger = logging.getLogger(__name__)
TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


def verify_turnstile(token: str | None, remote_ip: str | None) -> None:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "captcha_required",
                "message": "Complete the security check to continue.",
            },
        )
    if not settings.turnstile_secret_key:
        logger.error("Turnstile verification requested but TURNSTILE_SECRET_KEY is not configured")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Signup security verification is not configured",
        )

    form_data = {
        "secret": settings.turnstile_secret_key,
        "response": token,
    }
    if remote_ip:
        form_data["remoteip"] = remote_ip
    verification_request = Request(
        TURNSTILE_VERIFY_URL,
        data=urlencode(form_data).encode(),
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urlopen(verification_request, timeout=5) as response:
            result = json.loads(response.read())
    except (URLError, TimeoutError, json.JSONDecodeError, UnicodeDecodeError, OSError) as error:
        logger.error("Turnstile verification service is unavailable", exc_info=error)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to verify the security challenge. Please try again.",
        ) from error

    if not isinstance(result, dict) or result.get("success") is not True:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "captcha_invalid",
                "message": "The security check expired or was not accepted. Please try again.",
            },
        )
