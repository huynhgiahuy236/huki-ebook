# 📦 Orders API

## Implemented status model

- Order: `PENDING_PAYMENT`, `PROCESSING`, `PARTIALLY_CANCELLED`, `SHIPPING`, `COMPLETED`, `CANCELLED`.
- Seller order: `PENDING_PAYMENT`, `PENDING_CONFIRMATION`, `CONFIRMED`, `PREPARING`, `SHIPPED`, `DELIVERED`, `COMPLETED`, `CANCELLED`.
- COD starts in `PROCESSING`; online checkout remains `PENDING_PAYMENT` for the payment phase.
- Physical stock is reserved at checkout confirm, committed at shipment, and released by eligible cancellation.
- State changes append immutable timeline entries and pending outbox events.

Buyer APIs require order ownership. Seller APIs require `BUSINESS` or
`PLATFORM_ADMIN`; business accounts only access their own seller orders.

## GET /orders

Get list of user's orders.

### Request

```http
GET /api/v1/orders?page=1&limit=20&status=PAID
Authorization: Bearer <access_token>
```

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| page | integer | Page number |
| limit | integer | Items per page |
| status | string | Filter by order status |

### Response 200

```json
{
  "data": [
    {
      "id": "order-uuid",
      "orderCode": "HUK202608140001",
      "grandTotal": 613100,
      "paymentMethod": "ONLINE_PAYMENT",
      "paymentStatus": "PAID",
      "orderStatus": "CONFIRMED",
      "itemCount": 3,
      "createdAt": "2026-08-14T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "totalPages": 1
  }
}
```

---

## GET /orders/:id

Get order details.

### Request

```http
GET /api/v1/orders/order-uuid
Authorization: Bearer <access_token>
```

### Response 200

```json
{
  "data": {
    "id": "order-uuid",
    "orderCode": "HUK202608140001",
    "user": {
      "id": "user-uuid",
      "fullName": "Nguyen Van A",
      "email": "user@example.com"
    },
    "subtotal": 649000,
    "discountTotal": 64900,
    "shippingTotal": 30000,
    "grandTotal": 613100,
    "paymentMethod": "ONLINE_PAYMENT",
    "paymentStatus": "PAID",
    "orderStatus": "CONFIRMED",
    "shippingAddress": {
      "receiverName": "Nguyen Van A",
      "phone": "0912345678",
      "addressLine": "123 Nguyen Hue",
      "ward": "Ben Nghe",
      "district": "District 1",
      "province": "Ho Chi Minh City"
    },
    "sellerOrders": [
      {
        "id": "so-uuid",
        "sellerOrderCode": "SO-HUK-20260814-001",
        "store": {
          "id": "store-uuid",
          "name": "Tech Books Store"
        },
        "itemsSubtotal": 649000,
        "discountAmount": 64900,
        "shippingFee": 30000,
        "totalAmount": 613100,
        "fulfillmentStatus": "PENDING",
        "items": [
          {
            "id": "item-uuid",
            "book": {
              "id": "book-uuid",
              "title": "Clean Code",
              "coverUrl": "https://example.com/cover.jpg"
            },
            "format": "PHYSICAL",
            "unitPrice": 250000,
            "quantity": 2,
            "subtotal": 500000
          },
          {
            "id": "item-uuid-2",
            "book": {
              "id": "book-uuid-2",
              "title": "Clean Architecture"
            },
            "format": "DIGITAL",
            "unitPrice": 149000,
            "quantity": 1,
            "subtotal": 149000
          }
        ]
      }
    ],
    "voucher": {
      "code": "HUKI10",
      "discountType": "PERCENT",
      "discountAmount": 64900
    },
    "payment": {
      "id": "payment-uuid",
      "provider": "VNPAY",
      "transactionId": "vnp-123456",
      "paidAt": "2026-08-14T10:05:00.000Z"
    },
    "createdAt": "2026-08-14T10:00:00.000Z",
    "updatedAt": "2026-08-14T10:05:00.000Z"
  }
}
```

---

## POST /orders/:id/cancel

Cancel an order.

### Request

```http
POST /api/v1/orders/order-uuid/cancel
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "reason": "Changed my mind"
}
```

### Response 200

```json
{
  "message": "Order cancelled successfully",
  "data": {
    "id": "order-uuid",
    "orderStatus": "CANCELLED",
    "paymentStatus": "REFUND_PENDING",
    "cancelledAt": "2026-08-14T11:00:00.000Z"
  }
}
```

### Response 400

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Cannot cancel order in PAID status",
  "code": "ORDER_CANNOT_CANCEL"
}
```

---

## GET /orders/:id/tracking

Get order tracking information.

### Request

```http
GET /api/v1/orders/order-uuid/tracking
Authorization: Bearer <access_token>
```

### Response 200

```json
{
  "data": {
    "orderId": "order-uuid",
    "orderCode": "HUK202608140001",
    "timeline": [
      {
        "status": "CREATED",
        "title": "Đơn hàng đã được tạo",
        "description": "Đơn hàng đang chờ thanh toán",
        "timestamp": "2026-08-14T10:00:00.000Z",
        "completed": true
      },
      {
        "status": "PAID",
        "title": "Đã thanh toán",
        "description": "Thanh toán thành công qua VNPay",
        "timestamp": "2026-08-14T10:05:00.000Z",
        "completed": true
      },
      {
        "status": "CONFIRMED",
        "title": "Đã xác nhận",
        "description": "Đơn hàng đang được chuẩn bị",
        "timestamp": "2026-08-14T12:00:00.000Z",
        "completed": true
      },
      {
        "status": "SHIPPING",
        "title": "Đang giao hàng",
        "description": "Dự kiến giao: 16/08/2026",
        "timestamp": "2026-08-15T08:00:00.000Z",
        "completed": false
      },
      {
        "status": "DELIVERED",
        "title": "Đã giao hàng",
        "description": null,
        "timestamp": null,
        "completed": false
      }
    ],
    "shipments": [
      {
        "shipmentId": "shipment-uuid",
        "trackingCode": "SHIP-123456",
        "carrier": "GHTK",
        "status": "IN_TRANSIT",
        "estimatedDelivery": "2026-08-16",
        "items": [
          {
            "bookTitle": "Clean Code",
            "quantity": 2
          }
        ]
      }
    ]
  }
}
```

---

## SELLER ENDPOINTS

## GET /seller/orders

Get list of seller's orders.

### Request

```http
GET /api/v1/seller/orders?page=1&limit=20&status=PENDING
Authorization: Bearer <access_token> (Business role)
```

### Response 200

```json
{
  "data": [
    {
      "id": "so-uuid",
      "sellerOrderCode": "SO-HUK-20260814-001",
      "order": {
        "orderCode": "HUK202608140001",
        "createdAt": "2026-08-14T10:00:00.000Z"
      },
      "customer": {
        "id": "user-uuid",
        "fullName": "Nguyen Van A"
      },
      "itemsSubtotal": 649000,
      "shippingFee": 30000,
      "totalAmount": 679000,
      "fulfillmentStatus": "PENDING",
      "createdAt": "2026-08-14T10:00:00.000Z"
    }
  ],
  "pagination": {...}
}
```

---

## GET /seller/orders/:id

Get seller order details.

### Request

```http
GET /api/v1/seller/orders/so-uuid
Authorization: Bearer <access_token> (Business role)
```

---

## PATCH /seller/orders/:id/confirm

Confirm seller order.

### Request

```http
PATCH /api/v1/seller/orders/so-uuid/confirm
Authorization: Bearer <access_token> (Business role)
```

### Response 200

```json
{
  "message": "Order confirmed",
  "data": {
    "id": "so-uuid",
    "fulfillmentStatus": "CONFIRMED"
  }
}
```

---

## PATCH /seller/orders/:id/prepare

Mark order as being prepared.

### Request

```http
PATCH /api/v1/seller/orders/so-uuid/prepare
Authorization: Bearer <access_token> (Business role)
```

---

## PATCH /seller/orders/:id/ship

Mark order as shipped.

### Request

```http
PATCH /api/v1/seller/orders/so-uuid/ship
Authorization: Bearer <access_token> (Business role)
Content-Type: application/json

{
  "carrier": "GHTK",
  "trackingCode": "GHTK123456",
  "pickupAddress": "123 Store Address"
}
```

---

## PATCH /seller/orders/:id/deliver

Mark order as delivered.

### Request

```http
PATCH /api/v1/seller/orders/so-uuid/deliver
Authorization: Bearer <access_token> (Business role)
```

---

## PATCH /seller/orders/:id/cancel

Cancel seller order.

### Request

```http
PATCH /api/v1/seller/orders/so-uuid/cancel
Authorization: Bearer <access_token> (Business role)
Content-Type: application/json

{
  "reason": "Out of stock"
}
```

### Response 200

```json
{
  "message": "Order cancelled",
  "data": {
    "id": "so-uuid",
    "fulfillmentStatus": "CANCELLED",
    "cancellation": {
      "reason": "Out of stock",
      "cancelledAt": "2026-08-14T11:00:00.000Z",
      "refundAmount": 679000
    }
  }
}
```
