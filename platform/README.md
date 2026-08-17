# 🚀 Platform - Backend Services

NestJS Microservices cho HUKI EBOOK.

## 📁 Services

| Service | Port | Database | Mô tả |
|---------|------|---------|--------|
| **identity-service** | 3001 | PostgreSQL | Auth, Users, Sessions |
| **business-service** | 3002 | PostgreSQL | Business, Stores, Members |
| **commerce-service** | 3003 | PostgreSQL | Books, Cart, Orders |
| **shipping-service** | 3004 | PostgreSQL | Shipping, Delivery |
| **community-service** | 3005 | MongoDB | Forum, Chat, Reviews |
| **promotion-service** | 3007 | PostgreSQL | Vouchers, Promotions |
| **api-gateway** | 3000 | - | API Gateway |

## 🏃 Chạy Services

### 1. Start Infrastructure (Docker)

```bash
# Từ root project
docker-compose up -d postgres mongo redis rabbitmq

# Kiểm tra
docker-compose ps
```

### 2. Install Dependencies

```bash
cd platform
npm install
```

### 3. Copy Environment

```bash
cp .env.example .env
```

### 4. Start Services

```bash
# Identity Service
npm run start:identity

# Các service khác (mỗi terminal)
npm run start:business
npm run start:commerce
npm run start:shipping
npm run start:community
npm run start:promotion
npm run start:gateway
```

## 📚 API Documentation

Sau khi chạy, truy cập Swagger:

- Identity: http://localhost:3001/api/docs
- Business: http://localhost:3002/api/docs
- Commerce: http://localhost:3003/api/docs
- Shipping: http://localhost:3004/api/docs
- Community: http://localhost:3005/api/docs
- Promotion: http://localhost:3007/api/docs
- API Gateway: http://localhost:3000/api/docs

## 🧪 Health Check

```bash
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
```

## 📝 Development

### Tạo Service Mới

```bash
# Tạo folder structure cho service mới
mkdir -p apps/new-service/src/modules
```

### Tạo Module Pattern

```typescript
// src/modules/example/example.module.ts
@Module({})
export class ExampleModule {}
```

## 📦 Monorepo Commands

```bash
# Build all
npm run build:all

# Lint all
npm run lint

# Test all
npm run test

# Start all services
npm run start:all
```

## 🔧 Configuration

Xem `.env.example` để biết các biến môi trường cần thiết.

## 📂 Structure

```
platform/
├── apps/
│   ├── identity-service/      # Auth, Users, Sessions
│   ├── business-service/      # Business, Stores
│   ├── commerce-service/      # Books, Cart, Orders
│   ├── shipping-service/      # Shipping
│   ├── community-service/     # Forum, Chat (MongoDB)
│   ├── promotion-service/     # Vouchers
│   └── api-gateway/         # API Gateway
│
├── libs/
│   └── shared/               # Shared decorators, utils
│
├── config/
│   └── configuration.ts       # Config loader
│
└── docker/                   # Docker configs
```
