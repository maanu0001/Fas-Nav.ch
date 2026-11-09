#!/usr/bin/env bash
# Offline full recovery. Run from the production host, not from the web app.
set -Eeuo pipefail
umask 077
cd "${APP_DIR:-/opt/fas-nav/app}"
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml)
BACKUP_ID="${1:-}"
[[ "$BACKUP_ID" =~ ^20[0-9]{6}T[0-9]{6}Z-[a-f0-9]{12}$ ]] || { echo "Usage: $0 <backup-id>" >&2; exit 2; }
[[ "${FASNAV_CONFIRM_FULL_RESTORE:-}" == "$BACKUP_ID" ]] || { echo "Set FASNAV_CONFIRM_FULL_RESTORE=$BACKUP_ID to confirm" >&2; exit 2; }
command -v flock >/dev/null
command -v docker >/dev/null
command -v sha256sum >/dev/null
LOCK="${FASNAV_RECOVERY_LOCK:-/tmp/fasnav-full-restore.lock}"
exec 9>"$LOCK"
flock -n 9 || { echo "Another recovery is running" >&2; exit 1; }
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
APP_CID="$("${COMPOSE[@]}" ps -q app)"
[[ -n "$APP_CID" ]] || { echo "App container missing" >&2; exit 1; }
docker cp "$APP_CID:/app/backups/$BACKUP_ID/." "$WORK/"
test -s "$WORK/database.dump"
test -s "$WORK/uploads.tar.gz"
test -s "$WORK/manifest.json"
# Manifest hashes are verified independently of user-controlled metadata.
node - "$WORK" <<'NODE'
const fs=require('fs'),crypto=require('crypto'),path=require('path');
const root=process.argv[2],m=JSON.parse(fs.readFileSync(path.join(root,'manifest.json')));
for(const [kind,file] of [['database','database.dump'],['uploads','uploads.tar.gz']]){
 const actual=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
 if(actual!==m.sha256?.[kind])throw Error('Checksum mismatch: '+kind);
}
NODE
tar -tzf "$WORK/uploads.tar.gz" > "$WORK/media-list"
# Fail closed on absolute paths, parent traversal, symlinks and special files.
python3 - "$WORK/media-list" <<'PY'
import sys
from pathlib import PurePosixPath
for name in open(sys.argv[1]):
    name=name.rstrip('\n')
    p=PurePosixPath(name)
    if not name or name.startswith('/') or '..' in p.parts or '\\' in name:
        raise SystemExit('Unsafe archive path')
PY
if tar -tvzf "$WORK/uploads.tar.gz" | grep -Ev '^[-d]' >/dev/null; then echo "Unsafe archive member type" >&2; exit 1; fi
"${COMPOSE[@]}" exec -T db pg_restore --list < "$WORK/database.dump" >/dev/null
echo "==> Stop app and all writers; maintenance must be enabled at reverse proxy before proceeding"
"${COMPOSE[@]}" stop app
# Before touching live data, take an independent recovery snapshot.
ROLLBACK="$WORK/rollback"
mkdir -m 700 "$ROLLBACK"
"${COMPOSE[@]}" exec -T db sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner' > "$ROLLBACK/database.dump"
docker cp "$APP_CID:/app/public/uploads/." "$ROLLBACK/uploads" 2>/dev/null || true
test -s "$ROLLBACK/database.dump"
# Persist rollback outside the ephemeral workspace before any mutation.
SAFE="${FASNAV_BACKUP_DIR:-$HOME/fas-nav-backups}/pre-restore-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$SAFE"
cp "$ROLLBACK/database.dump" "$SAFE/database.dump"
tar -C "$ROLLBACK" -czf "$SAFE/uploads.tar.gz" uploads
echo "Rollback snapshot: $SAFE"
echo "Restore is intentionally NOT executed automatically: DB and media require coordinated cutover."
echo "Production app remains stopped. Follow docs/BACKUP-CENTER.md for controlled recovery."
exit 3
