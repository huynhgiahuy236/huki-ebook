# 🛒 Cart API

## GET /cart

Get current user's cart.

### Request

```http
GET /api/v1/cart
Authorization: Bearer <access_token>
```

### Response 200

```json
{
  "data": {
    "id": "cart-uuid",
    "items": [
      {
        "id": "cart-item-uuid",
        "book": {
          "id": "book-uuid",
          "title": "JavaScript: The Good Parts",
          "slug": "javascript-the-good-parts",
          "coverUrl": "https://example.com/cover.jpg",
          "price": 149000
        },
        "store": {
          "id": "store-uuid",
          "name": "Tech Books Store"
        },
        "format": "DIGITAL",
        "quantity": 1,
        "subtotal": 149000
      },
      {
        "id": "cart-item-uuid-2",
        "book": {
          "id": "book-uuid-2",
          "title": "Clean Code",
          "slug": "clean-code",
          "coverUrl": "https://example.com/cover2.jpg",
          "price": 250000
        },
        "store": {
          "id": "store-uuid",
          "name": "Tech Books Store"
        },
        "format": "PHYSICAL",
        "quantity": 2,
        "subtotal": 500000
      }
    ],
    "summary": {
      "totalItems": 3,
      "subtotal": 649000,
      "shippingTotal": 30000,
      "discountTotal": 0,
      "grandTotal": 679000
    },
    "stores": [
      {
        "storeId": "store-uuid",
        "storeName": "Tech Books Store",
        "items": [...],
        "subtotal": 649000,
        "shippingFee": 30000,
        "shippingMethod": "STANDARD"
      }
    ]
  }
}
```

---

## POST /cart/items

Add item to cart.

### Request

```http
POST /api/v1/cart/items
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "bookId": "book-uuid",
  "format": "DIGITAL",
  "quantity": 1
}
```

### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| bookId | string (UUID) | Yes | Book ID |
| format | string | Yes | PHYSICAL or DIGITAL |
| quantity | integer | Yes | Quantity (1 for DIGITAL) |

### Response 201

```json
{
  "message": "Item added to cart",
  "data": {
    "cartItem": {
      "id": "new-cart-item-uuid",
      "bookId": "book-uuid",
      "format": "DIGITAL",
      "quantity": 1
    },
    "cart": {
      "totalItems": 4,
      "grandTotal": 828000
    }
  }
}
```

### Response 400

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Book does not support DIGITAL format"
}
```

### Response 409

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "This item is already in your cart"
}
```

---

## PATCH /cart/items/:id

Update cart item quantity.

### Request

```http
PATCH /api/v1/cart/items/cart-item-uuid
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "quantity": 3
}
```

### Response 200

```json
{
  "message": "Cart item updated",
  "data": {
    "cartItem": {
      "id": "cart-item-uuid",
      "quantity": 3,
      "subtotal": 447000
    },
    "cart": {
      "totalItems": 6,
      "grandTotal": 1026000
    }
  }
}
```

---

## DELETE /cart/items/:id

Remove item from cart.

### Request

```http
DELETE /api/v1/cart/items/cart-item-uuid
Authorization: Bearer <access_token>
```

### Response 200

```json
{
  "message": "Item removed from cart",
  "data": {
    "cart": {
      "totalItems": 2,
      "grandTotal": 649000
    }
  }
}
```

---

## DELETE /cart

Clear entire cart.

### Request

```http
DELETE /api/v1/cart
Authorization: Bearer <access_token>
```

### Response 200

```json
{
  "message": "Cart cleared"
}
```

---

## POST /cart/checkout

Preview checkout (calculate totals, shipping, etc.)

### Request

```http
POST /api/v1/cart/checkout/preview
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "shippingAddress": {
    "receiverName": "Nguyen Van A",
    "phone": "0912345678",
    "addressLine": "123 Nguyen Hue",
    "ward": "Ben Nghe",
    "province": "Ho Chi Minh City"
  },
  "voucherCode": "HUKI10"  // Optional
}
```

### Response 200

```json
{
  "data": {
    "sessionId": "checkout-session-uuid",
    "expiresAt": "2026-08-14T12:00:00.000Z",
    "items": [
      {
        "storeId": "store-uuid",
        "storeName": "Tech Books Store",
        "items": [
          {
            "cartItemId": "cart-item-uuid",
            "bookId": "book-uuid",
            "title": "JavaScript: The Good Parts",
            "format": "DIGICAL",
            "unitPrice": 149000,
            "quantity": 1,
            "subtotal": 149000
          }
        ],
        "itemsSubtotal": 149000,
        "shippingFee": 30000,
        "shippingDiscount": 0,
        "storeDiscount": 0,
        "storeTotal": 179000
      }
    ],
    "summary": {
      "itemsSubtotal": 649000,
      "platformDiscount": 64900,
      "shippingTotal": 30000,
      "shippingDiscount": 0,
      "grandTotal": 613100,
      "currency": "VND"
    },
    "shippingAddress": {
      "receiverName": "Nguyen Van A",
      "phone": "0912345678",
      "addressLine": "123 Nguyen Hue",
      "ward": "Ben Nghe",
      "province": "Ho Chi Minh City"
    },
    "paymentMethods": [
      {
        "type": "ONLINE_PAYMENT",
        "label": "Thanh toán online",
        "providers": ["VNPAY", "MOMO"]
      },
      {
        "type": "COD",
        "label": "Thanh toán khi nhận hàng",
        "available": true
      }
    ],
    "voucher": {
      "code": "HUKI10",
      "discountType": "PERCENT",
      "discountValue": 10,
      "discountAmount": 64900,
      "appliedTo": "PLATFORM"
    }
  }
}
```

---

## POST /cart/checkout/confirm

Confirm and create order.

### Request

```http
POST /api/v1/cart/checkout/confirm
Authorization: Bearer <access_token>
Idempotency-Key: checkout-attempt-unique-key
Content-Type: application/json

{
  "sessionId": "checkout-session-uuid",
  "paymentMethod": "ONLINE_PAYMENT",
  "paymentProvider": "VNPAY"
}
```

`Idempotency-Key` is required (maximum 100 characters). Reusing it for the same
user returns the original order without reserving inventory twice. The checkout
session expires after 15 minutes by default and is invalidated when the cart changes.

### Response 201

```json
{
  "message": "Order created successfully",
  "data": {
    "order": {
      "id": "order-uuid",
      "orderCode": "HUK202608140001",
      "grandTotal": 613100,
      "paymentMethod": "ONLINE_PAYMENT",
      "paymentStatus": "PENDING",
      "orderStatus": "PENDING"
    },
    "payment": {
      "id": "payment-uuid",
      "amount": 613100,
      "checkoutUrl": "https://sandbox.vnpayment.vn/..."
    }
  }
}
```

### Response 400

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Checkout session expired. Please try again."
}
```
