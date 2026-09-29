"""Authoritative relational entities. Migration snapshots, not create_all, manage schemas."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4
from sqlalchemy import (
    String,
    Text,
    Boolean,
    DateTime,
    Integer,
    Numeric,
    ForeignKey,
    UniqueConstraint,
    CheckConstraint,
    Index,
    ForeignKeyConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, ExcludeConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Entity:
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Organization(Entity, Base):
    __tablename__ = "organizations"
    name: Mapped[str] = mapped_column(String(160))


class Facility(Entity, Base):
    __tablename__ = "facilities"
    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    name: Mapped[str] = mapped_column(String(160))
    timezone: Mapped[str] = mapped_column(String(64), default="UTC")
    __table_args__ = (UniqueConstraint("id", "organization_id"),)


class User(Entity, Base):
    __tablename__ = "users"
    email: Mapped[str] = mapped_column(String(254), unique=True)
    display_name: Mapped[str] = mapped_column(String(120))
    password_hash: Mapped[str] = mapped_column(Text)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    verified: Mapped[bool] = mapped_column(Boolean, default=False)


class Role(Entity, Base):
    __tablename__ = "roles"
    name: Mapped[str] = mapped_column(String(40), unique=True)


class Membership(Entity, Base):
    __tablename__ = "user_roles"
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    facility_id: Mapped[UUID] = mapped_column(ForeignKey("facilities.id"), index=True)
    role: Mapped[str] = mapped_column(ForeignKey("roles.name"))
    __table_args__ = (UniqueConstraint("user_id", "facility_id", "role"),)


class Session(Entity, Base):
    __tablename__ = "sessions"
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    device: Mapped[str] = mapped_column(String(180))


class RefreshToken(Entity, Base):
    __tablename__ = "refresh_tokens"
    session_id: Mapped[UUID] = mapped_column(ForeignKey("sessions.id"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class LoginAttempt(Entity, Base):
    __tablename__ = "login_attempts"
    identity_hash: Mapped[str] = mapped_column(String(64), index=True)
    successful: Mapped[bool] = mapped_column(Boolean)


class Audit(Entity, Base):
    __tablename__ = "audit_logs"
    actor_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))
    facility_id: Mapped[UUID | None] = mapped_column(ForeignKey("facilities.id"), index=True)
    actor_roles: Mapped[list] = mapped_column(JSONB)
    action: Mapped[str] = mapped_column(String(100), index=True)
    resource_type: Mapped[str] = mapped_column(String(60))
    resource_id: Mapped[UUID | None]
    patient_id: Mapped[UUID | None]
    request_id: Mapped[str] = mapped_column(String(64), index=True)
    result: Mapped[str] = mapped_column(String(30), default="SUCCESS")
    reason: Mapped[str] = mapped_column(String(200), default="")
    ip: Mapped[str] = mapped_column(String(64), default="")
    user_agent: Mapped[str] = mapped_column(String(180), default="")
    __table_args__ = (Index("ix_audit_facility_time", "facility_id", "created_at"),)


class Patient(Entity, Base):
    __tablename__ = "patients"
    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"))
    facility_id: Mapped[UUID] = mapped_column(ForeignKey("facilities.id"), index=True)
    user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), unique=True)
    profile: Mapped[dict] = mapped_column(JSONB)
    duplicate_fingerprint: Mapped[str] = mapped_column(String(64), index=True)
    insurance_status: Mapped[str] = mapped_column(String(20), default="PENDING")
    version: Mapped[int] = mapped_column(Integer, default=1)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    updated_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    __table_args__ = (
        UniqueConstraint("id", "facility_id"),
        ForeignKeyConstraint(
            ["facility_id", "organization_id"], ["facilities.id", "facilities.organization_id"]
        ),
        CheckConstraint("version > 0"),
        CheckConstraint("insurance_status IN ('PENDING','NOT_PROVIDED')"),
    )


class CareAssignment(Entity, Base):
    __tablename__ = "care_assignments"
    patient_id: Mapped[UUID] = mapped_column(ForeignKey("patients.id"))
    clinician_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    __table_args__ = (UniqueConstraint("patient_id", "clinician_id"),)


class Consent(Entity, Base):
    __tablename__ = "patient_consents"
    patient_id: Mapped[UUID] = mapped_column(ForeignKey("patients.id"), index=True)
    consent_type: Mapped[str] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(20))
    purpose: Mapped[str] = mapped_column(String(300))
    version: Mapped[str] = mapped_column(String(40))
    granted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    __table_args__ = (CheckConstraint("status IN ('GRANTED','REVOKED')"),)


class Doctor(Entity, Base):
    __tablename__ = "doctors"
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), unique=True)
    specialty_label: Mapped[str] = mapped_column(String(100), default="Not specified")


class Availability(Entity, Base):
    __tablename__ = "doctor_availability"
    doctor_id: Mapped[UUID] = mapped_column(ForeignKey("doctors.id"), index=True)
    facility_id: Mapped[UUID] = mapped_column(ForeignKey("facilities.id"))
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    __table_args__ = (CheckConstraint("ends_at > starts_at"),)


class Appointment(Entity, Base):
    __tablename__ = "appointments"
    patient_id: Mapped[UUID] = mapped_column(ForeignKey("patients.id"), index=True)
    facility_id: Mapped[UUID] = mapped_column(ForeignKey("facilities.id"), index=True)
    doctor_id: Mapped[UUID] = mapped_column(ForeignKey("doctors.id"), index=True)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    appointment_type: Mapped[str] = mapped_column(String(30))
    status: Mapped[str] = mapped_column(String(30), default="SCHEDULED")
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    __table_args__ = (
        CheckConstraint("ends_at > starts_at"),
        CheckConstraint("version > 0"),
        CheckConstraint("status IN ('SCHEDULED','CANCELLED')"),
        CheckConstraint("appointment_type IN ('CONSULTATION','FOLLOW_UP')"),
        ForeignKeyConstraint(
            ["patient_id", "facility_id"], ["patients.id", "patients.facility_id"]
        ),
        ExcludeConstraint(
            ("doctor_id", "="),
            (func.tstzrange(starts_at, ends_at, "[)"), "&&"),
            where="status = 'SCHEDULED'",
            name="no_doctor_overlap",
            using="gist",
        ),
    )


class AppointmentHistory(Entity, Base):
    __tablename__ = "appointment_status_history"
    appointment_id: Mapped[UUID] = mapped_column(ForeignKey("appointments.id"), index=True)
    status: Mapped[str] = mapped_column(String(30))
    version: Mapped[int] = mapped_column(Integer)
    actor_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))


class MedicalRecord(Entity, Base):
    """Internal persistence primitive. Clinical authoring requires approved SOP schemas."""

    __tablename__ = "medical_records"
    patient_id: Mapped[UUID] = mapped_column(ForeignKey("patients.id"), index=True)
    record_type: Mapped[str] = mapped_column(String(30))
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    __table_args__ = (
        CheckConstraint("record_type IN ('DIAGNOSIS','PRESCRIPTION','LAB_RESULT','VISIT_NOTE')"),
        CheckConstraint("version > 0"),
    )


class RecordVersion(Entity, Base):
    __tablename__ = "medical_record_versions"
    record_id: Mapped[UUID] = mapped_column(ForeignKey("medical_records.id"), index=True)
    version: Mapped[int] = mapped_column(Integer)
    encrypted_payload: Mapped[dict] = mapped_column(JSONB)
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    __table_args__ = (UniqueConstraint("record_id", "version"), CheckConstraint("version > 0"))


class Invoice(Entity, Base):
    __tablename__ = "invoices"
    patient_id: Mapped[UUID] = mapped_column(ForeignKey("patients.id"), index=True)
    facility_id: Mapped[UUID] = mapped_column(ForeignKey("facilities.id"), index=True)
    source_reference: Mapped[str] = mapped_column(String(100))
    currency: Mapped[str] = mapped_column(String(3))
    total: Mapped[Decimal] = mapped_column(Numeric(20, 4))
    status: Mapped[str] = mapped_column(String(20), default="DRAFT")
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    __table_args__ = (
        UniqueConstraint("facility_id", "source_reference"),
        ForeignKeyConstraint(
            ["patient_id", "facility_id"], ["patients.id", "patients.facility_id"]
        ),
        CheckConstraint("total > 0"),
        CheckConstraint("status = 'DRAFT'"),
    )


class InvoiceItem(Entity, Base):
    __tablename__ = "invoice_items"
    invoice_id: Mapped[UUID] = mapped_column(ForeignKey("invoices.id"), index=True)
    service_reference: Mapped[str] = mapped_column(String(100))
    quantity: Mapped[int] = mapped_column(Integer)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(16, 4))
    __table_args__ = (
        UniqueConstraint("invoice_id", "service_reference"),
        CheckConstraint("quantity > 0"),
        CheckConstraint("unit_price > 0"),
    )


class Dispute(Entity, Base):
    __tablename__ = "billing_disputes"
    invoice_id: Mapped[UUID] = mapped_column(ForeignKey("invoices.id"), index=True)
    encrypted_reason: Mapped[dict] = mapped_column(JSONB)
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    status: Mapped[str] = mapped_column(String(20), default="OPEN")


class Idempotency(Entity, Base):
    __tablename__ = "idempotency_requests"
    actor_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    facility_id: Mapped[UUID] = mapped_column(ForeignKey("facilities.id"))
    operation: Mapped[str] = mapped_column(String(150))
    key: Mapped[str] = mapped_column(String(128))
    request_hash: Mapped[str] = mapped_column(String(64))
    response: Mapped[dict] = mapped_column(JSONB)
    resource_id: Mapped[UUID]
    __table_args__ = (UniqueConstraint("actor_id", "facility_id", "operation", "key"),)


class Outbox(Entity, Base):
    __tablename__ = "outbox_events"
    facility_id: Mapped[UUID] = mapped_column(ForeignKey("facilities.id"))
    recipient_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    event_key: Mapped[str] = mapped_column(String(200), unique=True)
    kind: Mapped[str] = mapped_column(String(60))
    resource_id: Mapped[UUID]
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)


class Notification(Entity, Base):
    __tablename__ = "notifications"
    outbox_id: Mapped[UUID] = mapped_column(ForeignKey("outbox_events.id"), unique=True)
    recipient_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    facility_id: Mapped[UUID] = mapped_column(ForeignKey("facilities.id"))
    kind: Mapped[str] = mapped_column(String(60))
    resource_id: Mapped[UUID]
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class DeliveryAttempt(Entity, Base):
    __tablename__ = "notification_delivery_attempts"
    outbox_id: Mapped[UUID] = mapped_column(ForeignKey("outbox_events.id"))
    channel: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(30), default="NOT_CONFIGURED")
    __table_args__ = (UniqueConstraint("outbox_id", "channel"),)
