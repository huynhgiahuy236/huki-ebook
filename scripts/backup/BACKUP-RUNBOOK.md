# ============================================
# HUKI EBOOK - Backup Runbook
# ============================================

## Overview

Backup strategy cho HUKI EBOOK platform với:
- **RTO (Recovery Time Objective)**: 4 hours
- **RPO (Recovery Point Objective)**: 1 hour
- **Retention**: 30 days (PostgreSQL), 7 days (Redis)

---

## Backup Schedule

| Type | Frequency | Time | Retention |
|------|-----------|------|-----------|
| PostgreSQL | Daily | 3:00 AM | 30 days |
| Redis | Hourly | Every hour | 7 days |

---

## Quick Start

### Manual Backup

```bash
cd scripts/backup

# Run all backups
./backup-all.sh

# Run specific backup
./backup-all.sh --postgres-only
./backup-all.sh --redis-only

# List available backups
./backup-all.sh --list

# Verify backups
./backup-all.sh --verify
```

### Docker Environment

```bash
# Build backup container
docker build -f docker/backup.Dockerfile -t huki-backup .

# Run backup
docker run --rm \
  -e PGPASSWORD=your_password \
  -v $(pwd)/backups:/backups \
  huki-backup
```

---

## Backup Storage

### Local Storage (Development)

```bash
./backups/
├── postgres/
│   ├── 20260917/
│   │   ├── huki_identity.sql.gz
│   │   ├── huki_business.sql.gz
│   │   ├── huki_commerce.sql.gz
│   │   ├── huki_shipping.sql.gz
│   │   ├── huki_promotion.sql.gz
│   │   └── metadata.json
│   └── 20260916/
└── redis/
    ├── 20260917/
    │   ├── dump.rdb.gz
    │   └── metadata.json
    └── 20260916/
```

### S3/MinIO Storage (Production)

```bash
# Upload to S3
aws s3 sync ./backups/ s3://huki-backups/

# Or with MinIO client
mc mirror ./backups/ myminio/huki-backups/
```

---

## Restore Procedures

### Restore PostgreSQL

```bash
# 1. Stop services
docker-compose stop

# 2. Restore specific database
gunzip < backups/postgres/20260917/huki_commerce.sql.gz | \
  psql -h localhost -U postgres -d huki_commerce

# 3. Restore all databases
for db in huki_identity huki_business huki_commerce huki_shipping huki_promotion; do
  gunzip < backups/postgres/20260917/${db}.sql.gz | \
    psql -h localhost -U postgres -d ${db}
done

# 4. Restart services
docker-compose start
```

### Restore Redis

```bash
# 1. Stop Redis
docker-compose stop redis

# 2. Restore backup
gunzip < backups/redis/20260917/dump.rdb.gz > /tmp/dump.rdb
docker cp /tmp/dump.rdb huki-redis:/data/dump.rdb
docker restart huki-redis

# 3. Verify
docker exec huki-redis redis-cli ping
```

### Point-in-Time Recovery

```bash
# 1. Find backup before target time
# 2. Use pg_restore with point-in-time option
pg_restore -h localhost -U postgres -d huki_commerce \
  --data-only \
  --verbose \
  backups/postgres/20260917/huki_commerce.dump
```

---

## Verification

### Manual Verification

```bash
# Verify backup integrity
./backup-all.sh --verify

# Verify specific date
./backup-all.sh --verify 20260917

# Check backup size
ls -lh backups/postgres/*/huki_*.sql.gz
```

### Automated Verification

```bash
# Add to crontab
0 6 * * * /path/to/scripts/backup/backup-all.sh --verify
```

---

## Alerts & Monitoring

### Backup Success/Failure

```bash
# Check last backup status
tail -20 backups/logs/backup-*.log

# Cron job for alerting (requires slack/webhook)
./backup-all.sh 2>&1 | grep -E "(ERROR|SUCCESS)" | \
  mail -s "HUKI Backup Status" admin@huki.vn
```

### Disk Space Monitoring

```bash
# Check backup size
du -sh backups/

# Alert if > 10GB
if [ $(du -sb backups | cut -f1) -gt 10737418240 ]; then
  echo "Backup directory exceeds 10GB"
fi
```

---

## Emergency Procedures

### Complete Database Loss

```bash
# 1. Stop all services
docker-compose down

# 2. Remove old data
rm -rf docker/postgres_data/*
rm -rf docker/mongo_data/*

# 3. Start databases
docker-compose up -d postgres mongo redis

# 4. Wait for initialization
sleep 30

# 5. Restore latest backup
for db in huki_identity huki_business huki_commerce huki_shipping huki_promotion; do
  gunzip < backups/postgres/$(ls -t backups/postgres/ | head -1)/${db}.sql.gz | \
    psql -h localhost -U postgres -d ${db}
done

# 6. Start services
docker-compose up -d
```

### Partial Data Recovery

```bash
# Restore specific table from backup
gunzip < backups/postgres/20260917/huki_commerce.sql.gz | \
  psql -h localhost -U postgres -d huki_commerce -c "
    DROP TABLE IF EXISTS orders CASCADE;
  " && \
  cat backups/postgres/20260917/orders_table.sql | psql -h localhost -U postgres -d huki_commerce
```

---

## Rollback Plan

| Scenario | Action | Time |
|----------|--------|------|
| Failed backup | Retry + Alert | 5 min |
| Corrupted backup | Use previous backup | 15 min |
| Data loss | Full restore | 1-2 hours |
| Complete disaster | DR restore | 4 hours |

---

## Contacts

- **Primary**: DevOps Team
- **Backup**: admin@huki.vn
- **Escalation**: tech-lead@huki.vn
