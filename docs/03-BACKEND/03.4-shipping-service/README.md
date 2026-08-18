# 🚚 Shipping Service

**Port:** 3004
**Database:** PostgreSQL (shipping_db)

## Overview

The Shipping Service manages shipments, delivery tracking, and delivery staff for the marketplace.

## Responsibilities

- Shipment creation and tracking
- Shipping fee calculation (via carrier API)
- Delivery status updates
- Delivery staff management
- Address book management

## Tech Stack

- **Framework:** NestJS
- **Database:** PostgreSQL with Prisma
- **Carrier Integration:** GHTK (Giao Hang Tiet Kiem)
- **Events:** RabbitMQ

## Architecture

```
┌─────────────────────────────────────────────┐
│           Shipping Service (3004)           │
├─────────────────────────────────────────────┤
│                                             │
│   ┌─────────────┐    ┌─────────────┐       │
│   │ Shipment    │───▶│  Address    │       │
│   │  Module     │    │  Module     │       │
│   └─────────────┘    └─────────────┘       │
│          │                  │               │
│          ▼                  ▼               │
│   ┌─────────────┐    ┌─────────────┐       │
│   │  Delivery   │    │  Tracking   │       │
│   │  Staff      │    │  Timeline   │       │
│   └─────────────┘    └─────────────┘       │
│          │                                  │
│          ▼                                  │
│   ┌─────────────────────────────┐          │
│   │    Carrier API (GHTK)       │          │
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

### Shipments Table

```sql
CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_order_id UUID UNIQUE NOT NULL, -- From Commerce Service
  tracking_number VARCHAR(100) UNIQUE,
  carrier VARCHAR(50) DEFAULT 'GHTK',
  status VARCHAR(50) DEFAULT 'PENDING',
  -- PENDING, PICKED_UP, IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED, RETURNED, CANCELLED, FAILED

  -- Address
  receiver_name VARCHAR(255) NOT NULL,
  receiver_phone VARCHAR(20) NOT NULL,
  address TEXT NOT NULL,
  province VARCHAR(100),
  district VARCHAR(100),
  ward VARCHAR(100),

  -- Fees
  shipping_fee FLOAT NOT NULL,
  cod_fee FLOAT DEFAULT 0,
  weight FLOAT,

  -- Timeline
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
CREATE INDEX idx_shipments_tracking_number ON shipments(tracking_number);
```

### Addresses Table

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

### Delivery Staff Table

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

### Delivery Logs Table

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

CREATE INDEX idx_delivery_logs_shipment_id ON delivery_logs(shipment_id);
CREATE INDEX idx_delivery_logs_staff_id ON delivery_logs(staff_id);
```

## Shipment Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                    Shipment Lifecycle                        │
└─────────────────────────────────────────────────────────────┘

   Order Created (from Commerce Service)
        │
        ▼
   ┌─────────┐
   │ PENDING │  ← Shipment record created
   └────┬────┘
        │
        ▼
   ┌──────────┐
   │PICKED_UP │  ← Seller hands package to carrier
   └────┬─────┘
        │
        ▼
   ┌──────────┐
   │IN_TRANSIT│  ← Package moving between hubs
   └────┬─────┘
        │
        ▼
   ┌────────────────┐
   │OUT_FOR_DELIVERY│  ← Out for last-mile delivery
   └────┬───────────┘
        │
        ├──────────────┐
        ▼              ▼
   ┌──────────┐  ┌──────────┐
   │DELIVERED │  │ FAILED   │  ← Failed delivery attempts
   └──────────┘  └────┬─────┘
                      │
                      ▼
                ┌──────────┐
                │ RETURNED │  ← Returned to seller
                └──────────┘
```

## Carrier Integration (GHTK)

### Fee Calculation

```typescript
async calculateShippingFee(
  province: string,
  district: string,
  weight: number,
): Promise<number> {
  // Call GHTK API
  const response = await fetch('https://api.ghtk.vn/services/calculate_fee', {
    method: 'POST',
    body: JSON.stringify({
      pick_province: 'Ho Chi Minh',
      pick_district: 'District 1',
      province,
      district,
      weight, // grams
      value: 0,
    }),
  });

  const data = await response.json();
  return data.data.fee;
}
```

### Tracking Webhook

GHTK sends webhook updates on status changes:
- Pickup confirmed
- In transit updates
- Out for delivery
- Delivered / Failed

## API Endpoints

See [Shipping API](../../04-API-REFERENCE/endpoints/shipping.md) for details.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /shipping/fee | Calculate shipping fee |
| POST | /shipping/address | Save address |
| GET | /shipping/address | List user addresses |
| DELETE | /shipping/address/:id | Delete address |
| GET | /shipments | List user shipments |
| GET | /shipments/:id | Get shipment details |

## Events

### Received
- `order.created` (from Commerce Service) - Create shipment
- `order.cancelled` - Cancel shipment
- `order.refunded` - Initiate return

### Emitted
- `shipment.created` - New shipment
- `shipment.picked_up` - Picked up by carrier
- `shipment.in_transit` - In transit
- `shipment.delivered` - Delivered
- `shipment.failed` - Failed delivery
- `shipment.returned` - Returned

## Configuration

```env
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/shipping_db

# GHTK API
GHTK_TOKEN=your-ghtk-token
GHTK_PICKUP_PROVINCE=Ho Chi Minh
GHTK_PICKUP_DISTRICT=District 1

# Webhook
SHIPPING_WEBHOOK_SECRET=your-webhook-secret
```

## Local Development

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run start:shipping
```

## Testing

Mock carrier API for development:
```typescript
// Mock GHTK responses
const mockFee = { fee: 30000, delivery_time: '2-3 days' };
const mockTracking = {
  status: 'IN_TRANSIT',
  location: 'Binh Thanh Hub',
  time: new Date(),
};
```

## Related Documentation

- [API Reference](../../04-API-REFERENCE/endpoints/shipping.md)
- [Database Schema](../../05-DATABASE/shipping-db/README.md)