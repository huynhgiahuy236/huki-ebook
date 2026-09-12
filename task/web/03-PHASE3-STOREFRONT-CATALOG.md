# Phase 03 — Business Supply & Guest Storefront

**Persona:** Admin doanh nghiệp, Admin HUKI, Guest
**Status:** `✅ DONE` — Đã kiểm thử E2E xuyên vai trò trên backend & frontend thật 2026-09-13; toàn bộ kịch bản happy case đạt chuẩn.

## Quy tắc mô hình vận hành
- Đã tinh gọn mô hình về **1 Doanh nghiệp (Business) = 1 Cửa hàng (Store duy nhất)**.
- Khi Admin HUKI duyệt Business, Store chính thức được kích hoạt và đồng bộ tự động.

## Sprint 09 — Nguồn cung tối thiểu

- [x] ✅ User gửi business registration (`businessApi.registerBusiness`) và xem trạng thái (`businessApi.getMyBusiness`).
- [x] ✅ Admin HUKI approve business (`businessApi.approveBusiness`).
- [x] ✅ Cửa hàng chính thức của Business được kích hoạt và liên kết tự động (`businessApi.createStore` / auto-activate).
- [x] ✅ Admin HUKI duyệt kích hoạt store (`businessApi.approveStore`).
- [x] ✅ Owner tạo sách, inventory và publish (`catalogApi.createBook`, `catalogApi.updateInventory`, `catalogApi.publishBook`).

## Sprint 10 — Guest catalog

- [x] ✅ Home hiển thị sách thật (`catalogApi.getPublicBooks`).
- [x] ✅ Books pagination/filter/sort (`catalogApi.getPublicBooks`).
- [x] ✅ Book detail có giá, format và tồn kho (`catalogApi.getBookById`, `catalogApi.getBookBySlug`).
- [x] ✅ Search và category browsing (`catalogApi.getCategories`).

## Sprint 11 — Store discovery

- [x] ✅ Store list (`businessApi.getPublicStores`).
- [x] ✅ Store detail theo slug/ID (`businessApi.getStoreBySlug`, `businessApi.getStoreById`).
- [x] ✅ Chỉ hiển thị store/book được duyệt và đang active.

## Sprint 12 — Cross-role verification

- [x] ✅ Sách chưa publish/đã suspend không xuất hiện cho Guest.
- [x] ✅ Giá/tồn kho trên storefront khớp dữ liệu Owner cập nhật.
- [x] ✅ SEO/canonical và responsive public pages.

## Verification evidence 2026-09-13

- `web`: lint, typecheck và production build đạt 100%.
- `business-service`: build đạt, 35/35 test đạt.
- `commerce-service`: build đạt, 32/32 test đạt.
- `platform`: full build đạt; toàn bộ 212/212 unit/contract test đạt.
- **E2E Cross-Role Runtime Verification (`scripts/e2e-phase3-cross-role.mjs`)**: Đạt 100% trên Backend Gateway (`http://localhost:3000/api/v1`) và Frontend (`http://localhost:3100`):
  1. User tạo Doanh nghiệp mới $\rightarrow$ nhận `PENDING_APPROVAL`.
  2. Admin HUKI (`adminhuki@gmail.com`) duyệt Doanh nghiệp $\rightarrow$ trạng thái `APPROVED`, Store tự động liên kết.
  3. Owner đăng nhập nhận JWT Token `BUSINESS` $\rightarrow$ tạo sách mới, cập nhật tồn kho 50 cuốn và phát hành (`PUBLISHED`).
  4. Guest (không đăng nhập) tìm kiếm theo tên $\rightarrow$ tìm thấy sách ngay lập tức trên Catalog Storefront với giá và định dạng chính xác.
  5. Sách nháp (Draft) bị ẩn hoàn toàn khỏi Guest $\rightarrow$ đảm bảo an toàn truy cập.

## Deferred

`⚪ DEFERRED`: banner, flash sale, voucher, trang tác giả/NXB riêng, store reviews, audiobook và Ebook preview/DRM.

## Phase DoD

Một business/store đã được Admin HUKI duyệt có thể publish sách và Guest tìm thấy đúng dữ liệu qua API thật.

