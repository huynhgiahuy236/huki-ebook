# 📋 HUKI EBOOK - TASK OVERVIEW

## 👥 Team
- **HUY** - Backend, Database, Infrastructure
- **KIEN** - Backend, API, Frontend integration

---

## 📅 Project Phases

| Phase | Name | Duration | Focus |
|-------|------|---------|-------|
| **Phase 1** | Backend Foundation | 4-6 weeks | NestJS setup, Identity, Business |
| **Phase 2** | Commerce & Catalog | 4-6 weeks | Books, Cart, Orders |
| **Phase 3** | Payment & Shipping | 3-4 weeks | PayOS, COD, GHTK |
| **Phase 4** | Community | 3-4 weeks | Forum, Chat, Reviews |
| **Phase 5** | Frontend Web | 6-8 weeks | Next.js application |
| **Phase 6** | Mobile & Testing | 4-6 weeks | Flutter, Tests |

**Total: ~24-34 weeks (6-8 months)**

---

## 🎯 Work Distribution

### Phase 1-4 (Backend)

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
| Sprint 9 | PayOS, COD ✅ | Refunds, reconciliation ✅ |
| Sprint 10 | GHTK integration ✅ | Shipments, Delivery ✅ |
| Sprint 11 | Events, Notifications ✅ | Order completion ✅ |

### Phase 4 (Community)

| Sprint | KIEN | HUY |
|--------|------|-----|
| Sprint 12 | Search, Categories ✅ | Forum, Comments ✅ |
| Sprint 13 | Socket.IO ✅ | Chat, Conversations ✅ |
| Sprint 14 | - | Reviews, Ratings ✅ |
| Sprint 15 | Notifications ✅ | Firebase ✅ |
| Sprint 16 | - | Moderation, Reports ✅ |

### Phase 5 (Frontend)

| Sprint | KIEN | HUY |
|--------|------|-----|
| Sprint 17 | Next.js setup, Auth | Design system, Components |
| Sprint 18 | Home, Catalog, Search | Categories, Store pages |
| Sprint 19 | Cart, Checkout, Orders | Order history, Profile |
| Sprint 20 | Seller: Orders, Vouchers | Seller: Books, Dashboard |
| Sprint 21 | Admin: Users, Business | Admin: Moderation |
| Sprint 22 | Library, PDF reader | Reading progress |

### Phase 6 (Mobile & Testing)

| Sprint | KIEN | HUY |
|--------|------|-----|
| Sprint 23 | - | Promotion Service |
| Sprint 24 | Flutter setup, Auth | Design system |
| Sprint 25 | Browse, Cart, Orders | Profile, Notifications |
| Sprint 26 | Download manager | Library, PDF reader |
| Sprint 27 | E2E tests | Unit tests |

---

## 📊 Task Files

| File | Description |
|------|-------------|
| `01-PHASE1-BACKEND-SETUP.md` | Backend foundation |
| `02-PHASE2-COMMERCE-CATALOG.md` | Commerce & catalog |
| `03-PHASE3-PAYMENT-SHIPPING.md` | Payment & shipping |
| `04-PHASE4-COMMUNITY.md` | Forum, Chat, Reviews |
| `05-PHASE5-FRONTEND.md` | Next.js web app |
| `06-PHASE6-PROMOTION-MOBILE.md` | Mobile & testing |

---

## 🚀 Starting Point

### Week 1 Checklist

**KIEN:**
- [ ] Setup NestJS monorepo
- [ ] Create 7 services structure
- [x] Config Prisma clients and migrations for PostgreSQL services

**HUY:**
- [ ] Setup Docker (Postgres, Mongo, Redis, RabbitMQ)
- [ ] Config MongoDB schemas
- [ ] Create shared library structure

---

## 📌 Task Naming Convention

```
T<number>.<sub> - <description>

Ví dụ:
T1.1 - Setup NestJS monorepo structure
T2.3 - Auth login endpoint
```

---

## 🎯 Definition of Done

- [ ] Code implemented
- [ ] Unit tests written
- [ ] API documented (Swagger)
- [ ] No console errors
- [ ] PR reviewed and merged
