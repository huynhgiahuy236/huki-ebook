# Phase 02 — Identity & Role Routing

**Persona:** Guest, User, Admin doanh nghiệp, Admin con doanh nghiệp, Admin HUKI
**Status:** `🟡 PARTIAL` — UI auth đã có; frontend chưa nối API thật.

## Sprint 05 — Guest/User identity

- [ ] 🟡 Register UI → API → verify account.
- [ ] 🟡 Login UI → session bootstrap.
- [ ] 🟡 Verify/resend UI → token expiry/already-used states.
- [ ] 🔴 Blocked/unverified và unauthorized state.

## Sprint 06 — Role routing

- [ ] 🔴 `USER` vào storefront/account.
- [ ] 🔴 `BUSINESS + OWNER` vào Admin doanh nghiệp.
- [ ] 🔴 `BUSINESS + member permissions` vào workspace giới hạn.
- [ ] 🔴 `PLATFORM_ADMIN` vào Admin HUKI.
- [ ] 🔴 Sai role/permission trả UI forbidden và backend `403`.

## Sprint 07 — Provisioned Admin con login

- [ ] 🔴 Tài khoản được Owner tạo trực tiếp, không invitation.
- [ ] 🔴 Đăng nhập bằng credential được cấp.
- [ ] 🔴 `mustChangePassword = true` ở lần đăng nhập đầu.
- [ ] 🔴 Đổi mật khẩu xong mới vào workspace.
- [ ] 🔴 Tài khoản suspended không tạo được session mới.

## Sprint 08 — Session tối thiểu

- [ ] 🔴 Refresh/logout/logout-all.
- [ ] 🟡 Profile cơ bản.
- [ ] 🔴 Session expiration và 401 recovery.

## Deferred

`⚪ DEFERRED`: forgot/reset self-service, device management và session UI nâng cao. Owner reset credential cho Admin con thuộc Phase 06.

## Phase DoD

Năm persona được định tuyến đúng bằng backend thật; không thể nâng role/permission từ client; forced password change và negative RBAC test đạt.
