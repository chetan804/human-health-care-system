# Engineering directives v0.1

**Status:** implemented technical contracts for synthetic use; not clinical SOP approval. Source: the user's requirements, recorded in the requirements matrix before implementation. Unspecified clinical/provider contracts are not inferred.

## Patient intake — HCS-007, 014, 031, 054

Validate the supported required profile fields. Resolve actor, organization and facility from authoritative identity. Restrict creation to authorized administration. Detect potential matches using keyed contact/date identifiers, never name alone; return a restricted review signal without disclosing another person's profile. Do not merge automatically. In one transaction, persist encrypted profile and initial snapshot, creator metadata, duplicate indexes, audit, idempotent result and outbox. If an insurance reference exists without an insurer, preserve the valid patient as PENDING; do not claim verification. Consent must be a separate explicit versioned event; absence is not consent. Amend using expected version and preserve encrypted snapshots. Archive must not delete clinical history; hold/active appointment restrictions remain enforced.

The present matcher and basic international phone/free-text address validation are narrower than the full identity-review and country-address requirements. Operator review/merge and approved identifier systems still require implementation/design approval.

## Scheduling — HCS-008, 014, 031, 032

Require current patient and clinician/facility authority, an aware future interval, valid bounds and recorded availability. Never rely on browser availability. Persist appointment/status history/audit/outbox/idempotent response atomically. PostgreSQL non-overlap is the final concurrency authority. On conflict, return only authorized alternatives within the bounded approximately ±2-hour search. Cancellation/rescheduling changes the version and invalidates stale reminders. The worker rechecks state/version/timing and excludes already-enqueued reminder keys. Emergency booking is a separate unavailable workflow, not an overlap exception.

## Clinical data — HCS-009, 010, 024

Clinical authoring is closed until approved payloads/signing/amendment/lawful-purpose rules exist. The deterministic storage primitive requires the appropriate role and assignment, encrypts version-qualified content and appends immutable history. A successful plaintext read must share a transaction with a durable access audit; audit failure blocks release. Concurrent amendments to the same version produce one success and one 409. Never infer medical content, code systems, units or treatment recommendations.

## Financial drafts — HCS-014–016

Only authorized financial scope creates a draft. Validate bounded item counts and positive exact Decimal inputs. Calculate totals server-side. Enforce both idempotency and patient/source uniqueness. Disputes are recorded and audited; no adjustment/settlement is inferred. Provider claims, hosted payment creation, signature verification, receipts, refunds and reconciliation remain unavailable. Never accept PAN/CVV or trust browser redirects as payment evidence.

## Asynchronous effects — HCS-017, 031, 049

Commit an outbox with the domain operation before processing. Claim oldest pending events in bounded, locked batches; unique consumer keys prevent local duplicate effects. In-app entries describe committed events. EMAIL/SMS attempts record NOT_CONFIGURED, never SENT. At-least-once processing is not exactly-once external delivery. Patient delivery routing/preferences and real transport retry/reconciliation remain separate work.

## Clinical AI — HCS-018–022

Only immutable DRAFT metadata is registered, with dataset/schema/digest/intended-use/limitations and submitter audit. Submitted metrics are unverified, not measured accuracy. No activation endpoint exists. An authorized prediction request is validated, encrypted, version-bound where applicable and auditable as unavailable; 503 must not contain a made-up diagnosis or probability. Use the exact mandated disclaimer. Approved red-flag rules, model artifacts, validation and clinician sign-off are prerequisites for inference.
