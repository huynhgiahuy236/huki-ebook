# Voucher Domain Schema

## Voucher

```typescript
interface Voucher {
  id: string;
  code: string;                  // UNIQUE, uppercase
  name: string;
  description: string | null;
  
  // Type & Value
  type: VoucherType;
  value: number;                  // Percentage or fixed amount
  
  // Conditions
  minOrderAmount: number;        // Minimum order value
  maxDiscountAmount: number | null; // Cap for percentage discount
  
  // Scope
  scope: VoucherScope;           // PLATFORM or STORE
  storeId: string | null;        // Required if scope is STORE
  
  // Limits
  totalUsage: number;            // Total uses allowed (0 = unlimited)
  maxUsagePerUser: number | null;
  currentUsage: number;         // Current use count
  
  // Validity
  startsAt: Date;
  expiresAt: Date;
  
  status: VoucherStatus;
  
  // Relations
  usages: VoucherUsage[];
  
  createdAt: Date;
  updatedAt: Date;
}

type VoucherType = 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';

type VoucherScope = 'PLATFORM' | 'STORE';

type VoucherStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'USED_UP';
```

## VoucherUsage

```typescript
interface VoucherUsage {
  id: string;
  voucherId: string;
  userId: string;
  orderId: string;
  discount: number;              // Actual discount applied
  createdAt: Date;
}
```

## Validation Request/Response

```typescript
// Validate voucher
interface ValidateVoucherRequest {
  code: string;
  orderSubtotal: number;
  storeId?: string;
}

interface ValidateVoucherResponse {
  valid: boolean;
  voucher?: {
    id: string;
    code: string;
    type: VoucherType;
    value: number;
    maxDiscountAmount?: number;
  };
  discount?: number;
  reason?: string;
}
```

## Discount Calculation

| Type | Formula | Cap |
|------|---------|-----|
| PERCENTAGE | `(subtotal * value) / 100` | `maxDiscountAmount` |
| FIXED_AMOUNT | `min(value, subtotal)` | - |
| FREE_SHIPPING | `shippingFee` | - |
