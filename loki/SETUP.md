# Loki Setup Guide

## Overview

Loki is a horizontally-scalable, highly-available, multi-tenant log aggregation system. It complements Prometheus for complete observability.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Services   │────▶│  Promtail   │────▶│    Loki    │
│  (JSON logs)│     │  (Collector)│     │  (Storage) │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │   Grafana   │
                                        │  (Explore)  │
                                        └─────────────┘
```

## Prerequisites

1. Docker & Docker Compose installed
2. Services configured to output JSON logs

## Quick Start

### 1. Start Loki Stack

```bash
# Create network if not exists
docker network create huki-network 2>/dev/null || true

# Start Loki + Promtail
docker-compose -f docker/loki.docker-compose.yml up -d
```

### 2. Configure Grafana Datasource

Loki datasource is auto-provisioned via `grafana/provisioning/datasources/loki.yml`

### 3. Access Grafana

1. Go to http://localhost:3001
2. Navigate to **Explore**
3. Select **Loki** datasource
4. Start querying logs

## Common Queries

### Basic Queries

```logql
# All logs from commerce service
{service="commerce-service"}

# Filter by level
{service="commerce-service", level="error"}

# Search in message
{service="commerce-service"} |= "payment"

# Regex filter
{service="commerce-service"} |~ "error.*timeout"
```

### Advanced Queries

```logql
# Parse JSON fields
{service="commerce-service"} | json | status = 500

# Multiple conditions
{service="commerce-service"} | json | status > 400 and duration_ms > 1000

# Label filters
{service=~"huki-.*"} | json | user_id = "user123"

# Aggregate logs
count by (service, level) (rate({service=~"huki-.*"}[5m]))
```

### Troubleshooting Queries

```logql
# Recent errors across all services
{level="error"} | json

# Trace correlation
{service="commerce-service"} |= "trace_id=550e8400"

# Slow requests
{service="commerce-service"} | json | duration_ms > 5000

# Payment failures
{service="commerce-service"} |= "payment" and "failed"
```

## Log Format

See [LOG-FORMAT.md](./LOG-FORMAT.md) for the standard JSON log format.

## Configuration Files

| File | Purpose |
|------|---------|
| `docker/loki.docker-compose.yml` | Docker Compose for Loki stack |
| `loki/loki-config.yml` | Loki server configuration |
| `loki/promtail-config.yml` | Promtail collector configuration |
| `grafana/provisioning/datasources/loki.yml` | Grafana datasource |

## Retention

- Default: 30 days
- Configured in `loki-config.yml`

## Troubleshooting

### Loki not starting

```bash
# Check logs
docker logs huki-loki

# Check port availability
netstat -tlnp | grep 3100
```

### Promtail not collecting logs

```bash
# Check Promtail status
docker logs huki-promtail

# Verify log files exist
ls -la /var/log/huki/
```

### Grafana shows no data

1. Verify Loki is running: `curl http://localhost:3100/ready`
2. Check datasource: Settings → Datasources → Loki
3. Test with basic query: `{service="commerce-service"}`

## Production Considerations

### S3/GCS Storage

```yaml
# Update loki-config.yml for object storage
storage_config:
  aws:
    s3: s3://bucket/loki
    region: us-east-1
```

### High Availability

```yaml
# Add replicas for Loki
services:
  loki:
    deploy:
      replicas: 3
```

### Scalability

```yaml
# Distribute Promtail for multiple hosts
promtail:
  - host: server1
  - host: server2
  - host: server3
```

## Next Steps

- [ ] Integrate with existing services
- [ ] Configure log rotation
- [ ] Set up dashboards for log analysis
- [ ] Configure alerts based on log patterns
