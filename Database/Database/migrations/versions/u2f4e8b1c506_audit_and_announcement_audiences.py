"""Structure audit evidence and categorize announcement audiences."""
from alembic import op
import sqlalchemy as sa

revision = "u2f4e8b1c506"
down_revision = "t9b5e1c7d204"
branch_labels = None
depends_on = None

EVIDENCE_COLUMNS = {
    "module": sa.String, "actor_name": sa.String, "actor_type": sa.String,
    "actor_role": sa.String, "correlation_id": sa.Uuid, "workflow_id": sa.String,
    "parent_id": sa.Uuid, "retry_of_id": sa.Uuid, "reversal_of_id": sa.Uuid, "details": sa.JSON,
}


def upgrade():
    for key, column_type in EVIDENCE_COLUMNS.items():
        op.add_column("audit_events", sa.Column(key, column_type()))
    for field in ("correlation_id", "workflow_id", "parent_id"):
        op.create_index("ix_audit_events_" + field, "audit_events", [field])
    op.create_index("ix_audit_entity", "audit_events", ["object_type", "object_id", "created_at"])
    op.create_index("ix_audit_time_id", "audit_events", ["created_at", "id"])
    op.add_column("announcements", sa.Column("category", sa.String(16), nullable=False, server_default="general"))
    op.add_column("announcements", sa.Column("audience", sa.String(24), nullable=False, server_default="all"))
    op.add_column("announcements", sa.Column("audience_label", sa.String()))
    op.execute("UPDATE announcements SET audience = 'university' WHERE target_university IS NOT NULL")
    if op.get_bind().dialect.name == "postgresql":
        op.execute("""
            CREATE FUNCTION protect_audit_history() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN
                IF TG_OP = 'UPDATE' THEN
                    IF pg_trigger_depth() > 1 AND NEW.actor_id IS NULL AND OLD.actor_id IS NOT NULL
                        AND (to_jsonb(NEW) - 'actor_id') = (to_jsonb(OLD) - 'actor_id') THEN
                        RETURN NEW;
                    END IF;
                END IF;
                RAISE EXCEPTION 'Audit records are append-only';
            END; $$;
        """)
        op.execute("CREATE TRIGGER audit_no_update BEFORE UPDATE ON audit_events FOR EACH ROW EXECUTE FUNCTION protect_audit_history()")
        op.execute("CREATE TRIGGER audit_no_truncate BEFORE TRUNCATE ON audit_events FOR EACH STATEMENT EXECUTE FUNCTION protect_audit_history()")


def downgrade():
    if op.get_bind().dialect.name == "postgresql":
        op.execute("DROP TRIGGER audit_no_update ON audit_events")
        op.execute("DROP TRIGGER audit_no_truncate ON audit_events")
        op.execute("DROP FUNCTION protect_audit_history()")
    for field in ("category", "audience", "audience_label"):
        op.drop_column("announcements", field)
    for index in ("ix_audit_time_id", "ix_audit_entity", *(f"ix_audit_events_{field}" for field in ("correlation_id", "workflow_id", "parent_id"))):
        op.drop_index(index, table_name="audit_events")
    for key in EVIDENCE_COLUMNS:
        op.drop_column("audit_events", key)
