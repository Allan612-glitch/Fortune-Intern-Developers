"""create chapter directory

Revision ID: s8a4d6f1c203
Revises: r7e2c8a9b301
Create Date: 2026-11-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "s8a4d6f1c203"
down_revision: Union[str, Sequence[str], None] = "r7e2c8a9b301"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "chapter_directory",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("chapters", sa.JSON(), nullable=False),
        sa.Column("executives", sa.JSON(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("chapter_directory")
