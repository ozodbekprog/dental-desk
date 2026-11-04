#!/usr/bin/env bash
# Consistent online backup of the SQLite database.
# Usage: ./scripts/backup-db.sh [output-dir]
set -euo pipefail

cd "$(dirname "$0")/.."

DB_PATH="${DB_PATH:-prisma/dev.db}"
OUT_DIR="${1:-backups}"

if [ ! -f "$DB_PATH" ]; then
  echo "Database topilmadi: $DB_PATH" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
TARGET="$OUT_DIR/dental-desk-$STAMP.db"

sqlite3 "$DB_PATH" ".backup '$TARGET'"
gzip -f "$TARGET"

# Keep the last 14 daily backups.
ls -1t "$OUT_DIR"/dental-desk-*.db.gz 2>/dev/null | tail -n +15 | xargs -r rm --

echo "Backup tayyor: $TARGET.gz"
