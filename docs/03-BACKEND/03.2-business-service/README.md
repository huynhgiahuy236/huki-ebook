# 🏢 Business Service

**Port:** 3002
**Database:** PostgreSQL (business_db)

## Overview

The Business Service manages business registration, store management, and team membership for the marketplace.

## Responsibilities

- Business registration with mock registry verification
- Admin approval workflow
- Store management (multi-store per business)
- Member invitation and role management
- Store-level statistics

## Tech Stack

- **Framework:** NestJS
- **Database:** PostgreSQL with Prisma
- **Events:** RabbitMQ via EventEmitter

## Architecture

```
┌─────────────────────────────────────────────┐
│           Business Service (3002)           │
├─────────────────────────────────────────────┤
│                                             │
│   ┌─────────────┐    ┌─────────────┐       │
│   │  Business   │    │   Store     │       │
│   │  Module     │───▶│  Module     │       │
│   └─────────────┘    └─────────────┘       │
│          │                  │               │
│          ▼                  ▼               │
│   ┌─────────────────────────────┐          │
│   │         Member Module       │          │
│   └─────────────────────────────┘          │
│          │                                  │
│          ▼                                  │
│   ┌─────────────────────────────┐          │
│   │   Prisma + EventEmitter     │          │
│   └─────────────────────────────┘          │
│          │                                  │
│          ▼                                  │
│   ┌─────────────────────────────┐          │
│   │      PostgreSQL DB          │          │
│   └─────────────────────────────┘          │
│                                             │
└─────────────────────────────────────────────┘
```

## Database Schema

### Businesses Table

```sql
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  tax_code VARCHAR(50) UNIQUE,
  business_type VARCHAR(50) DEFAULT 'INDIVIDUAL', -- INDIVIDUAL, PARTNERSHIP, CORPORATION, LLC
  status VARCHAR(50) DEFAULT 'PENDING_APPROVAL', -- PENDING_APPROVAL, APPROVED, REJECTED, SUSPENDED

  -- Mock Registry
  registry_number VARCHAR(100),
  registry_verified_at TIMESTAMP,

  -- Approval
  approved_at TIMESTAMP,
  approved_by UUID,
  rejected_at TIMESTAMP,
  rejected_by UUID,
  rejection_reason TEXT,

  owner_id UUID NOT NULL, -- Reference to identity_db.users

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
```

### Stores Table

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
  is_active BOOLEAN DEFAULT TRUE,
  category_ids TEXT[], -- Array of category IDs

  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  total_products INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  rating FLOAT DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
```

### Members Table

```sql
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role VARCHAR(50) DEFAULT 'CONTENT_STAFF', -- OWNER, MANAGER, ORDER_STAFF, CONTENT_STAFF, FINANCE_STAFF
  status VARCHAR(50) DEFAULT 'PENDING_INVITATION',
  invited_at TIMESTAMP,
  invited_by UUID,
  accepted_at TIMESTAMP,
  permissions JSONB DEFAULT '[]',

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,

  UNIQUE(business_id, user_id)
);
```

### Invitations Table

```sql
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL,
  token UUID UNIQUE DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL,
  invited_by UUID NOT NULL,
  role VARCHAR(50) DEFAULT 'CONTENT_STAFF',
  status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, ACCEPTED, EXPIRED, CANCELLED
  expires_at TIMESTAMP NOT NULL, -- 7 days
  accepted_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Roles & Permissions

### Business Roles

| Role | Permissions |
|------|-------------|
| **OWNER** | All permissions, can manage business & members |
| **MANAGER** | Manage stores, members (except owner), orders |
| **ORDER_STAFF** | Manage orders only |
| **CONTENT_STAFF** | Manage books/products only |
| **FINANCE_STAFF** | View financial reports, withdrawals |

### Permission Matrix

| Action | OWNER | MANAGER | ORDER | CONTENT | FINANCE |
|--------|-------|---------|-------|---------|---------|
| View Business | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit Business | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create Store | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit Store | ✅ | ✅ | ❌ | ❌ | ❌ |
| Invite Members | ✅ | ✅ | � | ❌ | ❌ |
| Manage Books | ✅ | ✅ | ❌ | ✅ | ❌ |
| Manage Orders | ✅ | ✅ | ✅ | ❌ | ❌ |
| View Finance | ✅ | ✅ | ❌ | ❌ | ✅ |

## Workflows

### Business Registration Flow

```
1. User submits business info
   ↓
2. Business created with status=PENDING_APPROVAL
   ↓
3. Owner added as MEMBER with role=OWNER
   ↓
4. Mock Registry Verification
   ↓
5. If valid → status=APPROVED
   If invalid → status=REJECTED
   ↓
6. Business can now create stores
```

### Member Invitation Flow

```
1. OWNER/MANAGER invites email
   ↓
2. Invitation created with 7-day expiry
   ↓
3. Email sent with invitation token
   ↓
4. User accepts invitation
   ↓
5. Member created with status=ACTIVE
   ↓
6. Business events emitted
```

## API Endpoints

See [Business API Reference](../../04-API-REFERENCE/endpoints/business.md) for details.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /businesses | Register business |
| GET | /businesses/my | Get my business |
| GET | /businesses/:id | Get business details |
| PATCH | /businesses/:id | Update business |
| POST | /businesses/:id/stores | Create store |
| GET | /businesses/:id/stores | List stores |
| POST | /businesses/:id/members/invite | Invite member |
| GET | /businesses/:id/members | List members |
| POST | /invitations/:token/accept | Accept invitation |

## Events Emitted

| Event | When |
|-------|------|
| `business.registered` | New business registered |
| `business.approved` | Business approved by admin |
| `business.rejected` | Business rejected |
| `store.created` | New store created |
| `store.approved` | Store approved |
| `member.invited` | New member invited |
| `member.joined` | Member accepted invitation |
| `member.removed` | Member removed |

## Configuration

```env
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/business_db
RABBITMQ_URL=amqp://guest:guest123@localhost:5672
JWT_SECRET=shared-secret-key
```

## Local Development

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

## Related Documentation

- [API Reference](../../04-API-REFERENCE/endpoints/business.md)
- [Database Schema](../../05-DATABASE/business-db/README.md)