from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from uuid import UUID, uuid4
import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from backend.app.core.database import session_factory
from backend.app.core.encryption import cipher
from backend.app.core.security import now
from backend.app.models.entities import Patient, User
from backend.app.models.operations import IdentityChallenge, ExchangeJob
from backend.app.repositories.store import Store
from backend.app.execution import exchange
from backend.app.services.totp import code
from backend.app.services.exchange import parse_patients, patients_csv
from backend.app.core.errors import AppError

ORIGIN = {"Origin": "http://localhost:5173"}


def challenge_for(email, purpose, client):
    path = "forgot-password" if purpose == "RESET" else "verification/request"
    r = client.post("/api/v1/auth/" + path, json={"email": email}, headers=ORIGIN)
    assert r.status_code == 503 and r.json()["error"]["code"] == "NOT_CONFIGURED"
    with session_factory().begin() as db:
        store = Store(db)
        user = store.one(User, User.email == email)
        row = store.one(
            IdentityChallenge,
            IdentityChallenge.user_id == user.id,
            IdentityChallenge.purpose == purpose,
        )
        assert row.token_hash not in str(row.encrypted_delivery)
        raw = cipher().decrypt(row.encrypted_delivery, f"challenge:{row.id}")["token"]
        assert raw not in r.text
        return raw, row.id


def test_reset_single_use_and_all_sessions_revoked(client, auth, env):
    headers = auth()
    raw, _ = challenge_for(env["emails"]["ADMIN"], "RESET", client)
    r = client.post(
        "/api/v1/auth/reset-password",
        json={"token": raw, "new_password": "ReplacementPassword123!"},
        headers=ORIGIN,
    )
    assert r.status_code == 200
    assert client.get("/api/v1/auth/me", headers=headers).status_code == 401
    assert (
        client.post(
            "/api/v1/auth/reset-password",
            json={"token": raw, "new_password": "AnotherPassword123!"},
            headers=ORIGIN,
        ).status_code
        == 400
    )
    assert (
        client.post(
            "/api/v1/auth/login",
            json={"email": env["emails"]["ADMIN"], "password": env["password"]},
            headers=ORIGIN,
        ).status_code
        == 401
    )
    assert (
        client.post(
            "/api/v1/auth/login",
            json={"email": env["emails"]["ADMIN"], "password": "ReplacementPassword123!"},
            headers=ORIGIN,
        ).status_code
        == 200
    )


def test_verification_does_not_grant_roles_and_expiry(client, env):
    email = f"{uuid4().hex}@example.com"
    password = "NewUnprivilegedPassword123!"
    assert (
        client.post(
            "/api/v1/auth/register",
            json={"email": email, "password": password, "display_name": "Synthetic New Account"},
        ).status_code
        == 202
    )
    raw, identifier = challenge_for(email, "VERIFY", client)
    with session_factory().begin() as db:
        Store(db).get(IdentityChallenge, identifier).expires_at = now() - timedelta(seconds=1)
    assert (
        client.post(
            "/api/v1/auth/verification/complete", json={"token": raw}, headers=ORIGIN
        ).status_code
        == 400
    )
    with session_factory().begin() as db:
        Store(db).get(IdentityChallenge, identifier).expires_at = now() + timedelta(minutes=1)
    assert (
        client.post(
            "/api/v1/auth/verification/complete", json={"token": raw}, headers=ORIGIN
        ).status_code
        == 200
    )
    login = client.post(
        "/api/v1/auth/login", json={"email": email, "password": password}, headers=ORIGIN
    ).json()["data"]
    me = client.get(
        "/api/v1/auth/me", headers={"Authorization": "Bearer " + login["access_token"]}
    ).json()["data"]
    assert me["facilities"] == []
    assert (
        client.post(
            "/api/v1/auth/reset-password",
            json={"token": raw, "new_password": password},
            headers=ORIGIN,
        ).status_code
        == 400
    )


def test_totp_reference_and_mfa_replay_recovery(client, auth, env):
    assert code("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", 1) == "287082"
    headers = auth()
    assert client.get("/api/v1/auth/mfa", headers=headers).json()["data"]["enabled"] is False
    assert (
        client.post(
            "/api/v1/auth/mfa/setup", headers=headers, json={"password": "wrong"}
        ).status_code
        == 403
    )
    setup = client.post(
        "/api/v1/auth/mfa/setup", headers=headers, json={"password": env["password"]}
    ).json()["data"]
    otp = code(setup["secret"], int(now().timestamp()) // 30)
    r = client.post("/api/v1/auth/mfa/enable", headers=headers, json={"code": otp})
    assert r.status_code == 200
    recovery = r.json()["data"]["recovery_codes"]
    assert len(set(recovery)) == 10
    login = {"email": env["emails"]["ADMIN"], "password": env["password"]}
    assert client.post("/api/v1/auth/login", headers=ORIGIN, json=login).status_code == 401
    assert (
        client.post(
            "/api/v1/auth/login", headers=ORIGIN, json={**login, "second_factor": otp}
        ).status_code
        == 401
    )
    assert (
        client.post(
            "/api/v1/auth/login", headers=ORIGIN, json={**login, "second_factor": recovery[0]}
        ).status_code
        == 200
    )
    assert (
        client.post(
            "/api/v1/auth/login", headers=ORIGIN, json={**login, "second_factor": recovery[0]}
        ).status_code
        == 401
    )
    assert (
        client.get("/api/v1/auth/mfa", headers=headers).json()["data"]["recovery_codes_remaining"]
        == 9
    )
    assert (
        client.post(
            "/api/v1/auth/mfa/disable",
            headers=headers,
            json={"password": env["password"], "second_factor": recovery[1]},
        ).status_code
        == 200
    )
    assert client.get("/api/v1/auth/mfa", headers=headers).json()["data"]["enabled"] is False


def test_password_change_preserves_whitespace_and_revokes(client, auth, env):
    headers = auth()
    password = "  A secure synthetic password!  "
    r = client.post(
        "/api/v1/auth/change-password",
        headers=headers,
        json={"password": env["password"], "new_password": password},
    )
    assert r.status_code == 200
    assert client.get("/api/v1/auth/me", headers=headers).status_code == 401
    assert (
        client.post(
            "/api/v1/auth/login",
            headers=ORIGIN,
            json={"email": env["emails"]["ADMIN"], "password": password},
        ).status_code
        == 200
    )
    assert (
        client.post(
            "/api/v1/auth/login",
            headers=ORIGIN,
            json={"email": env["emails"]["ADMIN"], "password": password.strip()},
        ).status_code
        == 401
    )


def test_mfa_setup_expiry_invalid_code_and_account_limit(client, auth, env):
    headers = auth()
    assert (
        client.post("/api/v1/auth/mfa/enable", headers=headers, json={"code": "123456"}).status_code
        == 409
    )
    for _ in range(5):
        assert (
            client.post(
                "/api/v1/auth/mfa/setup", headers=headers, json={"password": "wrong"}
            ).status_code
            == 403
        )
    assert (
        client.post(
            "/api/v1/auth/mfa/setup", headers=headers, json={"password": env["password"]}
        ).status_code
        == 429
    )


@pytest.mark.parametrize(
    "role", ["PATIENT", "DOCTOR", "NURSE", "BILLING_STAFF", "LAB_TECHNICIAN", "SYSTEM_AUDITOR"]
)
def test_operator_endpoints_deny_nonoperators(client, auth, role):
    for path in ["/admin/staff", "/admin/departments", "/admin/configuration", "/admin/facilities"]:
        assert client.get("/api/v1" + path, headers=auth(role)).status_code == 403


def test_departments_assignments_configuration_and_scope(client, auth, env):
    headers = {**auth(), "Idempotency-Key": "department-create-1"}
    r = client.post(
        "/api/v1/admin/departments", headers=headers, json={"name": "Synthetic outpatient desk"}
    )
    assert r.status_code == 201
    item = r.json()["data"]
    assert (
        client.post(
            "/api/v1/admin/departments", headers=headers, json={"name": "Synthetic outpatient desk"}
        ).json()["data"]
        == item
    )
    assignment = {
        "user_id": str(env["users"]["DOCTOR"]),
        "department_id": item["id"],
        "assigned": True,
    }
    assert (
        client.put(
            "/api/v1/admin/department-assignments", headers=auth(), json=assignment
        ).status_code
        == 200
    )
    path = "/api/v1/admin/departments/" + item["id"]
    change = {"name": item["name"], "active": False, "expected_version": 1}
    assert client.put(path, headers=auth(), json=change).status_code == 409
    assert (
        client.put(
            "/api/v1/admin/department-assignments",
            headers=auth(),
            json={**assignment, "assigned": False},
        ).status_code
        == 200
    )
    assert client.put(path, headers=auth(), json=change).status_code == 200
    assert client.put(path, headers=auth(), json=change).status_code == 409
    cfg = {"expected_version": 0, "reminders_minutes": [1440, 120, 30], "export_ttl_minutes": 10}
    assert client.put("/api/v1/admin/configuration", headers=auth(), json=cfg).status_code == 200
    assert client.put("/api/v1/admin/configuration", headers=auth(), json=cfg).status_code == 409
    assert client.get("/api/v1/admin/configuration", headers=auth()).json()["data"]["values"][
        "reminders_minutes"
    ] == [1440, 120, 30]
    assert (
        client.put(
            "/api/v1/admin/configuration",
            headers=auth(),
            json={**cfg, "secret": "no secrets allowed"},
        ).status_code
        == 422
    )
    wrong = {**auth(), "X-Facility-ID": str(env["other_facility_id"])}
    assert client.get("/api/v1/admin/departments", headers=wrong).status_code == 403


def test_membership_lifecycle_no_self_escalation_or_last_operator(client, auth, env):
    body = {
        "user_id": str(env["users"]["DOCTOR"]),
        "role": "NURSE",
        "operation": "GRANT",
        "reason": "Synthetic roster assignment",
    }
    headers = {**auth(), "Idempotency-Key": "role-grant-0001"}
    assert client.post("/api/v1/admin/memberships", headers=headers, json=body).status_code == 200
    assert client.post("/api/v1/admin/memberships", headers=headers, json=body).status_code == 200
    assert (
        client.post(
            "/api/v1/admin/memberships",
            headers=headers,
            json={**body, "reason": "A different roster reason"},
        ).status_code
        == 409
    )
    assert (
        client.post(
            "/api/v1/admin/memberships",
            headers={**auth(), "Idempotency-Key": "role-self-0001"},
            json={**body, "user_id": str(env["users"]["ADMIN"]), "role": "SUPER_ADMIN"},
        ).status_code
        == 403
    )
    assert (
        client.post(
            "/api/v1/admin/memberships",
            headers={**auth(), "Idempotency-Key": "role-super-0001"},
            json={**body, "role": "SUPER_ADMIN"},
        ).status_code
        == 403
    )
    supers = {**auth("SUPER_ADMIN"), "Idempotency-Key": "remove-last-admin"}
    assert (
        client.post(
            "/api/v1/admin/memberships",
            headers=supers,
            json={
                **body,
                "role": "ADMIN",
                "user_id": str(env["users"]["ADMIN"]),
                "operation": "REVOKE",
            },
        ).status_code
        == 409
    )
    assert (
        client.post(
            "/api/v1/admin/memberships",
            headers={**auth(), "Idempotency-Key": "revoke-nurse-0001"},
            json={**body, "operation": "REVOKE"},
        ).status_code
        == 200
    )
    data = client.get("/api/v1/admin/staff", headers=auth()).json()["data"]
    assert data["total"] == 7


def test_super_operator_facility_creation_and_account_disable(client, auth, env):
    data = {"name": "New Synthetic Facility", "timezone": "Etc/UTC"}
    assert (
        client.post(
            "/api/v1/admin/facilities",
            headers={**auth(), "Idempotency-Key": "facility-0001"},
            json=data,
        ).status_code
        == 403
    )
    headers = {**auth("SUPER_ADMIN"), "Idempotency-Key": "facility-0001"}
    r = client.post("/api/v1/admin/facilities", headers=headers, json=data)
    assert r.status_code == 201
    assert (
        client.post("/api/v1/admin/facilities", headers=headers, json=data).json()["data"]
        == r.json()["data"]
    )
    assert len(client.get("/api/v1/admin/facilities", headers=headers).json()["data"]["items"]) == 2
    assert (
        client.post(
            "/api/v1/admin/facilities",
            headers=headers,
            json={**data, "timezone": "Invalid/Location"},
        ).status_code
        == 422
    )
    doctor = auth("DOCTOR")
    assert (
        client.put(
            "/api/v1/admin/accounts/" + str(env["users"]["DOCTOR"]),
            headers=headers,
            json={"active": False, "reason": "Synthetic account suspension"},
        ).status_code
        == 200
    )
    assert client.get("/api/v1/auth/me", headers=doctor).status_code == 401
    assert (
        client.put(
            "/api/v1/admin/accounts/" + str(env["users"]["DOCTOR"]),
            headers=headers,
            json={"active": True, "reason": "Synthetic account reinstatement"},
        ).status_code
        == 200
    )
    assert client.get("/api/v1/auth/me", headers=doctor).status_code == 401


def test_history_hold_blocks_archive_preserves_events(client, auth, env):
    pid = env["patients"][0]
    base = f"/api/v1/patients/{pid}"
    assert (
        client.patch(
            base, headers=auth(), json={"expected_version": 1, "address": "New synthetic address"}
        ).status_code
        == 200
    )
    history = client.get(base + "/profile-history", headers=auth()).json()["data"]
    assert history["total"] == 2
    assert history["items"][0]["address"] == "New synthetic address"
    assert history["items"][1]["address"] != "New synthetic address"
    assert all("medical_history" not in row for row in history["items"])
    r = client.post(
        base + "/holds",
        headers={**auth(), "Idempotency-Key": "hold-create-0001"},
        json={"reason": "Synthetic preservation request"},
    )
    assert r.status_code == 201
    hold = r.json()["data"]
    assert (
        client.delete(base + "?expected_version=2", headers=auth()).json()["error"]["code"]
        == "LEGAL_HOLD"
    )
    assert (
        client.get(base + "/holds", headers=auth()).json()["data"]["items"][0]["reason"]
        == "Synthetic preservation request"
    )
    assert (
        client.post(
            base + f"/holds/{hold['id']}/release",
            headers=auth(),
            json={"expected_version": 1, "reason": "Synthetic request concluded"},
        ).status_code
        == 200
    )
    assert client.delete(base + "?expected_version=2", headers=auth()).status_code == 200
    with pytest.raises(DBAPIError):
        with session_factory().begin() as db:
            db.execute(text("DELETE FROM legal_hold_events WHERE hold_id=:id"), {"id": hold["id"]})


def test_notification_preferences_are_scoped_and_opt_in(client, auth):
    assert (
        client.get("/api/v1/notification-preferences", headers=auth()).json()["data"][
            "email_enabled"
        ]
        is False
    )
    values = {"expected_version": 0, "email_enabled": True, "sms_enabled": False}
    assert (
        client.put("/api/v1/notification-preferences", headers=auth(), json=values).status_code
        == 200
    )
    assert (
        client.put("/api/v1/notification-preferences", headers=auth(), json=values).status_code
        == 409
    )
    assert (
        client.get("/api/v1/notification-preferences", headers=auth("DOCTOR")).json()["data"][
            "email_enabled"
        ]
        is False
    )


def csv_input(duplicate=False):
    email = f"{uuid4().hex}@example.com"
    row = f"Synthetic Imported,1990-01-01,Not specified,+12025550199,{email},Synthetic address"
    return (
        "full_name,date_of_birth,gender,contact_number,email,address\n"
        + row
        + "\n"
        + (row + "\n" if duplicate else "")
    )


def test_import_preview_approval_atomic_and_worker_replay(client, auth, env):
    headers = {**auth(), "Idempotency-Key": "import-job-0001"}
    data = {"csv_text": csv_input()}
    r = client.post("/api/v1/exchange/imports", headers=headers, json=data)
    assert r.status_code == 201
    job = r.json()["data"]
    path = "/api/v1/exchange/jobs/" + job["id"]
    assert client.post("/api/v1/exchange/imports", headers=headers, json=data).json()["data"] == job
    assert (
        client.get(path, headers=auth()).json()["data"]["rows"][0]["full_name"]
        == "Synthetic Imported"
    )
    assert client.get(path, headers=auth("SUPER_ADMIN")).status_code == 403
    assert (
        client.post(path + "/approve", headers=auth(), json={"expected_version": 1}).status_code
        == 200
    )
    with ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(lambda _: exchange.process_jobs(), range(2)))
    assert client.get(path, headers=auth()).json()["data"]["status"] == "SUCCEEDED"
    exchange.process_jobs()
    with session_factory().begin() as db:
        assert Store(db).count(Patient, Patient.facility_id == env["facility_id"]) == 3


def test_import_batch_rolls_back_every_row_on_duplicate(client, auth, env):
    job = client.post(
        "/api/v1/exchange/imports",
        headers={**auth(), "Idempotency-Key": "import-duplicate"},
        json={"csv_text": csv_input(True)},
    ).json()["data"]
    path = "/api/v1/exchange/jobs/" + job["id"]
    assert (
        client.post(path + "/approve", headers=auth(), json={"expected_version": 1}).status_code
        == 200
    )
    exchange.process_jobs()
    result = client.get(path, headers=auth()).json()["data"]
    assert result["status"] == "FAILED"
    assert result["error_code"] == "DUPLICATE_REVIEW_REQUIRED"
    with session_factory().begin() as db:
        assert Store(db).count(Patient, Patient.facility_id == env["facility_id"]) == 2


def test_export_formula_safety_expiry_and_cancel(client, auth, env):
    text_csv = patients_csv(
        [
            {
                "id": "test",
                "full_name": " =1+1",
                "date_of_birth": "1990-01-01",
                "gender": "x",
                "contact_number": "+12025550199",
                "email": "test@example.com",
                "address": "@SUM(A1)",
            }
        ]
    )
    assert "' =1+1" in text_csv and "'@SUM" in text_csv
    job = client.post(
        "/api/v1/exchange/exports",
        headers={**auth(), "Idempotency-Key": "export-0001"},
        json={"purpose": "Synthetic scope verification"},
    ).json()["data"]
    path = "/api/v1/exchange/jobs/" + job["id"]
    assert client.post(path + "/download", headers=auth()).status_code == 409
    exchange.process_jobs()
    downloaded = client.post(path + "/download", headers=auth())
    assert downloaded.status_code == 200
    assert "Synthetic" in downloaded.json()["data"]["csv_text"]
    with session_factory().begin() as db:
        Store(db).get(ExchangeJob, UUID(job["id"])).expires_at = now() - timedelta(seconds=1)
    assert client.post(path + "/download", headers=auth()).status_code == 410
    new = client.post(
        "/api/v1/exchange/imports",
        headers={**auth(), "Idempotency-Key": "import-cancel-1"},
        json={"csv_text": csv_input()},
    ).json()["data"]
    p = "/api/v1/exchange/jobs/" + new["id"]
    assert (
        client.post(p + "/cancel", headers=auth(), json={"expected_version": 1}).status_code == 200
    )
    assert (
        client.post(p + "/approve", headers=auth(), json={"expected_version": 1}).status_code == 409
    )
    assert client.get("/api/v1/exchange/jobs", headers=auth()).json()["data"]["total"] == 2


def test_worker_rechecks_revoked_session(client, auth):
    headers = auth()
    job = client.post(
        "/api/v1/exchange/exports",
        headers={**headers, "Idempotency-Key": "export-revoked"},
        json={"purpose": "Synthetic revocation verification"},
    ).json()["data"]
    assert client.post("/api/v1/auth/logout", headers=headers).status_code == 200
    exchange.process_jobs()
    with session_factory().begin() as db:
        row = Store(db).get(ExchangeJob, UUID(job["id"]))
        assert row.status == "FAILED"
        assert row.error_code == "FORBIDDEN"


@pytest.mark.parametrize(
    "value",
    [
        "a,b\n1,2",
        "\x00invalid",
        "full_name,date_of_birth,gender,contact_number,email,address\nName,bad,x,no,bad,short",
        "full_name,date_of_birth,gender,contact_number,email,address\n",
    ],
)
def test_import_rejects_unsupported_or_invalid_csv(value):
    with pytest.raises(AppError):
        parse_patients(value)
