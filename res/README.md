# 📦 Results & Resources - HUKI EBOOK

## Overview

Thư mục này chứa API response schemas, domain schemas, và inter-service contracts.

## Structure

```
res/
├── API/                     # API Response Schemas
│   ├── success.md         # Success response format
│   ├── error.md           # Error response format
│   ├── pagination.md      # Pagination response
│   └── validation.md       # Validation error format
├── DOMAIN/                 # Domain Models
│   ├── user.md            # User schema
│   ├── book.md            # Book schema
│   ├── order.md           # Order schema
│   ├── voucher.md         # Voucher schema
│   └── ...
└── CONTRACTS/             # Inter-service Contracts
    ├── event-schema.md    # Event payload schemas
    └── internal-api.md    # Internal API contracts
```

## Quick Reference

| Category | Description |
|----------|-------------|
| Success | Standard success response |
| Error | Error response with code |
| Pagination | Paginated list response |
| Domain | Entity schemas |
| Events | Event payload structures |

---

## 🔄 Phase 07 Updates (2026-08-27)

### Swagger Documentation

| Service | Swagger URL | Paths |
|---------|-------------|-------|
| Gateway | `http://localhost:3000/api/docs` | ✅ |
| Identity | `http://localhost:3001/api/docs` | ✅ |
| Business | `http://localhost:3002/api/docs` | ✅ |
| Commerce | `http://localhost:3003/api/docs` | ✅ |
| Shipping | `http://localhost:3004/api/docs` | ✅ |
| Community | `http://localhost:3005/api/docs` | ✅ |
| Promotion | `http://localhost:3007/api/docs` | ✅ |

**Total:** 143 Swagger paths, 72 schemas

### Sprint 29: Swagger Complete ✅

All endpoints have `@ApiOperation` decorators:
- Forum, Reviews, Chat, Notifications (Community)
- Orders, Checkout (Commerce)
- Addresses (Shipping)

---

## Update History

| Date | Change | Author |
|------|--------|--------|
| 2026-08-27 | Sprint 29 - Swagger documented | KIEN |
| 2026-08-24 | Initial structure | Claude |

---

*For specific schemas: Check individual files*
