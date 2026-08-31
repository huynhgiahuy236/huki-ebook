# Phase 01 - Discovery, Contracts & Foundation

**Mục tiêu:** khóa phạm vi API và tạo nền tảng tích hợp nhất quán.

## Sprint 01 - Endpoint snapshot

- Quét controller, method/path, guard, role, DTO và socket gateway.
- So inventory 211 HTTP handlers + 10 WebSocket events với 195 public OpenAPI operations; tạo drift report theo loại thay vì ép hai tổng bằng nhau.
- Phân loại `BROWSER`, `INTERNAL`, `WEBHOOK`, `CALLBACK`, `HEALTH`, `SOCKET`.
- Tạo một dòng chi tiết cho từng endpoint/event; gán owner, screen/flow và test strategy.

**DoD:** mọi handler/event trong mã nguồn đều được phân loại, browser operations khớp OpenAPI và `UNMAPPED=0`.

## Sprint 02 - Architecture and design system

- Next.js/TypeScript strict, layouts public/account/seller/admin/delivery.
- Web chạy port `3100`; API Gateway chạy port `3000`; kiểm tra CORS với `CORS_ORIGIN=http://localhost:3100`.
- Tokens, typography, responsive grid, theme và base components cần cho Identity/Catalog; Storybook mở rộng dần, không chặn MVP.
- Accessibility baseline: focus, keyboard, label, contrast, reduced motion.

## Sprint 03 - Typed API platform

- Tạo API wrapper và types theo module; chỉ generate full client khi response schema liên quan đã verified.
- Response envelope, pagination và error mapping dùng chung.
- Query keys, cache, abort/retry, idempotency, multipart và socket client.
- Refresh single-flight; logging không lộ token/PII.
- Làm auth proof-of-concept với backend thật và ghi ADR chọn BFF/HttpOnly cookie hoặc Bearer adapter tạm thời.
- Không trộn cookie và localStorage; internal/webhook/callback không được xuất vào browser client.

## Sprint 04 - Test, security and CI/CD

- Unit/component/integration/E2E, MSW và seeded accounts theo role.
- CSP, CSRF decision, secure token/cookie strategy, env validation.
- Preview deployment, bundle/a11y/performance budget và coverage-drift gate.

**Phase DoD:** pipeline xanh; local web/API không xung đột port; auth proof-of-concept pass; contract snapshot và typed API wrapper dùng được cho Phase sau.
