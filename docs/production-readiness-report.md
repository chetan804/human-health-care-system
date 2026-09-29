# HCS implementation and production-readiness report

**2026-09-22 · Independent operations increment, revisions 0006–0007 · NOT READY**

The application and the new workflows are implemented and exercised using synthetic data. **Neither the full master specification nor all provider-independent functionality is complete.** This is an engineering handover, not certification, clinical validation or permission to use real patient data.

## Added and verified in this increment

| Area | Implemented behavior | Boundary / remaining work |
|---|---|---|
| Account security | One-time verification/reset consumption; password change; optional TOTP, replay rejection and single-use recovery codes; locked session rechecks and denial audit | Email challenge delivery NOT_CONFIGURED; identity-proofing/bootstrap and OIDC policy unresolved |
| Administration | Scoped facility creation/listing, staff roster, role grants/revocations, scoped suspension/reinstatement, departments/assignments and versioned operational configuration | No self-escalation/final-operator removal; broader organization/facility lifecycle and universal optimistic locking remain incomplete |
| Patient governance | Redacted encrypted profile-history API/UI; encrypted immutable preservation hold/release events; active holds prevent archive | No legal approval inferred; retention/consent-purpose, identifiers/merge/transfer and guardian workflows remain incomplete |
| Scheduling | Safe availability removal and facility-specific reminder offsets | Emergency triage/break-glass and approved clinical scheduling rules remain unavailable |
| CSV exchange | Bounded validation/preview/approval, atomic queued imports, formula-safe encrypted exports, worker reauthorization, audited failure/expiry and scoped downloads | ADMIN/originator scope; 100-row imports/1,000-row exports; expiry denies access but does not purge ciphertext |
| Documents | Structural PDF/PNG validation, encrypted transactional quarantine, immutable development objects, scoped audited access, checksum checks and explicit scan retries | Explicit development/test-only storage, 32 KiB cap; production storage and real AV NOT_CONFIGURED; no manual clean override |
| Notifications | Versioned per-user/per-facility opt-in preference API/UI | Preferences do not activate transport; routing enforcement, retry/dead-letter and reconciliation still unfinished |
| Frontend | New security/challenge, management, exchange, profile-history/hold, preferences and document pages; guarded routes; lazy-loaded new modules | Ten real-API browser tests and sampled axe checks; no exhaustive accessibility, component or all-role UI acceptance |

Previously implemented foundations remain: PostgreSQL appointment exclusion, encrypted immutable clinical-version primitives, eight-role scope checks, Decimal draft invoices/disputes, durable outbox/in-app notifications and immutable draft AI lineage. Clinical authoring/inference, insurer submission, payment settlement and external message delivery are not fabricated or activated.

## Current executed evidence

Evidence directory: **[testing/evidence/increment-0007/](testing/evidence/increment-0007/)**. Parent-directory reports refer to the previous increment.

- **102 backend tests passed** on native Python 3.13 and a Python 3.12 Alpine test derivative; **94.27% statement coverage**. Three warnings retained. This is not 100% critical-rule coverage.
- **10 Chromium browser tests passed**, including actual worker-driven CSV import/export, hold release, preferences, account-security screens, quarantine uploads and repeated scan retries. The absent scanner never released a document. Sampled login/dashboard/mobile/security/document axe checks passed; no whole-application accessibility certification.
- Alembic **upgrade → downgrade → upgrade to 0007**, **39 application tables**, no model drift, on a newly created disposable UTF-8 database. Existing databases were not reset. API reference regenerated: **67 paths**.
- Ruff/format, strict TypeScript and frontend production build passed. New pages are lazy-loaded; the initial JavaScript bundle is below Vite's 500 kB warning threshold. An upstream Zod annotation warning remains; no representative load or latency guarantee is established.
- Both runtime images were rebuilt and scanned with Trivy; reports identify the exact images and contain **zero HIGH/CRITICAL findings**. Runtime pip-audit, npm audit and Bandit medium+ reported no findings. These are time-bound scanner results, not absence-of-vulnerabilities assurances.
- Encrypted synthetic database backup restored at **0007**; selected domain row counts matched; restored patient and quarantined-object ciphertext decrypted and the object checksum matched. No approved RPO/RTO, PITR, external object-store recovery or key-loss drill is established.
- Release gate still **refuses promotion**. No GitHub CI, staging deployment or production deployment occurred. Current Compose/Nginx hardening smoke was not rerun; the retained prior reports are historical, not validation of this increment.

## Unfinished provider-independent engineering

These are implementation gaps, not merely requests for provider contracts:

1. Richer identifier review/resolution, patient linking/transfer/merge safeguards, consent-purpose enforcement, guardian controls and configurable retention-policy lifecycle. No automatic purge is implemented.
2. Complete organization/facility/staff lifecycle, availability administration and comprehensive role-specific workspaces/search/response typing.
3. Notification recipient routing/current-preference enforcement, retry/dead-letter handling and operational reconciliation.
4. Independent financial event/ledger/reconciliation foundations and broader draft/dispute lifecycle; invoices remain DRAFT, not issued or settled. Claim/payment integration remains a separate activation dependency.
5. Production-capable document storage lifecycle, larger-file/streaming workflows, robust adapter retry handling and approved retention integration. Test-only scanner verdicts are not actual antivirus evidence.
6. Exhaustive critical-rule/concurrency/component/accessibility/performance tests, independent security review and remaining operational hardening.

The [implementation ledger](requirements/implementation-ledger.md) retains the original requirement families; none is marked production COMPLETE.

## External activation dependencies

Country/data residency and organizational ownership; lawful-purpose/retention policies; approved clinical payloads, signing and emergency/red-flag SOPs; licensed terminology; insurer/payment/email/SMS/storage/AV contracts; production KMS/secrets; model artifacts and clinical safety approval. Production integration statuses remain **NOT_CONFIGURED**. No production mock fallback is selected.

Staging VM/provider/OS/domain/TLS/services and credentials were not supplied. Separate non-owner database-role deployment, immutable audit retention, image signing/promotion, branch/reviewer controls, monitoring/on-call and independently approved recovery/incident procedures remain required. The supplied runtime-grants template was updated, not deployed as a verified production role. Development login limits are elevated for browser testing, not a production policy.

## Approval boundary and handover

`release-gate.json` remains unauthorized. The production Compose reference has no working KMS and cannot pass readiness. No regulatory/government certification, clinical validation, OIDC conformance, zero-downtime, scale or production-readiness claim is made.

[Handover index](handover.md) · [Workflow operation/activation notes](operations/independent-workflows.md) · [Validation](testing/validation.md) · [Implementation ledger](requirements/implementation-ledger.md) · [Security/activation requirements](security/controls.md)
