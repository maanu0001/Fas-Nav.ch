#!/usr/bin/env bash
# Full production recovery with automatic rollback on detected failure.
# Requires external reverse-proxy maintenance mode and all external writers stopped.
set -Eeuo pipefail
umask 077
cd "${APP_DIR:-/opt/fas-nav/app}"
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml)
ID="${1:-}"
[[ "$ID" =~ ^20[0-9]{6}T[0-9]{6}Z-[a-f0-9]{12}$ ]] || { echo "Invalid backup ID" >&2; exit 2; }
[[ "${FASNAV_CONFIRM_FULL_RESTORE:-}" == "$ID" ]] || { echo "Set FASNAV_CONFIRM_FULL_RESTORE=$ID" >&2; exit 2; }
[[ "${FASNAV_MAINTENANCE_CONFIRMED:-}" == YES ]] || { echo "Maintenance mode and external writers must be stopped" >&2; exit 2; }
for c in docker flock node tar python3; do command -v "$c" >/dev/null || exit 2; done
exec 9>"${FASNAV_RECOVERY_LOCK:-/tmp/fasnav-full-restore.lock}"
flock -n 9 || { echo "Another restore is running" >&2; exit 1; }
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
APP_CID="$("${COMPOSE[@]}" ps -q app)"
[[ -n "$APP_CID" ]] || { echo "Application container missing" >&2; exit 1; }
docker cp "$APP_CID:/app/backups/$ID/." "$WORK/"
node - "$WORK" "$ID" <<'NODE'
const fs=require('fs'),crypto=require('crypto'),path=require('path');
const root=process.argv[2],id=process.argv[3],m=JSON.parse(fs.readFileSync(path.join(root,'manifest.json')));
if(m.id!==id||m.verified!==true||m.restoreTest?.status!=='passed')throw Error('Backup must have passed isolated restore test');
for(const [kind,file] of [['database','database.dump'],['uploads','uploads.tar.gz']]){
 const actual=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
 if(actual!==m.sha256?.[kind]||actual!==m.restoreTest?.[kind+'Hash'])throw Error('Checksum mismatch: '+kind);
}
NODE
"${COMPOSE[@]}" exec -T db pg_restore --list < "$WORK/database.dump" >/dev/null
tar -tzf "$WORK/uploads.tar.gz" > "$WORK/media-list"
python3 - "$WORK/media-list" <<'PY'
import sys
from pathlib import PurePosixPath
for line in open(sys.argv[1]):
    name=line.rstrip('\n')
    if not name or name.startswith('/') or '..' in PurePosixPath(name).parts or '\\' in name:
        raise SystemExit('Unsafe media path')
PY
if tar -tvzf "$WORK/uploads.tar.gz" | grep -Ev '^[-d]' >/dev/null; then echo "Archive contains links or special files" >&2; exit 1; fi
# Pre-extract safely before stopping application.
mkdir "$WORK/restore-uploads"
tar -xzf "$WORK/uploads.tar.gz" -C "$WORK/restore-uploads" --no-same-owner --no-same-permissions
SAFE="${FASNAV_BACKUP_DIR:-$HOME/fas-nav-backups}/pre-restore-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$SAFE"
chmod 700 "$SAFE"
# Store independent rollback snapshot before any mutation.
"${COMPOSE[@]}" exec -T db sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner' > "$SAFE/database.dump"
mkdir -p "$WORK/previous-uploads"
docker cp "$APP_CID:/app/public/uploads/." "$WORK/previous-uploads/"
tar -C "$WORK/previous-uploads" -czf "$SAFE/uploads.tar.gz" .
"${COMPOSE[@]}" exec -T db pg_restore --list < "$SAFE/database.dump" >/dev/null
tar -tzf "$SAFE/uploads.tar.gz" >/dev/null
echo "Rollback snapshot: $SAFE"
# Database restore uses the PostgreSQL 16 client inside the database container.
restore_db() {
 local dump="$1"
 "${COMPOSE[@]}" exec -T db sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"'
 "${COMPOSE[@]}" exec -T db sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" pg_restore --no-owner --no-acl --exit-on-error -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < "$dump"
}
restore_media() {
 local archive="$1"
 local container="$MEDIA_CID"
 [[ -n "$container" ]]
 # Volume persists across container restart; remove old media before copying replacement.
 docker exec "$container" sh -c 'find /app/public/uploads -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +'
 docker cp "$archive/." "$container:/app/public/uploads/"
}
rollback() {
 trap - ERR
 echo "Restore failed; attempting rollback" >&2
 restore_db "$SAFE/database.dump" || echo "CRITICAL: database rollback failed" >&2
 mkdir -p "$WORK/rollback-uploads"
 tar -xzf "$SAFE/uploads.tar.gz" -C "$WORK/rollback-uploads"
 restore_media "$WORK/rollback-uploads" || echo "CRITICAL: media rollback failed" >&2
 "${COMPOSE[@]}" start app || true
 echo "Maintenance mode remains required until manual verification. Rollback snapshot: $SAFE" >&2
}
MEDIA_CID="$(docker run -d --rm --volumes-from "$APP_CID" --entrypoint sh "$(docker inspect -f '{{.Config.Image}}' "$APP_CID")" -c "sleep 3600")"
trap 'docker rm -f "$MEDIA_CID" >/dev/null 2>&1 || true; rm -rf "$WORK"' EXIT
trap rollback ERR
"${COMPOSE[@]}" stop app
restore_db "$WORK/database.dump"
restore_media "$WORK/restore-uploads"
"${COMPOSE[@]}" start app
container="$("${COMPOSE[@]}" ps -q app)"
healthy=0
for i in $(seq 1 30); do
 status="$(docker inspect -f '{{.State.Health.Status}}' "$container" 2>/dev/null || echo unknown)"
 if [[ "$status" == healthy ]]; then healthy=1; break; fi
 sleep 5
done
[[ "$healthy" == 1 ]] || { echo "Health check failed" >&2; false; }
trap - ERR
docker rm -f "$MEDIA_CID" >/dev/null 2>&1 || true
echo "Restore completed; verify application data before removing maintenance mode."
