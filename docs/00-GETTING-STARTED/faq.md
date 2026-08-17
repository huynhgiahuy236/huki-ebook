# ❓ FAQ - Frequently Asked Questions

Câu hỏi thường gặp và câu trả lời.

## 🚀 General

### Q: Tôi cần cài đặt những gì để bắt đầu?

**A:** Xem [Quick Start](./quick-start.md). Yêu cầu tối thiểu:
- Node.js 18+
- Docker & Docker Compose
- Git

### Q: Có cần tất cả services chạy không?

**A:** Không bắt buộc. Tùy module bạn làm việc:
- Auth features → Identity Service
- Book features → Commerce Service
- Forum/Chat → Community Service

Nhưng API Gateway cần chạy để test API.

### Q: Database có data mẫu không?

**A:** Có. Chạy seeders:
```bash
npm run seed:all
# Hoặc seed từng phần
npm run seed:users
npm run seed:books
```

## 💻 Development

### Q: Làm sao để debug?

**A:** 
- Backend: Sử dụng `console.log` hoặc VS Code debugger
- Frontend: React DevTools, Flutter DevTools
- API: Sử dụng Thunder Client hoặc Postman

### Q: Có cần restart service khi sửa code không?

**A:** Không với NestJS. Hot reload tự động update khi lưu file.
```bash
npm run start:dev  # Development với hot reload
```

### Q: ESLint/Prettier không hoạt động?

**A:** 
```bash
# Cài extensions trong VS Code
# ESLint
# Prettier

# Format manual
npm run lint -- --fix
npm run format
```

### Q: Merge conflict trong package-lock.json?

**A:**
```bash
# Xóa và regenerate
rm package-lock.json
npm install
```

## 🗄️ Database

### Q: Làm sao xem data trong database?

**A:**
- PostgreSQL: pgAdmin, DBeaver, hoặc `psql`
- MongoDB: MongoDB Compass

### Q: Reset database về trạng thái ban đầu?

**A:**
```bash
# Drop và recreate database
docker-compose exec postgres psql -U postgres -c "DROP DATABASE huki_ebook;"
docker-compose exec postgres psql -U postgres -c "CREATE DATABASE huki_ebook;"

# Run migrations
npm run migration:run

# Seed data
npm run seed:all
```

### Q: Migration bị lỗi?

**A:**
```bash
# Revert last migration
npm run migration:revert

# Check migration status
npm run migration:show

# Force run (dev only)
npm run migration:run -- --force
```

## 🔐 Authentication

### Q: Token expires sau bao lâu?

**A:**
- Access Token: 15 phút
- Refresh Token: 7 ngày

### Q: Làm sao test protected endpoint?

**A:**
```bash
# Login để lấy token
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "Password123!"}'

# Dùng token trong request
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Q: Quên mật khẩu?

**A:** (Dev) Reset password trong database:
```sql
UPDATE users SET password_hash = '$2b$12$...' WHERE email = 'test@example.com';
-- Hash mới: bcrypt('Password123!')
```

## 📱 Mobile (Flutter)

### Q: Flutter có cần Mac không?

**A:**
- Android: Không, Windows/Linux được
- iOS: Cần Mac với Xcode

### Q: Build Android APK?

**A:**
```bash
cd apps/mobile
flutter build apk --debug
```

### Q: Hot reload Flutter?

**A:**
```bash
flutter run
# Nhấn 'r' trong terminal để hot reload
# Nhấn 'R' để hot restart
```

## 🐳 Docker

### Q: Docker chiếm quá nhiều RAM?

**A:**
- Docker Desktop → Settings → Resources → Giảm memory
- Hoặc stop unused containers:
```bash
docker-compose stop
```

### Q: Xóa tất cả Docker images?

**A:**
```bash
docker system prune -a
```

### Q: Port bị conflict với service khác?

**A:** Đổi port trong docker-compose.yml:
```yaml
services:
  postgres:
    ports:
      - "5433:5432"  # Host:5433 -> Container:5432
```

## 🔧 Error Messages

### Q: "Module not found"?

**A:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Q: "Cannot connect to database"?

**A:** Kiểm tra:
1. Docker đang chạy?
2. Database port đúng?
3. Connection string trong .env đúng?

### Q: "CORS policy" error?

**A:** Thêm origin vào CORS config:
```env
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

## 📚 Documentation

### Q: Tài liệu ở đâu?

**A:** Thư mục `docs/`:
- [Getting Started](./) - Setup
- [API Reference](../04-API-REFERENCE/) - API docs
- [Architecture](../02-ARCHITECTURE/) - System design
- [Database](../05-DATABASE/) - Schema

### Q: Làm sao generate API docs?

**A:** Swagger UI:
```
http://localhost:3000/api/docs
```

## 🤝 Contributing

### Q: Làm sao contribute?

**A:**
1. Fork repository
2. Tạo branch mới: `git checkout -b feature/my-feature`
3. Commit changes
4. Push và tạo Pull Request

Xem thêm: [Contributing Guide](../15-CONTRIBUTING/)

### Q: Code style convention?

**A:** Xem [Contributing Guide](../15-CONTRIBUTING/):
- ESLint + Prettier tự động format
- Follow Angular commit message convention
- Tất cả code phải có tests
