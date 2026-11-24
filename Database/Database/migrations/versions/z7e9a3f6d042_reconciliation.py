"""Create records for invoice matches and confirmed provider refunds."""
from alembic import op
from Database.reconciliation_records import InvoiceMatch, RecordedRefund

revision = "z7e9a3f6d042"
down_revision = "y6d8f2e5c931"
branch_labels = None
depends_on = None


def upgrade():
    for record in (InvoiceMatch, RecordedRefund):
        record.__table__.create(op.get_bind())


def downgrade():
    for record in (RecordedRefund, InvoiceMatch):
        record.__table__.drop(op.get_bind())
