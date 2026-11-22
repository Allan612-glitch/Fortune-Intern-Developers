from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Column, DateTime
from sqlmodel import Field, SQLModel

from Database.admin_records import now


class ApplicationMessage(SQLModel, table=True):
    __tablename__ = "application_messages"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    application_id: UUID = Field(foreign_key="applications.id", index=True, ondelete="CASCADE")
    template: str = Field(max_length=32)
    status: str = Field(default="queued", max_length=24, index=True)
    attempts: int = 0
    provider_id: str | None = Field(default=None, max_length=100)
    recipient_email: str = Field(max_length=254)
    created_at: datetime = Field(default_factory=now, sa_column=Column(DateTime(timezone=True), nullable=False))
