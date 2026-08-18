# 🗄️ Business Database (business_db)

**Engine:** PostgreSQL
**ORM:** Prisma
**Service:** Business Service (3002)

## Overview

Stores business, store, and team member data.

## Tables

| Table | Purpose |
|-------|---------|
| businesses | Registered businesses |
| stores | Stores owned by businesses |
| members | Business team members |
| invitations | Pending member invitations |

## Schema

### businesses

```sql
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  tax_code VARCHAR(50) UNIQUE,
  business_type VARCHAR(50) DEFAULT 'INDIVIDUAL',
  -- INDIVIDUAL, PARTNERSHIP, CORPORATION, LLC

  status VARCHAR(50) DEFAULT 'PENDING_APPROVAL',
  -- PENDING_APPROVAL, APPROVED, REJECTED, SUSPENDED

  registry_number VARCHAR(100),
  registry_verified_at TIMESTAMP,

  approved_at TIMESTAMP,
  approved_by UUID,
  rejected_at TIMESTAMP,
  rejected_by UUID,
  rejection_reason TEXT,

  owner_id UUID NOT NULL, -- Ref to identity_db.users

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_businesses_owner_id ON businesses(owner_id);
CREATE INDEX idx_businesses_status ON businesses(status);
```

### stores

```sql
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  logo TEXT,
  banner TEXT,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  status VARCHAR(50) DEFAULT 'PENDING_APPROVAL',
  -- PENDING_APPROVAL, APPROVED, REJECTED, SUSPENDED, CLOSED
  is_active BOOLEAN DEFAULT TRUE,
  category_ids TEXT[],

  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  total_products INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  rating FLOAT DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_stores_business_id ON stores(business_id);
CREATE INDEX idx_stores_status ON stores(status);
CREATE INDEX idx_stores_slug ON stores(slug);
```

### members

```sql
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- Ref to identity_db.users
  role VARCHAR(50) DEFAULT 'CONTENT_STAFF',
  -- OWNER, MANAGER, ORDER_STAFF, CONTENT_STAFF, FINANCE_STAFF
  status VARCHAR(50) DEFAULT 'PENDING_INVITATION',
  -- PENDING_INVITATION, INVITATION_EXPIRED, ACTIVE, SUSPENDED

  invited_at TIMESTAMP,
  invited_by UUID,
  accepted_at TIMESTAMP,
  permissions JSONB DEFAULT '[]',

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,

  UNIQUE(business_id, user_id)
);

CREATE INDEX idx_members_business_id ON members(business_id);
CREATE INDEX idx_members_user_id ON members(user_id);
```

### invitations

```sql
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL,
  token UUID UNIQUE DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL,
  invited_by UUID NOT NULL,
  role VARCHAR(50) DEFAULT 'CONTENT_STAFF',
  status VARCHAR(50) DEFAULT 'PENDING',
  -- PENDING, ACCEPTED, EXPIRED, CANCELLED
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_token ON invitations(token);
```

## Relationships

```
businesses (1) ──< (N) stores
businesses (1) ──< (N) members
businesses (1) ──< (N) invitations
```

## Cross-Service References

- `stores.id` referenced by `books.store_id` (Commerce Service)
- `stores.id` referenced by `seller_orders.store_id` (Commerce Service)
- `owner_id`, `user_id` reference `users.id` (Identity Service)

## Notes

- Soft delete via `deleted_at`
- One user can own only one business (enforced in business logic)
- Multiple stores per business
- Member roles control permissions