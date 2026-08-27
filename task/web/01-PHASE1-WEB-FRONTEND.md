# 📋 PHASE 8: Web Frontend
**Thời gian ước tính: 8-10 tuần**
**Status: ⏸️ DEFERRED**
**Dependency: Phase 6 (Quality) COMPLETE**

## ⚠️ Lý do defer
Chờ Phase 6 (Backend Quality) hoàn thành trước khi bắt đầu frontend để đảm bảo API contracts ổn định.

## 🎯 Mục tiêu
Next.js 14 web application với đầy đủ features cho users, sellers, và admins.

---

## 🐙 Tasks

### Sprint 31: Web Setup & Shared Components

| Task | Owner | Priority | Description | Status | Definition of Done |
|------|-------|----------|-------------|--------|-------------------|
| T31.1 | KIEN | HIGH | Next.js 14 setup (App Router) | ⏸️ TODO | Project scaffolded |
| T31.2 | KIEN | HIGH | Tailwind CSS + shadcn/ui setup | ⏸️ TODO | Components available |
| T31.3 | KIEN | HIGH | API client (Axios) setup | ⏸️ TODO | Base instance with interceptors |
| T31.4 | KIEN | HIGH | Auth context (NextAuth.js) | ⏸️ TODO | JWT flow working |
| T31.5 | HUY | HIGH | Design system | ⏸️ TODO | Colors, typography, spacing |
| T31.6 | HUY | HIGH | Base components (Button, Input, Card) | ⏸️ TODO | 20+ components |

### Sprint 32: User Pages - Browse

| Task | Owner | Priority | Description | Status | Definition of Done |
|------|-------|----------|-------------|--------|-------------------|
| T32.1 | KIEN | HIGH | Home page với featured books | ⏸️ TODO | Banners, categories |
| T32.2 | KIEN | HIGH | Book catalog page với filters | ⏸️ TODO | Category, author, price filters |
| T32.3 | KIEN | HIGH | Book detail page | ⏸️ TODO | Cover, description, reviews |
| T32.4 | HUY | HIGH | Category pages | ⏸️ TODO | Dynamic routing |
| T32.5 | HUY | HIGH | Search functionality | ⏸️ TODO | Full-text search |
| T32.6 | KIEN | MEDIUM | Store pages | ⏸️ TODO | Seller storefront |
| T32.7 | HUY | MEDIUM | Author/Publisher pages | ⏸️ TODO | Author bio, books |

### Sprint 33: User Pages - Shopping

| Task | Owner | Priority | Description | Status | Definition of Done |
|------|-------|----------|-------------|--------|-------------------|
| T33.1 | KIEN | HIGH | Cart page | ⏸️ TODO | Add/remove/update quantities |
| T33.2 | KIEN | HIGH | Checkout flow | ⏸️ TODO | Address, payment method |
| T33.3 | KIEN | HIGH | Payment page (PayOS redirect) | ⏸️ TODO | QR code, redirect handling |
| T33.4 | KIEN | HIGH | Order confirmation | ⏸️ TODO | Success screen |
| T33.5 | HUY | HIGH | Order history | ⏸️ TODO | List + detail views |
| T33.6 | HUY | HIGH | Order tracking | ⏸️ TODO | Timeline visualization |
| T33.7 | KIEN | MEDIUM | User profile page | ⏸️ TODO | Edit profile, addresses |

### Sprint 34: Seller Dashboard

| Task | Owner | Priority | Description | Status | Definition of Done |
|------|-------|----------|-------------|--------|-------------------|
| T34.1 | HUY | HIGH | Seller layout & navigation | ⏸️ TODO | Sidebar + header |
| T34.2 | HUY | HIGH | Dashboard overview | ⏸️ TODO | Stats cards, charts |
| T34.3 | HUY | HIGH | Book management (CRUD) | ⏸️ TODO | Create, edit, delete books |
| T34.4 | HUY | HIGH | Book upload (cover, PDF) | ⏸️ TODO | Image upload, file storage |
| T34.5 | KIEN | HIGH | Order management | ⏸️ TODO | Confirm, ship, complete |
| T34.6 | KIEN | HIGH | Voucher management | ⏸️ TODO | Create/apply vouchers |
| T34.7 | HUY | MEDIUM | Store settings | ⏸️ TODO | Logo, description |
| T34.8 | KIEN | MEDIUM | Analytics overview | ⏸️ TODO | Sales, revenue charts |

### Sprint 35: Admin Dashboard

| Task | Owner | Priority | Description | Status | Definition of Done |
|------|-------|----------|-------------|--------|-------------------|
| T35.1 | KIEN | HIGH | Admin layout & navigation | ⏸️ TODO | Protected routes |
| T35.2 | KIEN | HIGH | User management | ⏸️ TODO | List, suspend users |
| T35.3 | KIEN | HIGH | Business approval | ⏸️ TODO | Approve/reject businesses |
| T35.4 | HUY | HIGH | Content moderation | ⏸️ TODO | Review flagged content |
| T35.5 | HUY | HIGH | Report management | ⏸️ TODO | View and act on reports |
| T35.6 | KIEN | MEDIUM | System settings | ⏸️ TODO | Platform config |

### Sprint 36: Digital Reading UI

| Task | Owner | Priority | Description | Status | Definition of Done |
|------|-------|----------|-------------|--------|-------------------|
| T36.1 | KIEN | HIGH | User library page | ⏸️ TODO | Purchased books |
| T36.2 | KIEN | HIGH | PDF reader integration | ⏸️ TODO | react-pdf or pdf.js |
| T36.3 | HUY | MEDIUM | Reading progress UI | ⏸️ TODO | Progress bar |
| T36.4 | KIEN | MEDIUM | Reading settings | ⏸️ TODO | Font size, theme |

---

## 📦 Deliverables Phase 8

```
⬜ Sprint 31: Web setup & components
⬜ Sprint 32: User pages - browse
⬜ Sprint 33: User pages - shopping
⬜ Sprint 34: Seller dashboard
⬜ Sprint 35: Admin dashboard
⬜ Sprint 36: Digital reading UI
```

---

## 🔗 Dependencies

```
Phase 6 → Sprint 31 → Sprint 32 → Sprint 33 → Sprint 34 → Sprint 35 → Sprint 36
         (setup)    (browse)   (shop)     (seller)   (admin)    (library)
```

---

## 📅 Update Log

| Date | Owner | Changes |
|------|-------|---------|
| 2026-08-25 | KIEN | Created Phase 8 - Deferred |
