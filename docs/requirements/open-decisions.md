# Discovery decisions and blockers

Date: 2026-09-22. This register preserves uncertainty rather than choosing healthcare policy or external contracts silently.

## Confirmed decisions

| ID | Decision | Evidence / consequence |
|---|---|---|
| D-001 | Greenfield repository | User selected “New repository from this specification.” No legacy migrations or existing code can be inspected. |
| D-002 | Non-India or multinational jurisdiction | User selected this option without naming countries. Do not apply any country's law by inference. |
| D-003 | HCS-managed authentication | User selected application-owned identity; do not introduce Keycloak as the authority. OIDC interoperability scope remains open. |
| D-004 | Staging available | User selected staging availability. User subsequently selected VM/Docker Compose. OS/provider/region/domain/access/operators and service details remain unspecified; no staging deployment has occurred. |
| D-006 | Implementation authorization | User selected engineering foundation, left countries/ownership undecided, deferred clinical SOPs/provider contracts, then explicitly instructed implementation of all provider-independent functionality with fail-safe unavailable integrations. |
| D-005 | Required technology baseline | FastAPI, PostgreSQL, SQLAlchemy 2.x, Alembic, Pydantic v2, React/TS/Vite, Redis/Celery, Docker, Nginx, GitHub Actions. |

## Outstanding decisions

| ID | Decision needed | Responsible stakeholder | Blocks | Safe interim boundary |
|---|---|---|---|---|
| Q-001 | Countries served, patient/staff locations, data residency and governing organization | Product + privacy/legal | Privacy policy, hosting, retention and real patient-data use | Synthetic data only; no jurisdictional compliance claim |
| Q-002 | One organization with multiple facilities versus multiple independent organizations; patient sharing/ownership | Product + clinical governance | Tenant schema, patient identity, authorization matrix | Document alternatives; deny cross-facility access by default |
| Q-003 | Staging cloud/on-prem provider, VM/Compose host OS/region/domains, TLS/network policy, managed services | Platform owner | Deploy manifests, actual staging execution and runbooks | No deployment claim; keep architecture vendor-neutral |
| Q-004 | Insurance API and sandbox documentation; member verification and claim formats; retry interpretation | Billing/integration owner | Real insurance adapters and reconciliation | Intake can use explicit PENDING; claims cannot claim submission |
| Q-005 | PCI payment provider, merchant region/account currency, webhook contract and sandbox | Finance + integration owner | Payment adapter, refunds, settlement tests | No collection or success confirmation without verification |
| Q-006 | Email/SMS providers, sender identity, delivery events and consent preferences | Operations + privacy | Live welcome/reminder/security notifications and recovery delivery | Test mocks only, explicit unavailable integration |
| Q-007 | HCS OIDC role: protocol-compatible client boundary or full authorization server; MFA/lockout/session policy | Security + IAM | Final auth contract, recovery and provisioning design | Never equate JWT login with OIDC conformance |
| Q-008 | Patient identity verification, verified identifiers/issuers, duplicate review and merge workflow | Registration + privacy | Safe registration/linking/duplicate resolution | No automatic linking or merging by name/contact |
| Q-009 | Original or newly approved four clinical payload definitions; signing/amendment rules; code system versions | Clinical lead | Clinical schemas, forms, clinical writes | Record kinds preserved; no invented prescription/lab payload |
| Q-010 | Doctor assignment, availability/timezone/duration, emergency triage and break-glass authority | Clinical operations | Scheduling and emergency authorization | No emergency overlap bypass or universal data access |
| Q-011 | Consent/legal-purpose rules, minors/guardians, restricted records, retention/holds | Privacy/legal + clinical | Final policy enforcement, purge/export | No assumed consent; no automated purge |
| Q-012 | Model artifact/data provenance, intended use, validation/approval and red-flag safety policy | Clinical safety + ML governance | Any enabled clinical prediction | Inference unavailable; no fabricated model/confidence |
| Q-013 | Currency, CPT licensing/applicability, local coding/tax/claim rules and invoice uniqueness | Billing/legal | Financial schema/rules and terminology distribution | Preserve requested CPT support; do not substitute or invent code catalogs |
| Q-014 | KMS/secrets, private object store, antivirus, backup destination and key recovery | Security/platform | Encryption adapter, documents, production restore | No hardcoded keys or arbitrary local clinical files |
| Q-015 | Expected load, SLOs, RPO/RTO, backup/retention/incident ownership | Operations + product | Load acceptance and operational readiness | Treat example latency as proposed, not measured guarantee |
| Q-016 | Release approval roles, repository ownership and license | Project owner | License choice, CI deployment approvals, distribution | No license granted by inference; no automatic production deployment |

## Missing historical material

The master prompt references existing SOPs, payload structures, Flask/SQLite code, PostgreSQL execution scripts, a 41-symptom Random Forest model and an existing UI. None were supplied. Greenfield selection means these cannot be treated as inspectable implementation evidence. Explicit requirements quoted in the prompt remain binding. Unquoted details require newly approved definitions or supplied documents.

## Change control

For a resolved decision, record approver/date, chosen policy, alternatives, impacted matrix IDs, migration impact and acceptance tests. Do not silently turn a proposed architecture decision into an accepted requirement. A later supplied repository must be inspected before reuse or modification.

## Continued implementation authorization

The user reconfirmed **independent** work on 2026-09-22. Revisions 0006–0007 implement account/security, scoped administration, preservation/history, CSV exchange and bounded document quarantine without activating external providers. This does not resolve the outstanding legal/clinical/provider decisions or complete the remaining independent scope; see the updated implementation ledger.
