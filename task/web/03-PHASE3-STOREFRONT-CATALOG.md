# Phase 03 — Business Supply & Guest Storefront

**Persona:** Admin doanh nghiệp, Admin HUKI, Guest
**Status:** `🟡 READY_FOR_REVIEW` — Owner: Codex, hoàn tất implementation 2026-09-12; chờ reviewer chạy E2E backend thật.

## Sprint 09 — Nguồn cung tối thiểu

- [x] 🟡 User gửi business registration (`businessApi.registerBusiness`) và xem trạng thái (`businessApi.getMyBusiness`).
- [x] 🟡 Admin HUKI approve business (`businessApi.approveBusiness`).
- [x] 🟡 Owner tạo store (`businessApi.createStore`).
- [x] 🟡 Admin HUKI approve store (`businessApi.approveStore`).
- [x] 🟡 Owner tạo sách, inventory và publish (`catalogApi.createBook`, `catalogApi.updateInventory`, `catalogApi.publishBook`).

## Sprint 10 — Guest catalog

- [x] 🟡 Home hiển thị sách thật (`catalogApi.getPublicBooks`).
- [x] 🟡 Books pagination/filter/sort (`catalogApi.getPublicBooks`).
- [x] 🟡 Book detail có giá, format và tồn kho (`catalogApi.getBookById`, `catalogApi.getBookBySlug`).
- [x] 🟡 Search và category browsing (`catalogApi.getCategories`).

## Sprint 11 — Store discovery

- [x] 🟡 Store list (`businessApi.getPublicStores`).
- [x] 🟡 Store detail theo slug/ID (`businessApi.getStoreBySlug`, `businessApi.getStoreById`).
- [x] 🟡 Chỉ hiển thị store/book được duyệt và đang active.

## Sprint 12 — Cross-role verification

- [x] 🟡 Sách chưa publish/đã suspend không xuất hiện cho Guest.
- [x] 🟡 Giá/tồn kho trên storefront khớp dữ liệu Owner cập nhật.
- [x] 🟡 SEO/canonical và responsive public pages.

## Verification evidence 2026-09-12

- `web`: lint, typecheck và production build đạt.
- `business-service`: build đạt, 35/35 test đạt.
- `commerce-service`: build đạt, 32/32 test đạt.
- `platform`: full build đạt; toàn bộ 212/212 test đạt; `git diff --check` sạch.
- Còn release gate theo quy trình: reviewer chạy xuyên vai trò bằng backend thật trước khi đổi thành `✅ DONE`.

## Deferred

`⚪ DEFERRED`: banner, flash sale, voucher, trang tác giả/NXB riêng, store reviews, audiobook và Ebook preview/DRM.

## Phase DoD

Một business/store đã được Admin HUKI duyệt có thể publish sách và Guest tìm thấy đúng dữ liệu qua API thật.
