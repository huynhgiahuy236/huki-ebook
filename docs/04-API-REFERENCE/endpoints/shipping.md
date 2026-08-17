# 🚚 Shipping API

## GET /shipping/fee

Calculate shipping fee.

### Request

```http
GET /api/v1/shipping/fee?province=Ho+Chi+Minh+City&weight=500
Authorization: Bearer <access_token>
```

### Query Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| province | string | Yes | Province/City name |
| district | string | No | District name |
| weight | number | No | Package weight in grams (default: 0) |

### Response 200

```json
{
  "data": {
    "provinces": [
      {
        "id": "HN",
        "name": "Ho Chi Minh City",
        "districts": [
          { "id": "Q1", "name": "District 1" },
          { "id": "BT", "name": "Binh Thanh District" }
        ]
      }
    ]
  }
}
```

---

## POST /shipping/address

Save shipping address.

### Request

```http
POST /api/v1/shipping/address
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Nguyen Van A",
  "phone": "0912345678",
  "address": "123 Nguyen Hue, District 1",
  "province": "Ho Chi Minh City",
  "district": "District 1",
  "ward": "Ben Nghe Ward",
  "isDefault": true
}
```

### Response 201

```json
{
  "data": {
    "id": "address-uuid",
    "name": "Nguyen Van A",
    "phone": "0912345678",
    "address": "123 Nguyen Hue, District 1",
    "province": "Ho Chi Minh City",
    "district": "District 1",
    "ward": "Ben Nghe Ward",
    "isDefault": true
  }
}
```

---

## GET /shipping/address

Get user's addresses.

### Request

```http
GET /api/v1/shipping/address
Authorization: Bearer <access_token>
```

### Response 200

```json
{
  "data": [
    {
      "id": "address-uuid-1",
      "name": "Nguyen Van A",
      "phone": "0912345678",
      "address": "123 Nguyen Hue",
      "province": "Ho Chi Minh City",
      "district": "District 1",
      "ward": "Ben Nghe Ward",
      "isDefault": true
    }
  ]
}
```

---

## DELETE /shipping/address/:id

Delete address.

### Request

```http
DELETE /api/v1/shipping/address/address-uuid
Authorization: Bearer <access_token>
```

### Response 200

```json
{
  "message": "Address deleted"
}
```

---

## GET /shipments

Get user's shipments (orders being shipped).

### Request

```http
GET /api/v1/shipments
Authorization: Bearer <access_token>
```

### Response 200

```json
{
  "data": [
    {
      "id": "shipment-uuid",
      "sellerOrderId": "seller-order-uuid",
      "trackingNumber": "GHTK123456",
      "carrier": "GHTK",
      "status": "IN_TRANSIT",
      "receiverName": "Nguyen Van A",
      "receiverPhone": "0912345678",
      "address": "123 Nguyen Hue, District 1",
      "timeline": [
        {
          "status": "PICKED_UP",
          "time": "2026-08-14T10:00:00.000Z",
          "note": "Package picked up"
        },
        {
          "status": "IN_TRANSIT",
          "time": "2026-08-14T15:00:00.000Z",
          "note": "In transit to destination"
        }
      ],
      "estimatedDelivery": "2026-08-16T18:00:00.000Z"
    }
  ]
}
```

---

## GET /shipments/:id

Get shipment details.

### Request

```http
GET /api/v1/shipments/shipment-uuid
Authorization: Bearer <access_token>
```

### Response 200

```json
{
  "data": {
    "id": "shipment-uuid",
    "sellerOrderId": "seller-order-uuid",
    "orderCode": "HUK202608140001",
    "storeName": "Tech Books Store",
    "trackingNumber": "GHTK123456",
    "carrier": "GHTK",
    "status": "IN_TRANSIT",
    "receiverName": "Nguyen Van A",
    "receiverPhone": "0912345678",
    "address": "123 Nguyen Hue, District 1",
    "shippingFee": 30000,
    "codFee": 0,
    "weight": 500,
    "timeline": [
      {
        "status": "PENDING",
        "time": "2026-08-14T08:00:00.000Z",
        "note": "Order confirmed"
      },
      {
        "status": "PICKED_UP",
        "time": "2026-08-14T10:00:00.000Z",
        "note": "Package picked up"
      },
      {
        "status": "IN_TRANSIT",
        "time": "2026-08-14T15:00:00.000Z",
        "note": "In transit"
      }
    ]
  }
}
```
