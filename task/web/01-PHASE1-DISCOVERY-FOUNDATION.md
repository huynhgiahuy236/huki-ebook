# Phase 01 - Discovery, Contracts & Foundation

**Mục tiêu:** khóa phạm vi API và tạo nền tảng tích hợp nhất quán.

## Sprint 01 - Endpoint snapshot

- Quét controller, method/path, guard, role, DTO và socket gateway.
- So inventory 211 HTTP endpoint + 10 WebSocket events với OpenAPI; tạo drift report.
- Phân loại `BROWSER`, `INTERNAL`, `WEBHOOK`, `CALLBACK`, `HEALTH`, `SOCKET`.
- Tạo một dòng chi tiết cho từng endpoint/event; gán owner, screen/flow và test strategy.

**DoD:** tổng endpoint khớp mã nguồn và `UNMAPPED=0`.

## Sprint 02 - Architecture and design system

- Next.js/TypeScript strict, layouts public/account/seller/admin/delivery.
- Tokens, typography, responsive grid, theme, base components và Storybook.
- Accessibility baseline: focus, keyboard, label, contrast, reduced motion.

## Sprint 03 - Typed API platform

- Sinh types/client; response envelope, pagination và error mapping.
- Query keys, cache, abort/retry, idempotency, multipart và socket client.
- Refresh single-flight; logging không lộ token/PII.

## Sprint 04 - Test, security and CI/CD

- Unit/component/integration/E2E, MSW và seeded accounts theo role.
- CSP, CSRF decision, secure token/cookie strategy, env validation.
- Preview deployment, bundle/a11y/performance budget và coverage-drift gate.

**Phase DoD:** pipeline xanh; contract snapshot và typed client dùng được cho Phase sau.
