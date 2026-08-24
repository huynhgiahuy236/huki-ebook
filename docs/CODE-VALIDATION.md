# Code vs Docs Validation Report

Date: 2026-08-24
Branch: develop

## Summary

| Category | Count | Status |
|----------|-------|--------|
| Matched | 5 | ✅ |
| Discrepancies | 3 | ⚠️ |
| Missing | 2 | ❌ |

## ✅ Matched Components

### 1. Event Envelope Structure

**Docs:** `docs/06-EVENTS/overview.md`
```typescript
interface DomainEvent {
  eventId: string;
  eventType: string;
  occurredAt: string;
  producer: string;
  version: number;
  aggregateId: string;
  payload: Record<string, any>;
}
```

**Code:** `libs/shared/src/events/domain-event.ts`
```typescript
export interface DomainEvent<TPayload = Record<string, unknown>> {
  eventId: string;
  eventType: string;
  occurredAt: string;
  producer: string;
  version: number;
  aggregateId: string;
  payload: TPayload;
}
```

**Status:** ✅ MATCHED

---

### 2. ORDER_EVENTS

**Docs:**
| Event |
|-------|
| ORDER_CREATED |
| ORDER_PAID |
| ORDER_CANCELLED |
| ORDER_COMPLETED |
| SELLER_ORDER_CONFIRMED |
| SELLER_ORDER_SHIPPED |
| SELLER_ORDER_CANCELLED |

**Code:** `libs/shared/src/events/domain-event.ts`
```typescript
export const ORDER_EVENTS = {
  CREATED: 'ORDER_CREATED',
  PAID: 'ORDER_PAID',
  CANCELLED: 'ORDER_CANCELLED',
  COMPLETED: 'ORDER_COMPLETED',
  SELLER_CONFIRMED: 'SELLER_ORDER_CONFIRMED',
  SELLER_SHIPPED: 'SELLER_ORDER_SHIPPED',
  SELLER_CANCELLED: 'SELLER_ORDER_CANCELLED',
} as const;
```

**Status:** ✅ MATCHED

---

### 3. SHIPPING_EVENTS

**Docs:** All shipment events from `SHIPMENT_CREATED` to `SHIPMENT_CANCELLED`

**Code:** Implemented in `domain-event.ts`

**Status:** ✅ MATCHED

---

### 4. Outbox Pattern

**Docs:** Events saved atomically with transaction, then published by background job.

**Code:** `commerce-service/src/modules/events/commerce-outbox.publisher.ts`
- Polls every 1 second
- 3 retry attempts
- Dead letter on failure

**Status:** ✅ MATCHED

---

## ⚠️ Discrepancies

### 1. Community Events Missing

**Docs:** Lists `chat.message.sent`, `review.created`, `forum.comment.created`, etc.

**Code:** Not found in `libs/shared/src/events/`

**Action Needed:** Add community event constants to `domain-event.ts`:
```typescript
export const CHAT_EVENTS = {
  MESSAGE_SENT: 'CHAT_MESSAGE_SENT',
} as const;

export const REVIEW_EVENTS = {
  CREATED: 'REVIEW_CREATED',
  UPDATED: 'REVIEW_UPDATED',
  DELETED: 'REVIEW_DELETED',
} as const;

export const FORUM_EVENTS = {
  COMMENT_CREATED: 'FORUM_COMMENT_CREATED',
  POST_CREATED: 'FORUM_POST_CREATED',
} as const;
```

---

### 2. Voucher Events Missing

**Docs:** Lists `VOUCHER_*` prefix

**Code:** Not found in `domain-event.ts`

**Action Needed:** Add voucher events when promotion service is implemented.

---

### 3. Library Events Missing

**Docs:** Lists `BOOK_ACCESS_GRANTED`, `BOOK_ACCESS_REVOKED`

**Code:** Not found in `domain-event.ts`

**Action Needed:** Add library events:
```typescript
export const LIBRARY_EVENTS = {
  ACCESS_GRANTED: 'BOOK_ACCESS_GRANTED',
  ACCESS_REVOKED: 'BOOK_ACCESS_REVOKED',
} as const;
```

---

## ❌ Missing Components

### 1. Identity Events

**Docs:** Lists `USER_REGISTERED`, `USER_LOGGED_IN`, `USER_BLOCKED`, etc.

**Code:** Not found in `domain-event.ts` or `identity-service`

**Status:** Not implemented yet

---

### 2. Subscription Events (for SaaS)

**Required for Premium books:**

```typescript
export const SUBSCRIPTION_EVENTS = {
  CREATED: 'SUBSCRIPTION_CREATED',
  RENEWED: 'SUBSCRIPTION_RENEWED',
  CANCELLED: 'SUBSCRIPTION_CANCELLED',
  EXPIRED: 'SUBSCRIPTION_EXPIRED',
} as const;
```

**Status:** To be implemented

---

## Recommendations

### Priority 1: Add Missing Event Constants

Add to `libs/shared/src/events/domain-event.ts`:

```typescript
// Community Events
export const CHAT_EVENTS = {
  MESSAGE_SENT: 'CHAT_MESSAGE_SENT',
} as const;

export const REVIEW_EVENTS = {
  CREATED: 'REVIEW_CREATED',
  UPDATED: 'REVIEW_UPDATED',
} as const;

// Library Events
export const LIBRARY_EVENTS = {
  ACCESS_GRANTED: 'BOOK_ACCESS_GRANTED',
  ACCESS_REVOKED: 'BOOK_ACCESS_REVOKED',
} as const;
```

### Priority 2: Implement Subscription Model

1. Add subscription tables to Prisma schema
2. Implement subscription service
3. Add subscription events

### Priority 3: Document Event Contracts

Create `docs/06-EVENTS/event-contracts.md` with:
- Event payload schemas
- Consumer responsibilities
- Error handling requirements

---

## Files Validated

| File | Purpose |
|------|---------|
| `libs/shared/src/events/domain-event.ts` | Event constants |
| `libs/shared/src/events/rabbitmq-event-bus.service.ts` | Event bus |
| `commerce-service/src/modules/events/commerce-outbox.publisher.ts` | Event publishing |
| `commerce-service/src/modules/events/commerce-event.consumer.ts` | Event consuming |
| `docs/06-EVENTS/overview.md` | Documentation |

---

*Generated: 2026-08-24*
