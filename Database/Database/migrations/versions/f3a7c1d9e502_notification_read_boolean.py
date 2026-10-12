"""convert notifications.read to boolean

Revision ID: f3a7c1d9e502
Revises: b8c2d5e7f901
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f3a7c1d9e502"
down_revision: Union[str, Sequence[str], None] = "b8c2d5e7f901"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "notifications",
        "read",
        existing_type=sa.String(),
        type_=sa.Boolean(),
        existing_nullable=False,
        postgresql_using="lower(read) IN ('true', '1', 'yes')",
    )


def downgrade() -> None:
    op.alter_column(
        "notifications",
        "read",
        existing_type=sa.Boolean(),
        type_=sa.String(),
        existing_nullable=False,
        postgresql_using="CASE WHEN read THEN 'true' ELSE 'false' END",
    )
