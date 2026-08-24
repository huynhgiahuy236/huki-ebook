# Payment Flow

## Overview

Payment flow hỗ trợ COD và PayOS (online payment).

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         PAYMENT FLOW                             │
└─────────────────────────────────────────────────────────────────┘

                    ┌──────────────────┐
                    │   Confirm        │
                    │   Checkout       │
                    └────────┬─────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│     COD        │  │    PayOS      │  │   Future       │
│   Payment      │  │   Payment     │  │   (VNPay,etc)  │
└───────┬────────┘  └───────┬────────┘  └────────────────┘
        │                   │
        │                   ▼
        │          ┌────────────────┐
        │          │ Create        │
        │          │ Payment Link  │
        │          └───────┬────────┘
        │                  │
        │                  ▼
        │          ┌────────────────┐
        │          │ Return URL    │
        │          │ or Webhook    │
        │          └───────┬────────┘
        │                  │
        │                  ▼
        │          ┌────────────────┐
        │          │ Verify &      │
        │          │ Update Status │
        │          └───────┬────────┘
        │                  │
        └──────────────────┼──────────────────┘
                           │
                           ▼
                  ┌──────────────────┐
                  │   Payment       │
                  │   SUCCEEDED     │
                  └────────┬─────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│  Update Order │  │  Grant Digital │  │  Create       │
│  to PROCESSING│  │  Book Access   │  │  Outbox Event │
└────────────────┘  └────────────────┘  └────────────────┘
```

## Payment Methods

| Method | Flow | Use Case |
|--------|------|---------|
| COD | Immediate | Cash on delivery |
| ONLINE_PAYMENT | Async via PayOS | Credit card, bank transfer |

## PayOS Integration

### 1. Create Payment Link

```typescript
// POST /api/v1/payments/initiate
async initiate(userId: string, orderId: string, dto: InitiatePaymentDto) {
  // 1. Verify order
  const order = await this.prisma.order.findFirst({
    where: { id: orderId, userId }
  });
  
  // 2. Create payment record
  const payment = await this.prisma.payment.create({
    data: {
      orderId,
      amount: order.grandTotal,
      method: PaymentMethod.ONLINE_PAYMENT,
      status: PaymentStatus.PENDING,
      provider: 'payos'
    }
  });
  
  // 3. Generate orderCode (unique, numeric)
  const orderCode = Date.now() * 1000 + Math.floor(Math.random() * 1000);
  
  // 4. Call PayOS API
  const payosLink = await this.payos.createPaymentLink({
    orderCode,
    amount: order.grandTotal,
    description: `Order ${order.code}`,
    returnUrl: `${frontendUrl}/checkout/success?orderId=${orderId}`,
    cancelUrl: `${frontendUrl}/checkout/cancel?orderId=${orderId}`,
    expiredAt: Math.floor(Date.now() / 1000) + 15 * 60 // 15 min
  });
  
  // 5. Update payment with PayOS data
  await this.prisma.payment.update({
    where: { id: payment.id },
    data: {
      providerReference: payosLink.paymentLinkId,
      checkoutUrl: payosLink.checkoutUrl
    }
  });
  
  return { checkoutUrl: payosLink.checkoutUrl };
}
```

### 2. Webhook Callback

```typescript
// POST /api/v1/payments/payos/webhook
async handlePayOSWebhook(dto: PayOSWebhookDto) {
  // 1. Verify signature
  if (!this.payos.verifyWebhook(dto)) {
    throwError.unauthorized(ErrorCode.PAYMENT_SIGNATURE_INVALID, 'Invalid signature');
  }
  
  // 2. Find payment
  const payment = await this.prisma.payment.findFirst({
    where: { providerReference: dto.data.orderCode.toString() }
  });
  
  if (!payment) {
    throwError.notFound(ErrorCode.PAYMENT_NOT_FOUND, 'Payment not found');
  }
  
  // 3. Check idempotency
  if (payment.status === 'SUCCEEDED') {
    return { success: true }; // Already processed
  }
  
  // 4. Update payment status
  if (dto.data.status === 'SUCCESS') {
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.SUCCEEDED,
        transactionId: dto.data.transactionId,
        paidAt: new Date()
      }
    });
    
    // 5. Process order completion
    await this.processPaymentSuccess(payment.orderId);
  }
}
```

## Payment Status

| Status | Description |
|--------|-------------|
| PENDING | Awaiting payment |
| PROCESSING | Payment in progress |
| SUCCEEDED | Payment successful |
| FAILED | Payment failed |
| CANCELLED | Payment cancelled |
| REFUNDED | Payment refunded |

## Error Handling

| Error | Action |
|-------|--------|
| PayOS API error | Log, return 502 |
| Invalid signature | Return 401 |
| Payment not found | Return 404 |
| Already processed | Return 200 (idempotent) |
| Amount mismatch | Log alert, reject |

## Key Files

| File | Description |
|------|-------------|
| `commerce-service/.../payments.service.ts` | Payment logic |
| `commerce-service/.../payos.service.ts` | PayOS integration |
| `commerce-service/.../payments.controller.ts` | Payment API |
