# Phase 01 — Shared Foundation

**Persona:** tất cả

**Status:** `🟢 IN_PROGRESS`
**Mục tiêu:** frontend có nền API/auth/permission thật để các persona không tiếp tục phát triển trên mock.

## Sprint 01 — Contract snapshot

- [ ] 🟡 Phân loại 211 HTTP handlers và 10 WebSocket inbound events.
- [ ] 🔴 Snapshot machine-readable theo method/path, guard, role và DTO.
- [ ] 🔴 Gắn consumer, flow, client function và test ID cho API happy case.
- [ ] 🔴 Đạt `UNMAPPED = 0` trong phạm vi happy case.

## Sprint 02 — Typed API client

- [ ] 🔴 Client dùng `NEXT_PUBLIC_API_BASE_URL` và Gateway `/api/v1`.
- [ ] 🔴 Chuẩn hóa response envelope, pagination và error code.
- [ ] 🔴 Abort/retry, idempotency key và request correlation.
- [ ] 🔴 Không export internal/webhook/callback vào browser bundle.

## Sprint 03 — Auth/session platform

- [ ] 🔴 Login → `/auth/me` → refresh single-flight → logout bằng backend thật.
- [ ] 🔴 Chốt BFF/HttpOnly cookie hoặc ghi ADR cho Bearer adapter tạm thời.
- [ ] 🔴 Route guard cho Guest, User, Business và Platform Admin.
- [ ] 🔴 Session contract chứa business membership và permissions cần cho UI.

## Sprint 04 — Permission foundation và quality

- [ ] 🔴 Chốt permission catalog cho product/order/store/member/finance.
- [ ] 🔴 Helper `can(permission, businessId)` dùng thống nhất.
- [ ] 🔴 Forbidden state và xử lý `403`.
- [ ] 🟡 Next.js typecheck/build đang đạt.
- [ ] 🔴 Frontend test/E2E và integration blockers được xử lý.

## Không thuộc Phase

`⚪ DEFERRED`: socket Community, GHTK callback, PayOS webhook và production hardening không cần để đóng foundation happy case.

## Phase DoD

Typed client và auth POC chạy qua backend thật; permission contract được cả frontend/backend thống nhất; ít nhất `AUT-001 Login` có test evidence.
