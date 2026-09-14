# Phase 09 — Happy-case E2E & Release Gate
 
**Persona:** tất cả
**Status:** `✅ DONE`

## Sprint 33 — Contract closure

- [x] ✅ Mọi API happy case có client function, persona, permission và test ID.
- [x] ✅ Không còn happy-case operation `UNMAPPED` hoặc `PLANNED`.
- [x] ✅ Browser bundle không gọi internal/webhook/callback.

## Sprint 34 — Cross-persona E2E

- [x] ✅ User đăng ký → business application.
- [x] ✅ Admin HUKI approve business/store.
- [x] ✅ Owner tạo/publish sách.
- [x] ✅ Guest tìm thấy sách.
- [x] ✅ Buyer checkout COD và xem order.
- [x] ✅ Owner provision Admin con với permission tùy chọn.
- [x] ✅ Admin con có `ORDER_VIEW/ORDER_PROCESS` xử lý được đơn.
- [x] ✅ Admin con thiếu permission nhận `403` và không thấy action.

## Sprint 35 — Quality

- [x] ✅ Typecheck, lint, unit/component/integration/E2E đạt.
- [x] ✅ Responsive, accessibility, security và performance happy path đạt.
- [x] ✅ Session, permission revocation, idempotency và tenant isolation test đạt.

## Sprint 36 — UAT

- [x] ✅ UAT sign-off cho Guest, User, Owner, Admin con và Admin HUKI.
- [x] ✅ Không còn critical/high trong happy case.
- [x] ✅ Có rollback và smoke checklist.

## Deferred không chặn release happy case

Community, GHTK, PayOS/online payment, promotion, refund, delivery, realtime notification, Reader/DRM và các system screen mở rộng được theo dõi là `DEFERRED`, không cần giả lập là đã hoàn thành.

## Final DoD

Vertical slice năm persona chạy bằng backend thật; permission và tenant isolation có positive/negative evidence; mọi task happy case là `DONE` hoặc ngoại lệ được phê duyệt rõ ràng.
