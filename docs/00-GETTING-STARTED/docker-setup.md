# 🐳 Docker Setup

Hướng dẫn setup môi trường với Docker.

## 📋 Prerequisites

```bash
# Kiểm tra Docker đã cài đặt
docker --version
docker-compose --version

# Yêu cầu tối thiểu
# - Docker: 24.x+
# - Docker Compose: 2.x+
# - RAM: 8GB+
# - Disk: 20GB+ free
```

## 🚀 Quick Start

### 1. Start Infrastructure Services

```bash
# Start all infrastructure (PostgreSQL, MongoDB, Redis, RabbitMQ)
docker-compose up -d postgres mongo redis rabbitmq

# Hoặc start tất cả services
docker-compose up -d

# Kiểm tra status
docker-compose ps
```

### 2. Stop Services

```bash
# Stop nhưng giữ data
docker-compose stop

# Stop và xóa containers
docker-compose down

# Stop và xóa containers + volumes (XÓA DATA)
docker-compose down -v
```

## 📦 Docker Compose Overview

```yaml
# docker-compose.yml structure
services:
  # Infrastructure
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: huki_ebook
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  mongo:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"  # AMQP
      - "15672:15672"  # Management UI
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq

  # Backend Services (Development)
  identity-service:
    build:
      context: ./services/identity-service
      dockerfile: Dockerfile.dev
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
    volumes:
      - ./services/identity-service:/app
      - /app/node_modules

  # ... các service khác tương tự
```

## 🔧 Development vs Production

### Development

```bash
# Sử dụng Dockerfile.dev (hot reload)
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f identity-service

# Rebuild khi có thay đổi
docker-compose -f docker-compose.dev.yml up -d --build identity-service
```

### Production

```bash
# Build production image
docker-compose -f docker-compose.yml build

# Run production
docker-compose -f docker-compose.yml up -d

# Scale services
docker-compose up -d --scale commerce-service=3
```

## 📁 Docker Files

```
services/
├── identity-service/
│   ├── Dockerfile          # Production
│   ├── Dockerfile.dev     # Development (hot reload)
│   └── .dockerignore
├── business-service/
│   └── ...
└── ...
```

## 🐛 Troubleshooting

### PostgreSQL Connection Issues

```bash
# Kiểm tra logs
docker-compose logs postgres

# Reset database
docker-compose exec postgres psql -U postgres -c "DROP DATABASE huki_ebook;"
docker-compose exec postgres psql -U postgres -c "CREATE DATABASE huki_ebook;"

# Connect từ host
psql -h localhost -U postgres -d huki_ebook
```

### MongoDB Connection Issues

```bash
# Kiểm tra logs
docker-compose logs mongo

# Connect từ host
mongosh "mongodb://localhost:27017/huki_community"
```

### RabbitMQ Access Issues

```bash
# Access Management UI
# URL: http://localhost:15672
# Default: guest/guest
```

### Memory Issues

```bash
# Tăng memory cho Docker
# Docker Desktop -> Settings -> Resources -> 8GB minimum

# Kiểm tra memory usage
docker stats
```

## 🔌 Service Ports

| Service | Port | URL |
|---------|------|-----|
| PostgreSQL | 5432 | localhost:5432 |
| MongoDB | 27017 | localhost:27017 |
| Redis | 6379 | localhost:6379 |
| RabbitMQ (AMQP) | 5672 | localhost:5672 |
| RabbitMQ (UI) | 15672 | http://localhost:15672 |
| Identity Service | 3001 | http://localhost:3001 |
| Business Service | 3002 | http://localhost:3002 |
| Commerce Service | 3003 | http://localhost:3003 |
| Shipping Service | 3004 | http://localhost:3004 |
| Community Service | 3005 | http://localhost:3005 |
| Promotion Service | 3007 | http://localhost:3007 |
| API Gateway | 3000 | http://localhost:3000 |

## 🔄 Common Commands

```bash
# Restart all services
docker-compose restart

# Rebuild without cache
docker-compose build --no-cache

# View resource usage
docker-compose top

# Cleanup unused images
docker image prune -f

# View all containers (including stopped)
docker ps -a
```

## 📝 Notes

- **Data Persistence**: Volumes được mount để data không mất khi restart
- **Hot Reload**: Development compose mount source code vào container
- **Network**: Tất cả services trong cùng network để communicate
- **Health Checks**: Mỗi service có healthcheck endpoint
