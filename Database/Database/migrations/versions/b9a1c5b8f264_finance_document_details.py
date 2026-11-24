"""Add optional line items and payment details to finance documents."""
from alembic import op
import sqlalchemy as sa

revision = "b9a1c5b8f264"
down_revision = "a8f0b4a7e153"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("finance_records", sa.Column("line_items", sa.JSON(), nullable=True))
    op.add_column("finance_records", sa.Column("due_date", sa.Date(), nullable=True))
    op.add_column("finance_records", sa.Column("external_reference", sa.String(100), nullable=True))


def downgrade():
    op.drop_column("finance_records", "external_reference")
    op.drop_column("finance_records", "due_date")
    op.drop_column("finance_records", "line_items")
