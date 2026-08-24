# Apply Voucher Flow

## Overview

Flow xử lý việc validate và apply voucher vào order.

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    VOUCHER VALIDATION FLOW                       │
└─────────────────────────────────────────────────────────────────┘

┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Enter   │───▶│  Validate │───▶│ Calculate │───▶│  Return  │
│  Code    │    │  Rules    │    │  Discount │    │  Result  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                      │                              │
                      ▼                              ▼
               ┌──────────┐                  ┌──────────┐
               │  Pass?   │                  │  Error   │
               └────┬─────┘                  │  Code    │
                    │                        └──────────┘
          ┌─────────┴─────────┐
          │                   │
          ▼                   ▼
    ┌──────────┐        ┌──────────┐
    │   YES    │        │    NO    │
    │ Proceed  │        │ Return   │
    └──────────┘        │  Error   │
                        └──────────┘
```

## Validation Rules

### 1. Basic Checks

```typescript
async validate(userId: string, dto: ValidateVoucherDto) {
  // 1. Find voucher
  const voucher = await this.prisma.voucher.findUnique({
    where: { code: dto.code.toUpperCase() }
  });
  
  if (!voucher) {
    return { valid: false, reason: 'VOUCHER_NOT_FOUND' };
  }
  
  // 2. Check status
  if (voucher.status !== 'ACTIVE') {
    return { valid: false, reason: `VOUCHER_${voucher.status}` };
  }
  
  // 3. Check date range
  const now = new Date();
  if (voucher.startsAt > now) {
    return { valid: false, reason: 'VOUCHER_NOT_STARTED' };
  }
  if (voucher.expiresAt < now) {
    return { valid: false, reason: 'VOUCHER_EXPIRED' };
  }
  
  // 4. Check usage limit
  if (voucher.totalUsage > 0 && voucher.currentUsage >= voucher.totalUsage) {
    return { valid: false, reason: 'VOUCHER_EXHAUSTED' };
  }
  
  // 5. Check per-user limit
  if (voucher.maxUsagePerUser) {
    const userUsage = await this.prisma.voucherUsage.count({
      where: { voucherId: voucher.id, userId }
    });
    if (userUsage >= voucher.maxUsagePerUser) {
      return { valid: false, reason: 'VOUCHER_LIMIT_REACHED' };
    }
  }
  
  // 6. Check minimum order amount
  if (voucher.minOrderAmount > dto.orderSubtotal) {
    return { valid: false, reason: 'VOUCHER_MIN_ORDER_NOT_MET' };
  }
  
  // 7. Check scope
  if (voucher.scope === 'STORE' && voucher.storeId !== dto.storeId) {
    return { valid: false, reason: 'VOUCHER_NOT_APPLICABLE' };
  }
}
```

## Discount Calculation

```typescript
// Calculate discount based on type
switch (voucher.type) {
  case 'PERCENTAGE':
    discount = (orderSubtotal * voucher.value) / 100;
    // Cap at max discount
    if (voucher.maxDiscountAmount) {
      discount = Math.min(discount, voucher.maxDiscountAmount);
    }
    break;
    
  case 'FIXED_AMOUNT':
    discount = Math.min(voucher.value, orderSubtotal);
    break;
    
  case 'FREE_SHIPPING':
    discount = shippingFee; // Applied at shipping calculation
    break;
}
```

## Apply Flow

```typescript
async apply(userId: string, voucherId: string, orderId: string, discount: number) {
  return this.prisma.$transaction(async (tx) => {
    // 1. Create usage record
    await tx.voucherUsage.create({
      data: {
        voucherId,
        userId,
        orderId,
        discount
      }
    });
    
    // 2. Increment usage count
    await tx.voucher.update({
      where: { id: voucherId },
      data: { currentUsage: { increment: 1 } }
    });
    
    // 3. Check if limit reached
    const voucher = await tx.voucher.findUnique({ where: { id: voucherId } });
    if (voucher.totalUsage > 0 && voucher.currentUsage >= voucher.totalUsage) {
      await tx.voucher.update({
        where: { id: voucherId },
        data: { status: 'USED_UP' }
      });
    }
  });
}
```

## Voucher Types

| Type | Discount | Cap | Use Case |
|------|----------|-----|---------|
| PERCENTAGE | % of order | maxDiscountAmount | General discount |
| FIXED_AMOUNT | Fixed VND | - | Specific discount |
| FREE_SHIPPING | 100% shipping fee | - | Free shipping |

## Voucher Scopes

| Scope | Description |
|-------|-------------|
| PLATFORM | Valid for all stores |
| STORE | Valid only for specific store |

## Error Codes

| Code | Description |
|------|-------------|
| VOUCHER_NOT_FOUND | Voucher code not found |
| VOUCHER_EXPIRED | Voucher has expired |
| VOUCHER_NOT_STARTED | Voucher not started yet |
| VOUCHER_EXHAUSTED | No remaining uses |
| VOUCHER_LIMIT_REACHED | User reached usage limit |
| VOUCHER_MIN_ORDER_NOT_MET | Order below minimum |
| VOUCHER_NOT_APPLICABLE | Not valid for this store |

## Key Files

| File | Description |
|------|-------------|
| `promotion-service/.../vouchers.service.ts` | Voucher logic |
| `promotion-service/.../vouchers.controller.ts` | Voucher API |
| `commerce-service/.../internal.controller.ts` | Internal API |
