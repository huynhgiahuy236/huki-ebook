# 🔬 Microservices Design

Thiết kế chi tiết từng microservice.

## 📦 Service Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      MICROSERVICES ARCHITECTURE                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                      API GATEWAY                           │  │
│  │   Port: 3000                                              │  │
│  │   - Authentication (JWT)                                  │  │
│  │   - Routing                                               │  │
│  │   - Rate Limiting                                         │  │
│  │   - Request/Response Transform                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│    ┌─────────────┬───────────┴───────────┬─────────────┐        │
│    │             │                       │             │        │
│    ▼             ▼                       ▼             ▼        │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐     │
│ │Identity │ │Business │ │Commerce │ │Shipping │ │Community│     │
│ │Service  │ │Service  │ │Service  │ │Service  │ │Service  │     │
│ │         │ │         │ │         │ │         │ │         │     │
│ │Port:3001│ │Port:3002│ │Port:3003│ │Port:3004│ │Port:3005│     │
│ │         │ │         │ │         │ │         │ │         │     │
│ │Postgres │ │Postgres │ │Postgres │ │Postgres │ │MongoDB  │     │
│ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘     │
│      │           │           │           │           │           │
│      └───────────┴───────────┼───────────┴───────────┘           │
│                              │                                   │
│                      ┌───────▼───────┐                          │
│                      │   RABBITMQ    │                          │
│                      │  Message Bus  │                          │
│                      └───────────────┘                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 🔐 Identity Service

### Overview

| Property | Value |
|----------|-------|
| Port | 3001 |
| Database | PostgreSQL (identity_db) |
| Protocol | REST + Events |

### Responsibilities

- User registration and authentication
- JWT token generation and validation
- Session management
- Password hashing and reset
- System role management

### Module Structure

```
src/
├── identity/
│   ├── controllers/
│   │   ├── auth.controller.ts      # Auth endpoints
│   │   └── user.controller.ts      # User management
│   │
│   ├── services/
│   │   ├── auth.service.ts         # Auth logic
│   │   ├── user.service.ts         # User CRUD
│   │   ├── token.service.ts        # JWT operations
│   │   └── session.service.ts      # Session management
│   │
│   ├── entities/
│   │   ├── user.entity.ts
│   │   └── auth-session.entity.ts
│   │
│   ├── dto/
│   │   ├── auth/
│   │   │   ├── register.dto.ts
│   │   │   ├── login.dto.ts
│   │   │   └── refresh-token.dto.ts
│   │   └── user/
│   │       └── update-user.dto.ts
│   │
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   ├── jwt-refresh.guard.ts
│   │   └── roles.guard.ts
│   │
│   ├── strategies/
│   │   ├── jwt.strategy.ts
│   │   └── local.strategy.ts
│   │
│   └── events/
│       ├── user-registered.event.ts
│       └── user-blocked.event.ts
│
├── common/
│   ├── decorators/
│   ├── filters/
│   ├── interceptors/
│   └── guards/
│
└── main.ts
```

### API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /auth/register | Register new user | No |
| POST | /auth/login | Login | No |
| POST | /auth/logout | Logout | Yes |
| POST | /auth/refresh | Refresh tokens | Refresh |
| GET | /auth/me | Get current user | Yes |
| PATCH | /users/profile | Update profile | Yes |
| POST | /auth/forgot-password | Forgot password | No |
| POST | /auth/reset-password | Reset password | Token |

### Database Schema

```sql
-- users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    avatar VARCHAR(500),
    role VARCHAR(50) NOT NULL DEFAULT 'USER',
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    email_verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- auth_sessions table
CREATE TABLE auth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    refresh_token_hash VARCHAR(255) NOT NULL,
    user_agent VARCHAR(500),
    ip_address VARCHAR(100),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    revoked_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX idx_sessions_refresh_token ON auth_sessions(refresh_token_hash);
```

---

## 🏪 Business Service

### Overview

| Property | Value |
|----------|-------|
| Port | 3002 |
| Database | PostgreSQL (business_db) |
| Protocol | REST + Events |

### Responsibilities

- Business registration and verification
- Store management
- Business member management
- Mock registry verification

### Module Structure

```
src/
├── business/
│   ├── controllers/
│   │   ├── business.controller.ts
│   │   ├── store.controller.ts
│   │   └── member.controller.ts
│   │
│   ├── services/
│   │   ├── business.service.ts
│   │   ├── store.service.ts
│   │   ├── member.service.ts
│   │   └── registry.service.ts
│   │
│   ├── entities/
│   │   ├── business.entity.ts
│   │   ├── store.entity.ts
│   │   ├── business-member.entity.ts
│   │   └── mock-registry.entity.ts
│   │
│   └── dto/
│       ├── business/
│       ├── store/
│       └── member/
│
└── main.ts
```

### Database Schema

```sql
-- businesses table
CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enterprise_code VARCHAR(50) UNIQUE NOT NULL,
    tax_code VARCHAR(50) UNIQUE NOT NULL,
    legal_name VARCHAR(255) NOT NULL,
    representative_name VARCHAR(255),
    head_office_address TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    verified_registry_id UUID,
    created_by_user_id UUID NOT NULL,
    approved_at TIMESTAMP,
    approved_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- stores table
CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id),
    store_name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    logo_url VARCHAR(500),
    banner_url VARCHAR(500),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    address TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- business_members table
CREATE TABLE business_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id),
    user_id UUID NOT NULL,
    role VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(business_id, user_id)
);

-- mock_registry table
CREATE TABLE mock_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enterprise_code VARCHAR(50) UNIQUE NOT NULL,
    tax_code VARCHAR(50) UNIQUE NOT NULL,
    legal_name VARCHAR(255) NOT NULL,
    enterprise_type VARCHAR(100),
    head_office_address TEXT,
    province VARCHAR(100),
    legal_representative_name VARCHAR(255),
    registration_date DATE,
    registration_authority VARCHAR(255),
    business_status VARCHAR(50),
    is_mock BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🛒 Commerce Service

### Overview

| Property | Value |
|----------|-------|
| Port | 3003 |
| Database | PostgreSQL (commerce_db) |
| Protocol | REST + Events |

### Responsibilities

- Book catalog management
- Inventory management
- Cart and checkout
- Order processing
- Payment integration

### Module Structure

```
src/
├── catalog/
│   ├── controllers/
│   │   ├── book.controller.ts
│   │   ├── category.controller.ts
│   │   └── author.controller.ts
│   │
│   ├── services/
│   │   ├── book.service.ts
│   │   ├── category.service.ts
│   │   └── inventory.service.ts
│   │
│   └── entities/
│       ├── book.entity.ts
│       ├── physical-book-details.entity.ts
│       ├── digital-book-details.entity.ts
│       ├── category.entity.ts
│       └── author.entity.ts
│
├── cart/
│   ├── controllers/
│   │   └── cart.controller.ts
│   │
│   └── services/
│       └── cart.service.ts
│
├── checkout/
│   ├── controllers/
│   │   └── checkout.controller.ts
│   │
│   └── services/
│       ├── checkout.service.ts
│       └── shipping-quote.service.ts
│
├── order/
│   ├── controllers/
│   │   └── order.controller.ts
│   │
│   └── services/
│       ├── order.service.ts
│       ├── seller-order.service.ts
│       └── order-item.service.ts
│
├── payment/
│   ├── controllers/
│   │   └── payment.controller.ts
│   │
│   ├── services/
│   │   └── payment.service.ts
│   │
│   └── providers/
│       ├── payos.service.ts
│       └── payments.service.ts
│
└── main.ts
```

### Database Schema (Key Tables)

```sql
-- books table
CREATE TABLE books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) NOT NULL,
    isbn VARCHAR(20),
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category_id UUID,
    author_id UUID,
    publisher_id UUID,
    cover_url VARCHAR(500),
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(store_id, slug)
);

-- physical_book_details
CREATE TABLE physical_book_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID UNIQUE NOT NULL REFERENCES books(id),
    stock INT NOT NULL DEFAULT 0,
    reserved INT NOT NULL DEFAULT 0,
    weight DECIMAL(5,2),
    length DECIMAL(5,2),
    width DECIMAL(5,2),
    height DECIMAL(5,2),
    physical_enabled BOOLEAN DEFAULT FALSE,
    low_stock_threshold INT DEFAULT 10,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- digital_book_details
CREATE TABLE digital_book_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID UNIQUE NOT NULL REFERENCES books(id),
    source_pdf_key VARCHAR(500),
    preview_pdf_key VARCHAR(500),
    epub_key VARCHAR(500),
    digital_enabled BOOLEAN DEFAULT FALSE,
    allow_online_read BOOLEAN DEFAULT TRUE,
    allow_download BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    discount_total DECIMAL(12,2) DEFAULT 0,
    shipping_total DECIMAL(10,2) DEFAULT 0,
    grand_total DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(50),
    payment_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    order_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    shipping_address JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- seller_orders table
CREATE TABLE seller_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    seller_order_code VARCHAR(50) UNIQUE NOT NULL,
    store_id UUID NOT NULL,
    business_id UUID,
    items_subtotal DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    shipping_fee DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    fulfillment_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- order_items table
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_order_id UUID NOT NULL REFERENCES seller_orders(id),
    book_id UUID NOT NULL,
    book_title_snapshot VARCHAR(500) NOT NULL,
    cover_snapshot_url VARCHAR(500),
    format VARCHAR(50) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    subtotal DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🚚 Shipping Service

### Overview

| Property | Value |
|----------|-------|
| Port | 3004 |
| Database | PostgreSQL (shipping_db) |
| Protocol | REST + Events |

### Responsibilities

- Shipping fee calculation
- Shipment tracking
- Delivery staff assignment
- Delivery status management

### Database Schema

```sql
-- shipments table
CREATE TABLE shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_code VARCHAR(50) UNIQUE NOT NULL,
    seller_order_id UUID NOT NULL,
    delivery_staff_id UUID,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    pickup_address TEXT,
    delivery_address TEXT,
    shipping_fee DECIMAL(10,2),
    estimated_delivery DATE,
    actual_delivery TIMESTAMP,
    delivered_at TIMESTAMP,
    failure_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- delivery_staff table
CREATE TABLE delivery_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    current_shipments INT DEFAULT 0,
    max_shipments INT DEFAULT 10,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 💬 Community Service

### Overview

| Property | Value |
|----------|-------|
| Port | 3005 |
| Database | MongoDB (community_db) |
| Protocol | REST + WebSocket + Events |

### Responsibilities

- Forum posts and comments
- Real-time chat
- Reviews and ratings
- Notifications
- Content moderation

### Collections

```javascript
// forums collection
{
    _id: ObjectId,
    title: String,
    content: String,
    author_id: UUID,
    author_name: String,
    category: String,
    tags: [String],
    status: String, // ACTIVE, HIDDEN, DELETED
    view_count: Number,
    like_count: Number,
    comment_count: Number,
    created_at: Date,
    updated_at: Date
}

// conversations collection
{
    _id: ObjectId,
    user_id: UUID,
    business_id: UUID,
    store_id: UUID,
    context_type: String, // BOOK, ORDER
    context_id: UUID,
    status: String, // ACTIVE, CLOSED
    last_message_at: Date,
    created_at: Date,
    updated_at: Date
}

// messages collection
{
    _id: ObjectId,
    conversation_id: ObjectId,
    sender_type: String, // USER, BUSINESS
    sender_user_id: UUID,
    sender_business_id: UUID,
    message_type: String, // TEXT, IMAGE, SYSTEM
    content: String,
    attachments: [{
        type: String,
        url: String,
        public_id: String
    }],
    status: String, // SENT, DELIVERED, READ
    created_at: Date
}

// notifications collection
{
    _id: ObjectId,
    recipient_user_id: UUID,
    recipient_context_type: String, // USER, BUSINESS, DELIVERY, ADMIN
    type: String,
    title: String,
    message: String,
    payload: Object,
    is_read: Boolean,
    read_at: Date,
    expires_at: Date,
    created_at: Date
}
```

---

## 🎫 Promotion Service

### Overview

| Property | Value |
|----------|-------|
| Port | 3007 |
| Database | PostgreSQL (promotion_db) |
| Protocol | REST + Events |

### Responsibilities

- Voucher management
- Promotion campaigns
- Book discounts
- Discount allocation

### Database Schema

```sql
-- vouchers table
CREATE TABLE vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_code VARCHAR(50) UNIQUE NOT NULL,
    owner_type VARCHAR(50) NOT NULL, -- PLATFORM, BUSINESS, STORE
    owner_id UUID,
    discount_type VARCHAR(50) NOT NULL, -- FIXED, PERCENT
    discount_value DECIMAL(10,2) NOT NULL,
    max_discount_amount DECIMAL(10,2),
    min_order_amount DECIMAL(10,2),
    usage_limit INT,
    per_user_limit INT DEFAULT 1,
    starts_at TIMESTAMP NOT NULL,
    ends_at TIMESTAMP NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    stacking_policy VARCHAR(50) DEFAULT 'ALLOWED',
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- voucher_usages table
CREATE TABLE voucher_usages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_id UUID NOT NULL REFERENCES vouchers(id),
    user_id UUID NOT NULL,
    order_id UUID,
    discount_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'RESERVED',
    reserved_at TIMESTAMP DEFAULT NOW(),
    consumed_at TIMESTAMP,
    released_at TIMESTAMP
);

-- book_discounts table
CREATE TABLE book_discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID NOT NULL,
    discount_type VARCHAR(50) NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL,
    starts_at TIMESTAMP NOT NULL,
    ends_at TIMESTAMP NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔗 Inter-Service Communication

### Event-Driven (RabbitMQ)

```typescript
// Event Envelope
interface DomainEvent {
  eventId: string;
  eventType: string;
  occurredAt: Date;
  producer: string;
  aggregateId: string;
  payload: Record<string, any>;
  version: number;
}

// Example: Order Created Event
interface OrderCreatedEvent extends DomainEvent {
  eventType: 'ORDER_CREATED';
  payload: {
    orderId: string;
    userId: string;
    grandTotal: number;
    paymentMethod: string;
    sellerOrders: Array<{
      sellerOrderId: string;
      storeId: string;
      items: Array<{ bookId: string; quantity: number; format: string }>;
    }>;
  };
}
```

### HTTP (Internal)

```typescript
// Example: Commerce calls Business to verify Store
// POST http://business-service:3002/internal/stores/{storeId}/verify
```
