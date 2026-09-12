# API Coverage Matrix — Happy Case

## Baseline 2026-09-09

| Chỉ số | Kết quả |
|---|---:|
| Gateway + microservice health | ✅ 7/7 |
| Backend HTTP handlers | 211 |
| WebSocket inbound handlers | 10 |
| Backend unit tests | ✅ 209/209 |
| Frontend API calls | 🔴 0 |
| Browser API family verified | 🔴 0 |

## Role và scope

| Persona | Global role | Business scope | Quy tắc |
|---|---|---|---|
| Guest | none | none | Public read only |
| User/Buyer | `USER` | none | Chỉ dữ liệu account/cart/order của mình |
| Admin doanh nghiệp | `BUSINESS` | `OWNER` | Toàn quyền trong business; không có quyền platform |
| Admin con | `BUSINESS` | active membership + `permissions[]` | Chỉ business và permission được cấp |
| Admin HUKI | `PLATFORM_ADMIN` | platform | Approval/catalog/health |

## Happy-case API families

| API family | Persona | Phase | Status | Permission/test bắt buộc |
|---|---|---|---|---|
| Identity register/verify/resend | Guest | P02 | 🟡 PARTIAL | Auth E2E |
| Login/me/refresh/logout | All signed-in | P01-P02 | ✅ DONE | Session E2E |
| Provision Admin con | Owner | P06 | 🔴 TODO | Owner-only; không invitation |
| Forced password change | Admin con | P02/P06 | 🔴 TODO | One-time credential test |
| Member list/detail/suspend/reset | Owner | P06 | 🔴 TODO | Tenant isolation |
| Granular permission update | Owner | P06 | 🔴 TODO | Grant/revoke + audit |
| Business register/my/status | Owner candidate | P03/P07 | 🟡 PARTIAL | Ownership E2E |
| Business approve/reject | Admin HUKI | P08 | 🔴 TODO | `PLATFORM_ADMIN` |
| Store public/my/create/update | Guest/Owner | P03/P07 | 🟡 PARTIAL | `STORE_VIEW/STORE_UPDATE` |
| Store approve/reject | Admin HUKI | P08 | 🔴 TODO | `PLATFORM_ADMIN` |
| Books public CRUD/inventory/publish | Guest/Business | P03/P07 | 🟡 PARTIAL | `PRODUCT_*`, `INVENTORY_UPDATE` |
| Category/search | Guest/Admin HUKI | P03/P08 | 🔴 TODO | Public read/admin mutation |
| Cart | Buyer | P04 | 🟡 PARTIAL | User ownership |
| Address CRUD | Buyer | P04/P05 | 🟡 PARTIAL | User ownership |
| Checkout preview/confirm COD | Buyer | P04 | 🔴 TODO | Idempotency/inventory |
| Buyer orders/detail/history | Buyer | P05 | 🟡 PARTIAL | User ownership |
| Seller orders/transitions | Owner/Admin con | P07 | 🟡 PARTIAL | `ORDER_VIEW/PROCESS/CANCEL` |
| Catalog administration | Admin HUKI | P08 | 🔴 TODO | `PLATFORM_ADMIN` |
| Gateway health/services | Admin HUKI | P08 | 🔴 TODO | Sanitized ops response |

## Permission catalog cần chốt

| Permission | Cho phép |
|---|---|
| `DASHBOARD_VIEW` | Xem dashboard doanh nghiệp |
| `STORE_VIEW` | Xem store trong business |
| `STORE_UPDATE` | Sửa store |
| `PRODUCT_VIEW` | Xem sản phẩm |
| `PRODUCT_CREATE` | Tạo sản phẩm |
| `PRODUCT_UPDATE` | Sửa/publish/hide sản phẩm theo contract |
| `INVENTORY_UPDATE` | Sửa tồn kho |
| `ORDER_VIEW` | Xem order của business |
| `ORDER_PROCESS` | Confirm/prepare/complete |
| `ORDER_CANCEL` | Cancel order |
| `MEMBER_VIEW` | Xem danh sách nhân viên |
| `FINANCE_VIEW` | Xem số liệu tài chính được phép |

Preset chức danh chỉ chọn sẵn permission. Backend luôn dùng `permissions[]` thực tế và `businessId`, không chỉ tin tên role.

## Deferred API families

| Family | Status | Lý do |
|---|---|---|
| Forum/comments/reviews/reports/chat/socket | ⚪ DEFERRED | Không chặn mua COD |
| Notifications/device token/socket | ⚪ DEFERRED | Không chặn order query |
| GHTK callback, shipment, tracking, assign | ⚪ DEFERRED | Bỏ hãng vận chuyển hiện tại |
| Delivery staff | ⚪ DEFERRED | Phụ thuộc shipping operations |
| PayOS/VNPay/MoMo/webhook | ⚪ DEFERRED | COD-only |
| Voucher/banner/flash sale/internal promotion | ⚪ DEFERRED | Promotion ngoài happy case |
| Refund/settle/return | ⚪ DEFERRED | Không thuộc happy path |
| Reader/DRM/device | ⚪ DEFERRED | Không chặn commerce |

## Closure rule

Một dòng chỉ thành `✅ DONE` khi có client function, request/response type, auth/permission, UX error mapping và test ID chạy với backend thật. `DEFERRED` được loại khỏi happy-case denominator nhưng vẫn phải giữ classification để browser không gọi nhầm system API.
