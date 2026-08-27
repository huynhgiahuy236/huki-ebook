# HUKI EBOOK Web Frontend Roadmap

Mã nguồn backend trong `platform/apps/*/src/**/*controller.ts` là nguồn chuẩn cao nhất. Inventory, OpenAPI và tài liệu nghiệp vụ là nguồn đối chiếu. Mục tiêu cuối cùng là **100% API coverage có chủ đích**, không chỉ đủ màn hình.

## Điều kiện hoàn thành

- Mọi HTTP endpoint và WebSocket event đều có trong coverage snapshot.
- API dành cho browser có màn hình/workflow, loading/empty/error/permission và test.
- Webhook, callback, health và service-to-service không bị gọi trực tiếp từ browser; chúng có integration/contract test và trạng thái `SYSTEM_TESTED`.
- Không còn `UNMAPPED`, `PLANNED` hoặc `IMPLEMENTED` chưa được xác minh.
- Mỗi Sprint chỉ đóng sau khi cập nhật matrix và test evidence.

## Roadmap

| Phase | Nội dung | Sprint | File |
|---|---|---:|---|
| 01 | Discovery, API contracts, foundation | 01-04 | `01-PHASE1-DISCOVERY-FOUNDATION.md` |
| 02 | Identity, profile, sessions | 05-08 | `02-PHASE2-IDENTITY.md` |
| 03 | Storefront, catalog, discovery | 09-12 | `03-PHASE3-STOREFRONT-CATALOG.md` |
| 04 | Cart, checkout, payment, shipping | 13-16 | `04-PHASE4-CHECKOUT-FULFILLMENT.md` |
| 05 | Buyer account, orders, notifications | 17-20 | `05-PHASE5-BUYER-ACCOUNT.md` |
| 06 | Community, reviews, chat | 21-24 | `06-PHASE6-COMMUNITY.md` |
| 07 | Business and seller workspace | 25-28 | `07-PHASE7-SELLER-BUSINESS.md` |
| 08 | Admin and operations | 29-32 | `08-PHASE8-ADMIN-OPERATIONS.md` |
| 09 | Coverage closure, quality, launch | 33-36 | `09-PHASE9-COVERAGE-LAUNCH.md` |

Tổng cộng: **9 Phase, 36 Sprint**.

## Nguồn chuẩn theo thứ tự

1. Controller, gateway, DTO và guard trong `platform/apps`.
2. `api/API-INVENTORY.md` (baseline hiện ghi 211 HTTP endpoint + 10 WebSocket events).
3. `res/openapi/huki-ebook-openapi.yaml` (hiện chưa phản ánh đủ controller).
4. Luồng trong `flow/`, lỗi trong `err/`, response contract trong `res/`.

Trạng thái coverage: `UNMAPPED` → `PLANNED` → `IMPLEMENTED` → `VERIFIED`; hoặc `SYSTEM_TESTED` cho API không dành cho browser. `N/A-APPROVED` chỉ hợp lệ khi có lý do và người duyệt.
