# 📋 HUKI EBOOK - TASK OVERVIEW

## 👥 Team
- **HUY** - Backend, Database, Infrastructure
- **KIEN** - Backend, API, Frontend integration

---

## 📁 Project Structure

```
task/
├── README.md              ← Bạn đang ở đây
├── platform/             ← Backend Services (NestJS)
│   ├── README.md
│   ├── 01-PHASE1-BACKEND-SETUP.md
│   ├── 02-PHASE2-COMMERCE-CATALOG.md
│   ├── 03-PHASE3-PAYMENT-SHIPPING.md
│   ├── 04-PHASE4-COMMUNITY.md
│   ├── 05-PHASE5-INTEGRATION.md
│   ├── 06-PHASE6-QUALITY.md
│   └── 07-PHASE7-PRODUCTION.md
│
├── web/                  ← Frontend Web (Next.js)
│   ├── README.md
│   └── 01-PHASE1-WEB-FRONTEND.md
│
└── mobile/              ← Frontend Mobile (React Native)
    ├── README.md
    ├── 01-PHASE1-MOBILE-SETUP.md
    └── 02-PHASE2-MOBILE-FEATURES.md
```

---

## 📅 Backend Phases (Platform)

| Phase | Name | Status | Duration |
|-------|------|--------|----------|
| 01 | Backend Setup | ✅ DONE | 4-6 weeks |
| 02 | Commerce & Catalog | ✅ DONE | 4-6 weeks |
| 03 | Payment & Shipping | ✅ DONE | 3-4 weeks |
| 04 | Community | ✅ DONE | 3-4 weeks |
| 05 | Backend Integration | ✅ DONE | 3-4 weeks |
| 06 | Backend Quality | 🔄 IN PROGRESS | 2-3 weeks |
| 07 | Production Launch | 🔄 IN PROGRESS | 2-3 weeks |

**Total Backend: ~16-22 weeks**

---

## 📅 Frontend Phases

### Web Frontend
| Phase | Name | Status |
|-------|------|--------|
| 01 | Web Frontend | 🔄 IN PROGRESS |

### Mobile Frontend
| Phase | Name | Status |
|-------|------|--------|
| 01 | Mobile Setup | 🔄 IN PROGRESS |
| 02 | Mobile Features | 🔄 IN PROGRESS |

---

## 🎯 Work Distribution

### Phase 1-5 (Backend Foundation) - ✅ DONE

| Sprint | KIEN | HUY |
|--------|------|------|
| Sprint 1 | Project setup (services) | Database (Mongo, Redis, RabbitMQ) |
| Sprint 2 | Auth (Register, Login, JWT) | RBAC, Session management |
| Sprint 3 | API Gateway | Error handling, Health checks |
| Sprint 4 | Business events | Business, Store, Members |
| Sprint 5 | Search | Categories, Authors, Publishers |
| Sprint 6 | Book listing, Publishing | Book CRUD, Upload |
| Sprint 7 | Cart logic, Validation | Cart persistence |
| Sprint 8 | Checkout, Orders | Inventory, Seller orders |
| Sprint 9 | PayOS, COD | Refunds, reconciliation |
| Sprint 10 | GHTK integration | Shipments, Delivery |
| Sprint 11 | Events, Notifications | Order completion |
| Sprint 12 | Search, Categories | Forum, Comments |
| Sprint 13 | Socket.IO | Chat, Conversations |
| Sprint 14 | - | Reviews, Ratings |
| Sprint 15 | Notifications | Firebase |
| Sprint 16 | Moderation | Reports |
| Sprint 17 | Gateway HTTP proxy | ✅ DONE |
| Sprint 18 | Response format | ✅ DONE |
| Sprint 19 | Swagger + Postman | ✅ DONE |
| Sprint 20 | Integration tests | ✅ DONE |
| Sprint 21 | Documentation validation | ✅ DONE |

### Phase 6 (Backend Quality) - 🔄 IN PROGRESS

| Sprint | Status |
|--------|--------|
| Sprint 22 | 📋 PLANNED |
| Sprint 23 | 📋 PLANNED |
| Sprint 24 | 📋 PLANNED |
| Sprint 25 | 📋 PLANNED |
| Sprint 26 | 📋 PLANNED |

### Phase 7 (Production Readiness) - 🔄 IN PROGRESS

| Sprint | Status |
|--------|--------|
| Sprint 27 | 🔄 IN PROGRESS |
| Sprint 28 | 🔄 IN PROGRESS |
| Sprint 29 | 🔄 IN PROGRESS |
| Sprint 30 | 🔄 IN PROGRESS |

---

## 📌 Task Naming Convention

```
T<sprint>.<number> - <description>

Ví dụ:
T17.1 - Gateway module HTTP clients
T20.1 - Test auth flow
```

---

## 🚀 Current Focus

### Phase 6 - Backend Quality
**Đang làm:**
- Sprint 22: Error-code adoption
- Sprint 25: Unit tests

### Phase 5 - Backend Integration (vừa hoàn thành)

**Đã làm:**
- ✅ Gateway proxy hoạt động (Swagger 3000 đầy đủ)
- ✅ Response format đồng nhất
- ✅ Error codes chuẩn hóa
- ✅ 123 tests pass (27 integration + 96 unit)
- ✅ API-INVENTORY.md matches actual implementation

---

## 📝 Update Log

| Date | Phase | Changes |
|------|-------|---------|
| 2026-08-27 | All | Renumbered phases (mobile: 01-02, web: 01) |
| 2026-08-27 | All | Restructured into platform/web/mobile folders |
| 2026-08-25 | All | Restructured phases 5-9, added local/deploy split |
| 2026-08-24 | All | Created Phase 5-8 structure |
| 2026-08-23 | 1-4 | Backend phases completed |
