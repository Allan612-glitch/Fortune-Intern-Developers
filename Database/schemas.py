
from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    name: str
    email: str


class ProfileResponse(BaseModel):
    id: str
    user_id: str
    bio: str | None = None
    profile_picture: str | None = None
    major: str | None = None
    graduation_year: int | None = None
    university: str | None = None
    course: str | None = None
    year_of_study: int | None = None
    skills: str | None = None
    phone_number: str | None = None
    location: str | None = None
    email_notifications: bool = True
    sms_notifications: bool = False
    opportunity_alerts: bool = True


class ProfileUpdateRequest(BaseModel):
    bio: str | None = None
    profile_picture: str | None = None
    major: str | None = None
    graduation_year: int | None = None
    university: str | None = None
    course: str | None = None
    year_of_study: int | None = None
    skills: str | None = None
    phone_number: str | None = None
    location: str | None = None
    email_notifications: bool = True
    sms_notifications: bool = False
    opportunity_alerts: bool = True


class ApplicationCreateRequest(BaseModel):
    program_name: str


class ApplicationResponse(BaseModel):
    id: str
    user_id: str
    program_id: str
    program_name: str
    status: str
    created_at: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse