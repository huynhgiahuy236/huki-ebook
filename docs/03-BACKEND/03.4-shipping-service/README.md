# Shipping Service

**Port:** `3004` — **Database:** PostgreSQL `shipping_db` — **ORM:** Prisma

Sprint 10 hoàn thành ngày 2026-08-21. Service chịu trách nhiệm báo phí, tạo/theo dõi shipment, sổ địa chỉ, delivery staff và callback GHTK mock.

## Modules

| Module | Trách nhiệm |
|---|---|
| `shipping` | Carrier interface và GHTK mock |
| `shipments` | Tạo, tracking, state machine, callback, cancel |
| `delivery-staff` | Quản lý và phân công nhân viên |
| `addresses` | Address CRUD theo chủ sở hữu |
| `prisma` | Truy cập `shipping_db` |
| `events` | Consume order events và publish shipping outbox qua RabbitMQ |

## Order-to-shipment flow

1. Commerce lưu `ORDER_CREATED` với shipping address và seller orders.
2. Shipping consume event qua queue `shipping-service.order-events`; internal endpoint vẫn được giữ cho vận hành/đối soát.
3. Shipping bỏ qua đơn chỉ có ebook, tạo một shipment mỗi `sellerOrderId` và trả lại bản ghi cũ khi event lặp.
4. GHTK mock tính phí, sinh tracking ổn định và ngày giao dự kiến.
5. Shipment, timeline đầu tiên và `shipment.created` được ghi trong một Prisma transaction.

## Lifecycle

```text
PENDING -> PICKED_UP -> IN_TRANSIT -> OUT_FOR_DELIVERY -> DELIVERED
   |           |             |                |
   +-----------+-------------+----------------+-> FAILED
                                                   |-> OUT_FOR_DELIVERY (retry)
                                                   \-> RETURNED

PENDING/PICKED_UP/FAILED -> CANCELLED
```

`DELIVERED`, `RETURNED`, `CANCELLED` là terminal. Transition sai trả `409`.

## Security

- Buyer xem shipment theo `userId`; business theo `ownerUserId`; admin xem toàn bộ.
- Chỉ platform admin hoặc delivery staff được phân công được cập nhật trạng thái.
- Internal API dùng `SHIPPING_INTERNAL_API_KEY`.
- Callback ký HMAC-SHA256 bằng `SHIPPING_WEBHOOK_SECRET`; `externalEventId` chống xử lý trùng.

Canonical callback string:

```text
eventId|trackingNumber|status|occurredAt|location|note
```

## GHTK mock fee

```text
shippingFee = baseFee
            + ceil(max(weight - 500, 0) / 500) * extra500gFee
            + interProvinceFee (nếu khác tỉnh lấy hàng)
codFee      = codAmount * codRate
```

Adapter sử dụng interface nên có thể thay bằng GHTK thật mà không sửa shipment business logic.

## API summary

Tất cả route có prefix `/api/v1`.

| Method | Endpoint | Quyền |
|---|---|---|
| GET | `/shipping/fee` | Public |
| GET/POST | `/shipping/address` | Authenticated |
| PATCH/DELETE | `/shipping/address/:id` | Owner |
| GET | `/shipments`, `/shipments/:id` | Scoped auth |
| GET | `/shipments/tracking/:trackingNumber` | Scoped auth |
| PATCH | `/shipments/:id/status` | Admin/assigned staff |
| POST | `/shipments/:id/assign` | Admin |
| POST/GET/PATCH | `/delivery-staff...` | Admin |
| POST | `/internal/shipments/from-order` | Internal key |
| POST | `/internal/shipments/:sellerOrderId/cancel` | Internal key |
| POST | `/callbacks/ghtk` | Signed callback |

Chi tiết tại [Shipping API](../../04-API-REFERENCE/endpoints/shipping.md).

## Environment

```env
SHIPPING_SERVICE_PORT=3004
SHIPPING_DATABASE_URL=postgresql://postgres:password@localhost:5432/shipping_db?schema=public
JWT_SECRET=shared-jwt-secret
SHIPPING_INTERNAL_API_KEY=long-random-key
SHIPPING_WEBHOOK_SECRET=long-random-secret
GHTK_PICKUP_PROVINCE=Hồ Chí Minh
GHTK_PICKUP_DISTRICT=Quận 1
GHTK_MOCK_BASE_FEE=15000
GHTK_MOCK_EXTRA_500G_FEE=5000
GHTK_MOCK_INTER_PROVINCE_FEE=10000
GHTK_MOCK_COD_RATE=0.005
```

RabbitMQ dùng topic exchange `huki.events`. Publisher retry 3 lần; consumer chống lặp bằng `inbox_events` và message lỗi sau 3 lần vào `shipping-service.order-events.dlq`.
