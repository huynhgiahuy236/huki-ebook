# Phase 02 - Identity, Profile & Sessions

## Sprint 05 - Registration and email verification

Đăng ký, verify-email callback, resend verification; xử lý expired/already-used. API: register, verify-email, resend-verification.

## Sprint 06 - Login and token lifecycle

Login, bootstrap bằng `/auth/me`, refresh, logout, logout-all; role routing và blocked/unverified states.

## Sprint 07 - Password lifecycle

Forgot, reset, change password; token expiry, password rules, không tiết lộ email tồn tại và invalidation session.

## Sprint 08 - Profile and session security

Xem/sửa profile; list sessions, revoke một hoặc tất cả; current-device marker và optimistic rollback.

**Phase DoD:** toàn bộ Identity browser API `VERIFIED`; auth E2E gồm success, invalid, expired, 401/403/429.

