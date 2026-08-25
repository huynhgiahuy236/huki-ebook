# 🚀 HUKI EBOOK - Development Guide

## Quick Start

### 1. Start Infrastructure (Docker)
```bash
cd e:/HuKi
docker compose up -d
```

### 2. Install Dependencies
```bash
cd platform
npm install
```

### 3. Generate Prisma Client
```bash
npm run prisma:generate
```

### 4. Run Migrations
```bash
npm run prisma:migrate:deploy
```

### 5. Start Development (Auto-reload với Nodemon)
```bash
npm run dev
```

---

## Commands

### Start All Services (Khuyên dùng)
```bash
npm run dev
```
- Chạy tất cả 7 services với nodemon
- Tự động reload khi code thay đổi
- Mỗi service có màu riêng trong terminal

### Start Individual Service
```bash
npm run dev:gateway      # API Gateway - Port 3000
npm run dev:identity      # Identity - Port 3001
npm run dev:business      # Business - Port 3002
npm run dev:commerce      # Commerce - Port 3003
npm run dev:shipping      # Shipping - Port 3004
npm run dev:community     # Community - Port 3005
npm run dev:promotion     # Promotion - Port 3007
```

### Other Commands
```bash
npm run build             # Build all
npm run build:commerce    # Build commerce only
npm run test              # Run tests
npm run lint              # Lint code
```

---

## Service URLs

| Service | Port | Swagger UI | Description |
|---------|------|------------|-------------|
| API Gateway | 3000 | http://localhost:3000/api/docs | Routes to microservices |
| Identity | 3001 | http://localhost:3001/api/docs | Auth, Users, Sessions |
| Business | 3002 | http://localhost:3002/api/docs | Business, Stores |
| Commerce | 3003 | http://localhost:3003/api/docs | Books, Orders, Payments |
| Shipping | 3004 | http://localhost:3004/api/docs | Shipments, Addresses |
| Community | 3005 | http://localhost:3005/api/docs | Forum, Chat, Reviews |
| Promotion | 3007 | http://localhost:3007/api/docs | Vouchers, Banners |

---

## Environment Setup

Copy `.env.example` files và tạo `.env`:

```bash
# Gateway
cp apps/api-gateway/.env.example apps/api-gateway/.env

# Commerce
cp apps/commerce-service/.env.example apps/commerce-service/.env
```

### Required Environment Variables

**Gateway (apps/api-gateway/.env)**
```
API_GATEWAY_PORT=3000
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:3000
```

**Commerce (apps/commerce-service/.env)**
```
COMMERCE_SERVICE_PORT=3003
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/huki_commerce
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## Docker Services

| Service | Port | Database |
|---------|------|----------|
| PostgreSQL | 5432 | huki_identity, huki_business, huki_commerce, huki_shipping, huki_promotion |
| MongoDB | 27017 | huki_community |
| Redis | 6379 | Cache |
| RabbitMQ | 5672 | Message Queue |

### Check Docker Status
```bash
docker compose ps
docker compose logs -f
```

---

## Troubleshooting

### Port Already in Use
```bash
# Windows
netstat -ano | findstr 3000
taskkill /PID <pid> /F

# Linux/Mac
lsof -i :3000
kill -9 <pid>
```

### Prisma Issues
```bash
# Regenerate Prisma Client
npm run prisma:generate

# Reset Database
npx prisma migrate reset --schema apps/commerce-service/prisma/schema.prisma
```

### Clean Rebuild
```bash
# Xóa node_modules và cài lại
rm -rf node_modules package-lock.json
npm install

# Build lại
npm run build
```

---

## Development Tips

1. **Code Changes**: Nodemon tự detect và reload
2. **Swagger Docs**: Xem tại http://localhost:3003/api/docs (commerce)
3. **Database**: Dùng Prisma Studio
   ```bash
   npx prisma studio --schema apps/commerce-service/prisma/schema.prisma
   ```
4. **Logs**: Xem terminal để debug

---

## API Documentation

- Swagger UI: http://localhost:3000/api/docs
- OpenAPI Spec: `/res/openapi/huki-ebook-openapi.yaml`
