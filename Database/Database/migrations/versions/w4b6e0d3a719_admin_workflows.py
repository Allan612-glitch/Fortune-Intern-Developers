"""Add finance records, support tickets, and workspace role definitions."""
from alembic import op
import sqlalchemy as sa

from Database.admin_records import FinanceRecord, SupportTicket, TicketUpdate, WorkspaceRole

revision = "w4b6e0d3a719"
down_revision = "v3a5f9c2d607"
branch_labels = None
depends_on = None

TABLES = (FinanceRecord, SupportTicket, TicketUpdate, WorkspaceRole)


def upgrade():
    for model in TABLES:
        if model is FinanceRecord:
            op.create_table(
                "finance_records",
                sa.Column("id", sa.Uuid(), primary_key=True),
                sa.Column("kind", sa.String(16), nullable=False),
                sa.Column("account_id", sa.Uuid(), nullable=True),
                sa.Column("recipient_name", sa.String(180), nullable=False),
                sa.Column("recipient_email", sa.String(254), nullable=False),
                sa.Column("description", sa.String(300), nullable=False),
                sa.Column("category", sa.String(60), nullable=False),
                sa.Column("amount_minor", sa.Integer(), nullable=False),
                sa.Column("record_date", sa.Date(), nullable=False),
                sa.Column("reference", sa.String(100), unique=True),
                sa.Column("test_mode", sa.Boolean(), nullable=False),
                sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
                sa.CheckConstraint("amount_minor > 0", name="finance_positive_amount"),
                sa.CheckConstraint("kind IN ('payment', 'expense', 'invoice')", name="finance_record_kind"),
            )
            op.create_index("ix_finance_records_account_id", "finance_records", ["account_id"])
            op.create_index("finance_kind_date_idx", "finance_records", ["kind", "record_date", "id"])
        elif model is SupportTicket:
            op.create_table(
                "support_tickets",
                sa.Column("id", sa.Uuid(), primary_key=True),
                sa.Column("account_id", sa.Uuid(), nullable=False),
                sa.Column("assignee_id", sa.Uuid(), nullable=True),
                sa.Column("title", sa.String(160), nullable=False),
                sa.Column("description", sa.Text(), nullable=False),
                sa.Column("category", sa.String(24), nullable=False),
                sa.Column("priority", sa.String(12), nullable=False),
                sa.Column("status", sa.String(16), nullable=False),
                sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
                sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            )
            op.create_index("ix_support_tickets_account_id", "support_tickets", ["account_id"])
            op.create_index("support_status_update_idx", "support_tickets", ["status", "updated_at", "id"])
        else:
            model.__table__.create(op.get_bind())


def downgrade():
    for model in reversed(TABLES):
        model.__table__.drop(op.get_bind())
