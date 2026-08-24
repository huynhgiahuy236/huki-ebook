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

## Update History

| Date | Change | Author |
|------|--------|--------|
| 2026-08-24 | Initial structure | Claude |

---

*For specific schemas: Check individual files*
