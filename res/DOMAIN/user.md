# User Domain Schema

## User

```typescript
interface User {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  phone: string | null;
  avatar: string | null;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

type UserRole = 'USER' | 'SELLER' | 'ADMIN' | 'SUPER_ADMIN';

type UserStatus = 'PENDING' | 'ACTIVE' | 'BLOCKED';
```

## User Session

```typescript
interface Session {
  id: string;
  userId: string;
  refreshToken: string;
  userAgent: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  createdAt: Date;
}
```

## User Address

```typescript
interface UserAddress {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  address: string;
  ward: string;
  district: string;
  city: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

## User Subscription (Premium Access)

```typescript
interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  startedAt: Date;
  expiresAt: Date | null;
  autoRenew: boolean;
  paymentMethod: string;
  createdAt: Date;
  updatedAt: Date;
}

type SubscriptionTier = 'BASIC' | 'STANDARD' | 'PREMIUM';

type SubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED';
```

## User View (API Response)

```typescript
interface UserView {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatar: string | null;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: Date;
}

interface UserProfileView extends UserView {
  addresses: UserAddress[];
  subscription: Subscription | null;
  stats: {
    totalOrders: number;
    totalSpent: number;
    booksOwned: number;
  };
}
```

## Subscription Benefits

| Tier | Price | Features |
|------|-------|----------|
| BASIC | Free | Read FREE books only |
| STANDARD | VND/month | Read STANDARD + some PREMIUM |
| PREMIUM | VND/month | Read all PREMIUM books |

## Access Matrix

| Book Type | BASIC | STANDARD | PREMIUM |
|-----------|-------|----------|---------|
| FREE | ✅ Read | ✅ Read | ✅ Read |
| STANDARD | ❌ | ✅ Read | ✅ Read |
| PREMIUM | ❌ | ❌ | ✅ Read |

Note: Any tier can also purchase books individually (one-time payment).
