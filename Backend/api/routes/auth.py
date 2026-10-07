from datetime import datetime, timedelta, timezone
import logging
from secrets import randbelow, token_urlsafe

from fastapi import APIRouter, Depends, HTTPException, Request, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
import resend
from sqlmodel import Session, select

from Backend.api.deps import get_current_user
from Backend.core.config import settings
from Backend.core.security import create_access_token, hash_password, verify_password
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

    reset_link = f"{settings.frontend_url}/reset-password.html?email={email}&token={token}"
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
    enforce_rate_limit(
        session, request, "login", email,
        ip_limit=40, identity_limit=10, window_seconds=900,
    )
    account = session.exec(select(user).where(user.email == email)).first()
    if not account or not account.password_hash or not verify_password(credentials.password, account.password_hash):
        logger.warning(
            "login rejected",
            extra={
                "auth_action": "login",
                "source_ip": request.client.host if request.client else None,
            },
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if account.is_suspended:
        logger.warning(
            "suspended account login rejected",
            extra={
                "auth_action": "login",
                "source_ip": request.client.host if request.client else None,
            },
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account suspended")

    return TokenResponse(
        access_token=create_access_token(account.id, account.token_version),
        token_type="bearer",
        user=serialize_user(account),
    )


@router.post("/google", response_model=TokenResponse)
def google_login(
    payload: GoogleLoginRequest,
    request: Request,
    session: Session = Depends(get_session),
):
    enforce_rate_limit(
        session, request, "google-login", "google-login",
        ip_limit=30, identity_limit=30, window_seconds=900,
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
        ip_limit=60, identity_limit=10, window_seconds=900,
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
    return TokenResponse(
        access_token=create_access_token(account.id, account.token_version),
        token_type="bearer",
        user=serialize_user(account),
    )


@router.post("/register", response_model=VerificationStartResponse, status_code=status.HTTP_202_ACCEPTED)
def register(
    credentials: RegisterRequest,
    request: Request,
    session: Session = Depends(get_session),
):
    email = validate_email(credentials.email)
    enforce_rate_limit(
        session, request, "register", email,
        ip_limit=10, identity_limit=5, window_seconds=3600,
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
            code_hash=hash_password(code),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.verification_code_expire_minutes),
        )
    else:
        pending_registration.name = name
        pending_registration.password_hash = hash_password(credentials.password)
        pending_registration.code_hash = hash_password(code)
        pending_registration.expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.verification_code_expire_minutes)
        pending_registration.created_at = datetime.now(timezone.utc)

    send_verification_email(email, code)
    session.add(pending_registration)
    session.commit()
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
        ip_limit=20, identity_limit=3, window_seconds=3600,
    )
    response = MessageResponse(message="If a pending registration exists, a new code has been sent")
    pending_registration = session.exec(
        select(registration_verification).where(registration_verification.email == email)
    ).first()
    if not pending_registration:
        return response

    now = datetime.now(timezone.utc)
    cooldown_ends = pending_registration.created_at + timedelta(seconds=60)
    if cooldown_ends > now:
        return response

    code = f"{randbelow(1_000_000):06d}"
    pending_registration.code_hash = hash_password(code)
    pending_registration.expires_at = now + timedelta(minutes=settings.verification_code_expire_minutes)
    pending_registration.created_at = now
    send_verification_email(email, code)
    session.add(pending_registration)
    session.commit()
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
        ip_limit=30, identity_limit=10, window_seconds=900,
    )
    pending_registration = session.exec(
        select(registration_verification).where(registration_verification.email == email)
    ).first()
    if not pending_registration:
        raise HTTPException(status_code=400, detail="No pending registration was found for this email")

    if pending_registration.expires_at <= datetime.now(timezone.utc):
        session.delete(pending_registration)
        session.commit()
        raise HTTPException(status_code=400, detail="Verification code has expired")

    if not verify_password(payload.code.strip(), pending_registration.code_hash):
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
    return TokenResponse(
        access_token=create_access_token(account.id, account.token_version),
        token_type="bearer",
        user=serialize_user(account),
    )


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    session: Session = Depends(get_session),
):
    email = validate_email(payload.email)
    enforce_rate_limit(
        session, request, "forgot-password", email,
        ip_limit=20, identity_limit=5, window_seconds=3600,
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
        token_hash=hash_password(token),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.password_reset_token_expire_minutes),
    )
    session.add(reset_request)
    send_password_reset_email(email, token)
    session.commit()
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
        ip_limit=30, identity_limit=10, window_seconds=900,
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
        (candidate for candidate in candidates if verify_password(payload.token, candidate.token_hash)),
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
