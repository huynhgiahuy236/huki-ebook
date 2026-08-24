# Checkout Flow

## Overview

Checkout flow xử lý từ khi user xác nhận đơn hàng đến khi tạo order.

## Flow Diagram

```
┌─────────────┐     ┌──────────────┐     ┌────────────────┐
│   GET       │────▶│   PREVIEW     │────▶│   GET          │
│   /cart     │     │   /preview    │     │   /cart        │
└─────────────┘     └───────┬───────┘     └────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │  Create        │
                    │  CheckoutSession│
                    │  (TTL: 15min)   │
                    └────────┬───────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐  ┌───────────────┐  ┌─────────────────┐
│   COD          │  │   PayOS       │  │   Other         │
│   Payment      │  │   Payment     │  │   Payment       │
└────────┬──────┘  └───────┬───────┘  └─────────────────┘
         │                   │
         │                   ▼
         │           ┌───────────────┐
         │           │   Webhook     │
         │           │   Callback    │
         │           └───────┬───────┘
         │                   │
         └─────────┬─────────┘
                   │
                   ▼
          ┌─────────────────┐
          │   ORDER         │
          │   CREATED       │
          │   (Outbox)      │
          └────────┬────────┘
                   │
                   ▼
          ┌─────────────────┐
          │   Shipping      │
          │   Service       │
          │   (Consumer)    │
          └─────────────────┘
```

## States

### CheckoutSession States

| State | Description | Next States |
|-------|-------------|------------|
| PENDING | Session created, awaiting confirmation | CONFIRMED, EXPIRED |
| CONFIRMED | Order confirmed, payment initiated | PAID, FAILED, CANCELLED |
| PAID | Payment successful | - |
| FAILED | Payment failed | - |
| CANCELLED | User cancelled | - |
| EXPIRED | Session TTL exceeded | - |

### Order States

| State | Description | Next States |
|-------|-------------|------------|
| PENDING_PAYMENT | Awaiting online payment | PAID, CANCELLED |
| PROCESSING | Payment confirmed, processing | SHIPPING, COMPLETED, CANCELLED |
| SHIPPING | Items being shipped | COMPLETED, CANCELLED, PARTIALLY_CANCELLED |
| COMPLETED | Order delivered | REFUNDED |
| CANCELLED | Order cancelled | - |
| PARTIALLY_CANCELLED | Some items cancelled | COMPLETED |
| REFUNDED | Refund completed | - |

## API Endpoints

### 1. Preview Checkout

```
POST /api/v1/checkout/preview
```

**Request:**
```json
{
  "shippingAddress": {
    "fullName": "Nguyễn Văn A",
    "phone": "0909123456",
    "address": "123 Đường ABC",
    "ward": "Phường 1",
    "district": "Quận 1",
    "city": "TP.HCM"
  },
  "note": "Giao giờ hành chính"
}
```

**Response:**
```json
{
  "sessionId": "uuid",
  "expiresAt": "2026-08-24T10:15:00Z",
  "groups": [
    {
      "storeId": "uuid",
      "requiresShipping": true,
      "itemSubtotal": 200000,
      "shippingFee": 30000,
      "grandTotal": 230000,
      "items": [...]
    }
  ],
  "itemSubtotal": 200000,
  "shippingTotal": 30000,
  "discountTotal": 0,
  "grandTotal": 230000
}
```

### 2. Confirm Checkout

```
POST /api/v1/checkout/confirm
Headers: Idempotency-Key: <unique-key>
```

**Request:**
```json
{
  "sessionId": "uuid",
  "paymentMethod": "COD" | "ONLINE_PAYMENT",
  "paymentProvider": "payos" // for ONLINE_PAYMENT only
}
```

**Response:**
```json
{
  "orderId": "uuid",
  "orderCode": "ORD-1724496000-a1b2c3d4",
  "paymentMethod": "COD",
  "status": "PROCESSING",
  "checkoutUrl": null,
  "createdAt": "2026-08-24T10:00:00Z"
}
```

## Error Scenarios

| Error | Code | Recovery |
|-------|------|----------|
| Cart empty | CHECKOUT_CART_EMPTY | Add items to cart |
| Session expired | CHECKOUT_SESSION_EXPIRED | Start new checkout |
| Cart changed | CHECKOUT_CART_CHANGED | Start new checkout |
| Invalid address | CHECKOUT_SHIPPING_INVALID | Fix address |
| Payment failed | PAYMENT_FAILED | Retry payment |
| Insufficient stock | INVENTORY_INSUFFICIENT | Reduce quantity |

## Key Files

| File | Description |
|------|-------------|
| `commerce-service/.../checkout.service.ts` | Checkout logic |
| `commerce-service/.../checkout.controller.ts` | Checkout API |
| `commerce-service/.../inventory-reservation.service.ts` | Stock reservation |
| `commerce-service/.../order-completion.service.ts` | Order completion |

## Events

| Event | Producer | Consumer | Payload |
|-------|---------|----------|---------|
| ORDER_CREATED | Commerce | Shipping | orderId, items, address |
| PAYMENT_SUCCEEDED | Commerce | Library | orderId, userId, items |
