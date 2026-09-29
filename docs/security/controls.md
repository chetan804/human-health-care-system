# Security controls and integration activation

## Active in the engineering implementation

Argon2id passwords; short-lived issuer/audience-qualified JWTs; authoritative session/membership checks; hashed rotating refresh credentials; replay-family revocation; exact-Origin refresh checks; explicit CORS; secure-cookie configuration; backend facility/resource authorization; Redis fail-closed limits; actual streamed-body 64 KiB enforcement; Pydantic extra-field rejection; parameterized SQLAlchemy queries; encrypted sensitive payloads and idempotent results; append-only database audit/history controls; security/no-store response headers; minimized structured request logs; and non-root production runtime images.

No plaintext passwords, bearer/refresh tokens, PHI or raw request bodies belong in logs. Development access files and wrapping/backup keys are outside the repository and must remain private. Do not publish `.env`, database dumps, Playwright traces containing real data, or production configurations. `.env` loading is restricted by the settings factory to development/testing; production must receive its environment from an approved external mechanism.

Not established: production TLS termination, trusted reverse-proxy addresses, external secrets/KMS, runtime non-owner database role deployment, asymmetric JWT rotation/OIDC, independent penetration testing, audit WORM storage, legal compliance or government certification. Current audit peer IP may be a proxy address; do not trust arbitrary forwarding headers to appear more complete.

## Authentication implementation and remaining gaps

Public registration never grants staff privileges, and unverified accounts cannot silently become staff. Single-use verification/reset consumption and optional TOTP with replay protection and hashed recovery codes are implemented and tested. Challenge delivery remains NOT_CONFIGURED; raw tokens are never returned by public issuance. Security mutations recheck locked session state and record denials. Scoped privileged-role commands exist without self-escalation or final-operator removal. Production bootstrap/provisioning, identity proofing and privileged-role lifecycle procedures are unapproved. Synthetic seeds are an explicit development tool, not an onboarding substitute.

## Required activation documentation

Ports are internal Python contracts in `backend/app/integrations/ports.py`, not invented vendor wire formats.

| Boundary | What must be supplied and verified before activation |
|---|---|
| Insurance: verify_member / submit_claim / get_claim_status / cancel_claim | Licensed provider/API version, membership and claim schemas, auth/mTLS, status meanings, timeout/idempotency/reconciliation semantics, cancellation rules, sandbox cases, and whether “three retries” means three total calls or three retries |
| Payment: create / verify / refund / status | PCI-hosted flow, account/currency/amount binding, raw webhook signature algorithm and key lifecycle, event IDs/replay window, partial payment/refund/overpayment rules, provider status reconciliation and sandbox failure evidence |
| Email / SMS | Provider API/auth, approved templates without clinical detail, verified recipients, consent/preferences, opt-out/routing rules, sender ownership, rate/timeout/retry semantics and delivery webhooks |
| Production key wrapper | Approved KMS/HSM, key identifiers/access policy, context binding, wrap/unwrap API, rotation/old-key retention, emergency recovery, audit evidence and outage tests |
| Object storage / malware scanning | Private encrypted storage, jurisdiction/region, quarantined upload contract, supported MIME/signature/size validation, AV verdict/error semantics, authorized expiry-bound downloads and audit/retention policies |
| Terminology / clinical SOPs | Licensed versioned ICD/CPT/LOINC datasets and allowed use; approved record payloads, units, signing/amendment and clinical access rules |
| Clinical inference | Artifact/dataset provenance, feature vocabulary/schema, independent clinical validation, approved safety rules, accountable approvers, intended/contraindicated use and monitoring/rollback thresholds |

Activation requires an explicit adapter, configuration validation, contract tests, timeout/partial-success/replay/error tests, redaction checks, staging evidence and approval. Changing a status string to READY is never activation. The default production status remains NOT_CONFIGURED; no mock transport is selected.

## Scan interpretation

Latest pip-audit/runtime audit and npm audit found no reported vulnerabilities; Bandit at medium-and-above found no findings; the source secret scan found none in the scanned scope. Trivy 0.74.0 production-image scans at HIGH/CRITICAL returned zero after remediation. Original failing reports are retained. This is a time-bound scanner result, not proof of no vulnerabilities. The source scan excluded local `.env`, dependency/cache directories and Git internals; no remote/history review or penetration test occurred. Scanner database/SBOM accuracy limitations apply.

## Revisions 0006–0007 safeguards

See `../operations/independent-workflows.md` for proof throttling, immutable hold events, worker reauthorization, export access expiry, and document quarantine. The only document storage adapter is explicitly development/test-only and forbidden in staging/production. There is no deployed scanner, clean override or automatic retention purge. Current evidence is under `../testing/evidence/increment-0007/`; previous reports are historical. The runtime-grants template includes the new immutable tables and limits DELETE to membership/department assignment/MFA/availability lifecycle tables; deployment of that separate role is still unverified.
