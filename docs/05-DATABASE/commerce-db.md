# 🗄️ Commerce Database Schema

Chi tiết database schema cho Commerce Service.

## ERD Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                              BOOKS                                    │
├─────────────────────────────────────────────────────────────────────┤
│ id                    │ UUID (PK)                                    │
│ store_id              │ UUID (FK → stores.id) NOT NULL              │
│ title                 │ VARCHAR(500) NOT NULL                        │
│ slug                  │ VARCHAR(500) NOT NULL                         │
│ isbn                  │ VARCHAR(20)                                   │
│ description           │ TEXT                                          │
│ price                 │ DECIMAL(10,2) NOT NULL                       │
│ category_id           │ UUID (FK → categories.id)                    │
│ author_id             │ UUID (FK → authors.id)                      │
│ publisher_id          │ UUID (FK → publishers.id)                    │
│ cover_url             │ VARCHAR(500)                                  │
│ status                │ VARCHAR(50) NOT NULL DEFAULT 'DRAFT'         │
│ created_at            │ TIMESTAMP DEFAULT NOW()                       │
│ updated_at            │ TIMESTAMP DEFAULT NOW()                       │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
┌─────────────────────────────────────┐  ┌─────────────────────────────────────┐
│       PHYSICAL_BOOK_DETAILS         │  │       DIGITAL_BOOK_DETAILS           │
├─────────────────────────────────────┤  ├─────────────────────────────────────┤
│ id                    │ UUID (PK)   │  │ id                    │ UUID (PK)   │
│ book_id               │ UUID (FK)   │  │ book_id               │ UUID (FK)   │
│ stock                 │ INT DEFAULT 0│  │ source_pdf_key        │ VARCHAR(500)│
│ reserved              │ INT DEFAULT 0│  │ preview_pdf_key        │ VARCHAR(500)│
│ weight                │ DECIMAL(5,2)│  │ epub_key              │ VARCHAR(500)│
│ length                │ DECIMAL(5,2)│  │ digital_enabled       │ BOOLEAN     │
│ width                 │ DECIMAL(5,2)│  │ allow_online_read     │ BOOLEAN     │
│ height                │ DECIMAL(5,2)│  │ allow_download        │ BOOLEAN     │
│ physical_enabled     │ BOOLEAN      │  │ created_at            │ TIMESTAMP   │
│ low_stock_threshold   │ INT DEFAULT 10│ │ updated_at            │ TIMESTAMP   │
│ created_at            │ TIMESTAMP    │  └─────────────────────────────────────┘
│ updated_at            │ TIMESTAMP    │
└─────────────────────────────────────┘
```

## Tables

### books

```sql
-- Books table
CREATE TABLE books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) NOT NULL,
    isbn VARCHAR(20),
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    category_id UUID,
    author_id UUID,
    publisher_id UUID,
    cover_url VARCHAR(500),
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    view_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT books_store_fk FOREIGN KEY (store_id) REFERENCES stores(id),
    CONSTRAINT books_category_fk FOREIGN KEY (category_id) REFERENCES categories(id),
    CONSTRAINT books_author_fk FOREIGN KEY (author_id) REFERENCES authors(id),
    CONSTRAINT books_publisher_fk FOREIGN KEY (publisher_id) REFERENCES publishers(id),
    CONSTRAINT books_slug_unique UNIQUE (store_id, slug)
);

-- Indexes
CREATE INDEX idx_books_store ON books(store_id);
CREATE INDEX idx_books_category ON books(category_id);
CREATE INDEX idx_books_author ON books(author_id);
CREATE INDEX idx_books_status ON books(status);
CREATE INDEX idx_books_created ON books(created_at DESC);
CREATE INDEX idx_books_slug ON books(slug);
CREATE INDEX idx_books_isbn ON books(isbn) WHERE isbn IS NOT NULL;
CREATE INDEX idx_books_search ON books USING gin(
    to_tsvector('vietnamese', title || ' ' || COALESCE(description, ''))
);
```

### physical_book_details

```sql
-- Physical book inventory
CREATE TABLE physical_book_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID UNIQUE NOT NULL,
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    reserved INT NOT NULL DEFAULT 0 CHECK (reserved >= 0),
    weight DECIMAL(6,2),  -- grams
    length DECIMAL(6,2),  -- cm
    width DECIMAL(6,2),   -- cm
    height DECIMAL(6,2),  -- cm
    physical_enabled BOOLEAN DEFAULT FALSE,
    low_stock_threshold INT DEFAULT 10,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT physical_book_details_book_fk FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    CONSTRAINT physical_book_stock_check CHECK (reserved <= stock)
);

CREATE INDEX idx_physical_book_stock ON physical_book_details(stock);
```

### digital_book_details

```sql
-- Digital book files
CREATE TABLE digital_book_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID UNIQUE NOT NULL,
    source_pdf_key VARCHAR(500),  -- R2 object key for full PDF
    preview_pdf_key VARCHAR(500), -- R2 object key for preview (first 10%)
    epub_key VARCHAR(500),       -- R2 object key for EPUB
    digital_enabled BOOLEAN DEFAULT FALSE,
    allow_online_read BOOLEAN DEFAULT TRUE,
    allow_download BOOLEAN DEFAULT TRUE,
    file_size_bytes BIGINT,      -- File size
    page_count INT,              -- Number of pages
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT digital_book_details_book_fk FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);
```

### categories

```sql
-- Book categories
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    parent_id UUID REFERENCES categories(id),
    icon VARCHAR(100),
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);
```

### authors

```sql
-- Authors
CREATE TABLE authors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    bio TEXT,
    avatar_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_authors_slug ON authors(slug);
CREATE INDEX idx_authors_name ON authors(name);
```

### publishers

```sql
-- Publishers
CREATE TABLE publishers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    logo_url VARCHAR(500),
    website VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_publishers_slug ON publishers(slug);
```

### book_discounts

```sql
-- Book discounts
CREATE TABLE book_discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    discount_type VARCHAR(50) NOT NULL,  -- PERCENT, FIXED
    discount_value DECIMAL(10,2) NOT NULL,
    max_discount_amount DECIMAL(10,2),
    starts_at TIMESTAMP NOT NULL,
    ends_at TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT book_discount_book_fk FOREIGN KEY (book_id) REFERENCES books(id),
    CONSTRAINT book_discount_time_check CHECK (ends_at > starts_at)
);

CREATE INDEX idx_book_discounts_book ON book_discounts(book_id);
CREATE INDEX idx_book_discounts_active ON book_discounts(starts_at, ends_at, status);
```

### orders

```sql
-- Orders
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code VARCHAR(50) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id),
    subtotal DECIMAL(12,2) NOT NULL,
    discount_total DECIMAL(12,2) DEFAULT 0,
    shipping_total DECIMAL(10,2) DEFAULT 0,
    grand_total DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(50),
    payment_status VARCHAR(50) DEFAULT 'PENDING',
    order_status VARCHAR(50) DEFAULT 'PENDING',
    shipping_address JSONB NOT NULL,
    note TEXT,
    ip_address VARCHAR(100),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT
);

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_code ON orders(order_code);
CREATE INDEX idx_orders_status ON orders(order_status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
```

### seller_orders

```sql
-- Seller-specific orders (split from main order)
CREATE TABLE seller_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    seller_order_code VARCHAR(50) NOT NULL UNIQUE,
    store_id UUID NOT NULL REFERENCES stores(id),
    business_id UUID REFERENCES businesses(id),
    items_subtotal DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    shipping_fee DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    fulfillment_status VARCHAR(50) DEFAULT 'PENDING',
    confirmed_at TIMESTAMP,
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_seller_orders_order ON seller_orders(order_id);
CREATE INDEX idx_seller_orders_store ON seller_orders(store_id);
CREATE INDEX idx_seller_orders_status ON seller_orders(fulfillment_status);
CREATE INDEX idx_seller_orders_code ON seller_orders(seller_order_code);
```

### order_items

```sql
-- Order items (snapshot of book at purchase time)
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_order_id UUID NOT NULL REFERENCES seller_orders(id) ON DELETE CASCADE,
    book_id UUID NOT NULL,
    book_title_snapshot VARCHAR(500) NOT NULL,
    book_cover_snapshot_url VARCHAR(500),
    book_isbn_snapshot VARCHAR(20),
    format VARCHAR(50) NOT NULL,  -- PHYSICAL, DIGITAL
    unit_price DECIMAL(10,2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    subtotal DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_order_items_seller_order ON order_items(seller_order_id);
CREATE INDEX idx_order_items_book ON order_items(book_id);
```

### payments

```sql
-- Payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    payment_code VARCHAR(100) NOT NULL UNIQUE,
    provider VARCHAR(50) NOT NULL,  -- PAYOS, COD
    payment_method VARCHAR(50) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'VND',
    status VARCHAR(50) DEFAULT 'PENDING',
    transaction_id VARCHAR(255),
    provider_response JSONB,
    paid_at TIMESTAMP,
    failed_at TIMESTAMP,
    failure_reason TEXT,
    refund_id UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_provider ON payments(provider);
CREATE INDEX idx_payments_transaction ON payments(transaction_id) WHERE transaction_id IS NOT NULL;
```

### refunds

```sql
-- Refunds
CREATE TABLE refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id),
    refund_code VARCHAR(100) NOT NULL UNIQUE,
    amount DECIMAL(12,2) NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'PENDING',
    provider_refund_id VARCHAR(255),
    requested_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    processed_at TIMESTAMP,
    completed_at TIMESTAMP,
    failed_at TIMESTAMP,
    failure_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_refunds_payment ON refunds(payment_id);
CREATE INDEX idx_refunds_status ON refunds(status);
CREATE INDEX idx_refunds_code ON refunds(refund_code);
```

## Enums

```sql
CREATE TYPE book_status AS ENUM (
    'DRAFT',
    'PUBLISHED',
    'HIDDEN',
    'SUSPENDED',
    'ARCHIVED'
);

CREATE TYPE order_status AS ENUM (
    'PENDING',
    'CONFIRMED',
    'PREPARING',
    'SHIPPED',
    'DELIVERED',
    'COMPLETED',
    'CANCELLED'
);

CREATE TYPE payment_status AS ENUM (
    'PENDING',
    'PROCESSING',
    'SUCCEEDED',
    'FAILED',
    'REFUND_PENDING',
    'REFUNDED',
    'REFUND_FAILED',
    'CANCELLED'
);

CREATE TYPE fulfillment_status AS ENUM (
    'PENDING',
    'CONFIRMED',
    'PREPARING',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED'
);

CREATE TYPE book_format AS ENUM (
    'PHYSICAL',
    'DIGITAL'
);
```

## Sample Data

```sql
-- Categories
INSERT INTO categories (id, name, slug, parent_id, sort_order) VALUES
    (gen_random_uuid(), 'Programming', 'programming', NULL, 1),
    (gen_random_uuid(), 'Web Development', 'web-development', (SELECT id FROM categories WHERE slug='programming'), 1),
    (gen_random_uuid(), 'Mobile Development', 'mobile-development', (SELECT id FROM categories WHERE slug='programming'), 2),
    (gen_random_uuid(), 'Fiction', 'fiction', NULL, 2),
    (gen_random_uuid(), 'Business', 'business', NULL, 3);

-- Authors
INSERT INTO authors (id, name, slug, bio) VALUES
    (gen_random_uuid(), 'Robert C. Martin', 'robert-c-martin', 'Author of Clean Code'),
    (gen_random_uuid(), 'Douglas Crockford', 'douglas-crockford', 'Author of JavaScript: The Good Parts');
```
