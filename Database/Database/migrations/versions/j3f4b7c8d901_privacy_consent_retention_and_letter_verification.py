"""Add consent, retention, age, and letter verification records.

Revision ID: j3f4b7c8d901
Revises: h1d6a9c4e2f0
"""
from datetime import datetime
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "j3f4b7c8d901"
down_revision: Union[str, Sequence[str], None] = "h1d6a9c4e2f0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("terms_accepted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("privacy_accepted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "registration_verifications",
        sa.Column("terms_accepted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "registration_verifications",
        sa.Column("privacy_accepted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "programs",
        sa.Column("cycle_closed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "applications",
        sa.Column("date_of_birth", sa.Date(), nullable=True),
    )
    op.add_column(
        "applications",
        sa.Column("letter_reference", sa.String(), nullable=True),
    )
    op.create_index(
        "ix_applications_letter_reference",
        "applications",
        ["letter_reference"],
        unique=True,
    )

    connection = op.get_bind()
    existing_applications = connection.execute(
        sa.text("SELECT id, created_at FROM applications ORDER BY created_at, id")
    ).mappings()
    reference_counts: dict[int, int] = {}
    for existing in existing_applications:
        created_at = existing["created_at"]
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        year = created_at.year
        reference_counts[year] = reference_counts.get(year, 0) + 1
        connection.execute(
            sa.text(
                "UPDATE applications SET letter_reference = :reference WHERE id = :id"
            ),
            {
                "reference": f"FIN/{year}/{reference_counts[year]:04d}",
                "id": existing["id"],
            },
        )

    op.create_table(
        "consent_logs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("account_id", sa.Uuid(), nullable=False),
        sa.Column("consent_type", sa.String(), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("account_closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_consent_logs_id", "consent_logs", ["id"])
    op.create_index("ix_consent_logs_account_id", "consent_logs", ["account_id"])
    op.create_index("ix_consent_logs_expires_at", "consent_logs", ["expires_at"])


def downgrade() -> None:
    op.drop_index("ix_consent_logs_expires_at", table_name="consent_logs")
    op.drop_index("ix_consent_logs_account_id", table_name="consent_logs")
    op.drop_index("ix_consent_logs_id", table_name="consent_logs")
    op.drop_table("consent_logs")
    op.drop_index(
        "ix_applications_letter_reference",
        table_name="applications",
    )
    op.drop_column("applications", "letter_reference")
    op.drop_column("applications", "date_of_birth")
    op.drop_column("programs", "cycle_closed_at")
    op.drop_column("registration_verifications", "privacy_accepted_at")
    op.drop_column("registration_verifications", "terms_accepted_at")
    op.drop_column("users", "privacy_accepted_at")
    op.drop_column("users", "terms_accepted_at")
