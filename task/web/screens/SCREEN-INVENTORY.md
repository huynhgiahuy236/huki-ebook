# Screen Inventory — Happy-case Control Board

## Dashboard 2026-09-09

| Scope | Total | Done | In progress | Partial | Todo | Deferred |
|---|---:|---:|---:|---:|---:|---:|
| Happy case | 53 | 0 | 0 | 27 | 26 | 0 |
| Outside happy case | 37 | 0 | 0 | 0 | 0 | 37 |
| **All screens** | **90** | **0** | **0** | **27** | **26** | **37** |

`PARTIAL` nghĩa là có UI mock/backend một phần; không có screen nào đã tích hợp và review bằng backend thật. Khi nhận việc, đổi đúng dòng sang `🟢 IN_PROGRESS`, ghi owner/ngày trong screen spec.

## Shared Identity — Guest và mọi tài khoản

- [ ] 🟡 `AUT-001` Login — `/login` — Happy `YES` — P02 — UI mock, API TODO
- [ ] 🟡 `AUT-002` Register — `/register` — Happy `YES` — P02 — UI mock, API TODO
- [ ] 🟡 `AUT-003` Verify account — `/verify-email` — Happy `YES` — P02 — OTP UI gần tương ứng
- [ ] 🟡 `AUT-004` Resend verification — `/resend-verification` — Happy `YES` — P02 — nằm trong OTP UI
- [ ] 🔴 `AUT-007` Blocked/unverified — `/account-status` — Happy `YES` — P02
- [ ] 🔴 `AUT-008` Unauthorized — `/unauthorized` — Happy `YES` — P02
- `⚪ DEFERRED` `AUT-005` Forgot password — `/forgot-password`
- `⚪ DEFERRED` `AUT-006` Reset password — `/reset-password`

## Guest Storefront

- [ ] 🟡 `PUB-001` Home — `/` — Happy `YES` — P03 — READY_FOR_REVIEW, Codex 2026-09-12
- [ ] 🟡 `PUB-002` Books — `/books` — Happy `YES` — P03 — READY_FOR_REVIEW, Codex 2026-09-12
- [ ] 🟡 `PUB-003` Book detail — `/books/[slug]` — Happy `YES` — P03 — READY_FOR_REVIEW, Codex 2026-09-12
- [ ] 🟡 `PUB-004` Search — `/search` — Happy `YES` — P03 — READY_FOR_REVIEW, Codex 2026-09-12
- [ ] 🟡 `PUB-005` Categories — `/categories` — Happy `YES` — P03 — READY_FOR_REVIEW, Codex 2026-09-12
- [ ] 🟡 `PUB-006` Category books — `/categories/[slug]` — Happy `YES` — P03 — READY_FOR_REVIEW, Codex 2026-09-12
- [ ] 🟡 `PUB-011` Stores — `/stores` — Happy `YES` — P03 — READY_FOR_REVIEW, Codex 2026-09-12
- [ ] 🟡 `PUB-012` Store detail — `/stores/[slug]` — Happy `YES` — P03 — READY_FOR_REVIEW, Codex 2026-09-12
- `⚪ DEFERRED` `PUB-007` Authors — `/authors`
- `⚪ DEFERRED` `PUB-008` Author detail — `/authors/[id]`
- `⚪ DEFERRED` `PUB-009` Publishers — `/publishers`
- `⚪ DEFERRED` `PUB-010` Publisher detail — `/publishers/[id]`
- `⚪ DEFERRED` `PUB-013` Flash sales — `/flash-sales`
- `⚪ DEFERRED` `PUB-014` Flash-sale detail — `/flash-sales/[id]`

## User/Buyer

- [ ] 🟡 `BUY-001` Account overview — `/account` — Happy `YES` — P05
- [ ] 🟡 `BUY-002` Profile — `/account/profile` — Happy `YES` — P05 — prototype `/profile`
- [ ] 🟡 `BUY-005` Addresses — `/account/addresses` — Happy `YES` — P04/P05
- [ ] 🟡 `BUY-006` New address — `/account/addresses/new` — Happy `YES` — P04 — shared form/modal
- [ ] 🟡 `BUY-007` Edit address — `/account/addresses/[id]/edit` — Happy `YES` — P04 — shared form/modal
- [ ] 🟡 `BUY-008` Cart — `/cart` — Happy `YES` — P04
- [ ] 🟡 `BUY-009` Checkout COD — `/checkout` — Happy `YES` — P04
- [ ] 🟡 `BUY-010` Checkout result — `/checkout/result` — Happy `YES` — P04 — prototype `/order-success`
- [ ] 🟡 `BUY-011` Orders — `/account/orders` — Happy `YES` — P05 — chưa có list riêng
- [ ] 🟡 `BUY-012` Order detail — `/account/orders/[id]` — Happy `YES` — P05 — đang gộp tracking UI
- [ ] 🔴 `BUY-013` Internal order history — `/account/orders/[id]/history` — Happy `YES` — P05
- `⚪ DEFERRED` `BUY-003` Change password — `/account/security/password`
- `⚪ DEFERRED` `BUY-004` Sessions — `/account/security/sessions`
- `⚪ DEFERRED` `BUY-014` Carrier tracking — `/account/orders/[id]/tracking` — GHTK bỏ qua
- `⚪ DEFERRED` `BUY-015` Refund request — `/account/orders/[id]/refund`
- `⚪ DEFERRED` `BUY-016` Notifications — `/account/notifications`
- `⚪ DEFERRED` `BUY-017` Notification settings — `/account/notifications/settings`

## Admin doanh nghiệp và Admin con

- [ ] 🟡 `SEL-001` Business dashboard — `/seller` — Happy `YES` — P07 — prototype `/seller/dashboard`
- [ ] 🟡 `SEL-002` Business registration — `/seller/business/register` — Happy `YES` — P03/P07 — READY_FOR_REVIEW, Codex 2026-09-12
- [ ] 🟡 `SEL-003` Application status — `/seller/business/status` — Happy `YES` — P03/P07 — READY_FOR_REVIEW, Codex 2026-09-12
- [ ] 🔴 `SEL-004` Business settings — `/seller/business/settings` — Happy `YES` — P07
- [ ] 🟡 `SEL-005` Stores — `/seller/stores` — Happy `YES` — P03/P07 — READY_FOR_REVIEW, Codex 2026-09-12
- [ ] 🟡 `SEL-006` Create store — `/seller/stores/new` — Happy `YES` — P03/P07 — READY_FOR_REVIEW, Codex 2026-09-12
- [ ] 🔴 `SEL-007` Store settings — `/seller/stores/[id]` — Happy `YES` — P07
- [ ] 🔴 `SEL-008` Admin con accounts — `/seller/members` — Happy `YES` — P06 — provision trực tiếp
- [ ] 🔴 `SEL-009` Create Admin con — `/seller/members/new` — Happy `YES` — P06 — không invitation
- [ ] 🔴 `SEL-010` Admin con permissions — `/seller/members/[id]` — Happy `YES` — P06
- [ ] 🟡 `SEL-011` Products — `/seller/products` — Happy `YES` — P07
- [ ] 🟡 `SEL-012` Create product — `/seller/product/create-ebook` — Happy `YES` — P03/P07 — READY_FOR_REVIEW, Codex 2026-09-12
- [ ] 🟡 `SEL-013` Edit product — `/seller/products/[id]/edit` — Happy `YES` — P07
- [ ] 🟡 `SEL-014` Product media — `/seller/products/[id]/media` — Happy `YES` — P07
- [ ] 🟡 `SEL-015` Seller orders — `/seller/orders` — Happy `YES` — P07
- [ ] 🔴 `SEL-016` Seller order detail — `/seller/orders/[id]` — Happy `YES` — P07
- `⚪ DEFERRED` `SEL-017` Campaigns — `/seller/campaigns`

## Admin HUKI

- [ ] 🔴 `ADM-001` Admin dashboard — `/admin` — Happy `YES` — P08
- [ ] 🟡 `ADM-002` Business approvals — `/admin/businesses` — Happy `YES` — P03/P08 — READY_FOR_REVIEW, Codex 2026-09-12
- [ ] 🔴 `ADM-003` Business approval detail — `/admin/businesses/[id]` — Happy `YES` — P08
- [ ] 🟡 `ADM-004` Store approvals — `/admin/stores` — Happy `YES` — P03/P08 — READY_FOR_REVIEW, Codex 2026-09-12
- [ ] 🔴 `ADM-005` Store approval detail — `/admin/stores/[id]` — Happy `YES` — P08
- [ ] 🔴 `ADM-008` Book administration — `/admin/books` — Happy `YES` — P08
- [ ] 🔴 `ADM-009` Category administration — `/admin/categories` — Happy `YES` — P08
- [ ] 🔴 `ADM-010` Author administration — `/admin/authors` — Happy `YES` — P08
- [ ] 🔴 `ADM-011` Publisher administration — `/admin/publishers` — Happy `YES` — P08
- [ ] 🔴 `ADM-018` System health — `/admin/system/health` — Happy `YES` — P08
- `⚪ DEFERRED` `ADM-006` Moderation queue — `/admin/moderation`
- `⚪ DEFERRED` `ADM-007` Report detail — `/admin/moderation/[id]`
- `⚪ DEFERRED` `ADM-012` Voucher administration — `/admin/vouchers`
- `⚪ DEFERRED` `ADM-013` Banner administration — `/admin/banners`
- `⚪ DEFERRED` `ADM-014` Flash-sale administration — `/admin/flash-sales`
- `⚪ DEFERRED` `ADM-015` Refund queue — `/admin/refunds`
- `⚪ DEFERRED` `ADM-016` Shipment operations — `/admin/shipments`
- `⚪ DEFERRED` `ADM-017` Delivery staff — `/admin/delivery-staff`

## Shared System

- [ ] 🟡 `SYS-001` Not found — `/404` — Happy `YES` — P02/P09 — catch-all UI có sẵn
- [ ] 🟡 `SYS-002` Forbidden — `/403` — Happy `YES` — P02/P06/P08 — AccessDenied có một phần
- `⚪ DEFERRED` `SYS-003` Rate limited — `/429`
- `⚪ DEFERRED` `SYS-004` Unexpected error — `/500`
- `⚪ DEFERRED` `SYS-005` Maintenance — `/maintenance`
- `⚪ DEFERRED` `SYS-006` Offline — `/offline`

## Community — toàn bộ deferred

- `⚪ DEFERRED` `COM-001` Forum posts — `/forum`
- `⚪ DEFERRED` `COM-002` Popular posts — `/forum/popular`
- `⚪ DEFERRED` `COM-003` Forum category — `/forum/categories/[slug]`
- `⚪ DEFERRED` `COM-004` Post detail — `/forum/posts/[id]`
- `⚪ DEFERRED` `COM-005` Create post — `/forum/posts/new`
- `⚪ DEFERRED` `COM-006` Edit post — `/forum/posts/[id]/edit`
- `⚪ DEFERRED` `COM-007` Review editor — `/reviews/[type]/[targetId]`
- `⚪ DEFERRED` `COM-008` Conversations — `/messages`
- `⚪ DEFERRED` `COM-009` Conversation detail — `/messages/[id]`
- `⚪ DEFERRED` `COM-010` Safety and reports — `/community/safety`

## Happy-case progress by persona/workspace

| Group | Happy total | Done | In progress | Partial | Todo |
|---|---:|---:|---:|---:|---:|
| Shared Identity | 6 | 0 | 0 | 4 | 2 |
| Guest Storefront | 8 | 0 | 0 | 4 | 4 |
| User/Buyer | 11 | 0 | 0 | 10 | 1 |
| Business Owner/Admin con | 16 | 0 | 0 | 7 | 9 |
| Admin HUKI | 10 | 0 | 0 | 0 | 10 |
| Shared System | 2 | 0 | 0 | 2 | 0 |
| **Total** | **53** | **0** | **0** | **27** | **26** |
