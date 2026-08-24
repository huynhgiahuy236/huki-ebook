# PROJECT STATE - HUKI EBOOK

> State hiện tại của project
> Last updated: 2026-08-24
> Updated by: Claude

---

## 🌿 Git Branches

| Branch | Status | Last Update | Description |
|--------|--------|-------------|-------------|
| `main` | ✅ Active | 2026-08-24 | Production-ready code |
| `develop` | ✅ Active | 2026-08-24 | Latest development |
| ~~`feature/update-common`~~ | ✅ Merged | 2026-08-24 | Common libs |
| ~~`feature/implement-errors-flows`~~ | ✅ Merged | 2026-08-24 | Flows + schemas |
| ~~`feature/validate-and-subscription`~~ | ✅ Merged | 2026-08-24 | Validation + subscription |

**Current Branch:** `main` (merged with develop)

---

## 📊 Project Health

| Metric | Status |
|--------|--------|
| Build | ✅ Passing |
| Type Check | ✅ Passing (commerce-service) |
| Tests | ⚠️ Partial (some .spec.ts files) |
| Docs | ✅ Up to date |
| API Coverage | ✅ ~85% |

---

## 🏗️ Services Status

| Service | Port | Status | Notes |
|---------|------|--------|-------|
| API Gateway | 3000 | ✅ | |
| Identity | 3001 | ✅ | Auth, Users, Sessions |
| Business | 3002 | ✅ | Business, Stores, Members |
| Commerce | 3003 | ✅ | Books, Cart, Orders, Payments |
| Shipping | 3004 | ✅ | Shipments, Addresses |
| Community | 3005 | ✅ | Forum, Chat, Reviews, Notifications |
| Promotion | 3007 | ✅ | Vouchers, Banners, Flash Sales |

---

## 📦 Recent Changes

### v2026-08-24
- ✅ Fixed main branch (broken code)
- ✅ Added missing event constants:
  - LIBRARY_EVENTS
  - SUBSCRIPTION_EVENTS
  - CHAT_EVENTS
  - REVIEW_EVENTS
  - FORUM_EVENTS
  - USER_EVENTS
  - BUSINESS_EVENTS
- ✅ Subscription Model implemented:
  - `Subscription` table
  - `SubscriptionAccessLog` table
  - `BookAccessService` (checkAccess, grantAccess, revokeAccess)
- ✅ API Inventory (143 endpoints across 7 services)
- ✅ Postman Collection (full coverage)
- ✅ Validation Report (code vs docs)

### Earlier
- v2026-08-23: Sprint 15 - 16 features
- v2026-08-22: Sprint 11 - 14 features

---

## 🎯 What's Done

### Backend
- ✅ Microservices architecture (7 services)
- ✅ Authentication (JWT + refresh tokens)
- ✅ Business & Store management
- ✅ Book CRUD + Physical + Digital
- ✅ Cart + Checkout + Orders
- ✅ Payments (PayOS)
- ✅ Shipments + GHTK integration
- ✅ Forum, Chat, Reviews
- ✅ Notifications (FCM)
- ✅ Vouchers, Banners, Flash Sales

### Documentation
- ✅ API Reference (4 docs)
- ✅ Database schemas
- ✅ Event contracts
- ✅ Error codes catalog
- ✅ Business flows
- ✅ Domain schemas (User, Book, Order, Shipment, Subscription)
- ✅ Code validation report

### Testing
- ✅ Postman Collection (Local environment)
- ⚠️ Unit tests (partial)
- ⚠️ Integration tests (TODO)
- ⚠️ E2E tests (TODO)

---

## 🚧 What's In Progress

| # | Task | Status | Priority |
|---|------|--------|----------|
| 1 | Subscription endpoints | 🔧 In progress | High |
| 2 | Integration tests | 🔧 Pending | High |
| 3 | Catalog Search improvements | 🟡 Pending | Medium |
| 4 | Payment webhook reliability | 🟡 Pending | Medium |

---

## 🔜 TODO - Next Sprint

| # | Task | Priority |
|---|------|----------|
| 1 | Subscription UI (frontend) | High |
| 2 | Premium book paywall | High |
| 3 | Notification preferences UI | Medium |
| 4 | Search với Elasticsearch | Medium |
| 5 | Mobile app integration | Medium |
| 6 | Performance optimization | Low |
| 7 | API analytics | Low |

---

## 🔧 Known Issues

| # | Issue | Severity | Workaround |
|---|-------|----------|------------|
| 1 | Old `book-response.util.ts` removed | Resolved | ✅ |
| 2 | Old `checkout.types.ts` removed | Resolved | ✅ |
| 3 | Conflict between main & develop | Resolved | ✅ |
| 4 | Missing event constants | Resolved | ✅ |

---

## 📁 Key Directories

| Directory | Purpose |
|-----------|---------|
| `.agent/` | Agent instructions (READ FIRST) |
| `docs/` | Official documentation |
| `flow/` | Business flow diagrams |
| `err/` | Error codes catalog |
| `res/DOMAIN/` | Domain schemas |
| `res/CONTRACTS/` | Event contracts |
| `res/claude/` | Session reports |
| `platform/` | Backend (NestJS) |
| `web/` | Frontend (Next.js) |
| `mobile/` | Mobile (Flutter) |
| `postman/` | Postman collections |
| `api/` | API statistics |

---

## 🔗 Important References

- **Onboarding:** `.agent/CLAUDE.md`
- **Workflow:** `.agent/WORKFLOW.md`
- **Session Log:** `.agent/SESSION-LOG.md`
- **API Inventory:** `api/API-INVENTORY.md`
- **Validation Report:** `docs/CODE-VALIDATION.md`

---

*Maintained by: Claude*
*Format: Markdown*
