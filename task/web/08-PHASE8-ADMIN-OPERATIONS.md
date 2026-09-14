# Phase 08 — Admin HUKI

> **Kế hoạch triển khai chi tiết:** [`1508.md`](1508.md)  
**Persona:** Admin HUKI  
**Status:** `✅ DONE` — Đã hoàn tất toàn bộ phân hệ Admin HUKI Portal kết nối Gateway thật `:3000`, phân quyền nghiêm ngặt `PLATFORM_ADMIN`, kiểm thử E2E 19/19 PASS và Browser UI verification.

## Sprint 29 — Admin shell và dashboard

- [x] ✅ `/admin` layout/navigation riêng với `AdminLayout.jsx`.
- [x] ✅ Chỉ `PLATFORM_ADMIN` truy cập (Bảo vệ bởi `RequireAdmin` Guard và Backend RBAC Guard).
- [x] ✅ Dashboard: business chờ duyệt, sách active/suspended và service health trực quan (`AdminDashboardPage.jsx`).

## Sprint 30 — Business approvals (Mô hình 1 DN = 1 Gian Hàng)

- [x] ✅ Business queue/detail/approve/reject và rejection reason trong Side Drawer (`AdminBusinessesPage.jsx`).
- [x] ✅ Mutation có confirmation, audit và idempotency.
- [x] ✅ Approval phản ánh vào workspace Owner và public storefront.

## Sprint 31 — Catalog administration

- [x] ✅ Book administration/suspend/activate (`AdminBooksPage.jsx`).
- [x] ✅ Category/author/publisher taxonomy tabs (`AdminCategoriesPage.jsx`).
- [x] ✅ Search & filter taxonomy theo tên/slug.

## Sprint 32 — System health

- [x] ✅ Gateway `/health/services` dashboard (`AdminHealthPage.jsx`).
- [x] ✅ Trạng thái 7/7 microservices (Identity, Business, Commerce, Shipping, Community, Promotion, Gateway).
- [x] ✅ Loading/degraded/unavailable states an toàn không lộ secrets.

## Deferred

`⚪ DEFERRED`: moderation, report queue, promotion admin, refund queue, shipment operations và delivery staff.

## Phase DoD

Admin HUKI duyệt được business, quản trị catalog và xem health; mọi route/mutation bắt buộc `PLATFORM_ADMIN` và có E2E RBAC đạt 100% PASS.

