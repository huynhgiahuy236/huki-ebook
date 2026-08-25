export interface DomainEvent<TPayload = Record<string, unknown>> {
  eventId: string;
  eventType: string;
  occurredAt: string;
  producer: string;
  version: number;
  aggregateId: string;
  payload: TPayload;
}

// ============================================
// ORDER EVENTS
// ============================================
export const ORDER_EVENTS = {
  CREATED: 'ORDER_CREATED',
  PAID: 'ORDER_PAID',
  CANCELLED: 'ORDER_CANCELLED',
  COMPLETED: 'ORDER_COMPLETED',
  SELLER_CONFIRMED: 'SELLER_ORDER_CONFIRMED',
  SELLER_SHIPPED: 'SELLER_ORDER_SHIPPED',
  SELLER_CANCELLED: 'SELLER_ORDER_CANCELLED',
} as const;

// ============================================
// PAYMENT EVENTS
// ============================================
export const PAYMENT_EVENTS = {
  SUCCEEDED: 'PAYMENT_SUCCEEDED',
  FAILED: 'PAYMENT_FAILED',
} as const;

// ============================================
// SHIPPING EVENTS
// ============================================
export const SHIPPING_EVENTS = {
  CREATED: 'SHIPMENT_CREATED',
  STAFF_ASSIGNED: 'SHIPMENT_STAFF_ASSIGNED',
  PICKED_UP: 'SHIPMENT_PICKED_UP',
  IN_TRANSIT: 'SHIPMENT_IN_TRANSIT',
  OUT_FOR_DELIVERY: 'SHIPMENT_OUT_FOR_DELIVERY',
  DELIVERED: 'SHIPMENT_DELIVERED',
  FAILED: 'SHIPMENT_FAILED',
  RETURNED: 'SHIPMENT_RETURNED',
  CANCELLED: 'SHIPMENT_CANCELLED',
} as const;

// ============================================
// LIBRARY EVENTS (Book Access)
// ============================================
export const LIBRARY_EVENTS = {
  ACCESS_GRANTED: 'BOOK_ACCESS_GRANTED',
  ACCESS_REVOKED: 'BOOK_ACCESS_REVOKED',
  PROGRESS_UPDATED: 'READING_PROGRESS_UPDATED',
} as const;

// ============================================
// SUBSCRIPTION EVENTS
// ============================================
export const SUBSCRIPTION_EVENTS = {
  CREATED: 'SUBSCRIPTION_CREATED',
  RENEWED: 'SUBSCRIPTION_RENEWED',
  CANCELLED: 'SUBSCRIPTION_CANCELLED',
  EXPIRED: 'SUBSCRIPTION_EXPIRED',
  UPGRADED: 'SUBSCRIPTION_UPGRADED',
  DOWNGRADED: 'SUBSCRIPTION_DOWNGRADED',
} as const;

// ============================================
// CHAT EVENTS
// ============================================
export const CHAT_EVENTS = {
  MESSAGE_SENT: 'CHAT_MESSAGE_SENT',
  MESSAGE_READ: 'CHAT_MESSAGE_READ',
  CONVERSATION_CREATED: 'CHAT_CONVERSATION_CREATED',
  CONVERSATION_CLOSED: 'CHAT_CONVERSATION_CLOSED',
} as const;

// ============================================
// REVIEW EVENTS
// ============================================
export const REVIEW_EVENTS = {
  CREATED: 'REVIEW_CREATED',
  UPDATED: 'REVIEW_UPDATED',
  DELETED: 'REVIEW_DELETED',
  FLAGGED: 'REVIEW_FLAGGED',
} as const;

// ============================================
// FORUM EVENTS
// ============================================
export const FORUM_EVENTS = {
  POST_CREATED: 'FORUM_POST_CREATED',
  POST_UPDATED: 'FORUM_POST_UPDATED',
  POST_DELETED: 'FORUM_POST_DELETED',
  COMMENT_CREATED: 'FORUM_COMMENT_CREATED',
  COMMENT_DELETED: 'FORUM_COMMENT_DELETED',
} as const;

// ============================================
// USER EVENTS
// ============================================
export const USER_EVENTS = {
  REGISTERED: 'USER_REGISTERED',
  EMAIL_VERIFIED: 'USER_EMAIL_VERIFIED',
  LOGGED_IN: 'USER_LOGGED_IN',
  LOGGED_OUT: 'USER_LOGGED_OUT',
  BLOCKED: 'USER_BLOCKED',
  UNBLOCKED: 'USER_UNBLOCKED',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  PROFILE_UPDATED: 'PROFILE_UPDATED',
} as const;

// ============================================
// BUSINESS EVENTS
// ============================================
export const BUSINESS_EVENTS = {
  REGISTERED: 'BUSINESS_REGISTERED',
  APPROVED: 'BUSINESS_APPROVED',
  REJECTED: 'BUSINESS_REJECTED',
  SUSPENDED: 'BUSINESS_SUSPENDED',
  STORE_CREATED: 'STORE_CREATED',
  STORE_SUSPENDED: 'STORE_SUSPENDED',
  MEMBER_ADDED: 'MEMBER_ADDED',
} as const;
