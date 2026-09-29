# Operations, backup and disaster-recovery runbook

Status: implementable engineering instructions and a verified tiny synthetic restore; no approved operating service levels or production exercises.

## Signals

`/health/live` checks process responsiveness. `/health/ready` checks PostgreSQL, Redis and availability of the configured encryption adapter. `/health` is a basic health surface. Restricted `/metrics` exposes aggregate request counters/latency; no patient labels. Current in-process metrics are not a complete multi-worker observability system. `infrastructure/monitoring/alerts.yml` is a reference, not an installed collector/dashboard or tested alert route. DB/Redis/Celery exporters, outbox-age dashboards, OpenTelemetry tracing, integration reconciliation metrics, on-call contacts and alert exercises remain required.

Logs carry request IDs, operation/result and timing, not request bodies or credentials. Audit evidence lives separately in PostgreSQL and is not an ordinary debug log. Treat all exports/incident evidence as sensitive; do not paste database rows or token-bearing traces into tickets.

## Encrypted snapshot and isolated restore

Prerequisites: PostgreSQL client tools, `age`, a protected libpq credential source, an age **public** recipient for backup, and a separately retained private identity for restore. Never pass database passwords in command-line arguments. Set `PGHOST`, `PGPORT`, `PGUSER`, `PGDATABASE`, and preferably `PGPASSFILE`; securely inject secrets. Keys and backups must not be in the source repository.

```bash
# Supply BACKUP_RECIPIENT and a new protected BACKUP_FILE path through the environment.
bash scripts/backup.sh
# Separately provision an isolated EMPTY database whose name ends in _restore.
# Set PGDATABASE to that target, AGE_IDENTITY_FILE to its protected key path,
# BACKUP_FILE to the encrypted snapshot, and CONFIRM_EMPTY_RESTORE=yes.
bash scripts/restore_test.sh
```

The scripts use custom-format pg_dump, streamed age encryption/decryption, a checksum, refusal to overwrite snapshots and refusal to restore over nonempty targets. After restore: verify the Alembic revision, record counts/constraints, decrypt representative authorized envelopes with retained wrapping keys, exercise role boundaries, check audit/outbox state and reconcile external effects before any activation. **Do not replay production notifications/payments just to test a restore.** Isolate egress and workers during drills.

Executed evidence: revision 0005 restored; patient/profile snapshot/appointment/clinical version/invoice/model counts compared; patient ciphertext successfully decrypted. Clinical/model tables in this small snapshot were empty. About 0.20 seconds to back up and 0.33 seconds to restore is a local tiny-data observation, **not an RPO/RTO guarantee**. No PITR/WAL shipping, object-store recovery or region failover has been configured/exercised. Schedule, offsite immutable retention, backup monitoring, key retention and approved RPO/RTO remain open.

## Incident actions (owner approval required)

| Incident | Initial containment and recovery checks |
|---|---|
| API/DB outage | Confirm dependency probes and request IDs; stop unsafe changes; preserve logs; restore service or a verified isolated backup under the approved data-loss decision |
| Redis/worker failure | Expect rate limiting to fail closed; preserve PostgreSQL outbox; restore broker/worker; monitor bounded oldest-first drain and consumer deduplication |
| Corruption/deletion/ransomware | Isolate affected environment and credentials; preserve forensic evidence; restore to a clean isolated target with known-good keys; reconcile data/effects before cutover |
| Credential compromise | Revoke sessions and affected credentials; assess signing/wrapping-key impact; preserve old decryption keys securely for evidence/backups; do not “rotate” by discarding the only old key |
| Payment/insurance ambiguity | Keep state pending; do not repeat a potentially accepted external action blindly; query authoritative provider status using approved reconciliation/idempotency rules |
| Notification outage | Distinguish queued, unavailable, failed, sent and delivered; do not mark delivery on enqueue; replay only after recipient/consent/state validation |
| Suspected clinical/AI safety event | Keep authoring/inference disabled; preserve version-bound audit; contact the designated clinical safety owner; no autonomous workaround |

These are technical starting actions, not jurisdiction-specific notification obligations or signed emergency/clinical SOPs. Assign incident command, privacy, clinical, security and communications owners; approve time limits and reporting duties; exercise database, key-loss, region-loss and ransomware scenarios separately.
