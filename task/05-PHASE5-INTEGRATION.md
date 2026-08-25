# 📋 PHASE 5: Backend Completion
**Thời gian ước tính: 2-3 tuần**

## Mục tiêu
- API Gateway proxy hoàn chỉnh (Sprint 17)
- Response format đồng nhất (Sprint 18)
- Error handling chuẩn hóa (Sprint 19)
- Documentation & Postman collection (Sprint 20)
- Testing & Validation (Sprint 21)

## Phụ thuộc
- Phase 1, 2, 3, 4 hoàn thành

---

## 🐙 Tasks

### Sprint 17: API Gateway Proxy — **ƯU TIÊN CAO NHẤT**

| Task | Người | Priority | Mô tả | Trạng thái |
|------|-------|---------|-------|------------|
| T17.1 | KIEN | HIGH | Gateway module: Import HTTP clients cho 6 microservices | ⬜ |
| T17.2 | KIEN | HIGH | Proxy controller: Forward `/api/v1/auth/*` → Identity (3001) | ⬜ |
| T17.3 | KIEN | HIGH | Proxy controller: Forward `/api/v1/business/*` → Business (3002) | ⬜ |
| T17.4 | KIEN | HIGH | Proxy controller: Forward `/api/v1/books/*`, `/api/v1/cart/*`, `/api/v1/orders/*` → Commerce (3003) | ⬜ |
| T17.5 | KIEN | HIGH | Proxy controller: Forward `/api/v1/shipping/*`, `/api/v1/shipments/*` → Shipping (3004) | ⬜ |
| T17.6 | KIEN | HIGH | Proxy controller: Forward `/api/v1/forum/*`, `/api/v1/chat/*`, `/api/v1/reviews/*` → Community (3005) | ⬜ |
| T17.7 | KIEN | HIGH | Proxy controller: Forward `/api/v1/vouchers/*`, `/api/v1/banners/*`, `/api/v1/flash-sales/*` → Promotion (3007) | ⬜ |
| T17.8 | KIEN | HIGH | Swagger: Tự động load endpoints từ tất cả services | ⬜ |
| T17.9 | KIEN | MEDIUM | Health check: Kiểm tra tất cả 6 services | ⬜ |
| T17.10 | KIEN | MEDIUM | Timeout & retry logic cho proxy | ⬜ |

#### Luồng Gateway Proxy đã triển khai

1. Gateway lắng nghe port 3000, nhận tất cả HTTP requests từ clients
2. Auth middleware xác thực JWT token, gắn user vào request
3. Proxy controller đọc path, forward sang service tương ứng qua HTTP
4. Response từ service được trả về client với format đồng nhất
5. Swagger UI tại `/api/docs` hiển thị toàn bộ endpoints từ 6 services

#### Routes Mapping

```
/api/v1/auth/*         → http://localhost:3001/api/v1/auth/*
/api/v1/users/*       → http://localhost:3001/api/v1/users/*
/api/v1/sessions/*    → http://localhost:3001/api/v1/sessions/*
/api/v1/businesses/*  → http://localhost:3002/api/v1/businesses/*
/api/v1/stores/*      → http://localhost:3002/api/v1/stores/*
/api/v1/books/*       → http://localhost:3003/api/v1/books/*
/api/v1/categories/*  → http://localhost:3003/api/v1/categories/*
/api/v1/cart/*        → http://localhost:3003/api/v1/cart/*
/api/v1/orders/*      → http://localhost:3003/api/v1/orders/*
/api/v1/payments/*    → http://localhost:3003/api/v1/payments/*
/api/v1/shipping/*    → http://localhost:3004/api/v1/shipping/*
/api/v1/shipments/*   → http://localhost:3004/api/v1/shipments/*
/api/v1/forum/*       → http://localhost:3005/api/v1/forum/*
/api/v1/chat/*       → http://localhost:3005/api/v1/chat/*
/api/v1/reviews/*     → http://localhost:3005/api/v1/reviews/*
/api/v1/notifications/* → http://localhost:3005/api/v1/notifications/*
/api/v1/vouchers/*    → http://localhost:3007/api/v1/vouchers/*
/api/v1/banners/*     → http://localhost:3007/api/v1/banners/*
/api/v1/flash-sales/* → http://localhost:3007/api/v1/flash-sales/*
```

---

### Sprint 18: Response Format Standardization

| Task | Người | Priority | Mô tả | Trạng thái |
|------|-------|---------|-------|------------|
| T18.1 | KIEN | HIGH | Cập nhật HttpExceptionFilter dùng format chuẩn | ⬜ |
| T18.2 | KIEN | HIGH | Áp dụng responseSuccess() vào tất cả controllers | ⬜ |
| T18.3 | KIEN | HIGH | Áp dụng responseSuccessPaginated() cho list endpoints | ⬜ |
| T18.4 | KIEN | MEDIUM | Xóa duplicate response helpers trong từng service | ⬜ |
| T18.5 | KIEN | MEDIUM | Response interceptor cho metadata (timestamp, path) | ⬜ |

#### Response Format Chuẩn

```typescript
// Success Response
{
  status: "success",
  statusCode: 200,
  message: "Thành công",
  data: { ... }
}

// Paginated Response
{
  status: "success",
  statusCode: 200,
  message: "Lấy danh sách thành công",
  data: [ ... ],
  pagination: {
    page: 1,
    limit: 10,
    total: 100,
    totalPages: 10
  }
}

// Error Response
{
  status: "error",
  statusCode: 400,
  message: "Validation failed",
  code: "VALIDATION_ERROR",
  details: [ ... ],
  timestamp: "2026-08-24T10:00:00.000Z",
  path: "/api/v1/books"
}
```

---

### Sprint 19: Error Handling & Logging

| Task | Người | Priority | Mô tả | Trạng thái |
|------|-------|---------|-------|------------|
| T19.1 | KIEN | HIGH | Cập nhật error-code.ts đầy đủ | ⬜ |
| T19.2 | KIEN | HIGH | Global exception filter với structured logging | ⬜ |
| T19.3 | KIEN | HIGH | Error response interceptor | ⬜ |
| T19.4 | KIEN | MEDIUM | Request/Response logging middleware | ⬜ |
| T19.5 | KIEN | MEDIUM | Validation pipe với custom error messages | ⬜ |

#### Error Codes Chuẩn

```typescript
// Authentication (AUTH_*)
AUTH_TOKEN_INVALID
AUTH_TOKEN_EXPIRED
AUTH_TOKEN_MISSING
AUTH_LOGIN_INVALID_CREDENTIALS

// Validation (VALIDATION_*)
VALIDATION_ERROR
VALIDATION_REQUIRED_FIELD
VALIDATION_INVALID_FORMAT
VALIDATION_DUPLICATE

// Resource (RESOURCE_*)
RESOURCE_NOT_FOUND
RESOURCE_ALREADY_EXISTS
RESOURCE_ACCESS_DENIED

// Business (BUSINESS_*)
BUSINESS_NOT_APPROVED
STORE_NOT_FOUND
BOOK_NOT_PUBLISHED

// Cart (CART_*)
CART_ITEM_NOT_FOUND
CART_EMPTY
CART_ITEM_LIMIT_EXCEEDED

// Order (ORDER_*)
ORDER_NOT_FOUND
ORDER_ALREADY_PAID
ORDER_CANNOT_CANCEL
INVENTORY_NOT_SUFFICIENT

// Payment (PAYMENT_*)
PAYMENT_FAILED
PAYMENT_TIMEOUT
PAYMENT_CANCELLED

// Shipping (SHIPPING_*)
SHIPPING_ADDRESS_INVALID
SHIPMENT_NOT_FOUND
DELIVERY_FAILED
```

---

### Sprint 20: Documentation & Postman Collection

| Task | Người | Priority | Mô tả | Trạng thái |
|------|-------|---------|-------|------------|
| T20.1 | KIEN | HIGH | Verify Swagger endpoints đầy đủ | ⬜ |
| T20.2 | KIEN | HIGH | Postman collection: Identity APIs | ⬜ |
| T20.3 | KIEN | HIGH | Postman collection: Commerce APIs | ⬜ |
| T20.4 | KIEN | HIGH | Postman collection: Shipping APIs | ⬜ |
| T20.5 | KIEN | MEDIUM | Postman collection: Community APIs | ⬜ |
| T20.6 | KIEN | MEDIUM | Postman collection: Promotion APIs | ⬜ |
| T20.7 | KIEN | MEDIUM | Environment variables: Local, Dev, Staging | ⬜ |
| T20.8 | KIEN | MEDIUM | API contracts documentation | ⬜ |

---

### Sprint 21: Testing & Validation

| Task | Người | Priority | Mô tả | Trạng thái |
|------|-------|---------|-------|------------|
| T21.1 | KIEN | HIGH | Test: Auth flow (register, login, refresh, logout) | ⬜ |
| T21.2 | KIEN | HIGH | Test: Business & Store CRUD | ⬜ |
| T21.3 | KIEN | HIGH | Test: Book catalog flow | ⬜ |
| T21.4 | KIEN | HIGH | Test: Cart & Checkout flow | ⬜ |
| T21.5 | KIEN | HIGH | Test: Order & Payment flow | ⬜ |
| T21.6 | KIEN | MEDIUM | Test: Shipping flow | ⬜ |
| T21.7 | KIEN | MEDIUM | Test: Forum & Chat flow | ⬜ |
| T21.8 | KIEN | MEDIUM | Test: Error scenarios | ⬜ |

---

## 📊 Progress Tracking

```
⬜ Sprint 17: API Gateway Proxy
⬜ Sprint 18: Response Format Standardization
⬜ Sprint 19: Error Handling & Logging
⬜ Sprint 20: Documentation & Postman Collection
⬜ Sprint 21: Testing & Validation

📦 Deliverables Phase 5:
- [ ] Gateway proxy hoạt động (Swagger 3000 đầy đủ)
- [ ] Response format đồng nhất
- [ ] Error codes chuẩn hóa
- [ ] Postman collection đầy đủ
- [ ] Tất cả flows test được
```

---

## 🔗 Dependencies

- Sprint 18-21 cần Sprint 17 xong
- Sprint 20 cần Sprint 18, 19 xong
- Sprint 21 cần Sprint 20 xong

---

## 📝 Notes

**KIEN:** Tập trung Gateway, Response, Error handling, Testing
**HUY:** Hỗ trợ testing, validation

---

## 📅 Update Log

| Ngày | Người | Task hoàn thành |
|------|--------|-----------------|
| 2026-08-24 | KIEN | Tạo Phase 5 structure |
