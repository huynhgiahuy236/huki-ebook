# Event Schemas

## Order Events

### ORDER_CREATED

```typescript
{
  eventId: string;        // UUID
  eventType: 'ORDER_CREATED';
  occurredAt: string;     // ISO 8601
  producer: 'commerce-service';
  version: number;
  aggregateId: string;    // Order ID
  payload: {
    orderId: string;
    orderCode: string;
    userId: string;
    paymentMethod: 'COD' | 'ONLINE_PAYMENT';
    paymentProvider: string | null;
    itemSubtotal: number;
    shippingTotal: number;
    discountTotal: number;
    grandTotal: number;
    requiresShipping: boolean;
    shippingAddress: {
      fullName: string;
      phone: string;
      address: string;
      ward: string;
      district: string;
      city: string;
    };
    sellerOrders: {
      sellerOrderId: string;
      storeId: string;
      ownerUserId: string;
      requiresShipping: boolean;
      items: {
        bookId: string;
        format: 'PHYSICAL' | 'DIGITAL';
        quantity: number;
        unitPrice: number;
      }[];
    }[];
  };
}
```

### ORDER_PAID

```typescript
{
  eventId: string;
  eventType: 'ORDER_PAID';
  // ... same base fields
  payload: {
    orderId: string;
    orderCode: string;
    userId: string;
    amount: number;
    paymentMethod: 'COD' | 'ONLINE_PAYMENT';
    provider: string;
  };
}
```

### ORDER_COMPLETED

```typescript
{
  eventId: string;
  eventType: 'ORDER_COMPLETED';
  payload: {
    orderId: string;
    orderCode: string;
    userId: string;
    amount: number;
    paymentMethod: string;
    sellerOrders: {
      sellerOrderId: string;
      ownerUserId: string;
      storeId: string;
    }[];
  };
}
```

## Payment Events

### PAYMENT_SUCCEEDED

```typescript
{
  eventId: string;
  eventType: 'PAYMENT_SUCCEEDED';
  payload: {
    orderId: string;
    userId: string;
    amount: number;
    provider: string;
    transactionId: string;
  };
}
```

## Shipping Events

### SHIPMENT_CREATED

```typescript
{
  eventId: string;
  eventType: 'SHIPMENT_CREATED';
  payload: {
    shipmentId: string;
    sellerOrderId: string;
    trackingCode: string;
    status: 'PENDING';
  };
}
```

### SHIPMENT_PICKED_UP

```typescript
{
  eventId: string;
  eventType: 'SHIPMENT_PICKED_UP';
  payload: {
    shipmentId: string;
    sellerOrderId: string;
    trackingNumber: string;
  };
}
```

### SHIPMENT_DELIVERED

```typescript
{
  eventId: string;
  eventType: 'SHIPMENT_DELIVERED';
  payload: {
    shipmentId: string;
    sellerOrderId: string;
    trackingNumber: string;
  };
}
```

## Event Envelope

All events follow this structure:

```typescript
interface DomainEvent<TPayload = Record<string, unknown>> {
  eventId: string;        // UUID v4
  eventType: string;      // CONSTANT_CASE
  occurredAt: string;     // ISO 8601
  producer: string;        // service-name
  version: number;         // 1
  aggregateId: string;    // Primary entity ID
  payload: TPayload;
}
```
