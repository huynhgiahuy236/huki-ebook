# BÁO CÁO THIẾT LẬP MÔI TRƯỜNG & BASELINE SERVICE: IDENTITY-SERVICE
## (00_SETUP_BASELINE.md)

Tài liệu này xác nhận việc khởi tạo workspace, tách nhánh cô lập và khảo sát môi trường runtime nội bộ cho **Service #1: `identity-service`** trước khi tiến hành Deep Audit 6 trục.

---

## 1. TRẠNG THÁI NHÁNH GIT & PHIÊN BẢN (VERSION CONTROL)

- **Nhánh cơ sở (Base Branch):** `develop`
- **Commit cơ sở (Base Commit):** [`2ec08a55aeb28f673327cb0f0ee069bd1364ff9b`](file:///e:/HuKi/docs/audit/01_AUDIT_EXECUTION_PLAN.md)
  - Thông điệp commit: `docs(audit): establish master topology and execution pipeline`
- **Nhánh làm việc độc lập hiện tại:** `audit/identity-service`
  - Đã checkout và xác nhận qua: `git branch --show-current` -> `audit/identity-service`
  - Nguyên tắc an toàn: Toàn bộ quá trình phân tích và sửa lỗi chỉ diễn ra trên nhánh này, tuyệt đối không push trực tiếp lên `develop` hay `main`.

---

## 2. QUY HOẠCH CẤU TRÚC THƯ MỤC KIỂM TOÁN & SCRIPTS

- **Thư mục báo cáo & phân tích chuyên sâu:**
  `docs/audit/identity-service/` (Lưu trữ các báo cáo kiểm toán, ma trận test và kết quả nghiệm thu).
- **Thư mục chứa script kiểm thử tự động (Automation Scripts):**
  `scriptstest/audit/identity-service/`
  - Đã khởi tạo kèm file `.gitkeep` để Git theo dõi.
  - Chứa 100% test script độc lập bằng Node.js / TypeScript / Bash / SQL.
  - Tuân thủ nguyên tắc Process Hygiene: Tự động ngắt kết nối database (`$disconnect`), ngắt tiến trình sạch sẽ (`process.exit(0)`), không để process treo chạy ngầm.

---

## 3. CẤU HÌNH RUNTIME & TRẠNG THÁI HẠ TẦNG LOCAL

### 3.1. Thông số cổng & Chuỗi kết nối (Connection Strings)
*(Đã che giấu mật khẩu theo quy chuẩn bảo mật `***`)*

| Tham số | Giá trị thực tế tại Local | Ghi chú an ninh |
|---|---|---|
| **Port Service** | `PORT=3001` / `IDENTITY_SERVICE_PORT=3001` | Lắng nghe nội bộ tại cổng 3001 |
| **Database Engine** | PostgreSQL 15 Alpine (`huki-postgres`) | Container Docker nội bộ |
| **Database URL** | `postgresql://postgres:***@localhost:5432/huki_identity` | Database logic riêng biệt `huki_identity` |
| **Redis Cache & Session** | `localhost:6379` (`REDIS_HOST=localhost`, `REDIS_PORT=6379`) | Quản lý phiên đăng nhập và blacklist token |
| **RabbitMQ Event Bus** | `amqp://guest:***@localhost:5672` | Exchange `huki.events` (Topic) |
| **JWT Secret** | Khóa HMAC SHA-256 (Độ dài > 64 ký tự hex) | Thỏa mãn điều kiện `assertProductionSecurity()` |
| **Thời hạn Access Token** | `JWT_ACCESS_EXPIRES_IN=15m` | Cấp phát ngắn hạn chống đánh cắp |
| **Thời hạn Refresh Token** | `JWT_REFRESH_EXPIRES_IN=7d` | Cấp phát dài hạn kèm cơ chế xoay vòng |
| **Giới hạn thiết bị DRM** | `DRM_MAX_ACTIVE_DEVICES=5` | Tối đa 5 thiết bị đồng thời đọc sách số |
| **Bcrypt Cost Factor** | `BCRYPT_ROUNDS=10` | Chuẩn bảo mật băm mật khẩu |

### 3.2. Trạng thái kiểm tra Docker Containers trên Local
Đã thực thi kiểm tra thực tế bằng lệnh `docker ps`:
- `huki-postgres`: **Up (healthy)** - Port `0.0.0.0:5432->5432/tcp`
- `huki-redis`: **Up (healthy)** - Port `0.0.0.0:6379->6379/tcp`
- `huki-rabbitmq`: **Up (healthy)** - Port `0.0.0.0:5672->5672/tcp`, `0.0.0.0:15672->15672/tcp`
- `huki-mongo`: **Up (healthy)** - Port `0.0.0.0:27017->27017/tcp`

### 3.3. Dữ liệu thực tế kiểm tra trong Database `huki_identity`
Đã truy vấn trực tiếp bằng `psql` vào container PostgreSQL:
- Bảng vật lý tồn tại: `users`, `auth_sessions`, `refresh_tokens`, `outbox_events`, `audit_logs`, `system_maintenance_config`, `_prisma_migrations`.
- Dữ liệu người dùng thực tế đang hoạt động:
  - `PLATFORM_ADMIN`: 1 tài khoản (`ACTIVE`)
  - `BUSINESS`: 24 tài khoản (`ACTIVE`)
  - `DELIVERY_STAFF`: 2 tài khoản (`ACTIVE`)
  - `USER`: 43 tài khoản (`ACTIVE`), 1 `PENDING`, 1 `PENDING_DELETION`, 4 `DELETED`
  - **Tổng cộng:** 76 người dùng thật trong database.

---

## 4. CẤU TRÚC DEPENDENCIES, ENUMS & MODELS THỰC TẾ

### 4.1. Key Dependencies (`platform/apps/identity-service/package.json`)
- **Framework Core:** `@nestjs/common` (v10.3.0), `@nestjs/core`, `@nestjs/platform-express`, `@nestjs/config`.
- **Database & ORM:** `@prisma/client` (v5.22.0), `pg` (v8.11.3).
- **Authentication & Security:** `bcrypt` (v5.1.1), `passport` (v0.7.0), `passport-jwt` (v4.0.1), `passport-local` (v1.0.0), `@nestjs/jwt` (v10.2.0), `@nestjs/passport` (v10.0.3).
- **Rate Limit & Throttling:** `@nestjs/throttler` (v5.1.1).
- **Cache & Redis:** `@nestjs/cache-manager` (v2.1.1), `ioredis` (v5.3.2).
- **Documentation & Validation:** `@nestjs/swagger` (v7.2.0), `class-validator` (v0.14.1), `class-transformer` (v0.5.1).
- **Shared Library:** `@huki/shared` (v1.0.0).

### 4.2. Danh sách Enums (`schema.prisma`)
1. **`UserRole`**:
   - `USER`: Khách hàng độc giả mua sách.
   - `BUSINESS`: Người bán / Chủ hoặc quản lý gian hàng.
   - `DELIVERY_STAFF`: Bưu tá giao vận hàng hóa.
   - `PLATFORM_ADMIN`: Quản trị viên sàn toàn quyền.
2. **`UserStatus`**:
   - `ACTIVE`: Tài khoản hoạt động bình thường.
   - `BLOCKED`: Tài khoản bị khóa vi phạm chính sách.
   - `PENDING`: Tài khoản mới đăng ký chưa xác thực email.
   - `PENDING_DELETION`: Tài khoản đã gửi yêu cầu xóa và đang trong thời gian chờ hủy.
   - `DELETED`: Tài khoản đã xóa hoàn toàn.
3. **`MaintenanceMode`**:
   - `IMMEDIATE`: Ngắt kết nối và bảo trì tức thời.
   - `GRACEFUL`: Chế độ xả tải (drain) trong khoảng thời gian cấu hình trước khi bảo trì.

### 4.3. Danh sách Models (`schema.prisma`)
1. **`User`** (`@@map("users")`):
   - Quản lý tài khoản, email, passwordHash, họ tên, phone, avatar, role, status.
   - Quản lý email verification token, password reset token.
   - Quản lý bảo mật: `failedLoginAttempts`, `lockedUntil`, `mustChangePassword`.
   - Vòng đời xóa tài khoản: `deletionRequestedAt`, `deletionScheduledAt`, `deletionOtp`, `deletionCount`.
2. **`AuthSession`** (`@@map("auth_sessions")`):
   - Quản lý phiên đăng nhập: `userId`, `refreshTokenHash`, `userAgent`, `ipAddress`, `deviceType`, `deviceName`, `location`, `expiresAt`, `lastActiveAt`, `revokedAt`.
   - Quan hệ 1-N với `RefreshToken`.
3. **`RefreshToken`** (`@@map("refresh_tokens")`):
   - Quản lý token xoay vòng (Rotation): `sessionId`, `tokenFamily`, `tokenHash`, `tokenType`, `deviceInfo`, `expiresAt`, `revokedAt`, `revokedReason`, `replacedByTokenId`.
4. **`OutboxEvent`** (`@@map("outbox_events")`):
   - Transactional Outbox: `eventId`, `type`, `aggregateId`, `payload`, `status` (`PENDING`/`PROCESSING`/`COMPLETED`/`FAILED`), `attempts`, `publishedAt`.
5. **`AuditLog`** (`@@map("audit_logs")`):
   - Ghi vết hành động quản trị: `actorId`, `actorRole`, `service`, `module`, `action`, `resource`, `resourceId`, `beforeState`, `afterState`, `changedFields`, `requestId`, `ipAddress`.
6. **`SystemMaintenanceConfig`** (`@@map("system_maintenance_config")`):
   - Cấu hình bảo trì hệ thống toàn sàn: `isActive`, `mode`, `scheduledStartTime`, `scheduledEndTime`, `drainDurationMinutes`, `affectedRoles`, `allowOfflineDrm`, `allowShipperOfflineCod`, `whitelistIps`.

---

## 5. KẾT LUẬN & ĐÁNH GIÁ SẴN SÀNG (READINESS)

1. Nhánh Git `audit/identity-service` đã được tạo và cô lập sạch sẽ khỏi nhánh `develop`.
2. Thư mục `docs/audit/identity-service/` và `scriptstest/audit/identity-service/` đã được thiết lập đúng quy hoạch.
3. Mã nguồn `identity-service` đã được biên dịch thử nghiệm qua TypeScript (`npm run build:identity`) và đạt kết quả thành công 100% (Zero Errors).
4. Hạ tầng PostgreSQL, Redis, RabbitMQ trên Local đang hoạt động ổn định và chứa sẵn 76 bản ghi người dùng thực tế.

Workspace đã hoàn toàn sẵn sàng để bước vào **Task 4 - Deep Audit 6 trục** cho `identity-service`.
