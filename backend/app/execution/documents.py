"""Quarantine/access boundaries. No public endpoint can assert a file is clean."""

import base64
import hashlib
import hmac
from uuid import uuid4
from types import SimpleNamespace
from backend.app.core.config import settings
from backend.app.core.database import session_factory
from backend.app.core.encryption import cipher
from backend.app.core.errors import AppError, NotConfigured, missing
from backend.app.models.entities import Patient
from backend.app.models.documents import Document
from backend.app.repositories.store import Store
from backend.app.execution.healthcare import patient_access, audit, replay, remember
from backend.app.integrations.document_store import DevelopmentDatabaseQuarantine
from backend.app.services.document_validation import validate


def metadata(row, organization_id):
    return cipher().decrypt(row.encrypted_metadata, f"document-meta:{organization_id}:{row.id}")


def view(row, organization_id):
    return {
        "id": str(row.id),
        "filename": metadata(row, organization_id)["filename"],
        "media_type": row.media_type,
        "size_bytes": row.size_bytes,
        "state": row.state,
        "scan_status": row.scan_status,
        "created_at": row.created_at.isoformat(),
    }


def upload(ctx, patient_id, data, key):
    ctx.require("clinical.write")
    content, digest = validate(data)
    with session_factory().begin() as db:
        store = Store(db)
        patient_access(store, ctx, patient_id, "clinical", lock=True)
        adapter = DevelopmentDatabaseQuarantine(store, ctx.organization_id)
        previous, ns, hashed = replay(
            store, ctx, f"document.upload:{patient_id}", key, data.model_dump()
        )
        if previous:
            return previous
        identifier = uuid4()
        row = store.add(
            Document(
                id=identifier,
                patient_id=patient_id,
                created_by=ctx.actor_id,
                sha256=digest,
                size_bytes=len(content),
                media_type=data.media_type,
                encrypted_metadata=cipher().encrypt(
                    {"filename": data.filename}, f"document-meta:{ctx.organization_id}:{identifier}"
                ),
            )
        )
        adapter.quarantine(content, str(identifier))
        audit(store, ctx, "document.quarantined", "document", identifier, patient_id)
        result = view(row, ctx.organization_id)
        remember(store, ctx, f"document.upload:{patient_id}", key, ns, hashed, identifier, result)
        return result


def list_documents(ctx, patient_id, page, size):
    ctx.require("patient.read")
    with session_factory().begin() as db:
        store = Store(db)
        patient_access(store, ctx, patient_id, "clinical")
        rows = store.list(
            Document, Document.patient_id == patient_id, limit=size, offset=(page - 1) * size
        )
        audit(store, ctx, "document.list", "patient", patient_id, patient_id)
        return {
            "items": [view(r, ctx.organization_id) for r in rows],
            "total": store.count(Document, Document.patient_id == patient_id),
            "page": page,
            "page_size": size,
            "storage": settings().document_storage_backend,
            "malware_scanner": "NOT_CONFIGURED",
        }


def download(ctx, identifier):
    ctx.require("patient.read")
    failure = None
    result = None
    with session_factory().begin() as db:
        store = Store(db)
        row = store.get(Document, identifier)
        if not row:
            missing()
        patient_access(store, ctx, row.patient_id, "clinical")
        if row.state != "CLEAN":
            audit(
                store,
                ctx,
                "document.download.blocked",
                "document",
                row.id,
                row.patient_id,
                result="DENIED",
                reason="No clean scan verdict",
            )
            failure = AppError(
                "DOCUMENT_QUARANTINED", "A clean malware verdict is required before download", 409
            )
        else:
            try:
                content = DevelopmentDatabaseQuarantine(store, ctx.organization_id).read_authorized(
                    str(identifier)
                )
                if not hmac.compare_digest(hashlib.sha256(content).hexdigest(), row.sha256):
                    raise AppError("INTEGRITY_ERROR", "Document integrity verification failed", 503)
                result = {
                    **view(row, ctx.organization_id),
                    "content_base64": base64.b64encode(content).decode(),
                }
                audit(store, ctx, "document.download", "document", row.id, row.patient_id)
            except AppError as exc:
                audit(
                    store,
                    ctx,
                    "document.download.blocked",
                    "document",
                    row.id,
                    row.patient_id,
                    result="DENIED",
                    reason="Document unavailable or integrity failure",
                )
                failure = exc
    if failure:
        raise failure
    return result


def scan_pending(scanner=None):
    # Only tests may inject a fake scanner. No production/dev mock or clean override exists.
    if scanner is not None and settings().app_env != "testing":
        raise NotConfigured("approved malware scanner")
    with session_factory().begin() as db:
        store = Store(db)
        rows = store.list(
            Document,
            Document.state == "QUARANTINED",
            Document.scan_status == "PENDING",
            limit=20,
            lock=True,
            order=Document.created_at,
        )
        for row in rows:
            patient = store.get(Patient, row.patient_id)
            ctx = SimpleNamespace(
                actor_id=None,
                facility_id=patient.facility_id,
                roles=(),
                request_id="document-scan:" + str(row.id),
                ip="",
                user_agent="worker:document-scans",
            )
            if scanner is None:
                row.scan_status = "NOT_CONFIGURED"
                audit(
                    store,
                    ctx,
                    "document.scan.unavailable",
                    "document",
                    row.id,
                    row.patient_id,
                    result="NOT_CONFIGURED",
                )
                continue
            try:
                content = DevelopmentDatabaseQuarantine(
                    store, patient.organization_id
                ).read_authorized(str(row.id))
                if not hmac.compare_digest(hashlib.sha256(content).hexdigest(), row.sha256):
                    row.state = "REJECTED"
                    row.scan_status = "INTEGRITY_ERROR"
                else:
                    clean = scanner.scan(content)
                    if not isinstance(clean, bool):
                        raise ValueError("Invalid scan verdict")
                    row.state = "CLEAN" if clean else "REJECTED"
                    row.scan_status = "CLEAN" if clean else "INFECTED"
            except Exception:
                row.scan_status = "SCAN_ERROR"  # Provider/content diagnostics never enter logs.
            audit(
                store,
                ctx,
                "document.scan",
                "document",
                row.id,
                row.patient_id,
                result=row.scan_status,
            )
        return len(rows)


def retry_scan(ctx, identifier, key):
    ctx.require("clinical.write")
    with session_factory().begin() as db:
        store = Store(db)
        row = store.get(Document, identifier, lock=True)
        if not row:
            missing()
        patient_access(store, ctx, row.patient_id, "clinical")
        prior, ns, hashed = replay(store, ctx, "document.rescan", key, {"id": str(identifier)})
        if prior:
            return prior
        if row.state != "QUARANTINED":
            raise AppError("SCAN_STATE", "Only quarantined documents may be retried", 409)
        row.scan_status = "PENDING"
        audit(store, ctx, "document.scan.retry", "document", row.id, row.patient_id)
        result = {"id": str(row.id), "state": row.state, "scan_status": row.scan_status}
        remember(store, ctx, "document.rescan", key, ns, hashed, row.id, result)
        return result
