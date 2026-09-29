# Independent workflow increment — revisions 0006–0007

**Synthetic data only. Not completion of the provider-independent scope and not a production approval.**

## Account security

`/security` works without facility membership. Reset and verification challenges are hashed for lookup, encrypted for future delivery, expire in 15 minutes, and are single-use under a user lock. Challenge issuance returns a uniform `503 NOT_CONFIGURED` while verified email delivery is absent; it never returns a raw challenge. The public completion screens accept pasted tokens in request bodies, never URL parameters. Verification never grants staff roles. Password reset/change revoke authoritative sessions; reset does not remove an enabled second factor.

Optional RFC 6238 TOTP uses six digits, SHA-1, 30-second counters and a ±1-counter window with replay rejection. Enrollment expires after ten minutes. Ten single-use recovery codes are displayed once, retained only as hashes on the server. Setup/disable/password changes require current-password proof and an enabled factor; security-proof attempts are limited to five per minute through fail-closed Redis. Mutation transactions recheck locked user/session state. Identity audit failures cannot be treated as successful account changes. No OIDC conformance or approved recovery/identity-proofing policy is claimed.

## Scoped administration

`/admin/manage` exposes the real facility roster, membership grants/revocations, scoped account suspension/reinstatement, departments, department assignments and operational configuration. A current scoped SUPER_ADMIN is required for privileged role changes, facility creation and account suspension. Self-changing operator commands and removing the final active operator of a role are rejected. No account-verification override exists. Suspension is refused for users with memberships outside the operator's single-facility scope.

Department/configuration writes use optimistic versions. User account-state changes do **not** have a universal version contract. Department archival requires no assigned staff; departed staff can be unassigned after membership revocation. Availability removal refuses windows containing scheduled appointments. Facility configuration supports reminder offsets (an explicit empty list disables them) and export TTL; these engineering bounds are not clinical SOP approval. Organization lifecycle, facility lifecycle/transfer, identity proofing and richer staff lifecycle remain incomplete.

## Patient history and preservation

`/patients/:id/history` reads encrypted immutable profile snapshots with the same resource authorization/redaction as the current profile. Administrative access does not expose stored medical history. Preservation holds have encrypted append-only reason/release events and block archive while active. Recording/releasing a hold is not a legal judgment. No automatic purge, jurisdictional retention period, record merge or guardian/consent-purpose policy has been invented. Revision 0005 still cannot reconstruct overwritten pre-snapshot versions.

## CSV exchange

`/exchange` is limited to ADMIN and the originating actor/facility. Import accepts exactly six demographic columns: `full_name,date_of_birth,gender,contact_number,email,address`, at most 100 rows. Validation errors identify row numbers without echoing sensitive content. The encrypted PREVIEW requires explicit versioned approval before QUEUED processing. Workers reauthorize the originating session/user/membership. Import transactions use a savepoint: one rejected row rolls back the whole batch; no partial success is reported. A database queue survives broker interruption; database failures leave work available for retry.

Exports include at most 1,000 active demographic profiles, are quoted/formula-escaped, encrypted and actor/facility-bound, and expire after the configured 1–60 minute TTL (15 minutes by default). Downloads recheck current scope for exported patients and are audited. Expiry/cancellation/denied worker jobs are recorded. **Expiry denies access but does not purge ciphertext.** Retention/purge policy and larger-volume streaming exports are unfinished. No export contains clinical history.

## Documents

`/patients/:id/documents` provides list, upload, scan status/retry and authorized download controls. Only assigned doctors upload; assigned clinicians and the explicitly linked patient may list/read, subject to clinical scope. Administrative/infrastructure roles cannot bypass that scope. No public command marks a file clean.

The default `DOCUMENT_STORAGE_BACKEND=unconfigured` rejects uploads. Explicit `database-development` is allowed only in development/testing: metadata, encrypted quarantine bytes, idempotent result and audit commit atomically in PostgreSQL. It is a necessary **development/test adapter**, not a production object-storage substitute. The object table is append-only. Staging/production configuration rejects this adapter.

Only PDF/PNG files of 1–32,768 bytes are accepted. Filename/path/control-character, declared MIME, signature, PNG structure/CRC/pixel-bound and size checks are deterministic structural checks, **not** antivirus scanning or full file rendering validation. The scanner is NOT_CONFIGURED; the deployed worker keeps files QUARANTINED and records that fact. Authorized explicit retry requeues scanning but cannot bypass the missing scanner. CLEAN/INFECTED/error/integrity download boundaries are exercised using test-only injected scanner verdicts. Those mocks cannot be selected in development or production. File content/filename is not logged. Downloads are authenticated body responses, not public object URLs.

Required production activation: implement the ObjectStorage and MalwareScanner ports with approved configuration, timeouts, integrity/AV verdict semantics, region/access/retention controls, genuine contract/outage/retry tests and staging/security approval. A clean scan is not clinical validation. File limits and production storage lifecycle need further engineering for real workloads.

## Notification preferences

`/notification-settings` persists versioned per-user/per-facility opt-in preferences (default off). It does not activate EMAIL/SMS, promise delivery, or constitute consent for a clinical purpose. The present outbox records external delivery as NOT_CONFIGURED. Transport routing must enforce current preferences before activation; retry/dead-letter/reconciliation remain unfinished independent work.

## Running the verified development paths

Apply Alembic head, run API plus Redis/Celery **worker and beat**, and explicitly seed synthetic fixtures. To exercise document uploads, explicitly select `DOCUMENT_STORAGE_BACKEND=database-development` for API and worker in development/testing. The full browser suite now needs these processes and this explicit adapter; the CI definition has been updated accordingly. Do not enable a mock scanner or extract real recovery tokens from databases. Tests use isolated synthetic databases only.

Latest evidence: `../testing/evidence/increment-0007/`. No external provider, live malware scan, staging deployment, legal retention approval or clinical activation occurred.
