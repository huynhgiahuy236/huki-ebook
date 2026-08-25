# 📋 PHASE 7: Backend Production Readiness
**Thời gian ước tính: 3-4 tuần**
**Status: ⏸️ DEFERRED**
**Dependency: Phase 6 (Quality) COMPLETE**

## ⚠️ Lý do defer
Hiện tại chỉ chạy local development. Phase này yêu cầu:
- PayOS credentials thật với merchant credentials
- Public webhook URL (HTTPS có domain)
- Production infrastructure (cloud hosting)
- CI/CD pipeline setup

## 🎯 Mục tiêu
Triển khai production-ready backend: PayOS thật, HTTPS, domain, secrets management, CI/CD, Docker images, observability.

---

## 🐙 Tasks

### Sprint 27: PayOS Production Integration

| Task | Owner | Priority | Description | Status | Definition of Done |
|------|-------|----------|-------------|--------|-------------------|
| T27.1 | KIEN | HIGH | PayOS merchant credentials | ⏸️ TODO | Client ID + API key |
| T27.2 | KIEN | HIGH | PayOS webhook URL (public HTTPS) | ⏸️ TODO | `/api/v1/payments/webhook/payos` |
| T27.3 | KIEN | HIGH | Signature verification | ⏸️ TODO | HMAC-SHA256 verified |
| T27.4 | KIEN | HIGH | Reconciliation: Daily job | ⏸️ TODO | Compare PayOS vs DB |
| T27.5 | KIEN | MEDIUM | Refund via PayOS API | ⏸️ TODO | Full refund flow |

### Sprint 28: HTTPS & Domain

| Task | Owner | Priority | Description | Status | Definition of Done |
|------|-------|----------|-------------|--------|-------------------|
| T28.1 | KIEN | HIGH | Domain registration | ⏸️ TODO | huki.vn hoặc tương tự |
| T28.2 | KIEN | HIGH | SSL certificates (Let's Encrypt) | ⏸️ TODO | Auto-renewal |
| T28.3 | KIEN | HIGH | CORS configuration for production | ⏸️ TODO | Allowed origins configured |
| T28.4 | KIEN | MEDIUM | Rate limiting per IP/user | ⏸️ TODO | 100 req/min per user |
| T28.5 | KIEN | MEDIUM | Request size limits | ⏸️ TODO | Max 10MB body |

### Sprint 29: Secrets & CI/CD

| Task | Owner | Priority | Description | Status | Definition of Done |
|------|-------|----------|-------------|--------|-------------------|
| T29.1 | KIEN | HIGH | Vault/parameter store setup | ⏸️ TODO | Secrets not in env files |
| T29.2 | KIEN | HIGH | GitHub Actions pipeline | ⏸️ TODO | CI on PR, CD on merge |
| T29.3 | KIEN | HIGH | Environment: staging vs production | ⏸️ TODO | Separate configs |
| T29.4 | KIEN | MEDIUM | Docker files per service | ⏸️ TODO | Multi-stage builds |
| T29.5 | KIEN | MEDIUM | Docker Compose for production | ⏸️ TODO | Traefik + services |

### Sprint 30: Observability & Backup

| Task | Owner | Priority | Description | Status | Definition of Done |
|------|-------|----------|-------------|--------|-------------------|
| T30.1 | KIEN | HIGH | Logging aggregation (ELK/Loki) | ⏸️ TODO | Centralized logs |
| T30.2 | KIEN | HIGH | Metrics (Prometheus) | ⏸️ TODO | Request count, latency |
| T30.3 | KIEN | HIGH | Alerting (PagerDuty/Grafana) | ⏸️ TODO | Error rate alerts |
| T30.4 | KIEN | HIGH | Database backup strategy | ⏸️ TODO | Daily automated backups |
| T30.5 | KIEN | MEDIUM | Rollback procedure | ⏸️ TODO | Documented and tested |

---

## 📦 Deliverables Phase 7

```
⬜ Sprint 27: PayOS production webhook
⬜ Sprint 28: HTTPS + domain
⬜ Sprint 29: CI/CD + secrets
⬜ Sprint 30: Observability + backup
```

---

## 🔗 Dependencies

```
Phase 6 Sprint 26 → Sprint 27 → Sprint 28 → Sprint 29 → Sprint 30
                     (payos)    (https)    (cicd)    (observability)
```

---

## 📅 Update Log

| Date | Owner | Changes |
|------|-------|---------|
| 2026-08-25 | KIEN | Created Phase 7 - Deferred |
