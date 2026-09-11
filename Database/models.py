from sqlalchemy import Column, DateTime, ForeignKey, String, Uuid
from sqlmodel import Field, SQLModel
from uuid import UUID, uuid4
from datetime import datetime,timezone

class user(SQLModel, table=True):
    __tablename__ = "users"
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    name: str = Field(sa_column=Column("name", String, nullable=False))
    email: str = Field(sa_column=Column("email", String, unique=True, index=True))
    password_hash: str = Field(sa_column=Column("password_hash", String, nullable=False))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("created_at", DateTime(timezone=True), nullable=False))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("updated_at", DateTime(timezone=True), nullable=False))

class user_profile(SQLModel, table=True):
    __tablename__ = "user_profiles"
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    user_id: UUID = Field(sa_column=Column("user_id", Uuid, ForeignKey("users.id"), nullable=False))
    bio: str = Field(sa_column=Column("bio", String))
    profile_picture: str = Field(sa_column=Column("profile_picture", String))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("created_at", DateTime(timezone=True), nullable=False))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("updated_at", DateTime(timezone=True), nullable=False))

class program(SQLModel, table=True):
    __tablename__ = "programs"
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    name: str = Field(sa_column=Column("name", String, nullable=False))
    description: str = Field(sa_column=Column("description", String))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("created_at", DateTime(timezone=True), nullable=False))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column("updated_at", DateTime(timezone=True), nullable=False))

class application(SQLModel, table=True):
    __tablename__ = "applications"
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    user_id: UUID = Field(sa_column=Column("user_id", Uuid, ForeignKey("users.id"), nullable=False))
    program_id: UUID = Field(sa_column=Column("program_id", Uuid, ForeignKey("programs.id"), nullable=False))
    status: str = Field(sa_column=Column("status", String, nullable=False))
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
    read: bool = Field(sa_column=Column("read", String, nullable=False))
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