"""Architecture constraints supplement, never replace, behavioral tests."""

import ast
from pathlib import Path


def test_routers_and_orchestration_cannot_import_database_or_repositories():
    files = [
        *Path("backend/app/api").rglob("*.py"),
        *Path("backend/app/orchestration").rglob("*.py"),
    ]
    for file in files:
        for node in ast.walk(ast.parse(file.read_text())):
            module = node.module if isinstance(node, ast.ImportFrom) else None
            if module:
                assert not module.startswith(
                    (
                        "sqlalchemy",
                        "psycopg",
                        "backend.app.repositories",
                        "backend.app.core.database",
                    )
                ), file


def test_no_sqlite_in_persistence():
    text = Path("backend/app/core/config.py").read_text()
    assert "postgresql+psycopg://" in text
    for file in Path("backend/app").rglob("*.py"):
        assert "create_all(" not in file.read_text()
