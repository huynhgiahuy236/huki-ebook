# Phase 08 — Admin HUKI

**Persona:** Admin HUKI
**Status:** `🔴 TODO` — backend approval/admin API có sẵn một phần; frontend chưa có admin routes/screens thật.

## Sprint 29 — Admin shell và dashboard

- [ ] 🔴 `/admin` layout/navigation riêng.
- [ ] 🔴 Chỉ `PLATFORM_ADMIN` truy cập.
- [ ] 🔴 Dashboard: business/store chờ duyệt, sách active/suspended, COD orders và service health.

## Sprint 30 — Business/store approvals

- [ ] 🔴 Business queue/detail/approve/reject và rejection reason.
- [ ] 🔴 Store queue/detail/approve/reject.
- [ ] 🔴 Mutation có confirmation, audit và idempotency.
- [ ] 🔴 Approval phản ánh vào workspace Owner và public storefront.

## Sprint 31 — Catalog administration

- [ ] 🔴 Book administration/suspend.
- [ ] 🔴 Category/author/publisher CRUD.
- [ ] 🔴 Conflict handling khi taxonomy đang được dùng.

## Sprint 32 — System health

- [ ] 🔴 Gateway `/health/services` dashboard.
- [ ] 🔴 Loading/degraded/unavailable states.
- [ ] 🔴 Không hiển thị secret hoặc dữ liệu hạ tầng nhạy cảm.

## Deferred

`⚪ DEFERRED`: moderation, report queue, promotion admin, refund queue, shipment operations và delivery staff.

## Phase DoD

Admin HUKI duyệt được business/store, quản trị catalog và xem health; mọi route/mutation bắt buộc `PLATFORM_ADMIN` và có E2E RBAC.
