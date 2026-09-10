# Phase 05 — Buyer Account & Orders

**Persona:** User/Buyer
**Status:** `🟡 PARTIAL` — profile/order detail có UI mock; order list/API chưa hoàn chỉnh.

## Sprint 17 — Account tối thiểu

- [ ] 🟡 Account overview/profile.
- [ ] 🟡 Address CRUD.
- [ ] 🔴 Chỉ đọc/sửa dữ liệu của chính user.

## Sprint 18 — Buyer orders

- [ ] 🔴 Order list thật.
- [ ] 🟡 Order detail.
- [ ] 🔴 Internal order history timeline.
- [ ] 🔴 Empty/loading/error/not-found.

## Sprint 19 — Order authorization

- [ ] 🔴 User khác không xem được đơn.
- [ ] 🔴 Admin con chỉ xem order thuộc business và có `ORDER_VIEW`.
- [ ] 🔴 Trạng thái buyer thấy khớp trạng thái seller cập nhật.

## Sprint 20 — E2E

- [ ] 🔴 Checkout success deep-link vào order detail.
- [ ] 🔴 Refresh trang vẫn tải được order từ backend.
- [ ] 🔴 Responsive/accessibility/test evidence.

## Deferred

`⚪ DEFERRED`: carrier tracking/GHTK, cancel automation, refund/return, review, chat, notification center và offline cache.

## Phase DoD

Buyer xem được danh sách, chi tiết và lịch sử nội bộ của đơn COD vừa tạo; ownership/RBAC được backend kiểm tra.
