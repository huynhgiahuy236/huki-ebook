#!/bin/bash
# ============================================
# PostgreSQL - Create Multiple Databases
# ============================================

set -e
set -u

echo "Creating databases..."

# Split by comma
IFS=',' read -ra DBS <<< "$POSTGRES_MULTIPLE_DATABASES"
for db in "${DBS[@]}"; do
    echo "Creating database: $db"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
        CREATE DATABASE $db;
EOSQL
    echo "Database $db created successfully"
done

echo "All databases created!"
