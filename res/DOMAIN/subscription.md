# Subscription Domain Schema

## Overview

Subscription model cho SaaS ebook platform - hỗ trợ FREE, STANDARD, PREMIUM tiers.

## Subscription

```typescript
interface Subscription {
  id: string;
  userId: string;
  planId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  
  // Billing
  billingCycle: BillingCycle;
  price: number;
  currency: string;
  
  // Dates
  startedAt: Date;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelledAt: Date | null;
  expiresAt: Date | null;
  
  // Auto-renew
  autoRenew: boolean;
  
  // Payment
  paymentMethod: string;
  lastPaymentAt: Date | null;
  nextPaymentAt: Date | null;
  
  // Usage
  booksReadThisPeriod: number;
  maxBooksPerPeriod: number | null; // null = unlimited
  
  createdAt: Date;
  updatedAt: Date;
}

type SubscriptionTier = 'BASIC' | 'STANDARD' | 'PREMIUM';

type SubscriptionStatus = 
  | 'TRIAL'           // Dùng thử
  | 'ACTIVE'          // Đang hoạt động
  | 'PAUSED'          // Tạm dừng
  | 'CANCELLED'       // Đã hủy (hết period)
  | 'EXPIRED';        // Hết hạn

type BillingCycle = 'MONTHLY' | 'YEARLY' | 'QUARTERLY';
```

## SubscriptionPlan

```typescript
interface SubscriptionPlan {
  id: string;
  name: string;
  tier: SubscriptionTier;
  description: string;
  
  // Pricing
  monthlyPrice: number;
  quarterlyPrice: number;
  yearlyPrice: number;
  currency: string;
  
  // Features
  features: PlanFeature[];
  maxBooksPerMonth: number | null; // null = unlimited
  
  // Book Access
  allowedAccessTypes: BookAccessType[];
  premiumBookQuota: number; // Số sách PREMIUM được đọc/tháng
  
  // Limits
  maxDevices: number;
  maxDownloadsPerBook: number;
  
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface PlanFeature {
  name: string;
  enabled: boolean;
  limit?: number;
}

// Example: Premium Plan
const PREMIUM_PLAN: SubscriptionPlan = {
  id: 'premium-monthly',
  name: 'Premium Monthly',
  tier: 'PREMIUM',
  description: 'Truy cập toàn bộ sách Premium',
  monthlyPrice: 99000,
  yearlyPrice: 990000,
  features: [
    { name: 'Unlimited Reading', enabled: true },
    { name: 'Premium Books', enabled: true },
    { name: 'Offline Download', enabled: true },
    { name: 'Early Access', enabled: true },
  ],
  premiumBookQuota: -1, // Unlimited
  maxDevices: 3,
  maxDownloadsPerBook: 10,
};
```

## SubscriptionAccessLog

```typescript
interface SubscriptionAccessLog {
  id: string;
  subscriptionId: string;
  userId: string;
  bookId: string;
  accessType: BookAccessType;
  accessedAt: Date;
}
```

## SubscriptionPayment

```typescript
interface SubscriptionPayment {
  id: string;
  subscriptionId: string;
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: string;
  provider: string;
  providerReference: string;
  invoiceNumber: string;
  paidAt: Date | null;
  failedAt: Date | null;
  failureReason: string | null;
  createdAt: Date;
}
```

## Subscription View

```typescript
interface SubscriptionView {
  id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  plan: {
    name: string;
    description: string;
  };
  currentPeriod: {
    start: Date;
    end: Date;
  };
  autoRenew: boolean;
  features: PlanFeature[];
  remainingBooks: number | null; // null = unlimited
}

interface SubscriptionCheckoutView {
  tiers: {
    tier: SubscriptionTier;
    name: string;
    description: string;
    monthlyPrice: number;
    yearlyPrice: number;
    features: PlanFeature[];
  }[];
}
```

## Access Check Logic

```typescript
/**
 * Kiểm tra xem user có thể đọc sách không
 */
async function canAccessDigitalBook(
  userId: string,
  bookId: string,
  bookAccessType: BookAccessType
): Promise<AccessResult> {
  
  // 1. Check if user owns the book directly
  const directAccess = await db.bookAccess.findFirst({
    where: { userId, bookId, status: 'ACTIVE' }
  });
  
  if (directAccess) {
    return { allowed: true, reason: 'OWNED' };
  }
  
  // 2. Check subscription
  const subscription = await db.subscription.findFirst({
    where: { 
      userId, 
      status: { in: ['ACTIVE', 'TRIAL'] },
      currentPeriodEnd: { gte: new Date() }
    },
    include: { plan: true }
  });
  
  if (!subscription) {
    return { 
      allowed: false, 
      reason: 'NO_SUBSCRIPTION',
      message: 'Cần đăng ký gói Premium để đọc sách này'
    };
  }
  
  // 3. Check book access type
  if (bookAccessType === 'FREE') {
    // FREE books accessible to all with subscription
    return { allowed: true, reason: 'FREE_BOOK' };
  }
  
  // 4. PREMIUM book - check subscription tier
  if (bookAccessType === 'PREMIUM') {
    const allowed = subscription.plan.allowedAccessTypes.includes('PREMIUM');
    if (!allowed) {
      return {
        allowed: false,
        reason: 'TIER_INSUFFICIENT',
        message: `Gói ${subscription.plan.name} không bao gồm sách Premium`
      };
    }
    
    // Check quota
    if (subscription.plan.premiumBookQuota > 0) {
      const usedThisMonth = await db.subscriptionAccessLog.count({
        where: {
          subscriptionId: subscription.id,
          accessType: 'PREMIUM',
          accessedAt: { gte: subscription.currentPeriodStart }
        }
      });
      
      if (usedThisMonth >= subscription.plan.premiumBookQuota) {
        return {
          allowed: false,
          reason: 'QUOTA_EXCEEDED',
          message: 'Bạn đã hết lượt đọc sách Premium tháng này'
        };
      }
    }
    
    return { allowed: true, reason: 'PREMIUM_SUBSCRIPTION' };
  }
  
  return { allowed: false, reason: 'UNKNOWN' };
}
```

## Pricing Table

| Tier | Monthly | Yearly | Features |
|------|---------|--------|---------|
| BASIC | Free | Free | Sách FREE |
| STANDARD | VND | VND | Sách FREE + một số PREMIUM |
| PREMIUM | VND | VND | Tất cả sách PREMIUM |

## Subscription Flow

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Choose  │───▶│ Select   │───▶│ Payment  │───▶│ Activate │
│  Plan   │    │ Billing  │    │ Process  │    │ Sub.     │
└──────────┘    │ Cycle   │    └──────────┘    └────┬─────┘
                └──────────┘                         │
                                                     ▼
┌──────────────────────────────────────────────────────────┐
│                      SUBSCRIPTION                        │
│  ACTIVE ────────────────────────────────────────────▶   │
│    │                                                       │
│    │ Payment Success      Payment Failed     Cancel        │
│    ▼                   ▼                    ▼            │
│  NEXT PERIOD       ┌─────────┐           ┌──────────┐     │
│                   │ Retry   │           │CANCELLED │     │
│                   │ & Notify│           │(End Period)│    │
│                   └─────────┘           └──────────┘     │
└──────────────────────────────────────────────────────────┘
```

## Key Files

| File | Description |
|------|-------------|
| `identity-service/.../subscription.service.ts` | Subscription logic |
| `identity-service/.../subscription.controller.ts` | Subscription API |
| `commerce-service/.../book-access.service.ts` | Access check |
