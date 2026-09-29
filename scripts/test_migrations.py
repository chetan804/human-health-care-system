"""Exercise upgrade/downgrade/upgrade on an EMPTY disposable *_migration_test database."""

import os
from sqlalchemy import create_engine, inspect
from sqlalchemy.engine import make_url
from alembic import command
from alembic.config import Config
from backend.app.core.config import settings

url = os.environ.get("MIGRATION_TEST_DATABASE_URL")
if not url or not make_url(url).database.endswith("_migration_test"):
    raise SystemExit("Set MIGRATION_TEST_DATABASE_URL to an EMPTY *_migration_test database")
engine = create_engine(url)
if inspect(engine).get_table_names():
    raise SystemExit("Refusing destructive migration test on a nonempty database")
os.environ["DATABASE_URL"] = url
settings.cache_clear()
config = Config("alembic.ini")
command.upgrade(config, "head")
first = set(inspect(engine).get_table_names())
assert "appointments" in first and "medical_record_versions" in first
command.downgrade(config, "base")
assert set(inspect(engine).get_table_names()) <= {"alembic_version"}
command.upgrade(config, "head")
assert set(inspect(engine).get_table_names()) == first
command.check(config)
print(f"PASS: upgrade → downgrade → upgrade; {len(first) - 1} application tables; no model drift")
