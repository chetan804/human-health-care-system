"""Preserve encrypted patient profile snapshots; backfill CURRENT versions only."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "patient_profile_versions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("patient_id", sa.Uuid(), sa.ForeignKey("patients.id"), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("encrypted_profile", postgresql.JSONB(), nullable=False),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.UniqueConstraint("patient_id", "version"),
        sa.CheckConstraint("version > 0"),
    )
    op.create_index(
        "ix_patient_profile_versions_patient_id", "patient_profile_versions", ["patient_id"]
    )
    op.execute(
        "INSERT INTO patient_profile_versions (id,patient_id,version,encrypted_profile,created_by) "
        "SELECT gen_random_uuid(),id,version,profile,updated_by FROM patients"
    )
    op.execute(
        "CREATE TRIGGER append_only BEFORE UPDATE OR DELETE OR TRUNCATE ON patient_profile_versions "
        "FOR EACH STATEMENT EXECUTE FUNCTION hcs_reject_mutation()"
    )


def downgrade():
    # Destructive history removal: permitted only in disposable tests, not a production rollback plan.
    op.drop_table("patient_profile_versions")
