# Create Shipment Flow

## Overview

Tạo shipment từ order khi có sự kiện ORDER_CREATED.

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    SHIPMENT CREATION FLOW                        │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│ ORDER_CREATED│─────▶│  Shipping   │─────▶│   Create    │
│   Event      │      │  Consumer    │      │  Shipments   │
└──────────────┘      └──────┬───────┘      └──────┬───────┘
                             │                      │
                             ▼                      ▼
                      ┌──────────────┐      ┌──────────────┐
                      │  Get Order   │      │   Generate   │
                      │  Details     │      │  Tracking   │
                      └──────────────┘      └──────┬───────┘
                                                   │
                                                   ▼
                                            ┌──────────────┐
                                            │  Publish     │
                                            │  SHIPMENT_   │
                                            │  CREATED     │
                                            └──────────────┘
```

## Trigger

Shipment được tạo khi nhận event `ORDER_CREATED` từ Commerce service.

## Process

```typescript
async handle(event: DomainEvent): Promise<void> {
  if (event.eventType === ORDER_EVENTS.CREATED) {
    await this.createFromOrder(event.payload);
  }
}

async createFromOrder(dto: CreateShipmentsFromOrderDto) {
  // 1. Get order details
  const order = await this.prisma.order.findUnique({
    where: { id: dto.orderId },
    include: { 
      sellerOrders: { 
        where: { requiresShipping: true } 
      } 
    }
  });
  
  // 2. Create shipment for each seller order
  for (const sellerOrder of order.sellerOrders) {
    await this.prisma.shipment.create({
      data: {
        sellerOrderId: sellerOrder.id,
        trackingCode: this.generateTrackingCode(),
        status: 'PENDING',
        recipientName: dto.shippingAddress.fullName,
        recipientPhone: dto.shippingAddress.phone,
        recipientAddress: this.formatAddress(dto.shippingAddress),
        carrier: 'GHTK',
        estimatedDelivery: this.calculateDeliveryDate(),
        weight: sellerOrder.items.reduce((sum, item) => sum + (item.weight || 0), 0)
      }
    });
  }
}

private generateTrackingCode(): string {
  // Format: GHTK + timestamp + random
  return `GHTK${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
}
```

## Shipment Status Flow

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  PENDING  │───▶│PICKED_UP │───▶│IN_TRANSIT│───▶│OUT_FOR   │
│          │    │          │    │          │    │ DELIVERY │
└──────────┘    └─────┬─────┘    └─────┬─────┘    └─────┬─────┘
                      │                │                │
         ┌────────────┼────────────┐   │       ┌───────┴───────┐
         │            │            │   │       │               │
         ▼            ▼            ▼   ▼       ▼               ▼
   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐
   │ CANCELLED │ │ CANCELLED │ │ CANCELLED │ │  DELIVERED   │
   └──────────┘ └──────────┘ └──────────┘ └──────────────┘
                                                 ▲
                                                 │
                                          ┌──────────────┐
                                          │   FAILED     │
                                          │ (retry only) │
                                          └──────────────┘
```

## Valid Transitions

| From | To | Trigger |
|------|-----|---------|
| PENDING | PICKED_UP | Staff picks up package |
| PENDING | CANCELLED | Order cancelled |
| PICKED_UP | IN_TRANSIT | Package in transit |
| PICKED_UP | CANCELLED | Cancelled before transit |
| IN_TRANSIT | OUT_FOR_DELIVERY | Out for delivery |
| IN_TRANSIT | FAILED | Delivery attempt failed |
| IN_TRANSIT | RETURNED | Return to sender |
| OUT_FOR_DELIVERY | DELIVERED | Successfully delivered |
| OUT_FOR_DELIVERY | FAILED | Delivery failed |
| OUT_FOR_DELIVERY | RETURNED | Return to sender |
| FAILED | OUT_FOR_DELIVERY | Retry delivery |
| FAILED | RETURNED | Give up |
| RETURNED | PICKED_UP | Resend after return |

## Event Publishing

```typescript
// On shipment creation
await this.outbox.create({
  eventId: uuid(),
  type: SHIPPING_EVENTS.CREATED,
  aggregateId: shipment.id,
  payload: {
    shipmentId: shipment.id,
    sellerOrderId: shipment.sellerOrderId,
    trackingCode: shipment.trackingCode,
    status: shipment.status
  }
});
```

## Key Files

| File | Description |
|------|-------------|
| `shipping-service/.../shipping-order-event.consumer.ts` | Order event consumer |
| `shipping-service/.../shipments.service.ts` | Shipment logic |
| `shipping-service/.../shipments.controller.ts` | Shipment API |
