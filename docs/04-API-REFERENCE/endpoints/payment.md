# 💳 Payment API

## POST /payments/initiate

Initiate a payment.

### Request

```http
POST /api/v1/payments/initiate
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "orderId": "order-uuid",
  "provider": "VNPAY",
  "paymentMethod": "ONLINE_PAYMENT"
}
```

### Response 201

```json
{
  "message": "Payment initiated",
  "data": {
    "paymentId": "payment-uuid",
    "orderId": "order-uuid",
    "amount": 613100,
    "provider": "VNPAY",
    "checkoutUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_...",
    "expiresAt": "2026-08-14T10:30:00.000Z",
    "qrCode": null
  }
}
```

---

## GET /payments/:id

Get payment details.

### Request

```http
GET /api/v1/payments/payment-uuid
Authorization: Bearer <access_token>
```

### Response 200

```json
{
  "data": {
    "id": "payment-uuid",
    "orderId": "order-uuid",
    "orderCode": "HUK202608140001",
    "amount": 613100,
    "currency": "VND",
    "provider": "VNPAY",
    "paymentMethod": "ONLINE_PAYMENT",
    "status": "SUCCEEDED",
    "transactionId": "vnp-123456",
    "providerResponse": {
      "vnp_ResponseCode": "00",
      "vnp_TransactionStatus": "00"
    },
    "paidAt": "2026-08-14T10:05:00.000Z",
    "createdAt": "2026-08-14T10:00:00.000Z"
  }
}
```

---

## POST /payments/:id/callback (VNPay)

VNPay callback endpoint.

### Request

```http
POST /api/v1/payments/payment-uuid/callback
Content-Type: application/x-www-form-urlencoded

vnp_ResponseCode=00
vnp_TransactionStatus=00
vnp_TxnRef=HUK202608140001
vnp_Amount=61310000
vnp_BankCode=NCB
vnp_PayDate=20260814100530
vnp_SecureHash=xxx
```

### Response

```
Redirect to: /checkout/success?orderId=order-uuid
or
Redirect to: /checkout/failed?orderId=order-uuid
```

---

## POST /payments/:id/momo/callback

Momo callback endpoint.

### Request

```http
POST /api/v1/payments/payment-uuid/momo/callback
Content-Type: application/json

{
  "partnerCode": "MOMO",
  "orderId": "payment-uuid",
  "requestId": "req-uuid",
  "amount": 613100,
  "transId": "momo-trans-123",
  "resultCode": 0,
  "message": "Success",
  "signature": "xxx"
}
```

---

## POST /payments/:id/refund

Request a refund.

### Request

```http
POST /api/v1/payments/payment-uuid/refund
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "amount": 613100,
  "reason": "Customer request",
  "items": [
    {
      "orderItemId": "item-uuid",
      "quantity": 1,
      "refundAmount": 250000
    }
  ]
}
```

### Response 201

```json
{
  "message": "Refund initiated",
  "data": {
    "refundId": "refund-uuid",
    "paymentId": "payment-uuid",
    "amount": 613100,
    "status": "PENDING",
    "estimatedCompletion": "2026-08-17T10:00:00.000Z"
  }
}
```

---

## GET /refunds

Get list of refunds.

### Request

```http
GET /api/v1/refunds?page=1&limit=20
Authorization: Bearer <access_token>
```

### Response 200

```json
{
  "data": [
    {
      "id": "refund-uuid",
      "paymentId": "payment-uuid",
      "orderCode": "HUK202608140001",
      "amount": 613100,
      "status": "COMPLETED",
      "reason": "Customer request",
      "completedAt": "2026-08-17T10:00:00.000Z",
      "createdAt": "2026-08-14T12:00:00.000Z"
    }
  ],
  "pagination": {...}
}
```

---

## ADMIN ENDPOINTS

## POST /admin/payments/:id/approve-refund

Approve a refund (Admin only).

### Request

```http
POST /api/v1/admin/payments/payment-uuid/approve-refund
Authorization: Bearer <access_token> (Admin role)
Content-Type: application/json

{
  "refundId": "refund-uuid"
}
```

---

## POST /admin/payments/:id/reject-refund

Reject a refund (Admin only).

### Request

```http
POST /api/v1/admin/payments/payment-uuid/reject-refund
Authorization: Bearer <access_token> (Admin role)
Content-Type: application/json

{
  "refundId": "refund-uuid",
  "reason": "Invalid refund request"
}
```

---

## Payment Status Flow

```
┌─────────┐
│ PENDING │ ──initiate──▶ ┌───────────┐
└─────────┘                │ PROCESSING │
                          └───────────┘
                              │         │
              success         │         │         failed
              ▼               │         │               ▼
        ┌─────────┐         │         │         ┌─────────┐
        │ SUCCEEDED│◀────────┘         └────────▶│ FAILED  │
        └─────────┘                           └─────────┘
              │
              │ refund request
              ▼
        ┌─────────────┐
        │REFUND_PENDING│
        └─────────────┘
              │
      ┌───────┴───────┐
      │               │
    approve         reject
      ▼               ▼
┌─────────┐      ┌───────────┐
│REFUNDED │      │REFUND_DENIED│
└─────────┘      └───────────┘
```

---

## Payment Providers

### VNPay Parameters

```json
{
  "vnp_Version": "2.1.0",
  "vnp_Command": "pay",
  "vnp_TmnCode": "TMN_CODE",
  "vnp_Amount": 61310000, // Amount in VND * 100
  "vnp_CurrCode": "VND",
  "vnp_TxnRef": "HUK202608140001",
  "vnp_OrderInfo": "Thanh toan don hang HUK202608140001",
  "vnp_OrderType": "other",
  "vnp_Locale": "vn",
  "vnp_ReturnUrl": "https://huki-ebook.com/payment/vnpay/return",
  "vnp_IpAddr": "192.168.1.1",
  "vnp_CreateDate": "20260814100000",
  "vnp_ExpireDate": "20260814103000"
}
```

### Momo Parameters

```json
{
  "partnerCode": "MOMO_PARTNER_CODE",
  "requestId": "req-uuid",
  "amount": 613100,
  "orderId": "payment-uuid",
  "orderInfo": "Thanh toan don hang HUK202608140001",
  "redirectUrl": "https://huki-ebook.com/payment/momo/return",
  "ipnUrl": "https://huki-ebook.com/api/v1/payments/callback/momo",
  "requestType": "captureWallet"
}
```
