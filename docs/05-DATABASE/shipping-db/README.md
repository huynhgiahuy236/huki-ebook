# 🗄️ Shipping Database (shipping_db)

**Engine:** PostgreSQL
**ORM:** Prisma
**Service:** Shipping Service (3004)

## Overview

Stores shipments, addresses, and delivery staff data.

## Tables

| Table | Purpose |
|-------|---------|
| shipments | Shipment tracking |
| addresses | User shipping addresses |
| delivery_staff | Delivery personnel |
| delivery_logs | Status update history |

## Schema

### shipments

```sql
CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_order_id UUID UNIQUE NOT NULL, -- From commerce_db
  tracking_number VARCHAR(100) UNIQUE,
  carrier VARCHAR(50) DEFAULT 'GHTK',

  status VARCHAR(50) DEFAULT 'PENDING',
  -- PENDING, PICKED_UP, IN_TRANSIT, OUT_FOR_DELIVERY,
  -- DELIVERED, RETURNED, CANCELLED, FAILED

  receiver_name VARCHAR(255) NOT NULL,
  receiver_phone VARCHAR(20) NOT NULL,
  address TEXT NOT NULL,
  province VARCHAR(100),
  district VARCHAR(100),
  ward VARCHAR(100),

  shipping_fee FLOAT NOT NULL,
  cod_fee FLOAT DEFAULT 0,
  weight FLOAT,

  picked_up_at TIMESTAMP,
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP,
  returned_at TIMESTAMP,
  failed_attempts INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_shipments_seller_order_id ON shipments(seller_order_id);
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_shipments_tracking ON shipments(tracking_number);
```

### addresses

```sql
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address TEXT NOT NULL,
  province VARCHAR(100) NOT NULL,
  district VARCHAR(100) NOT NULL,
  ward VARCHAR(100) NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_addresses_user_id ON addresses(user_id);
```

### delivery_staff

```sql
CREATE TABLE delivery_staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  status VARCHAR(50) DEFAULT 'ACTIVE',
  -- ACTIVE, INACTIVE, ON_LEAVE
  current_area VARCHAR(100),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### delivery_logs

```sql
CREATE TABLE delivery_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id UUID NOT NULL REFERENCES shipments(id),
  staff_id UUID NOT NULL,
  action VARCHAR(100),
  note TEXT,
  location VARCHAR(255),

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_delivery_logs_shipment ON delivery_logs(shipment_id);
CREATE INDEX idx_delivery_logs_staff ON delivery_logs(staff_id);
```

## Relationships

```
shipments (1) ──< (N) delivery_logs
```

## Cross-Service References

- `shipments.seller_order_id` → `commerce_db.seller_orders.id`
- `addresses.user_id` → `identity_db.users.id`

## Notes

- One shipment per seller_order
- Status timeline via delivery_logs
- Failed delivery attempts tracked
