# Phase 09 - Coverage Closure, Quality & Launch

## Sprint 33 - Endpoint audit

Sinh lại controller snapshot, diff OpenAPI/client/matrix; tìm API thiếu client, screen, role hoặc test. Đóng toàn bộ drift.

## Sprint 34 - Internal, callback and webhook tests

Integration test shipment from-order/cancel, internal voucher/apply/book-price, PayOS webhook và GHTK callback; chứng minh browser bundle không gọi chúng.

## Sprint 35 - Non-functional and operations

Health/liveness/readiness probes; security, accessibility, performance, SEO, compatibility/load tests; observability và rollback.

## Sprint 36 - UAT and launch

UAT theo guest, buyer, seller owner/member, delivery, admin; production smoke, rollback rehearsal và ký duyệt ngoại lệ.

**Final DoD:** mọi source handler/event được phân loại; `total_source = VERIFIED + SYSTEM_TESTED + N/A-APPROVED`; không yêu cầu tổng source handlers bằng tổng public OpenAPI operations; `UNMAPPED=0`, `PLANNED=0`, `IMPLEMENTED_NOT_VERIFIED=0`; tất cả quality/security/release gates đạt.

