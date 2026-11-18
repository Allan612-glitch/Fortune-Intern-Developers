"""create chapter applications

Revision ID: r7e2c8a9b301
Revises: q6f3a9d1c805
Create Date: 2026-11-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "r7e2c8a9b301"
down_revision: Union[str, Sequence[str], None] = "q6f3a9d1c805"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "chapter_applications",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("chapter_id", sa.String(), nullable=False),
        sa.Column("chapter_name", sa.String(), nullable=False),
        sa.Column("position_title", sa.String(), nullable=False),
        sa.Column("motivation", sa.Text(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_chapter_applications_id",
        "chapter_applications",
        ["id"],
        unique=False,
    )
    op.create_index(
        "ix_chapter_applications_user_id",
        "chapter_applications",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "uq_chapter_applications_active_user_position",
        "chapter_applications",
        ["user_id", "chapter_id", "position_title"],
        unique=True,
        postgresql_where=sa.text("status IN ('pending', 'under_review', 'accepted')"),
        sqlite_where=sa.text("status IN ('pending', 'under_review', 'accepted')"),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_chapter_applications_active_user_position",
        table_name="chapter_applications",
    )
    op.drop_index("ix_chapter_applications_user_id", table_name="chapter_applications")
    op.drop_index("ix_chapter_applications_id", table_name="chapter_applications")
    op.drop_table("chapter_applications")
