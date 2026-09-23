from datetime import datetime, timedelta, timezone
from secrets import randbelow

from fastapi import APIRouter, Depends, HTTPException, status
import resend
from sqlmodel import Session, select

from Backend.api.deps import get_current_user
from Backend.core.config import settings
from Backend.core.security import create_access_token, hash_password, verify_password
from Backend.database import get_session
from Database.models import registration_verification, user
from Database.schemas import LoginRequest, RegisterRequest, TokenResponse, UserResponse, VerificationStartResponse, VerifyEmailRequest

router = APIRouter(prefix="/api/auth", tags=["authentication"])


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


@router.post("/register", response_model=VerificationStartResponse, status_code=status.HTTP_202_ACCEPTED)
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

    send_verification_email(email, code)
    session.add(pending_registration)
    session.commit()
    return VerificationStartResponse(
        message="Verification code sent",
        email=email,
    )


@router.post("/verify-email", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def verify_email(payload: VerifyEmailRequest, session: Session = Depends(get_session)):
    email = validate_email(payload.email)
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
    return TokenResponse(access_token=create_access_token(account.id), token_type="bearer", user=serialize_user(account))


@router.get("/me", response_model=UserResponse)
def me(account: user = Depends(get_current_user)):
    return serialize_user(account)
