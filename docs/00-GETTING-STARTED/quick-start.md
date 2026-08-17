# ⚡ Quick Start

Hướng dẫn bắt đầu nhanh trong 5 phút.

## 🎯 Mục tiêu

Sau khi hoàn thành, bạn sẽ:
- ✅ Có môi trường development chạy
- ✅ Các services đều healthy
- ✅ Có thể tạo tài khoản và login
- ✅ Hiểu cách chạy từng phần

## ⏱️ 5 Phút Guide

### Phase 1: Setup (2 phút)

```bash
# 1. Clone và di chuyển vào thư mục
git clone https://github.com/your-org/huki-ebook.git
cd huki-ebook

# 2. Copy .env file
cp .env.example .env

# 3. Start Docker services (PostgreSQL, MongoDB, Redis, RabbitMQ)
docker-compose up -d postgres mongo redis rabbitmq
```

### Phase 2: Start Backend (2 phút)

```bash
# Mở terminal mới, start API Gateway
cd services/api-gateway
npm run start:dev

# Mở terminal mới, start Identity Service
cd services/identity-service
npm run start:dev

# Mở terminal mới, start Commerce Service
cd services/commerce-service
npm run start:dev

# (Start các service khác nếu cần)
```

### Phase 3: Start Frontend (1 phút)

```bash
# Mở terminal mới, start Web
cd apps/web
npm run dev
```

### Phase 4: Verify (30 giây)

```bash
# Test API Gateway
curl http://localhost:3000/health
# Expected: {"status":"ok","services":{...}}

# Open browser
open http://localhost:3000
```

## ✅ Kết quả mong đợi

| Service | URL | Status |
|---------|-----|--------|
| API Gateway | http://localhost:3000 | ✅ Running |
| Identity Service | http://localhost:3001 | ✅ Running |
| Commerce Service | http://localhost:3003 | ✅ Running |
| Web Frontend | http://localhost:3000 | ✅ Running |

## 🔧 Nếu gặp lỗi

### Lỗi: Port already in use

```bash
# macOS/Linux
lsof -i :3000
kill -9 <PID>

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Lỗi: Database connection failed

```bash
# Kiểm tra Docker đang chạy
docker ps

# Restart PostgreSQL
docker-compose restart postgres
```

### Lỗi: npm install failed

```bash
# Xóa node_modules và cài lại
rm -rf node_modules package-lock.json
npm install
```

## 📖 Tiếp theo

Sau khi hoàn thành Quick Start:

1. [Environment Setup](./environment-setup.md) - Cấu hình chi tiết
2. [First API Call](./first-api-call.md) - Test API đầu tiên
3. [API Reference](../04-API-REFERENCE/) - Khám phá API
4. [Architecture](../02-ARCHITECTURE/) - Hiểu kiến trúc
