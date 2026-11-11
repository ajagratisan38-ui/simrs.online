#!/bin/bash
# ═══════════════════════════════════════
# SIMRS SaaS — Database Backup Script
# Usage: ./backup.sh [daily|weekly|manual]
# ═══════════════════════════════════════

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
POSTGRES_USER="${POSTGRES_USER:-simrs}"
POSTGRES_DB="${POSTGRES_DB:-simrs_db}"
CONTAINER="${POSTGRES_CONTAINER:-simrs-postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_TYPE="${1:-manual}"

mkdir -p "${BACKUP_DIR}"

FILENAME="${BACKUP_DIR}/${POSTGRES_DB}_${BACKUP_TYPE}_${TIMESTAMP}.sql.gz"

echo "╔══════════════════════════════════════╗"
echo "║   SIMRS Database Backup              ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "  Database : ${POSTGRES_DB}"
echo "  Type     : ${BACKUP_TYPE}"
echo "  Output   : ${FILENAME}"
echo ""

docker exec "${CONTAINER}" pg_dump \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DB}" \
  --no-owner \
  --no-privileges \
  --format=plain \
  | gzip > "${FILENAME}"

SIZE=$(du -h "${FILENAME}" | cut -f1)
echo "  ✓ Backup complete: ${SIZE}"

# Cleanup old backups
if [ "${RETENTION_DAYS}" -gt 0 ]; then
  DELETED=$(find "${BACKUP_DIR}" -name "*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete -print | wc -l)
  echo "  ✓ Cleaned up ${DELETED} old backup(s) (>${RETENTION_DAYS} days)"
fi

echo ""
echo "  Done."
