"""Explicit development/test-only adapter. No local files or production fallback."""

import base64
from uuid import UUID
from backend.app.core.config import settings
from backend.app.core.errors import NotConfigured
from backend.app.core.encryption import cipher
from backend.app.models.documents import DevelopmentDocumentObject


class DevelopmentDatabaseQuarantine:
    def __init__(self, store, organization_id):
        cfg = settings()
        if (
            cfg.app_env not in {"development", "testing"}
            or cfg.document_storage_backend != "database-development"
        ):
            raise NotConfigured("approved document object storage")
        self.store = store
        self.organization_id = organization_id

    def quarantine(self, content: bytes, reference: str) -> str:
        self.store.add(
            DevelopmentDocumentObject(
                document_id=UUID(reference),
                encrypted_content=cipher().encrypt(
                    {"content_base64": base64.b64encode(content).decode()},
                    f"document-object:{self.organization_id}:{reference}",
                ),
            )
        )
        return reference

    def read_authorized(self, reference: str) -> bytes:
        # Authorization is mandatory at the execution boundary before this internal call.
        row = self.store.one(
            DevelopmentDocumentObject, DevelopmentDocumentObject.document_id == UUID(reference)
        )
        if not row:
            raise NotConfigured("document object")
        payload = cipher().decrypt(
            row.encrypted_content, f"document-object:{self.organization_id}:{reference}"
        )
        return base64.b64decode(payload["content_base64"], validate=True)
