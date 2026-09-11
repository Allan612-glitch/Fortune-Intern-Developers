"""create registration verifications

Revision ID: e1f4a5b6c708
Revises: d9e2f3a4b506
Create Date: 2026-09-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "e1f4a5b6c708"
down_revision: Union[str, Sequence[str], None] = "d9e2f3a4b506"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "registration_verifications",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("code_hash", sa.String(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_registration_verifications_id", "registration_verifications", ["id"], unique=False)
    op.create_index("ix_registration_verifications_email", "registration_verifications", ["email"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_registration_verifications_email", table_name="registration_verifications")
    op.drop_index("ix_registration_verifications_id", table_name="registration_verifications")
    op.drop_table("registration_verifications")
