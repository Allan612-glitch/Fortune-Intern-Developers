"""Create work and study registrations."""

from alembic import op
import sqlalchemy as sa

revision = "b1f7e4c9d205"
down_revision = "a8f0b4a7e154"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "work_study_registrations",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("applicant_name", sa.String(200), nullable=False),
        sa.Column("email", sa.String(254), nullable=False),
        sa.Column("date_of_birth", sa.Date(), nullable=False),
        sa.Column("phone", sa.String(40), nullable=False),
        sa.Column("institution", sa.String(200), nullable=False),
        sa.Column("chapter", sa.String(200), nullable=False),
        sa.Column("preferred_role", sa.String(32), nullable=False),
        sa.Column("availability", sa.String(32), nullable=False),
        sa.Column("weekly_hours", sa.String(16), nullable=False),
        sa.Column("consented_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_work_study_registrations_user_id", "work_study_registrations", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_work_study_registrations_user_id", table_name="work_study_registrations")
    op.drop_table("work_study_registrations")
