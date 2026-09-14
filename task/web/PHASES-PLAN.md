# Web Frontend — Happy-case Phases Plan

## Status tổng

| Phase | Nhóm chính | Status | Kết quả cần bàn giao |
|---|---|---|---|
| 01 | Shared foundation | ✅ DONE | Typed client, auth/session, permission contract |
| 02 | Tất cả persona | ✅ DONE | Identity và role routing bằng backend thật |
| 03 | Admin doanh nghiệp + Guest | ✅ DONE | E2E xuyên vai trò trên backend thật đạt chuẩn |
| 04 | User/Buyer | ✅ DONE | Checkout COD tạo đơn thật & fulfillment E2E |
| 05 | User/Buyer | ✅ DONE | Buyer xem đơn, timeline, profile & RBAC E2E |
| 06 | Admin con doanh nghiệp | ✅ DONE | Owner tạo tài khoản và cấp permission tùy chọn |
| 07 | Admin doanh nghiệp/Admin con | ✅ DONE | Quản lý sản phẩm và xử lý đơn theo permission |
| 08 | Admin HUKI | ✅ DONE | Approval, catalog admin và health UI |
| 09 | Tất cả persona | 🔴 TODO | E2E xuyên vai trò và release gate happy case |

`PARTIAL` chủ yếu phản ánh UI mock hoặc backend riêng lẻ; không phase nào ngoài backend runtime được coi là hoàn tất.

## Dependency thực thi

```text
P01 Foundation
 └─ P02 Identity/roles
     ├─ P03 Business supply + Guest storefront
     │   ├─ P04 Buyer COD checkout → P05 Buyer orders
     │   └─ P07 Business operations
     ├─ P06 Admin con permissions
     └─ P08 Admin HUKI approvals

P03 + P04 + P05 + P06 + P07 + P08 → P09 Cross-persona E2E
```

## Persona ownership

| Persona | Phases | Quyền cốt lõi |
|---|---|---|
| Guest | P02, P03 | Public read, register/login |
| User/Buyer | P02, P04, P05 | Cart/address/COD/order của chính mình |
| Admin doanh nghiệp | P02, P03, P06, P07 | `BUSINESS + OWNER`, toàn quyền trong business |
| Admin con doanh nghiệp | P02, P06, P07 | Tài khoản provision bởi Owner, quyền là tập con |
| Admin HUKI | P02, P03, P08 | `PLATFORM_ADMIN`, duyệt và quản trị nền tảng |

## Happy-case scope

- Identity: register, verify, login, refresh, logout, me, forced password change.
- Business: registration/status/approval, store create/approval.
- Catalog: category, book, inventory, publish, public browse/search/detail.
- Commerce: cart, address, checkout preview/confirm, COD, buyer/seller orders.
- Membership: Owner tạo tài khoản con; granular permission; suspend/reset.
- Admin: approvals, taxonomy/book administration, system health.

## Deferred

Community cũ của P06, GHTK/shipping/delivery, online payment, promotion, refund/return, chat/reviews/notifications, Reader/DRM và Wallet/reward đều không chặn happy-case milestone.

## Permission model

- Global: `USER`, `BUSINESS`, `PLATFORM_ADMIN`.
- `OWNER` luôn có toàn quyền trong business.
- Admin con nhận từ 1 đến toàn bộ permission; preset chức danh chỉ là gợi ý.
- Frontend dùng permission để hiển thị/khóa UI; backend quyết định cuối cùng.
- Mọi mutation kiểm tra `businessId`, membership active và permission.

## Release gate

Happy case chỉ `DONE` khi năm persona chạy xuyên suốt bằng backend thật, Admin con bị từ chối đúng với quyền không được cấp, COD tạo đơn idempotent và các quality gate đạt. Hạng mục `DEFERRED` không chặn milestone.
