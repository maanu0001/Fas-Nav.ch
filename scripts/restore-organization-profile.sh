#!/usr/bin/env bash
# Restore a single organization's editorial profile from the isolated restore-test DB.
# Financial data, users, memberships, billing, media and linked records remain untouched.
set -Eeuo pipefail
umask 077
cd "${APP_DIR:-/opt/fas-nav/app}"
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml)
ORG="${1:-}"
[[ "$ORG" =~ ^[a-zA-Z0-9_-]{8,64}$ ]] || { echo "Invalid organization ID" >&2; exit 2; }
[[ "${FASNAV_CONFIRM_ORG_RESTORE:-}" == "$ORG" ]] || { echo "Set FASNAV_CONFIRM_ORG_RESTORE=$ORG" >&2; exit 2; }
[[ "${FASNAV_MAINTENANCE_CONFIRMED:-}" == YES ]] || { echo "Maintenance mode required" >&2; exit 2; }
exec 9>"${FASNAV_RECOVERY_LOCK:-/tmp/fasnav-full-restore.lock}"
flock -n 9 || exit 1
TEST_DB="${BACKUP_TEST_DB_PASSWORD:-}"
[[ -n "$TEST_DB" ]] || { echo "BACKUP_TEST_DB_PASSWORD is required" >&2; exit 2; }
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
# Explicit allowlist of editorial columns. Never restore billing, login, media FK or IDs.
FIELDS='name,shortName,tagline,shortDescription,description,history,importantInfo,contactName,contactEmail,contactPhone,website,bookingEmail,motto,bookingInfo,arrivalByCar,arrivalByPublicTransport,arrivalNotes,arrivalMapUrl,arrivalTransportUrl,metaTitle,metaDesc'
# Query information_schema to ensure this installation uses exactly the expected columns.
IFS=, read -ra COLS <<< "$FIELDS"
for col in "${COLS[@]}"; do
  [[ "$col" =~ ^[a-zA-Z]+$ ]] || exit 2
done
SELECT_FIELDS="$(printf '"%s",' "${COLS[@]}")"
SELECT_FIELDS="${SELECT_FIELDS%,}"
# Test database is a separate PostgreSQL server and must contain a tested snapshot.
"${COMPOSE[@]}" --profile backup-test exec -T -e PGPASSWORD="$TEST_DB" backup_test_db \
 psql -X -A -t -v ON_ERROR_STOP=1 -U backupcheck -d backupcheck \
 -c "SELECT row_to_json(t) FROM (SELECT $SELECT_FIELDS FROM organizations WHERE id = '$ORG') t" > "$WORK/profile.json"
[[ -s "$WORK/profile.json" ]] || { echo "Organization not present in test backup" >&2; exit 1; }
python3 - "$WORK/profile.json" <<'PY'
import json,sys
with open(sys.argv[1]) as f: data=json.load(f)
if not isinstance(data,dict): raise SystemExit('Invalid organization profile')
PY
echo "Profile preview (sensitive fields omitted):"
echo "Organization: $ORG"
echo "Columns: $SELECT_FIELDS"
[[ "${FASNAV_APPLY_ORG_RESTORE:-}" == YES ]] || { echo "Preview only. Set FASNAV_APPLY_ORG_RESTORE=YES to apply"; exit 0; }
# Persistent full rollback dump before changing even a single organization row.
SAFE="${FASNAV_BACKUP_DIR:-$HOME/fas-nav-backups}/pre-org-restore-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$SAFE"
chmod 700 "$SAFE"
"${COMPOSE[@]}" exec -T db sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner' > "$SAFE/database.dump"
"${COMPOSE[@]}" exec -T db pg_restore --list < "$SAFE/database.dump" >/dev/null
# Safely pass JSON through base64 and psql variables, never interpolate profile values into SQL.
PAYLOAD="$(base64 -w 0 "$WORK/profile.json")"
SQL="BEGIN;
SELECT 1 / (SELECT count(*)::integer FROM organizations WHERE id = :'org_id');
WITH incoming AS (
 SELECT jsonb_populate_record(NULL::organizations, convert_from(decode(:'payload','base64'),'UTF8')::jsonb) AS row
)
UPDATE organizations AS live SET
$(printf '%s\n' "${COLS[@]}" | awk '{printf "\\"%s\\" = (SELECT (row).\\"%s\\" FROM incoming),\\n",$1,$1}' | sed '$ s/,$//')
WHERE live.id = :'org_id';
COMMIT;"
"${COMPOSE[@]}" exec -T db sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" exec psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
 <<< "\\set org_id '$ORG'
\\set payload '$PAYLOAD'
$SQL"
echo "Editorial organization profile restored. Rollback snapshot: $SAFE"
