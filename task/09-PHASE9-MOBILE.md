# 📋 PHASE 9: Mobile App
**Thời gian ước tính: 8-10 tuần**
**Status: ⏸️ DEFERRED**
**Dependency: Phase 8 (Web Frontend) COMPLETE**

## ⚠️ Lý do defer
Chờ Phase 8 (Web Frontend) hoàn thành vì mobile sử dụng chung API contracts và có thể tái sử dụng components/logic từ web.

## 🎯 Mục tiêu
Flutter mobile app với đầy đủ features cho users và sellers trên iOS và Android.

---

## 🐙 Tasks

### Sprint 37: Mobile Setup & Shared

| Task | Owner | Priority | Description | Status | Definition of Done |
|------|-------|----------|-------------|--------|-------------------|
| T37.1 | KIEN | HIGH | Flutter project setup | ⏸️ TODO | iOS + Android scaffolded |
| T37.2 | KIEN | HIGH | State management (Riverpod/BLoC) | ⏸️ TODO | Architecture chosen |
| T37.3 | KIEN | HIGH | API client setup | ⏸️ TODO | Dio with interceptors |
| T37.4 | KIEN | HIGH | Auth flow (JWT storage) | ⏸️ TODO | Secure token storage |
| T37.5 | KIEN | HIGH | Design system | ⏸️ TODO | Colors, typography, spacing |
| T37.6 | KIEN | HIGH | Base widgets | ⏸️ TODO | Button, Card, Input, etc. |

### Sprint 38: User App - Browse

| Task | Owner | Priority | Description | Status | Definition of Done |
|------|-------|----------|-------------|--------|-------------------|
| T38.1 | KIEN | HIGH | Home screen | ⏸️ TODO | Banners, featured books |
| T38.2 | KIEN | HIGH | Catalog screen | ⏸️ TODO | Grid/list view, filters |
| T38.3 | KIEN | HIGH | Book detail screen | ⏸️ TODO | Cover, description, reviews |
| T38.4 | KIEN | MEDIUM | Search screen | ⏸️ TODO | Real-time search |
| T38.5 | KIEN | MEDIUM | Category browsing | ⏸️ TODO | Horizontal categories |

### Sprint 39: User App - Shopping

| Task | Owner | Priority | Description | Status | Definition of Done |
|------|-------|----------|-------------|--------|-------------------|
| T39.1 | KIEN | HIGH | Cart screen | ⏸️ TODO | Add/remove/update |
| T39.2 | KIEN | HIGH | Checkout flow | ⏸️ TODO | Address selection, payment |
| T39.3 | KIEN | HIGH | PayOS payment | ⏸️ TODO | WebView or SDK |
| T39.4 | KIEN | HIGH | Order history | ⏸️ TODO | List + detail |
| T39.5 | KIEN | MEDIUM | Order tracking | ⏸️ TODO | Timeline visualization |
| T39.6 | KIEN | MEDIUM | User profile | ⏸️ TODO | Edit, addresses |

### Sprint 40: Seller App

| Task | Owner | Priority | Description | Status | Definition of Done |
|------|-------|----------|-------------|--------|-------------------|
| T40.1 | KIEN | HIGH | Dashboard | ⏸️ TODO | Stats, recent orders |
| T40.2 | KIEN | HIGH | Book management | ⏸️ TODO | CRUD operations |
| T40.3 | KIEN | HIGH | Order management | ⏸️ TODO | Confirm, ship |
| T40.4 | KIEN | MEDIUM | Sales analytics | ⏸️ TODO | Charts, export |
| T40.5 | KIEN | MEDIUM | Push notifications | ⏸️ TODO | FCM integration |

### Sprint 41: Library & Downloads

| Task | Owner | Priority | Description | Status | Definition of Done |
|------|-------|----------|-------------|--------|-------------------|
| T41.1 | KIEN | HIGH | Library screen | ⏸️ TODO | Purchased books |
| T41.2 | KIEN | HIGH | PDF reader | ⏸️ TODO | Full-featured reader |
| T41.3 | KIEN | HIGH | Download manager | ⏸️ TODO | Background downloads |
| T41.4 | KIEN | MEDIUM | Reading settings | ⏸️ TODO | Font, theme, brightness |
| T41.5 | KIEN | MEDIUM | Reading progress sync | ⏸️ TODO | Sync across devices |

### Sprint 42: Platform Features

| Task | Owner | Priority | Description | Status | Definition of Done |
|------|-------|----------|-------------|--------|-------------------|
| T42.1 | KIEN | HIGH | App store submission | ⏸️ TODO | App Store + Play Store |
| T42.2 | KIEN | HIGH | Deep linking | ⏸️ TODO | Share book links |
| T42.3 | KIEN | MEDIUM | Offline mode | ⏸️ TODO | Cache critical data |
| T42.4 | KIEN | MEDIUM | Analytics | ⏸️ TODO | Crashlytics, events |

---

## 📦 Deliverables Phase 9

```
⬜ Sprint 37: Mobile setup
⬜ Sprint 38: User app - browse
⬜ Sprint 39: User app - shopping
⬜ Sprint 40: Seller app
⬜ Sprint 41: Library & downloads
⬜ Sprint 42: Platform features
```

---

## 🔗 Dependencies

```
Phase 8 Sprint 36 → Sprint 37 → Sprint 38 → Sprint 39 → Sprint 40 → Sprint 41 → Sprint 42
                     (setup)    (browse)   (shop)     (seller)   (library)   (platform)
```

---

## 📅 Update Log

| Date | Owner | Changes |
|------|-------|---------|
| 2026-08-25 | KIEN | Created Phase 9 - Deferred |
