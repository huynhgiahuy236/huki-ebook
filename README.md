# 📖 HUKI EBOOK

> **Đọc file này TRƯỚC KHI làm bất cứ gì**

---

## 🏠 Project Overview

**HUKI EBOOK** là nền tảng thương mại điện tử bán sách:

| Feature | Mô tả |
|---------|--------|
| 📚 Sách vật lý | Sách giấy được giao đến khách hàng |
| 📱 Sách số | PDF/EPUB - đọc online hoặc tải về |
| 🏪 Marketplace | Nhiều cửa hàng bán trên nền tảng |
| 💬 Forum | Diễn đàn thảo luận |
| 💬 Chat | Chat real-time với người bán |
| 💳 Payment | VNPay, MoMo, COD |
| 🚚 Shipping | Tích hợp GHTK |

---

## 📁 Project Structure

```
HuKi/
│
├── platform/           ← Backend (NestJS microservices)
├── web/               ← Frontend Web (Next.js)
├── mobile/            ← Mobile App (Flutter)
├── docs/              ← Tài liệu dự án
├── scripts/            ← Script test, utility
├── test/              ← File linh tinh, mock
├── skill/             ← UI/UX skills
├── ebook/             ← Tài liệu gốc (.docx)
├── res/               ← Báo cáo từ agents
└── err/               ← Ghi chú lỗi
```

---

## 📋 QUY ĐỊNH VỀ FILE

| Loại file | Đặt ở | Ví dụ |
|-----------|--------|--------|
| **Code chính** | `platform/`, `web/`, `mobile/` | components, services, pages |
| **Script test/utility** | `scripts/` | benchmark.py, test-api.js |
| **File linh tinh** | `test/` | mock json, ideas, temp |
| **Design/UI** | `skill/` | UI skills |
| **Tài liệu** | `docs/` | API docs, architecture |
| **Mô tả gốc** | `ebook/` | Các file .docx gốc |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│              API Gateway (:3000)             │
├─────────────────────────────────────────────┤
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐│
│  │ Identity │  │ Business │  │ Commerce ││
│  │  :3001   │  │  :3002   │  │  :3003   ││
│  └──────────┘  └──────────┘  └──────────┘│
│  ┌──────────┐  ┌──────────┐  ┌──────────┐│
│  │ Shipping │  │Community │  │Promotion ││
│  │  :3004   │  │  :3005   │  │  :3007   ││
│  └──────────┘  └──────────┘  └──────────┘│
│                                              │
└─────────────────────────────────────────────┘
```

### Services

| Service | Port | Nhiệm vụ |
|---------|------|-----------|
| **Identity** | 3001 | Auth, Users, Sessions |
| **Business** | 3002 | Business, Store management |
| **Commerce** | 3003 | Books, Cart, Orders, Payments |
| **Shipping** | 3004 | Shipping integration |
| **Community** | 3005 | Forum, Chat, Reviews |
| **Promotion** | 3007 | Vouchers, Promotions |

### Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend Web | Next.js |
| Backend | NestJS |
| Mobile | Flutter |
| Database | PostgreSQL + MongoDB |
| Cache | Redis |
| Queue | RabbitMQ |
| Payments | VNPay, MoMo |
| Storage | Cloudflare R2, Cloudinary |
| Push | Firebase |

---

## 📂 Code Structure

### Backend (`platform/`)

```
platform/
├── src/
│   ├── gateway/           ← API Gateway
│   ├── identity/          ← Auth, Users
│   ├── business/         ← Business, Stores
│   ├── commerce/         ← Books, Cart, Orders
│   ├── shipping/         ← Shipping
│   ├── community/        ← Forum, Chat
│   ├── promotion/        ← Vouchers
│   └── common/           ← Shared modules
```

### Frontend (`web/`)

```
web/
├── src/
│   ├── app/              ← Next.js App Router
│   ├── components/       ← Shared components
│   ├── hooks/            ← Custom hooks
│   ├── services/         ← API calls
│   └── stores/           ← State management
```

### Mobile (`mobile/`)

```
mobile/
├── lib/
│   ├── core/            ← Core utilities
│   ├── features/        ← Feature modules
│   ├── shared/          ← Shared components
│   └── services/        ← API services
```

---

## 🔑 Key Files

| File | Mô tả |
|------|--------|
| `README.md` | **FILE NÀY** - Tổng quan project |
| `docs/00-GETTING-STARTED/README.md` | Hướng dẫn bắt đầu |
| `docs/04-API-REFERENCE/README.md` | API patterns |
| `docs/05-DATABASE/` | Database schemas |
| `docs/17-CHARTS/draw.io/` | System diagrams |

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
| `main` | Production code | ✅ |
| `develop` | Integration branch | ✅ |
| `feature/*` | Thêm feature mới | ❌ |
| `fix/*` | Fix bug | ❌ |
| `hotfix/*` | Fix khẩn cấp | ❌ |
| `docs/*` | Viết/sửa tài liệu | ❌ |
| `refactor/*` | Refactor code | ❌ |
| `chore/*` | Việc linh tinh | ❌ |

### Commit Convention

```
<type>(<scope>): <description>

Ví dụ:
- feat(auth): add JWT refresh token
- feat(cart): add multi-store support
- fix(payment): handle callback timeout
- docs(api): update endpoint docs
```

### Commit Types

| Type | Mô tả |
|------|--------|
| `feat` | Feature mới |
| `fix` | Fix bug |
| `docs` | Chỉ tài liệu |
| `refactor` | Refactor code |
| `test` | Thêm/update tests |
| `chore` | Maintenance, deps update |
| `hotfix` | Fix khẩn cấp |

---

## 📚 Documentation Index

```
docs/
├── README.md                       ← Documentation index
├── 00-GETTING-STARTED/           ← Bắt đầu
├── 01-PROJECT-OVERVIEW/           ← Tổng quan
├── 02-ARCHITECTURE/              ← Kiến trúc
├── 03-BACKEND/                   ← Backend details
├── 04-API-REFERENCE/             ← API endpoints
├── 05-DATABASE/                  ← Database schemas
├── 06-EVENTS/                   ← Events architecture
├── 07-FRONTEND-WEB/             ← Next.js structure
├── 08-FRONTEND-MOBILE/          ← Flutter structure
├── 09-DESIGN-SYSTEM/             ← Design system
├── 10-FEATURES/                  ← Features docs
├── 11-COMMON/                    ← Shared utilities
├── 12-OPERATIONS/               ← CI/CD, DevOps
├── 13-TESTING/                   ← Testing guide
├── 14-SECURITY/                  ← Security docs
├── 15-CONTRIBUTING/             ← Contribution guide
├── 16-REFERENCE/                ← Glossary
├── 17-CHARTS/                    ← Diagrams
├── 18-SEEDERS/                   ← Database seeders
├── 19-PERFORMANCE/              ← Performance
├── 20-ACCESSIBILITY/            ← Accessibility
└── 21-INTERNATIONALIZATION/     ← i18n
```

---

## 🚀 Quick Start

```bash
# 1. Clone repo
git clone <repo-url>
cd HuKi

# 2. Setup environment
cp .env.example .env

# 3. Start infrastructure
docker-compose up -d postgres mongo redis rabbitmq

# 4. Start backend
cd platform
npm install
npm run start:dev

# 5. Start frontend
cd ../web
npm install
npm run dev
```

---

## 📞 Questions?

1. Xem `docs/00-GETTING-STARTED/README.md` - Hướng dẫn bắt đầu
2. Xem `docs/01-PROJECT-OVERVIEW/README.md` - Tổng quan chi tiết
3. Xem `docs/16-REFERENCE/glossary.md` - Thuật ngữ

---

*Last updated: 2026-08-17*
