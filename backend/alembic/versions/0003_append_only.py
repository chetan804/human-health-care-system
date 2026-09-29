"""Reference roles and append-only guards for audit, clinical versions and histories."""

from uuid import uuid5, NAMESPACE_URL
from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "2a742b75365c"
branch_labels = None
depends_on = None

TABLES = ("audit_logs", "medical_record_versions", "appointment_status_history", "patient_consents")
ROLES = (
    "PATIENT",
    "DOCTOR",
    "NURSE",
    "ADMIN",
    "BILLING_STAFF",
    "LAB_TECHNICIAN",
    "SYSTEM_AUDITOR",
    "SUPER_ADMIN",
)


def upgrade():
    table = sa.table("roles", sa.column("id", sa.Uuid()), sa.column("name", sa.String()))
    op.bulk_insert(
        table, [{"id": uuid5(NAMESPACE_URL, f"hcs:role:{name}"), "name": name} for name in ROLES]
    )
    op.execute("""CREATE FUNCTION hcs_reject_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN RAISE EXCEPTION 'append-only relation'; END; $$""")
    for table_name in TABLES:
        # Identifiers are closed migration constants, never request input.
        op.execute(
            f"CREATE TRIGGER append_only BEFORE UPDATE OR DELETE OR TRUNCATE ON {table_name} "
            "FOR EACH STATEMENT EXECUTE FUNCTION hcs_reject_mutation()"
        )


def downgrade():
    for table_name in TABLES:
        op.execute(f"DROP TRIGGER append_only ON {table_name}")
    op.execute("DROP FUNCTION hcs_reject_mutation()")
    # Roles retained until initial schema downgrade to avoid breaking existing memberships.
