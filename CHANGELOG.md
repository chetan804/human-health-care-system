# Changelog

## Unreleased independent operations increment — 2026-09-22

- Added one-time verification/reset consumption, optional TOTP/recovery codes, password changes and denied security-operation audits; fixed revocation races using consistent user/session lock ordering.
- Added scoped facility/staff/membership/department/configuration commands and UI; safe unassignment after membership removal; facility-specific reminders.
- Added redacted profile-history and encrypted preservation hold/release workflows.
- Added encrypted CSV preview/approval/atomic imports, scoped expiring exports and worker denial/expiry audit evidence.
- Added explicit development-only encrypted document quarantine, structural validation, immutable objects, authorized scan retry/download boundaries and no public clean override. Real AV/storage remain unconfigured.
- Added account/operations/document pages and lazy-loaded route bundles. Initial JS is below Vite's 500 kB warning threshold; this is not representative performance evidence.
- Migrations 0006/0007 reach 39 tables; 102 backend tests pass with 94.27% coverage on native and Python 3.12 container runtimes; ten browser workflows pass. Current images rebuilt/rescanned with zero HIGH/CRITICAL findings. Encrypted 0007 restore includes quarantine-object integrity.
- Provider-independent scope remains incomplete. Retention/consent-purpose, richer identifier review, notification retry/dead-letter/routing, financial ledger/reconciliation and exhaustive acceptance remain open.

## Previous engineering increment — 2026-09-22

- Added FastAPI/PostgreSQL/Alembic identity, scoped authorization, encrypted patient and clinical version primitives, scheduling, draft billing, consent, audit and transactional outbox.
- Added React/TypeScript real-API workspaces and six passing Chromium workflow/accessibility tests; fixed patient PATCH extra-field failure and login contrast failures rather than suppressing checks.
- Added immutable draft model lineage and encrypted unavailable-request evidence; no clinical inference or validation claims.
- Added migration 0005 encrypted immutable patient profile snapshots with current-version-only backfill; historical overwritten data cannot be reconstructed.
- Fixed outbox test assumptions about bounded batches and improved oldest-first processing/reminder deduplication before query limits.
- Added runtime images, development Compose, five CI files, blocked deployment gate, reference monitoring and backup/restore tooling.
- Actual image scans found HIGH/CRITICAL vulnerabilities. Replaced old bases, upgraded OS packages and removed runtime packaging tools; rebuilt/rescanned without suppressions. Both latest scans have zero HIGH/CRITICAL findings.
- Executed 53 backend tests on Python 3.12 Alpine and native runtime (94.73% statement coverage); latest 28-table migration roundtrip/no-drift and encrypted synthetic restore passed.
- Updated evidence, directives and handover; remaining independent implementation and external/operational blockers explicitly retained. No staging/production deployment or regulatory/clinical approval occurred.

## Discovery baseline — 2026-09-22

### Added
- Initialized a greenfield Git repository after inspecting an empty workspace.
- Mapped all 101 numbered source sections to a requirements baseline before application implementation.
- Recorded the user's selections and outstanding jurisdiction, staging, provider and clinical-policy decisions.
- Proposed architecture, conceptual ERD, authentication boundary, scoped RBAC, transactional outbox, clinical encryption, model governance and operational design.
- Added an evidence-gated delivery plan and an explicit NOT READY baseline report.

### Not changed or claimed
- No legacy files were present, so no existing implementation was modified or migrated.
- No application, schema migrations, integrations, clinical model, frontend, containers or CI/CD were implemented.
- No functional/security tests, staging deployment or production deployment were executed.
