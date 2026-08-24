# Order Completion Flow

## Overview

Order completion flow xử lý tự động khi shipment thay đổi trạng thái.

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    ORDER LIFECYCLE                              │
└─────────────────────────────────────────────────────────────────┘

┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ PENDING  │───▶│PROCESSING│───▶│ SHIPPING │───▶│COMPLETED │
│_PAYMENT  │    │          │    │          │    │          │
└──────────┘    └─────┬─────┘    └─────┬─────┘    └──────────┘
                      │                │
                      │    ┌───────────┴───────────┐
                      │    │                       │
                      ▼    ▼                       ▼
                 ┌──────────┐              ┌──────────┐
                 │CANCELLED │              │PARTIALLY │
                 │          │              │_CANCELLED│
                 └──────────┘              └──────────┘

┌─────────────────────────────────────────────────────────────────┐
│              SHIPMENT → SELLER_ORDER SYNC                      │
└─────────────────────────────────────────────────────────────────┘

Shipment Status          Seller Order Status
────────────────────────────────────────────
PENDING                   PENDING_PAYMENT / PENDING_CONFIRMATION
PICKED_UP                SHIPPED
IN_TRANSIT               SHIPPED
OUT_FOR_DELIVERY         SHIPPED
DELIVERED                COMPLETED
FAILED                    SHIPPED (retry)
RETURNED                  CANCELLED
CANCELLED                 CANCELLED
```

## Auto-Completion Logic

```typescript
// order-completion.service.ts
async completeIfReady(tx, orderId: string): Promise<boolean> {
  // 1. Count remaining non-terminal seller orders
  const remaining = await tx.sellerOrder.count({
    where: {
      orderId,
      status: { notIn: ['COMPLETED', 'CANCELLED'] }
    }
  });
  
  if (remaining > 0) return false;
  
  // 2. Check for cancellations
  const order = await tx.order.findUnique({...});
  const cancelledCount = order.sellerOrders.filter(
    s => s.status === 'CANCELLED'
  ).length;
  
  // 3. Determine final status
  if (cancelledCount > 0) {
    const terminalStatus = cancelledCount === order.sellerOrders.length
      ? 'CANCELLED'
      : 'PARTIALLY_CANCELLED';
    await tx.order.update({ data: { status: terminalStatus } });
    return false;
  }
  
  // 4. All completed - mark order as COMPLETED
  await tx.order.update({ data: { status: 'COMPLETED' } });
  
  // 5. Publish ORDER_COMPLETED event
  await tx.outboxEvent.create({...});
  
  return true;
}
```

## Event Flow

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  SHIPMENT    │      │  Commerce    │      │  Notification │
│  DELIVERED   │─────▶│  Consumer    │─────▶│  Service      │
└──────────────┘      └──────┬───────┘      └──────────────┘
                              │
                              ▼
                       ┌──────────────┐
                       │  Update      │
                       │  SellerOrder │
                       │  to COMPLETED│
                       └──────┬───────┘
                              │
                              ▼
                       ┌──────────────┐
                       │  Check All    │
                       │  Completed?   │
                       └──────┬───────┘
                              │
                              ▼
                       ┌──────────────┐
                       │  Update      │
                       │  Order to    │
                       │  COMPLETED   │
                       └──────────────┘
```

## Seller Order Status Transitions

| Current Status | Event | Next Status | Action |
|----------------|-------|-------------|--------|
| PENDING_CONFIRMATION | Seller confirms | PENDING_PAYMENT / CONFIRMED | - |
| PENDING_PAYMENT | Payment confirmed | CONFIRMED | - |
| CONFIRMED | Shipment PICKED_UP | SHIPPED | Commit inventory |
| SHIPPED | Shipment DELIVERED | COMPLETED | - |
| SHIPPED | Shipment FAILED | SHIPPED | Retry delivery |
| SHIPPED | Shipment RETURNED | CANCELLED | Release inventory |
| CONFIRMED | Seller cancels | CANCELLED | Release inventory |
| * | Shipment CANCELLED | CANCELLED | Release inventory |

## Inventory Management

```
Inventory Flow:
─────────────

1. RESERVE (on checkout confirm)
   ├── Physical stock: DECREMENT available
   └── Reserved: INCREMENT

2. COMMIT (on shipment picked up)
   ├── Reserved: DECREMENT
   └── Sold: INCREMENT

3. RELEASE (on cancellation/return)
   ├── Available: INCREMENT (release reserved)
   └── Reserved: DECREMENT
```

## Key Files

| File | Description |
|------|-------------|
| `commerce-service/.../order-completion.service.ts` | Completion logic |
| `commerce-service/.../inventory-reservation.service.ts` | Stock management |
| `commerce-service/.../commerce-event.consumer.ts` | Shipping events |

## Error Handling

| Scenario | Action |
|---------|--------|
| Seller order not found | Log error, skip |
| Duplicate event | Idempotent - check inbox |
| Inventory commit fails | Retry, eventually fail |
| Database error | Log, retry |
