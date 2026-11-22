from datetime import date
from uuid import UUID

from sqlalchemy import CheckConstraint
from sqlmodel import Field, SQLModel


class InvoiceMatch(SQLModel, table=True):
    __tablename__ = "finance_invoice_matches"
    invoice_id: UUID = Field(primary_key=True, foreign_key="finance_records.id", ondelete="CASCADE")
    payment_id: UUID = Field(foreign_key="finance_records.id", unique=True, ondelete="CASCADE")


class RecordedRefund(SQLModel, table=True):
    __tablename__ = "finance_recorded_refunds"
    __table_args__ = (CheckConstraint("amount_minor > 0", name="finance_refund_positive_amount"),)

    id: str = Field(primary_key=True, max_length=32)
    payment_id: UUID = Field(foreign_key="finance_records.id", index=True, ondelete="CASCADE")
    amount_minor: int
    refunded_at: date
    test_mode: bool
