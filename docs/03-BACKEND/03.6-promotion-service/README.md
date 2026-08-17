# 🎁 Promotion Service

**Port:** 3007
**Database:** PostgreSQL (promotion_db)

## Overview

The Promotion Service handles vouchers, discounts, banners, and marketing campaigns for the marketplace.

## Responsibilities

- Voucher creation and management
- Voucher validation and usage
- Book-level discounts
- Flash sales
- Marketing banners
- Campaign analytics

## Tech Stack

- **Framework:** NestJS
- **Database:** PostgreSQL with Prisma
- **Cache:** Redis (voucher validation)

## Architecture

```
┌─────────────────────────────────────────────┐
│           Promotion Service (3007)          │
├─────────────────────────────────────────────┤
│                                             │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐     │
│   │ Voucher │ │ Banner  │ │Discount │     │
│   │ Module  │ │ Module  │ │ Module  │     │
│   └─────────┘ └─────────┘ └─────────┘     │
│        │           │           │           │
│        ▼           ▼           ▼           │
│   ┌─────────────────────────────────�     │
│   │   Flash Sale Module             │     │
│   └─────────────────────────────────┘     │
│        │                                   │
│        ▼                                   │
│   ┌─────────────────────────────┐         │
│   │      PostgreSQL + Redis      │         │
│   └─────────────────────────────┘         │
│                                             │
└─────────────────────────────────────────────┘
```

## Database Schema

### Vouchers Table

```sql
CREATE TABLE vouchers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Discount
  type VARCHAR(50), -- PERCENTAGE, FIXED_AMOUNT, FREE_SHIPPING
  value FLOAT NOT NULL,

  -- Conditions
  min_order_amount FLOAT DEFAULT 0,
  max_discount_amount FLOAT,

  -- Scope
  scope VARCHAR(50) DEFAULT 'PLATFORM', -- PLATFORM, STORE
  store_id UUID, -- If scope=STORE

  -- Usage limits
  total_usage INTEGER DEFAULT 0,
  max_usage_per_user INTEGER,
  current_usage INTEGER DEFAULT 0,

  -- Validity
  starts_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,

  status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE, EXPIRED, USED_UP

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vouchers_code ON vouchers(code);
CREATE INDEX idx_vouchers_status ON vouchers(status);
CREATE INDEX idx_vouchers_expires_at ON vouchers(expires_at);
```

### Voucher Usages Table

```sql
CREATE TABLE voucher_usages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  voucher_id UUID NOT NULL REFERENCES vouchers(id),
  user_id UUID NOT NULL,
  order_id UUID NOT NULL,
  discount FLOAT NOT NULL,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_voucher_usages_voucher_id ON voucher_usages(voucher_id);
CREATE INDEX idx_voucher_usages_user_id ON voucher_usages(user_id);
```

### Banners Table

```sql
CREATE TABLE banners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  image TEXT NOT NULL,
  link TEXT,
  position INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,

  -- Scope
  scope VARCHAR(50) DEFAULT 'HOMEPAGE', -- HOMEPAGE, CATEGORY, STORE
  store_id UUID,

  -- Schedule
  start_date TIMESTAMP,
  end_date TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Book Discounts Table

```sql
CREATE TABLE book_discounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID NOT NULL,
  type VARCHAR(50), -- PERCENTAGE, FIXED_AMOUNT
  value FLOAT NOT NULL,

  min_quantity INTEGER,

  -- Validity
  starts_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,

  status VARCHAR(50) DEFAULT 'ACTIVE',

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_book_discounts_book_id ON book_discounts(book_id);
CREATE INDEX idx_book_discounts_expires_at ON book_discounts(expires_at);
```

### Flash Sales

```sql
CREATE TABLE flash_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,

  starts_at TIMESTAMP NOT NULL,
  ends_at TIMESTAMP NOT NULL,

  status VARCHAR(50) DEFAULT 'SCHEDULED',
  -- SCHEDULED, ACTIVE, ENDED

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE flash_sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flash_sale_id UUID NOT NULL REFERENCES flash_sales(id),
  book_id UUID NOT NULL,

  original_price FLOAT NOT NULL,
  sale_price FLOAT NOT NULL,

  stock INTEGER NOT NULL,
  sold INTEGER DEFAULT 0,
  max_per_user INTEGER DEFAULT 1,

  created_at TIMESTAMP DEFAULT NOW()
);
```

## Voucher Types

### PERCENTAGE

```typescript
{
  type: 'PERCENTAGE',
  value: 10, // 10% off
  maxDiscountAmount: 50000, // Max 50k off
}
```

**Calculation:**
```
discount = min(orderSubtotal * 10%, maxDiscountAmount)
```

### FIXED_AMOUNT

```typescript
{
  type: 'FIXED_AMOUNT',
  value: 30000, // 30k off
}
```

**Calculation:**
```
discount = min(value, orderSubtotal)
```

### FREE_SHIPPING

```typescript
{
  type: 'FREE_SHIPPING',
  value: 0,
}
```

**Calculation:**
```
shippingDiscount = shippingFee
```

## Voucher Validation

```typescript
async validateVoucher(code: string, userId: string, orderAmount: number) {
  const voucher = await this.prisma.voucher.findUnique({ where: { code } });

  // Check exists
  if (!voucher) throw new NotFoundException('Voucher not found');

  // Check active
  if (voucher.status !== 'ACTIVE') throw new BadRequestException('Voucher inactive');

  // Check dates
  const now = new Date();
  if (now < voucher.startsAt) throw new BadRequestException('Not yet valid');
  if (now > voucher.expiresAt) throw new BadRequestException('Expired');

  // Check min order
  if (orderAmount < voucher.minOrderAmount) {
    throw new BadRequestException(`Min order: ${voucher.minOrderAmount}`);
  }

  // Check total usage
  if (voucher.totalUsage >= voucher.maxUsage) {
    throw new BadRequestException('Voucher limit reached');
  }

  // Check user usage
  const userUsage = await this.prisma.voucherUsage.count({
    where: { voucherId: voucher.id, userId },
  });
  if (userUsage >= voucher.maxUsagePerUser) {
    throw new BadRequestException('You have used this voucher');
  }

  return voucher;
}
```

## API Endpoints

See [Voucher API](../../04-API-REFERENCE/endpoints/vouchers.md) for details.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /vouchers | List available vouchers |
| GET | /vouchers/:code | Get voucher by code |
| POST | /vouchers/:code/validate | Validate voucher |
| POST | /vouchers | Create voucher (Admin/Seller) |
| PATCH | /vouchers/:id | Update voucher |
| DELETE | /vouchers/:id | Delete voucher |
| GET | /banners | Get active banners |
| POST | /banners | Create banner (Admin) |

## Flash Sale Flow

```
1. Admin/Seller creates flash sale
   ↓
2. Schedule: starts_at → ends_at
   ↓
3. Status: SCHEDULED → ACTIVE (auto at starts_at)
   ↓
4. Users can purchase during ACTIVE period
   ↓
5. Stock decremented per purchase
   ↓
6. Status: ACTIVE → ENDED (auto at ends_at)
```

## Events

### Emitted
- `voucher.created`
- `voucher.used`
- `flash_sale.started`
- `flash_sale.ended`

### Received
- `order.created` → Validate and apply voucher
- `order.cancelled` → Release voucher usage

## Configuration

```env
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/promotion_db
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Local Development

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run start:promotion
```

## Related Documentation

- [API Reference](../../04-API-REFERENCE/endpoints/vouchers.md)
- [Database Schema](../../05-DATABASE/promotion-db/README.md)