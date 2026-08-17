# 🎫 Voucher API

## GET /vouchers/me

Get user's available vouchers.

### Request

```http
GET /api/v1/vouchers/me?page=1&limit=20
Authorization: Bearer <access_token>
```

### Response 200

```json
{
  "data": [
    {
      "id": "voucher-uuid",
      "code": "HUKI10",
      "name": "Giảm 10% cho đơn hàng",
      "description": "Áp dụng cho tất cả sách",
      "discountType": "PERCENT",
      "discountValue": 10,
      "maxDiscountAmount": 50000,
      "minOrderAmount": 100000,
      "usageLimit": 1000,
      "perUserLimit": 3,
      "usedCount": 450,
      "userUsageCount": 1,
      "remainingUses": 2,
      "startsAt": "2026-08-01T00:00:00.000Z",
      "endsAt": "2026-08-31T23:59:59.000Z",
      "isExpired": false,
      "isUsable": true,
      "owner": {
        "type": "PLATFORM",
        "name": "HUKI EBOOK"
      }
    }
  ],
  "pagination": {...}
}
```

---

## GET /vouchers/:code

Get voucher by code.

### Request

```http
GET /api/v1/vouchers/HUKI10
Authorization: Bearer <access_token>
```

### Response 200

```json
{
  "data": {
    "id": "voucher-uuid",
    "code": "HUKI10",
    "name": "Giảm 10% cho đơn hàng",
    "description": "Áp dụng cho tất cả sách",
    "discountType": "PERCENT",
    "discountValue": 10,
    "maxDiscountAmount": 50000,
    "minOrderAmount": 100000,
    "usageLimit": 1000,
    "perUserLimit": 3,
    "remainingUses": 2,
    "startsAt": "2026-08-01T00:00:00.000Z",
    "endsAt": "2026-08-31T23:59:59.000Z",
    "isExpired": false,
    "isUsable": true,
    "owner": {
      "type": "PLATFORM",
      "name": "HUKI EBOOK"
    },
    "applicableBooks": null,
    "applicableCategories": null
  }
}
```

### Response 404

```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Voucher not found",
  "code": "VOUCHER_NOT_FOUND"
}
```

---

## POST /vouchers/validate

Validate voucher for checkout.

### Request

```http
POST /api/v1/vouchers/validate
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "code": "HUKI10",
  "cartTotal": 649000,
  "bookIds": ["book-1", "book-2"]
}
```

### Response 200

```json
{
  "message": "Voucher is valid",
  "data": {
    "voucherId": "voucher-uuid",
    "code": "HUKI10",
    "discountType": "PERCENT",
    "discountValue": 10,
    "discountAmount": 64900,
    "appliedTo": "PLATFORM",
    "finalTotal": 584100
  }
}
```

### Response 400

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Minimum order amount not met",
  "code": "VOUCHER_MIN_ORDER_NOT_MET",
  "details": {
    "minOrderAmount": 100000,
    "cartTotal": 50000
  }
}
```

---

## BUSINESS ENDPOINTS

## GET /seller/vouchers

Get business's vouchers.

### Request

```http
GET /api/v1/seller/vouchers?page=1&limit=20
Authorization: Bearer <access_token> (Business role)
```

### Response 200

```json
{
  "data": [
    {
      "id": "voucher-uuid",
      "code": "STORE20",
      "name": "Giảm 20% cho cửa hàng",
      "discountType": "PERCENT",
      "discountValue": 20,
      "maxDiscountAmount": 100000,
      "usageLimit": 100,
      "usedCount": 25,
      "remainingUses": 75,
      "status": "ACTIVE",
      "stackingPolicy": "NOT_ALLOWED",
      "startsAt": "2026-08-01T00:00:00.000Z",
      "endsAt": "2026-08-31T23:59:59.000Z",
      "createdAt": "2026-08-01T00:00:00.000Z"
    }
  ],
  "pagination": {...}
}
```

---

## POST /seller/vouchers

Create a new voucher.

### Request

```http
POST /api/v1/seller/vouchers
Authorization: Bearer <access_token> (Business role)
Content-Type: application/json

{
  "code": "SUMMER20",
  "name": "Khuyến mãa mùa hè",
  "description": "Giảm 20% cho đơn hàng mùa hè",
  "discountType": "PERCENT",
  "discountValue": 20,
  "maxDiscountAmount": 100000,
  "minOrderAmount": 200000,
  "usageLimit": 500,
  "perUserLimit": 2,
  "startsAt": "2026-08-01T00:00:00.000Z",
  "endsAt": "2026-08-31T23:59:59.000Z",
  "stackingPolicy": "NOT_ALLOWED",
  "applicableBooks": ["book-uuid-1"],
  "applicableCategories": ["cat-uuid-1"]
}
```

### Validation Rules

| Field | Rules |
|-------|-------|
| code | Required, unique, 4-20 chars, uppercase alphanumeric |
| name | Required, 5-100 chars |
| discountType | PERCENT or FIXED |
| discountValue | 1-100 for PERCENT, min 1000 for FIXED |
| maxDiscountAmount | Optional, max discount amount |
| minOrderAmount | Optional, min order to apply |
| usageLimit | Optional, total uses allowed |
| perUserLimit | Optional, default 1 |
| startsAt | Required, future date |
| endsAt | Required, after startsAt |

### Response 201

```json
{
  "message": "Voucher created successfully",
  "data": {
    "id": "voucher-uuid",
    "code": "SUMMER20",
    "status": "ACTIVE",
    "createdAt": "2026-08-14T10:00:00.000Z"
  }
}
```

---

## PATCH /seller/vouchers/:id

Update a voucher.

### Request

```http
PATCH /api/v1/seller/vouchers/voucher-uuid
Authorization: Bearer <access_token> (Business role)
Content-Type: application/json

{
  "name": "Updated name",
  "discountValue": 25,
  "usageLimit": 1000
}
```

---

## DELETE /seller/vouchers/:id

Delete/deactivate a voucher.

### Request

```http
DELETE /api/v1/seller/vouchers/voucher-uuid
Authorization: Bearer <access_token> (Business role)
```

### Response 200

```json
{
  "message": "Voucher deactivated"
}
```

---

## Voucher Types

| Type | Owner | Description |
|------|-------|-------------|
| PLATFORM | HUKI EBOOK | Áp dụng toàn nền tảng |
| BUSINESS | Business | Chỉ Business tạo |
| STORE | Store | Chỉ cửa hàng tạo |

---

## Discount Types

| Type | Description | Example |
|------|-------------|---------|
| PERCENT | Giảm theo % | 10% off, max 50K |
| FIXED | Giảm cố định | Giảm 50K |

---

## Stacking Policy

| Policy | Description |
|--------|-------------|
| ALLOWED | Có thể kết hợp với voucher khác |
| NOT_ALLOWED | Không kết hợp được |
| PLATFORM_ONLY | Chỉ với platform voucher |
