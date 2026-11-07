#!/usr/bin/env bash
# Fas-Nav production local backup (DB + uploads). Run as the deployment operator.
set -euo pipefail
umask 077
APP_DIR="${APP_DIR:-/opt/fas-nav/app}"
cd "$APP_DIR"
command -v docker >/dev/null || { echo "Docker fehlt" >&2; exit 1; }
command -v flock >/dev/null || { echo "flock fehlt" >&2; exit 1; }
command -v sha256sum >/dev/null || { echo "sha256sum fehlt" >&2; exit 1; }
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml)
BASE="${FASNAV_BACKUP_DIR:-$HOME/fas-nav-backups}"
mkdir -p "$BASE"
chmod 700 "$BASE"
exec 9>"$BASE/.backup.lock"
flock -n 9 || { echo "Ein Backup läuft bereits"; exit 0; }
STAMP="$(date -u +'%Y%m%dT%H%M%SZ')"
TMP="$(mktemp -d "$BASE/.incomplete-${STAMP}-XXXX")"
trap 'rm -rf "$TMP"' EXIT
echo "Backup gestartet: $STAMP"
# Database and uploads are exported independently; neither container is stopped.
"${COMPOSE[@]}" exec -T db sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner' > "$TMP/database.dump"
"${COMPOSE[@]}" exec -T app tar -C /app/public/uploads -czf - . > "$TMP/uploads.tar.gz"
test -s "$TMP/database.dump"
test -s "$TMP/uploads.tar.gz"
# Validate structure without restoring to the production database.
"${COMPOSE[@]}" exec -T db pg_restore --list < "$TMP/database.dump" >/dev/null
tar -tzf "$TMP/uploads.tar.gz" >/dev/null
(cd "$TMP"; sha256sum database.dump uploads.tar.gz > SHA256SUMS)
chmod 600 "$TMP"/*
mv "$TMP" "$BASE/$STAMP"
trap - EXIT
# Retain two weeks of local daily snapshots; offsite copies are a separate requirement.
find "$BASE" -mindepth 1 -maxdepth 1 -type d -name '20??????T??????Z' -mtime +14 -exec rm -rf -- {} +
echo "Backup verifiziert: $BASE/$STAMP"
