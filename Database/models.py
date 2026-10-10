from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, JSON, String, Uuid
from sqlmodel import Field, SQLModel
from uuid import UUID, uuid4
from datetime import datetime,timezone

#---------USER AND PROFILE MODELS---------#
class user(SQLModel, table=True):
    __tablename__ = "users"
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    name: str = Field(sa_column=Column("name", String, nullable=False))
    email: str = Field(sa_column=Column("email", String, unique=True, index=True))
    password_hash: str | None = Field(default=None, sa_column=Column("password_hash", String, nullable=True))
    google_sub: str | None = Field(default=None, sa_column=Column("google_sub", String, nullable=True, unique=True, index=True))
    is_admin: bool = Field(default=False, sa_column=Column("is_admin", Boolean, nullable=False, default=False))
    is_suspended: bool = Field(default=False, sa_column=Column("is_suspended", Boolean, nullable=False, default=False))
    token_version: int = Field(default=0, sa_column=Column("token_version", Integer, nullable=False, default=0))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("created_at", DateTime(timezone=True), nullable=False))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("updated_at", DateTime(timezone=True), nullable=False))

class user_profile(SQLModel, table=True):
    __tablename__ = "user_profiles"
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    user_id: UUID = Field(sa_column=Column("user_id", Uuid, ForeignKey("users.id"), nullable=False))
    bio: str | None = Field(default=None, sa_column=Column("bio", String))
    profile_picture: str | None = Field(default=None, sa_column=Column("profile_picture", String))
    student_index_number: str | None = Field(default=None, sa_column=Column("student_index_number", String))
    qualification_type: str | None = Field(default=None, sa_column=Column("qualification_type", String))
    major: str | None = Field(default=None, sa_column=Column("major", String))
    graduation_year: int | None = Field(default=None, sa_column=Column("graduation_year", Integer))
    university: str | None = Field(default=None, sa_column=Column("university", String))
    course: str | None = Field(default=None, sa_column=Column("course", String))
    year_of_study: int | None = Field(default=None, sa_column=Column("year_of_study", Integer))
    skills: str | None = Field(default=None, sa_column=Column("skills", String))
    experience: list[dict[str, str]] | None = Field(default=None, sa_column=Column("experience", JSON))
    cgpa: float | None = Field(default=None, sa_column=Column("cgpa", Float))
    cgpa_scale: float | None = Field(default=None, sa_column=Column("cgpa_scale", Float))
    phone_number: str | None = Field(default=None, sa_column=Column("phone_number", String))
    location: str | None = Field(default=None, sa_column=Column("location", String))
    email_notifications: bool = Field(default=True, sa_column=Column("email_notifications", Boolean, nullable=False, default=True))
    sms_notifications: bool = Field(default=False, sa_column=Column("sms_notifications", Boolean, nullable=False, default=False))
    opportunity_alerts: bool = Field(default=True, sa_column=Column("opportunity_alerts", Boolean, nullable=False, default=True))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("created_at", DateTime(timezone=True), nullable=False))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("updated_at", DateTime(timezone=True), nullable=False))

class profile_document(SQLModel, table=True):
    __tablename__ = "profile_documents"
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    user_id: UUID = Field(sa_column=Column("user_id", Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True))
    filename: str = Field(sa_column=Column("filename", String, nullable=False))
    storage_path: str = Field(sa_column=Column("storage_path", String, nullable=False))
    content_type: str | None = Field(default=None, sa_column=Column("content_type", String))
    file_size: int = Field(sa_column=Column("file_size", Integer, nullable=False))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("created_at", DateTime(timezone=True), nullable=False))

class program(SQLModel, table=True):
    __tablename__ = "programs"
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    name: str = Field(sa_column=Column("name", String, nullable=False))
    description: str = Field(sa_column=Column("description", String))
    company: str = Field(default="Fortune Intern Network", sa_column=Column("company", String, nullable=False, default="Fortune Intern Network"))
    category: str = Field(default="Internship", sa_column=Column("category", String, nullable=False, default="Internship"))
    status: str = Field(default="open", sa_column=Column("status", String, nullable=False, default="open"))
    location: str = Field(default="Remote", sa_column=Column("location", String, nullable=False, default="Remote"))
    duration: str = Field(default="3 months", sa_column=Column("duration", String, nullable=False, default="3 months"))
    skills: str | None = Field(default=None, sa_column=Column("skills", String))
    deadline: datetime | None = Field(default=None, sa_column=Column("deadline", DateTime(timezone=True)))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("created_at", DateTime(timezone=True), nullable=False))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("updated_at", DateTime(timezone=True), nullable=False))

class application(SQLModel, table=True):
    __tablename__ = "applications"
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    user_id: UUID = Field(sa_column=Column("user_id", Uuid, ForeignKey("users.id"), nullable=False))
    program_id: UUID = Field(sa_column=Column("program_id", Uuid, ForeignKey("programs.id"), nullable=False))
    status: str = Field(sa_column=Column("status", String, nullable=False))
    resume_filename: str | None = Field(default=None, sa_column=Column("resume_filename", String))
    resume_path: str | None = Field(default=None, sa_column=Column("resume_path", String))
    applicant_institution: str | None = Field(default=None, sa_column=Column("applicant_institution", String))
    applicant_course: str | None = Field(default=None, sa_column=Column("applicant_course", String))
    applicant_contact: str | None = Field(default=None, sa_column=Column("applicant_contact", String))
    host_company_name: str | None = Field(default=None, sa_column=Column("host_company_name", String))
    host_company_address: str | None = Field(default=None, sa_column=Column("host_company_address", String))
    applicant_name: str | None = Field(default=None, sa_column=Column("applicant_name", String))
    gender: str | None = Field(default=None, sa_column=Column("gender", String))
    student_index_number: str | None = Field(default=None, sa_column=Column("student_index_number", String))
    year_of_study: str | None = Field(default=None, sa_column=Column("year_of_study", String))
    suggested_company: str | None = Field(default=None, sa_column=Column("suggested_company", String))
    documents_sent: bool = Field(default=False, sa_column=Column("documents_sent", Boolean, nullable=False, default=False))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("created_at", DateTime(timezone=True), nullable=False))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("updated_at", DateTime(timezone=True), nullable=False))

class education_record(SQLModel, table=True):
    __tablename__ = "education_records"
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    user_id: UUID = Field(sa_column=Column("user_id", Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True))
    institution: str = Field(sa_column=Column("institution", String, nullable=False))
    qualification: str = Field(sa_column=Column("qualification", String, nullable=False))
    programme: str = Field(sa_column=Column("programme", String, nullable=False))
    start_year: int | None = Field(default=None, sa_column=Column("start_year", Integer))
    end_year: int | None = Field(default=None, sa_column=Column("end_year", Integer))
    is_current: bool = Field(default=False, sa_column=Column("is_current", Boolean, nullable=False, default=False))
    cgpa: float | None = Field(default=None, sa_column=Column("cgpa", Float))
    cgpa_scale: float | None = Field(default=None, sa_column=Column("cgpa_scale", Float))
    student_index_number: str | None = Field(default=None, sa_column=Column("student_index_number", String))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("created_at", DateTime(timezone=True), nullable=False))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("updated_at", DateTime(timezone=True), nullable=False))

class application_status_history(SQLModel, table=True):
    __tablename__ = "application_status_history"
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    application_id: UUID = Field(sa_column=Column("application_id", Uuid, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True))
    actor_id: UUID | None = Field(default=None, sa_column=Column("actor_id", Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True))
    previous_status: str | None = Field(default=None, sa_column=Column("previous_status", String))
    new_status: str = Field(sa_column=Column("new_status", String, nullable=False))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("created_at", DateTime(timezone=True), nullable=False))

class audit_event(SQLModel, table=True):
    __tablename__ = "audit_events"
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    actor_id: UUID | None = Field(default=None, sa_column=Column("actor_id", Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True))
    action: str = Field(sa_column=Column("action", String, nullable=False))
    object_type: str = Field(sa_column=Column("object_type", String, nullable=False))
    object_id: str | None = Field(default=None, sa_column=Column("object_id", String))
    source_ip: str | None = Field(default=None, sa_column=Column("source_ip", String))
    result: str = Field(default="success", sa_column=Column("result", String, nullable=False, default="success"))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("created_at", DateTime(timezone=True), nullable=False, index=True))

class rate_limit_bucket(SQLModel, table=True):
    __tablename__ = "rate_limit_buckets"
    key: str = Field(primary_key=True)
    window_started_at: datetime = Field(sa_column=Column("window_started_at", DateTime(timezone=True), nullable=False))
    count: int = Field(sa_column=Column("count", Integer, nullable=False))

class announcement(SQLModel, table=True):
    __tablename__ = "announcements"
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    title: str = Field(sa_column=Column("title", String, nullable=False))
    content: str = Field(sa_column=Column("content", String, nullable=False))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("created_at", DateTime(timezone=True), nullable=False))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("updated_at", DateTime(timezone=True), nullable=False))

class notification(SQLModel, table=True):
    __tablename__ = "notifications"
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    user_id: UUID = Field(sa_column=Column("user_id", Uuid, ForeignKey("users.id"), nullable=False))
    message: str = Field(sa_column=Column("message", String, nullable=False))
    target_type: str | None = Field(default=None, sa_column=Column("target_type", String))
    target_id: str | None = Field(default=None, sa_column=Column("target_id", String))
    read: bool = Field(default=False, sa_column=Column("read", String, nullable=False, default="false"))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("created_at", DateTime(timezone=True), nullable=False))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("updated_at", DateTime(timezone=True), nullable=False))

class user_settings(SQLModel, table=True):
    __tablename__ = "user_settings"
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    user_id: UUID = Field(sa_column=Column("user_id", Uuid, ForeignKey("users.id"), nullable=False))
    setting_name: str = Field(sa_column=Column("setting_name", String, nullable=False))
    setting_value: str = Field(sa_column=Column("setting_value", String, nullable=False))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("created_at", DateTime(timezone=True), nullable=False))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("updated_at", DateTime(timezone=True), nullable=False))

#---------COURSES AND MILESTONES MODELS---------#
# class course(SQLModel, table=True):
#     __tablename__ = "courses"
#     id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
#     name: str = Field(sa_column=Column("name", String, nullable=False))
#     description: str = Field(sa_column=Column("description", String))
#     created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("created_at", DateTime(timezone=True), nullable=False))
#     updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("updated_at", DateTime(timezone=True), nullable=False))

# class course_enrollment(SQLModel, table=True):
#     __tablename__ = "course_enrollments"
#     id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
#     user_id: UUID = Field(sa_column=Column("user_id", Uuid, ForeignKey("users.id"), nullable=False))
#     course_id: UUID = Field(sa_column=Column("course_id", Uuid, ForeignKey("courses.id"), nullable=False))
#     created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("created_at", DateTime(timezone=True), nullable=False))
#     updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("updated_at", DateTime(timezone=True), nullable=False))

# class milestone(SQLModel, table=True):
#     __tablename__ = "milestones"
#     id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
#     name: str = Field(sa_column=Column("name", String, nullable=False))
#     description: str = Field(sa_column=Column("description", String))
#     due_date: datetime = Field(sa_column=Column("due_date", DateTime(timezone=True), nullable=False))
#     created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("created_at", DateTime(timezone=True), nullable=False))
#     updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("updated_at", DateTime(timezone=True), nullable=False))

# class user_milestone(SQLModel, table=True):
#     __tablename__ = "user_milestones"
#     id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
#     user_id: UUID = Field(sa_column=Column("user_id", Uuid, ForeignKey("users.id"), nullable=False))
#     milestone_id: UUID = Field(sa_column=Column("milestone_id", Uuid, ForeignKey("milestones.id"), nullable=False))
#     status: str = Field(sa_column=Column("status", String, nullable=False))
#     created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("created_at", DateTime(timezone=True), nullable=False))
#     updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("updated_at", DateTime(timezone=True), nullable=False))

#---------COMMUNICATION AND SUPPORT MODELS---------#
# class message(SQLModel, table=True):
#     __tablename__ = "messages"
#     id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
#     sender_id: UUID = Field(sa_column=Column("sender_id", Uuid, ForeignKey("users.id"), nullable=False))
#     receiver_id: UUID = Field(sa_column=Column("receiver_id", Uuid, ForeignKey("users.id"), nullable=False))
#     content: str = Field(sa_column=Column("content", String, nullable=False))
#     created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("created_at", DateTime(timezone=True), nullable=False))
#     updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("updated_at", DateTime(timezone=True), nullable=False))

# class mentor(SQLModel, table=True):
#     __tablename__ = "mentors"
#     id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
#     user_id: UUID = Field(sa_column=Column("user_id", Uuid, ForeignKey("users.id"), nullable=False))
#     expertise: str = Field(sa_column=Column("expertise", String, nullable=False))
#     is_approved: bool = Field(default=False, sa_column=Column("is_approved", Boolean, nullable=False, default=False))
#     created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("created_at", DateTime(timezone=True), nullable=False))
#     updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("updated_at", DateTime(timezone=True), nullable=False))

# class support_ticket(SQLModel, table=True):
#     __tablename__ = "support_tickets"
#     id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
#     user_id: UUID = Field(sa_column=Column("user_id", Uuid, ForeignKey("users.id"), nullable=False))
#     subject: str = Field(sa_column=Column("subject", String, nullable=False))
#     description: str = Field(sa_column=Column("description", String, nullable=False))
#     status: str = Field(sa_column=Column("status", String, nullable=False))
#     created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("created_at", DateTime(timezone=True), nullable=False))
#     updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("updated_at", DateTime(timezone=True), nullable=False))

# class mentorship(SQLModel, table=True):
#     __tablename__ = "mentorships"
#     id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
#     mentee_id: UUID = Field(sa_column=Column("mentee_id", Uuid, ForeignKey("users.id"), nullable=False))
#     mentor_id: UUID = Field(sa_column=Column("mentor_id", Uuid, ForeignKey("mentors.id"), nullable=False))
#     status: str = Field(default="pending", sa_column=Column("status", String, nullable=False, default="pending"))
#     created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("created_at", DateTime(timezone=True), nullable=False))
#     updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("updated_at", DateTime(timezone=True), nullable=False))

class registration_verification(SQLModel, table=True):
    __tablename__ = "registration_verifications"
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    name: str = Field(sa_column=Column("name", String, nullable=False))
    email: str = Field(sa_column=Column("email", String, unique=True, index=True, nullable=False))
    password_hash: str = Field(sa_column=Column("password_hash", String, nullable=False))
    code_hash: str = Field(sa_column=Column("code_hash", String, nullable=False))
    failed_attempts: int = Field(default=0, sa_column=Column("failed_attempts", Integer, nullable=False, default=0, server_default="0"))
    expires_at: datetime = Field(sa_column=Column("expires_at", DateTime(timezone=True), nullable=False))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("created_at", DateTime(timezone=True), nullable=False))

class password_reset(SQLModel, table=True):
    __tablename__ = "password_resets"
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    user_id: UUID = Field(sa_column=Column("user_id", Uuid, ForeignKey("users.id"), nullable=False))
    token_hash: str = Field(sa_column=Column("token_hash", String, nullable=False))
    expires_at: datetime = Field(sa_column=Column("expires_at", DateTime(timezone=True), nullable=False))
    used: bool = Field(default=False, sa_column=Column("used", Boolean, nullable=False, default=False))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("created_at", DateTime(timezone=True), nullable=False))