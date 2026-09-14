# Phase 06 — Admin Con & Granular Permissions

> Tên file cũ được giữ để không vỡ liên kết. Community không còn thuộc happy case và được chuyển sang `⚪ DEFERRED`.

**Persona:** Admin doanh nghiệp, Admin con doanh nghiệp
**Status:** `✅ DONE` — Direct Provisioning, Granular Permissions, Dynamic Sidebar & Action Enforcement, E2E Tested (100% Pass).

## Sprint 21 — Permission catalog

- [x] ✅ Chốt danh sách permission độc lập: dashboard, store, product, inventory, order, member và finance.
- [x] ✅ Owner có toàn quyền bất biến trong business.
- [x] ✅ Preset chức danh chỉ chọn sẵn permission; Owner được thêm/bớt từng quyền.
- [x] ✅ Admin con có thể nhận 1, 2, 3 hoặc toàn bộ permission.

## Sprint 22 — Owner provision tài khoản

- [x] ✅ Owner tạo tài khoản trực tiếp; không gửi invitation.
- [x] ✅ Email/username duy nhất, credential tạm an toàn.
- [x] ✅ Gắn ngay `businessId`, `createdBy`, membership active và permissions.
- [x] ✅ `mustChangePassword = true`; không gửi/log mật khẩu thô sau provisioning.
- [x] ✅ Transaction/compensation giữa Identity và Business service.

## Sprint 23 — Quản lý nhân viên

- [x] ✅ List/detail Admin con.
- [x] ✅ Cấp/thu hồi từng permission.
- [x] ✅ Suspend/reactivate và reset credential.
- [x] ✅ Owner không thể bị Admin con sửa, khóa hoặc xóa.
- [x] ✅ Audit log ai cấp quyền gì, lúc nào.

## Sprint 24 — Enforcement

- [x] ✅ Sidebar/action chỉ hiện theo permission.
- [x] ✅ API kiểm tra membership active + business scope + permission.
- [x] ✅ Negative test cho từng quyền bị thiếu trả `403`.
- [x] ✅ Thu hồi quyền có hiệu lực với session/cache theo contract.

## Permission baseline đề xuất

`DASHBOARD_VIEW`, `STORE_VIEW`, `STORE_UPDATE`, `PRODUCT_VIEW`, `PRODUCT_CREATE`, `PRODUCT_UPDATE`, `INVENTORY_UPDATE`, `ORDER_VIEW`, `ORDER_PROCESS`, `ORDER_CANCEL`, `MEMBER_VIEW`, `FINANCE_VIEW`.

## Deferred

`⚪ DEFERRED`: forum, comments, reviews, reports, book clubs, realtime chat và Community sockets.

## Phase DoD

Owner provision được Admin con không qua invitation, chọn permission tùy ý; UI và backend cùng enforcement; kiểm thử vượt quyền đạt.
