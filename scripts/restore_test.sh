#!/usr/bin/env bash
# Deliberately refuses ordinary database names. Restore only into an isolated EMPTY target.
set -euo pipefail
umask 077
: "${PGDATABASE:?Set isolated restore database name}"
: "${BACKUP_FILE:?Set encrypted backup file}"
: "${AGE_IDENTITY_FILE:?Set protected age identity file path}"
[[ "$PGDATABASE" == *_restore ]] || { echo 'Restore target must end in _restore' >&2; exit 1; }
[[ "${CONFIRM_EMPTY_RESTORE:-}" == "yes" ]] || { echo 'Confirm isolated empty target explicitly' >&2; exit 1; }
count="$(psql -Atc "SELECT count(*) FROM pg_tables WHERE schemaname = 'public'")"
[[ "$count" == "0" ]] || { echo 'Target is not empty' >&2; exit 1; }
sha256sum --check "${BACKUP_FILE}.sha256"
age --decrypt --identity "$AGE_IDENTITY_FILE" "$BACKUP_FILE" | pg_restore --exit-on-error --no-owner --no-acl --dbname "$PGDATABASE"
psql -v ON_ERROR_STOP=1 -Atc 'SELECT version_num FROM alembic_version'
echo 'Database restored. Verify domain integrity and access to external wrapping keys before any activation.'
