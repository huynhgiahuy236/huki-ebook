#!/bin/bash
# ============================================
# HUKI EBOOK - PostgreSQL Backup Script
# ============================================
# Usage: ./postgres-backup.sh
# Schedule: Daily at 3:00 AM
# ============================================

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DATE=$(date +%Y%m%d_%H%M%S)
TIMESTAMP=$(date +%Y%m%d)
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Database connections (can override via env)
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-postgres}"
PGPASSWORD="${PGPASSWORD:-postgres123}"

# Export PGPASSWORD to avoid prompt
export PGPASSWORD

# Databases to backup
DATABASES=(
    "huki_identity"
    "huki_business"
    "huki_commerce"
    "huki_shipping"
    "huki_promotion"
)

# Create backup directory
mkdir -p "${BACKUP_DIR}/postgres/${TIMESTAMP}"

echo "========================================"
echo "HUKI EBOOK - PostgreSQL Backup"
echo "========================================"
echo "Date: $(date)"
echo "Backup Directory: ${BACKUP_DIR}/postgres/${TIMESTAMP}"
echo "Retention: ${RETENTION_DAYS} days"
echo "========================================"

# Export function to backup a single database
backup_database() {
    local db=$1
    local backup_file="${BACKUP_DIR}/postgres/${TIMESTAMP}/${db}.sql.gz"

    echo "[$(date +%H:%M:%S)] Backing up: ${db}..."

    # Run pg_dump with compression
    pg_dump -h "${PGHOST}" \
            -p "${PGPORT}" \
            -U "${PGUSER}" \
            -d "${db}" \
            --format=custom \
            --compress=9 \
            --verbose \
            -f "${backup_file}"

    # Verify backup
    if [ -f "${backup_file}" ] && [ -s "${backup_file}" ]; then
        local size=$(du -h "${backup_file}" | cut -f1)
        echo "[$(date +%H:%M:%S)] ✓ ${db} backed up successfully (${size})"
    else
        echo "[$(date +%H:%M:%S)] ✗ ERROR: ${db} backup failed or empty!"
        return 1
    fi
}

# Backup each database
for db in "${DATABASES[@]}"; do
    backup_database "${db}" || {
        echo "[$(date +%H:%M:%S)] ✗ FATAL: Backup failed for ${db}"
        exit 1
    }
done

# Create metadata file
cat > "${BACKUP_DIR}/postgres/${TIMESTAMP}/metadata.json" << EOF
{
    "timestamp": "${DATE}",
    "date": "${TIMESTAMP}",
    "host": "${PGHOST}",
    "port": ${PGPORT},
    "databases": $(printf '%s\n' "${DATABASES[@]}" | jq -R . | jq -s .),
    "retention_days": ${RETENTION_DAYS},
    "backup_type": "full",
    "format": "custom"
}
EOF

# Cleanup old backups
echo ""
echo "[$(date +%H:%M:%S)] Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}/postgres" -type d -mtime +${RETENTION_DAYS} -exec rm -rf {} + 2>/dev/null || true

# Count remaining backups
backup_count=$(find "${BACKUP_DIR}/postgres" -type d -name "20*" | wc -l)
echo "[$(date +%H:%M:%S)] Current backup count: ${backup_count}"

# Summary
echo ""
echo "========================================"
echo "Backup Complete: $(date)"
echo "Backup Location: ${BACKUP_DIR}/postgres/${TIMESTAMP}"
echo "========================================"
