# Evidence-gated delivery plan

No dates or staffing estimates are implied. Phases follow the user's required sequence; governance approval and external integrations are real dependencies.

| Phase | Deliverable | Exit evidence | Current state |
|---|---|---|---|
| 1 Requirements | Section-traceable matrix, decision register, stakeholder acceptance criteria | Source coverage plus approved resolution of phase-blocking questions | Baseline written; approval/questions pending |
| 2 Architecture | Approved diagrams, physical ERD, API/auth/security/deployment/AI ADRs | Architecture and clinical/security review | Proposal only; physical schema/contracts not finalized |
| 3 Database | SQLAlchemy models and versioned Alembic migrations | Real PostgreSQL migration, FK/check/isolation tests | Not started |
| 4 Core | Settings/logging/errors/DI/auth/scoped authorization/audit | Executed unit/API/security tests and deny matrix | Not started |
| 5 Patients | Validated intake/lifecycle/consent/duplicate review with outbox | Edge cases, rollback, scope and provider failure tests | Not started |
| 6 Scheduling | Availability, safe booking/reschedule/cancel, emergency workflow, reminders | Multi-connection race tests and async failure/replay tests | Not started |
| 7 Clinical | Approved typed records, encryption, versions, access audit | Concurrent amendment, tamper, access-audit and isolation tests | Not started |
| 8 Billing | Invoices/claims/payments/receipts/disputes and real adapters | Decimal invariants, webhook security, sandbox reconciliation | Not started; providers unknown |
| 9 AI | Governed registry, real approved inference, audit and safety layer | Artifact lineage, approved evaluation and clinical safety tests | Blocked on model/governance |
| 10 Frontend | Required role-aware routes connected to real APIs | Critical E2E and manual/automated accessibility evidence | Not started |
| 11 Tests | Full automated and human acceptance evidence | No unresolved critical failures; meaningful coverage | Not started |
| 12 Hardening | Dependency/secret/SAST/container scans and abuse tests | Reviewed reports and critical findings resolved | Not started |
| 13 Deployment | Immutable images, staging, approved production release | Migration/smoke/E2E/security/health and rollback evidence | Target details pending; nothing deployed |
| 14 Operations | Alerts/backups/runbooks/support and restore verification | Alert drills, timed restoration and incident exercises | Not started |

## Test evidence organization

Each implementation task must reference matrix IDs, list implemented behavior and test file/node IDs, capture environment and commands, and preserve output. Planned test names are not evidence. Record failures and skipped cases honestly.

Use PostgreSQL in integration tests, independent connections for contention tests, and test-only provider adapters for deterministic failure scenarios. Real adapter acceptance additionally requires the provider's sandbox. External availability, timeouts after send, duplicate/out-of-order events and Redis/DB outages must be exercised.

Critical rules need explicit cases, not just coverage percentages: cross-tenant IDOR; patient linkage; RBAC/relationship denial; refresh reuse/revocation; duplicate request mismatch; committed outbox versus rollback; overlapping scheduling races; stale clinical versions; audit failure before plaintext release; webhook verification; precise financial totals; clinically safe unavailable AI; private object access.

## Final handover inventory — not yet deliverable

The requested final output consists of: (1) final architecture, (2) actual repository tree, (3) actual schema summary, (4) actual API inventory, (5) auth design, (6) verified RBAC matrix, (7) security controls/evidence, (8) model architecture/approval, (9) test report, (10) CI/CD architecture, (11) deployment architecture, (12) monitoring, (13) measured backup/DR procedures, (14) limitations, (15) risks, (16) verified local commands, (17) verified test commands, (18) verified image build commands, (19) target-specific verified staging procedure and (20) approved production procedure.

Do not fill this inventory with fictional commands, unrun test counts, unconfigured dashboards or unavailable provider integrations. The present repository contains planning documentation only.
