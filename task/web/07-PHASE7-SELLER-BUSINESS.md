# Phase 07 — Admin Doanh Nghiệp Operations

**Persona:** Admin doanh nghiệp, Admin con doanh nghiệp
**Status:** `✅ DONE` — hoàn thiện toàn bộ phân hệ vận hành Seller Portal trên dữ liệu thật (Dashboard, Sách & Kho hàng, Xử lý Đơn hàng Side Drawer) có kiểm soát phân quyền (RBAC) và cô lập dữ liệu theo `businessId`.

## Sprint 25 — Business/store workspace

- [x] ✅ Dashboard doanh nghiệp.
- [x] ✅ Business registration/status/settings.
- [x] ✅ Store list/create/settings.
- [x] ✅ Workspace luôn khóa theo `businessId` hiện tại.

## Sprint 26 — Product operations

- [x] ✅ Product list/create/edit/media.
- [x] ✅ Physical/digital/hybrid contract thật.
- [x] ✅ Inventory, publish/hide/archive.
- [x] ✅ `PRODUCT_*` và `INVENTORY_UPDATE` enforcement.

## Sprint 27 — Seller orders

- [x] ✅ Seller order list.
- [x] ✅ Seller order detail (Side Drawer chi tiết).
- [x] ✅ Confirm/prepare/complete/cancel bằng workflow nội bộ.
- [x] ✅ `ORDER_VIEW`, `ORDER_PROCESS`, `ORDER_CANCEL` tách riêng.
- [x] ✅ Không cho xem/xử lý order thuộc business khác.

## Sprint 28 — Owner/member integration

- [x] ✅ Owner xem toàn bộ chức năng.
- [x] ✅ Admin con chỉ thấy menu/action được cấp.
- [x] ✅ Empty/loading/error/403 và audit evidence.

## Deferred

`⚪ DEFERRED`: seller chat, campaigns, voucher/banner/flash sale, GHTK label/tracking và product correction/edge-case library không chặn happy case.

## Phase DoD

Owner và Admin con xử lý product/order đúng business scope; permission được backend enforcement và buyer nhìn thấy trạng thái order mới.
