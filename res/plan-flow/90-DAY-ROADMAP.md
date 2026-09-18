# 📋 ROADMAP ĐỊNH HƯỚNG PHÁT TRIỂN - 90 NGÀY
## HUKI EBOOK - TỪ PROTOTYPE ĐẾN PRODUCTION

---

## 🎯 MỤC TIÊU TỔNG QUAN

Chuyển từ **prototype có thể demo** → **production-ready system** có thể chịu tải thực tế và vận hành ổn định.

---

## PHASE 1: STABILIZATION (Ngày 1-30) ✅ DONE

### Tuần 1-2: Critical Fixes

| # | Task | Owner | Priority | Status | Effort |
|---|------|-------|:--------:|:------:|:------:|
| 1 | Seller Registration Wizard UI (6-step) | Frontend | P0 | ✅ DONE | 3 days |
| 2 | Setup Prometheus metrics endpoint | Backend | P0 | ✅ DONE | 2 days |
| 3 | Define backup strategy + implement | DevOps | P0 | ✅ DONE | 2 days |
| 4 | Form data persistence (localStorage) | Frontend | P1 | ✅ DONE | 1 day |
| 5 | Loading states to missing actions | Frontend | P1 | ✅ DONE | 1 day |

### Tuần 3-4: Testing & Quality

| # | Task | Owner | Priority | Status | Effort |
|---|------|-------|:--------:|:------:|:------:|
| 6 | Playwright E2E framework | QA | P1 | ✅ DONE | 3 days |
| 7 | E2E tests for critical flows | QA | P1 | ✅ DONE | 5 days |
| 8 | API load testing (k6/ artillery) | Backend | P1 | ✅ DONE | 3 days |
| 9 | Security review - dependency scan | DevOps | P1 | ✅ DONE | 2 days |
| 10 | Security fixes identified | Backend | P1 | ✅ DONE | 2 days |

### Seller Onboarding Sub-Tasks

| # | Task | Owner | Priority | Status | Effort |
|---|------|-------|:--------:|:------:|:------:|
| 8a | Seller Registration Wizard | Frontend | P0 | ✅ DONE | 3 days |
| 8b | Admin KYC Approval/Reject | Frontend | P0 | ✅ DONE | 3 days |
| 8c | Real-time Notification | Backend | P0 | ✅ DONE | 3 days |
| 8d | Red-Dot Notification UI | Frontend | P0 | ✅ DONE | 1 day |
| 8e | Staff RBAC (13 permissions) | Backend | P0 | ✅ DONE | 2 days |
| 8f | Staff Audit Log | Backend | P1 | ✅ DONE | 2 days |
| 8g | Session Timeout Policy | Backend | P1 | ✅ DONE | 1 day |

---

## PHASE 2: PRODUCT CATALOG (Ngày 31-45) ✅ DONE

### Product Management

| # | Task | Owner | Priority | Status | Effort |
|---|------|-------|:--------:|:------:|:------:|
| 15 | Product Form - Physical/Ebook/Hybrid | Frontend | P0 | ✅ DONE | 4 days |
| 16 | ISBN Validation & Duplicate Check | Backend | P1 | ✅ DONE | 1 day |
| 17 | Ebook File Upload & Storage | Backend | P0 | ✅ DONE | 2 days |
| 18 | Sample Preview 10% | Backend | P1 | ✅ DONE | 1 day |
| 19 | DRM Protection Implementation | Backend | P0 | ✅ DONE | 3 days |
| 20 | Backup Strategy for Ebook Files | DevOps | P1 | ✅ DONE | 1 day |
| 21 | SEO Infrastructure (JSON-LD, Sitemap, Robots) | Frontend | P0 | ✅ DONE | 2 days |

---

## PHASE 3: ORDER & PAYMENT (Ngày 46-60)

### Tuần 9-10: Order Flow

| # | Task | Owner | Priority | Status | Effort |
|---|------|-------|:--------:|:------:|:------:|
| 22 | Shopping Cart & Checkout | Frontend | P0 | ⏳ | 3 days |
| 23 | Payment Integration (PayOS/VNPay) | Backend | P0 | ⏳ | 3 days |
| 24 | Order Status Management | Backend | P0 | ⏳ | 2 days |
| 25 | Invoice Generation | Backend | P1 | ⏳ | 2 days |

### Tuần 11-12: Shipping & Fulfillment

| # | Task | Owner | Priority | Status | Effort |
|---|------|-------|:--------:|:------:|:------:|
| 26 | Shipping Integration (GHN/GHTK) | Backend | P0 | ⏳ | 3 days |
| 27 | Order Tracking | Frontend | P1 | ⏳ | 2 days |
| 28 | Return & Refund Flow | Backend | P1 | ⏳ | 2 days |

---

## PHASE 4: DEPLOYMENT & SCALING (Ngày 61-90)

### Tuần 13-14: Production Readiness

| # | Task | Owner | Priority | Status | Effort |
|---|------|-------|:--------:|:------:|:------:|
| 29 | SSL/TLS configuration | DevOps | P0 | ⏳ | 1 day |
| 30 | CI/CD pipeline setup | DevOps | P0 | ⏳ | 4 days |
| 31 | Staging environment setup | DevOps | P0 | ⏳ | 2 days |
| 32 | Deployment documentation | DevOps | P1 | ⏳ | 1 day |
| 33 | Rollback procedure testing | DevOps | P1 | ⏳ | 2 days |

### Tuần 15-16: Scalability & Security

| # | Task | Owner | Priority | Status | Effort |
|---|------|-------|:--------:|:------:|:------:|
| 34 | Auto-scaling configuration | DevOps | P1 | ⏳ | 3 days |
| 35 | Database connection pooling | Backend | P1 | ⏳ | 1 day |
| 36 | Load balancer setup | DevOps | P1 | ⏳ | 2 days |
| 37 | Penetration testing | Security | P1 | ⏳ | 4 days |
| 38 | Disaster recovery plan + testing | DevOps | P0 | ⏳ | 3 days |

---

## COMPLETED PHASES

| Phase | Status | Completion Date |
|:---|:---:|:---:|
| Phase 1: Seller Onboarding | ✅ DONE | 2026-09-17 |
| Phase 2: Product Catalog & SEO | ✅ DONE | 2026-09-17 |
| Phase 3: Order & Payment | ⏳ IN PROGRESS | - |
| Phase 4: Deployment & Scaling | ⏳ PENDING | - |

Những việc quan trọng nhưng không khẩn cấp - lên kế hoạch sau Phase 1-3:

| # | Task | Priority | Notes |
|---|------|:--------:|-------|
| A | Mobile app (Flutter) | P2 | Hiện tại web đã đủ |
| B | Multi-language support (i18n) | P2 | VN market first |
| C | Advanced analytics dashboard | P2 | Basic metrics đủ |
| D | Advanced search (Elasticsearch) | P2 | PostgreSQL FTS tạm đủ |
| E | WebSocket real-time notifications | P2 | LocalStorage workaround đang dùng |

---

## BUDGET & RESOURCE ESTIMATE

### Phase 1: Stabilization (30 days)
- Frontend Dev: 10 days
- Backend Dev: 10 days
- DevOps: 5 days
- QA: 5 days
- **Total: 30 person-days**

### Phase 2: Monitoring (30 days)
- Frontend Dev: 3 days
- Backend Dev: 10 days
- DevOps: 12 days
- QA: 5 days
- **Total: 30 person-days**

### Phase 3: Deployment (30 days)
- Frontend Dev: 2 days
- Backend Dev: 5 days
- DevOps: 18 days
- QA: 5 days
- **Total: 30 person-days**

### Grand Total: 90 person-days

---

## SUCCESS CRITERIA

### Phase 1 Complete When:
- [ ] Seller Registration Wizard UI works end-to-end
- [ ] Prometheus metrics exposed on all services
- [ ] Database backups running automatically
- [ ] E2E tests covering happy paths pass
- [ ] No critical security vulnerabilities

### Phase 2 Complete When:
- [ ] Grafana dashboards showing real-time metrics
- [ ] Alerts firing for simulated failures
- [ ] Logs aggregated and searchable
- [ ] Distributed tracing working
- [ ] Performance: API response < 200ms p95

### Phase 3 Complete When:
- [ ] HTTPS working on staging
- [ ] CI/CD pipeline deploys on merge
- [ ] Auto-scaling tested under load
- [ ] DR plan documented and tested
- [ ] Pentest passed with no critical findings

---

## RISK REGISTER

| Risk | Likelihood | Impact | Mitigation |
|------|:----------:|:------:|------------|
| Scope creep | Medium | High | Strict priority matrix |
| Resource shortage | Medium | High | Identify backup resources |
| Technical complexity | Low | Medium | Spike first, then implement |
| Third-party dependencies | Medium | Medium | Have fallbacks ready |
| Timeline slippage | Medium | Medium | Buffer 20% in estimates |

---

## NEXT ACTIONS (IMMEDIATE)

### Today:
1. Review and approve this roadmap
2. Assign owners for Phase 1 tasks
3. Book kickoff meeting

### This Week:
1. Start Seller Registration Wizard
2. Setup Prometheus on one service as pilot
3. Draft backup strategy document

### This Month:
1. Complete Phase 1 fully
2. Have staging environment running
3. First E2E test suite passing

---

*Roadmap created: 2026-09-16*
*Estimated duration: 90 days*
*Confidence: 70% (subject to scope changes)*
