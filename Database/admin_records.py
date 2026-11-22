from datetime import date, datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, Column, DateTime, Index, JSON, String, Text, text
from sqlmodel import Field, SQLModel


def now():
    return datetime.now(timezone.utc)


class FinanceRecord(SQLModel, table=True):
    __tablename__ = "finance_records"
    __table_args__ = (
        CheckConstraint("amount_minor > 0", name="finance_positive_amount"),
        CheckConstraint("kind IN ('payment', 'expense', 'invoice', 'income')", name="finance_record_kind"),
        Index("finance_kind_date_idx", "kind", "record_date", "id"),
    )
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    kind: str = Field(max_length=16)
    account_id: UUID | None = Field(default=None, index=True)
    recipient_name: str = Field(max_length=180)
    recipient_email: str = Field(max_length=254)
    description: str = Field(max_length=300)
    category: str = Field(max_length=60)
    amount_minor: int
    record_date: date
    reference: str | None = Field(default=None, sa_column=Column(String(100), unique=True))
    test_mode: bool = False
    line_items: list[dict] | None = Field(default=None, sa_column=Column(JSON, nullable=True))
    due_date: date | None = None
    external_reference: str | None = Field(default=None, max_length=100)
    created_at: datetime = Field(default_factory=now, sa_column=Column(DateTime(timezone=True), nullable=False))


class FinanceCategory(SQLModel, table=True):
    __tablename__ = "finance_categories"
    __table_args__ = (
        CheckConstraint("kind IN ('income', 'expense')", name="finance_category_kind"),
        Index("finance_category_default_idx", "kind", unique=True,
              postgresql_where=text("is_default"), sqlite_where=text("is_default")),
    )
    key: str = Field(primary_key=True, max_length=160)
    kind: str = Field(max_length=16)
    name: str = Field(max_length=60)
    is_default: bool = False


class SupportTicket(SQLModel, table=True):
    __tablename__ = "support_tickets"
    __table_args__ = (Index("support_status_update_idx", "status", "updated_at", "id"),)
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    account_id: UUID = Field(index=True)
    assignee_id: UUID | None = Field(default=None)
    title: str = Field(max_length=160)
    description: str = Field(sa_column=Column(Text, nullable=False))
    category: str = Field(max_length=24)
    priority: str = Field(max_length=12)
    due_date: date | None = Field(default=None, index=True)
    resolution: str | None = Field(default=None, max_length=2000)
    status: str = Field(default="open", max_length=16)
    created_at: datetime = Field(default_factory=now, sa_column=Column(DateTime(timezone=True), nullable=False))
    updated_at: datetime = Field(default_factory=now, sa_column=Column(DateTime(timezone=True), nullable=False))


class TicketUpdate(SQLModel, table=True):
    __tablename__ = "support_ticket_updates"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    ticket_id: UUID = Field(foreign_key="support_tickets.id", index=True)
    actor_id: UUID
    status: str = Field(max_length=16)
    note: str = Field(sa_column=Column(Text, nullable=False))
    created_at: datetime = Field(default_factory=now, sa_column=Column(DateTime(timezone=True), nullable=False))


class WorkspaceRole(SQLModel, table=True):
    __tablename__ = "workspace_roles"
    id: str = Field(primary_key=True, max_length=32)
    name: str = Field(max_length=80)
    permissions: list[str] = Field(sa_column=Column(JSON, nullable=False))
