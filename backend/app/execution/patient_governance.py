"""Audited history and administrative legal-hold metadata; never determines lawful care."""

from types import SimpleNamespace
from backend.app.core.database import session_factory
from backend.app.core.encryption import cipher
from backend.app.core.errors import AppError, missing
from backend.app.repositories.store import Store
from backend.app.models.operations import LegalHold, HoldEvent, NotificationPreference
from backend.app.models.patient_history import PatientProfileVersion
from backend.app.execution.healthcare import patient_access, patient_view, audit, replay, remember


def history(ctx, patient_id, page, size):
    ctx.require("patient.read")
    with session_factory().begin() as db:
        store = Store(db)
        patient = patient_access(store, ctx, patient_id)
        rows = store.list(
            PatientProfileVersion,
            PatientProfileVersion.patient_id == patient_id,
            limit=size,
            offset=(page - 1) * size,
            order=PatientProfileVersion.version.desc(),
        )
        items = []
        for row in rows:
            snapshot = SimpleNamespace(
                id=patient.id,
                organization_id=patient.organization_id,
                user_id=patient.user_id,
                profile=row.encrypted_profile,
                version=row.version,
                insurance_status="HISTORICAL_SNAPSHOT",
                created_at=row.created_at,
            )
            items.append(patient_view(snapshot, ctx, full=True))
            audit(store, ctx, "patient.history.read", "patient", patient_id, patient_id)
        return {
            "items": items,
            "page": page,
            "page_size": size,
            "total": store.count(
                PatientProfileVersion, PatientProfileVersion.patient_id == patient_id
            ),
        }


def holds(ctx, patient_id, data=None, key=None):
    ctx.require("patient.write")
    with session_factory().begin() as db:
        store = Store(db)
        patient_access(store, ctx, patient_id, lock=True)
        if data:
            op = f"hold.create:{patient_id}"
            previous, ns, hashed = replay(store, ctx, op, key, data.model_dump())
            if previous:
                return previous
            hold = store.add(LegalHold(patient_id=patient_id, created_by=ctx.actor_id))
            store.add(
                HoldEvent(
                    hold_id=hold.id,
                    version=1,
                    active=True,
                    actor_id=ctx.actor_id,
                    encrypted_reason=cipher().encrypt(
                        data.model_dump(), f"hold:{ctx.organization_id}:{hold.id}:1"
                    ),
                )
            )
            audit(store, ctx, "hold.create", "legal_hold", hold.id, patient_id)
            result = {"id": str(hold.id), "version": 1, "active": True}
            remember(store, ctx, op, key, ns, hashed, hold.id, result)
            return result
        items = []
        for hold in store.list(LegalHold, LegalHold.patient_id == patient_id, limit=100):
            entry = store.one(
                HoldEvent, HoldEvent.hold_id == hold.id, HoldEvent.version == hold.version
            )
            reason = cipher().decrypt(
                entry.encrypted_reason, f"hold:{ctx.organization_id}:{hold.id}:{hold.version}"
            )["reason"]
            items.append(
                {
                    "id": str(hold.id),
                    "version": hold.version,
                    "active": hold.active,
                    "reason": reason,
                }
            )
        audit(store, ctx, "hold.read", "patient", patient_id, patient_id)
        return {
            "items": items,
            "notice": "Operator-recorded administrative holds. This does not determine legal obligations or retention periods.",
        }


def release_hold(ctx, patient_id, identifier, data):
    ctx.require("patient.write")
    with session_factory().begin() as db:
        store = Store(db)
        patient_access(store, ctx, patient_id, lock=True)
        hold = store.one(
            LegalHold, LegalHold.id == identifier, LegalHold.patient_id == patient_id, lock=True
        )
        if not hold:
            missing()
        if not hold.active or hold.version != data.expected_version:
            raise AppError("VERSION_CONFLICT", "Hold changed or already released", 409)
        hold.active = False
        hold.version += 1
        store.add(
            HoldEvent(
                hold_id=hold.id,
                version=hold.version,
                active=False,
                actor_id=ctx.actor_id,
                encrypted_reason=cipher().encrypt(
                    {"reason": data.reason}, f"hold:{ctx.organization_id}:{hold.id}:{hold.version}"
                ),
            )
        )
        audit(store, ctx, "hold.release", "legal_hold", hold.id, patient_id)
        return {"id": str(hold.id), "version": hold.version, "active": False}


def preferences(ctx, data=None):
    with session_factory().begin() as db:
        store = Store(db)
        store.advisory_lock(f"preference:{ctx.facility_id}:{ctx.actor_id}")
        row = store.one(
            NotificationPreference,
            NotificationPreference.user_id == ctx.actor_id,
            NotificationPreference.facility_id == ctx.facility_id,
            lock=bool(data),
        )
        if data:
            if data.expected_version != (row.version if row else 0):
                raise AppError("VERSION_CONFLICT", "Preferences changed; reload", 409)
            if row:
                row.email_enabled = data.email_enabled
                row.sms_enabled = data.sms_enabled
                row.version += 1
            else:
                row = store.add(
                    NotificationPreference(
                        user_id=ctx.actor_id,
                        facility_id=ctx.facility_id,
                        email_enabled=data.email_enabled,
                        sms_enabled=data.sms_enabled,
                    )
                )
            audit(store, ctx, "notification.preferences", "user", ctx.actor_id)
        return {
            "email_enabled": row.email_enabled if row else False,
            "sms_enabled": row.sms_enabled if row else False,
            "version": row.version if row else 0,
            "delivery_status": "NOT_CONFIGURED",
            "notice": "Preferences do not authorize clinical access or activate a delivery provider.",
        }
