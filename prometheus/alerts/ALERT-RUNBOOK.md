# Alert Runbook - HUKI EBOOK

## Quick Reference

| Alert | Severity | Response Time |
|-------|----------|---------------|
| HUKIServiceDown | Critical | 5 min |
| HUKIHighErrorRate | Critical | 15 min |
| HUKIPaymentFailureSpike | Critical | 15 min |
| HUKIHighLatency | Warning | 1 hour |
| HUKIHighMemoryUsage | Warning | 4 hours |

---

## HUKIHighErrorRate (Critical)

### Symptom
HTTP 5xx error rate > 5% for 5 minutes

### Diagnosis
```bash
# Check recent logs
docker-compose logs --tail=100 | grep -E "ERROR|500|exception"

# Check service health
curl http://localhost:3003/api/v1/health

# Check Prometheus for trends
# Query: sum(rate(http_requests_total{status_code=~"5.."}[5m])) by (service)
```

### Resolution
1. Check if database is reachable
2. Check if Redis is reachable
3. Check for deployment issues
4. Scale up if under heavy load
5. Rollback if recent deployment

### Escalation
- 15 min unresolved → Escalate to Tech Lead
- 30 min unresolved → Escalate to Engineering Manager

---

## HUKIServiceDown (Critical)

### Symptom
Service is unreachable for > 1 minute

### Diagnosis
```bash
# Check container status
docker ps | grep -E "commerce|business|identity"

# Check container logs
docker logs huki-commerce-service --tail=50

# Check port binding
netstat -tlnp | grep 3003
```

### Resolution
1. Restart the service: `docker-compose restart <service>`
2. Check for OOM errors: `docker stats`
3. Check disk space
4. If restart fails, check application logs

### Escalation
- 5 min unresolved → Call on-call
- 15 min unresolved → Page Engineering Manager

---

## HUKIPaymentFailureSpike (Critical)

### Symptom
Payment failure rate > 10% for 5 minutes

### Diagnosis
```bash
# Check PayOS/VNPay status
curl https://api.payos.vn/health

# Check webhook delivery
# Check PayOS dashboard

# Check payment service logs
docker-compose logs commerce-service | grep -i payment
```

### Resolution
1. Verify payment gateway status
2. Check API keys are valid
3. Check webhook endpoints
4. Notify Finance team
5. Consider temporarily disabling checkout

### Escalation
- Immediately notify Finance team
- 15 min unresolved → Escalate to CTO

---

## HUKIHighLatency (Warning)

### Symptom
P95 latency > 2 seconds for 5 minutes

### Diagnosis
```bash
# Check slow queries
docker-compose logs postgres | grep -E "slow|duration"

# Check Redis cache hit rate
redis-cli info stats | grep hit

# Check connection pool
curl http://localhost:3003/api/v1/health | jq
```

### Resolution
1. Check for slow database queries
2. Check Redis connectivity
3. Check for external API latency
4. Scale horizontally if under load
5. Profile application

---

## HUKIHighMemoryUsage (Warning)

### Symptom
Available memory < 20% for 10 minutes

### Diagnosis
```bash
# Check memory usage
docker stats

# Check for memory leaks
docker exec huki-commerce-service free -h
```

### Resolution
1. Check for memory leaks in application
2. Increase memory limit
3. Restart service if critical
4. Scale horizontally

---

## HUKIDiskSpaceLow (Warning)

### Symptom
Available disk < 15% for 5 minutes

### Diagnosis
```bash
# Check disk usage
df -h

# Find large files
du -sh /var/lib/docker
```

### Resolution
1. Clean old logs: `docker system prune`
2. Clean old backups
3. Remove unused images: `docker image prune -a`
4. Expand disk volume if on cloud

---

## HUKINoOrders (Warning)

### Symptom
No orders created for 15 minutes (during business hours)

### Diagnosis
```bash
# Check order service
curl http://localhost:3003/api/v1/health

# Check if checkout is working
# Test manually with Postman

# Check for errors
docker-compose logs commerce-service | grep -i order
```

### Resolution
1. Verify checkout flow works
2. Check payment gateway status
3. Check inventory service
4. Check with marketing if there's a promotion active

---

## Emergency Contacts

| Role | Contact |
|------|---------|
| On-Call | oncall@huki.vn |
| Tech Lead | techlead@huki.vn |
| Engineering Manager | eng-manager@huki.vn |
| CTO | cto@huki.vn |
| Finance | finance@huki.vn |

---

## Escalation Matrix

```
Alert Fired
    ↓
Level 1: Auto-notify (Slack #alerts)
    ↓ (15 min)
Level 2: Page on-call
    ↓ (15 min)
Level 3: Escalate to Tech Lead
    ↓ (30 min)
Level 4: Escalate to Engineering Manager
    ↓ (1 hour)
Level 5: Escalate to CTO
```
