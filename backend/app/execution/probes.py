"""Deterministic dependency probes; HTTP handlers have no database access."""

from sqlalchemy import text
from backend.app.core.database import engine
from backend.app.core.cache import redis_client
from backend.app.core.encryption import cipher


def readiness():
    with engine().connect() as db:
        db.execute(text("SELECT 1"))
    redis_client().ping()
    cipher()  # Critical key adapter must be configured; never claim ready without it.
    return {"status": "ready", "data_mode": "SYNTHETIC_ONLY"}
