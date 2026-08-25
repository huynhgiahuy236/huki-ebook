# 📋 HUKI EBOOK - TASK OVERVIEW

## 👥 Team
- **HUY** - Backend, Database, Infrastructure
- **KIEN** - Backend, API, Frontend integration

---

## 📅 Project Phases

| Phase | Name | Status | Duration | Focus |
|-------|------|--------|---------|-------|
| **Phase 1** | Backend Foundation | ✅ DONE | 4-6 weeks | NestJS setup, Identity, Business |
| **Phase 2** | Commerce & Catalog | ✅ DONE | 4-6 weeks | Books, Cart, Orders |
| **Phase 3** | Payment & Shipping | ✅ DONE | 3-4 weeks | PayOS, COD, GHTK |
| **Phase 4** | Community | ✅ DONE | 3-4 weeks | Forum, Chat, Reviews |
| **Phase 5** | Backend Integration | 🔄 IN PROGRESS | 3-4 weeks | Gateway, API contract, docs, tests |
| **Phase 6** | Backend Quality | 📋 PLANNED | 2-3 weeks | Error codes, logging, unit tests |
| **Phase 7** | Production Readiness | ⏸️ DEFERRED | TBD | PayOS production, HTTPS, CI/CD |
| **Phase 8** | Web Frontend | ⏸️ DEFERRED | TBD | Next.js application |
| **Phase 9** | Mobile | ⏸️ DEFERRED | TBD | Flutter app |

**Total Backend Phases 1-6: ~16-22 weeks**

---

## 🎯 Work Distribution

### Phase 1-4 (Backend Foundation) - ✅ DONE

| Sprint | KIEN | HUY |
|--------|------|-----|
| Sprint 1 | Project setup (services) | Database (Mongo, Redis, RabbitMQ) |
| Sprint 2 | Auth (Register, Login, JWT) | RBAC, Session management |
| Sprint 3 | API Gateway | Error handling, Health checks |
| Sprint 4 | Business events | Business, Store, Members |

### Phase 2 (Commerce)

| Sprint | KIEN | HUY |
|--------|------|-----|
| Sprint 5 | Search | Categories, Authors, Publishers |
| Sprint 6 | Book listing, Publishing | Book CRUD, Upload |
| Sprint 7 | Cart logic, Validation | Cart persistence |
| Sprint 8 | Checkout, Orders | Inventory, Seller orders |

### Phase 3 (Payment)

| Sprint | KIEN | HUY |
|--------|------|-----|
| Sprint 9 | PayOS, COD | Refunds, reconciliation |
| Sprint 10 | GHTK integration | Shipments, Delivery |
| Sprint 11 | Events, Notifications | Order completion |

### Phase 4 (Community)

| Sprint | KIEN | HUY |
|--------|------|-----|
| Sprint 12 | Search, Categories | Forum, Comments |
| Sprint 13 | Socket.IO | Chat, Conversations |
| Sprint 14 | - | Reviews, Ratings |
| Sprint 15 | Notifications | Firebase |
| Sprint 16 | Moderation | Reports |

### Phase 5 (Backend Integration) - 🔄 IN PROGRESS

| Sprint | KIEN | HUY | Status |
|--------|------|-----|--------|
| Sprint 17 | Gateway HTTP proxy | - | ✅ DONE |
| Sprint 18 | Response format | - | ✅ DONE |
| Sprint 19 | Swagger + Postman | - | ✅ DONE |
| Sprint 20 | Integration tests | - | 📋 PLANNED |
| Sprint 21 | Documentation validation | - | 📋 PLANNED |

### Phase 6 (Backend Quality) - 📋 PLANNED

| Sprint | KIEN | HUY | Status |
|--------|------|-----|--------|
| Sprint 22 | Error-code adoption | - | 📋 PLANNED |
| Sprint 23 | Health checks | - | 📋 PLANNED |
| Sprint 24 | Outbox & events | - | 📋 PLANNED |
| Sprint 25 | Unit tests | - | 📋 PLANNED |
| Sprint 26 | E2E tests | - | 📋 PLANNED |

### Phase 7 (Production Readiness) - ⏸️ DEFERRED

> Deferred vì hiện chỉ chạy local. Cần PayOS credentials thật, public webhook URL, HTTPS/domain.

| Sprint | KIEN | HUY | Status |
|--------|------|-----|--------|
| Sprint 27 | PayOS production | Webhook | ⏸️ DEFERRED |
| Sprint 28 | HTTPS, CORS | Domain | ⏸️ DEFERRED |
| Sprint 29 | Secrets management | CI/CD | ⏸️ DEFERRED |
| Sprint 30 | Docker, observability | Backup | ⏸️ DEFERRED |

### Phase 8-9 - ⏸️ DEFERRED

- **Phase 8**: Next.js web app (chờ Phase 6 xong)
- **Phase 9**: Flutter mobile app (chờ Phase 8 xong)

---

## 📊 Task Files

| File | Phase | Description | Status |
|------|-------|-------------|--------|
| `01-PHASE1-BACKEND-SETUP.md` | Phase 1 | Backend foundation | ✅ DONE |
| `02-PHASE2-COMMERCE-CATALOG.md` | Phase 2 | Commerce & catalog | ✅ DONE |
| `03-PHASE3-PAYMENT-SHIPPING.md` | Phase 3 | Payment & shipping | ✅ DONE |
| `04-PHASE4-COMMUNITY.md` | Phase 4 | Forum, Chat, Reviews | ✅ DONE |
| `05-PHASE5-Integration.md` | Phase 5 | Gateway, docs, tests | 🔄 IN PROGRESS |
| `06-PHASE6-QUALITY.md` | Phase 6 | Quality, tests | 📋 PLANNED |
| `07-PHASE7-PRODUCTION.md` | Phase 7 | Production readiness | ⏸️ DEFERRED |
| `08-PHASE8-WEB-FRONTEND.md` | Phase 8 | Next.js app | ⏸️ DEFERRED |
| `09-PHASE9-MOBILE.md` | Phase 9 | Flutter app | ⏸️ DEFERRED |

---

## 🚀 Current Focus

### Phase 5 - Backend Integration

**KIEN đang làm:**
- Sprint 20: Integration tests
- Sprint 21: Documentation validation

**Definition of Done:**
- [x] Gateway proxy hoạt động (Swagger 3000 đầy đủ)
- [x] Response format đồng nhất
- [x] Error codes chuẩn hóa
- [x] `tsc --noEmit` passes for all 6 services
- [ ] Integration tests pass cho all flows
- [ ] API-INVENTORY.md matches actual implementation

---

## 📌 Task Naming Convention

```
T<sprint>.<number> - <description>

Ví dụ:
T17.1 - Gateway module HTTP clients
T20.1 - Test auth flow
```

---

## 🎯 Definition of Done (General)

- [x] Code implemented
- [ ] Unit tests written (Phase 6)
- [x] API documented (Swagger)
- [x] No TypeScript errors (`tsc --noEmit` passes)
- [ ] PR reviewed and merged

---

## 📝 Update Log

| Date | Phase | Changes |
|------|-------|---------|
| 2026-08-25 | All | Restructured phases 5-9, added local/deploy split |
| 2026-08-24 | All | Created Phase 5-8 structure |
| 2026-08-23 | 1-4 | Backend phases completed |
