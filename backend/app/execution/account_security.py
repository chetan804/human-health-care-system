"""One-time recovery/verification and optional TOTP, independent of email transport."""

from functools import wraps
import base64
import secrets
from datetime import timedelta
from uuid import uuid4
from sqlalchemy import update
from backend.app.core.database import session_factory
from backend.app.core.cache import redis_client
from backend.app.core.security import now, opaque_token, digest, hash_password, verify_password
from backend.app.core.encryption import cipher
from backend.app.core.errors import AppError, NotConfigured
from backend.app.execution.identity import resolve, identity_audit
from backend.app.execution.factor_checks import check_factor
from backend.app.models.entities import User, Session
from backend.app.models.operations import IdentityChallenge, MultiFactor
from backend.app.repositories.store import Store
from backend.app.services.totp import match


def issue_challenge(email, purpose, request_id):
    """Durable encrypted delivery payload; returns no raw token. Transport is still unavailable."""
    if purpose not in {"RESET", "VERIFY"}:
        raise ValueError("Unsupported challenge purpose")
    with session_factory().begin() as db:
        store = Store(db)
        user = store.one(User, User.email == str(email).lower(), lock=True)
        if user and user.active and (purpose == "RESET" or not user.verified):
            count = store.count(
                IdentityChallenge,
                IdentityChallenge.user_id == user.id,
                IdentityChallenge.created_at > now() - timedelta(minutes=15),
            )
            if count < 5:
                identifier, raw = uuid4(), opaque_token()
                store.add(
                    IdentityChallenge(
                        id=identifier,
                        user_id=user.id,
                        purpose=purpose,
                        token_hash=digest(raw),
                        expires_at=now() + timedelta(minutes=15),
                        encrypted_delivery=cipher().encrypt(
                            {"token": raw, "recipient": user.email}, f"challenge:{identifier}"
                        ),
                    )
                )
        identity_audit(store, None, "auth.challenge.request", request_id, "NOT_CONFIGURED")
    raise NotConfigured("verified account email delivery")


def consume_challenge(raw, purpose, request_id, new_password=None):
    failure = None
    with session_factory().begin() as db:
        store = Store(db)
        challenge = store.one(
            IdentityChallenge,
            IdentityChallenge.token_hash == digest(raw),
            IdentityChallenge.purpose == purpose,
        )
        if not challenge:
            raise AppError("INVALID_CHALLENGE", "Challenge is invalid or expired", 400)
        user = store.get(User, challenge.user_id, lock=True)
        db.refresh(challenge)
        if challenge.consumed_at or challenge.expires_at <= now() or not user.active:
            identity_audit(store, user.id, "auth.challenge.rejected", request_id, "DENIED")
            failure = AppError("INVALID_CHALLENGE", "Challenge is invalid or expired", 400)
        else:
            if purpose == "RESET":
                user.password_hash = hash_password(new_password)
                db.execute(
                    update(Session)
                    .where(Session.user_id == user.id, Session.revoked_at.is_(None))
                    .values(revoked_at=now())
                )
            else:
                user.verified = True
            db.execute(
                update(IdentityChallenge)
                .where(
                    IdentityChallenge.user_id == user.id,
                    IdentityChallenge.purpose == purpose,
                    IdentityChallenge.consumed_at.is_(None),
                )
                .values(consumed_at=now())
            )
            identity_audit(store, user.id, "auth.challenge.consumed", request_id)
    if failure:
        raise failure
    return {
        "status": "PASSWORD_CHANGED" if purpose == "RESET" else "VERIFIED",
        "sessions_revoked": purpose == "RESET",
    }


def factor_attempt(user_id):
    count = redis_client().eval(
        "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],60) end; return n",
        1,
        f"hcs:mfa:{user_id}",
    )
    if count > 5:
        raise AppError("RATE_LIMITED", "Account security attempt limit exceeded", 429)


def prove(store, user, data):
    factor_attempt(user.id)
    if not verify_password(user.password_hash, data.password) or not check_factor(
        store, user.id, data.second_factor
    ):
        raise AppError(
            "REAUTHENTICATION_REQUIRED", "Password and enabled second factor are required", 403
        )


def locked_identity(store, actor, current):
    """Serialize security mutations with user/session revocation and recheck after locks."""
    user = store.get(User, actor.id, lock=True)
    session = store.get(Session, current.id, lock=True)
    if (
        not user
        or not session
        or session.user_id != user.id
        or session.revoked_at
        or session.expires_at <= now()
        or not user.active
        or not user.verified
    ):
        raise AppError("UNAUTHENTICATED", "Session is invalid or expired", 401)
    return user


def status(token):
    user, _ = resolve(token)
    with session_factory().begin() as db:
        factor = Store(db).one(MultiFactor, MultiFactor.user_id == user.id)
        return {
            "enabled": bool(factor and factor.enabled),
            "recovery_codes_remaining": len(factor.recovery_hashes)
            if factor and factor.enabled
            else 0,
        }


def audited_security_change(function):
    @wraps(function)
    def wrapped(token, data, request_id):
        try:
            return function(token, data, request_id)
        except AppError:
            try:
                user, _ = resolve(token)
                actor = user.id
            except AppError:
                actor = None
            with session_factory().begin() as db:
                identity_audit(Store(db), actor, "auth.security.denied", request_id, "DENIED")
            raise

    return wrapped


@audited_security_change
def setup(token, data, request_id):
    actor, current = resolve(token)
    with session_factory().begin() as db:
        store = Store(db)
        user = locked_identity(store, actor, current)
        prove(store, user, data)
        factor = store.one(MultiFactor, MultiFactor.user_id == user.id, lock=True)
        if factor and factor.enabled:
            raise AppError(
                "MFA_ALREADY_ENABLED", "Disable the existing factor before replacing it", 409
            )
        secret = base64.b32encode(secrets.token_bytes(20)).decode()
        encrypted = cipher().encrypt({"secret": secret}, f"mfa:{user.id}")
        if not factor:
            factor = store.add(
                MultiFactor(
                    user_id=user.id,
                    encrypted_secret=encrypted,
                    expires_at=now() + timedelta(minutes=10),
                )
            )
        else:
            factor.encrypted_secret = encrypted
            factor.expires_at = now() + timedelta(minutes=10)
            factor.last_counter = -1
        identity_audit(store, user.id, "auth.mfa.setup", request_id)
        return {
            "secret": secret,
            "algorithm": "SHA1",
            "digits": 6,
            "period_seconds": 30,
            "expires_at": factor.expires_at,
            "notice": "Manually enroll this secret in your authenticator. It is not stored in a URL or browser storage.",
        }


@audited_security_change
def enable(token, data, request_id):
    actor, current = resolve(token)
    with session_factory().begin() as db:
        store = Store(db)
        user = locked_identity(store, actor, current)
        factor = store.one(MultiFactor, MultiFactor.user_id == user.id, lock=True)
        if not factor or factor.enabled or factor.expires_at <= now():
            raise AppError("MFA_SETUP_REQUIRED", "Start a fresh enrollment", 409)
        factor_attempt(user.id)
        secret = cipher().decrypt(factor.encrypted_secret, f"mfa:{user.id}")["secret"]
        counter = match(secret, data.code, int(now().timestamp()) // 30, factor.last_counter)
        if counter is None:
            raise AppError("INVALID_FACTOR", "Authenticator code is invalid", 400)
        codes = [secrets.token_hex(16) for _ in range(10)]
        factor.enabled = True
        factor.last_counter = counter
        factor.recovery_hashes = [digest(c) for c in codes]
        db.execute(
            update(Session)
            .where(
                Session.user_id == user.id, Session.id != current.id, Session.revoked_at.is_(None)
            )
            .values(revoked_at=now())
        )
        identity_audit(store, user.id, "auth.mfa.enabled", request_id)
        return {
            "status": "ENABLED",
            "recovery_codes": codes,
            "notice": "Save privately now. Codes are displayed once and each is single-use.",
        }


@audited_security_change
def disable(token, data, request_id):
    actor, current = resolve(token)
    with session_factory().begin() as db:
        store = Store(db)
        user = locked_identity(store, actor, current)
        prove(store, user, data)
        factor = store.one(MultiFactor, MultiFactor.user_id == user.id, lock=True)
        if factor:
            db.delete(factor)
        db.execute(
            update(Session)
            .where(
                Session.user_id == user.id, Session.id != current.id, Session.revoked_at.is_(None)
            )
            .values(revoked_at=now())
        )
        identity_audit(store, user.id, "auth.mfa.disabled", request_id)
        return {"status": "DISABLED"}


@audited_security_change
def change_password(token, data, request_id):
    actor, current = resolve(token)
    with session_factory().begin() as db:
        store = Store(db)
        user = locked_identity(store, actor, current)
        prove(store, user, data)
        user.password_hash = hash_password(data.new_password)
        db.execute(
            update(Session)
            .where(Session.user_id == user.id, Session.revoked_at.is_(None))
            .values(revoked_at=now())
        )
        db.execute(
            update(IdentityChallenge)
            .where(
                IdentityChallenge.user_id == user.id,
                IdentityChallenge.purpose == "RESET",
                IdentityChallenge.consumed_at.is_(None),
            )
            .values(consumed_at=now())
        )
        identity_audit(store, user.id, "auth.password.changed", request_id)
        return {"status": "PASSWORD_CHANGED", "sessions_revoked": True}
