"""Add student opportunity tools and visible application updates."""
import sqlalchemy as sa
from alembic import op

revision = "d8e3f5a2b901"
down_revision = "c4e1a6b8d902"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("programs", sa.Column("opportunity", sa.JSON(), nullable=True))
    op.add_column("user_profiles", sa.Column("career", sa.JSON(), nullable=True))
    op.add_column("applications", sa.Column("student_update", sa.JSON(), nullable=True))
    op.create_table(
        "student_opportunities",
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("program_id", sa.Uuid(), sa.ForeignKey("programs.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("saved", sa.Boolean(), nullable=False),
        sa.Column("remind", sa.Boolean(), nullable=False),
        sa.Column("draft", sa.JSON(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("student_opportunity_recency_idx", "student_opportunities", ["user_id", "updated_at", "program_id"])


def downgrade():
    op.drop_table("student_opportunities")
    op.drop_column("applications", "student_update")
    op.drop_column("user_profiles", "career")
    op.drop_column("programs", "opportunity")
