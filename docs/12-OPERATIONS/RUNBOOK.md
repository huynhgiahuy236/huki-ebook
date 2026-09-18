# HUKI EBOOK - OPERATIONS RUNBOOK

## Table of Contents

1. [Service Restart Procedure](#1-service-restart-procedure)
2. [Database Failover](#2-database-failover)
3. [Redis Cache Flush](#3-redis-cache-flush)
4. [Deployment Rollback](#4-deployment-rollback)
5. [High CPU/Memory Investigation](#5-high-cpumemory-investigation)
6. [Payment Issue Investigation](#6-payment-issue-investigation)
7. [Inventory Desync Resolution](#7-inventory-desync-resolution)
8. [Backup Restore Procedure](#8-backup-restore-procedure)

---

## 1. Service Restart Procedure

### When to Use
- Service responding with 5xx errors
- Service unresponsive to health checks
- High memory/CPU that won't recover
- After configuration changes

### Procedure

```bash
# 1. Check current service status
docker ps | grep <service-name>

# 2. Check service logs before restart
docker logs <service-name> --tail=100

# 3. Restart the service
docker-compose restart <service-name>

# 4. Wait for health check
sleep 10

# 5. Verify service is healthy
curl http://localhost:<port>/api/v1/health

# 6. Check logs for errors after restart
docker logs <service-name> --tail=50
```

### Service Ports Reference

| Service | Port | Container Name |
|---------|------|---------------|
| api-gateway | 3000 | huki-api-gateway |
| identity-service | 3001 | huki-identity |
| business-service | 3002 | huki-business |
| commerce-service | 3003 | huki-commerce |
| shipping-service | 3004 | huki-shipping |
| community-service | 3005 | huki-community |
| promotion-service | 3006 | huki-promotion |

### Rollback if Restart Fails

```bash
# If service won't start after restart
docker-compose down <service-name>
docker-compose up -d <service-name>

# Check for port conflicts
netstat -ano | findstr :<port>
```

---

## 2. Database Failover

### When to Use
- PostgreSQL connection failures
- Database corruption suspected
- Primary database unreachable
- Maintenance window required

### Procedure

```bash
# 1. Check PostgreSQL status
docker ps | grep postgres
docker exec huki-postgres pg_isready

# 2. Attempt to restart PostgreSQL
docker-compose restart postgres

# 3. Wait for recovery
sleep 30

# 4. Verify connections
docker exec huki-postgres psql -U postgres -c "SELECT 1;"

# 5. Check all databases
docker exec huki-postgres psql -U postgres -c "\l"
```

### Emergency: Complete Database Recovery

```bash
# 1. STOP ALL SERVICES FIRST
docker-compose stop

# 2. Backup current data (if accessible)
docker exec huki-postgres pg_dump -U postgres > /tmp/emergency_backup_$(date +%Y%m%d_%H%M%S).sql

# 3. Stop PostgreSQL
docker-compose stop postgres

# 4. Remove corrupted volume
docker volume rm huki-postgres-data

# 5. Start fresh PostgreSQL
docker-compose up -d postgres

# 6. Wait for initialization
sleep 60

# 7. Restore from latest backup
gunzip < backups/postgres/$(ls -t backups/postgres/ | head -1)/huki_commerce.sql.gz | \
  docker exec -i huki-postgres psql -U postgres -d huki_commerce

# 8. Restart all services
docker-compose up -d
```

### Connection String Check

```bash
# Verify connection strings in .env
cat .env | grep DATABASE_URL
cat .env | grep POSTGRES_
```

---

## 3. Redis Cache Flush

### When to Use
- Stale data issues
- Redis memory at 100%
- Cache poisoning suspected
- After data migration

### Procedure

```bash
# 1. Check Redis status
docker exec huki-redis redis-cli ping
docker exec huki-redis redis-cli info memory

# 2. Identify problematic keys
docker exec huki-redis redis-cli --bigkeys
docker exec huki-redis redis-cli keys "*" | wc -l

# 3. Flush specific key patterns (RECOMMENDED)
# Flush expired sessions only
docker exec huki-redis redis-cli --scan --pattern "session:*" | xargs -r docker exec huki-redis redis-cli del

# Flush cart data
docker exec huki-redis redis-cli --scan --pattern "cart:*" | xargs -r docker exec huki-redis redis-cli del

# 4. FULL FLUSH (if necessary)
docker exec huki-redis redis-cli FLUSHDB

# 5. Verify flush
docker exec huki-redis redis-cli DBSIZE
```

### Selective Flush by Data Type

```bash
# Sessions
docker exec huki-redis redis-cli KEYS "session:*" | xargs -r redis-cli DEL

# Cart
docker exec huki-redis redis-cli KEYS "cart:*" | xargs -r redis-cli DEL

# Rate limiting
docker exec huki-redis redis-cli KEYS "ratelimit:*" | xargs -r redis-cli DEL

# Cached API responses
docker exec huki-redis redis-cli KEYS "cache:*" | xargs -r redis-cli DEL
```

---

## 4. Deployment Rollback

### When to Use
- New deployment causing errors
- Critical bug in production
- Performance regression
- Failed health checks after deploy

### Quick Rollback (Docker Compose)

```bash
# 1. Identify the issue
docker-compose logs --tail=100 | grep -E "ERROR|error|exception"

# 2. Get current commit
git log --oneline -1

# 3. Get previous working commit
git log --oneline -5

# 4. Checkout previous commit
git checkout <previous-commit-hash>

# 5. Rebuild the affected service
docker-compose build <service-name>

# 6. Restart the service
docker-compose up -d <service-name>

# 7. Verify rollback
curl http://localhost:<port>/api/v1/health
```

### Rollback to Specific Tag

```bash
# 1. List available tags
git tag -l | tail -10

# 2. Checkout specific tag
git checkout tags/<tag-name> -b rollback

# 3. Deploy
docker-compose up -d --build

# 4. Verify
curl http://localhost:3000/api/v1/health
```

### Kubernetes Rollback

```bash
# Check rollout history
kubectl rollout history deployment/<service-name>

# Rollback to previous revision
kubectl rollout undo deployment/<service-name>

# Rollback to specific revision
kubectl rollout undo deployment/<service-name> --to-revision=<n>

# Verify rollback
kubectl rollout status deployment/<service-name>
```

---

## 5. High CPU/Memory Investigation

### When to Use
- Alert: HighMemoryUsage
- Alert: HighCPUUsage
- Service sluggish or unresponsive
- OOM kills detected

### Investigation Procedure

```bash
# 1. Check overall system resources
docker stats

# 2. Identify top resource consumers
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# 3. Check specific service memory
docker exec <container-name> free -h

# 4. Check for memory leaks (Node.js)
docker exec <container-name> node --max-old-space-size=512 -e "console.log(process.memoryUsage())"

# 5. Check for infinite loops or blocking operations
docker logs <container-name> --tail=500 | grep -E "warning|WARN|slow"
```

### Memory Troubleshooting

```bash
# Check if OOM killer is active
dmesg | grep -i "killed process"

# Check container memory limits
docker inspect <container-name> | grep -A 5 Memory

# Increase memory limit in docker-compose.yml
# Then restart:
docker-compose up -d --scale <service-name>=0
docker-compose up -d <service-name>
```

### CPU Troubleshooting

```bash
# Find process using CPU
docker exec <container-name> top -bn1 | head -20

# Check for runaway loops
docker logs <container-name> --tail=1000 | grep -E "while|for.*\)"|"setInterval""

# Enable debug logging temporarily
docker-compose exec <service-name> env LOG_LEVEL=debug
```

---

## 6. Payment Issue Investigation

### When to Use
- Alert: HUKIPaymentFailureSpike
- User complaints about payment failures
- PayOS/VNPay webhook failures
- Transaction discrepancies

### Investigation Procedure

```bash
# 1. Check PayOS/VNPay API status
curl -I https://api.payos.vn/health
curl -I https://sandbox.vnpayment.vn

# 2. Check payment service logs
docker logs huki-commerce-service --tail=500 | grep -i payment

# 3. Check webhook delivery status
docker logs huki-commerce-service --tail=500 | grep -i webhook

# 4. Verify API keys
grep -E "PAYTOS|VNPAY" .env

# 5. Check failed transactions
docker exec huki-postgres psql -U postgres -d huki_commerce -c \
  "SELECT * FROM orders WHERE status = 'PAYMENT_FAILED' ORDER BY created_at DESC LIMIT 10;"
```

### Payment Flow Debugging

```bash
# 1. Check PayOS payment status
curl -X GET "https://api.payos.vn/v2/payment-requests/<payment-id>" \
  -H "Authorization: Bearer <api-key>"

# 2. Check order in database
docker exec huki-postgres psql -U postgres -d huki_commerce -c \
  "SELECT id, status, payment_status, total_amount FROM orders WHERE id = '<order-id>';"

# 3. Check payment transactions
docker exec huki-postgres psql -U postgres -d huki_commerce -c \
  "SELECT * FROM payment_transactions WHERE order_id = '<order-id>';"
```

### Emergency: Disable Payment Processing

```bash
# Temporarily disable checkout
# Add to .env:
CHECKOUT_ENABLED=false

# Restart commerce service
docker-compose restart commerce-service

# Notify users via status page
# Contact: finance@huki.vn immediately
```

---

## 7. Inventory Desync Resolution

### When to Use
- Stock showing incorrect quantities
- Overselling detected
- Alert: Inventory inconsistency
- Redis-PostgreSQL mismatch

### Investigation Procedure

```bash
# 1. Check current on_hand vs available
docker exec huki-postgres psql -U postgres -d huki_commerce -c \
  "SELECT sku, on_hand, reserved, available FROM inventory LIMIT 10;"

# 2. Check Redis inventory cache
docker exec huki-redis redis-cli GET "inventory:<sku>"

# 3. Compare and identify discrepancies
docker exec huki-postgres psql -U postgres -d huki_commerce -c \
  "SELECT i.sku, i.on_hand, COALESCE(SUM(o.quantity), 0) as reserved 
   FROM inventory i 
   LEFT JOIN orders o ON i.sku = o.sku AND o.status IN ('PENDING', 'CONFIRMED')
   GROUP BY i.sku
   HAVING i.on_hand != (i.on_hand - COALESCE(SUM(o.quantity), 0));"

# 4. Check for pending reservations
docker exec huki-postgres psql -U postgres -d huki_commerce -c \
  "SELECT * FROM inventory_reservations WHERE status = 'PENDING' AND expires_at < NOW();"
```

### Sync Redis from PostgreSQL

```bash
# 1. Flush inventory cache
docker exec huki-redis redis-cli KEYS "inventory:*" | xargs -r docker exec huki-redis redis-cli DEL

# 2. Warm up cache from database
# This should be automatic via the application
# Force refresh by hitting the inventory endpoint:
curl -X POST http://localhost:3003/api/v1/inventory/sync

# 3. Verify sync
docker exec huki-redis redis-cli KEYS "inventory:*"
```

### Emergency: Full Inventory Recount

```bash
# 1. Lock the affected products
docker exec huki-postgres psql -U postgres -d huki_commerce -c \
  "UPDATE products SET status = 'OUT_OF_STOCK' WHERE sku IN ('<skus>');"

# 2. Trigger background recount
docker exec huki-commerce-service node scripts/recount-inventory.js

# 3. Verify recount results
docker exec huki-postgres psql -U postgres -d huki_commerce -c \
  "SELECT sku, on_hand, available FROM inventory WHERE sku IN ('<skus>');"

# 4. Unlock products
docker exec huki-postgres psql -U postgres -d huki_commerce -c \
  "UPDATE products SET status = 'ACTIVE' WHERE sku IN ('<skus>');"
```

---

## 8. Backup Restore Procedure

### When to Use
- Database corruption
- Accidental data deletion
- Point-in-time recovery needed
- DR drill

### Prerequisites

```bash
# Verify backup exists
ls -la backups/postgres/

# Check backup metadata
cat backups/postgres/<date>/metadata.json
```

### Full Restore Procedure

```bash
# 1. STOP ALL SERVICES
docker-compose stop

# 2. Identify the backup to restore
BACKUP_DATE=$(ls -t backups/postgres/ | head -1)
echo "Restoring from: $BACKUP_DATE"

# 3. Drop and recreate databases
for db in huki_identity huki_business huki_commerce huki_shipping huki_promotion; do
  echo "Dropping $db..."
  docker exec huki-postgres psql -U postgres -c "DROP DATABASE IF EXISTS $db;"
  docker exec huki-postgres psql -U postgres -c "CREATE DATABASE $db;"
done

# 4. Restore each database
for db in huki_identity huki_business huki_commerce huki_shipping huki_promotion; do
  echo "Restoring $db..."
  docker exec -i huki-postgres pg_restore -U postgres -d $db < \
    backups/postgres/$BACKUP_DATE/$db.sql.gz
done

# 5. Verify restore
docker exec huki-postgres psql -U postgres -d huki_commerce -c \
  "SELECT COUNT(*) FROM books;"

# 6. START ALL SERVICES
docker-compose up -d
```

### Single Database Restore

```bash
# 1. Stop affected service
docker-compose stop commerce-service

# 2. Drop and recreate database
docker exec huki-postgres psql -U postgres -c "DROP DATABASE IF EXISTS huki_commerce;"
docker exec huki-postgres psql -U postgres -c "CREATE DATABASE huki_commerce;"

# 3. Restore
docker exec -i huki-postgres pg_restore -U postgres -d huki_commerce < \
  backups/postgres/<date>/huki_commerce.sql.gz

# 4. Restart service
docker-compose up -d commerce-service
```

### Point-in-Time Recovery

```bash
# 1. Stop service
docker-compose stop commerce-service

# 2. Restore to point in time (requires WAL archiving)
docker exec -i huki-postgres psql -U postgres -c \
  "SELECT pg_restore_xlog_position('2026-09-17 10:30:00+07')"

# 3. Restore with point-in-time
docker exec -i huki-postgres pg_restore -U postgres -d huki_commerce \
  --position='<wal_position>' \
  < backups/postgres/<date>/huki_commerce.sql.gz

# 4. Restart
docker-compose up -d commerce-service
```

---

## Quick Reference

### Emergency Contacts

| Role | Contact | Response Time |
|------|---------|---------------|
| On-Call | oncall@huki.vn | 5 min |
| Tech Lead | techlead@huki.vn | 15 min |
| Engineering Manager | eng-manager@huki.vn | 30 min |
| Finance Team | finance@huki.vn | Immediate |
| CTO | cto@huki.vn | 1 hour |

### Escalation Matrix

```
Alert Fired
    ↓
Level 1: Check runbook, attempt self-resolution (15 min)
    ↓
Level 2: Notify team lead (15 min)
    ↓
Level 3: Page on-call (5 min)
    ↓
Level 4: Escalate to Engineering Manager (30 min)
    ↓
Level 5: Escalate to CTO (1 hour)
```

### Useful Commands

```bash
# Check all services health
for port in 3000 3001 3002 3003 3004 3005 3006; do
  echo -n "Port $port: "
  curl -s http://localhost:$port/api/v1/health | jq -r '.status' 2>/dev/null || echo "DOWN"
done

# Check all containers
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# View recent errors
docker-compose logs --tail=500 --since=1h | grep -E "ERROR|FATAL|exception"

# Check disk space
df -h
docker system df
```
