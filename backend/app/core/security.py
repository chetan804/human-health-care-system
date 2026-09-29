"""Credential primitives. No browser-supplied role claims are authoritative."""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from argon2 import PasswordHasher
from argon2.exceptions import VerificationError, InvalidHashError
import jwt
from backend.app.core.config import settings
from backend.app.core.errors import AppError


def now():
    return datetime.now(timezone.utc)


def digest(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def hash_password(value: str) -> str:
    return PasswordHasher().hash(value)


def verify_password(hashed: str, value: str) -> bool:
    try:
        return PasswordHasher().verify(hashed, value)
    except (VerificationError, InvalidHashError):
        return False


def opaque_token() -> str:
    return secrets.token_urlsafe(48)


def access_token(user_id, session_id) -> str:
    cfg = settings()
    return jwt.encode(
        {
            "sub": str(user_id),
            "sid": str(session_id),
            "jti": opaque_token(),
            "iss": cfg.jwt_issuer,
            "aud": cfg.jwt_audience,
            "iat": now(),
            "exp": now() + timedelta(seconds=cfg.access_seconds),
        },
        cfg.jwt_secret.get_secret_value(),
        algorithm="HS256",
    )


def decode_token(token: str) -> dict:
    cfg = settings()
    try:
        return jwt.decode(
            token,
            cfg.jwt_secret.get_secret_value(),
            algorithms=["HS256"],
            issuer=cfg.jwt_issuer,
            audience=cfg.jwt_audience,
            options={"require": ["exp", "iat", "sub", "sid", "jti"]},
        )
    except jwt.PyJWTError:
        raise AppError("UNAUTHENTICATED", "Session is invalid or expired", 401) from None
