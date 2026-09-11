from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from Backend.api.deps import get_current_user
from Backend.core.security import create_access_token, hash_password, verify_password
from Backend.database import get_session
from Database.models import user
from Database.schemas import LoginRequest, RegisterRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/api/auth", tags=["authentication"])


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


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
)
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
    return TokenResponse(
        access_token=create_access_token(account.id),
        token_type="bearer",
        user=serialize_user(account),
    )


@router.get("/me", response_model=UserResponse)
def me(account: user = Depends(get_current_user)):
    return serialize_user(account)
