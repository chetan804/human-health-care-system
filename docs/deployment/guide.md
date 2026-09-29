# Deployment guide — development verified, promotion blocked

## Verified development topology

`docker-compose.yml` runs PostgreSQL, Redis, one migration job, FastAPI, separate Celery worker and scheduler, and Vite. `docker compose config --quiet` and an isolated `up --build` were executed. HTTP login, patient listing and dependency statuses were checked through the frontend proxy. The sandbox required a temporary **build-network=host** override and remapped ports because its Docker daemon had no default build bridge; these sandbox overrides are not deployment advice and are not in the project Compose file.

Production Dockerfiles also built successfully: Python 3.12 non-root application image and Node 22 build → unprivileged Nginx static runtime. Latest image IDs and scan scope are in the retained Trivy reports' `Metadata.ImageID`. The final Nginx image also passed a local non-root/read-only/tmpfs/dropped-capability smoke with static deep linking, proxied readiness and security headers (`nginx-smoke.json`). No registry publication or signing occurred.

## CI/CD files

`ci.yml` runs quality → reusable test/security → image build gates. `test.yml` provisions PostgreSQL/Redis, creates synthetic secrets, runs migration roundtrip/pytest, builds the UI and runs real-API browser tests. `security.yml` performs Bandit, pip-audit, npm audit and source/secret scanning. `build.yml` scans HIGH/CRITICAL before saving image artifacts. `deploy.yml` deliberately fails through `deployment_gate.py` while authorization is false.

The YAML and corresponding local commands were checked; **no GitHub workflow has run** (no remote/repository runner context supplied). Branch protection, environment reviewers, immutable action SHAs, registry signing and artifact promotion remain to configure. Never turn a failed mandatory job into an ignored warning.

## Staging/production prerequisites

The user selected VM/Docker Compose staging, but OS/provider/region/domain/TLS and services were not specified. There is no verified staging or production deploy command. `docker-compose.prod.yml` is a fail-closed reference using externally supplied image/config paths, read-only filesystems, dropped capabilities and separate worker/beat processes. It intentionally sets KMS unavailable; readiness must fail. It is not a turnkey production installation.

Before adapting it, obtain target inventory and access boundaries; independent database/runtime roles; TLS and trusted-proxy design; external secrets/KMS; private Redis/PostgreSQL; backup/WAL/object recovery design; immutable scanned image digests; operational owners; and approved policies/contracts. Rehearse migration, startup, smoke, auth, E2E, scan, alert, backup/restore and rollback in staging. Secure reviewer approval is necessary but is not evidence that missing work is complete.

## Migration and rollback

Use Alembic only. Back up and verify recovery before release. Review expand/contract compatibility and run mixed-version tests before any zero-downtime claim. Current full downgrade tests prove disposable-database reversibility, **not** that production downgrade is safe: dropping version/audit/domain tables destroys history. Prefer a reviewed forward fix; restore only under an approved outage/data-reconciliation plan. Never run the migration roundtrip against populated production or preview data.

## Increment 0007 verification boundary

Both current images were rebuilt and scanned; the backend derivative passed 102 tests on Python 3.12. Migration roundtrip and encrypted restore reached 0007. Native API/Vite with worker/beat passed ten browser workflows. The old Compose and Nginx hardening smoke reports were **not rerun for this increment**. CI now starts the real worker/beat for exchange/scanning and explicitly selects the synthetic-only quarantine adapter. Local checks do not imply a remote CI or staging deployment.
