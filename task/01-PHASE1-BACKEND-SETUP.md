# 📋 PHASE 1: Backend Foundation
**Thời gian ước tính: 4-6 tuần**

## Mục tiêu
- Setup NestJS monorepo với 6 microservices
- Infrastructure (PostgreSQL, MongoDB, Redis, RabbitMQ)
- API Gateway cơ bản
- Identity Service hoàn chỉnh
- Business Service cơ bản

---

## 🐙 Tasks

### Sprint 1: Project Setup (1 tuần)

| Task | Người | Priority | Mô tả | Status |
|------|-------|---------|--------|--------|
| T1.1 | KIEN | HIGH | Setup NestJS monorepo với 6 services (identity, business, commerce, shipping, community, promotion, gateway) | ✅ |
| T1.2 | KIEN | HIGH | Tạo shared library (common, utils, types, interfaces) | ✅ |
| T1.3 | KIEN | HIGH | Config TypeORM cho PostgreSQL (6 databases) | ✅ |
| T1.4 | HUY | HIGH | Config MongoDB schemas cho community service | ✅ |
| T1.5 | HUY | HIGH | Setup Redis cho cache và sessions | ✅ |
| T1.6 | HUY | HIGH | Setup RabbitMQ với exchange/queue pattern | ✅ |
| T1.7 | KIEN | MEDIUM | Tạo base entities, DTOs pattern | ✅ |
| T1.8 | HUY | MEDIUM | Tạo base controller, service pattern | ✅ |

**Deliverable:** 6 services có thể chạy local, kết nối được database

---

### Sprint 2: Identity Service (1.5 tuần)

| Task | Người | Priority | Mô tả | Status |
|------|-------|---------|--------|--------|
| T2.1 | KIEN | HIGH | Database schema: users, auth_sessions, refresh_tokens | ✅ |
| T2.2 | KIEN | HIGH | Auth: Register (email/password) | ✅ |
| T2.3 | KIEN | HIGH | Auth: Login với JWT (access + refresh token) | ✅ |
| T2.4 | KIEN | HIGH | Auth: Logout, Refresh token | ✅ |
| T2.5 | KIEN | HIGH | Auth: Forgot password, Reset password | ✅ |
| T2.6 | KIEN | HIGH | Auth: Change password | ✅ |
| T2.7 | KIEN | MEDIUM | User profile CRUD | ✅ |
| T2.8 | KIEN | MEDIUM | Session management (revoke, list devices) | ✅ |
| T2.9 | HUY | MEDIUM | RBAC guards (roles: USER, BUSINESS, ADMIN) | ✅ |
| T2.10 | HUY | MEDIUM | Rate limiting | ✅ |

**Deliverable:** Identity service hoàn chỉnh, API documented

---

### Sprint 3: API Gateway (0.5 tuần)

| Task | Người | Priority | Mô tả | Status |
|------|-------|---------|--------|--------|
| T3.1 | KIEN | HIGH | Route tất cả requests đến services | ⬜ |
| T3.2 | KIEN | HIGH | JWT verification middleware | ⬜ |
| T3.3 | KIEN | HIGH | CORS configuration | ⬜ |
| T3.4 | HUY | HIGH | Global error handler | ⬜ |
| T3.5 | HUY | MEDIUM | Health check endpoints | ⬜ |

**Deliverable:** API Gateway routing đúng, auth hoạt động

---

### Sprint 4: Business Service - Phase 1 (1.5 tuần)

| Task | Người | Priority | Mô tả | Status |
|------|-------|---------|--------|--------|
| T4.1 | HUY | HIGH | Database schema: businesses, stores, members | ⬜ |
| T4.2 | HUY | HIGH | Business CRUD (register, update, view) | ⬜ |
| T4.3 | HUY | HIGH | Store CRUD (create, update, view, list) | ⬜ |
| T4.4 | HUY | HIGH | Member management (invite, accept, roles) | ⬜ |
| T4.5 | HUY | HIGH | Mock registry verification flow | ⬜ |
| T4.6 | HUY | MEDIUM | Admin approval workflow | ⬜ |
| T4.7 | KIEN | MEDIUM | Events: BUSINESS_REGISTERED, BUSINESS_APPROVED | ⬜ |

**Deliverable:** Business và Store management hoạt động

---

## 📊 Progress Summary

```
Sprint 1: Project Setup
  ✅ T1.1: ...
  ✅ T1.2: ...
  ...

Sprint 2: Identity Service
  ✅ T2.1: ...
  ...

Sprint 3: API Gateway
  ...

Sprint 4: Business Service
  ...
```

---

## 📦 Deliverables Phase 1

- [ ] 6 NestJS services chạy local
- [ ] Identity API hoàn chỉnh
- [ ] Business/Store API cơ bản
- [ ] API Gateway routing
- [ ] Database schemas
- [ ] API documentation (Swagger)

---

## 🔗 Dependencies

- Sprint 2 cần Sprint 1 xong
- Sprint 3 cần Sprint 1, 2 xong
- Sprint 4 cần Sprint 1 xong

---

## 📝 Notes

**KIEN:** Tập trung Infrastructure, Auth, Gateway
**HUY:** Tập trung Database schemas, Business logic, Redis/RabbitMQ

---

## 📅 Update Log

| Ngày | Người | Task hoàn thành |
|------|--------|-----------------|
| 2026-08-17 | KIEN | T1.1-T1.3, T1.7: NestJS monorepo, shared lib, TypeORM, base entities |
| 2026-08-17 | KIEN | T1.4-T1.6: MongoDB schemas (7 collections), Redis setup, RabbitMQ setup |
| 2026-08-17 | KIEN | T2.1-T2.10: Full Identity Service (Auth, Sessions, RBAC, Rate Limiting) |

