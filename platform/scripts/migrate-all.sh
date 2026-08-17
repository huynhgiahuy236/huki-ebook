#!/bin/bash
# ============================================
# HUKI EBOOK - Database Migration Script
# ============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLATFORM_DIR="$(dirname "$SCRIPT_DIR")"

# Load .env file
if [ -f "$PLATFORM_DIR/.env" ]; then
  export $(cat "$PLATFORM_DIR/.env" | grep -v '^#' | xargs)
fi

echo "============================================"
echo "HUKI EBOOK - Database Migration"
echo "============================================"

# Function to migrate a Prisma service
migrate_prisma() {
  local service=$1
  local db_name=$2

  echo ""
  echo ">>> Migrating $service -> $db_name"

  cd "$PLATFORM_DIR/apps/$service"
  export DATABASE_URL="postgresql://$DATABASE_USER:$DATABASE_PASSWORD@$DATABASE_HOST:$DATABASE_PORT/$db_name"

  if [ ! -d "prisma/migrations" ]; then
    echo "Creating initial migration..."
    npx prisma migrate dev --name init --create-only
  fi

  npx prisma migrate deploy
  echo "✓ $service migrated"
}

# Migrate all Prisma services
migrate_prisma "identity-service" "identity_db"
migrate_prisma "business-service" "business_db"
migrate_prisma "shipping-service" "shipping_db"
migrate_prisma "promotion-service" "promotion_db"

echo ""
echo "============================================"
echo "All migrations complete!"
echo "============================================"
