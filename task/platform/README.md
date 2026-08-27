# Platform - Backend Services

## Overview
Backend microservices architecture for HUKI EBOOK platform.

## Phases

### Completed ✅
| Phase | Name | Status |
|-------|------|--------|
| 01 | Backend Setup | ✅ DONE |
| 02 | Commerce Catalog | ✅ DONE |
| 03 | Payment & Shipping | ✅ DONE |
| 04 | Community | ✅ DONE |
| 05 | Integration | ✅ DONE |
| 06 | Quality Assurance | 🔄 IN PROGRESS |
| 07 | Production Launch | 🔄 IN PROGRESS |

## Services

```
platform/
├── api-gateway/        # HTTP Gateway (Port 3000)
├── identity-service/   # Auth & Users (Port 3001)
├── business-service/    # Business & Store (Port 3002)
├── commerce-service/   # Books, Cart, Orders (Port 3003)
├── shipping-service/   # Addresses, Shipping (Port 3004)
├── community-service/   # Forum, Chat (Port 3005)
└── promotion-service/ # Vouchers, Banners (Port 3007)
```

## Quick Start

```bash
cd e:/HuKi/platform
npm run dev
```

## Tech Stack
- NestJS
- PostgreSQL (Prisma)
- MongoDB (Community)
- Redis
- RabbitMQ
