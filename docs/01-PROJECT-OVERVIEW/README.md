# 📋 Project Overview

Tổng quan dự án HUKI EBOOK.

## 🎯 Project Description

HUKI EBOOK là nền tảng thương mại điện tử (Marketplace) chuyên về sách, cho phép:

- **Người bán (Business)**: Đăng ký và quản lý cửa hàng (Store) trên nền tảng
- **Người bán (Seller)**: Đăng bán sách vật lý (Physical) và sách điện tử (Digital/Ebook)
- **Người mua (User)**: Tìm kiếm, mua sách, đọc ebook, thảo luận và đánh giá
- **Platform Admin**: Quản lý toàn bộ hệ thống, duyệt doanh nghiệp, kiểm duyệt nội dung

## 📊 System Overview

### User Types

| User Type | Role | Description |
|-----------|------|-------------|
| Guest | - | Khách truy cập, chỉ xem nội dung công khai |
| User | USER | Người mua, đọc giả |
| Business | BUSINESS | Chủ doanh nghiệp/Nhà sách |
| Delivery Staff | DELIVERY_STAFF | Nhân viên giao hàng |
| Platform Admin | PLATFORM_ADMIN | Quản trị viên nền tảng |

### Business Roles

| Role | Description |
|------|-------------|
| OWNER | Chủ doanh nghiệp - toàn quyền |
| MANAGER | Quản lý - hầu hết nghiệp vụ |
| ORDER_STAFF | Nhân viên đơn hàng |
| CONTENT_STAFF | Nhân viên nội dung/sách |

## 🏗️ Architecture Overview

### Microservices

```
┌─────────────────────────────────────────────────────────────────┐
│                         API GATEWAY                              │
│                    (Authentication, Routing)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
    ┌───────────┬───────────┬───────────┬───────────┬───────────┐
    │           │           │           │           │           │
    ▼           ▼           ▼           ▼           ▼           ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Identity│ │Business│ │Commerce│ │Shipping│ │Community│ │Promotion│
│Service │ │Service │ │Service │ │Service │ │Service │ │Service │
└────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘
    │           │           │           │           │           │
    ▼           ▼           ▼           ▼           ▼           ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Postgres│ │Postgres│ │Postgres│ │Postgres│ │MongoDB │ │Postgres│
└────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘
```

### Technology Stack

| Component | Technology |
|-----------|------------|
| Backend Framework | NestJS (Microservices) |
| Language | TypeScript |
| Primary Database | PostgreSQL |
| Document Database | MongoDB |
| Cache | Redis |
| Message Queue | RabbitMQ |
| Real-time | Socket.IO |
| File Storage (Images) | Cloudinary |
| File Storage (Ebooks) | Cloudflare R2 |
| Push Notifications | Firebase Cloud Messaging |
| Web Frontend | Next.js 14 |
| Mobile Frontend | Flutter |
| API Documentation | OpenAPI/Swagger |

## 📦 Key Features

### Core Features

1. **Authentication & Authorization**
   - Email/Password registration & login
   - JWT Access + Refresh Token
   - Role-based access control (RBAC)
   - Social login (Google, Facebook)

2. **Business Management**
   - Business registration với Mock Registry verification
   - Admin approval workflow
   - Store management
   - Member invitation & roles

3. **Catalog & Books**
   - Physical books (có tồn kho, shipping)
   - Digital books (ebook/PDF, không tồn kho)
   - Book categories, authors, publishers
   - Inventory management

4. **Shopping Experience**
   - Multi-store cart
   - Checkout với shipping fee calculation
   - Order management (Order → SellerOrder → OrderItem)
   - Payment: Online (PayOS) + COD

5. **Digital Reading**
   - User Library
   - Ebook reader (PDF viewer)
   - Reading progress sync
   - Offline reading (mobile)

6. **Community**
   - Forum (thảo luận)
   - Chat (User ↔ Business)
   - Reviews & Ratings
   - Content moderation (AI + Admin)

7. **Marketing**
   - Banners & Campaigns
   - Vouchers (Platform & Store)
   - Book discounts
   - Content Management

8. **Notifications**
   - In-app notifications
   - Push notifications (Mobile)
   - Email notifications (future)

## 🔄 Data Flow

### Order Creation Flow

```
User → Cart → Checkout → Order → Payment → Fulfillment → Delivery
                      ↓         ↓
                   Inventory  SellerOrder
                   Reserve     per Store
```

### Digital Book Purchase Flow

```
User → Cart → Checkout → Payment → BookAccess → User Library → Reading
                                           ↓
                                      File from R2
                                   (via Signed URL)
```

## 📁 Project Structure

```
huki-ebook/
├── services/
│   ├── identity-service/      # User auth, sessions
│   ├── business-service/      # Business, Store, Members
│   ├── commerce-service/      # Books, Cart, Orders, Payment
│   ├── shipping-service/      # Shipping, Delivery
│   ├── community-service/     # Forum, Chat, Reviews, Notifications
│   ├── promotion-service/     # Vouchers, Promotions
│   └── api-gateway/           # API Gateway
│
├── apps/
│   ├── web/                  # Next.js Web Application
│   └── mobile/               # Flutter Mobile Application
│
├── docs/                     # Documentation
├── infra/                    # Infrastructure (Docker, K8s)
└── libs/                     # Shared libraries
```

## 🌍 Environments

| Environment | Purpose | URL |
|-------------|---------|-----|
| Development | Local development | localhost |
| Staging | Pre-production testing | staging.huki-ebook.local |
| Production | Live system | api.huki-ebook.com |

## 📅 Milestones

| Phase | Features | Status |
|-------|----------|--------|
| Phase 1 | Auth, Business registration, Catalog | Planned |
| Phase 2 | Cart, Checkout, Orders, Payment | Planned |
| Phase 3 | Digital reading, User Library | Planned |
| Phase 4 | Community (Forum, Chat, Reviews) | Planned |
| Phase 5 | Marketing (Vouchers, Banners) | Planned |
| Phase 6 | Admin, Analytics, Optimization | Planned |

## 👥 Team Structure

| Role | Responsibilities |
|------|------------------|
| Tech Lead | Architecture, Code review |
| Backend Engineers | Microservices, API |
| Frontend Engineers | Web, Mobile |
| QA Engineers | Testing, Automation |
| DevOps | Infrastructure, CI/CD |
| UI/UX Designer | Design, Prototypes |

## 📞 Contact

- **Email**: dev@huki-ebook.com
- **Slack**: #huki-dev-team
- **GitHub**: [Link to repo]
