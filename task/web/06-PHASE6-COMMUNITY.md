# Phase 06 — Admin Con & Granular Permissions

> Tên file cũ được giữ để không vỡ liên kết. Community không còn thuộc happy case và được chuyển sang `⚪ DEFERRED`.

**Persona:** Admin doanh nghiệp, Admin con doanh nghiệp
**Status:** `🔴 TODO` — backend hiện có invitation/member roles nhưng chưa đúng flow provision trực tiếp.

## Sprint 21 — Permission catalog

- [ ] 🔴 Chốt danh sách permission độc lập: dashboard, store, product, inventory, order, member và finance.
- [ ] 🔴 Owner có toàn quyền bất biến trong business.
- [ ] 🔴 Preset chức danh chỉ chọn sẵn permission; Owner được thêm/bớt từng quyền.
- [ ] 🔴 Admin con có thể nhận 1, 2, 3 hoặc toàn bộ permission.

## Sprint 22 — Owner provision tài khoản

- [ ] 🔴 Owner tạo tài khoản trực tiếp; không gửi invitation.
- [ ] 🔴 Email/username duy nhất, credential tạm an toàn.
- [ ] 🔴 Gắn ngay `businessId`, `createdBy`, membership active và permissions.
- [ ] 🔴 `mustChangePassword = true`; không gửi/log mật khẩu thô sau provisioning.
- [ ] 🔴 Transaction/compensation giữa Identity và Business service.

## Sprint 23 — Quản lý nhân viên

- [ ] 🔴 List/detail Admin con.
- [ ] 🔴 Cấp/thu hồi từng permission.
- [ ] 🔴 Suspend/reactivate và reset credential.
- [ ] 🔴 Owner không thể bị Admin con sửa, khóa hoặc xóa.
- [ ] 🔴 Audit log ai cấp quyền gì, lúc nào.

## Sprint 24 — Enforcement

- [ ] 🔴 Sidebar/action chỉ hiện theo permission.
- [ ] 🔴 API kiểm tra membership active + business scope + permission.
- [ ] 🔴 Negative test cho từng quyền bị thiếu trả `403`.
- [ ] 🔴 Thu hồi quyền có hiệu lực với session/cache theo contract.

## Permission baseline đề xuất

`DASHBOARD_VIEW`, `STORE_VIEW`, `STORE_UPDATE`, `PRODUCT_VIEW`, `PRODUCT_CREATE`, `PRODUCT_UPDATE`, `INVENTORY_UPDATE`, `ORDER_VIEW`, `ORDER_PROCESS`, `ORDER_CANCEL`, `MEMBER_VIEW`, `FINANCE_VIEW`.

## Deferred

`⚪ DEFERRED`: forum, comments, reviews, reports, book clubs, realtime chat và Community sockets.

## Phase DoD

Owner provision được Admin con không qua invitation, chọn permission tùy ý; UI và backend cùng enforcement; kiểm thử vượt quyền đạt.
