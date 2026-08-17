# 🛠️ Operations Guide

Hướng dẫn vận hành hệ thống.

## 📋 Mục lục

1. [Environment Setup](#environment-setup)
2. [Docker Commands](#docker-commands)
3. [Database Operations](#database-operations)
4. [Service Management](#service-management)
5. [Monitoring](#monitoring)
6. [Backup & Restore](#backup--restore)
7. [Troubleshooting](#troubleshooting)

## Environment Setup

### Development

```bash
# Start all services
docker-compose up -d

# Start specific services
docker-compose up -d postgres redis rabbitmq

# View logs
docker-compose logs -f

# Stop services
docker-compose stop

# Remove containers
docker-compose down
```

### Production

```bash
# Deploy using kubectl
kubectl apply -f k8s/production/

# Check pods
kubectl get pods -n production

# View logs
kubectl logs -f deployment/api-gateway -n production

# Restart deployment
kubectl rollout restart deployment/api-gateway -n production
```

## Docker Commands

### Container Management

```bash
# List running containers
docker ps

# List all containers
docker ps -a

# Stop container
docker stop <container_name>

# Remove container
docker rm <container_name>

# Restart container
docker restart <container_name>

# Execute command in container
docker exec -it <container_name> bash
```

### Database Operations

```bash
# Connect to PostgreSQL
docker exec -it postgres psql -U postgres -d huki_ebook

# Connect to MongoDB
docker exec -it mongo mongosh

# Backup PostgreSQL
docker exec postgres pg_dump -U postgres huki_ebook > backup.sql

# Restore PostgreSQL
docker exec -i postgres psql -U postgres huki_ebook < backup.sql
```

### Redis Operations

```bash
# Connect to Redis
docker exec -it redis redis-cli

# Redis commands
KEYS *                    # List all keys
GET <key>                 # Get value
DEL <key>                 # Delete key
FLUSHDB                   # Clear current database
```

## Database Operations

### Run Migrations

```bash
# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Show migration status
npm run migration:show

# Create new migration
npm run migration:generate -- --name add_user_table
```

### Seeding

```bash
# Seed all data
npm run seed:all

# Seed specific data
npm run seed:users
npm run seed:books
npm run seed:vouchers

# Clear and reseed
npm run db:reset && npm run seed:all
```

## Service Management

### Start/Stop Services

```bash
# Start API Gateway
cd services/api-gateway && npm run start:dev

# Start Identity Service
cd services/identity-service && npm run start:dev

# Start all services using concurrently
npm run start:services

# Start with PM2 (production)
pm2 start ecosystem.config.js
pm2 list
pm2 logs
pm2 restart all
```

### Health Checks

```bash
# Check all services
curl http://localhost:3000/health

# Check individual services
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
```

## Monitoring

### API Gateway Metrics

```bash
# Prometheus metrics
curl http://localhost:3000/metrics

# Health endpoint
curl http://localhost:3000/health
```

### Docker Stats

```bash
# View container stats
docker stats

# View specific container
docker stats <container_name>
```

### Logs

```bash
# View logs
docker-compose logs -f <service_name>

# View last 100 lines
docker-compose logs --tail 100 <service_name>

# Export logs
docker-compose logs > logs.txt
```

## Backup & Restore

### Database Backup

```bash
# PostgreSQL backup
pg_dump -h localhost -U postgres -d huki_ebook > backup_$(date +%Y%m%d).sql

# MongoDB backup
mongodump --uri="mongodb://localhost:27017/huki_community" --out=./mongo_backup

# Redis backup
docker exec redis redis-cli SAVE
docker cp redis:/data/dump.rdb ./redis_backup.rdb
```

### Database Restore

```bash
# PostgreSQL restore
psql -h localhost -U postgres -d huki_ebook < backup_20260814.sql

# MongoDB restore
mongorestore --uri="mongodb://localhost:27017/huki_community" ./mongo_backup

# Redis restore
docker cp redis_backup.rdb redis:/data/dump.rdb
docker exec redis redis-cli CONFIG SET dir /data
```

### Scheduled Backups

```bash
# Add to crontab
crontab -e

# Backup daily at 2 AM
0 2 * * * /path/to/backup.sh

# Backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U postgres -d huki_ebook > /backups/postgres_$DATE.sql
mongodump --uri="mongodb://localhost:27017/huki_community" --out=/backups/mongo_$DATE
```

## Troubleshooting

### Common Issues

#### Service Won't Start

```bash
# Check logs
docker-compose logs <service_name>

# Check if port is in use
netstat -ano | findstr :3000

# Rebuild container
docker-compose build <service_name>
docker-compose up -d <service_name>
```

#### Database Connection Issues

```bash
# Check if database is running
docker-compose ps postgres

# Restart database
docker-compose restart postgres

# Check connection string
# Make sure DATABASE_URL in .env is correct
```

#### High Memory Usage

```bash
# Check container memory
docker stats

# Increase Docker memory
# Docker Desktop > Settings > Resources > 8GB minimum

# Clear unused images
docker image prune -a
```

#### Queue Not Processing

```bash
# Check RabbitMQ
docker-compose ps rabbitmq

# Access RabbitMQ Management UI
# http://localhost:15672 (guest/guest)

# Check queue status
docker exec rabbitmq rabbitmqctl list_queues
```

### Emergency Procedures

#### Database Recovery

```bash
# If database is corrupted:
docker-compose down
docker volume rm $(docker volume ls -qf dangling=true)
docker-compose up -d
npm run migration:run
npm run seed:all
```

#### Service Rollback

```bash
# Kubernetes rollback
kubectl rollout undo deployment/api-gateway -n production

# Docker Compose rollback
git checkout <previous_commit>
docker-compose build
docker-compose up -d
```
