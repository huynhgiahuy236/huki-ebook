# 🚨 Error Rules - HUKI EBOOK

## Overview

Thư mục này chứa tất cả error codes, handlers, và patterns cho việc xử lý lỗi trong hệ thống.

## Structure

```
err/
├── CODES/                    # Error codes by domain
│   ├── 00-common.md        # AUTH, VALIDATION, SYSTEM
│   ├── 01-identity.md      # USER, SESSION
│   ├── 02-business.md      # BUSINESS, STORE, MEMBER
│   ├── 03-commerce.md      # BOOK, CART, CHECKOUT, ORDER
│   ├── 04-payment.md       # PAYMENT, REFUND
│   ├── 05-shipping.md      # SHIPMENT, ADDRESS
│   ├── 06-community.md     # FORUM, CHAT, REVIEW
│   └── 07-promotion.md    # VOUCHER, BANNER, FLASH_SALE
├── HANDLERS/               # Error handler patterns
│   ├── http-status.md      # HTTP status mapping
│   ├── exception-patterns.md # NestJS patterns
│   └── client-handling.md  # Frontend handling guide
└── TESTS/                  # Error testing
    └── error-scenarios.md # Test cases
```

## Quick Reference

| Prefix | Domain | HTTP Range |
|--------|--------|------------|
| AUTH_* | Authentication | 401 |
| AUTHZ_* | Authorization | 403 |
| USER_* | User | 4xx |
| BUSINESS_* | Business | 4xx |
| STORE_* | Store | 4xx |
| BOOK_* | Book | 4xx |
| CART_* | Cart | 4xx |
| CHECKOUT_* | Checkout | 4xx |
| ORDER_* | Order | 4xx |
| PAYMENT_* | Payment | 4xx |
| SHIPMENT_* | Shipment | 4xx |
| VOUCHER_* | Voucher | 4xx |
| VALIDATION_* | Validation | 400 |
| SYSTEM_* | System | 5xx |

## Usage

### Throwing Errors in Code

```typescript
// ❌ OLD - Bad
throw new NotFoundException('Book not found');

// ✅ NEW - Good (with error code)
import { NotFoundException, ErrorCode } from '@app/shared';
throw new NotFoundException({
  message: 'Sách không tìm thấy',
  code: ErrorCode.BOOK_NOT_FOUND,
});
```

### Error Response Format

```json
{
  "statusCode": 404,
  "message": "Sách không tìm thấy",
  "code": "BOOK_NOT_FOUND",
  "timestamp": "2026-08-24T10:00:00.000Z",
  "path": "/api/v1/books/123"
}
```

## Validation Checklist

- [x] All errors use ErrorCode enum
- [x] All errors have Vietnamese message
- [x] HTTP status matches error type
- [x] Client can handle based on error code
- [x] Error codes documented in CODES/

---

## 🔄 Phase 07 Updates (2026-08-27)

### Sprint 28: Error Codes Standardized ✅

| Service | Guards/Services | Status |
|---------|----------------|--------|
| Commerce | book-auth.guard, catalog-admin.guard | ✅ |
| Shipping | shipping-auth.guard, addresses.service | ✅ |
| Community | community-auth.guard | ✅ |
| Promotion | roles.guard | ✅ |
| Identity | business-roles.guard, roles.guard | ✅ |

**Result:** 84 hardcoded strings → ErrorCode enum

**New Error Code Added:**
```
AUTH_INTERNAL_API_KEY_INVALID
```

---

## Update History

| Date | Change | Author |
|------|--------|--------|
| 2026-08-27 | Sprint 28 - Error codes standardized | KIEN |
| 2026-08-24 | Initial structure | Claude |

---

*For questions: Check individual CODES/ files or HANDLERS/*
