#!/usr/bin/env bash
# PostgreSQL backup script for CareerPilot.
# Usage:
#   DATABASE_URL="postgresql://user:pass@localhost:5432/careerpilot?schema=public" \
#   BACKUP_DIR=./backups ./scripts/backup-postgres.sh
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required (postgres://...)}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"

STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$BACKUP_DIR/careerpilot-$STAMP.sql.gz"

# Parse components out of the connection URL.
HOST="$(printf '%s' "$DATABASE_URL" | sed -E 's#^postgres(ql)?://[^@]*@([^:/]+).*#\2#')"
PORT="$(printf '%s' "$DATABASE_URL" | sed -E 's#^postgres(ql)?://[^@]*@[^:/]+:([0-9]+).*#\1#')"
DB="$(printf '%s' "$DATABASE_URL" | sed -E 's#.*/([^/?]+).*#\1#')"
USERNAME="$(printf '%s' "$DATABASE_URL" | sed -E 's#^postgres(ql)?://([^:]*):.*#\2#')"

echo "Backing up database '$DB' on $HOST:$PORT to $FILE"
pg_dump -h "$HOST" -p "$PORT" -U "$USERNAME" -d "$DB" --no-owner --no-privileges | gzip > "$FILE"

echo "Done. Retain the last N backups with a cron job:"
echo "  find $BACKUP_DIR -name 'careerpilot-*.sql.gz' -mtime +7 -delete"
