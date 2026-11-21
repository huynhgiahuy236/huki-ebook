# 📖 HUKI EBOOK & POD MARKETPLACE

> **Nền tảng Thương mại Điện tử Sách Bản Quyền, Sách In & Sách Số Kết Hợp (Print-on-Demand & DRM Vault)**<br/>
> **Môi trường UAT Staging:** [https://huki-uat.duckdns.org](https://huki-uat.duckdns.org)<br/>
> **Tài liệu quy trình sửa lỗi chuẩn hóa:** [`readme-bug.md`](file:///e:/HuKi/readme-bug.md) (Quy trình TPM 12 bước nghiêm ngặt)

---

## 🌟 Giới Thiệu Tổng Quan Dự Án

**HUKI** là hệ sinh thái thương mại điện tử chuyên sâu phục vụ thị trường xuất bản hiện đại tại Việt Nam, kết hợp toàn diện giữa:
1. **Sách số Bản quyền (Ebook & Audiobooks):** Đọc trực tuyến bảo mật qua công nghệ **DRM Vault**, đồng bộ vị trí đọc thời gian thực, quản lý phân phối giới hạn tối đa 5 thiết bị đồng thời trên mỗi tài khoản người dùng (`SessionLimitGuard`), cùng công nghệ tích hợp sách nói thông minh.
2. **Sách giấy & Mô hình Hybrid (In + Ebook):** Cho phép độc giả mua sách giấy truyền thống kèm ưu đãi mở khóa bản ebook đọc tức thì; tích hợp tự động đối soát vận chuyển 63 tỉnh thành qua GHTK / GHN / Shopee Xpress.
3. **Sàn Đa Người Bán (Multi-Vendor Marketplace):** Cho phép các nhà xuất bản, gian hàng ủy quyền và tác giả tự do mở shop, quản lý kho sách, theo dõi đơn hàng, xử lý khiếu nại (Disputes) và tự động đối soát dòng tiền qua cơ chế **Ví Ký Quỹ Escrow**.
4. **Cộng đồng & Đánh giá Shopee Luxury:** Hệ sinh thái đánh giá minh bạch chuẩn **POL-13** (chỉ người mua đã hoàn thành đơn mới nhận huy hiệu xác thực), giao diện thẻ đánh giá bo tròn mềm mại chuẩn Shopee Luxury, phòng chống lỗi ảnh 403 Forbidden, tích hợp Chat Realtime Socket.IO giữa độc giả và nhà sách.
5. **Marketing & Tăng trưởng:** Hệ thống tiếp thị liên kết (**Affiliate Marketing**), Voucher đa tầng (Voucher toàn sàn và Voucher gian hàng), Flash Sale theo khung giờ tự động kích hoạt.

---

## 🏛️ Kiến Trúc Hệ Thống (System Architecture)

Dự án được xây dựng theo mô hình Monorepo phân tách rõ ràng giữa **Platform Microservices (Backend)** và **Modern Web Application (Frontend)**:

```
HuKi/
├── platform/                               ← Monorepo Backend (NestJS 10)
│   ├── apps/
│   │   ├── api-gateway/                    ← Gateway (:3000): Proxy, JWT Auth Guard, Rate Limiting, CORS
│   │   ├── identity-service/               ← Identity (:3001): Auth, Google OAuth2, DRM Sessions (5 thiết bị), RBAC
│   │   ├── business-service/               ← Business (:3002): Seller KYC, Store Profiles, Escrow, Penalties
│   │   ├── commerce-service/               ← Commerce (:3003): Books Catalog, Cart, Orders, PayOS, DRM Vault
│   │   ├── shipping-service/               ← Shipping (:3004): GHTK / GHN Logistics, Phí vận chuyển tỉnh thành
│   │   ├── community-service/              ← Community (:3005): Đánh giá sách (POL-13), Chat Realtime Socket.IO
│   │   └── promotion-service/              ← Promotion (:3007): Vouchers đa tầng, Flash Sales, Affiliate System
│   └── libs/
│       ├── shared/                         ← DTOs dùng chung, Decorators, Guards, Enums
│       └── common/                         ← Database Modules, Prisma Helpers, Logger, Event Bus
├── web/                                    ← Frontend Web (Next.js 16 App Router, Turbopack, TailwindCSS 4)
│   ├── src/
│   │   ├── app/                            ← 140+ App Router Routes (Khách hàng, Seller Portal, Admin Hub, Shipper)
│   │   ├── ui/components/                  ← Design System, StoreHeader (Ghost Icons), ReviewCard Luxury
│   │   ├── lib/                            ← API Clients, Circuit Breaker Tracker (chống spam 404), Auth Helpers
│   │   ├── hooks/                          ← Custom React Hooks (useAuth, useCart, useDeviceSessions, ...)
│   │   └── types/                          ← TypeScript domain type definitions
├── mobile/                                 ← Mobile Application (Flutter iOS & Android DRM Reader)
├── docker/                                 ← Cấu hình Nginx Proxy, Docker Compose UAT & Staging
├── scripts/                                ← Kịch bản kiểm thử tự động cô lập (E2E Test Suites)
└── readme-bug.md                           ← Quy chuẩn 12 bước TPM & 4 Quality Gates nghiêm ngặt
```

---

## ⚙️ Danh Mục Dịch Vụ Microservices (Platform Backend)

| Service | Port Nội Bộ | Database | Chức Năng Chính |
| :--- | :---: | :--- | :--- |
| **api-gateway** | `3000` | Redis (Cache) | Cổng vào duy nhất (`/api/v1/*`), xác thực JWT tập trung, phân loại route (PUBLIC/USER/SELLER/ADMIN), Circuit Breaker chuyển tiếp. |
| **identity-service** | `3001` | PostgreSQL (`huki_identity`) | Quản lý người dùng, Google OAuth2, Phân quyền RBAC, Quản lý phiên thiết bị DRM (tối đa 5 thiết bị đồng thời), Thu hồi phiên đăng nhập từ xa. |
| **business-service** | `3002` | PostgreSQL (`huki_business`) | Hồ sơ gian hàng người bán, phê duyệt KYC, Quản trị nhân viên shop, Xử lý vi phạm (Penalties & Feature Flags), Đối soát Ví ký quỹ Escrow. |
| **commerce-service** | `3003` | PostgreSQL (`huki_commerce`) | Quản lý đầu sách, danh mục, kiểm kê kho, Giỏ hàng đa shop, Xử lý đơn hàng, Thanh toán PayOS & COD, Quản lý kho số hóa DRM Vault. |
| **shipping-service** | `3004` | PostgreSQL (`huki_shipping`) | Tích hợp API đơn vị vận chuyển GHTK, GHN; tính toán phí ship động theo bảng cước tỉnh thành Việt Nam, cập nhật tracking vận đơn. |
| **community-service** | `3005` | PostgreSQL (`huki_community`) | Đánh giá & nhận xét sách kèm huy hiệu đã mua hàng (POL-13), kiểm duyệt nội dung, Chat thời gian thực với gian hàng qua Socket.IO. |
| **promotion-service** | `3007` | PostgreSQL (`huki_promotion`) | Quản lý kho voucher toàn sàn và voucher shop, chiến dịch Flash Sale theo khung giờ, hệ thống đối soát hoa hồng Tiếp thị liên kết (Affiliate). |

---

## 💻 Công Nghệ Sử Dụng (Tech Stack)

### Backend
- **Core Framework:** NestJS 10 (TypeScript, Node.js 20 LTS)
- **Database ORM:** Prisma ORM đa schema độc lập cho từng microservice
- **Databases:** PostgreSQL 16 (Dữ liệu quan hệ), Redis 7 (Caching, Session Tokens, Socket.IO Adapter)
- **Event Bus & Messaging:** RabbitMQ / Event Emitter nội bộ
- **Bảo mật & DRM:** JWT (Access/Refresh Tokens), Crypto AES-256 mã hóa DRM, Session Limit Guard

### Frontend Web
- **Core Framework:** Next.js 16 (Turbopack, App Router, React 19)
- **Styling & Design System:** TailwindCSS 4, CSS Modules, Google Material Symbols Outlined
- **Giao diện chuẩn hóa:** Shopee Luxury Soft UI (bo tròn góc mềm mại `rounded-3xl`, viền mờ tinh tế, đổ bóng đa tầng)
- **Performance & Resiliency:** Custom Client Telemetry Tracker tích hợp **Circuit Breaker** (tự động drop buffer và ngắt gửi khi gặp lỗi 404/400/403 để triệt tiêu tải CPU)

### DevOps & CI/CD
- **Containerization:** Docker & Docker Compose đa môi trường (`docker-compose.yml`, `docker-compose.uat.yml`, `docker-compose.prod.yml`)
- **Web Server & Reverse Proxy:** Nginx với SSL Let's Encrypt (`huki-uat.duckdns.org`)
- **CI/CD Quality Gates:** GitHub Actions với 4 luồng kiểm tra song song (Backend Build & Test, Frontend Typecheck & Build, Schema & Migration Integrity, Deployment Pipeline)

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy Cục Bộ (Local Setup)

### 1. Yêu Cầu Môi Trường
- **Node.js:** phiên bản `20.x` LTS trở lên
- **Docker & Docker Compose:** Đã cài đặt và đang chạy Docker Desktop
- **Git:** Git CLI

### 2. Thiết Lập Biến Môi Trường
Sao chép file cấu hình mẫu cho toàn bộ hệ thống:
```bash
cp .env.example .env
```

### 3. Khởi Chạy Cơ Sở Hạ Tầng (PostgreSQL, Redis, RabbitMQ)
```bash
docker compose up -d postgres redis rabbitmq
```

### 4. Cài Đặt Dependencies & Sinh Prisma Client
```bash
# Cài đặt backend microservices
cd platform
npm install
npx prisma generate --schema apps/identity-service/prisma/schema.prisma
npx prisma generate --schema apps/business-service/prisma/schema.prisma
npx prisma generate --schema apps/commerce-service/prisma/schema.prisma
npx prisma generate --schema apps/shipping-service/prisma/schema.prisma
npx prisma generate --schema apps/community-service/prisma/schema.prisma
npx prisma generate --schema apps/promotion-service/prisma/schema.prisma

# Cài đặt frontend web
cd ../web
npm install
```

### 5. Khởi Chạy Ứng Dụng (Development Mode)
```bash
# Terminal 1: Khởi chạy API Gateway & Các Service Backend
cd platform
npm run start:dev:all

# Terminal 2: Khởi chạy Web Next.js
cd web
npm run dev
```
- Frontend Web: [http://localhost:3000](http://localhost:3000) (hoặc port được cấp phát)
- API Gateway: [http://localhost:3000/api/v1](http://localhost:3000/api/v1)
- Swagger Documentation: [http://localhost:3000/docs](http://localhost:3000/docs)

---

## 🛡️ Quy Trình Quản Lý Lỗi & Tiêu Chuẩn Chất Lượng (Quality Gates)

Mọi hoạt động sửa lỗi và bảo trì trong dự án bắt buộc tuân thủ quy trình chuẩn hóa 12 bước trong [`readme-bug.md`](file:///e:/HuKi/readme-bug.md):

1. **Nguyên tắc Zero Mock:** 100% dữ liệu sách, giá bán, sao đánh giá, thiết bị DRM phải kết nối trực tiếp với Database thật qua API Gateway, tuyệt đối cấm chèn mock data vào client.
2. **Quy định Sprint:** Tối đa 3 bug / sprint để tập trung giải quyết triệt để và kiểm soát rủi ro domino.
3. **Bộ 4 Cổng Kiểm Soát Chất Lượng Nội Bộ (Local Quality Gates) bắt buộc trước khi Merge:**
   - **Gate 1:** `git diff --check` (Không chứa lỗi khoảng trắng, cú pháp git).
   - **Gate 2:** `powershell -Command "Set-Location platform; npx prisma validate --schema apps/identity-service/prisma/schema.prisma"` (Toàn vẹn schema DB).
   - **Gate 3:** `npm --prefix platform test -- <affected.spec.ts>` (Toàn bộ unit test backend liên quan đạt 100% PASS).
   - **Gate 4:** `npm --prefix web run typecheck && npm --prefix web run build` (Không có bất kỳ lỗi TypeScript nào và Next.js build thành công 100% các routes).

---

## 👥 Đội Ngũ Phát Triển & Liên Hệ
- **Đơn vị phát triển:** HuKi Engineering Team
- **Hỗ trợ kỹ thuật:** `huynhgiahuy236@gmail.com`
- **Tài liệu tham khảo thêm:** Thư mục [`docs/`](file:///e:/HuKi/docs/)
