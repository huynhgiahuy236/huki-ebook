# 🐛 Troubleshooting Guide

Giải quyết các lỗi thường gặp.

## 🚨 Common Issues

### 1. Port Already in Use

**Lỗi:**
```
Error: listen EADDRINUSE :::3000
```

**Giải pháp:**

```bash
# macOS/Linux
lsof -i :3000
kill -9 <PID>

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### 2. Database Connection Failed

**Lỗi:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Giải pháp:**

```bash
# 1. Kiểm tra Docker đang chạy
docker ps

# 2. Restart PostgreSQL
docker-compose restart postgres

# 3. Kiểm tra connection string trong .env
# DATABASE_HOST=localhost
# DATABASE_PORT=5432

# 4. Test connection
psql -h localhost -U postgres -d huki_ebook
```

### 3. MongoDB Connection Failed

**Lỗi:**
```
MongoServerError: connect ECONNREFUSED 127.0.0.1:27017
```

**Giải pháp:**

```bash
# 1. Kiểm tra MongoDB đang chạy
docker-compose ps mongo

# 2. Restart MongoDB
docker-compose restart mongo

# 3. Kiểm tra connection string
# MONGODB_URI=mongodb://localhost:27017/huki_community

# 4. Test với MongoDB Compass
# Connection: mongodb://localhost:27017
```

### 4. RabbitMQ Connection Failed

**Lỗi:**
```
Error: getaddrinfo ENOTFOUND localhost:5672
```

**Giải pháp:**

```bash
# 1. Kiểm tra RabbitMQ đang chạy
docker-compose ps rabbitmq

# 2. Restart RabbitMQ
docker-compose restart rabbitmq

# 3. Kiểm tra Management UI
# http://localhost:15672 (guest/guest)

# 4. Test AMQP connection
# RABBITMQ_URI=amqp://guest:guest@localhost:5672
```

### 5. Redis Connection Failed

**Lỗi:**
```
Error: Redis connection timeout
```

**Giải pháp:**

```bash
# 1. Kiểm tra Redis
docker-compose ps redis

# 2. Restart Redis
docker-compose restart redis

# 3. Test connection
redis-cli ping
# Should return: PONG
```

### 6. npm install Failed

**Lỗi:**
```
npm ERR! code ENOTEMPTY
npm ERR! path /app/node_modules/.package-lock.json
```

**Giải pháp:**

```bash
# Xóa node_modules và cài lại
rm -rf node_modules package-lock.json
npm install

# Hoặc clear cache
npm cache clean --force
npm install
```

### 7. TypeScript Compilation Errors

**Lỗi:**
```
TS2307: Cannot find module '@nestjs/common'
```

**Giải pháp:**

```bash
# Reinstall dependencies
rm -rf node_modules
npm install

# Rebuild TypeScript
npx tsc --build

# Hoặc xóa tsbuildinfo
rm -rf *.tsbuildinfo
```

### 8. Docker Build Failed

**Lỗi:**
```
ERROR: Cannot locate specified Dockerfile
```

**Giải pháp:**

```bash
# Kiểm tra Dockerfile tồn tại
ls -la Dockerfile*

# Build không cache
docker-compose build --no-cache
```

### 9. JWT Token Expired

**Lỗi:**
```
{
  "statusCode": 401,
  "message": "Token has expired"
}
```

**Giải pháp:**

```bash
# Refresh token
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "YOUR_REFRESH_TOKEN"}'
```

### 10. CORS Error

**Lỗi:**
```
Access to fetch at 'http://localhost:3000' from origin 'http://localhost:3001' 
has been blocked by CORS policy
```

**Giải pháp:**

```bash
# Kiểm tra CORS config trong .env
# CORS_ORIGIN=http://localhost:3000,http://localhost:3001

# Restart service
npm run start:dev
```

### 11. Migration Failed

**Lỗi:**
```
MigrationError: Unable to open file
```

**Giải pháp:**

```bash
# Check migration files exist
ls -la src/migrations/

# Run migration với force
npm run migration:run -- --force

# Hoặc revert và run lại
npm run migration:revert
npm run migration:run
```

### 12. Entity Metadata Not Found

**Lỗi:**
```
EntityMetadataNotFoundError: No metadata for "User" was found
```

**Giải pháp:**

```bash
# Regenerate clients and apply committed Prisma migrations
npm run prisma:generate
npm run prisma:migrate:deploy
```

## 🔍 Debugging Tips

### Enable Debug Mode

```bash
# Backend
DEBUG=* npm run start:dev

# Hoặc specific module
DEBUG=@nestjs/core npm run start:dev
```

### View Logs

```bash
# Docker logs
docker-compose logs -f <service-name>

# Application logs
npm run start:dev 2>&1 | tee logs/app.log
```

### Database Inspection

```bash
# PostgreSQL
docker-compose exec postgres psql -U postgres -d huki_ebook

# List tables
\dt

# Query data
SELECT * FROM users LIMIT 10;
```

### Network Debugging

```bash
# Kiểm tra port đang listen
netstat -an | grep LISTEN

# Docker network inspection
docker network inspect huki-ebook_default
```

## 📞 Still Need Help?

1. Kiểm tra [FAQ](./faq.md)
2. Search GitHub Issues
3. Ask in #dev-support channel
4. Create new issue với:
   - Error message
   - Stack trace
   - Environment details
   - Steps to reproduce
