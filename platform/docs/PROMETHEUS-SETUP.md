# Prometheus Setup Guide

## Prerequisites

1. **Install prom-client package** (đã có trong dependencies)

2. **Rebuild shared library**:
```bash
cd platform
npm run build:shared
```

3. **Verify commerce-service** đã hoạt động:
```bash
# Test metrics endpoint
curl http://localhost:3003/api/v1/metrics
```

## Running Prometheus

### Option 1: Docker Compose

```yaml
# docker/prometheus.yml hoặc docker-compose.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    container_name: huki-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    restart: unless-stopped

volumes:
  prometheus_data:
```

### Option 2: Standalone

```bash
# Download prometheus
# Run với config
prometheus --config.file=./config/prometheus.yml
```

## Verify Prometheus

1. Mở http://localhost:9090
2. Status → Targets → Xem các services đã được scrape chưa
3. Graph → Thử query `http_request_duration_seconds`

## Common Queries

```promql
# Request rate
rate(http_requests_total[5m])

# P95 latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Error rate
rate(http_requests_total{status_code=~"5.."}[5m]) / rate(http_requests_total[5m])

# Orders created
rate(huki_orders_created_total[5m])
```

## Troubleshooting

```bash
# Check Prometheus logs
docker logs huki-prometheus

# Test scrape manually
curl http://localhost:3003/api/v1/metrics
```

## Next Steps

- Setup Grafana (Phase 0, Task 3)
- Setup Alerting Rules (Phase 0, Task 4)
