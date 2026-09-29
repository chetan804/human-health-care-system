"""Model metadata and encrypted unavailable prediction requests."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "model_versions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("model_id", sa.String(100), nullable=False),
        sa.Column("version", sa.String(100), nullable=False),
        sa.Column("dataset_identifier", sa.String(200), nullable=False),
        sa.Column("training_date", sa.Date(), nullable=False),
        sa.Column("feature_schema", postgresql.JSONB(), nullable=False),
        sa.Column("evaluation_metrics", postgresql.JSONB(), nullable=False),
        sa.Column("artifact_sha256", sa.String(64), nullable=False),
        sa.Column("limitations", sa.Text(), nullable=False),
        sa.Column("intended_use", sa.Text(), nullable=False),
        sa.Column("contraindicated_use", sa.Text(), nullable=False),
        sa.Column("approval_status", sa.String(30), nullable=False),
        sa.Column("deployment_status", sa.String(30), nullable=False),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("facility_id", sa.Uuid(), sa.ForeignKey("facilities.id"), nullable=False),
        sa.UniqueConstraint("facility_id", "model_id", "version"),
        sa.CheckConstraint("approval_status = 'DRAFT'"),
        sa.CheckConstraint("deployment_status = 'NOT_DEPLOYED'"),
    )
    op.create_index("ix_model_versions_facility_id", "model_versions", ["facility_id"])
    op.create_table(
        "ai_prediction_requests",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("patient_id", sa.Uuid(), sa.ForeignKey("patients.id"), nullable=False),
        sa.Column("requesting_user", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("request_id", sa.String(64), nullable=False),
        sa.Column("encrypted_input", postgresql.JSONB(), nullable=False),
        sa.Column("model_version_id", sa.Uuid(), sa.ForeignKey("model_versions.id"), nullable=True),
        sa.Column("status", sa.String(30), nullable=False),
        sa.CheckConstraint("status = 'NOT_CONFIGURED'"),
    )
    op.create_index(
        "ix_ai_prediction_requests_patient_id", "ai_prediction_requests", ["patient_id"]
    )
    op.execute(
        "CREATE TRIGGER append_only BEFORE UPDATE OR DELETE OR TRUNCATE ON model_versions "
        "FOR EACH STATEMENT EXECUTE FUNCTION hcs_reject_mutation()"
    )


def downgrade():
    op.drop_table("ai_prediction_requests")
    op.drop_table("model_versions")
