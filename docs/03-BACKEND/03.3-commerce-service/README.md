# 🛒 Commerce Service

**Port:** 3003
**Database:** PostgreSQL (commerce_db)

## Overview

The Commerce Service handles books catalog, shopping cart, orders, and payment processing for the marketplace.

## Responsibilities

- Books catalog (Physical + Digital)
- Categories, Authors, Publishers
- Shopping cart (multi-store)
- Checkout and orders
- Payment processing (PayOS, COD)
- Digital book library
- Inventory management

## Tech Stack

- **Framework:** NestJS
- **Database:** PostgreSQL with Prisma
- **Cache:** Redis (cart caching)
- **Storage:** Cloudinary (covers), Cloudflare R2 (PDFs)
- **Payment:** PayOS, COD
- **Events:** RabbitMQ via EventEmitter

## Architecture

```
┌─────────────────────────────────────────────┐
│          Commerce Service (3003)            │
├─────────────────────────────────────────────┤
│                                             │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐     │
│   │Catalog  │ │ Books   │ │  Cart   │     │
│   │ Module  │ │ Module  │ │ Module  │     │
│   └─────────┘ └─────────┘ └─────────┘     │
│        │           │           │           │
│        ▼           ▼           ▼           │
│   ┌─────────┐ ┌─────────────────┐         │
│   │ Search  │ │   Orders Module  │         │
│   └─────────┘ └─────────────────┘         │
│                   │                         │
│                   ▼                         │
│         ┌──────────────────┐               │
│         │ Payment Module   │               │
│         │  - PayOS         │               │
│         │  - COD           │               │
│         └──────────────────┘               │
│                   │                         │
│                   ▼                         │
│         ┌──────────────────┐               │
│         │  Cloudinary + R2 │               │
│         └──────────────────┘               │
│                                             │
└─────────────────────────────────────────────┘
```

## Database Schema

### Books Table

```sql
CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL, -- Reference to business_db.stores
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(500) UNIQUE NOT NULL,
  description TEXT,
  price FLOAT NOT NULL,
  sale_price FLOAT,
  format VARCHAR(20) DEFAULT 'PHYSICAL', -- PHYSICAL, DIGITAL, BOTH

  -- Physical details
  stock INTEGER DEFAULT 0,
  weight FLOAT,
  dimensions VARCHAR(100),
  page_count INTEGER,

  -- Digital details
  pdf_key VARCHAR(500),        -- R2 key
  epub_key VARCHAR(500),       -- R2 key
  preview_pdf_key VARCHAR(500), -- R2 key for preview

  -- Media
  cover_image TEXT,
  preview_images TEXT[],

  status VARCHAR(20) DEFAULT 'DRAFT', -- DRAFT, PUBLISHED, OUT_OF_STOCK, DISCONTINUED

  category_id UUID,
  author_id UUID,
  publisher_id UUID,

  -- Stats
  sold_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  rating FLOAT DEFAULT 0,
  review_count INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_books_store_id ON books(store_id);
CREATE INDEX idx_books_status ON books(status);
CREATE INDEX idx_books_slug ON books(slug);
```

### Cart & Cart Items

```sql
CREATE TABLE carts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  book_id UUID NOT NULL,
  quantity INTEGER DEFAULT 1,
  price FLOAT, -- Snapshot of price
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(cart_id, book_id)
);
```

### Orders

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, CONFIRMED, PREPARING, SHIPPED, DELIVERED, CANCELLED, REFUNDED
  subtotal FLOAT NOT NULL,
  shipping_fee FLOAT DEFAULT 0,
  discount_amount FLOAT DEFAULT 0,
  total_amount FLOAT NOT NULL,
  shipping_name VARCHAR(255),
  shipping_phone VARCHAR(20),
  shipping_address TEXT,
  shipping_note TEXT,
  payment_method VARCHAR(20), -- PAYOS, COD
  payment_status VARCHAR(20) DEFAULT 'PENDING',
  voucher_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Each order can be split into multiple seller orders
CREATE TABLE seller_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  store_id UUID NOT NULL,
  store_name VARCHAR(255), -- Snapshot
  shipping_fee FLOAT,
  status VARCHAR(20) DEFAULT 'PENDING',
  tracking_number VARCHAR(100),
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_order_id UUID NOT NULL REFERENCES seller_orders(id) ON DELETE CASCADE,
  book_id UUID NOT NULL,
  book_title VARCHAR(500), -- Snapshot
  quantity INTEGER NOT NULL,
  unit_price FLOAT NOT NULL -- Snapshot
);
```

### Payments

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id),
  amount DECIMAL(14,2) NOT NULL,
  method VARCHAR(20), -- ONLINE_PAYMENT, COD
  provider VARCHAR(20), -- PAYOS, COD
  status VARCHAR(30), -- PENDING, PROCESSING, SUCCEEDED, EXPIRED, REFUND_PENDING...
  transaction_id VARCHAR(100),
  payos_order_id VARCHAR(100),
  payos_payment_link_id VARCHAR(100),
  payos_return_code VARCHAR(50),
  checkout_url TEXT,
  qr_code TEXT,
  expires_at TIMESTAMP,
  callback_data JSONB,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Book Access (Digital Library)

```sql
CREATE TABLE book_accesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  book_id UUID NOT NULL,
  order_id UUID NOT NULL,
  progress INTEGER DEFAULT 0, -- Reading progress %
  last_read_at TIMESTAMP,
  access_key VARCHAR(500), -- Signed URL for R2
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, book_id)
);
```

## Module Structure

```
commerce-service/src/modules/
├── catalog-search/      # Search catalog
├── categories/          # Categories CRUD
├── authors/             # Authors CRUD
├── publishers/          # Publishers CRUD
├── books/               # Books CRUD, Publishing, Uploads
│   ├── book-publishing.controller.ts
│   ├── book-uploads.controller.ts
│   ├── books.controller.ts
│   ├── digital-books.controller.ts
│   └── physical-books.controller.ts
├── cart/                # Cart service
├── orders/              # Orders, Checkout
│   ├── checkout.controller.ts
│   ├── orders.controller.ts
│   ├── seller-orders.controller.ts
│   └── inventory-reservation.service.ts
└── redis/               # Redis caching
```

## Key Features

### Multi-Store Cart

- Group items by store
- Different shipping fee per store
- Stock validation per store
- Digital book duplicate prevention
- Redis caching for performance

### Order Flow

```
1. Cart → Checkout Preview
   ↓
2. Calculate totals, shipping, discount
   ↓
3. Create Order (split by store → SellerOrder)
   ↓
4. Reserve inventory
   ↓
5. Payment (PayOS / COD)
   ↓
6. Order confirmed → Sellers notified
   ↓
7. Each seller processes their SellerOrder
   ↓
8. Ship + tracking → Delivered
```

### Book Publishing

- DRAFT → PUBLISHED workflow
- Cover image upload via Cloudinary
- PDF/EPUB upload via Cloudflare R2
- Preview generation
- Inventory management

### Inventory Reservation

- Reserve stock on order creation
- Release stock on order cancellation
- Decrement stock on delivery
- Inventory log for tracking

## API Endpoints

See [Cart API](../../04-API-REFERENCE/endpoints/cart.md), [Books API](../../04-API-REFERENCE/endpoints/books.md), [Orders API](../../04-API-REFERENCE/endpoints/orders.md) for details.

### Cart
- GET /cart - Get cart
- POST /cart/items - Add to cart
- PATCH /cart/items/:id - Update quantity
- DELETE /cart/items/:id - Remove

### Books
- GET /books - List books
- POST /books - Create book
- POST /books/:id/publish - Publish
- GET /books/:id/read - Get reading URL (Digital)

### Orders
- POST /orders - Create order
- GET /orders - List user orders
- POST /orders/:id/cancel - Cancel order
- GET /seller/orders - Seller view
- PATCH /seller/orders/:id/status - Update status

## Events Emitted

| Event | When |
|-------|------|
| `book.published` | Book published |
| `cart.updated` | Cart item added/removed |
| `order.created` | New order created |
| `order.paid` | Order payment received |
| `order.shipped` | Order shipped |
| `order.delivered` | Order delivered |
| `order.cancelled` | Order cancelled |
| `inventory.reserved` | Inventory reserved |
| `inventory.released` | Inventory released |

## External Services

- **Cloudinary:** Image storage (book covers, avatars)
- **Cloudflare R2:** PDF/EPUB storage
- **PayOS:** Online payment
- **GHTK:** Shipping (via Shipping Service)

## Configuration

```env
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/commerce_db
REDIS_HOST=localhost
REDIS_PORT=6379

CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx

R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=huki-ebooks

PAYOS_CLIENT_ID=xxx
PAYOS_API_KEY=xxx
PAYOS_CHECKSUM_KEY=xxx
```

## Local Development

```bash
npm install
npm run migration:commerce:run
npm run start:commerce
```

## Related Documentation

- [API Reference](../../04-API-REFERENCE/endpoints/cart.md)
- [Database Schema](../../05-DATABASE/commerce-db/README.md)
