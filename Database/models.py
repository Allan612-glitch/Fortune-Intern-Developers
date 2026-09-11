from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Uuid
from sqlmodel import Field, SQLModel
from uuid import UUID, uuid4
from datetime import datetime,timezone

#---------USER AND PROFILE MODELS---------#
class user(SQLModel, table=True):
    __tablename__ = "users"
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    name: str = Field(sa_column=Column("name", String, nullable=False))
    email: str = Field(sa_column=Column("email", String, unique=True, index=True))
    password_hash: str = Field(sa_column=Column("password_hash", String, nullable=False))
    is_admin: bool = Field(default=False, sa_column=Column("is_admin", Boolean, nullable=False, default=False))
    is_suspended: bool = Field(default=False, sa_column=Column("is_suspended", Boolean, nullable=False, default=False))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("created_at", DateTime(timezone=True), nullable=False))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("updated_at", DateTime(timezone=True), nullable=False))

class user_profile(SQLModel, table=True):
    __tablename__ = "user_profiles"
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    user_id: UUID = Field(sa_column=Column("user_id", Uuid, ForeignKey("users.id"), nullable=False))
    bio: str | None = Field(default=None, sa_column=Column("bio", String))
    profile_picture: str | None = Field(default=None, sa_column=Column("profile_picture", String))
    major: str | None = Field(default=None, sa_column=Column("major", String))
    graduation_year: int | None = Field(default=None, sa_column=Column("graduation_year", Integer))
    university: str | None = Field(default=None, sa_column=Column("university", String))
    course: str | None = Field(default=None, sa_column=Column("course", String))
    year_of_study: int | None = Field(default=None, sa_column=Column("year_of_study", Integer))
    skills: str | None = Field(default=None, sa_column=Column("skills", String))
    phone_number: str | None = Field(default=None, sa_column=Column("phone_number", String))
    location: str | None = Field(default=None, sa_column=Column("location", String))
    email_notifications: bool = Field(default=True, sa_column=Column("email_notifications", Boolean, nullable=False, default=True))
    sms_notifications: bool = Field(default=False, sa_column=Column("sms_notifications", Boolean, nullable=False, default=False))
    opportunity_alerts: bool = Field(default=True, sa_column=Column("opportunity_alerts", Boolean, nullable=False, default=True))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("created_at", DateTime(timezone=True), nullable=False))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("updated_at", DateTime(timezone=True), nullable=False))

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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("created_at", DateTime(timezone=True), nullable=False))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("updated_at", DateTime(timezone=True), nullable=False))

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
class course(SQLModel, table=True):
    __tablename__ = "courses"
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    name: str = Field(sa_column=Column("name", String, nullable=False))
    description: str = Field(sa_column=Column("description", String))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("created_at", DateTime(timezone=True), nullable=False))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("updated_at", DateTime(timezone=True), nullable=False))

class course_enrollment(SQLModel, table=True):
    __tablename__ = "course_enrollments"
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    user_id: UUID = Field(sa_column=Column("user_id", Uuid, ForeignKey("users.id"), nullable=False))
    course_id: UUID = Field(sa_column=Column("course_id", Uuid, ForeignKey("courses.id"), nullable=False))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("created_at", DateTime(timezone=True), nullable=False))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("updated_at", DateTime(timezone=True), nullable=False))

class milestone(SQLModel, table=True):
    __tablename__ = "milestones"
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    name: str = Field(sa_column=Column("name", String, nullable=False))
    description: str = Field(sa_column=Column("description", String))
    due_date: datetime = Field(sa_column=Column("due_date", DateTime(timezone=True), nullable=False))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("created_at", DateTime(timezone=True), nullable=False))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("updated_at", DateTime(timezone=True), nullable=False))

class user_milestone(SQLModel, table=True):
    __tablename__ = "user_milestones"
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    user_id: UUID = Field(sa_column=Column("user_id", Uuid, ForeignKey("users.id"), nullable=False))
    milestone_id: UUID = Field(sa_column=Column("milestone_id", Uuid, ForeignKey("milestones.id"), nullable=False))
    status: str = Field(sa_column=Column("status", String, nullable=False))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("created_at", DateTime(timezone=True), nullable=False))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("updated_at", DateTime(timezone=True), nullable=False))

#---------COMMUNICATION AND SUPPORT MODELS---------#
class message(SQLModel, table=True):
    __tablename__ = "messages"
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    sender_id: UUID = Field(sa_column=Column("sender_id", Uuid, ForeignKey("users.id"), nullable=False))
    receiver_id: UUID = Field(sa_column=Column("receiver_id", Uuid, ForeignKey("users.id"), nullable=False))
    content: str = Field(sa_column=Column("content", String, nullable=False))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("created_at", DateTime(timezone=True), nullable=False))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("updated_at", DateTime(timezone=True), nullable=False))

class mentor(SQLModel, table=True):
    __tablename__ = "mentors"
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    user_id: UUID = Field(sa_column=Column("user_id", Uuid, ForeignKey("users.id"), nullable=False))
    expertise: str = Field(sa_column=Column("expertise", String, nullable=False))
    is_approved: bool = Field(default=False, sa_column=Column("is_approved", Boolean, nullable=False, default=False))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("created_at", DateTime(timezone=True), nullable=False))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("updated_at", DateTime(timezone=True), nullable=False))

class support_ticket(SQLModel, table=True):
    __tablename__ = "support_tickets"
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    user_id: UUID = Field(sa_column=Column("user_id", Uuid, ForeignKey("users.id"), nullable=False))
    subject: str = Field(sa_column=Column("subject", String, nullable=False))
    description: str = Field(sa_column=Column("description", String, nullable=False))
    status: str = Field(sa_column=Column("status", String, nullable=False))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("created_at", DateTime(timezone=True), nullable=False))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("updated_at", DateTime(timezone=True), nullable=False))

class mentorship(SQLModel, table=True):
    __tablename__ = "mentorships"
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    mentee_id: UUID = Field(sa_column=Column("mentee_id", Uuid, ForeignKey("users.id"), nullable=False))
    mentor_id: UUID = Field(sa_column=Column("mentor_id", Uuid, ForeignKey("mentors.id"), nullable=False))
    status: str = Field(default="pending", sa_column=Column("status", String, nullable=False, default="pending"))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("created_at", DateTime(timezone=True), nullable=False))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("updated_at", DateTime(timezone=True), nullable=False))

class registration_verification(SQLModel, table=True):
    __tablename__ = "registration_verifications"
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    name: str = Field(sa_column=Column("name", String, nullable=False))
    email: str = Field(sa_column=Column("email", String, unique=True, index=True, nullable=False))
    password_hash: str = Field(sa_column=Column("password_hash", String, nullable=False))
    code_hash: str = Field(sa_column=Column("code_hash", String, nullable=False))
    expires_at: datetime = Field(sa_column=Column("expires_at", DateTime(timezone=True), nullable=False))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("created_at", DateTime(timezone=True), nullable=False))