# API Coverage Matrix

## Baseline

`api/API-INVENTORY.md` công bố 211 HTTP endpoint và 10 WebSocket inbound events, trong khi OpenAPI legacy chưa phản ánh đầy đủ controller. Sprint 01 phải tạo snapshot máy đọc được và một dòng cho **từng method + path/event**. Bảng này xác định ownership theo route family; snapshot chi tiết mới là bằng chứng closure.

Trạng thái: `UNMAPPED`, `PLANNED`, `IMPLEMENTED`, `VERIFIED`, `SYSTEM_TESTED`, `N/A-APPROVED`.

| Service / route family | Consumer | Phase/Sprint | Verification |
|---|---|---|---|
| Gateway `/health`, `/ping`, `/health/services` | Ops/Admin | P08 S32, P09 S35 | ops E2E + probe |
| Identity `/health*` | Deployment | P09 S35 | probe/contract |
| Identity register/verify/resend | Guest | P02 S05 | auth E2E |
| Identity login/logout/logout-all/refresh/me | User | P02 S06 | auth/session E2E |
| Identity forgot/reset/change password | User | P02 S07 | recovery E2E |
| Identity profile and `/sessions*` | User | P02 S08 | account E2E |
| Business `/health*` | Deployment | P09 S35 | probe/contract |
| `/businesses*` including approve/reject | Seller/Admin | P07 S25, P08 S29 | RBAC E2E |
| `/stores*` including slug/my/approve/reject | Public/Seller/Admin | P03 S11, P07 S26, P08 S29 | storefront/RBAC E2E |
| Business members, invitation accept, leave | Member | P07 S27 | membership E2E |
| Commerce `/health*` | Deployment | P09 S35 | probe/contract |
| Books CRUD + publish/hide/archive/suspend | Public/Seller/Admin | P03 S10, P07 S28, P08 S30 | catalog/RBAC E2E |
| Book physical/digital/inventory/cover/file/preview | Seller | P07 S28 | upload/product E2E |
| Categories/authors/publishers | Public/Admin | P03 S09, P08 S30 | catalog-admin E2E |
| `/catalog/search` | Public | P03 S12 | search E2E |
| `/cart*` and checkout preview/confirm | Buyer | P04 S13-S14 | cart/checkout E2E |
| Buyer orders including tracking/history/cancel | Buyer | P05 S17 | order E2E |
| `/seller/orders*` all transitions | Seller | P07 S26 | state-machine E2E |
| Payment initiate/status/refund/settle | Buyer/Admin | P04 S15, P08 S31 | payment/refund E2E |
| PayOS webhook | PayOS/backend | P04 S15, P09 S34 | signed integration test |
| Shipping `/health*` | Deployment | P09 S35 | probe/contract |
| Shipping fee and address CRUD | Buyer | P04 S14 | checkout E2E |
| Shipments list/detail/tracking/status/assign | Buyer/Seller/Delivery | P05 S18, P08 S32 | shipment E2E |
| Delivery staff CRUD | Delivery/Admin | P08 S32 | RBAC E2E |
| Internal shipment create/cancel | Commerce service | P09 S34 | service integration |
| GHTK callback | GHTK/backend | P09 S34 | signed integration test |
| Community `/health*` | Deployment | P09 S35 | probe/contract |
| Forum posts/comments/categories | User | P06 S21 | forum E2E |
| Book/store reviews and review actions/reports | User/Seller | P06 S22 | review E2E |
| Chat conversations + socket events | User/Seller | P06 S23 | REST/socket E2E |
| Notifications/settings/device + socket events | User | P05 S19 | REST/socket E2E |
| Admin moderation | Admin | P08 S29 | moderation E2E |
| Promotion `/health*` | Deployment | P09 S35 | probe/contract |
| Vouchers | Buyer/Seller/Admin | P04 S14, P07 S28, P08 S31 | voucher E2E |
| Banners | Public/Seller/Admin | P03 S09, P07 S28, P08 S31 | campaign E2E |
| Flash sales/items/price/stock/status | Public/Seller/Admin | P03 S09, P07 S28, P08 S31 | campaign E2E |
| Internal voucher/apply/flash-price | Commerce service | P09 S34 | service integration |

## Cột bắt buộc trong snapshot chi tiết

`service`, `method`, `path`, `controller`, `auth`, `roles`, `consumer`, `screen_or_flow`, `phase`, `sprint`, `client_function`, `test_id`, `status`, `exception_reason`, `last_verified_commit`.

## Công thức closure

```text
total_discovered = verified_browser + system_tested + n/a_approved
unmapped = 0
planned = 0
implemented_not_verified = 0
```

Số liệu phải được sinh trong CI, không nhập tay từ README.
