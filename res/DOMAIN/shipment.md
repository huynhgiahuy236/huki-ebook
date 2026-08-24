# Shipment Domain Schema

## Shipment

```typescript
interface Shipment {
  id: string;
  sellerOrderId: string;
  trackingCode: string;
  carrier: Carrier;
  status: ShipmentStatus;
  
  // Recipient Info
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  
  // Dates
  estimatedDelivery: Date | null;
  pickedUpAt: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  returnedAt: Date | null;
  
  // Weight & Package
  weight: number; // grams
  packageCount: number;
  
  // Notes
  customerNote: string | null;
  internalNote: string | null;
  
  // Delivery Attempt
  deliveryAttempts: number;
  lastDeliveryAttemptAt: Date | null;
  deliveryFailureReason: string | null;
  
  createdAt: Date;
  updatedAt: Date;
}

type Carrier = 'GHTK' | 'GHN' | 'VNPOST' | 'J&T' | 'BEST' | 'OTHER';

type ShipmentStatus = 
  | 'PENDING'           // Awaiting pickup
  | 'PICKED_UP'         // Collected from seller
  | 'IN_TRANSIT'        // On the way
  | 'OUT_FOR_DELIVERY'  // Out for final delivery
  | 'DELIVERED'         // Successfully delivered
  | 'FAILED'            // Delivery failed
  | 'RETURNING'         // Being returned
  | 'RETURNED'          // Returned to sender
  | 'CANCELLED';        // Cancelled
```

## ShipmentEvent

```typescript
interface ShipmentEvent {
  id: string;
  shipmentId: string;
  eventType: string;
  eventTime: Date;
  location: string;
  description: string;
  rawData: Record<string, any>;
  createdAt: Date;
}
```

## ShipmentStatusHistory

```typescript
interface ShipmentStatusHistory {
  id: string;
  shipmentId: string;
  fromStatus: ShipmentStatus | null;
  toStatus: ShipmentStatus;
  reason: string | null;
  note: string | null;
  createdBy: string;
  createdAt: Date;
}
```

## Shipping Fee Calculation

```typescript
interface ShippingFeeCalculation {
  baseFee: number;
  weightFee: number;
  distanceFee: number;
  surcharge: number;
  totalFee: number;
  estimatedDays: number;
}

function calculateShippingFee(
  weight: number, // grams
  distance: number, // km
  carrier: Carrier
): ShippingFeeCalculation {
  const BASE_FEE = 30000; // VND
  const RATE_PER_500G = 5000; // VND per 500g
  const RATE_PER_100KM = 1000; // VND per 100km
  
  const weightFee = Math.ceil(weight / 500) * RATE_PER_500G;
  const distanceFee = Math.ceil(distance / 100) * RATE_PER_100KM;
  const surcharge = carrier === 'J&T' ? 5000 : 0;
  
  return {
    baseFee: BASE_FEE,
    weightFee,
    distanceFee,
    surcharge,
    totalFee: BASE_FEE + weightFee + distanceFee + surcharge,
    estimatedDays: getEstimatedDays(carrier, distance),
  };
}
```

## Shipment Status Flow

```
                    ┌──────────┐
                    │ PENDING  │◀────────────────────┐
                    └─────┬────┘                     │
                          │ Pickup                    │ Cancel
                          ▼                          │
                    ┌──────────┐                     │
                    │PICKED_UP │────────────────────┘
                    └─────┬────┘
                          │ Scan
                          ▼
                    ┌──────────┐
                    │IN_TRANSIT│
                    └─────┬────┘
                          │ Arrive at hub
                          ▼
                    ┌──────────┐
                    │OUT_FOR  │
                    │DELIVERY │
                    └─────┬────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │DELIVERED │   │  FAILED  │   │RETURNING │
    └──────────┘   └─────┬────┘   └─────┬────┘
                          │ Retry        │
                          ▼               │
                    ┌──────────┐         │
                    │OUT_FOR   │─────────┘
                    │DELIVERY  │ (Resend)
                    └──────────┘
```

## Valid Status Transitions

| From | To | Trigger |
|------|-----|---------|
| PENDING | PICKED_UP | Staff picks up |
| PENDING | CANCELLED | Order cancelled |
| PICKED_UP | IN_TRANSIT | Departed hub |
| PICKED_UP | CANCELLED | Cancelled (refund needed) |
| IN_TRANSIT | OUT_FOR_DELIVERY | Arrived at local hub |
| IN_TRANSIT | FAILED | Delivery attempt failed |
| IN_TRANSIT | RETURNING | Return requested |
| OUT_FOR_DELIVERY | DELIVERED | Confirmed delivery |
| OUT_FOR_DELIVERY | FAILED | Delivery failed |
| OUT_FOR_DELIVERY | RETURNING | Return requested |
| FAILED | OUT_FOR_DELIVERY | Retry delivery |
| FAILED | RETURNING | Give up |
| RETURNING | RETURNED | Received at sender |
| RETURNING | PICKED_UP | Resend after return |

## Webhook Payload from Carrier

```typescript
// GHTK Webhook Example
interface GHTKWebhook {
  label_id: string;
  partner_id: string;
  status: string;
  status_text: string;
  updated_at: string;
  location: string;
}

// GHN Webhook Example  
interface GHNWebhook {
  order_code: string;
  status: string;
  updated_date: string;
  location: string;
}
```

## ShipmentView (API Response)

```typescript
interface ShipmentView {
  id: string;
  trackingCode: string;
  carrier: Carrier;
  status: ShipmentStatus;
  statusText: string;
  recipient: {
    name: string;
    phone: string;
    address: string;
  };
  estimatedDelivery: Date | null;
  timeline: {
    status: ShipmentStatus;
    description: string;
    time: Date;
    location: string;
  }[];
  currentLocation: string | null;
}
```

## Key Files

| File | Description |
|------|-------------|
| `shipping-service/.../shipments.service.ts` | Shipment logic |
| `shipping-service/.../shipments.controller.ts` | Shipment API |
| `shipping-service/.../webhook.controller.ts` | Carrier webhooks |
