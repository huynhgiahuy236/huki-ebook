#!/bin/bash
# ============================================
# HUKI EBOOK - Verify Backups Script
# ============================================
# Usage: ./verify-backup.sh [date]
# Example: ./verify-backup.sh 20260917
# ============================================

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TEST_DATE="${1:-$(date +%Y%m%d)}"

# Test database connection
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-postgres}"
PGPASSWORD="${PGPASSWORD:-postgres123}"
export PGPASSWORD

echo "========================================"
echo "HUKI EBOOK - Backup Verification"
echo "========================================"
echo "Test Date: ${TEST_DATE}"
echo "========================================"

# PostgreSQL verification
verify_postgres() {
    local db=$1
    local backup_file="${BACKUP_DIR}/postgres/${TEST_DATE}/${db}.sql.gz"

    echo ""
    echo "[PostgreSQL] Testing: ${db}"

    if [ ! -f "${backup_file}" ]; then
        echo "[PostgreSQL] ✗ Backup file not found: ${backup_file}"
        return 1
    fi

    # Test with pg_restore --list (doesn't restore, just lists contents)
    echo "[PostgreSQL] Verifying backup integrity..."
    if gunzip -c "${backup_file}" | pg_restore -l > /dev/null 2>&1; then
        local size=$(du -h "${backup_file}" | cut -f1)
        echo "[PostgreSQL] ✓ ${db} backup is valid (${size})"

        # Try to restore to a test database
        local test_db="${db}_test_$(date +%s)"
        echo "[PostgreSQL] Creating test database: ${test_db}"

        # Create test DB
        psql -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -tc "DROP DATABASE IF EXISTS ${test_db}" > /dev/null
        psql -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -tc "CREATE DATABASE ${test_db}" > /dev/null

        # Restore to test DB
        if gunzip -c "${backup_file}" | psql -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d "${test_db}" > /dev/null 2>&1; then
            echo "[PostgreSQL] ✓ ${db} restored successfully to test DB"

            # Check table count
            local table_count=$(psql -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d "${test_db}" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'" | tr -d ' ')
            echo "[PostgreSQL] Tables in ${db}: ${table_count}"

            # Cleanup test DB
            psql -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -tc "DROP DATABASE ${test_db}" > /dev/null
            echo "[PostgreSQL] Test database cleaned up"
        else
            echo "[PostgreSQL] ✗ ${db} restore failed"
            psql -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -tc "DROP DATABASE IF EXISTS ${test_db}" > /dev/null
            return 1
        fi
    else
        echo "[PostgreSQL] ✗ ${db} backup is corrupted"
        return 1
    fi
}

# Redis verification
verify_redis() {
    local backup_file="${BACKUP_DIR}/redis/${TEST_DATE}/dump.rdb.gz"

    echo ""
    echo "[Redis] Testing backup..."

    if [ ! -f "${backup_file}" ]; then
        echo "[Redis] ✗ Backup file not found: ${backup_file}"
        return 1
    fi

    # Check if it's a valid gzip file
    if gzip -t "${backup_file}" 2>/dev/null; then
        local size=$(du -h "${backup_file}" | cut -f1)
        echo "[Redis] ✓ Redis backup is valid gzip (${size})"

        # Extract and check if it's a valid RDB
        local temp_file=$(mktemp)
        if gunzip -c "${backup_file}" > "${temp_file}" 2>/dev/null; then
            # Check RDB magic number
            if head -c 5 "${temp_file}" | od -An -tx1 | tr -d ' ' | grep -q "52454449"; then
                echo "[Redis] ✓ Redis backup has valid RDB format"
            else
                echo "[Redis] ⚠ Redis backup may not be valid RDB format"
            fi
            rm -f "${temp_file}"
        fi
    else
        echo "[Redis] ✗ Redis backup is not a valid gzip file"
        return 1
    fi
}

# Main
echo ""
echo "Verifying PostgreSQL backups..."
DATABASES=("huki_identity" "huki_business" "huki_commerce" "huki_shipping" "huki_promotion")
postgres_success=0
for db in "${DATABASES[@]}"; do
    if verify_postgres "${db}"; then
        ((postgres_success++))
    fi
done

echo ""
verify_redis || true

# Summary
echo ""
echo "========================================"
echo "Verification Summary"
echo "========================================"
echo "PostgreSQL: ${postgres_success}/5 databases verified"
echo "Date tested: ${TEST_DATE}"
echo "========================================"

if [ ${postgres_success} -eq 5 ]; then
    echo "✓ All backups verified successfully"
    exit 0
else
    echo "✗ Some backups failed verification"
    exit 1
fi
