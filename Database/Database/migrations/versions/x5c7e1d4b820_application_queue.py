"""Add reviewer ownership, due dates and document requests."""
from alembic import op
import sqlalchemy as sa

revision = "x5c7e1d4b820"
down_revision = "w4b6e0d3a719"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("applications") as batch:
        batch.add_column(sa.Column("reviewer_id", sa.Uuid(), nullable=True))
        batch.add_column(sa.Column("review_due_date", sa.Date(), nullable=True))
        batch.add_column(sa.Column("document_request", sa.String(500), nullable=True))
        batch.create_foreign_key("fk_applications_reviewer", "users", ["reviewer_id"], ["id"], ondelete="SET NULL")
        batch.create_index("ix_applications_reviewer_id", ["reviewer_id"])
        batch.create_index("ix_applications_review_due_date", ["review_due_date"])
    op.add_column("application_status_history", sa.Column("reason", sa.String(40), nullable=True))


def downgrade():
    op.drop_column("application_status_history", "reason")
    with op.batch_alter_table("applications") as batch:
        batch.drop_index("ix_applications_review_due_date")
        batch.drop_index("ix_applications_reviewer_id")
        batch.drop_constraint("fk_applications_reviewer", type_="foreignkey")
        batch.drop_column("document_request")
        batch.drop_column("review_due_date")
        batch.drop_column("reviewer_id")
