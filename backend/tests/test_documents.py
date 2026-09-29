"""Synthetic structural/scanner tests; mocked verdicts never represent a real AV scan."""

import base64
import struct
import zlib
from uuid import UUID, uuid4
from concurrent.futures import ThreadPoolExecutor
import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from backend.app.core.config import settings, Settings
from backend.app.core.database import session_factory
from backend.app.core.errors import AppError, NotConfigured
from backend.app.models.documents import Document, DevelopmentDocumentObject
from backend.app.models.entities import Audit
from backend.app.repositories.store import Store
from backend.app.execution import documents
from backend.app.schemas.documents import DocumentInput
from backend.app.services.document_validation import validate

PDF = b"%PDF-1.4\n% synthetic structural test only\n%%EOF"


def payload(content=PDF, filename="synthetic.pdf", media_type="application/pdf"):
    return {
        "filename": filename,
        "media_type": media_type,
        "content_base64": base64.b64encode(content).decode(),
    }


@pytest.fixture
def storage(monkeypatch):
    monkeypatch.setattr(settings(), "document_storage_backend", "database-development")


def upload(client, auth, env, key=None):
    return client.post(
        f"/api/v1/patients/{env['patients'][0]}/documents",
        json=payload(),
        headers={**auth("DOCTOR"), "Idempotency-Key": key or uuid4().hex},
    )


class TestOnlyScanner:
    __test__ = False

    def __init__(self, verdict=True):
        self.verdict = verdict

    def scan(self, content):
        if self.verdict == "error":
            raise RuntimeError("Synthetic provider error")
        return self.verdict


def test_quarantine_encrypted_atomic_replay_and_unavailable_scan(client, auth, env, storage):
    first = upload(client, auth, env, "document-upload-key")
    assert first.status_code == 201
    doc = first.json()["data"]
    assert doc["state"] == "QUARANTINED"
    assert upload(client, auth, env, "document-upload-key").json()["data"] == doc
    with session_factory().begin() as db:
        store = Store(db)
        row = store.get(Document, UUID(doc["id"]))
        obj = store.one(DevelopmentDocumentObject, DevelopmentDocumentObject.document_id == row.id)
        assert "synthetic.pdf" not in str(row.encrypted_metadata)
        assert payload()["content_base64"] not in str(obj.encrypted_content)
        assert store.count(Document, Document.patient_id == env["patients"][0]) == 1
    path = "/api/v1/documents/" + doc["id"]
    assert client.post(path + "/download", headers=auth("DOCTOR")).status_code == 409
    documents.scan_pending()
    listing = client.get(
        f"/api/v1/patients/{env['patients'][0]}/documents", headers=auth("NURSE")
    ).json()["data"]
    assert listing["items"][0]["scan_status"] == "NOT_CONFIGURED"
    assert (
        client.post(
            path + "/retry-scan", headers={**auth("DOCTOR"), "Idempotency-Key": "retry-scan-key"}
        ).status_code
        == 200
    )
    with session_factory().begin() as db:
        assert (
            Store(db).count(
                Audit,
                Audit.resource_id == UUID(doc["id"]),
                Audit.action == "document.download.blocked",
            )
            == 1
        )
    with pytest.raises(DBAPIError):
        with session_factory().begin() as db:
            db.execute(
                text("DELETE FROM development_document_objects WHERE document_id=:id"),
                {"id": doc["id"]},
            )


@pytest.mark.parametrize(
    "role", ["ADMIN", "BILLING_STAFF", "LAB_TECHNICIAN", "SYSTEM_AUDITOR", "SUPER_ADMIN"]
)
def test_no_privileged_clinical_document_bypass(client, auth, env, storage, role):
    doc = upload(client, auth, env).json()["data"]
    assert (
        client.get(
            f"/api/v1/patients/{env['patients'][0]}/documents", headers=auth(role)
        ).status_code
        == 403
    )
    assert (
        client.post("/api/v1/documents/" + doc["id"] + "/download", headers=auth(role)).status_code
        == 403
    )
    assert (
        client.post(
            f"/api/v1/patients/{env['patients'][0]}/documents",
            headers={**auth(role), "Idempotency-Key": "denied-document"},
            json=payload(),
        ).status_code
        == 403
    )


@pytest.mark.parametrize(
    "verdict,state,status",
    [
        (True, "CLEAN", "CLEAN"),
        (False, "REJECTED", "INFECTED"),
        ("error", "QUARANTINED", "SCAN_ERROR"),
        ("not-bool", "QUARANTINED", "SCAN_ERROR"),
    ],
)
def test_scan_contract_and_owner_access(client, auth, env, storage, verdict, state, status):
    doc = upload(client, auth, env).json()["data"]
    identifier = UUID(doc["id"])
    documents.scan_pending(TestOnlyScanner(verdict))
    with session_factory().begin() as db:
        row = Store(db).get(Document, identifier)
        assert (row.state, row.scan_status) == (state, status)
    response = client.post(f"/api/v1/documents/{identifier}/download", headers=auth("PATIENT"))
    assert response.status_code == (200 if state == "CLEAN" else 409)
    if state == "CLEAN":
        assert base64.b64decode(response.json()["data"]["content_base64"]) == PDF
    assert (
        client.get(
            f"/api/v1/patients/{env['patients'][1]}/documents", headers=auth("PATIENT")
        ).status_code
        == 404
    )
    assert (
        client.post(
            f"/api/v1/patients/{env['patients'][0]}/documents",
            headers={**auth("NURSE"), "Idempotency-Key": "nurse-read-only"},
            json=payload(),
        ).status_code
        == 403
    )


def test_document_storage_unconfigured_and_prod_forbids_dev(client, auth, env, monkeypatch):
    monkeypatch.setattr(settings(), "document_storage_backend", "unconfigured")
    response = upload(client, auth, env)
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "NOT_CONFIGURED"
    with session_factory().begin() as db:
        assert Store(db).count(Document, Document.patient_id == env["patients"][0]) == 0
    with pytest.raises(ValueError):
        Settings.model_validate(
            {
                **settings().model_dump(),
                "app_env": "production",
                "document_storage_backend": "database-development",
            }
        )
    monkeypatch.setattr(settings(), "app_env", "development")
    with pytest.raises(NotConfigured):
        documents.scan_pending(TestOnlyScanner())


@pytest.mark.parametrize(
    "data",
    [
        payload(b"not pdf"),
        payload(filename="../synthetic.pdf"),
        payload(filename="x\\synthetic.pdf"),
        payload(filename="synthetic\n.pdf"),
        payload(filename="synthetic.png"),
        {"filename": "synthetic.pdf", "media_type": "application/pdf", "content_base64": "!!!!"},
        payload(b"%PDF-1.4" + b"x" * 32768 + b"%%EOF"),
        payload(b"\x89PNG\r\n\x1a\n", "synthetic.png", "image/png"),
    ],
)
def test_malformed_and_oversize_documents(data):
    with pytest.raises(AppError):
        validate(DocumentInput(**data))


def test_png_structure_and_crc():
    def chunk(kind, body):
        return (
            struct.pack(">I", len(body))
            + kind
            + body
            + struct.pack(">I", zlib.crc32(kind + body) & 0xFFFFFFFF)
        )

    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(b"\x00\xff\xff\xff"))
        + chunk(b"IEND", b"")
    )
    assert validate(DocumentInput(**payload(png, "synthetic.png", "image/png")))[0] == png
    with pytest.raises(AppError):
        validate(DocumentInput(**payload(png[:-1] + b"x", "synthetic.png", "image/png")))


def test_document_concurrency_rollback_and_checksum(
    client, auth, env, storage, contexts, monkeypatch
):
    ctx = contexts("DOCTOR")
    pid = env["patients"][0]
    data = DocumentInput(**payload())
    with ThreadPoolExecutor(max_workers=2) as pool:
        items = list(
            pool.map(lambda _: documents.upload(ctx, pid, data, "concurrent-document"), range(2))
        )
    assert items[0]["id"] == items[1]["id"]
    identifier = UUID(items[0]["id"])
    with session_factory().begin() as db:
        Store(db).get(Document, identifier).sha256 = "0" * 64
    documents.scan_pending(TestOnlyScanner())
    with session_factory().begin() as db:
        assert Store(db).get(Document, identifier).scan_status == "INTEGRITY_ERROR"

    def failed(*args, **kwargs):
        raise RuntimeError("Synthetic audit failure")

    monkeypatch.setattr(documents, "audit", failed)
    with pytest.raises(RuntimeError):
        documents.upload(ctx, pid, data, "document-rollback")
    with session_factory().begin() as db:
        assert Store(db).count(Document, Document.patient_id == pid) == 1
