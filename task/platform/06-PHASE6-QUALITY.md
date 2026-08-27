# 📋 PHASE 6: Backend Quality & Local Reliability
**Thời gian ước tính: 2-3 tuần**
**Status: PLANNED**
**Dependency: Phase 5 (Integration)**

## 🎯 Mục tiêu
Nâng cao chất lượng code: error-code adoption toàn service, structured logging, correlation ID, health checks, event reliability, retry/DLQ, và unit test coverage.

## ⚠️ Lưu ý quan trọng
- **Không đưa PayOS production webhook vào điều kiện hoàn thành phase này**
- Tập trung local reliability trước

---

## 🐙 Tasks

### Sprint 22: Error-Code Adoption & Structured Logging

| Task | Owner | Priority | Description | Status | Definition of Done |
|------|-------|----------|-------------|--------|-------------------|
| T22.1 | KIEN | HIGH | Error-code adoption: Identity service | ⬜ TODO | All exceptions use ErrorCode enum |
| T22.2 | KIEN | HIGH | Error-code adoption: Business service | ⬜ TODO | All exceptions use ErrorCode enum |
| T22.3 | KIEN | HIGH | Error-code adoption: Commerce service | ✅ DONE | All exceptions use ErrorCode enum |
| T22.4 | KIEN | HIGH | Error-code adoption: Shipping service | ⬜ TODO | All exceptions use ErrorCode enum |
| T22.5 | KIEN | HIGH | Error-code adoption: Community service | ⬜ TODO | All exceptions use ErrorCode enum |
| T22.6 | KIEN | HIGH | Error-code adoption: Promotion service | ⬜ TODO | All exceptions use ErrorCode enum |
| T22.7 | KIEN | MEDIUM | Structured logging: Add correlation ID to all logs | ⬜ TODO | Every log has `correlationId` |
| T22.8 | KIEN | MEDIUM | Request/Response logging interceptor | ⬜ TODO | All requests logged with duration |

#### Structured Log Format

```json
{
  "timestamp": "2026-08-25T10:00:00.000Z",
  "level": "info",
  "correlationId": "uuid-v4",
  "service": "commerce-service",
  "method": "POST",
  "path": "/api/v1/orders",
  "userId": "user-123",
  "duration": 150,
  "statusCode": 201,
  "message": "Order created successfully"
}
```

#### ErrorCode Adoption Checklist

```typescript
// ❌ BEFORE (hardcoded)
throw new NotFoundException('Order not found');
throw new BadRequestException('Cart is empty');

// ✅ AFTER (ErrorCode enum)
throwNotFound(ErrorCode.ORDER_NOT_FOUND);
throwBadRequest(ErrorCode.CART_EMPTY);
```

---

### Sprint 23: Health Checks & Database Reliability

| Task | Owner | Priority | Description | Status | Definition of Done |
|------|-------|----------|-------------|--------|-------------------|
| T23.1 | KIEN | HIGH | Health check: DB connection per service | ⬜ TODO | /health endpoint checks Prisma |
| T23.2 | KIEN | HIGH | Health check: Redis connection (cart cache) | ⬜ TODO | Redis ping returns pong |
| T23.3 | KIEN | HIGH | Health check: RabbitMQ connection | ⬜ TODO | Channel can be created |
| T23.4 | KIEN | MEDIUM | Readiness probe: All deps healthy before accepting traffic | ⬜ TODO | Gateway checks all services |
| T23.5 | KIEN | MEDIUM | Graceful shutdown: Complete in-flight requests | ⬜ TODO | 30s drain timeout |
| T23.6 | KIEN | MEDIUM | Connection pool monitoring | ⬜ TODO | Log warnings on pool exhaustion |

#### Health Check Response

```json
{
  "status": "ok",
  "timestamp": "2026-08-25T10:00:00.000Z",
  "services": {
    "database": { "status": "ok", "latency": 5 },
    "redis": { "status": "ok", "latency": 2 },
    "rabbitmq": { "status": "ok", "latency": 10 }
  }
}
```

---

### Sprint 24: Outbox & Event Reliability

| Task | Owner | Priority | Description | Status | Definition of Done |
|------|-------|----------|-------------|--------|-------------------|
| T24.1 | KIEN | HIGH | Outbox pattern: Verify all events use outbox | ✅ DONE | Events stored before publishing |
| T24.2 | KIEN | HIGH | Event contract versioning: Add `version` field | ⬜ TODO | All events have `version: "1.0"` |
| T24.3 | KIEN | HIGH | Retry logic: Exponential backoff for failed publishes | ⬜ TODO | 3 retries with 1s/2s/4s delay |
| T24.4 | KIEN | HIGH | Dead Letter Queue: Failed events go to DLQ | ⬜ TODO | Events retried 3x then DLQ |
| T24.5 | KIEN | HIGH | Idempotency: Prevent duplicate event processing | ⬜ TODO | Event ID used as idempotency key |
| T24.6 | KIEN | MEDIUM | Event audit: Track event processing status | ⬜ TODO | OutboxEvent table has status tracking |

#### Event Contract Versioning

```typescript
interface BaseEvent {
  eventId: string;      // UUID v4
  version: "1.0";      // Contract version
  timestamp: string;    // ISO 8601
  correlationId: string; // Request correlation
}

interface OrderCreatedEvent extends BaseEvent {
  type: "ORDER_CREATED";
  payload: {
    orderId: string;
    orderCode: string;
    userId: string;
    total: number;
    // ... other fields
  };
}
```

---

### Sprint 25: Unit Test Coverage

| Task | Owner | Priority | Description | Status | Definition of Done |
|------|-------|----------|-------------|--------|-------------------|
| T25.1 | KIEN | HIGH | Identity: Auth service tests | ⬜ TODO | 80%+ coverage |
| T25.2 | KIEN | HIGH | Identity: User service tests | ⬜ TODO | 80%+ coverage |
| T25.3 | KIEN | HIGH | Business: Store/Member tests | ⬜ TODO | 80%+ coverage |
| T25.4 | KIEN | HIGH | Commerce: Cart/Checkout tests | ⬜ TODO | 80%+ coverage |
| T25.5 | KIEN | HIGH | Commerce: Order state machine tests | ⬜ TODO | All transitions tested |
| T25.6 | KIEN | HIGH | Commerce: Payment service tests | ⬜ TODO | Webhook handling tested |
| T25.7 | KIEN | MEDIUM | Shipping: Address/Shipment tests | ⬜ TODO | 80%+ coverage |
| T25.8 | KIEN | MEDIUM | Community: Forum/Chat tests | ⬜ TODO | 80%+ coverage |
| T25.9 | KIEN | MEDIUM | Promotion: Voucher/Flash sale tests | ⬜ TODO | 80%+ coverage |

#### Test Coverage Requirements

| Service | Current | Target |
|---------|---------|--------|
| Identity | 0% | 80%+ |
| Business | 0% | 80%+ |
| Commerce | 0% | 80%+ |
| Shipping | 0% | 80%+ |
| Community | 0% | 80%+ |
| Promotion | 0% | 80%+ |

---

### Sprint 26: E2E Tests via Gateway

| Task | Owner | Priority | Description | Status | Definition of Done |
|------|-------|----------|-------------|--------|-------------------|
| T26.1 | KIEN | HIGH | E2E: Full auth flow (register → login → access protected) | ⬜ TODO | Test passes |
| T26.2 | KIEN | HIGH | E2E: Complete purchase flow (browse → cart → checkout → order) | ⬜ TODO | Full flow tested |
| T26.3 | KIEN | HIGH | E2E: Seller publishes book → buyer purchases | ⬜ TODO | End-to-end tested |
| T26.4 | KIEN | MEDIUM | E2E: Apply voucher on checkout | ⬜ TODO | Discount applied |
| T26.5 | KIEN | MEDIUM | E2E: COD order flow | ⬜ TODO | Order confirmed without payment |
| T26.6 | KIEN | MEDIUM | E2E: Chat between buyer and seller | ⬜ TODO | Messages delivered |

#### E2E Test Stack

- **Framework:** Jest with `@nestjs/testing`
- **Database:** Test containers (PostgreSQL, MongoDB)
- **HTTP Client:** Supertest via Gateway
- **Coverage:** All critical user flows

---

## 📦 Deliverables Phase 6

```
⬜ Sprint 22: Error-code adoption complete
⬜ Sprint 23: Health checks & reliability
⬜ Sprint 24: Outbox & event reliability
⬜ Sprint 25: Unit tests (80%+ coverage)
⬜ Sprint 26: E2E tests via gateway
```

---

## 🔗 Dependencies

```
Phase 5 Sprint 21 → Sprint 22 → Sprint 23 → Sprint 24 → Sprint 25 → Sprint 26
                  (error codes)  (health)    (events)    (unit)     (e2e)
```

---

## 📝 Notes

**KIEN:** Planning Phase 6 after Phase 5 complete
**HUY:** Support testing efforts

---

## 📅 Update Log

| Date | Owner | Changes |
|------|-------|---------|
| 2026-08-25 | KIEN | Created Phase 6 |
