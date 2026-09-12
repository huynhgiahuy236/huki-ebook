# Phase 02 — Identity & Role Routing

**Persona:** Guest, User, Admin doanh nghiệp, Admin con doanh nghiệp, Admin HUKI
**Status:** `✅ DONE` — Nối API thật hoàn tất 100%, role routing, RBAC guards, forced password change và session management.

## Sprint 05 — Guest/User identity

- [x] ✅ Register UI → API → verify account.
- [x] ✅ Login UI → session bootstrap.
- [x] ✅ Verify/resend UI → token expiry/already-used states.
- [x] ✅ Blocked/unverified và unauthorized state.

## Sprint 06 — Role routing

- [x] ✅ `USER` vào storefront/account.
- [x] ✅ `BUSINESS + OWNER` vào Admin doanh nghiệp.
- [x] ✅ `BUSINESS + member permissions` vào workspace giới hạn.
- [x] ✅ `PLATFORM_ADMIN` vào Admin HUKI.
- [x] ✅ Sai role/permission trả UI forbidden và backend `403`.

## Sprint 07 — Provisioned Admin con login

- [x] ✅ Tài khoản được Owner tạo trực tiếp, không invitation.
- [x] ✅ Đăng nhập bằng credential được cấp.
- [x] ✅ `mustChangePassword = true` ở lần đăng nhập đầu (/change-password).
- [x] ✅ Đổi mật khẩu xong mới vào workspace.
- [x] ✅ Tài khoản suspended không tạo được session mới.

## Sprint 08 — Session tối thiểu

- [x] ✅ Refresh/logout/logout-all.
- [x] ✅ Profile cơ bản.
- [x] ✅ Session expiration và 401 recovery.

## Deferred

`⚪ DEFERRED`: forgot/reset self-service, device management và session UI nâng cao. Owner reset credential cho Admin con thuộc Phase 06.

## Phase DoD

Năm persona được định tuyến đúng bằng backend thật; không thể nâng role/permission từ client; forced password change và negative RBAC test đạt.
