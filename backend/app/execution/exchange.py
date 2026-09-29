"""Audited, encrypted, bounded async patient imports/exports; no provider simulation."""

from datetime import timedelta
from uuid import UUID, uuid4
from backend.app.core.database import session_factory
from backend.app.core.security import now
from backend.app.core.encryption import cipher
from backend.app.core.errors import AppError, forbidden, missing
from backend.app.models.entities import Patient, User, Session, Membership, Facility
from backend.app.models.operations import ExchangeJob, FacilityConfiguration
from backend.app.repositories.store import Store
from backend.app.execution.context import Context
from backend.app.execution.healthcare import (
    audit,
    replay,
    remember,
    patient_access,
    patient_view,
    create_patient_in_transaction,
)
from backend.app.services.exchange import parse_patients, patients_csv
from backend.app.schemas.contracts import PatientInput


def artifact_context(job):
    return f"exchange:{job.facility_id}:{job.id}"


def view(job):
    return {
        "id": str(job.id),
        "kind": job.kind,
        "status": job.status,
        "version": job.version,
        "expires_at": job.expires_at.isoformat(),
        "created_at": job.created_at.isoformat(),
        "error_code": job.error_code,
    }


def access(store, ctx, identifier, lock=False):
    ctx.require("patient.write")
    job = store.one(
        ExchangeJob,
        ExchangeJob.id == identifier,
        ExchangeJob.facility_id == ctx.facility_id,
        ExchangeJob.actor_id == ctx.actor_id,
        lock=lock,
    )
    if not job:
        missing()
    return job


def create(ctx, kind, data, key):
    ctx.require("patient.write")
    payload = (
        {"rows": parse_patients(data.csv_text)} if kind == "IMPORT" else {"purpose": data.purpose}
    )
    with session_factory().begin() as db:
        store = Store(db)
        previous, ns, hashed = replay(store, ctx, f"exchange.{kind}", key, data.model_dump())
        if previous:
            access(store, ctx, UUID(previous["id"]))
            return previous
        identifier = uuid4()
        config = store.one(
            FacilityConfiguration, FacilityConfiguration.facility_id == ctx.facility_id
        )
        ttl = config.values.get("export_ttl_minutes", 15) if config else 15
        job = ExchangeJob(
            id=identifier,
            facility_id=ctx.facility_id,
            actor_id=ctx.actor_id,
            session_id=ctx.session_id,
            kind=kind,
            status="PREVIEW" if kind == "IMPORT" else "QUEUED",
            expires_at=now() + timedelta(minutes=ttl),
            encrypted_payload=cipher().encrypt(payload, f"exchange:{ctx.facility_id}:{identifier}"),
        )
        store.add(job)
        audit(store, ctx, "exchange.create", "exchange_job", job.id)
        result = view(job)
        remember(store, ctx, f"exchange.{kind}", key, ns, hashed, job.id, result)
        return result


def jobs(ctx, page, size):
    ctx.require("patient.write")
    with session_factory().begin() as db:
        store = Store(db)
        scope = [ExchangeJob.actor_id == ctx.actor_id, ExchangeJob.facility_id == ctx.facility_id]
        audit(store, ctx, "exchange.list", "exchange_job")
        return {
            "items": [
                view(j)
                for j in store.list(ExchangeJob, *scope, limit=size, offset=(page - 1) * size)
            ],
            "total": store.count(ExchangeJob, *scope),
            "page": page,
            "page_size": size,
        }


def get(ctx, identifier, download=False):
    with session_factory().begin() as db:
        store = Store(db)
        job = access(store, ctx, identifier)
        if job.expires_at <= now():
            raise AppError("ARTIFACT_EXPIRED", "Job artifact has expired; start a new request", 410)
        result = view(job)
        if job.status == "PREVIEW" or download:
            if download and (job.kind != "EXPORT" or job.status != "SUCCEEDED"):
                raise AppError("ARTIFACT_UNAVAILABLE", "Export is not ready", 409)
            payload = cipher().decrypt(job.encrypted_payload, artifact_context(job))
            if download:
                for pid in payload["patient_ids"]:
                    patient_access(store, ctx, UUID(pid))
                result["csv_text"] = payload["csv_text"]
                result["filename"] = "hcs-patients.csv"
            else:
                result["rows"] = payload["rows"]
        audit(
            store, ctx, "exchange.download" if download else "exchange.read", "exchange_job", job.id
        )
        return result


def transition(ctx, identifier, version, cancel=False):
    with session_factory().begin() as db:
        store = Store(db)
        job = access(store, ctx, identifier, lock=True)
        allowed = {"PREVIEW", "QUEUED"} if cancel else {"PREVIEW"}
        if job.expires_at <= now() or job.version != version or job.status not in allowed:
            raise AppError("VERSION_CONFLICT", "Job changed or expired", 409)
        job.status = "CANCELLED" if cancel else "QUEUED"
        job.version += 1
        job.session_id = ctx.session_id
        audit(
            store, ctx, "exchange.cancel" if cancel else "exchange.approve", "exchange_job", job.id
        )
        return view(job)


def worker_context(store, job):
    user = store.get(User, job.actor_id)
    sess = store.get(Session, job.session_id)
    facility = store.get(Facility, job.facility_id)
    if (
        not user
        or not user.active
        or not user.verified
        or not sess
        or sess.user_id != user.id
        or sess.revoked_at
        or sess.expires_at <= now()
    ):
        forbidden()
    if not store.one(
        Membership,
        Membership.user_id == user.id,
        Membership.facility_id == facility.id,
        Membership.role == "ADMIN",
    ):
        forbidden()
    return Context(
        user.id, sess.id, facility.id, facility.organization_id, ("ADMIN",), f"job:{job.id}"
    )


def evidence_context(store, job):
    facility = store.get(Facility, job.facility_id)
    return Context(
        job.actor_id, job.session_id, job.facility_id, facility.organization_id, (), f"job:{job.id}"
    )


def process_jobs():
    """Savepoint rollback makes each import all-or-nothing; PostgreSQL queue survives Redis loss."""
    with session_factory().begin() as db:
        store = Store(db)
        expired = store.list(
            ExchangeJob,
            ExchangeJob.status.in_(["PREVIEW", "QUEUED", "SUCCEEDED"]),
            ExchangeJob.expires_at <= now(),
            order=ExchangeJob.expires_at,
            lock=True,
            limit=100,
        )
        for item in expired:
            item.status = "EXPIRED"
            item.version += 1
            audit(store, evidence_context(store, item), "exchange.expired", "exchange_job", item.id)
        items = store.list(
            ExchangeJob,
            ExchangeJob.status == "QUEUED",
            order=ExchangeJob.created_at,
            lock=True,
            limit=10,
        )
        for job in items:
            if job.expires_at <= now():
                job.status = "EXPIRED"
                job.version += 1
                audit(
                    store, evidence_context(store, job), "exchange.expired", "exchange_job", job.id
                )
                continue
            ctx = None
            try:
                with db.begin_nested():
                    ctx = worker_context(store, job)
                    payload = cipher().decrypt(job.encrypted_payload, artifact_context(job))
                    if job.kind == "IMPORT":
                        result = [
                            create_patient_in_transaction(
                                store, ctx, PatientInput.model_validate(row), f"import:{job.id}:{n}"
                            )
                            for n, row in enumerate(payload["rows"])
                        ]
                        payload = {
                            "patient_ids": [r["id"] for r in result],
                            "row_count": len(result),
                        }
                    else:
                        conditions = [
                            Patient.facility_id == job.facility_id,
                            Patient.deleted_at.is_(None),
                        ]
                        if store.count(Patient, *conditions) > 1000:
                            raise AppError(
                                "EXPORT_LIMIT", "Export exceeds the supported 1000-row batch", 422
                            )
                        rows = store.list(Patient, *conditions, limit=1000)
                        payload = {
                            "csv_text": patients_csv([patient_view(p, ctx) for p in rows]),
                            "patient_ids": [str(p.id) for p in rows],
                            "row_count": len(rows),
                        }
                        for patient in rows:
                            audit(store, ctx, "patient.export", "patient", patient.id, patient.id)
                    job.encrypted_payload = cipher().encrypt(payload, artifact_context(job))
                    job.status = "SUCCEEDED"
                    job.version += 1
                    audit(store, ctx, "exchange.completed", "exchange_job", job.id)
            except AppError as exc:
                job.status = "FAILED"
                job.error_code = exc.code
                job.version += 1
                if ctx is None:
                    ctx = evidence_context(store, job)
                if ctx:
                    audit(
                        store,
                        ctx,
                        "exchange.failed",
                        "exchange_job",
                        job.id,
                        result="FAILED",
                        reason=exc.code,
                    )
        return len(items)
