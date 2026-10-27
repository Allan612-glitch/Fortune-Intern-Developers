"""Add account deletion schedule.

Revision ID: h1d6a9c4e2f0
Revises: c3e8a1f6d209
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "h1d6a9c4e2f0"
down_revision: Union[str, Sequence[str], None] = "c3e8a1f6d209"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("deletion_requested_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_users_deletion_requested_at",
        "users",
        ["deletion_requested_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_users_deletion_requested_at", table_name="users")
    op.drop_column("users", "deletion_requested_at")
