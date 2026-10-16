from datetime import datetime, timedelta, timezone
import logging
from secrets import randbelow, token_urlsafe
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Request, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
import resend
from sqlmodel import Session, select

from Backend.api.deps import get_current_user
from Backend.core.captcha import verify_turnstile
from Backend.core.config import settings
from Backend.core.login_risk import (
    LoginRisk,
    get_login_risk,
    record_login_outcome,
    request_client_fingerprint,
    request_risk_keys,
)
from Backend.core.security import (
    create_access_token,
    create_trusted_device_token,
    hash_one_time_secret,
    hash_password,
    verify_one_time_secret,
    verify_password,
    verify_trusted_device_token,
)
from Backend.core.rate_limit import enforce_rate_limit
from Backend.database import get_session
from Database.models import password_reset, registration_verification, user
from Database.schemas import (
    ForgotPasswordRequest,
    GoogleLoginRequest,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserResponse,
    VerificationStartResponse,
    VerifyEmailRequest,
)

router = APIRouter(prefix="/api/auth", tags=["authentication"])
logger = logging.getLogger(__name__)


def _as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def send_verification_email(email: str, code: str) -> None:
    if not all((settings.resend_api_key, settings.resend_from_email)):
        raise HTTPException(status_code=503, detail="Email verification is not configured")

    resend.api_key = settings.resend_api_key
    try:
        resend.Emails.send({
            "from": settings.resend_from_email,
            "to": [email],
            "subject": "Verify your Fortune Intern Network account",
            "text": (
                f"Your Fortune Intern Network verification code is {code}. "
                f"It expires in {settings.verification_code_expire_minutes} minutes."
            ),
        })
    except Exception as error:
        raise HTTPException(status_code=503, detail="Unable to send verification email") from error


def send_password_reset_email(email: str, token: str) -> None:
    if not all((settings.resend_api_key, settings.resend_from_email)):
        raise HTTPException(status_code=503, detail="Email delivery is not configured")

    query = urlencode({"email": email, "token": token})
    reset_link = f"{settings.frontend_url}/reset-password.html?{query}"
    resend.api_key = settings.resend_api_key
    try:
        resend.Emails.send({
            "from": settings.resend_from_email,
            "to": [email],
            "subject": "Reset your Fortune Intern Network password",
            "text": (
                f"We received a request to reset your password. Use the link below to choose a new one:\n\n"
                f"{reset_link}\n\n"
                f"This link expires in {settings.password_reset_token_expire_minutes} minutes. "
                f"If you didn't request this, you can safely ignore this email."
            ),
        })
    except Exception as error:
        raise HTTPException(status_code=503, detail="Unable to send password reset email") from error


def serialize_user(account: user) -> UserResponse:
    return UserResponse(id=str(account.id), name=account.name, email=account.email, is_admin=account.is_admin)


def create_auth_response(account: user, client_fingerprint: str) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(account.id, account.token_version),
        token_type="bearer",
        user=serialize_user(account),
        device_token=create_trusted_device_token(account.email, client_fingerprint),
    )


def validate_email(email: str) -> str:
    normalized_email = email.strip().lower()
    if "@" not in normalized_email:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A valid email address is required",
        )
    return normalized_email


@router.post("/login", response_model=TokenResponse)
def login(
    credentials: LoginRequest,
    request: Request,
    session: Session = Depends(get_session),
):
    email = validate_email(credentials.email)
    client_ip = request.client.host if request.client else "unknown"
    enforce_rate_limit(
        session, request, "login", f"{email}:{client_ip}",
        ip_limit=500,
        identity_limit=10,
        window_seconds=60,
        identity_window_seconds=900,
    )
    fingerprint = request_client_fingerprint(request)
    risk_keys = request_risk_keys(request, fingerprint)
    risk = get_login_risk(session, risk_keys)
    trusted_device = verify_trusted_device_token(
        credentials.trusted_device_token,
        email,
        fingerprint,
    )
    if (risk.medium or risk.high) and not trusted_device:
        verify_turnstile(credentials.captcha_token, client_ip)

    account = session.exec(select(user).where(user.email == email)).first()
    if not account or not account.password_hash or not verify_password(credentials.password, account.password_hash):
        record_login_outcome(session, risk_keys, failed=True)
        next_risk = LoginRisk(
            attempts=risk.attempts + 1,
            failures=risk.failures + 1,
        )
        if (
            (not risk.medium and next_risk.medium)
            or (not risk.high and next_risk.high)
        ):
            logger.warning(
                "login cohort now requires an additional verification step",
                extra={
                    "auth_action": "login",
                    "source_ip": client_ip,
                    "risk_attempts": next_risk.attempts,
                    "risk_failures": next_risk.failures,
                },
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    record_login_outcome(session, risk_keys, failed=False)
    if account.is_suspended:
        logger.warning(
            "suspended account login rejected",
            extra={
                "auth_action": "login",
                "source_ip": request.client.host if request.client else None,
            },
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account suspended")

    return create_auth_response(account, fingerprint)


@router.post("/google", response_model=TokenResponse)
def google_login(
    payload: GoogleLoginRequest,
    request: Request,
    session: Session = Depends(get_session),
):
    client_ip = request.client.host if request.client else "unknown"
    enforce_rate_limit(
        session, request, "google-login", client_ip,
        ip_limit=500,
        identity_limit=500,
        window_seconds=60,
    )
    if not settings.google_client_id:
        raise HTTPException(status_code=503, detail="Google sign-in is not configured")

    try:
        claims = id_token.verify_oauth2_token(
            payload.credential,
            google_requests.Request(),
            settings.google_client_id,
        )
    except ValueError as error:
        raise HTTPException(status_code=401, detail="Invalid Google credential") from error

    subject = claims.get("sub")
    email_claim = claims.get("email")
    if (
        not isinstance(subject, str)
        or not isinstance(email_claim, str)
        or claims.get("email_verified") is not True
    ):
        raise HTTPException(status_code=401, detail="Google account has no verified email")

    email = validate_email(email_claim)
    enforce_rate_limit(
        session, request, "google-login-email", email,
        ip_limit=500,
        identity_limit=10,
        window_seconds=60,
        identity_window_seconds=900,
    )
    account = session.exec(select(user).where(user.google_sub == subject)).first()
    if not account:
        account = session.exec(select(user).where(user.email == email)).first()
        if account:
            if account.google_sub and account.google_sub != subject:
                raise HTTPException(status_code=409, detail="This email is linked to another Google account")
            account.google_sub = subject
        else:
            name = claims.get("name")
            if not isinstance(name, str) or not name.strip():
                name = email.partition("@")[0]
            account = user(
                name=name.strip(),
                email=email,
                password_hash=None,
                google_sub=subject,
            )
            session.add(account)

    session.add(account)
    session.commit()
    session.refresh(account)
    if account.is_suspended:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account suspended")
    return create_auth_response(account, request_client_fingerprint(request))


@router.post("/register", response_model=VerificationStartResponse, status_code=status.HTTP_202_ACCEPTED)
def register(
    credentials: RegisterRequest,
    request: Request,
    session: Session = Depends(get_session),
):
    email = validate_email(credentials.email)
    client_ip = request.client.host if request.client else None
    enforce_rate_limit(
        session, request, "register", email,
        ip_limit=500,
        identity_limit=5,
        window_seconds=60,
        identity_window_seconds=3600,
        on_ip_limit=lambda: verify_turnstile(credentials.captcha_token, client_ip),
    )
    name = credentials.name.strip()
    if len(name) < 2:
        raise HTTPException(status_code=422, detail="Your name is required")
    if len(credentials.password) < 8:
        raise HTTPException(
            status_code=422,
            detail="Password must be at least 8 characters",
        )
    if session.exec(select(user).where(user.email == email)).first():
        return VerificationStartResponse(
            message="If this address can be registered, a verification code will be sent",
            email=email,
        )

    code = f"{randbelow(1_000_000):06d}"
    pending_registration = session.exec(
        select(registration_verification).where(registration_verification.email == email)
    ).first()
    if not pending_registration:
        pending_registration = registration_verification(
            name=name,
            email=email,
            password_hash=hash_password(credentials.password),
            code_hash=hash_one_time_secret(code, "registration-code"),
            failed_attempts=0,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.verification_code_expire_minutes),
        )
    else:
        pending_registration.name = name
        pending_registration.password_hash = hash_password(credentials.password)
        pending_registration.code_hash = hash_one_time_secret(code, "registration-code")
        pending_registration.failed_attempts = 0
        pending_registration.expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.verification_code_expire_minutes)
        pending_registration.created_at = datetime.now(timezone.utc)

    session.add(pending_registration)
    session.commit()
    send_verification_email(email, code)
    return VerificationStartResponse(
        message="Verification code sent",
        email=email,
    )


@router.post("/resend-verification", response_model=MessageResponse, status_code=status.HTTP_202_ACCEPTED)
def resend_verification(
    payload: ResendVerificationRequest,
    request: Request,
    session: Session = Depends(get_session),
):
    email = validate_email(payload.email)
    enforce_rate_limit(
        session, request, "resend-verification", email,
        ip_limit=500,
        identity_limit=3,
        window_seconds=60,
        identity_window_seconds=3600,
    )
    response = MessageResponse(message="If a pending registration exists, a new code has been sent")
    pending_registration = session.exec(
        select(registration_verification).where(registration_verification.email == email)
    ).first()
    if not pending_registration:
        return response

    now = datetime.now(timezone.utc)
    cooldown_ends = _as_utc(pending_registration.created_at) + timedelta(seconds=60)
    if cooldown_ends > now:
        return response

    code = f"{randbelow(1_000_000):06d}"
    pending_registration.code_hash = hash_one_time_secret(code, "registration-code")
    pending_registration.failed_attempts = 0
    pending_registration.expires_at = now + timedelta(minutes=settings.verification_code_expire_minutes)
    pending_registration.created_at = now
    session.add(pending_registration)
    session.commit()
    send_verification_email(email, code)
    return response


@router.post("/verify-email", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def verify_email(
    payload: VerifyEmailRequest,
    request: Request,
    session: Session = Depends(get_session),
):
    email = validate_email(payload.email)
    enforce_rate_limit(
        session, request, "verify-email", email,
        ip_limit=500,
        identity_limit=10,
        window_seconds=60,
        identity_window_seconds=900,
    )
    pending_registration = session.exec(
        select(registration_verification).where(registration_verification.email == email)
    ).first()
    if not pending_registration:
        raise HTTPException(status_code=400, detail="No pending registration was found for this email")

    if _as_utc(pending_registration.expires_at) <= datetime.now(timezone.utc):
        session.delete(pending_registration)
        session.commit()
        raise HTTPException(status_code=400, detail="Verification code has expired")

    if pending_registration.failed_attempts >= settings.verification_code_max_attempts:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many incorrect codes. Request a new verification code.",
        )

    if not verify_one_time_secret(
        payload.code.strip(),
        pending_registration.code_hash,
        "registration-code",
    ):
        pending_registration.failed_attempts += 1
        session.add(pending_registration)
        session.commit()
        if pending_registration.failed_attempts >= settings.verification_code_max_attempts:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many incorrect codes. Request a new verification code.",
            )
        raise HTTPException(status_code=400, detail="Invalid verification code")

    if session.exec(select(user).where(user.email == email)).first():
        session.delete(pending_registration)
        session.commit()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists")

    account = user(
        name=pending_registration.name,
        email=pending_registration.email,
        password_hash=pending_registration.password_hash,
    )
    session.add(account)
    session.delete(pending_registration)
    session.commit()
    session.refresh(account)
    return create_auth_response(account, request_client_fingerprint(request))


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    session: Session = Depends(get_session),
):
    email = validate_email(payload.email)
    enforce_rate_limit(
        session, request, "forgot-password", email,
        ip_limit=500,
        identity_limit=5,
        window_seconds=60,
        identity_window_seconds=3600,
    )
    generic_response = MessageResponse(
        message="If an account with that email exists, a password reset link has been sent"
    )

    account = session.exec(select(user).where(user.email == email)).first()
    if not account:
        return generic_response

    pending_resets = session.exec(
        select(password_reset).where(password_reset.user_id == account.id, password_reset.used == False)  # noqa: E712
    ).all()
    for pending_reset in pending_resets:
        pending_reset.used = True
        session.add(pending_reset)

    token = token_urlsafe(32)
    reset_request = password_reset(
        user_id=account.id,
        token_hash=hash_one_time_secret(token, "password-reset"),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.password_reset_token_expire_minutes),
    )
    session.add(reset_request)
    session.commit()
    send_password_reset_email(email, token)
    return generic_response


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(
    payload: ResetPasswordRequest,
    request: Request,
    session: Session = Depends(get_session),
):
    email = validate_email(payload.email)
    enforce_rate_limit(
        session, request, "reset-password", email,
        ip_limit=500,
        identity_limit=10,
        window_seconds=60,
        identity_window_seconds=900,
    )
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters")

    account = session.exec(select(user).where(user.email == email)).first()
    if not account:
        raise HTTPException(status_code=400, detail="Invalid or expired password reset link")

    candidates = session.exec(
        select(password_reset)
        .where(password_reset.user_id == account.id, password_reset.used == False)  # noqa: E712
        .order_by(password_reset.created_at.desc())
    ).all()
    matching_reset = next(
        (
            candidate
            for candidate in candidates
            if verify_one_time_secret(
                payload.token,
                candidate.token_hash,
                "password-reset",
            )
        ),
        None,
    )
    if not matching_reset or matching_reset.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invalid or expired password reset link")

    account.password_hash = hash_password(payload.new_password)
    account.updated_at = datetime.now(timezone.utc)
    account.token_version += 1
    matching_reset.used = True
    session.add(account)
    session.add(matching_reset)
    session.commit()
    return MessageResponse(message="Password has been reset successfully")


@router.get("/me", response_model=UserResponse)
def me(account: user = Depends(get_current_user)):
    return serialize_user(account)
