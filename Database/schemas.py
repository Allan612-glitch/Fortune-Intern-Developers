
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    email: str
    password: str


class GoogleLoginRequest(BaseModel):
    credential: str = Field(min_length=1, max_length=8192)


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class VerificationStartResponse(BaseModel):
    message: str
    email: str


class VerifyEmailRequest(BaseModel):
    email: str
    code: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    email: str
    token: str
    new_password: str


class ResendVerificationRequest(BaseModel):
    email: str


class MessageResponse(BaseModel):
    message: str


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    is_admin: bool = False


class AdminUserResponse(UserResponse):
    is_admin: bool
    is_suspended: bool


class ProfileExperience(BaseModel):
    role: str
    organization: str
    period: str
    description: str


class ProfileResponse(BaseModel):
    id: str
    user_id: str
    bio: str | None = None
    profile_picture: str | None = None
    student_index_number: str | None = None
    qualification_type: str | None = None
    major: str | None = None
    graduation_year: int | None = None
    university: str | None = None
    course: str | None = None
    year_of_study: int | None = None
    skills: str | None = None
    experience: list["ProfileExperience"] = Field(default_factory=list)
    cgpa: float | None = None
    cgpa_scale: float | None = None
    phone_number: str | None = None
    location: str | None = None
    email_notifications: bool = True
    sms_notifications: bool = False
    opportunity_alerts: bool = True


class ProfileUpdateRequest(BaseModel):
    bio: str | None = None
    profile_picture: str | None = None
    student_index_number: str | None = Field(default=None, max_length=100)
    qualification_type: str | None = Field(default=None, max_length=100)
    major: str | None = None
    graduation_year: int | None = None
    university: str | None = None
    course: str | None = None
    year_of_study: int | None = None
    skills: str | None = None
    experience: list["ProfileExperience"] | None = None
    cgpa: float | None = Field(default=None, ge=0)
    cgpa_scale: float | None = Field(default=None, gt=0)
    phone_number: str | None = None
    location: str | None = None
    email_notifications: bool = True
    sms_notifications: bool = False
    opportunity_alerts: bool = True


class EducationRecordCreateRequest(BaseModel):
    institution: str = Field(min_length=1, max_length=255)
    qualification: str = Field(min_length=1, max_length=100)
    programme: str = Field(min_length=1, max_length=255)
    start_year: int | None = Field(default=None, ge=1900, le=2100)
    end_year: int | None = Field(default=None, ge=1900, le=2100)
    is_current: bool = False
    cgpa: float | None = Field(default=None, ge=0)
    cgpa_scale: float | None = Field(default=None, gt=0)
    student_index_number: str | None = Field(default=None, max_length=100)


class EducationRecordUpdateRequest(BaseModel):
    institution: str | None = Field(default=None, min_length=1, max_length=255)
    qualification: str | None = Field(default=None, min_length=1, max_length=100)
    programme: str | None = Field(default=None, min_length=1, max_length=255)
    start_year: int | None = Field(default=None, ge=1900, le=2100)
    end_year: int | None = Field(default=None, ge=1900, le=2100)
    is_current: bool | None = None
    cgpa: float | None = Field(default=None, ge=0)
    cgpa_scale: float | None = Field(default=None, gt=0)
    student_index_number: str | None = Field(default=None, max_length=100)


class EducationRecordResponse(BaseModel):
    id: str
    institution: str
    qualification: str
    programme: str
    start_year: int | None = None
    end_year: int | None = None
    is_current: bool
    cgpa: float | None = None
    cgpa_scale: float | None = None
    student_index_number: str | None = None
    created_at: str
    updated_at: str


class ProfileDocumentResponse(BaseModel):
    id: str
    filename: str
    content_type: str | None = None
    file_size: int
    created_at: str


class ApplicationCreateRequest(BaseModel):
    program_name: str


class ProgramResponse(BaseModel):
    id: str
    name: str
    description: str
    company: str
    category: str
    status: str
    location: str
    duration: str
    skills: list[str]
    deadline: str | None = None


class AdminProgramCreateRequest(BaseModel):
    name: str
    description: str = ""
    company: str = "Fortune Intern Network"
    category: str = "Internship"
    status: str = "open"
    location: str = "Remote"
    duration: str = "3 months"
    skills: list[str] = []
    deadline: str | None = None


class AdminProgramUpdateRequest(AdminProgramCreateRequest):
    pass


class ApplicationResponse(BaseModel):
    id: str
    user_id: str
    program_id: str
    program_name: str
    status: str
    resume_filename: str | None = None
    applicant_name: str | None = None
    gender: str | None = None
    student_index_number: str | None = None
    year_of_study: str | None = None
    suggested_company: str | None = None
    applicant_institution: str | None = None
    applicant_course: str | None = None
    applicant_contact: str | None = None
    host_company_name: str | None = None
    host_company_address: str | None = None
    created_at: str


class ApplicationStatusHistoryResponse(BaseModel):
    previous_status: str | None = None
    new_status: str
    created_at: str


class AdminApplicationStatusRequest(BaseModel):
    status: str


class AnnouncementCreateRequest(BaseModel):
    title: str
    content: str


class AnnouncementResponse(BaseModel):
    id: str
    title: str
    content: str
    created_at: str


class DashboardApplication(BaseModel):
    id: str
    program_name: str
    status: str
    created_at: str


class DashboardResponse(BaseModel):
    profile_completion: int
    total_applications: int
    active_applications: int
    interviews: int
    accepted_applications: int
    rejected_applications: int
    open_programs: int
    next_deadline: str | None = None
    recent_applications: list[DashboardApplication]


class NotificationResponse(BaseModel):
    id: str
    message: str
    target_type: str | None = None
    target_id: str | None = None
    read: bool
    created_at: str


class NotificationPreferencesResponse(BaseModel):
    email_notifications: bool
    sms_notifications: bool
    opportunity_alerts: bool


class NotificationPreferencesUpdateRequest(BaseModel):
    email_notifications: bool = True
    sms_notifications: bool = False
    opportunity_alerts: bool = True


# class MentorCreateRequest(BaseModel):
#     expertise: str


# class MentorResponse(BaseModel):
#     id: str
#     user_id: str
#     name: str
#     expertise: str


# class MentorshipCreateRequest(BaseModel):
#     mentor_id: str


# class MentorshipResponse(BaseModel):
#     id: str
#     mentor_id: str
#     mentor_name: str
#     mentee_id: str
#     mentee_name: str | None = None
#     status: str
#     created_at: str


# class MentorshipDecisionRequest(BaseModel):
#     status: str


# class MentorMessageResponse(BaseModel):
#     id: str
#     sender_id: str
#     sender_name: str
#     content: str
#     created_at: str


# class MentorDashboardResponse(BaseModel):
#     pending_requests: list[MentorshipResponse]
#     messages: list[MentorMessageResponse]


# class MessageCreateRequest(BaseModel):
#     receiver_id: str
#     content: str


# class MessageResponse(BaseModel):
#     id: str
#     sender_id: str
#     receiver_id: str
#     content: str
#     created_at: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse