"""Model metadata is not approval. No inference artifacts or clinical models are bundled."""

from datetime import date
from uuid import UUID
from sqlalchemy import String, Text, Date, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from backend.app.models.entities import Base, Entity


class ModelVersion(Entity, Base):
    __tablename__ = "model_versions"
    model_id: Mapped[str] = mapped_column(String(100))
    version: Mapped[str] = mapped_column(String(100))
    dataset_identifier: Mapped[str] = mapped_column(String(200))
    training_date: Mapped[date] = mapped_column(Date)
    feature_schema: Mapped[list] = mapped_column(JSONB)
    evaluation_metrics: Mapped[dict] = mapped_column(JSONB)
    artifact_sha256: Mapped[str] = mapped_column(String(64))
    limitations: Mapped[str] = mapped_column(Text)
    intended_use: Mapped[str] = mapped_column(Text)
    contraindicated_use: Mapped[str] = mapped_column(Text)
    approval_status: Mapped[str] = mapped_column(String(30), default="DRAFT")
    deployment_status: Mapped[str] = mapped_column(String(30), default="NOT_DEPLOYED")
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    facility_id: Mapped[UUID] = mapped_column(ForeignKey("facilities.id"), index=True)
    __table_args__ = (
        UniqueConstraint("facility_id", "model_id", "version"),
        CheckConstraint("approval_status = 'DRAFT'"),
        CheckConstraint("deployment_status = 'NOT_DEPLOYED'"),
    )


class PredictionRequest(Entity, Base):
    __tablename__ = "ai_prediction_requests"
    patient_id: Mapped[UUID] = mapped_column(ForeignKey("patients.id"), index=True)
    requesting_user: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    request_id: Mapped[str] = mapped_column(String(64))
    encrypted_input: Mapped[dict] = mapped_column(JSONB)
    model_version_id: Mapped[UUID | None] = mapped_column(ForeignKey("model_versions.id"))
    status: Mapped[str] = mapped_column(String(30), default="NOT_CONFIGURED")
    __table_args__ = (CheckConstraint("status = 'NOT_CONFIGURED'"),)
