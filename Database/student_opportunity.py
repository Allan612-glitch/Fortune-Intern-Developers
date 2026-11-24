from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import Column, DateTime, Index, JSON
from sqlmodel import Field, SQLModel


class StudentOpportunity(SQLModel, table=True):
    __tablename__ = "student_opportunities"
    __table_args__ = (Index("student_opportunity_recency_idx", "user_id", "updated_at", "program_id"),)

    user_id: UUID = Field(foreign_key="users.id", primary_key=True, ondelete="CASCADE")
    program_id: UUID = Field(foreign_key="programs.id", primary_key=True, ondelete="CASCADE")
    saved: bool = False
    remind: bool = False
    draft: dict | None = Field(default=None, sa_column=Column(JSON, nullable=True))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc),
                                 sa_column=Column(DateTime(timezone=True), nullable=False))
