# 📬 Events Overview

Tổng quan về Event-Driven Architecture.

## Event-Driven Architecture

HUKI EBOOK sử dụng RabbitMQ cho inter-service communication thông qua events.

```
┌──────────────┐    Event    ┌──────────────┐
│   Service A   │───────────▶│   RabbitMQ   │
│  (Producer)   │             │              │
└──────────────┘             │              │
                             │    Queue     │
┌──────────────┐             │              │
│   Service B   │◀───────────│   (Consumer) │
│  (Consumer)   │   Event    └──────────────┘
└──────────────┘
```

## Event Envelope

Tất cả events tuân theo format chuẩn:

```typescript
interface DomainEvent {
  // Metadata
  eventId: string;          // UUID v4
  eventType: string;       // e.g., "ORDER_CREATED"
  occurredAt: string;      // ISO 8601 timestamp
  producer: string;        // e.g., "commerce-service"
  version: number;         // Schema version (1, 2, ...)

  // Payload
  aggregateId: string;     // ID của aggregate gốc
  payload: Record<string, any>;  // Event data
}
```

## Example Events

### Order Created

```json
{
  "eventId": "evt-550e8400-e29b-41d4-a716-446655440000",
  "eventType": "ORDER_CREATED",
  "occurredAt": "2026-08-14T10:00:00.000Z",
  "producer": "commerce-service",
  "version": 1,
  "aggregateId": "order-uuid",
  "payload": {
    "orderId": "order-uuid",
    "orderCode": "HUK202608140001",
    "userId": "user-uuid",
    "grandTotal": 613100,
    "paymentMethod": "ONLINE_PAYMENT",
    "sellerOrders": [
      {
        "sellerOrderId": "so-uuid-1",
        "storeId": "store-uuid-1",
        "totalAmount": 313100,
        "items": [
          {
            "bookId": "book-uuid",
            "format": "DIGITAL",
            "quantity": 1,
            "unitPrice": 149000
          }
        ]
      }
    ]
  }
}
```

### Payment Succeeded

```json
{
  "eventId": "evt-660e8400-e29b-41d4-a716-446655440001",
  "eventType": "PAYMENT_SUCCEEDED",
  "occurredAt": "2026-08-14T10:05:00.000Z",
  "producer": "commerce-service",
  "version": 1,
  "aggregateId": "payment-uuid",
  "payload": {
    "paymentId": "payment-uuid",
    "orderId": "order-uuid",
    "amount": 613100,
    "provider": "PAYOS",
    "providerTransactionId": "vnp-123456"
  }
}
```

## Event Naming Convention

Format: `PREFIX_ACTION`

| Prefix | Source Service |
|--------|---------------|
| `USER_` | Identity Service |
| `BUSINESS_` | Business Service |
| `ORDER_` | Commerce Service |
| `PAYMENT_` | Commerce Service |
| `BOOK_` | Commerce Service |
| `SHIPMENT_` | Shipping Service |
| `FORUM_` | Community Service |
| `REVIEW_` | Community Service |
| `VOUCHER_` | Promotion Service |

## Event Categories

### 1. Identity Events

| Event | Trigger | Consumers |
|-------|---------|-----------|
| USER_REGISTERED | New user registration | Notification |
| USER_LOGGED_IN | User login | Analytics |
| USER_BLOCKED | Admin blocks user | All services |
| USER_UNBLOCKED | Admin unblocks user | All services |
| PASSWORD_CHANGED | User changes password | Notification |

### 2. Business Events

| Event | Trigger | Consumers |
|-------|---------|-----------|
| BUSINESS_REGISTERED | New business registration | Notification |
| BUSINESS_APPROVED | Admin approves | Commerce, Notification |
| BUSINESS_REJECTED | Admin rejects | Notification |
| BUSINESS_SUSPENDED | Admin suspends | Commerce |
| STORE_CREATED | New store | Commerce |
| STORE_SUSPENDED | Store suspended | Commerce |
| MEMBER_ADDED | New member | Notification |

### 3. Commerce Events

| Event | Trigger | Consumers |
|-------|---------|-----------|
| BOOK_CREATED | New book | Search |
| BOOK_PUBLISHED | Book published | Search, Notification |
| BOOK_ARCHIVED | Book archived | Search |
| BOOK_UPDATED | Book details updated | Search |
| STOCK_RESERVED | Checkout reserves stock | Shipping |
| STOCK_RELEASED | Checkout cancelled | Shipping |
| STOCK_LOW | Stock below threshold | Notification |

### 4. Order Events

| Event | Trigger | Consumers |
|-------|---------|-----------|
| ORDER_CREATED | New order | Notification, Shipping |
| ORDER_PAID | Payment succeeded | Shipping, Library |
| ORDER_CANCELLED | Order cancelled | Notification, Shipping |
| ORDER_COMPLETED | All items delivered | Notification, Review |
| SELLER_ORDER_CONFIRMED | Seller confirms | Notification |
| SELLER_ORDER_SHIPPED | Seller ships | Notification |

### 5. Payment Events

| Event | Trigger | Consumers |
|-------|---------|-----------|
| PAYMENT_INITIATED | Payment started | - |
| PAYMENT_SUCCEEDED | Payment confirmed | Order, Library |
| PAYMENT_FAILED | Payment failed | Order, Notification |
| REFUND_INITIATED | Refund started | Order |
| REFUND_COMPLETED | Refund done | Order, Notification |

### 6. Library Events

| Event | Trigger | Consumers |
|-------|---------|-----------|
| BOOK_ACCESS_GRANTED | User gets book access | Library, Notification |
| BOOK_ACCESS_REVOKED | Access revoked (refund) | Library |
| READING_PROGRESS_UPDATED | User reads | Analytics |

## Consumer Implementation

```typescript
// Example: BookAccessConsumer
@EventHandler()
export class BookAccessConsumer {
  constructor(
    private readonly libraryService: LibraryService,
    private readonly notificationService: NotificationService,
  ) {}

  @Process('PAYMENT_SUCCEEDED')
  async handlePaymentSucceeded(event: DomainEvent) {
    const { orderId, sellerOrders } = event.payload;

    for (const sellerOrder of sellerOrders) {
      const digitalItems = sellerOrder.items.filter(
        item => item.format === 'DIGITAL'
      );

      for (const item of digitalItems) {
        await this.libraryService.grantAccess({
          userId: event.payload.userId,
          bookId: item.bookId,
          orderId,
          orderItemId: item.orderItemId,
        });
      }
    }
  }

  @Process('REFUND_COMPLETED')
  async handleRefundCompleted(event: DomainEvent) {
    const { orderId, refundedItems } = event.payload;

    for (const item of refundedItems) {
      if (item.format === 'DIGITAL') {
        await this.libraryService.revokeAccess({
          userId: event.payload.userId,
          bookId: item.bookId,
        });
      }
    }
  }
}
```

## Idempotency

Consumers phải xử lý idempotent để tránh duplicate processing khi event được redeliver.

```typescript
@Process('BOOK_ACCESS_GRANTED')
async handleBookAccessGranted(event: DomainEvent) {
  const { userId, bookId, orderId } = event.payload;

  // Check if already granted
  const existing = await this.libraryService.findByUserAndBook(userId, bookId);
  if (existing) {
    // Already processed - skip
    return;
  }

  // Grant access
  await this.libraryService.grantAccess({
    userId,
    bookId,
    orderId,
  });
}
```

## Outbox Pattern

Để đảm bảo events được gửi sau khi transaction commit:

```typescript
@Service()
export class OrderService {
  constructor(
    private readonly entityManager: EntityManager,
    private readonly eventBus: EventBus,
  ) {}

  async createOrder(data: CreateOrderDto): Promise<Order> {
    return this.entityManager.transaction(async (manager) => {
      // 1. Create order
      const order = await manager.save(Order, data);

      // 2. Create outbox record (same transaction)
      await manager.save(OutboxEvent, {
        eventType: 'ORDER_CREATED',
        payload: { orderId: order.id, ... },
        status: 'PENDING',
      });

      // 3. Commit transaction - order AND outbox saved atomically
      return order;
    });

    // Outbox processor gửi event sau khi commit thành công
  }
}
```

## Dead Letter Queue

Events không xử lý được sẽ được gửi vào DLQ:

```
Queue: order.created.queue
  → Consumer fails (3 retries)
  → Dead Letter Exchange (dlx.order)
  → Dead Letter Queue: order.created.dlq
```

## Event Versioning

Khi event schema thay đổi:

```typescript
@Process('ORDER_CREATED', { version: 1 })
async handleOrderCreatedV1(event: DomainEvent) {
  // Handle v1
}

@Process('ORDER_CREATED', { version: 2 })
async handleOrderCreatedV2(event: DomainEvent) {
  // Handle v2
}
```
