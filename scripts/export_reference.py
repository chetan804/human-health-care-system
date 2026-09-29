"""Regenerate API/metadata references without contacting providers or exposing runtime secrets."""

import json
from pathlib import Path
from sqlalchemy.dialects import postgresql
from backend.app.main import app
from backend.app.models.entities import Base


def export():
    schema = app.openapi()
    folder = Path("docs/api")
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "openapi.json").write_text(json.dumps(schema, indent=2) + "\n")
    rows = [
        "# API inventory — implemented surface",
        "",
        "Generated from FastAPI. Endpoint existence does not mean a provider is configured. See usage.md and ../security/controls.md.",
        "",
        "| Method | Path | Operation |",
        "|---|---|---|",
    ]
    for path, operations in schema["paths"].items():
        for method, operation in operations.items():
            if method in {"get", "post", "put", "patch", "delete"}:
                rows.append(f"| {method.upper()} | `{path}` | {operation.get('summary', '')} |")
    (folder / "endpoints.md").write_text("\n".join(rows) + "\n")
    rows = [
        "# Database schema — revision 0007",
        "",
        "Generated from SQLAlchemy metadata using PostgreSQL types. Alembic is the only schema migration mechanism. Migrations additionally install append-only triggers; metadata is not their complete description. Development document objects are not a production storage adapter.",
        "",
    ]
    for name, table in sorted(Base.metadata.tables.items()):
        rows.extend(
            [f"## `{name}`", "", "| Column | Type | Nullable | References |", "|---|---|---|---|"]
        )
        for c in table.columns:
            refs = ", ".join(sorted({key.target_fullname for key in c.foreign_keys}))
            rows.append(
                f"| {c.name} | {c.type.compile(dialect=postgresql.dialect())} | {c.nullable} | {refs} |"
            )
        rows.append("")
    Path("docs/database/schema.md").write_text("\n".join(rows) + "\n")
    print(
        f"Exported {len(schema['paths'])} API paths and {len(Base.metadata.tables)} application tables"
    )


if __name__ == "__main__":
    export()
