"""Add backend security controls and structured education.

Revision ID: e7f9a2c6b1d3
Revises: d1e8c2a7f604
Create Date: 2026-10-07
"""
from datetime import datetime, timezone
from typing import Sequence, Union
from uuid import UUID, uuid4

from alembic import op
import sqlalchemy as sa

revision: str = "e7f9a2c6b1d3"
down_revision: Union[str, Sequence[str], None] = "d1e8c2a7f604"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("token_version", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column("user_profiles", sa.Column("student_index_number", sa.String(), nullable=True))
    op.add_column("user_profiles", sa.Column("qualification_type", sa.String(), nullable=True))

    op.create_table(
        "education_records",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("institution", sa.String(), nullable=False),
        sa.Column("qualification", sa.String(), nullable=False),
        sa.Column("programme", sa.String(), nullable=False),
        sa.Column("start_year", sa.Integer(), nullable=True),
        sa.Column("end_year", sa.Integer(), nullable=True),
        sa.Column("is_current", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("cgpa", sa.Float(), nullable=True),
        sa.Column("cgpa_scale", sa.Float(), nullable=True),
        sa.Column("student_index_number", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_education_records_id", "education_records", ["id"])
    op.create_index("ix_education_records_user_id", "education_records", ["user_id"])

    op.create_table(
        "application_status_history",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("application_id", sa.Uuid(), nullable=False),
        sa.Column("actor_id", sa.Uuid(), nullable=True),
        sa.Column("previous_status", sa.String(), nullable=True),
        sa.Column("new_status", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["application_id"], ["applications.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_application_status_history_id", "application_status_history", ["id"])
    op.create_index(
        "ix_application_status_history_application_id",
        "application_status_history",
        ["application_id"],
    )
    connection = op.get_bind()
    existing_applications = connection.execute(
        sa.text("SELECT id, status, created_at FROM applications")
    ).mappings()
    status_history = sa.table(
        "application_status_history",
        sa.column("id", sa.Uuid()),
        sa.column("application_id", sa.Uuid()),
        sa.column("actor_id", sa.Uuid()),
        sa.column("previous_status", sa.String()),
        sa.column("new_status", sa.String()),
        sa.column("created_at", sa.DateTime(timezone=True)),
    )
    for existing in existing_applications:
        created_at = existing["created_at"]
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        connection.execute(
            status_history.insert().values(
                id=uuid4(),
                application_id=UUID(str(existing["id"])),
                actor_id=None,
                previous_status=None,
                new_status=existing["status"],
                created_at=created_at or datetime.now(timezone.utc),
            )
        )

    op.create_table(
        "audit_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("actor_id", sa.Uuid(), nullable=True),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("object_type", sa.String(), nullable=False),
        sa.Column("object_id", sa.String(), nullable=True),
        sa.Column("source_ip", sa.String(), nullable=True),
        sa.Column("result", sa.String(), nullable=False, server_default="success"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_audit_events_id", "audit_events", ["id"])
    op.create_index("ix_audit_events_actor_id", "audit_events", ["actor_id"])
    op.create_index("ix_audit_events_created_at", "audit_events", ["created_at"])

    op.create_table(
        "rate_limit_buckets",
        sa.Column("key", sa.String(), nullable=False),
        sa.Column("window_started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("count", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("key"),
    )


def downgrade() -> None:
    op.drop_table("rate_limit_buckets")
    op.drop_index("ix_audit_events_created_at", table_name="audit_events")
    op.drop_index("ix_audit_events_actor_id", table_name="audit_events")
    op.drop_index("ix_audit_events_id", table_name="audit_events")
    op.drop_table("audit_events")
    op.drop_index("ix_application_status_history_application_id", table_name="application_status_history")
    op.drop_index("ix_application_status_history_id", table_name="application_status_history")
    op.drop_table("application_status_history")
    op.drop_index("ix_education_records_user_id", table_name="education_records")
    op.drop_index("ix_education_records_id", table_name="education_records")
    op.drop_table("education_records")
    op.drop_column("user_profiles", "qualification_type")
    op.drop_column("user_profiles", "student_index_number")
    op.drop_column("users", "token_version")
