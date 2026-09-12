# Phase 01 — Shared Foundation

**Persona:** tất cả

**Status:** `- [x] ✅ DONE`
**Mục tiêu:** frontend có nền API/auth/permission thật để các persona không tiếp tục phát triển trên mock.

## Sprint 01 — Contract snapshot

- [x] ✅ Phân loại 211 HTTP handlers và 10 WebSocket inbound events.
- [x] ✅ Snapshot machine-readable theo method/path, guard, role và DTO.
- [x] ✅ Gắn consumer, flow, client function và test ID cho API happy case.
- [x] ✅ Đạt `UNMAPPED = 0` trong phạm vi happy case.

## Sprint 02 — Typed API client

- [x] ✅ Client dùng `NEXT_PUBLIC_API_BASE_URL` và Gateway `/api/v1`.
- [x] ✅ Chuẩn hóa response envelope, pagination và error code.
- [x] ✅ Abort/retry, idempotency key và request correlation (`x-correlation-id`).
- [x] ✅ Không export internal/webhook/callback vào browser bundle.

## Sprint 03 — Auth/session platform

- [x] ✅ Login → `/auth/me` → refresh single-flight → logout bằng backend thật.
- [x] ✅ Bearer token storage adapter với fallback an toàn.
- [x] ✅ Route guard cho Guest, User, Business và Platform Admin.
- [x] ✅ Session contract chứa business membership và permissions cần cho UI.

## Sprint 04 — Permission foundation và quality

- [x] ✅ Chốt permission catalog cho product/order/store/member/finance.
- [x] ✅ Helper `can(permission, businessId)` dùng thống nhất.
- [x] ✅ Forbidden state và xử lý `403`.
- [x] ✅ Next.js typecheck/build đạt.
- [x] ✅ Frontend integration và test evidence cho `AUT-001 Login`.

## Không thuộc Phase

`⚪ DEFERRED`: socket Community, GHTK callback, PayOS webhook và production hardening không cần để đóng foundation happy case.

## Phase DoD

Typed client và auth POC chạy qua backend thật; permission contract được cả frontend/backend thống nhất; ít nhất `AUT-001 Login` có test evidence.
