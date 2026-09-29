# Human Health Care System

**Working engineering foundation · synthetic data only · NOT production ready**

HCS is a multi-facility healthcare workspace, not a disease-prediction demo. It uses real PostgreSQL transactions, a FastAPI API, Redis/Celery workers and a React application. Provider-dependent operations remain explicitly unavailable; they never fabricate insurance coverage, payment settlement, message delivery or clinical inference.

**This increment does not complete all provider-independent functionality.** See the [implementation ledger](docs/requirements/implementation-ledger.md) and [readiness report](docs/production-readiness-report.md) for the remaining engineering work, distinguished from external approval dependencies.

## Implemented and exercised

- Application-managed login, Argon2id, rotating sessions, one-time verification/reset consumption, password changes and optional replay-protected TOTP/recovery codes. Email challenge delivery remains NOT_CONFIGURED.
- Scoped facility/staff/membership/department/configuration administration; preservation holds and redacted profile history.
- Encrypted CSV preview/approval/atomic imports and expiring scoped exports through the real worker.
- Audited document quarantine with an explicit development-only storage adapter; downloads remain blocked without a real clean malware verdict.
- Eight-role server authorization with organization/facility/resource boundaries and no infrastructure-administrator clinical bypass.
- Encrypted patient intake, duplicate-review signals, scoped search, versioned profile edits, consent events, assignments and guarded archive.
- Real availability, PostgreSQL-enforced appointment non-overlap, conflict alternatives, rescheduling, cancellation and durable reminder/outbox processing.
- Encrypted immutable clinical-version primitives with audited access and compare-and-swap. Clinical authoring is unavailable pending approved payloads/SOPs.
- Decimal invoice drafts with independent source uniqueness, idempotency and disputes. Drafts are **not issued invoices, claims or settled payments**.
- In-app notifications and explicit external delivery-unavailable evidence.
- Immutable draft model registry and encrypted unavailable-prediction request evidence. No model is approved or deployed.
- Real-API responsive UI, development Compose stack, non-root runtime images, security gates and encrypted backup/isolated restore scripts.

## Evidence, not a readiness claim

102 backend tests passed on Python 3.12 in a container and Python 3.13 natively; 94.27% statement coverage. Ten Chromium browser tests passed, including worker-backed exchange, document quarantine and sampled accessibility checks. Migration roundtrip to revision `0007` passed with 39 application tables and no model drift. Current rebuilt image scans reported zero HIGH/CRITICAL findings. An encrypted synthetic snapshot was restored at `0007`, including patient and quarantined-object decryption/integrity checks. See [validation](docs/testing/validation.md) for exact scope and [new workflow notes](docs/operations/independent-workflows.md) for limitations.

## Start locally — synthetic development only

Requirements: Docker Engine with Compose v2, or Python 3.12+, Node 22+, PostgreSQL 17 and Redis 7. Never point these commands at a real healthcare database.

1. Copy `.env.example` to an ignored `.env`; set owner-only file permissions. Supply your own strong development database password, JWT secret (at least 48 characters) and base64-encoded 32-byte development wrapping key. No real credentials are included in the example. Use `ENCRYPTION_BACKEND=local-development` **only** for development/testing. For local HTTP, set `COOKIE_SECURE=false` and an exact local origin.
2. `docker compose config --quiet`
3. `docker compose up --build`
4. In another terminal, explicitly create synthetic fixtures (seeding is never automatic):

```bash
read -rsp 'Choose synthetic development password (12+ characters): ' HCS_DEV_PASSWORD; echo
export HCS_DEV_PASSWORD
docker compose exec -e HCS_DEV_PASSWORD backend python -m scripts.seed_development --confirm-synthetic-only
unset HCS_DEV_PASSWORD
```

Open `http://localhost:5173`. Synthetic accounts are `admin@example.com`, `doctor@example.com`, `nurse@example.com`, `billing@example.com`, `auditor@example.com`, `patient@example.com`, `lab@example.com`, and `operator@example.com`, using the password you supplied. Existing seeds are never silently duplicated or password-reset.

For native development, configure separate PostgreSQL databases `hcs`, `hcs_test` and an **empty** `*_migration_test` database, then:

```bash
make setup
make migrate
make api       # separate terminal
make worker    # separate terminal; combined beat is development only
make frontend  # separate terminal
```

Document storage defaults to unconfigured. For synthetic quarantine tests only, explicitly set `DOCUMENT_STORAGE_BACKEND=database-development` on both API and worker. This adapter is rejected outside development/testing, and no malware scanner is active.

The same explicit seed command runs natively as `.venv/bin/python -m scripts.seed_development --confirm-synthetic-only`. Keep the same development wrapping key for existing data; changing it without a rotation procedure makes ciphertext unreadable.

## Verify

```bash
make lint
make test
MIGRATION_TEST_DATABASE_URL='<isolated empty PostgreSQL URL>' .venv/bin/python -m scripts.test_migrations
npm --prefix frontend run build
# API, Vite, Redis, worker/beat and explicit synthetic fixtures must already exist.
# For document E2E, explicitly enable DOCUMENT_STORAGE_BACKEND=database-development
# on the development API/worker. Password is supplied via environment.
npm --prefix frontend run test:e2e
make build
.venv/bin/python scripts/deployment_gate.py  # EXPECTED FAILURE: promotion is not authorized
```

The migration test refuses populated targets. Test fixtures use a dedicated `*_test` database and Redis database 15; never share either with other workloads. Native Chromium setup: `cd frontend && npx playwright install --with-deps chromium`.

## Repository and documentation

```text
backend/app/       API, orchestration, deterministic execution, repositories,
                   models, schemas, policies, integrations, workers and core
backend/alembic/   seven versioned PostgreSQL migrations
backend/tests/     executable unit/integration/API/security/concurrency tests
frontend/src/      typed client, authentication, components, pages and styles
frontend/tests/    real-API Playwright workflows and axe checks
directives/        engineering workflow directives; NOT clinical SOP approvals
infrastructure/    Docker, Nginx and reference monitoring configuration
scripts/           explicit synthetic seed, migration/release gates, backup/restore
.github/workflows/ quality, tests, scans, images and blocked deployment gate
docs/              requirements, architecture, API/schema, operations and evidence
```

Start with the [handover index](docs/handover.md). Original requirements remain in the [101-section matrix](docs/requirements/requirements-matrix.md). Exact jurisdiction, organizational ownership, staging VM/TLS/secrets details, provider contracts and clinical SOPs remain undecided or deferred. License/project ownership and security disclosure ownership have not been selected.

> This tool provides informational decision support and does not provide a medical diagnosis. Clinical decisions must be made by qualified healthcare professionals.
