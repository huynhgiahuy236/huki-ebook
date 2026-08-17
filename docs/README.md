# 📚 HUKI - Project Documentation

> **QUAN TRỌNG: Đọc file này TRƯỚC KHI bắt đầu làm việc với project**

---

## 🏠 Project Structure (Cấu trúc dự án)

```
HuKi/
│
├── HuKi/                          ← CODE CHÍNH
│   ├── web/                       ← Frontend Web (Next.js)
│   ├── platform/                   ← Backend (NestJS microservices)
│   └── mobile/                     ← Mobile App (Flutter)
│
├── docs/                          ← TÀI LIỆU DỰ ÁN (đọc để hiểu)
│   ├── README.md                  ← FILE NÀY
│   ├── 00-START-HERE/            ← Orientation - Đọc đầu tiên
│   ├── 01-ARCHITECTURE/          ← Kiến trúc hệ thống
│   ├── 02-SETUP/                 ← Setup môi trường
│   ├── 03-PROJECTS/              ← Cấu trúc code
│   ├── 04-API-REFERENCE/         ← API chi tiết
│   ├── 05-DATABASE/              ← Database schemas
│   ├── 10-FEATURES/              ← Feature documentation
│   ├── 17-CHARTS/                ← Diagrams (draw.io)
│   └── ... (xem bên dưới)
│
├── ebook.md                       ← MÔ TẢ BAN ĐẦU của dự án
│
├── scripts/                       ← Script test, utility (KHÔNG liên quan code chính)
│
├── test/                          ← Mấy cái linh tinh, mock data
│
├── skill/                         ← Skills cho UI/UX (dùng khi cần design)
│
└── .agent/                        ← Agent instructions riêng
```

---

## 📋 Quy định về File

| Loại file | Đặt ở đâu | Ví dụ |
|-----------|------------|-------|
| **Code chính** | `HuKi/web`, `HuKi/platform`, `HuKi/mobile` | components, services, pages |
| **Script test/utility** | `scripts/` | benchmark.py, mock-data.ts, test-api.js |
| **Mấy cái linh tinh** | `test/` | mock json, temp files, ideas |
| **Design/UI** | `skill/` | UI skills |
| **Tài liệu** | `docs/` | API docs, architecture docs |
| **Mô tả dự án** | `ebook.md` | Mô tả ban đầu |

### ⚠️ Lưu ý quan trọng
- **KHÔNG đặt file linh tinh vào code chính**
- **Script để test API, generate data, automate** → `scripts/`
- **Mấy cái mock, idea, temp** → `test/`

---

## 🚀 Quick Start

### 1. Đọc để hiểu project
```
docs/00-START-HERE/README.md     ← Đọc ĐẦU TIÊN
docs/01-ARCHITECTURE/           ← Hiểu kiến trúc
docs/02-SETUP/                  ← Setup môi trường
```

### 2. Xem cấu trúc code
```
docs/03-PROJECTS/README.md      ← Cấu trúc code
```

### 3. Xem API & Database
```
docs/04-API-REFERENCE/          ← API endpoints
docs/05-DATABASE/               ← Database schemas
```

---

## 📁 Documentation Index (Mục lục tài liệu)

```
docs/
│
├── 00-START-HERE/              ← BẮT ĐẦU Ở ĐÂY
│   ├── README.md               ← Tổng quan
│   ├── system-overview.md      ← Hệ thống làm gì
│   ├── glossary.md             ← Thuật ngữ
│   └── quick-reference.md      ← Cheatsheet
│
├── 01-ARCHITECTURE/            ← KIẾN TRÚC
│   ├── README.md               ← Architecture Overview
│   ├── microservices.md         ← Chi tiết từng service
│   ├── api-gateway.md          ← API Gateway
│   └── data-flows.md           ← Luồng dữ liệu
│
├── 02-SETUP/                   ← SETUP
│   ├── README.md               ← Setup Guide
│   ├── environment.md          ← Environment variables
│   └── docker-compose.md       ← Docker setup
│
├── 03-PROJECTS/               ← CẤU TRÚC CODE
│   └── README.md               ← Project structure
│
├── 04-API-REFERENCE/           ← API
│   ├── README.md               ← API Overview
│   ├── authentication.md       ← Auth endpoints
│   ├── users.md               ← User endpoints
│   ├── books.md               ← Book endpoints
│   ├── orders.md              ← Order endpoints
│   ├── payment.md             ← Payment endpoints
│   ├── forum.md               ← Forum endpoints
│   ├── chat.md               ← Chat endpoints
│   ├── vouchers.md           ← Voucher endpoints
│   ├── reviews.md             ← Review endpoints
│   ├── notifications.md      ← Notification endpoints
│   └── endpoints/             ← Chi tiết từng endpoint
│       ├── orders.md
│       ├── payment.md
│       ├── forum.md
│       ├── chat.md
│       ├── vouchers.md
│       ├── reviews.md
│       └── notifications.md
│
├── 05-DATABASE/                ← DATABASE
│   ├── README.md               ← Database Overview
│   ├── identity-db.md         ← Identity service schema
│   ├── commerce-db.md         ← Commerce service schema
│   ├── business-db.md         ← Business service schema
│   └── community-db.md         ← Community (MongoDB) schema
│
├── 06-AUTHENTICATION/          ← AUTH
│   └── README.md              ← Auth system
│
├── 07-SECURITY/               ← SECURITY
│   └── README.md              ← Security docs
│
├── 10-FEATURES/               ← FEATURES
│   ├── cart-checkout/         ← Cart & Checkout
│   └── business-management/    ← Business management
│
├── 17-CHARTS/                 ← DIAGRAMS
│   ├── README.md              ← Charts overview
│   └── draw.io/
│       ├── system-architecture.drawio
│       ├── order-flow.drawio
│       └── database-erd.drawio
│
└── CLAUDE.md                  ← Agent instructions
```

---

## 🎯 Định vị theo Task

### Tôi cần...

**...thêm feature mới**
1. Đọc `docs/03-PROJECTS/README.md`
2. Xem pattern trong `docs/04-API-REFERENCE/`
3. Check schema trong `docs/05-DATABASE/`

**...sửa lỗi**
1. Xem error codes trong `docs/04-API-REFERENCE/`
2. Tìm service trong `docs/01-ARCHITECTURE/`
3. Check logs

**...thêm API endpoint**
1. Xem `docs/04-API-REFERENCE/README.md`
2. Tham khảo endpoint trong `docs/04-API-REFERENCE/endpoints/`
3. Update schema trong `docs/05-DATABASE/`

**...thêm bảng database**
1. Xem `docs/05-DATABASE/README.md`
2. Tham khảo schema trong `docs/05-DATABASE/`
3. Tạo migration

**...UI/UX**
1. Truy cập `skill/` để dùng design skills
2. Xem `docs/09-DESIGN-SYSTEM/` nếu có

---

## 🔑 Key Files (Files quan trọng)

| File | Mô tả | Priority |
|------|--------|----------|
| `ebook.md` | Mô tả ban đầu của dự án | ⭐⭐⭐ |
| `docs/00-START-HERE/README.md` | Tổng quan | ⭐⭐⭐ |
| `docs/CLAUDE.md` | Agent instructions | ⭐⭐⭐ |
| `docs/04-API-REFERENCE/README.md` | API patterns | ⭐⭐⭐ |
| `docs/17-CHARTS/draw.io/system-architecture.drawio` | Kiến trúc hệ thống | ⭐⭐ |

---

## 🔧 Tech Stack

| Component | Tech |
|-----------|------|
| **Frontend Web** | Next.js |
| **Backend** | NestJS (microservices) |
| **Mobile** | Flutter |
| **Database** | PostgreSQL, MongoDB |
| **Cache** | Redis |
| **Message Queue** | RabbitMQ |
| **Payments** | VNPay, MoMo |
| **Storage** | Cloudflare R2, Cloudinary |
| **Push Notifications** | Firebase |

---

## 📖 Reading Order (Thứ tự đọc)

### Phase 1: High-Level (30 phút)
| File | Thời gian | Mục đích |
|------|-----------|----------|
| `docs/00-START-HERE/system-overview.md` | 10 phút | Hiểu hệ thống |
| `docs/01-ARCHITECTURE/microservices.md` | 10 phút | Hiểu services |
| `docs/17-CHARTS/draw.io/system-architecture.drawio` | 5 phút | Xem diagram |
| `docs/05-DATABASE/README.md` | 5 phút | Hiểu database |

### Phase 2: Deep Dive (60 phút)
| File | Thời gian | Mục đích |
|------|-----------|----------|
| `docs/03-PROJECTS/README.md` | 10 phút | Hiểu code |
| `docs/02-SETUP/environment.md` | 10 phút | Hiểu config |
| `docs/04-API-REFERENCE/README.md` | 15 phút | Hiểu API |
| `docs/05-DATABASE/commerce-db.md` | 15 phút | Hiểu data model |
| `docs/10-FEATURES/cart-checkout/README.md` | 10 phút | Hiểu flow |

### Phase 3: Theo mục đích
- **Backend** → `docs/01-ARCHITECTURE/` + `docs/04-API-REFERENCE/` + `docs/05-DATABASE/`
- **Frontend** → `docs/03-PROJECTS/` + `docs/04-API-REFERENCE/`
- **DevOps** → `docs/02-SETUP/docker-compose.md`

---

## ❓ Questions?

1. Xem `docs/00-START-HERE/glossary.md` - Thuật ngữ
2. Xem `docs/04-API-REFERENCE/README.md` - Error codes
3. Hỏi team

---

## 📝 Ghi chú

- **Script test** → `scripts/`
- **File linh tinh** → `test/`
- **Design skills** → `skill/`
- **Mô tả ban đầu** → `ebook.md`

---

## 🐙 Git Convention

### Branch Naming

```
<type>/<short-description>

Ví dụ:
- feature/user-authentication
- fix/cart-calculation-bug
- hotfix/payment-security-patch
- docs/api-documentation
- refactor/cleanup-auth-service
- chore/update-dependencies
```

### Branch Types

| Type | Mục đích | Protected |
|------|-----------|-----------|
| `main` | Production code | ✅ Yes |
| `develop` | Integration branch | ✅ Yes |
| `feature/*` | Thêm feature mới | ❌ |
| `fix/*` | Fix bug | ❌ |
| `hotfix/*` | Fix khẩn cấp (production) | ❌ |
| `docs/*` | Viết/sửa tài liệu | ❌ |
| `refactor/*` | Refactor code | ❌ |
| `chore/*` | Việc linh tinh (deps, config) | ❌ |

### Commit Convention

```
<type>(<scope>): <description>

Ví dụ:
- feat(auth): add JWT refresh token
- feat(cart): add multi-store support
- fix(payment): handle callback timeout
- docs(api): update endpoint docs
- refactor(orders): extract payment logic
- chore(deps): upgrade NestJS to v10
```

### Commit Types

| Type | Mô tả |
|------|--------|
| `feat` | Feature mới |
| `fix` | Fix bug |
| `docs` | Chỉ tài liệu |
| `style` | Format, không đổi code |
| `refactor` | Refactor code |
| `test` | Thêm/update tests |
| `build` | Build system changes |
| `ci` | CI/CD changes |
| `chore` | Maintenance, deps update |
| `hotfix` | Fix khẩn cấp |

### Commit Scopes (Service-based)

```
auth, user, business, store, catalog, book, inventory, cart,
checkout, order, payment, shipping, forum, chat, review,
notification, voucher, library, api, infra, db, security
```

---

*Last updated: 2026-08-17*
