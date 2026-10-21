#!/usr/bin/env bash
# ========================================================
# HUKI EBOOK - Production Rollback Script
# Standardized rollback procedure for backend & web
# ========================================================

set -euo pipefail

TARGET_REF="${1:-HEAD~1}"
BACKUP_DIR="${2:-./backups/postgres}"

echo "===================================================="
echo "   HUKI EBOOK Rollback Initiated"
echo "   Target Git Ref: ${TARGET_REF}"
echo "   Database Backup Dir: ${BACKUP_DIR}"
echo "===================================================="

# Step 1: Save state of failed release for post-mortem
FAILED_COMMIT=$(git rev-parse HEAD)
echo "[1/5] Failed release commit: ${FAILED_COMMIT}"

# Step 2: Rollback codebase
echo "[2/5] Checking out target ref: ${TARGET_REF}..."
git fetch origin
git checkout "${TARGET_REF}"

# Step 3: Rebuild services
echo "[3/5] Recompiling platform..."
cd platform
npm ci
npm run prisma:generate
npm run build

# Step 4: Restart services
echo "[4/5] Restarting microservices..."
for process in api-gateway identity-service business-service commerce-service shipping-service community-service promotion-service analytics-service; do
  pm2 restart "$process" --update-env || pm2 start "dist/out-tsc/$process/apps/$process/src/main.js" --name "$process" --update-env
done

# Step 5: Verify health & rollback success
echo "[5/5] Running post-rollback smoke tests..."
sleep 8
cd ..
node scripts/deploy/smoke-test.mjs

echo "===================================================="
echo "   Rollback Completed Successfully to ${TARGET_REF}"
echo "===================================================="
