import os
from uuid import uuid4
import pytest
from pydantic import ValidationError
from backend.app.core.config import Settings
from backend.app.core.encryption import EnvelopeCipher, LocalDevelopmentWrapper
from backend.app.core.errors import AppError
from backend.app.core.security import hash_password, verify_password
from backend.app.execution import identity
from backend.app.schemas.contracts import Login
from backend.app.services.policies import permits


def test_envelope_tamper_context_and_rotation():
    old = EnvelopeCipher(LocalDevelopmentWrapper(os.urandom(32)))
    new_wrapper = LocalDevelopmentWrapper(os.urandom(32))
    payload = {"synthetic": "secret"}
    sealed = old.encrypt(payload, "tenant:record:1")
    assert "secret" not in str(sealed)
    assert old.decrypt(sealed, "tenant:record:1") == payload
    with pytest.raises(AppError):
        old.decrypt(sealed, "other:record:1")
    rewrapped = old.rewrap(sealed, "tenant:record:1", new_wrapper)
    assert EnvelopeCipher(new_wrapper).decrypt(rewrapped, "tenant:record:1") == payload
    sealed["ciphertext"] = "AAAA"
    with pytest.raises(AppError):
        old.decrypt(sealed, "tenant:record:1")


def test_passwords():
    hashed = hash_password("long-test-password")
    assert hashed.startswith("$argon2id$")
    assert verify_password(hashed, "long-test-password")
    assert not verify_password(hashed, "wrong")
    assert not verify_password("invalid", "anything")


@pytest.mark.parametrize(
    "role,permission,allowed",
    [
        ("ADMIN", "clinical.read", False),
        ("SUPER_ADMIN", "clinical.read", False),
        ("BILLING_STAFF", "patient.read", False),
        ("SYSTEM_AUDITOR", "clinical.write", False),
        ("NURSE", "clinical.write", False),
        ("PATIENT", "patient.write", False),
        ("DOCTOR", "clinical.write", True),
        ("LAB_TECHNICIAN", "billing.write", False),
    ],
)
def test_all_role_policy_boundaries(role, permission, allowed):
    assert permits((role,), permission) == allowed


def test_production_rejects_development_crypto():
    with pytest.raises(ValidationError):
        Settings(app_env="production", encryption_backend="local-development", cookie_secure=True)
    with pytest.raises(ValidationError):
        Settings(database_url="sqlite:///bad")
    with pytest.raises(ValidationError):
        Settings(jwt_secret="short")


def test_refresh_reuse_revokes_access(env):
    credentials = Login(email=env["emails"]["ADMIN"], password=env["password"])
    first, raw = identity.login(credentials, "login", "test")
    second, rotated = identity.refresh(raw, "refresh")
    assert rotated != raw
    identity.resolve(second["access_token"])
    with pytest.raises(AppError) as exc:
        identity.refresh(raw, "replay")
    assert exc.value.status == 401
    with pytest.raises(AppError):
        identity.resolve(second["access_token"])
    with pytest.raises(AppError):
        identity.resolve(first["access_token"])


def test_logout_revokes_immediately(client, auth):
    headers = auth()
    assert client.get("/api/v1/auth/me", headers=headers).status_code == 200
    assert client.post("/api/v1/auth/logout", headers=headers).status_code == 200
    assert client.get("/api/v1/auth/me", headers=headers).status_code == 401


def test_csrf_and_cookie(client, env):
    payload = {"email": env["emails"]["ADMIN"], "password": env["password"]}
    assert client.post("/api/v1/auth/login", json=payload).status_code == 403
    assert (
        client.post(
            "/api/v1/auth/login", json=payload, headers={"Origin": "https://evil.invalid"}
        ).status_code
        == 403
    )
    r = client.post("/api/v1/auth/login", json=payload, headers={"Origin": "http://localhost:5173"})
    assert r.status_code == 200
    assert "HttpOnly" in r.headers["set-cookie"] and "SameSite=strict" in r.headers["set-cookie"]
    assert "refresh_token" not in r.json()["data"]
    r = client.post("/api/v1/auth/refresh", headers={"Origin": "http://localhost:5173"})
    assert r.status_code == 200


def test_registration_cannot_escalate_or_login_unverified(client, env):
    email = f"{uuid4().hex}@example.com"
    payload = {"email": email, "password": "A-long-test-password!", "display_name": "Synthetic"}
    assert (
        client.post("/api/v1/auth/register", json={**payload, "role": "ADMIN"}).status_code == 422
    )
    r = client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 202 and r.json()["data"]["delivery"] == "NOT_CONFIGURED"
    assert client.post("/api/v1/auth/register", json=payload).json()["data"] == r.json()["data"]
    r = client.post(
        "/api/v1/auth/login",
        headers={"Origin": "http://localhost:5173"},
        json={"email": email, "password": payload["password"]},
    )
    assert r.status_code == 401


def test_rate_limit_fail_closed_and_request_id(client, monkeypatch):
    from backend.app.main import redis_client
    from backend.app.core.config import settings
    from redis import ConnectionError

    redis_client().flushdb()
    monkeypatch.setattr(settings(), "rate_limit", 1)
    a = client.get("/api/v1/patients")
    assert a.status_code == 401 and a.headers["cache-control"] == "no-store"
    b = client.get("/api/v1/patients")
    assert b.status_code == 429 and b.headers["retry-after"] == "60"
    assert b.json()["meta"]["request_id"] == b.headers["x-request-id"]
    monkeypatch.setattr(
        redis_client(), "eval", lambda *args: (_ for _ in ()).throw(ConnectionError())
    )
    assert client.get("/api/v1/patients").status_code == 503


def test_missing_providers_have_no_fake_success(client, env, auth):
    for path in ["forgot-password", "verification/request"]:
        r = client.post(f"/api/v1/auth/{path}", json={"email": env["emails"]["ADMIN"]})
        assert r.status_code == 503 and r.json()["error"]["code"] == "NOT_CONFIGURED"
    statuses = client.get("/api/v1/integrations", headers=auth()).json()["data"]["items"]
    assert all(item["status"] == "NOT_CONFIGURED" for item in statuses)


def test_session_listing_and_targeted_revocation(client, auth):
    headers = auth()
    sessions = client.get("/api/v1/auth/sessions", headers=headers)
    assert sessions.status_code == 200
    assert client.delete(f"/api/v1/auth/sessions/{uuid4()}", headers=headers).status_code == 403
    sid = client.get("/api/v1/auth/me", headers=headers).json()["data"]["session_id"]
    assert client.delete(f"/api/v1/auth/sessions/{sid}", headers=headers).status_code == 200
    assert client.get("/api/v1/auth/me", headers=headers).status_code == 401


def test_body_limit_without_content_length(client):
    response = client.post(
        "/api/v1/auth/register",
        content=iter([b"x" * 40000, b"y" * 40000]),
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 413
    assert response.json()["error"]["code"] == "REQUEST_TOO_LARGE"
