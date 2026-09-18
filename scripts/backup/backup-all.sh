#!/bin/bash
# ============================================
# HUKI EBOOK - Master Backup Script
# ============================================
# Usage: ./backup-all.sh [options]
# Options:
#   --postgres-only   Backup only PostgreSQL
#   --redis-only     Backup only Redis
#   --verify-only    Verify last backups
#   --list           List available backups
# ============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d)
LOG_DIR="${BACKUP_DIR}/logs"

# Create directories
mkdir -p "${LOG_DIR}" "${BACKUP_DIR}/postgres" "${BACKUP_DIR}/redis"

# Logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_DIR}/backup-${TIMESTAMP}.log"
}

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_success() {
    echo -e "${GREEN}[✓] $1${NC}"
    log "SUCCESS: $1"
}

log_error() {
    echo -e "${RED}[✗] $1${NC}"
    log "ERROR: $1"
}

log_info() {
    echo -e "${YELLOW}[ℹ] $1${NC}"
    log "INFO: $1"
}

# List backups
list_backups() {
    echo ""
    echo "========================================"
    echo "Available Backups"
    echo "========================================"

    if [ -d "${BACKUP_DIR}/postgres" ]; then
        echo ""
        echo "PostgreSQL Backups:"
        ls -la "${BACKUP_DIR}/postgres/" 2>/dev/null || echo "  No backups found"
    fi

    if [ -d "${BACKUP_DIR}/redis" ]; then
        echo ""
        echo "Redis Backups:"
        ls -la "${BACKUP_DIR}/redis/" 2>/dev/null || echo "  No backups found"
    fi
}

# Run backup
run_backup() {
    log_info "Starting backup process..."

    local success=0
    local failed=0

    # PostgreSQL backup
    if [ "$1" != "redis-only" ]; then
        log_info "Backing up PostgreSQL..."
        if bash "${SCRIPT_DIR}/postgres-backup.sh" >> "${LOG_DIR}/backup-${TIMESTAMP}.log" 2>&1; then
            log_success "PostgreSQL backup completed"
            ((success++))
        else
            log_error "PostgreSQL backup failed"
            ((failed++))
        fi
    fi

    # Redis backup
    if [ "$1" != "postgres-only" ]; then
        log_info "Backing up Redis..."
        if bash "${SCRIPT_DIR}/redis-backup.sh" >> "${LOG_DIR}/backup-${TIMESTAMP}.log" 2>&1; then
            log_success "Redis backup completed"
            ((success++))
        else
            log_error "Redis backup failed"
            ((failed++))
        fi
    fi

    echo ""
    echo "========================================"
    echo "Backup Summary"
    echo "========================================"
    echo "Success: ${success}"
    echo "Failed: ${failed}"
    echo "Log: ${LOG_DIR}/backup-${TIMESTAMP}.log"
    echo "========================================"

    if [ ${failed} -eq 0 ]; then
        return 0
    else
        return 1
    fi
}

# Verify backup
run_verify() {
    local test_date="${1:-$(date +%Y%m%d)}"
    log_info "Verifying backups for date: ${test_date}..."

    if bash "${SCRIPT_DIR}/verify-backup.sh" "${test_date}"; then
        log_success "Backup verification completed"
        return 0
    else
        log_error "Backup verification failed"
        return 1
    fi
}

# Main
case "${1:-}" in
    --postgres-only)
        run_backup "postgres-only"
        ;;
    --redis-only)
        run_backup "redis-only"
        ;;
    --verify-only)
        run_verify "${2}"
        ;;
    --list)
        list_backups
        ;;
    --help|-h)
        echo "HUKI EBOOK Backup Script"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --postgres-only   Backup only PostgreSQL"
        echo "  --redis-only     Backup only Redis"
        echo "  --verify-only    Verify last backups"
        echo "  --verify [date]  Verify backups for specific date"
        echo "  --list           List available backups"
        echo "  --help, -h       Show this help"
        ;;
    *)
        run_backup
        ;;
esac
