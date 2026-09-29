# Executed validation — 2026-09-22, increment 0007

All data was synthetic. **Current reports are in `evidence/increment-0007/`.** Reports directly under `evidence/` are retained historical evidence from the previous 0005 increment; they do not validate new code by implication.

| Check | Current executed result | Evidence / limitation |
|---|---|---|
| Native backend | 102 passed, 3 warnings; 94.27% statement coverage | backend-tests.txt, backend-coverage.json, pytest.xml; Python 3.13 |
| Python 3.12 Alpine | 102 passed, 3 warnings; 94.27% coverage | backend-python312.txt; derivative of runtime image with test tools, writable temporary coverage/cache paths |
| Alembic | Upgrade → downgrade → upgrade to 0007; 39 application tables; no drift | migration-result.txt; new empty UTF-8 disposable database; no populated target reset |
| Browser workflows | Ten passed, Chromium, real API/worker/beat | playwright-tests.txt; patient lifecycle, scheduling, drafts/dispute, auditor isolation, management, preference persistence, security/history/hold, CSV worker import/export and document quarantine/retry |
| Accessibility | Sampled login/dashboard/mobile/security/document axe assertions pass | Browser suite; not every route/state or manual assistive-tech certification |
| Frontend | Strict TypeScript and production build passed; new pages lazy-loaded | frontend-build.txt; upstream Zod annotation warning retained; no representative performance guarantee |
| Formatting/static checks | Ruff check/format and TypeScript passed; Bandit medium+ zero | quality.txt, bandit.json; full Python static typing unfinished |
| Dependencies | Runtime pip-audit and npm audit report zero known vulnerabilities | runtime-dependency-audit.json, npm-audit.json; development Python dependency audit was not refreshed |
| Runtime images | Both rebuilt and Trivy-scanned; zero HIGH/CRITICAL findings | container-backend.json, container-frontend.json; exact current image identity is Metadata.ImageID; source-secret-scan.json has zero findings in the stated scope |
| Backup/restore | Encrypted 0007 snapshot restored; selected counts match; patient and quarantine object decrypt/checksum pass | restore-result.json; tiny synthetic data; not PITR, external object/key recovery or approved RPO/RTO |
| Release gate | Refuses promotion, no deployment attempted | release-gate-result.txt |
| Visual review | Synthetic facility and document screens captured and reviewed | facility-management.png, document-quarantine.png; not a usability certification |

Additional new backend tests cover one-time recovery/verification, MFA replay/recovery/proof limits, authoritative revocation races, scoped privileged administration, stale department/configuration versions, department cleanup after membership revocation, legal-hold immutability/archive blocking, notification opt-in persistence, exchange batch rollback/concurrent workers/session reauthorization/expiry denial audit, reminder overrides, and encrypted document atomicity/immutability/role/owner/structural/scan/integrity boundaries. The actual deployed document worker has **no scanner**: clean/infected/error verdicts in backend tests are explicitly test-only mocks, not genuine antivirus validation.

Failures were fixed and rerun rather than hidden: document idempotent replay initially serialized timestamps differently; image builds needed the sandbox's explicit host build network; disposable PostgreSQL targets required UTF-8 instead of the cluster's SQL_ASCII template; the non-root test image needed temporary coverage/cache paths. Repeated scanner retries now get a fresh idempotency key only after confirmed success, preserving keys across failed retries. No security finding was suppressed to pass a gate.

Current Compose topology and Nginx hardening smoke were **not rerun**. Earlier 0004 Compose, 0005 restore and previous-image Nginx reports remain historical. Native API/worker/Vite browser validation, current image build/scans and current backend-container tests are separate measured checks, not a staging deployment.

Three pytest warnings are retained. Statement coverage is not branch coverage or exhaustive 100% critical-rule evidence. Source scanning excludes private .env, Git internals and generated dependencies/caches; it is not a Git-history or penetration review. Scan reports are time-bound and subject to vulnerability-database/SBOM limitations. Only immutable scanned image identities should be promoted after the separate release gate is genuinely satisfied.

Not performed: remote GitHub CI, staging/production deployment, real provider/AV contracts or sandbox tests, independent penetration review, representative load/soak/failover, complete manual accessibility, PITR/region/key-loss/ransomware drills, regulatory review or clinical validation. The full platform and all provider-independent scope remain incomplete.
