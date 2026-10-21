#!/usr/bin/env bash
# Create (or promote) a Kadi Sasa staff account straight in Postgres (/ops, ADR 012).
#
# Why this exists: packages/db's `make-staff` only promotes an account that already logged in once, and
# nobody can log in until an SMS provider is configured (the login code is sent by SMS). This script
# creates the account itself, so the first staff member can sign in once SMS works, then manage the
# rest in /ops. It is idempotent: re-running with the same phone updates name and level.
#
# Run it INSIDE the postgres container (Coolify -> the stack -> Terminal -> postgres), where
# POSTGRES_USER and POSTGRES_DB are already set and psql is available:
#
#   sh create-admin.sh "Asha Mwangi" 0712345678 admin       # support | billing | admin
#   sh create-admin.sh +255712345678 remove                 # take staff access away
#
# Or from the VPS host:  docker exec -i <postgres-container> sh -s -- "Name" 0712345678 admin < create-admin.sh
# Needs only POSIX sh and psql. The phone number is never printed in full.
set -eu

usage() {
  echo 'usage: create-admin.sh "<full name>" <phone: +255712345678 or 0712345678> [support|billing|admin]' >&2
  echo '       create-admin.sh <phone> remove' >&2
  exit 1
}

# `remove` form: create-admin.sh <phone> remove
if [ "$#" -eq 2 ] && [ "$2" = remove ]; then
  NAME=""; PHONE_ARG="$1"; LEVEL=remove
else
  [ "$#" -ge 2 ] || usage
  NAME="$1"; PHONE_ARG="$2"; LEVEL="${3:-admin}"
fi

case "$LEVEL" in support | billing | admin | remove) ;; *) usage ;; esac
[ "$LEVEL" = remove ] || [ -n "$NAME" ] || usage

# Same normalisation as make-staff: local numbers default to Tanzania, anything else needs full E.164.
DIGITS=$(printf '%s' "$PHONE_ARG" | tr -cd '0-9+')
case "$DIGITS" in
  +*) PHONE="$DIGITS" ;;
  0*) PHONE="+255${DIGITS#0}" ;;
  *) PHONE="+${DIGITS}" ;;
esac
printf '%s' "$PHONE" | grep -Eq '^\+[1-9][0-9]{7,14}$' || { echo "Not a valid phone number" >&2; exit 1; }
LAST4=$(printf '%s' "$PHONE" | tail -c 4)

DB_USER="${POSTGRES_USER:-harusi}"
DB_NAME="${POSTGRES_DB:-harusi}"

if [ "$LEVEL" = remove ]; then
  OUT=$(psql -U "$DB_USER" -d "$DB_NAME" -X -q -t -A -v ON_ERROR_STOP=1 -v phone="$PHONE" <<'SQL'
UPDATE users SET role_global = 'user', staff_role = NULL, updated_at = now()
WHERE phone_e164 = :'phone'
RETURNING 'removed';
SQL
  )
  [ -n "$OUT" ] && echo "Staff access removed for ...$LAST4" || { echo "No account for ...$LAST4" >&2; exit 1; }
  exit 0
fi

psql -U "$DB_USER" -d "$DB_NAME" -X -q -v ON_ERROR_STOP=1 \
  -v phone="$PHONE" -v name="$NAME" -v level="$LEVEL" <<'SQL'
INSERT INTO users (id, name, phone_e164, role_global, staff_role, status)
VALUES (gen_random_uuid(), :'name', :'phone', 'admin', :'level'::staff_role, 'active')
ON CONFLICT (phone_e164) DO UPDATE
  SET name = EXCLUDED.name,
      role_global = 'admin',
      staff_role = EXCLUDED.staff_role,
      status = 'active',
      suspended_reason = NULL,
      updated_at = now();
SQL

echo "Staff account ready: $NAME (...$LAST4) as $LEVEL."
echo "They sign in at https://my.kadisasa.com with the SMS code, which needs a real SMS provider."
