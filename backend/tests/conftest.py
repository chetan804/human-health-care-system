"""PostgreSQL integration fixtures. Never substitute SQLite or reset a non-test database."""

# ruff: noqa: E402 -- configure isolated test environment before importing the application
import os
from uuid import uuid4
import pytest
from sqlalchemy.engine import make_url
from alembic.config import Config
from alembic import command
from fastapi.testclient import TestClient
from backend.app.core.config import settings

base = settings()
url = os.environ.get(
    "TEST_DATABASE_URL",
    str(make_url(base.database_url).set(database="hcs_test").render_as_string(hide_password=False)),
)
if not make_url(url).database.endswith("_test"):
    raise RuntimeError("Tests require an explicitly named *_test database")
os.environ["DATABASE_URL"] = url
os.environ["APP_ENV"] = "testing"
os.environ["REDIS_URL"] = os.environ.get("TEST_REDIS_URL", base.redis_url.rsplit("/", 1)[0] + "/15")
os.environ["COOKIE_SECURE"] = "false"
os.environ["RATE_LIMIT"] = "10000"
os.environ["LOGIN_LIMIT"] = "100"
settings.cache_clear()

from backend.app.core.database import engine, session_factory
from backend.app.main import app, redis_client
from backend.app.execution import identity
from backend.app.schemas.contracts import Login
from scripts.seed_development import seed


@pytest.fixture(scope="session", autouse=True)
def schema():
    command.upgrade(Config("alembic.ini"), "head")
    yield
    engine().dispose()


@pytest.fixture
def env(schema):
    redis_client().flushdb()
    password = "OnlySyntheticTestPassword!"  # test fixture, never a production credential
    result = seed(password, uuid4().hex[:12], sample_count=2)
    result["password"] = password
    return result


@pytest.fixture
def client():
    with TestClient(app, raise_server_exceptions=False) as client:
        yield client


@pytest.fixture
def auth(env):
    cache = {}

    def get(role="ADMIN"):
        if role not in cache:
            tokens, _ = identity.login(
                Login(email=env["emails"][role], password=env["password"]), "test-auth", "pytest"
            )
            cache[role] = {
                "Authorization": f"Bearer {tokens['access_token']}",
                "X-Facility-ID": str(env["facility_id"]),
            }
        return cache[role]

    return get


@pytest.fixture
def contexts(auth):
    def get(role="ADMIN"):
        headers = auth(role)
        from uuid import UUID

        return identity.context(
            headers["Authorization"][7:], UUID(headers["X-Facility-ID"]), "test-context"
        )

    return get


@pytest.fixture
def db():
    with session_factory().begin() as session:
        yield session
