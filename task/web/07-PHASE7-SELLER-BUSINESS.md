# Phase 07 — Admin Doanh Nghiệp Operations

**Persona:** Admin doanh nghiệp, Admin con doanh nghiệp
**Status:** `🟡 PARTIAL` — seller dashboard/product/order có UI mock; backend có nhiều API nhưng permission granular chưa hoàn chỉnh.

## Sprint 25 — Business/store workspace

- [ ] 🟡 Dashboard doanh nghiệp.
- [ ] 🟡 Business registration/status/settings.
- [ ] 🔴 Store list/create/settings.
- [ ] 🔴 Workspace luôn khóa theo `businessId` hiện tại.

## Sprint 26 — Product operations

- [ ] 🟡 Product list/create/edit/media.
- [ ] 🔴 Physical/digital/hybrid contract thật.
- [ ] 🔴 Inventory, publish/hide/archive.
- [ ] 🔴 `PRODUCT_*` và `INVENTORY_UPDATE` enforcement.

## Sprint 27 — Seller orders

- [ ] 🟡 Seller order list.
- [ ] 🔴 Seller order detail.
- [ ] 🔴 Confirm/prepare/complete/cancel bằng workflow nội bộ.
- [ ] 🔴 `ORDER_VIEW`, `ORDER_PROCESS`, `ORDER_CANCEL` tách riêng.
- [ ] 🔴 Không cho xem/xử lý order thuộc business khác.

## Sprint 28 — Owner/member integration

- [ ] 🔴 Owner xem toàn bộ chức năng.
- [ ] 🔴 Admin con chỉ thấy menu/action được cấp.
- [ ] 🔴 Empty/loading/error/403 và audit evidence.

## Deferred

`⚪ DEFERRED`: seller chat, campaigns, voucher/banner/flash sale, GHTK label/tracking và product correction/edge-case library không chặn happy case.

## Phase DoD

Owner và Admin con xử lý product/order đúng business scope; permission được backend enforcement và buyer nhìn thấy trạng thái order mới.
