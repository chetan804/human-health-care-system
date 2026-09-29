"""AES-256-GCM envelope primitive. Local wrapper is DEVELOPMENT/TEST ONLY."""

import base64
import json
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.exceptions import InvalidTag
from backend.app.core.config import settings
from backend.app.core.errors import AppError, NotConfigured


def b64(value: bytes) -> str:
    return base64.b64encode(value).decode()


def unb64(value: str) -> bytes:
    return base64.b64decode(value, validate=True)


class LocalDevelopmentWrapper:
    """Adapter must never be used in staging/production. Version 1 local key only."""

    def __init__(self, key: bytes):
        if len(key) != 32:
            raise ValueError("AES-256 wrapping key required")
        self.key = key

    def wrap(self, data_key: bytes, context: bytes) -> dict:
        nonce = os.urandom(12)
        return {
            "kid": "local-development-v1",
            "nonce": b64(nonce),
            "key": b64(AESGCM(self.key).encrypt(nonce, data_key, context)),
        }

    def unwrap(self, wrapped: dict, context: bytes) -> bytes:
        if wrapped["kid"] != "local-development-v1":
            raise NotConfigured("wrapping key version")
        return AESGCM(self.key).decrypt(unb64(wrapped["nonce"]), unb64(wrapped["key"]), context)


class EnvelopeCipher:
    def __init__(self, wrapper):
        self.wrapper = wrapper

    def encrypt(self, payload: dict, context: str) -> dict:
        key, nonce, aad = AESGCM.generate_key(bit_length=256), os.urandom(12), context.encode()
        return {
            "algorithm": "AES-256-GCM",
            "wrapped": self.wrapper.wrap(key, aad),
            "nonce": b64(nonce),
            "ciphertext": b64(
                AESGCM(key).encrypt(nonce, json.dumps(payload, sort_keys=True).encode(), aad)
            ),
        }

    def decrypt(self, envelope: dict, context: str) -> dict:
        try:
            if envelope["algorithm"] != "AES-256-GCM":
                raise ValueError("Invalid algorithm")
            aad = context.encode()
            key = self.wrapper.unwrap(envelope["wrapped"], aad)
            return json.loads(
                AESGCM(key).decrypt(unb64(envelope["nonce"]), unb64(envelope["ciphertext"]), aad)
            )
        except (InvalidTag, ValueError, KeyError, TypeError):
            raise AppError(
                "ENCRYPTION_ERROR", "Protected data could not be accessed", 503
            ) from None

    def rewrap(self, envelope: dict, context: str, new_wrapper) -> dict:
        """Rewrap the DEK without decrypting medical content. Old key retained for backups."""
        aad = context.encode()
        key = self.wrapper.unwrap(envelope["wrapped"], aad)
        return {**envelope, "wrapped": new_wrapper.wrap(key, aad)}


def cipher():
    cfg = settings()
    if cfg.encryption_backend != "local-development":
        raise NotConfigured("production-kms")
    return EnvelopeCipher(LocalDevelopmentWrapper(unb64(cfg.encryption_key.get_secret_value())))
