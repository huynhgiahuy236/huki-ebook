# Shipping Database (`shipping_db`)

**Engine:** PostgreSQL — **ORM:** Prisma 5

Schema chuẩn nằm tại `platform/apps/shipping-service/prisma/schema.prisma`.

## Tables

| Table | Purpose |
|---|---|
| `shipments` | Aggregate và trạng thái vận chuyển hiện tại |
| `addresses` | Sổ địa chỉ buyer |
| `delivery_staff` | Hồ sơ/availability nhân viên |
| `delivery_logs` | Timeline và callback idempotency |
| `outbox_events` | Event atomically chờ Sprint 11 publish |

## Shipments

- `seller_order_id` unique: khóa idempotency, một shipment mỗi seller order.
- `order_id`, `user_id`, `store_id`, `owner_user_id`: snapshot cross-service, không tạo FK xuyên database.
- `shipping_fee`, `cod_amount`, `cod_fee`: `DECIMAL(14,2)`.
- `weight`: integer gram.
- `assigned_staff_id`: nullable FK, `SET NULL` khi xóa staff.
- Status: `PENDING`, `PICKED_UP`, `IN_TRANSIT`, `OUT_FOR_DELIVERY`, `DELIVERED`, `RETURNED`, `CANCELLED`, `FAILED`.

## Delivery logs

Mỗi log thuộc một shipment; staff là optional. `source` gồm `SYSTEM`, `ADMIN`, `STAFF`, `CARRIER`. `external_event_id` unique chống callback trùng. Xóa shipment cascade timeline.

## Outbox

Outbox lưu `event_id`, `type`, aggregate, JSON payload, attempts và trạng thái `PENDING/PROCESSING/COMPLETED/FAILED`. Shipment update và outbox event nằm trong cùng Prisma transaction.

## Relationships

```text
delivery_staff 1 ---- N shipments
delivery_staff 1 ---- N delivery_logs
shipments      1 ---- N delivery_logs
```

## Commands

```bash
cd platform
npm run prisma:generate:shipping
npx prisma migrate deploy --schema apps/shipping-service/prisma/schema.prisma
```
