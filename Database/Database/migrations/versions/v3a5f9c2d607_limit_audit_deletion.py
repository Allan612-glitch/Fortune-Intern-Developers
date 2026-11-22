"""Restrict ordinary audit deletion while preserving approved data lifecycle jobs."""
from alembic import op

revision = "v3a5f9c2d607"
down_revision = "u2f4e8b1c506"
branch_labels = None
depends_on = None


def upgrade():
    if op.get_bind().dialect.name == "postgresql":
        op.execute("""
            CREATE FUNCTION protect_audit_deletion() RETURNS trigger LANGUAGE plpgsql AS $$
            DECLARE scope text := current_setting('fortune.audit_retention_scope', true);
            BEGIN
                IF scope = 'account:' || OLD.actor_id::text
                    OR (OLD.object_type = 'application' AND scope = 'application:' || OLD.object_id) THEN
                    RETURN OLD;
                END IF;
                RAISE EXCEPTION 'Audit deletion requires an authorized retention operation';
            END; $$;
        """)
        op.execute("CREATE TRIGGER audit_retention_delete BEFORE DELETE ON audit_events FOR EACH ROW EXECUTE FUNCTION protect_audit_deletion()")


def downgrade():
    if op.get_bind().dialect.name == "postgresql":
        op.execute("DROP TRIGGER audit_retention_delete ON audit_events")
        op.execute("DROP FUNCTION protect_audit_deletion()")
