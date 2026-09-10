# Phase 09 — Happy-case E2E & Release Gate

**Persona:** tất cả
**Status:** `🔴 TODO`

## Sprint 33 — Contract closure

- [ ] 🔴 Mọi API happy case có client function, persona, permission và test ID.
- [ ] 🔴 Không còn happy-case operation `UNMAPPED` hoặc `PLANNED`.
- [ ] 🔴 Browser bundle không gọi internal/webhook/callback.

## Sprint 34 — Cross-persona E2E

- [ ] 🔴 User đăng ký → business application.
- [ ] 🔴 Admin HUKI approve business/store.
- [ ] 🔴 Owner tạo/publish sách.
- [ ] 🔴 Guest tìm thấy sách.
- [ ] 🔴 Buyer checkout COD và xem order.
- [ ] 🔴 Owner provision Admin con với permission tùy chọn.
- [ ] 🔴 Admin con có `ORDER_VIEW/ORDER_PROCESS` xử lý được đơn.
- [ ] 🔴 Admin con thiếu permission nhận `403` và không thấy action.

## Sprint 35 — Quality

- [ ] 🔴 Typecheck, lint, unit/component/integration/E2E đạt.
- [ ] 🔴 Responsive, accessibility, security và performance happy path đạt.
- [ ] 🔴 Session, permission revocation, idempotency và tenant isolation test đạt.

## Sprint 36 — UAT

- [ ] 🔴 UAT sign-off cho Guest, User, Owner, Admin con và Admin HUKI.
- [ ] 🔴 Không còn critical/high trong happy case.
- [ ] 🔴 Có rollback và smoke checklist.

## Deferred không chặn release happy case

Community, GHTK, PayOS/online payment, promotion, refund, delivery, realtime notification, Reader/DRM và các system screen mở rộng được theo dõi là `DEFERRED`, không cần giả lập là đã hoàn thành.

## Final DoD

Vertical slice năm persona chạy bằng backend thật; permission và tenant isolation có positive/negative evidence; mọi task happy case là `DONE` hoặc ngoại lệ được phê duyệt rõ ràng.
