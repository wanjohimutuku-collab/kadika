#!/usr/bin/env bash
# Nightly Postgres backup (§11): pg_dump → gzip → S3-compatible storage, 14-day retention.
#
# Run it from cron or a Coolify scheduled task:   0 2 * * *  /app/infra/backup/pg-backup.sh
#
# Needs: pg_dump, gzip, and the AWS CLI (or any S3 client that speaks `aws s3`; for MinIO or R2
# set BACKUP_S3_ENDPOINT). Credentials come from the environment, never from this file.
#
#   DATABASE_URL            postgres://user:pass@host:5432/dbname
#   BACKUP_S3_BUCKET        bucket name
#   BACKUP_S3_PREFIX        folder inside the bucket (default: harusi/postgres)
#   BACKUP_S3_ENDPOINT      optional, for MinIO / Cloudflare R2
#   BACKUP_RETENTION_DAYS   default 14
#   AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${BACKUP_S3_BUCKET:?BACKUP_S3_BUCKET is required}"
PREFIX="${BACKUP_S3_PREFIX:-harusi/postgres}"
KEEP_DAYS="${BACKUP_RETENTION_DAYS:-14}"
ENDPOINT_ARGS=()
[ -n "${BACKUP_S3_ENDPOINT:-}" ] && ENDPOINT_ARGS=(--endpoint-url "$BACKUP_S3_ENDPOINT")

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
FILE="$TMP/harusi-$STAMP.sql.gz"

echo "[backup] dumping at $STAMP"
# --no-owner/--no-acl so the dump restores into any role; custom format would be smaller but plain
# SQL can be inspected and restored with nothing but psql.
pg_dump --no-owner --no-acl "$DATABASE_URL" | gzip -9 > "$FILE"

# A dump that is suspiciously small is a failed dump (empty database, auth error, truncated pipe).
SIZE="$(wc -c < "$FILE" | tr -d ' ')"
if [ "$SIZE" -lt 2000 ]; then
  echo "[backup] ERROR: dump is only $SIZE bytes, refusing to upload it" >&2
  exit 1
fi
gzip -t "$FILE"

aws s3 cp "$FILE" "s3://$BACKUP_S3_BUCKET/$PREFIX/$(basename "$FILE")" "${ENDPOINT_ARGS[@]}" --only-show-errors
echo "[backup] uploaded $(basename "$FILE") ($SIZE bytes)"

# Retention: delete dumps older than KEEP_DAYS (names carry the date, so no clock tricks).
CUTOFF="$(date -u -d "-$KEEP_DAYS days" +%Y%m%d 2>/dev/null || date -u -v-"${KEEP_DAYS}"d +%Y%m%d)"
aws s3 ls "s3://$BACKUP_S3_BUCKET/$PREFIX/" "${ENDPOINT_ARGS[@]}" | awk '{print $4}' | while read -r name; do
  case "$name" in
    harusi-????????T??????Z.sql.gz)
      day="${name#harusi-}"; day="${day%%T*}"
      if [ "$day" -lt "$CUTOFF" ]; then
        aws s3 rm "s3://$BACKUP_S3_BUCKET/$PREFIX/$name" "${ENDPOINT_ARGS[@]}" --only-show-errors
        echo "[backup] removed $name (older than $KEEP_DAYS days)"
      fi
      ;;
  esac
done
echo "[backup] done"
