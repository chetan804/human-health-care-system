"""Refuse release without approved target-specific execution and verified readiness evidence."""

import json
from pathlib import Path

record = json.loads(Path("docs/deployment/release-gate.json").read_text())
for blocker in record["blockers"]:
    print("BLOCKED:", blocker)
raise SystemExit("Deployment is not configured or authorized. No deployment was attempted.")
