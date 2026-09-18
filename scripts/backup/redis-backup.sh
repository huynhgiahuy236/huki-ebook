#!/bin/bash
# ============================================
# HUKI EBOOK - Redis Backup Script
# ============================================
# Usage: ./redis-backup.sh
# Schedule: Hourly
# ============================================

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DATE=$(date +%Y%m%d_%H%M%S)
TIMESTAMP=$(date +%Y%m%d)
RETENTION_DAYS="${RETENTION_DAYS:-7}"

# Redis connection
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"

# Create backup directory
mkdir -p "${BACKUP_DIR}/redis/${TIMESTAMP}"

echo "========================================"
echo "HUKI EBOOK - Redis Backup"
echo "========================================"
echo "Date: $(date)"
echo "Backup Directory: ${BACKUP_DIR}/redis/${TIMESTAMP}"
echo "Retention: ${RETENTION_DAYS} days"
echo "========================================"

# Redis backup function
perform_backup() {
    local backup_file="${BACKUP_DIR}/redis/${TIMESTAMP}/dump.rdb.gz"

    echo "[$(date +%H:%M:%S)] Starting Redis backup..."

    # Use redis-cli to trigger BGSAVE (non-blocking)
    # Then copy the dump file
    if [ -n "${REDIS_PASSWORD}" ]; then
        redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" -a "${REDIS_PASSWORD}" BGSAVE
    else
        redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" BGSAVE
    fi

    # Wait for BGSAVE to complete
    echo "[$(date +%H:%M:%S)] Waiting for BGSAVE to complete..."
    while true; do
        local lastsave=$(redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" ${REDIS_PASSWORD:+-a "${REDIS_PASSWORD}"} LASTSAVE)
        sleep 1
        local new_lastsave=$(redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" ${REDIS_PASSWORD:+-a "${REDIS_PASSWORD}"} LASTSAVE)
        if [ "${lastsave}" != "${new_lastsave}" ]; then
            break
        fi
    done

    # Copy and compress
    local src_file="${REDIS_DATA_DIR:-/data}/dump.rdb"

    # Try to get the actual dump file location
    if docker ps | grep -q redis; then
        # Docker container - copy from container
        docker cp "huki-redis:/data/dump.rdb" "${BACKUP_DIR}/redis/${TIMESTAMP}/dump.rdb" 2>/dev/null || \
        docker cp "redis:/data/dump.rdb" "${BACKUP_DIR}/redis/${TIMESTAMP}/dump.rdb" 2>/dev/null || \
        echo "[$(date +%H:%M:%S)] Warning: Could not copy dump.rdb from Docker"
    fi

    # Also use CONFIG GET to find dump file location
    if [ -f "${src_file}" ]; then
        gzip -c "${src_file}" > "${backup_file}"
    fi

    # Verify backup
    if [ -f "${backup_file}" ] && [ -s "${backup_file}" ]; then
        local size=$(du -h "${backup_file}" | cut -f1)
        echo "[$(date +%H:%M:%S)] ✓ Redis backed up successfully (${size})"
    else
        echo "[$(date +%H:%M:%S)] ✗ WARNING: Redis backup file not found or empty"
        echo "[$(date +%H:%M:%S)] Redis may not support BGSAVE, trying alternative..."

        # Alternative: Use redis-cli SAVE (blocking) and copy
        if [ -n "${REDIS_PASSWORD}" ]; then
            redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" -a "${REDIS_PASSWORD}" SAVE
        else
            redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" SAVE
        fi

        if [ -f "${src_file}" ]; then
            gzip -c "${src_file}" > "${backup_file}"
            if [ -s "${backup_file}" ]; then
                local size=$(du -h "${backup_file}" | cut -f1)
                echo "[$(date +%H:%M:%S)] ✓ Redis backed up via SAVE (${size})"
            fi
        fi
    fi
}

perform_backup

# Create metadata
cat > "${BACKUP_DIR}/redis/${TIMESTAMP}/metadata.json" << EOF
{
    "timestamp": "${DATE}",
    "date": "${TIMESTAMP}",
    "host": "${REDIS_HOST}",
    "port": ${REDIS_PORT},
    "retention_days": ${RETENTION_DAYS},
    "backup_type": "rdb",
    "format": "gzip"
}
EOF

# Cleanup old backups
echo ""
echo "[$(date +%H:%M:%S)] Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}/redis" -type f -name "*.rdb.gz" -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true
find "${BACKUP_DIR}/redis" -type d -mtime +${RETENTION_DAYS} -exec rm -rf {} + 2>/dev/null || true

echo ""
echo "========================================"
echo "Redis Backup Complete: $(date)"
echo "========================================"
