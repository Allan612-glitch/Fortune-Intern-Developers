"""add moderation flags

Revision ID: c8f1a2d3e405
Revises: b7e3c1a9d204
Create Date: 2026-09-11

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "c8f1a2d3e405"
down_revision: Union[str, Sequence[str], None] = "b7e3c1a9d204"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("is_suspended", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("mentors", sa.Column("is_approved", sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    op.drop_column("mentors", "is_approved")
    op.drop_column("users", "is_suspended")