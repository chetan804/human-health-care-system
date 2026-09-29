#!/usr/bin/env bash
# libpq credentials come from environment or a protected PGPASSFILE, never argv.
set -euo pipefail
umask 077
: "${PGDATABASE:?Set source database using libpq configuration}"
: "${BACKUP_RECIPIENT:?Set an age public recipient}"
: "${BACKUP_FILE:?Set the encrypted output file path}"
if [[ -e "$BACKUP_FILE" ]]; then echo 'Refusing to overwrite a backup' >&2; exit 1; fi
partial="${BACKUP_FILE}.partial"
trap 'rm -f "$partial"' EXIT
pg_dump --format=custom --no-owner --no-acl | age --recipient "$BACKUP_RECIPIENT" --output "$partial"
mv "$partial" "$BACKUP_FILE"
sha256sum "$BACKUP_FILE" > "${BACKUP_FILE}.sha256"
echo 'Encrypted database snapshot created. A successful restore test is still required.'
