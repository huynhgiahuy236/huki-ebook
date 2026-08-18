# �️ Commerce Database (commerce_db)

**Engine:** PostgreSQL
**ORM:** TypeORM
**Service:** Commerce Service (3003)

## Overview

Stores catalog, cart, orders, and payment data.

## Tables

| Table | Purpose |
|-------|---------|
| categories | Book categories (tree) |
| authors | Book authors |
| publishers | Book publishers |
| books | Book catalog |
| carts | User shopping carts |
| cart_items | Cart line items |
| orders | User orders |
| seller_orders | Per-store order splits |
| order_items | Order line items |
| payments | Payment records |
| book_accesses | Digital book library access |

## Schema (Key Tables)

### books

```sql
CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL, -- Ref to business_db.stores
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(500) UNIQUE NOT NULL,
  description TEXT,
  price FLOAT NOT NULL,
  sale_price FLOAT,
  format VARCHAR(20) DEFAULT 'PHYSICAL', -- PHYSICAL, DIGITAL, BOTH

  -- Physical
  stock INTEGER DEFAULT 0,
  weight FLOAT,
  dimensions VARCHAR(100),
  page_count INTEGER,

  -- Digital
  pdf_key VARCHAR(500),
  epub_key VARCHAR(500),
  preview_pdf_key VARCHAR(500),

  -- Media
  cover_image TEXT,
  preview_images TEXT[],

  status VARCHAR(20) DEFAULT 'DRAFT', -- DRAFT, PUBLISHED, OUT_OF_STOCK, DISCONTINUED

  category_id UUID,
  author_id UUID,
  publisher_id UUID,

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
CREATE INDEX idx_books_category_id ON books(category_id);
CREATE INDEX idx_books_slug ON books(slug);
```

### orders

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',
  -- PENDING, CONFIRMED, PREPARING, SHIPPED, DELIVERED, CANCELLED, REFUNDED

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

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_order_number ON orders(order_number);
```

### seller_orders

```sql
CREATE TABLE seller_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  store_id UUID NOT NULL,
  store_name VARCHAR(255), -- Snapshot
  shipping_fee FLOAT,
  status VARCHAR(20) DEFAULT 'PENDING',
  tracking_number VARCHAR(100),
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_seller_orders_order_id ON seller_orders(order_id);
CREATE INDEX idx_seller_orders_store_id ON seller_orders(store_id);
```

### payments

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID UNIQUE NOT NULL REFERENCES orders(id),
  amount FLOAT NOT NULL,
  method VARCHAR(20), -- PAYOS, COD
  status VARCHAR(20), -- PENDING, PAID, FAILED, REFUNDED, PARTIAL_REFUND
  transaction_id VARCHAR(100),
  payos_order_id VARCHAR(100),
  payos_return_code VARCHAR(50),
  callback_data JSONB,
  paid_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### book_accesses

```sql
CREATE TABLE book_accesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  book_id UUID NOT NULL,
  order_id UUID NOT NULL,
  progress INTEGER DEFAULT 0, -- Reading %
  last_read_at TIMESTAMP,
  access_key VARCHAR(500), -- R2 signed URL
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, book_id)
);

CREATE INDEX idx_book_accesses_user_id ON book_accesses(user_id);
CREATE INDEX idx_book_accesses_book_id ON book_accesses(book_id);
```

## Relationships

```
books ──< cart_items
books ──< order_items
books ──< book_accesses

orders (1) ──< (N) seller_orders (1) ──< (N) order_items
orders (1) ──< (1) payments

categories (tree via parent_id)
```

## Cross-Service References

- `books.store_id` → `business_db.stores.id`
- `seller_orders.store_id` → `business_db.stores.id`
- `orders.user_id` → `identity_db.users.id`

## Notes

- Order split by store (multi-vendor)
- Payment 1:1 with Order
- Digital books: `book_accesses` for library
- Price snapshots stored in order_items