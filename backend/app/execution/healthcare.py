"""Transaction-owning deterministic commands. API/orchestration never receive sessions."""

import hashlib
import hmac
import json
from datetime import timedelta
from uuid import UUID, uuid4
from fastapi.encoders import jsonable_encoder
from sqlalchemy import exists, and_
from backend.app.core.database import session_factory
from backend.app.core.config import settings
from backend.app.core.security import now, digest
from backend.app.core.encryption import cipher
from backend.app.core.errors import AppError, NotConfigured, missing, forbidden
from backend.app.models.entities import (
    Patient,
    CareAssignment,
    Audit,
    Idempotency,
    Outbox,
    Doctor,
    User,
    Membership,
    Availability,
    Appointment,
    AppointmentHistory,
    Invoice,
    InvoiceItem,
    Dispute,
    Consent,
    Notification,
    MedicalRecord,
    RecordVersion,
)
from backend.app.models.patient_history import PatientProfileVersion
from backend.app.models.operations import LegalHold
from backend.app.repositories.store import Store
from backend.app.schemas.contracts import PatientInput
from backend.app.services.policies import available_candidates, invoice_total


def audit(
    store,
    ctx,
    action,
    resource_type,
    resource_id=None,
    patient_id=None,
    result="SUCCESS",
    reason="Authorized workflow",
):
    store.add(
        Audit(
            actor_id=ctx.actor_id,
            facility_id=ctx.facility_id,
            actor_roles=list(ctx.roles),
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            patient_id=patient_id,
            request_id=ctx.request_id,
            result=result,
            reason=reason,
            ip=ctx.ip,
            user_agent=ctx.user_agent,
        )
    )


def denied(ctx, code):
    with session_factory().begin() as db:
        audit(Store(db), ctx, "access.denied", "request", result="DENIED", reason=code)


def patient_conditions(ctx, category="demographic"):
    conditions = [Patient.facility_id == ctx.facility_id, Patient.deleted_at.is_(None)]
    if category == "demographic" and "ADMIN" in ctx.roles:
        return conditions
    if category == "billing" and "BILLING_STAFF" in ctx.roles:
        return conditions
    if "PATIENT" in ctx.roles and not {"DOCTOR", "NURSE"}.intersection(ctx.roles):
        return [*conditions, Patient.user_id == ctx.actor_id]
    if category != "billing" and {"DOCTOR", "NURSE"}.intersection(ctx.roles):
        return [
            *conditions,
            exists().where(
                and_(
                    CareAssignment.patient_id == Patient.id,
                    CareAssignment.clinician_id == ctx.actor_id,
                    CareAssignment.active.is_(True),
                )
            ),
        ]
    forbidden()


def patient_access(store, ctx, patient_id, category="demographic", lock=False):
    patient = store.one(
        Patient, Patient.id == patient_id, *patient_conditions(ctx, category), lock=lock
    )
    if not patient:
        missing()
    return patient


def profile_context(patient):
    return f"patient:{patient.organization_id}:{patient.id}:profile:{patient.version}"


def patient_view(patient, ctx, full=False):
    profile = cipher().decrypt(patient.profile, profile_context(patient))
    base = {
        "id": str(patient.id),
        "full_name": profile["full_name"],
        "date_of_birth": profile["date_of_birth"],
        "gender": profile["gender"],
        "contact_number": profile["contact_number"],
        "email": profile["email"],
        "address": profile["address"],
        "version": patient.version,
        "insurance_status": patient.insurance_status,
        "created_at": patient.created_at,
    }
    # Intake operators never receive stored medical-history content through demographics.
    if full and "PATIENT" in ctx.roles and patient.user_id == ctx.actor_id:
        base.update(
            {k: profile.get(k) for k in ("medical_history", "emergency_contact", "insurance_id")}
        )
    return jsonable_encoder(base)


def fingerprint(data):
    raw = f"patient-duplicate:v1:{str(data.email).casefold()}:{data.date_of_birth.isoformat()}:{data.contact_number}"
    return hmac.new(
        settings().jwt_secret.get_secret_value().encode(), raw.encode(), hashlib.sha256
    ).hexdigest()


def replay(store, ctx, operation, key, payload):
    namespace = f"{ctx.facility_id}:{ctx.actor_id}:{operation}:{key}"
    store.advisory_lock(namespace)
    hashed = digest(json.dumps(jsonable_encoder(payload), sort_keys=True, separators=(",", ":")))
    found = store.one(
        Idempotency,
        Idempotency.actor_id == ctx.actor_id,
        Idempotency.facility_id == ctx.facility_id,
        Idempotency.operation == operation,
        Idempotency.key == key,
    )
    if found:
        if found.request_hash != hashed:
            raise AppError(
                "IDEMPOTENCY_CONFLICT", "Key was already used with a different request", 409
            )
        audit(store, ctx, "idempotency.replay", operation, found.resource_id)
        return cipher().decrypt(found.response, namespace), namespace, hashed
    return None, namespace, hashed


def remember(store, ctx, operation, key, namespace, hashed, resource_id, response):
    store.add(
        Idempotency(
            actor_id=ctx.actor_id,
            facility_id=ctx.facility_id,
            operation=operation,
            key=key,
            request_hash=hashed,
            resource_id=resource_id,
            response=cipher().encrypt(jsonable_encoder(response), namespace),
        )
    )


def event(store, ctx, kind, resource_id, recipient=None, suffix=""):
    store.add(
        Outbox(
            facility_id=ctx.facility_id,
            recipient_id=recipient or ctx.actor_id,
            kind=kind,
            resource_id=resource_id,
            event_key=f"{kind}:{resource_id}:{suffix}",
        )
    )


def create_patient(ctx, data, key):
    ctx.require("patient.write")
    with session_factory().begin() as db:
        store = Store(db)
        return create_patient_in_transaction(store, ctx, data, key)


def create_patient_in_transaction(store, ctx, data, key):
    """Shared intake invariant, also used by atomic approved import batches."""
    ctx.require("patient.write")
    previous, ns, hashed = replay(store, ctx, "patient.create", key, data.model_dump(mode="json"))
    if previous:
        patient_access(store, ctx, UUID(previous["id"]))
        return previous
    mark = fingerprint(data)
    store.advisory_lock(f"patient-duplicate:{ctx.facility_id}:{mark}")
    duplicate = store.one(
        Patient,
        Patient.facility_id == ctx.facility_id,
        Patient.duplicate_fingerprint == mark,
        Patient.deleted_at.is_(None),
    )
    if duplicate and not data.duplicate_review_reason:
        raise AppError(
            "DUPLICATE_REVIEW_REQUIRED",
            "Possible duplicate requires authorized human review",
            409,
        )
    identifier = uuid4()
    patient = Patient(
        id=identifier,
        organization_id=ctx.organization_id,
        facility_id=ctx.facility_id,
        version=1,
        duplicate_fingerprint=mark,
        insurance_status="PENDING" if data.insurance_id else "NOT_PROVIDED",
        created_by=ctx.actor_id,
        updated_by=ctx.actor_id,
    )
    patient.profile = cipher().encrypt(data.model_dump(mode="json"), profile_context(patient))
    store.add(patient)
    store.add(
        PatientProfileVersion(
            patient_id=patient.id,
            version=patient.version,
            encrypted_profile=patient.profile,
            created_by=ctx.actor_id,
        )
    )
    audit(
        store,
        ctx,
        "patient.create",
        "patient",
        patient.id,
        patient.id,
        reason="Duplicate reviewed" if duplicate else "Validated registration",
    )
    event(store, ctx, "patient.registered", patient.id)
    response = patient_view(patient, ctx)
    remember(store, ctx, "patient.create", key, ns, hashed, patient.id, response)
    return response


def list_patients(ctx, page, page_size, patient_id=None):
    ctx.require("patient.read")
    with session_factory().begin() as db:
        store = Store(db)
        conditions = patient_conditions(ctx)
        if patient_id:
            conditions.append(Patient.id == patient_id)
        patients = store.list(Patient, *conditions, limit=page_size, offset=(page - 1) * page_size)
        for patient in patients:
            audit(store, ctx, "patient.read", "patient", patient.id, patient.id)
        return {
            "items": [patient_view(p, ctx) for p in patients],
            "total": store.count(Patient, *conditions),
            "page": page,
            "page_size": page_size,
        }


def get_patient(ctx, identifier):
    ctx.require("patient.read")
    with session_factory().begin() as db:
        store = Store(db)
        patient = patient_access(store, ctx, identifier)
        audit(store, ctx, "patient.read", "patient", patient.id, patient.id)
        return patient_view(patient, ctx, full=True)


def update_patient(ctx, identifier, data, partial=False):
    ctx.require("patient.write")
    with session_factory().begin() as db:
        store = Store(db)
        patient = patient_access(store, ctx, identifier, lock=True)
        if patient.version != data.expected_version:
            raise AppError("VERSION_CONFLICT", "Patient was modified; reload before saving", 409)
        old = cipher().decrypt(patient.profile, profile_context(patient))
        changes = data.model_dump(mode="json", exclude={"expected_version"}, exclude_unset=partial)
        validated = PatientInput.model_validate({**old, **changes} if partial else changes)
        mark = fingerprint(validated)
        store.advisory_lock(f"patient-duplicate:{ctx.facility_id}:{mark}")
        duplicate = store.one(
            Patient,
            Patient.facility_id == ctx.facility_id,
            Patient.id != patient.id,
            Patient.duplicate_fingerprint == mark,
            Patient.deleted_at.is_(None),
        )
        if duplicate and not validated.duplicate_review_reason:
            raise AppError(
                "DUPLICATE_REVIEW_REQUIRED",
                "Possible duplicate requires authorized human review",
                409,
            )
        patient.version += 1
        patient.profile = cipher().encrypt(
            validated.model_dump(mode="json"), profile_context(patient)
        )
        patient.duplicate_fingerprint, patient.updated_by = mark, ctx.actor_id
        patient.insurance_status = "PENDING" if validated.insurance_id else "NOT_PROVIDED"
        store.add(
            PatientProfileVersion(
                patient_id=patient.id,
                version=patient.version,
                encrypted_profile=patient.profile,
                created_by=ctx.actor_id,
            )
        )
        audit(store, ctx, "patient.update", "patient", patient.id, patient.id)
        return patient_view(patient, ctx)


def delete_patient(ctx, identifier, expected_version):
    ctx.require("patient.write")
    with session_factory().begin() as db:
        store = Store(db)
        patient = patient_access(store, ctx, identifier, lock=True)
        if patient.version != expected_version:
            raise AppError("VERSION_CONFLICT", "Patient was modified", 409)
        if store.one(LegalHold, LegalHold.patient_id == identifier, LegalHold.active.is_(True)):
            raise AppError("LEGAL_HOLD", "An active hold prevents archival", 409)
        if store.one(
            Appointment,
            Appointment.patient_id == identifier,
            Appointment.status == "SCHEDULED",
            Appointment.ends_at > now(),
        ):
            raise AppError(
                "ACTIVE_APPOINTMENTS", "Cancel future appointments before archiving", 409
            )
        patient.deleted_at, patient.updated_by = now(), ctx.actor_id
        audit(store, ctx, "patient.archive", "patient", patient.id, patient.id)
        return {"id": str(identifier), "status": "ARCHIVED", "clinical_data_deleted": False}


def assign_patient(ctx, identifier, data):
    ctx.require("assignment.write")
    with session_factory().begin() as db:
        store = Store(db)
        patient = patient_access(store, ctx, identifier)
        membership = store.one(
            Membership,
            Membership.user_id == data.clinician_id,
            Membership.facility_id == ctx.facility_id,
            Membership.role.in_(["DOCTOR", "NURSE"]),
        )
        if not membership:
            missing()
        store.advisory_lock(f"assignment:{identifier}:{data.clinician_id}")
        assignment = store.one(
            CareAssignment,
            CareAssignment.patient_id == identifier,
            CareAssignment.clinician_id == data.clinician_id,
        )
        if assignment:
            assignment.active = data.active
        else:
            store.add(
                CareAssignment(
                    patient_id=identifier, clinician_id=data.clinician_id, active=data.active
                )
            )
        audit(store, ctx, "patient.assignment", "patient", patient.id, patient.id)
        return {
            "patient_id": str(identifier),
            "clinician_id": str(data.clinician_id),
            "active": data.active,
        }


def consents(ctx, identifier, data=None, key=None):
    ctx.require("consent.write" if data else "patient.read")
    with session_factory().begin() as db:
        store = Store(db)
        patient = patient_access(store, ctx, identifier)
        if data:
            if patient.user_id != ctx.actor_id:
                forbidden()
            operation = f"consent:{identifier}"
            previous, ns, hashed = replay(store, ctx, operation, key, data.model_dump())
            if previous:
                return previous
            consent = store.add(
                Consent(
                    patient_id=identifier,
                    **data.model_dump(),
                    created_by=ctx.actor_id,
                    granted_at=now() if data.status == "GRANTED" else None,
                    revoked_at=now() if data.status == "REVOKED" else None,
                )
            )
            response = {"id": str(consent.id), "status": consent.status}
            remember(store, ctx, operation, key, ns, hashed, consent.id, response)
            audit(store, ctx, "consent.record", "consent", consent.id, patient.id)
            return response
        audit(store, ctx, "consent.read", "patient", patient.id, patient.id)
        return {
            "items": [
                {
                    "id": str(c.id),
                    "consent_type": c.consent_type,
                    "purpose": c.purpose,
                    "status": c.status,
                    "version": c.version,
                    "granted_at": c.granted_at,
                    "revoked_at": c.revoked_at,
                }
                for c in store.list(Consent, Consent.patient_id == identifier, limit=100)
            ],
            "notice": "Consent statements do not automatically authorize clinical access",
        }


def doctor_access(store, ctx, identifier):
    doctor = store.get(Doctor, identifier)
    if not doctor or not store.one(
        Membership,
        Membership.user_id == doctor.user_id,
        Membership.facility_id == ctx.facility_id,
        Membership.role == "DOCTOR",
    ):
        missing()
    return doctor


def doctors(ctx):
    ctx.require("schedule.read")
    with session_factory().begin() as db:
        store = Store(db)
        scoped = exists().where(
            and_(
                Membership.user_id == Doctor.user_id,
                Membership.facility_id == ctx.facility_id,
                Membership.role == "DOCTOR",
            )
        )
        return {
            "items": [
                {
                    "id": str(d.id),
                    "name": store.get(User, d.user_id).display_name,
                    "specialty": d.specialty_label,
                }
                for d in store.list(Doctor, scoped, limit=100)
            ]
        }


def availability(ctx, identifier, data=None):
    ctx.require("availability.write" if data else "schedule.read")
    with session_factory().begin() as db:
        store = Store(db)
        doctor_access(store, ctx, identifier)
        if data:
            if data.starts_at < now() or data.ends_at - data.starts_at > timedelta(days=1):
                raise AppError(
                    "VALIDATION_ERROR", "Availability must be a future window up to one day", 422
                )
            window = store.add(
                Availability(doctor_id=identifier, facility_id=ctx.facility_id, **data.model_dump())
            )
            audit(store, ctx, "availability.create", "doctor", identifier)
            return {"id": str(window.id), **data.model_dump(mode="json")}
        return {
            "items": [
                {"id": str(a.id), "starts_at": a.starts_at, "ends_at": a.ends_at}
                for a in store.list(
                    Availability,
                    Availability.doctor_id == identifier,
                    Availability.facility_id == ctx.facility_id,
                    Availability.ends_at > now(),
                    limit=100,
                    order=Availability.starts_at,
                )
            ]
        }


def slot_options(store, ctx, doctor_id, start, duration, exclude=None):
    windows = store.list(
        Availability,
        Availability.doctor_id == doctor_id,
        Availability.facility_id == ctx.facility_id,
        Availability.ends_at >= start - timedelta(hours=2),
        Availability.starts_at <= start + timedelta(hours=2) + duration,
        limit=1000,
    )
    conditions = [
        Appointment.doctor_id == doctor_id,
        Appointment.status == "SCHEDULED",
        Appointment.ends_at > start - timedelta(hours=2),
        Appointment.starts_at < start + timedelta(hours=2) + duration,
    ]
    if exclude:
        conditions.append(Appointment.id != exclude)
    bookings = store.list(Appointment, *conditions, limit=1000)
    return available_candidates(
        [(w.starts_at, w.ends_at) for w in windows],
        [(a.starts_at, a.ends_at) for a in bookings],
        start,
        duration,
        now(),
    )


def slots(ctx, doctor_id, start, minutes):
    ctx.require("schedule.read")
    with session_factory().begin() as db:
        store = Store(db)
        doctor_access(store, ctx, doctor_id)
        return {
            "items": slot_options(store, ctx, doctor_id, start, timedelta(minutes=minutes)),
            "window_minutes": 120,
            "search_grid_minutes": 15,
        }


def appointment_view(appointment):
    return jsonable_encoder(
        {
            key: getattr(appointment, key)
            for key in (
                "id",
                "patient_id",
                "doctor_id",
                "starts_at",
                "ends_at",
                "appointment_type",
                "status",
                "version",
            )
        }
    )


def check_slot(store, ctx, doctor_id, start, end, exclude=None):
    if start <= now() or end <= start or end - start > timedelta(hours=4):
        raise AppError(
            "VALIDATION_ERROR", "Appointment must be a future window up to four hours", 422
        )
    # Per-doctor lock avoids precheck races and permits deterministic alternatives; DB exclusion is final defense.
    store.advisory_lock(f"doctor-schedule:{doctor_id}")
    fits = store.one(
        Availability,
        Availability.doctor_id == doctor_id,
        Availability.facility_id == ctx.facility_id,
        Availability.starts_at <= start,
        Availability.ends_at >= end,
    )
    conditions = [
        Appointment.doctor_id == doctor_id,
        Appointment.status == "SCHEDULED",
        Appointment.starts_at < end,
        Appointment.ends_at > start,
    ]
    if exclude:
        conditions.append(Appointment.id != exclude)
    if not fits or store.one(Appointment, *conditions):
        raise AppError(
            "SLOT_CONFLICT",
            "Requested time is unavailable",
            409,
            {"alternatives": slot_options(store, ctx, doctor_id, start, end - start, exclude)},
        )


def create_appointment(ctx, data, key):
    ctx.require("schedule.write")
    with session_factory().begin() as db:
        store = Store(db)
        patient = patient_access(store, ctx, data.patient_id, lock=True)
        doctor = doctor_access(store, ctx, data.doctor_id)
        if "DOCTOR" in ctx.roles and "ADMIN" not in ctx.roles and doctor.user_id != ctx.actor_id:
            forbidden()
        if data.appointment_type == "EMERGENCY":
            raise NotConfigured("approved emergency triage workflow")
        previous, ns, hashed = replay(
            store, ctx, "appointment.create", key, data.model_dump(mode="json")
        )
        if previous:
            return previous
        check_slot(store, ctx, data.doctor_id, data.starts_at, data.ends_at)
        appointment = store.add(
            Appointment(facility_id=ctx.facility_id, created_by=ctx.actor_id, **data.model_dump())
        )
        store.add(
            AppointmentHistory(
                appointment_id=appointment.id,
                status=appointment.status,
                version=1,
                actor_id=ctx.actor_id,
            )
        )
        audit(store, ctx, "appointment.create", "appointment", appointment.id, patient.id)
        event(store, ctx, "appointment.confirmed", appointment.id, patient.user_id, "1")
        response = appointment_view(appointment)
        remember(store, ctx, "appointment.create", key, ns, hashed, appointment.id, response)
        return response


def appointment_access(store, ctx, identifier, lock=False):
    appointment = store.one(
        Appointment,
        Appointment.id == identifier,
        Appointment.facility_id == ctx.facility_id,
        lock=lock,
    )
    if not appointment:
        missing()
    patient = patient_access(store, ctx, appointment.patient_id)
    if "DOCTOR" in ctx.roles and "ADMIN" not in ctx.roles:
        doctor = store.get(Doctor, appointment.doctor_id)
        if doctor.user_id != ctx.actor_id:
            missing()
    return appointment, patient


def list_appointments(ctx, page, page_size):
    ctx.require("schedule.read")
    with session_factory().begin() as db:
        store = Store(db)
        conditions = [
            Appointment.facility_id == ctx.facility_id,
            exists().where(and_(Patient.id == Appointment.patient_id, *patient_conditions(ctx))),
        ]
        if "DOCTOR" in ctx.roles and "ADMIN" not in ctx.roles:
            conditions.append(
                exists().where(
                    and_(Doctor.id == Appointment.doctor_id, Doctor.user_id == ctx.actor_id)
                )
            )
        items = store.list(
            Appointment,
            *conditions,
            limit=page_size,
            offset=(page - 1) * page_size,
            order=Appointment.starts_at,
        )
        audit(store, ctx, "appointment.list", "appointment")
        return {
            "items": [appointment_view(a) for a in items],
            "total": store.count(Appointment, *conditions),
            "page": page,
            "page_size": page_size,
        }


def get_appointment(ctx, identifier):
    ctx.require("schedule.read")
    with session_factory().begin() as db:
        store = Store(db)
        appointment, patient = appointment_access(store, ctx, identifier)
        audit(store, ctx, "appointment.read", "appointment", appointment.id, patient.id)
        return appointment_view(appointment)


def change_appointment(ctx, identifier, data, key, cancel=False):
    ctx.require("schedule.write")
    with session_factory().begin() as db:
        store = Store(db)
        appointment, patient = appointment_access(store, ctx, identifier, lock=True)
        operation = f"appointment.{'cancel' if cancel else 'reschedule'}:{identifier}"
        previous, ns, hashed = replay(store, ctx, operation, key, data.model_dump(mode="json"))
        if previous:
            return previous
        if appointment.version != data.expected_version or appointment.status != "SCHEDULED":
            raise AppError("VERSION_CONFLICT", "Appointment changed or is already cancelled", 409)
        if cancel:
            appointment.status = "CANCELLED"
        else:
            check_slot(store, ctx, appointment.doctor_id, data.starts_at, data.ends_at, identifier)
            appointment.starts_at, appointment.ends_at = data.starts_at, data.ends_at
        appointment.version += 1
        store.add(
            AppointmentHistory(
                appointment_id=identifier,
                status=appointment.status,
                version=appointment.version,
                actor_id=ctx.actor_id,
            )
        )
        audit(store, ctx, operation.split(":")[0], "appointment", identifier, patient.id)
        event(
            store,
            ctx,
            "appointment.cancelled" if cancel else "appointment.updated",
            identifier,
            patient.user_id,
            str(appointment.version),
        )
        response = appointment_view(appointment)
        remember(store, ctx, operation, key, ns, hashed, identifier, response)
        return response


def invoice_view(store, invoice):
    return {
        "id": str(invoice.id),
        "patient_id": str(invoice.patient_id),
        "currency": invoice.currency,
        "total": str(invoice.total),
        "status": invoice.status,
        "source_reference": invoice.source_reference,
        "items": [
            {
                "service_reference": x.service_reference,
                "quantity": x.quantity,
                "unit_price": str(x.unit_price),
            }
            for x in store.list(InvoiceItem, InvoiceItem.invoice_id == invoice.id, limit=100)
        ],
        "notice": "Internal draft only. Not issued, submitted, charged or settled.",
    }


def invoice_access(store, ctx, identifier):
    invoice = store.one(Invoice, Invoice.id == identifier, Invoice.facility_id == ctx.facility_id)
    if not invoice:
        missing()
    patient_access(store, ctx, invoice.patient_id, "billing")
    return invoice


def create_invoice(ctx, data, key):
    ctx.require("billing.write")
    with session_factory().begin() as db:
        store = Store(db)
        patient_access(store, ctx, data.patient_id, "billing")
        if any(item.code_system == "CPT" for item in data.items):
            raise NotConfigured("validated CPT reference data")
        previous, ns, hashed = replay(
            store, ctx, "invoice.create", key, data.model_dump(mode="json")
        )
        if previous:
            return previous
        store.advisory_lock(f"invoice-source:{ctx.facility_id}:{data.source_reference}")
        if store.one(
            Invoice,
            Invoice.facility_id == ctx.facility_id,
            Invoice.source_reference == data.source_reference,
        ):
            raise AppError(
                "DUPLICATE_INVOICE", "A draft already exists for this source reference", 409
            )
        invoice = store.add(
            Invoice(
                patient_id=data.patient_id,
                facility_id=ctx.facility_id,
                source_reference=data.source_reference,
                currency=data.currency,
                total=invoice_total(data.items),
                created_by=ctx.actor_id,
            )
        )
        for line in data.items:
            store.add(
                InvoiceItem(invoice_id=invoice.id, **line.model_dump(exclude={"code_system"}))
            )
        audit(store, ctx, "invoice.draft", "invoice", invoice.id, invoice.patient_id)
        event(store, ctx, "invoice.drafted", invoice.id)
        response = invoice_view(store, invoice)
        remember(store, ctx, "invoice.create", key, ns, hashed, invoice.id, response)
        return response


def list_invoices(ctx, page, page_size):
    ctx.require("billing.read")
    with session_factory().begin() as db:
        store = Store(db)
        conditions = [
            Invoice.facility_id == ctx.facility_id,
            exists().where(
                and_(Patient.id == Invoice.patient_id, *patient_conditions(ctx, "billing"))
            ),
        ]
        audit(store, ctx, "invoice.list", "invoice")
        return {
            "items": [
                invoice_view(store, i)
                for i in store.list(
                    Invoice, *conditions, limit=page_size, offset=(page - 1) * page_size
                )
            ],
            "total": store.count(Invoice, *conditions),
            "page": page,
            "page_size": page_size,
        }


def get_invoice(ctx, identifier):
    ctx.require("billing.read")
    with session_factory().begin() as db:
        store = Store(db)
        invoice = invoice_access(store, ctx, identifier)
        audit(store, ctx, "invoice.read", "invoice", invoice.id, invoice.patient_id)
        return invoice_view(store, invoice)


def dispute(ctx, identifier, data, key):
    ctx.require("dispute.write")
    with session_factory().begin() as db:
        store = Store(db)
        invoice = invoice_access(store, ctx, identifier)
        operation = f"invoice.dispute:{identifier}"
        previous, ns, hashed = replay(store, ctx, operation, key, data.model_dump())
        if previous:
            return previous
        dispute_id = uuid4()
        record = store.add(
            Dispute(
                id=dispute_id,
                invoice_id=identifier,
                created_by=ctx.actor_id,
                encrypted_reason=cipher().encrypt(
                    data.model_dump(), f"dispute:{ctx.facility_id}:{dispute_id}"
                ),
            )
        )
        audit(store, ctx, "dispute.create", "dispute", record.id, invoice.patient_id)
        response = {"id": str(record.id), "invoice_id": str(identifier), "status": record.status}
        remember(store, ctx, operation, key, ns, hashed, record.id, response)
        return response


def audit_events(ctx, page, page_size):
    ctx.require("audit.read")
    with session_factory().begin() as db:
        store = Store(db)
        rows = store.list(
            Audit,
            Audit.facility_id == ctx.facility_id,
            limit=page_size,
            offset=(page - 1) * page_size,
        )
        response = {
            "items": [
                {
                    "id": str(a.id),
                    "created_at": a.created_at,
                    "actor_id": str(a.actor_id) if a.actor_id else None,
                    "roles": a.actor_roles,
                    "action": a.action,
                    "resource_type": a.resource_type,
                    "resource_id": str(a.resource_id) if a.resource_id else None,
                    "request_id": a.request_id,
                    "result": a.result,
                    "reason": a.reason,
                }
                for a in rows
            ],
            "total": store.count(Audit, Audit.facility_id == ctx.facility_id),
            "page": page,
            "page_size": page_size,
        }
        audit(store, ctx, "audit.read", "audit")
        return response


def notifications(ctx, identifier=None):
    with session_factory().begin() as db:
        store = Store(db)
        scope = [
            Notification.recipient_id == ctx.actor_id,
            Notification.facility_id == ctx.facility_id,
        ]
        if identifier:
            item = store.one(Notification, Notification.id == identifier, *scope, lock=True)
            if not item:
                missing()
            item.read_at = item.read_at or now()
            return {"id": str(item.id), "read_at": item.read_at}
        return {
            "items": [
                {
                    "id": str(n.id),
                    "kind": n.kind,
                    "resource_id": str(n.resource_id),
                    "created_at": n.created_at,
                    "read_at": n.read_at,
                }
                for n in store.list(Notification, *scope, limit=100)
            ]
        }


def clinical_unavailable(ctx, identifier=None, prediction=False):
    ctx.require("ai.read" if prediction else "clinical.write")
    with session_factory().begin() as db:
        store = Store(db)
        if identifier:
            patient_access(store, ctx, identifier, "clinical")
        audit(
            store,
            ctx,
            "ai.unavailable" if prediction else "clinical.unavailable",
            "clinical",
            patient_id=identifier,
            result="NOT_CONFIGURED",
            reason="Approved model/SOP absent",
        )
    raise NotConfigured("clinical-inference" if prediction else "clinical-sops")


def external_invoice(ctx, identifier, name):
    ctx.require("billing.write")
    with session_factory().begin() as db:
        store = Store(db)
        invoice = invoice_access(store, ctx, identifier)
        audit(
            store,
            ctx,
            f"{name}.unavailable",
            "invoice",
            identifier,
            invoice.patient_id,
            result="NOT_CONFIGURED",
            reason="Provider contract absent",
        )
    raise NotConfigured(name)


def record_metadata(ctx, patient_id, page, page_size):
    # Content release remains disabled until consent/legal-purpose and clinical SOP policies exist.
    ctx.require("clinical.read")
    with session_factory().begin() as db:
        store = Store(db)
        patient_access(store, ctx, patient_id, "clinical")
        audit(store, ctx, "record.metadata.read", "patient", patient_id, patient_id)
        records = store.list(
            MedicalRecord,
            MedicalRecord.patient_id == patient_id,
            limit=page_size,
            offset=(page - 1) * page_size,
        )
        return {
            "items": [
                {"id": str(r.id), "record_type": r.record_type, "version": r.version}
                for r in records
            ],
            "content_status": "NOT_CONFIGURED",
        }


def admin_summary(ctx):
    ctx.require("admin.read")
    with session_factory().begin() as db:
        store = Store(db)
        audit(store, ctx, "admin.summary", "facility", ctx.facility_id)
        return {
            "patients": store.count(
                Patient, Patient.facility_id == ctx.facility_id, Patient.deleted_at.is_(None)
            ),
            "staff_memberships": store.count(
                Membership, Membership.facility_id == ctx.facility_id, Membership.role != "PATIENT"
            ),
            "scheduled_appointments": store.count(
                Appointment,
                Appointment.facility_id == ctx.facility_id,
                Appointment.status == "SCHEDULED",
            ),
            "data_mode": "SYNTHETIC_ONLY",
            "clinical_workflows": "NOT_CONFIGURED",
        }


def amend_record_primitive(store, ctx, record, expected_version, payload):
    """Internal storage primitive, NOT a clinically approved authoring API. Caller owns UoW."""
    ctx.require("clinical.write")
    patient_access(store, ctx, record.patient_id, "clinical")
    if not store.compare_and_swap(MedicalRecord, record.id, expected_version):
        raise AppError("VERSION_CONFLICT", "Clinical record has a newer version", 409)
    version = expected_version + 1
    envelope = cipher().encrypt(payload, f"record:{ctx.organization_id}:{record.id}:{version}")
    store.add(
        RecordVersion(
            record_id=record.id,
            version=version,
            encrypted_payload=envelope,
            created_by=ctx.actor_id,
        )
    )
    audit(store, ctx, "record.amend", "medical_record", record.id, record.patient_id)
    return version
