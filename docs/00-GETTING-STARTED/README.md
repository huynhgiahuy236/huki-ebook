# 🚀 Getting Started

Hướng dẫn bắt đầu phát triển dự án HUKI EBOOK.

## 📋 Prerequisites

Trước khi bắt đầu, đảm bảo bạn đã cài đặt:

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | >= 18.x | Backend (NestJS) |
| npm/yarn/pnpm | Latest | Package manager |
| Docker | >= 24.x | Container runtime |
| Docker Compose | >= 2.x | Multi-container setup |
| Git | >= 2.x | Version control |
| VS Code | Latest | IDE (recommended) |
| PostgreSQL Client | Latest | Database inspection |
| Redis Client | Latest | Cache inspection |

### Optional Software

| Software | Purpose |
|----------|---------|
| MongoDB Compass | MongoDB GUI |
| pgAdmin | PostgreSQL GUI |
| RedisInsight | Redis GUI |
| Postman/Insomnia | API testing |
| Figma | Design inspection |

## 📥 Repository Setup

```bash
# Clone repository
git clone https://github.com/your-org/huki-ebook.git
cd huki-ebook

# Install dependencies for all services
npm run install:all

# Copy environment files
cp .env.example .env
```

## ⚙️ Environment Configuration

Xem chi tiết: [Environment Setup](./environment-setup.md)

## 🐳 Docker Setup

Xem chi tiết: [Docker Setup](./docker-setup.md)

### Quick Start with Docker

```bash
# Build and start all services
docker-compose up -d

# Check services status
docker-compose ps

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## 🖥️ Local Development (Without Docker)

```bash
# Start PostgreSQL
# Start MongoDB
# Start Redis
# Start RabbitMQ

# Then start each service:

# Terminal 1 - Identity Service
cd services/identity-service
npm run start:dev

# Terminal 2 - Business Service
cd services/business-service
npm run start:dev

# Terminal 3 - Commerce Service
cd services/commerce-service
npm run start:dev

# Terminal 4 - Shipping Service
cd services/shipping-service
npm run start:dev

# Terminal 5 - Community Service
cd services/community-service
npm run start:dev

# Terminal 6 - Promotion Service
cd services/promotion-service
npm run start:dev

# Terminal 7 - API Gateway
cd services/api-gateway
npm run start:dev

# Terminal 8 - Frontend Web
cd apps/web
npm run dev

# Terminal 9 - Frontend Mobile (if on macOS)
cd apps/mobile
flutter run
```

## 🧪 Verify Installation

### Backend Services

```bash
# Check Identity Service
curl http://localhost:3001/health

# Check Business Service
curl http://localhost:3002/health

# Check Commerce Service
curl http://localhost:3003/health

# Check Shipping Service
curl http://localhost:3004/health

# Check Community Service
curl http://localhost:3005/health

# Check Promotion Service
curl http://localhost:3006/health

# Check API Gateway
curl http://localhost:3000/health
```

### Frontend

```bash
# Web - Open browser
open http://localhost:3000

# Mobile - Requires macOS for iOS
flutter run
```

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Quick Start](./quick-start.md) | Bắt đầu nhanh trong 5 phút |
| [Environment Setup](./environment-setup.md) | Cấu hình môi trường |
| [Docker Setup](./docker-setup.md) | Setup với Docker |
| [IDE Setup](./IDE-setup.md) | Cấu hình VS Code |
| [First API Call](./first-api-call.md) | Test API đầu tiên |
| [Troubleshooting](./troubleshooting.md) | Giải quyết lỗi thường gặp |
| [FAQ](./faq.md) | Câu hỏi thường gặp |

## 🆘 Troubleshooting

Gặp vấn đề? Xem [Troubleshooting Guide](./troubleshooting.md)

### Common Issues

1. **Port already in use**
   ```bash
   # Find and kill process using port
   lsof -i :3000
   kill -9 <PID>
   ```

2. **Docker memory issues**
   ```bash
   # Increase Docker memory to at least 8GB
   ```

3. **Database connection failed**
   ```bash
   # Check PostgreSQL is running
   docker-compose ps postgres
   ```

## 📞 Support

- **GitHub Issues**: [Link to issues]
- **Slack**: #huki-dev-team
- **Email**: dev@huki-ebook.com
