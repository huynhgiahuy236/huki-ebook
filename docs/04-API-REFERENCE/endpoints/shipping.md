# Shipping API

Base URL trực tiếp: `http://localhost:3004/api/v1`. Endpoint protected dùng `Authorization: Bearer <token>`.

## Fee

```http
GET /api/v1/shipping/fee?province=Hồ%20Chí%20Minh&district=Quận%201&weight=750
```

`weight` là integer gram, từ `1` đến `50000`.

```json
{
  "carrier": "GHTK", "service": "STANDARD",
  "shippingFee": 20000, "codFee": 0, "totalFee": 20000,
  "estimatedDays": { "min": 1, "max": 2 }
}
```

## Address book

```http
GET    /api/v1/shipping/address
POST   /api/v1/shipping/address
PATCH  /api/v1/shipping/address/:id
DELETE /api/v1/shipping/address/:id
```

Body tạo/cập nhật:

```json
{
  "name": "Nguyễn Văn A", "phone": "0901234567", "address": "123 Nguyễn Huệ",
  "province": "Hồ Chí Minh", "district": "Quận 1", "ward": "Bến Nghé", "isDefault": true
}
```

Address đầu tiên tự thành mặc định; chỉ owner được sửa/xóa.

## Tracking

```http
GET /api/v1/shipments?status=IN_TRANSIT&page=1&limit=20
GET /api/v1/shipments/:id
GET /api/v1/shipments/tracking/:trackingNumber
```

Detail chứa `assignedStaff` và `logs` theo thời gian. Buyer/business/admin chỉ nhận đúng phạm vi dữ liệu.

## Staff and status

```http
POST  /api/v1/delivery-staff
GET   /api/v1/delivery-staff?status=ACTIVE
PATCH /api/v1/delivery-staff/:id
POST  /api/v1/shipments/:id/assign
PATCH /api/v1/shipments/:id/status
```

Các API quản lý/phân công chỉ dành cho platform admin. Status update dành cho admin hoặc assigned staff:

```json
{ "status": "OUT_FOR_DELIVERY", "location": "Quận 1", "note": "Đang giao" }
```

## Internal order integration

```http
POST /api/v1/internal/shipments/from-order
x-internal-api-key: <SHIPPING_INTERNAL_API_KEY>
```

```json
{
  "orderId": "order-uuid", "userId": "buyer-uuid",
  "paymentMethod": "COD", "paymentStatus": "PENDING",
  "shippingAddress": {
    "receiverName": "Nguyễn Văn A", "receiverPhone": "0901234567", "address": "123 Nguyễn Huệ",
    "province": "Hồ Chí Minh", "district": "Quận 1", "ward": "Bến Nghé"
  },
  "sellerOrders": [{
    "sellerOrderId": "seller-order-uuid", "storeId": "store-uuid", "ownerUserId": "owner-uuid",
    "requiresShipping": true, "weight": 750, "codAmount": 200000
  }]
}
```

Idempotent theo `sellerOrderId`. Hủy từ Commerce:

```http
POST /api/v1/internal/shipments/:sellerOrderId/cancel
{ "reason": "Order cancelled" }
```

## GHTK callback

```http
POST /api/v1/callbacks/ghtk
```

```json
{
  "eventId": "ghtk-event-123", "trackingNumber": "GHTK67A7B2151DF3", "status": "IN_TRANSIT",
  "occurredAt": "2026-08-21T08:00:00.000Z", "location": "Kho TP.HCM",
  "note": "Package departed", "signature": "hex-hmac-sha256"
}
```

Signature là HMAC-SHA256 của `eventId|trackingNumber|status|occurredAt|location|note`; callback idempotent theo `eventId`.
