from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from secrets import randbelow
import smtplib

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from Backend.api.deps import get_current_user
from Backend.core.config import settings
from Backend.core.security import create_access_token, hash_password, verify_password
from Backend.database import get_session
from Database.models import registration_verification, user
from Database.schemas import LoginRequest, RegisterRequest, TokenResponse, UserResponse, VerificationStartResponse, VerifyEmailRequest

router = APIRouter(prefix="/api/auth", tags=["authentication"])


def send_verification_email(email: str, code: str) -> None:
    if not all((settings.smtp_host, settings.smtp_username, settings.smtp_password, settings.smtp_from)):
        raise HTTPException(status_code=503, detail="Email verification is not configured")
    message = EmailMessage()
    message["Subject"] = "Verify your Fortune Intern Network account"
    message["From"] = settings.smtp_from
    message["To"] = email
    message.set_content(f"Your Fortune Intern Network verification code is {code}. It expires in {settings.verification_code_expire_minutes} minutes.")
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
            server.starttls()
            server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(message)
    except (OSError, smtplib.SMTPException) as error:
        raise HTTPException(status_code=503, detail="Unable to send verification email") from error


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
def login(credentials: LoginRequest, session: Session = Depends(get_session)):
    email = validate_email(credentials.email)
    account = session.exec(select(user).where(user.email == email)).first()
    if not account or not verify_password(credentials.password, account.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    return TokenResponse(
        access_token=create_access_token(account.id),
        token_type="bearer",
        user=serialize_user(account),
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(credentials: RegisterRequest, session: Session = Depends(get_session)):
    email = validate_email(credentials.email)
    name = credentials.name.strip()
    if len(name) < 2:
        raise HTTPException(status_code=422, detail="Your name is required")
    if len(credentials.password) < 8:
        raise HTTPException(
            status_code=422,
            detail="Password must be at least 8 characters",
        )
    if session.exec(select(user).where(user.email == email)).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    account = user(name=name, email=email, password_hash=hash_password(credentials.password))
    session.add(account)
    session.commit()
    session.refresh(account)
    return TokenResponse(access_token=create_access_token(account.id), token_type="bearer", user=serialize_user(account))


# FUTURE EMAIL VERIFICATION:
# The pending registration model, SMTP sender, verification code generation,
# and /verify-email endpoint are intentionally disabled until email delivery
# is configured for the project.


@router.get("/me", response_model=UserResponse)
def me(account: user = Depends(get_current_user)):
    return serialize_user(account)
