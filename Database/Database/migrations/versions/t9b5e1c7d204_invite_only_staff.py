"""Add invite-only staff access."""
import sqlalchemy as sa
from alembic import op

revision = "t9b5e1c7d204"
down_revision = "s8a4d6f1c203"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("staff_role", sa.String(32), nullable=True))
    op.add_column("users", sa.Column("staff_status", sa.String(16), nullable=True))
    op.create_index("ix_users_staff_status", "users", ["staff_status"])
    op.create_table(
        "staff_invitations",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("email", sa.String(254), nullable=False, unique=True),
        sa.Column("role", sa.String(32), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=True, unique=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade():
    op.drop_table("staff_invitations")
    op.drop_index("ix_users_staff_status", table_name="users")
    op.drop_column("users", "staff_status")
    op.drop_column("users", "staff_role")
