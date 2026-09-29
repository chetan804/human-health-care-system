"""Deterministic identity persistence, with session-family rotation and revocation."""

from datetime import timedelta
from uuid import UUID
from backend.app.core.database import session_factory
from backend.app.core.security import (
    now,
    hash_password,
    verify_password,
    digest,
    opaque_token,
    access_token,
    decode_token,
)
from backend.app.core.config import settings
from backend.app.core.errors import AppError, forbidden
from backend.app.models.entities import (
    User,
    Membership,
    Session,
    RefreshToken,
    LoginAttempt,
    Facility,
    Audit,
)
from backend.app.repositories.store import Store
from backend.app.execution.context import Context
from backend.app.execution.factor_checks import check_factor


def identity_audit(store, actor, action, request_id, result="SUCCESS"):
    store.add(
        Audit(
            actor_id=actor,
            actor_roles=[],
            action=action,
            resource_type="identity",
            request_id=request_id,
            result=result,
            reason="Account lifecycle",
        )
    )


def register(data, request_id):
    hashed = hash_password(data.password)
    with session_factory().begin() as db:
        store = Store(db)
        email = str(data.email).lower()
        store.advisory_lock("register:" + digest(email))
        if not store.one(User, User.email == email):
            user = store.add(
                User(email=email, display_name=data.display_name, password_hash=hashed)
            )
            identity_audit(store, user.id, "auth.register", request_id)
    return {
        "status": "PENDING_VERIFICATION",
        "delivery": "NOT_CONFIGURED",
        "message": "If eligible, registration is pending verification. Email delivery is not configured.",
    }


def login(data, request_id, device):
    failure = None
    result = None
    with session_factory().begin() as db:
        store = Store(db)
        email = str(data.email).lower()
        store.advisory_lock("login:" + digest(email))
        failures = store.count(
            LoginAttempt,
            LoginAttempt.identity_hash == digest(email),
            LoginAttempt.successful.is_(False),
            LoginAttempt.created_at > now() - timedelta(minutes=15),
        )
        if failures >= settings().login_limit:
            raise AppError("RATE_LIMITED", "Too many login attempts; try again later", 429)
        user = store.one(User, User.email == email, lock=True)
        # Spend Argon2 work on unknown accounts to reduce trivial timing enumeration.
        valid = (
            verify_password(user.password_hash, data.password)
            if user
            else verify_password(hash_password(opaque_token()), data.password)
        )
        success = bool(user and valid and user.active and user.verified)
        if success:
            success = check_factor(store, user.id, data.second_factor)
        store.add(LoginAttempt(identity_hash=digest(email), successful=success))
        if not success:
            identity_audit(store, user.id if user else None, "auth.login", request_id, "DENIED")
            failure = AppError("UNAUTHENTICATED", "Invalid credentials or account unavailable", 401)
        else:
            sess = store.add(
                Session(
                    user_id=user.id,
                    expires_at=now() + timedelta(days=settings().refresh_days),
                    device=device[:180],
                )
            )
            refresh = opaque_token()
            store.add(RefreshToken(session_id=sess.id, token_hash=digest(refresh)))
            identity_audit(store, user.id, "auth.login", request_id)
            result = (
                {
                    "access_token": access_token(user.id, sess.id),
                    "token_type": "bearer",
                    "expires_in": settings().access_seconds,
                },
                refresh,
            )
    if failure:
        raise failure
    return result


def refresh(raw, request_id):
    error, result = None, None
    with session_factory().begin() as db:
        store = Store(db)
        token = store.one(RefreshToken, RefreshToken.token_hash == digest(raw or ""))
        if not token:
            raise AppError("UNAUTHENTICATED", "Session is invalid or expired", 401)
        initial = store.get(Session, token.session_id)
        user = store.get(User, initial.user_id, lock=True)
        sess = store.get(Session, token.session_id, lock=True)
        db.refresh(sess)
        # Reload after acquiring family lock to see a competing rotation's committed state.
        db.refresh(token)
        if (
            token.used_at
            or sess.revoked_at
            or sess.expires_at <= now()
            or not user.active
            or not user.verified
        ):
            sess.revoked_at = now()
            identity_audit(store, user.id, "auth.refresh.rejected", request_id, "DENIED")
            error = AppError("UNAUTHENTICATED", "Session is invalid or expired", 401)
        else:
            token.used_at = now()
            raw_new = opaque_token()
            store.add(RefreshToken(session_id=sess.id, token_hash=digest(raw_new)))
            identity_audit(store, user.id, "auth.refresh", request_id)
            result = (
                {
                    "access_token": access_token(user.id, sess.id),
                    "token_type": "bearer",
                    "expires_in": settings().access_seconds,
                },
                raw_new,
            )
    if error:
        raise error
    return result


def resolve(token):
    claims = decode_token(token)
    try:
        sid, uid = UUID(claims["sid"]), UUID(claims["sub"])
    except (ValueError, TypeError):
        raise AppError("UNAUTHENTICATED", "Session is invalid", 401) from None
    with session_factory().begin() as db:
        store = Store(db)
        sess, user = store.get(Session, sid), store.get(User, uid)
        if (
            not sess
            or not user
            or sess.user_id != uid
            or sess.revoked_at
            or sess.expires_at <= now()
            or not user.active
            or not user.verified
        ):
            raise AppError("UNAUTHENTICATED", "Session is invalid or expired", 401)
        return user, sess


def context(token, facility_id, request_id, ip="", user_agent=""):
    user, sess = resolve(token)
    with session_factory().begin() as db:
        store = Store(db)
        memberships = store.list(
            Membership,
            Membership.user_id == user.id,
            Membership.facility_id == facility_id,
            limit=20,
        )
        facility = store.get(Facility, facility_id)
        if not memberships or not facility:
            forbidden()
        return Context(
            user.id,
            sess.id,
            facility.id,
            facility.organization_id,
            tuple(m.role for m in memberships),
            request_id,
            ip[:64],
            user_agent[:180],
        )


def profile(token):
    user, sess = resolve(token)
    with session_factory().begin() as db:
        store = Store(db)
        memberships = store.list(Membership, Membership.user_id == user.id, limit=100)
        scopes = {}
        for m in memberships:
            facility = store.get(Facility, m.facility_id)
            item = scopes.setdefault(
                str(facility.id),
                {
                    "id": str(facility.id),
                    "name": facility.name,
                    "timezone": facility.timezone,
                    "roles": [],
                },
            )
            item["roles"].append(m.role)
        return {
            "id": str(user.id),
            "display_name": user.display_name,
            "email": user.email,
            "session_id": str(sess.id),
            "facilities": list(scopes.values()),
        }


def sessions(token):
    user, _ = resolve(token)
    with session_factory().begin() as db:
        return [
            {
                "id": str(s.id),
                "device": s.device,
                "created_at": s.created_at,
                "expires_at": s.expires_at,
                "revoked_at": s.revoked_at,
            }
            for s in Store(db).list(Session, Session.user_id == user.id, limit=100)
        ]


def revoke(token, session_id, request_id):
    user, current = resolve(token)
    with session_factory().begin() as db:
        store = Store(db)
        store.get(User, user.id, lock=True)
        acting = store.get(Session, current.id, lock=True)
        if not acting or acting.revoked_at or acting.expires_at <= now():
            raise AppError("UNAUTHENTICATED", "Session is invalid or expired", 401)
        target = store.one(
            Session, Session.id == (session_id or current.id), Session.user_id == user.id, lock=True
        )
        if not target:
            forbidden()
        target.revoked_at = now()
        identity_audit(store, user.id, "auth.logout", request_id)
    return {"status": "REVOKED"}
