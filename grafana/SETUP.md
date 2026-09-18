# Grafana Setup Guide

## Prerequisites

1. Docker & Docker Compose installed
2. Prometheus đã configured (xem `docs/PROMETHEUS-SETUP.md`)

## Quick Start

### 1. Start Grafana Stack

```bash
# Start with existing network
docker network create huki-network 2>/dev/null || true

# Start Grafana + Prometheus
docker-compose -f docker/grafana.docker-compose.yml up -d

# Or start all together
docker-compose -f docker-compose.yml -f docker/grafana.docker-compose.yml up -d
```

### 2. Access Grafana

- **URL**: http://localhost:3001
- **Username**: `admin`
- **Password**: `admin123` (hoặc set qua `GRAFANA_ADMIN_PASSWORD`)

### 3. Verify Prometheus Connection

1. Go to **Configuration** → **Data Sources**
2. Verify **Prometheus** is listed
3. Click **Test** to verify connection

## Dashboards

### Pre-configured Dashboards

| Dashboard | Description |
|-----------|-------------|
| **HUKI - Service Overview** | Tổng quan tất cả services |
| **HUKI - Commerce Service** | Orders, payments, inventory metrics |

### Custom Queries

```promql
# Request rate by service
sum(rate(http_requests_total[5m])) by (service)

# P95 latency
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))

# Error rate
sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))

# Orders per minute
sum(rate(huki_orders_created_total[5m])) * 60

# Payment success rate
sum(rate(huki_payments_succeeded_total[5m])) / (sum(rate(huki_payments_succeeded_total[5m])) + sum(rate(huki_payments_failed_total[5m])))
```

## Dashboards Customization

### Variables

Add custom variables for filtering:

```promql
# Service filter
label_values(http_requests_total, service)

# Status code filter
label_values(http_requests_total, status_code)
```

### Alerts

Set up alerts via **Alerting** → **Alert rules**

## Troubleshooting

### Prometheus not connecting

```bash
# Check Prometheus container
docker logs huki-prometheus

# Verify Prometheus is running
curl http://localhost:9090/-/healthy
```

### Dashboard not loading

1. Check browser console for errors
2. Verify Prometheus datasource is working
3. Check metric names match your service

### No data showing

```bash
# Check if services are exposing metrics
curl http://localhost:3003/api/v1/metrics | head -50
```

## Production Considerations

### Security

- [ ] Change default admin password
- [ ] Enable HTTPS
- [ ] Configure LDAP/SSO if available
- [ ] Set up role-based access control

### Storage

```yaml
# Add persistent storage
volumes:
  grafana_data:
    driver: local
```

### Backup

Backup Grafana data:
```bash
docker cp huki-grafana:/var/lib/grafana/grafana.db ./grafana-backup.db
```

## Next Steps

- [ ] Setup Alerting Rules (Phase 0, Task 4)
- [ ] Configure notification channels
- [ ] Add custom dashboards
- [ ] Setup SSO integration
