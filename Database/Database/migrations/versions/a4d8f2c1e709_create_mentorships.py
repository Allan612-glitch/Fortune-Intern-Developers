"""create mentorship relationships

Revision ID: a4d8f2c1e709
Revises: 9c7e1a4b2d05
Create Date: 2026-09-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "a4d8f2c1e709"
down_revision: Union[str, Sequence[str], None] = "9c7e1a4b2d05"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "mentorships",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("mentee_id", sa.Uuid(), nullable=False),
        sa.Column("mentor_id", sa.Uuid(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["mentee_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["mentor_id"], ["mentors.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_mentorships_id"), "mentorships", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_mentorships_id"), table_name="mentorships")
    op.drop_table("mentorships")