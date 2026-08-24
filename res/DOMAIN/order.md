# Order Domain Schema

## Order

```typescript
interface Order {
  id: string;                    // UUID
  userId: string;                 // Owner's user ID
  code: string;                  // ORD-{timestamp}-{random}
  idempotencyKey: string;        // Unique per user
  
  // Pricing
  itemSubtotal: number;          // Sum of items
  shippingTotal: number;         // Shipping fees
  discountTotal: number;         // Discounts applied
  grandTotal: number;           // Final amount
  
  // Payment
  paymentMethod: PaymentMethod;  // COD | ONLINE_PAYMENT
  paymentProvider: string | null;
  paymentStatus: PaymentStatus;
  
  // Status
  status: OrderStatus;
  cancelledAt: Date | null;
  cancelReason: string | null;
  
  // Shipping
  shippingAddress: ShippingAddress;
  note: string | null;
  
  // Audit
  sellerOrders: SellerOrder[];
  statusHistory: OrderStatusHistory[];
  createdAt: Date;
  updatedAt: Date;
}

type PaymentMethod = 'COD' | 'ONLINE_PAYMENT';

type PaymentStatus = 
  | 'PENDING' 
  | 'PROCESSING' 
  | 'SUCCEEDED' 
  | 'FAILED' 
  | 'CANCELLED' 
  | 'REFUNDED';

type OrderStatus = 
  | 'PENDING_PAYMENT'
  | 'PROCESSING'
  | 'SHIPPING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'PARTIALLY_CANCELLED'
  | 'REFUNDED';

interface ShippingAddress {
  fullName: string;
  phone: string;
  address: string;
  ward: string;
  district: string;
  city: string;
}
```

## SellerOrder

```typescript
interface SellerOrder {
  id: string;
  orderId: string;
  code: string;                  // ORD-S1, ORD-S2, etc.
  storeId: string;
  ownerUserId: string;            // Store owner
  
  // Shipping
  requiresShipping: boolean;
  shippingFee: number;
  carrier: string | null;
  trackingCode: string | null;
  
  // Pricing
  itemSubtotal: number;
  grandTotal: number;
  
  // Status
  status: SellerOrderStatus;
  confirmedAt: Date | null;
  shippedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
  
  items: OrderItem[];
  createdAt: Date;
}

type SellerOrderStatus =
  | 'PENDING_PAYMENT'
  | 'PENDING_CONFIRMATION'
  | 'CONFIRMED'
  | 'SHIPPED'
  | 'COMPLETED'
  | 'CANCELLED';
```

## OrderItem

```typescript
interface OrderItem {
  id: string;
  sellerOrderId: string;
  bookId: string;
  format: 'PHYSICAL' | 'DIGITAL';
  quantity: number;
  unitPrice: number;
  subtotal: number;
  createdAt: Date;
}
```

## OrderStatusHistory

```typescript
interface OrderStatusHistory {
  id: string;
  orderId: string;
  sellerOrderId: string | null;
  fromStatus: string;
  toStatus: string;
  title: string;
  description: string | null;
  actorType: ActorType;
  metadata: Record<string, any> | null;
  createdAt: Date;
}

type ActorType = 'USER' | 'SELLER' | 'SYSTEM' | 'ADMIN';
```
