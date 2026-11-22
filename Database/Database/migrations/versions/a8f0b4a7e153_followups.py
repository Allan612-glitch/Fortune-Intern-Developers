"""Add support due dates, public resolutions, and application email history."""
from alembic import op
import sqlalchemy as sa

from Database.followup_records import ApplicationMessage

revision = "a8f0b4a7e153"
down_revision = "z7e9a3f6d042"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("support_tickets", sa.Column("due_date", sa.Date(), nullable=True))
    op.add_column("support_tickets", sa.Column("resolution", sa.String(2000), nullable=True))
    op.create_index("ix_support_tickets_due_date", "support_tickets", ["due_date"])
    ApplicationMessage.__table__.create(op.get_bind())


def downgrade():
    ApplicationMessage.__table__.drop(op.get_bind())
    op.drop_index("ix_support_tickets_due_date", table_name="support_tickets")
    op.drop_column("support_tickets", "resolution")
    op.drop_column("support_tickets", "due_date")
