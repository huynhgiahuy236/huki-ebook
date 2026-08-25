# 📋 PHASE 5: Backend Local Integration & API Contract
**Thời gian ước tính: 3-4 tuần**
**Status: IN PROGRESS**

## 🎯 Mục tiêu
Hoàn thiện API Gateway proxy, chuẩn hóa response format, error codes, Swagger docs, và integration tests cho local development.

## 📊 Bảng Local Now vs Deploy Later

| Local Now ✅ | Deploy Later 🚧 |
|-------------|-----------------|
| Gateway HTTP proxy (Sprint 17) | HTTPS/domain |
| Response format đồng nhất (Sprint 18) | Production CORS/rate limit |
| Error codes + structured logging (Sprint 19) | Secrets management |
| Swagger + Postman (Sprint 20) | CI/CD pipelines |
| Integration tests (Sprint 21) | Docker images |
| Health checks local | Cloud observability |

---

## 🐙 Tasks

### Sprint 17: API Gateway HTTP Proxy — **ƯU TIÊN CAO NHẤT**

| Task | Owner | Priority | Description | Status | Definition of Done |
|------|-------|----------|-------------|--------|-------------------|
| T17.1 | KIEN | HIGH | Gateway module: HTTP proxy routing for 6 microservices | ✅ DONE | Gateway build and local runtime verification pass |
| T17.2–T17.7 | KIEN | HIGH | Proxy routes for all six services | ✅ DONE | Direct-vs-Gateway smoke test verified all six service mappings |
| T17.8 | KIEN | HIGH | Gateway Swagger aggregate tất cả service docs | ✅ DONE | Dynamic `/api/openapi.json` merges local service OpenAPI documents; UI uses it |
| T17.9 | KIEN | MEDIUM | Health check: Kiểm tra tất cả 6 services | ✅ DONE | `/api/v1/health/services` reports all six local services healthy |
| T17.10 | KIEN | MEDIUM | Timeout & retry logic cho proxy | 🔄 IN PROGRESS | 30s timeout implemented; safe retry policy pending |

#### Luồng Gateway Proxy

```
Client → Gateway (3000) → Auth Middleware → Route → Service (3001-3007)
                                    ↓
                              Swagger (/api/docs)
```

#### Routes Mapping

```
/api/v1/auth/*           → http://localhost:3001/api/v1/auth/*
/api/v1/users/*          → http://localhost:3001/api/v1/users/*
/api/v1/sessions/*       → http://localhost:3001/api/v1/sessions/*
/api/v1/businesses/*     → http://localhost:3002/api/v1/businesses/*
/api/v1/stores/*         → http://localhost:3002/api/v1/stores/*
/api/v1/members/*        → http://localhost:3002/api/v1/members/*
/api/v1/books/*          → http://localhost:3003/api/v1/books/*
/api/v1/categories/*     → http://localhost:3003/api/v1/categories/*
/api/v1/authors/*        → http://localhost:3003/api/v1/authors/*
/api/v1/publishers/*     → http://localhost:3003/api/v1/publishers/*
/api/v1/cart/*           → http://localhost:3003/api/v1/cart/*
/api/v1/orders/*         → http://localhost:3003/api/v1/orders/*
/api/v1/payments/*       → http://localhost:3003/api/v1/payments/*
/api/v1/shipping/*       → http://localhost:3004/api/v1/shipping/*
/api/v1/shipments/*      → http://localhost:3004/api/v1/shipments/*
/api/v1/addresses/*      → http://localhost:3004/api/v1/addresses/*
/api/v1/forum/*         → http://localhost:3005/api/v1/forum/*
/api/v1/chat/*           → http://localhost:3005/api/v1/chat/*
/api/v1/reviews/*        → http://localhost:3005/api/v1/reviews/*
/api/v1/notifications/*  → http://localhost:3005/api/v1/notifications/*
/api/v1/vouchers/*       → http://localhost:3007/api/v1/vouchers/*
/api/v1/banners/*         → http://localhost:3007/api/v1/banners/*
/api/v1/flash-sales/*    → http://localhost:3007/api/v1/flash-sales/*
```

---

### Sprint 18: Response Format Standardization

| Task | Owner | Priority | Description | Status | Definition of Done |
|------|-------|----------|-------------|--------|-------------------|
| T18.1–T18.5 | KIEN | HIGH | Global error filter and response interceptor | 🔄 IN PROGRESS | Registered for all services; contract runtime tests pending |

#### Response Format Chuẩn

```typescript
// Success Response
{
  "status": "success",
  "statusCode": 200,
  "message": "Thành công",
  "data": { ... }
}

// Paginated Response
{
  "status": "success",
  "statusCode": 200,
  "message": "Lấy danh sách thành công",
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}

// Error Response
{
  "status": "error",
  "statusCode": 400,
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [ ... ],
  "timestamp": "2026-08-25T10:00:00.000Z",
  "path": "/api/v1/books"
}
```

---

### Sprint 19: Swagger + Postman Local

| Task | Owner | Priority | Description | Status | Definition of Done |
|------|-------|----------|-------------|--------|-------------------|
| T19.1–T19.4 | KIEN | HIGH | Swagger aggregate and endpoint contract verification | 🔄 IN PROGRESS | Aggregate is live (143 paths, 72 schemas); examples and response coverage remain |
| T19.5–T19.7 | KIEN | MEDIUM | Postman coverage verification | 🔄 IN PROGRESS | Collection exists; runtime validation pending |
| T19.8 | KIEN | MEDIUM | Environment variables: Local environment | ⬜ TODO | `.env.example` missing for several services |

#### Swagger Requirements per Endpoint

- `tags`: Service name (e.g., "auth", "books", "cart")
- `summary`: Vietnamese description
- `security`: `bearerAuth` where required
- `parameters`: Query/path params with schema
- `requestBody`: DTO schema with examples
- `responses`: 200, 201, 400, 401, 403, 404, 500

---

### Sprint 20: Integration Tests Local

| Task | Owner | Priority | Description | Status | Definition of Done |
|------|-------|----------|-------------|--------|-------------------|
| T20.1 | KIEN | HIGH | Test: Auth flow (register, login, refresh, logout) | ⬜ TODO | All 4 flows pass |
| T20.2 | KIEN | HIGH | Test: Business & Store CRUD | ⬜ TODO | Create/read/update/delete pass |
| T20.3 | KIEN | HIGH | Test: Book catalog (create, publish, list) | ⬜ TODO | Book lifecycle tested |
| T20.4 | KIEN | HIGH | Test: Cart flow (add, update, remove, clear) | ⬜ TODO | All cart operations tested |
| T20.5 | KIEN | HIGH | Test: Checkout + COD flow | ⬜ TODO | Session creation + order confirmed |
| T20.6 | KIEN | MEDIUM | Test: Order & Payment flow (PayOS mock) | ⬜ TODO | Webhook simulation works |
| T20.7 | KIEN | MEDIUM | Test: Shipping address flow | ⬜ TODO | Address CRUD tested |
| T20.8 | KIEN | MEDIUM | Test: Voucher/Flash sale application | ⬜ TODO | Discount applied correctly |
| T20.9 | KIEN | MEDIUM | Test: Forum & Chat flow | ⬜ TODO | Messages sent/received |
| T20.10 | KIEN | MEDIUM | Test: Error scenarios (unauthorized, not found) | ⬜ TODO | Proper error codes returned |

---

### Sprint 21: Documentation Validation & Definition of Done

| Task | Owner | Priority | Description | Status | Definition of Done |
|------|-------|----------|-------------|--------|-------------------|
| T21.1 | KIEN | HIGH | Validate: API inventory vs actual endpoints | ⬜ TODO | 143 endpoints verified |
| T21.2 | KIEN | HIGH | Validate: Error codes used consistently | ⬜ TODO | No hardcoded error messages |
| T21.3 | KIEN | HIGH | Validate: All DTOs have validation decorators | ⬜ TODO | All inputs validated |
| T21.4 | KIEN | MEDIUM | Validate: Event contracts match handlers | ⬜ TODO | No orphan events |
| T21.5 | KIEN | MEDIUM | Compile check: All 6 services build | ⬜ TODO | `tsc --noEmit` passes |
| T21.6 | KIEN | MEDIUM | Documentation: Update API-INVENTORY.md | ⬜ TODO | Docs match code |

#### Definition of Done - Phase 5

- [ ] Gateway proxy forward all 6 services verified by integration tests
- [ ] Swagger at `/api/docs` shows all endpoints
- [ ] Response format consistent across all services verified by tests
- [ ] Error codes used in all services (no hardcoded strings)
- [x] All seven Nest service builds pass
- [ ] Postman collection covers all endpoints verified locally
- [ ] Integration tests pass for all flows (T20.x)
- [ ] API-INVENTORY.md matches actual implementation

---

## 📦 Deliverables Phase 5

```
🔄 Sprint 17: Gateway proxy implementation
🔄 Sprint 18: Response format standardization
🔄 Sprint 19: Swagger + Postman local
⬜ Sprint 20: Integration tests
⬜ Sprint 21: Documentation validation
```

---

## 🔗 Dependencies

```
Sprint 17 → Sprint 18 → Sprint 19 → Sprint 20 → Sprint 21
(complete)   (complete)   (complete)  (pending)   (pending)
```

---

## 📝 Notes

**KIEN:** Đang làm Phase 5 - Integration (2026-08-25)

---

## 📅 Update Log

| Date | Owner | Changes |
|------|-------|---------|
| 2026-08-24 | KIEN | Created Phase 5 structure |
| 2026-08-25 | KIEN | Restructured: Sprints 17-21, updated status |
| 2026-08-25 | Codex | Gateway proxy routing verified for 6 services; aggregate OpenAPI and all-service health check verified locally |
