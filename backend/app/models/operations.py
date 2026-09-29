"""Provider-independent account, governance and administration state."""

from datetime import datetime
from uuid import UUID
from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    CheckConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from backend.app.models.entities import Base, Entity


class IdentityChallenge(Entity, Base):
    __tablename__ = "identity_challenges"
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    purpose: Mapped[str] = mapped_column(String(20))
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    encrypted_delivery: Mapped[dict] = mapped_column(JSONB)
    delivery_status: Mapped[str] = mapped_column(String(30), default="NOT_CONFIGURED")
    __table_args__ = (CheckConstraint("purpose IN ('VERIFY','RESET')"),)


class MultiFactor(Entity, Base):
    __tablename__ = "multi_factors"
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), unique=True)
    encrypted_secret: Mapped[dict] = mapped_column(JSONB)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    last_counter: Mapped[int] = mapped_column(Integer, default=-1)
    recovery_hashes: Mapped[list] = mapped_column(JSONB, default=list)


class Department(Entity, Base):
    __tablename__ = "departments"
    facility_id: Mapped[UUID] = mapped_column(ForeignKey("facilities.id"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    __table_args__ = (UniqueConstraint("facility_id", "name"), CheckConstraint("version > 0"))


class StaffDepartment(Entity, Base):
    __tablename__ = "staff_departments"
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    department_id: Mapped[UUID] = mapped_column(ForeignKey("departments.id"))
    __table_args__ = (UniqueConstraint("user_id", "department_id"),)


class FacilityConfiguration(Entity, Base):
    __tablename__ = "facility_configuration"
    facility_id: Mapped[UUID] = mapped_column(ForeignKey("facilities.id"), unique=True)
    values: Mapped[dict] = mapped_column(JSONB)
    version: Mapped[int] = mapped_column(Integer, default=1)
    updated_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    __table_args__ = (CheckConstraint("version > 0"),)


class LegalHold(Entity, Base):
    __tablename__ = "legal_holds"
    patient_id: Mapped[UUID] = mapped_column(ForeignKey("patients.id"), index=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    __table_args__ = (CheckConstraint("version > 0"),)


class HoldEvent(Entity, Base):
    __tablename__ = "legal_hold_events"
    hold_id: Mapped[UUID] = mapped_column(ForeignKey("legal_holds.id"), index=True)
    version: Mapped[int] = mapped_column(Integer)
    active: Mapped[bool] = mapped_column(Boolean)
    encrypted_reason: Mapped[dict] = mapped_column(JSONB)
    actor_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    __table_args__ = (UniqueConstraint("hold_id", "version"),)


class NotificationPreference(Entity, Base):
    __tablename__ = "notification_preferences"
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    facility_id: Mapped[UUID] = mapped_column(ForeignKey("facilities.id"))
    email_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    sms_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    version: Mapped[int] = mapped_column(Integer, default=1)
    __table_args__ = (UniqueConstraint("user_id", "facility_id"), CheckConstraint("version > 0"))


class ExchangeJob(Entity, Base):
    __tablename__ = "exchange_jobs"
    facility_id: Mapped[UUID] = mapped_column(ForeignKey("facilities.id"), index=True)
    actor_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    session_id: Mapped[UUID] = mapped_column(ForeignKey("sessions.id"))
    kind: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(30), index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    encrypted_payload: Mapped[dict] = mapped_column(JSONB)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    error_code: Mapped[str | None] = mapped_column(String(60))
    __table_args__ = (
        CheckConstraint("kind IN ('IMPORT','EXPORT')"),
        CheckConstraint(
            "status IN ('PREVIEW','QUEUED','SUCCEEDED','FAILED','CANCELLED','EXPIRED')"
        ),
        CheckConstraint("version > 0"),
    )
