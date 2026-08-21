export interface DomainEvent<TPayload = Record<string, unknown>> {
  eventId: string;
  eventType: string;
  occurredAt: string;
  producer: string;
  version: number;
  aggregateId: string;
  payload: TPayload;
}

export const ORDER_EVENTS = {
  CREATED: 'ORDER_CREATED',
  PAID: 'ORDER_PAID',
  CANCELLED: 'ORDER_CANCELLED',
  COMPLETED: 'ORDER_COMPLETED',
  SELLER_CONFIRMED: 'SELLER_ORDER_CONFIRMED',
  SELLER_SHIPPED: 'SELLER_ORDER_SHIPPED',
  SELLER_CANCELLED: 'SELLER_ORDER_CANCELLED',
} as const;

export const PAYMENT_EVENTS = {
  SUCCEEDED: 'PAYMENT_SUCCEEDED',
  FAILED: 'PAYMENT_FAILED',
} as const;

export const SHIPPING_EVENTS = {
  CREATED: 'shipment.created',
  STAFF_ASSIGNED: 'shipment.staff-assigned',
  PICKED_UP: 'shipment.picked_up',
  IN_TRANSIT: 'shipment.in_transit',
  OUT_FOR_DELIVERY: 'shipment.out_for_delivery',
  DELIVERED: 'shipment.delivered',
  FAILED: 'shipment.failed',
  RETURNED: 'shipment.returned',
  CANCELLED: 'shipment.cancelled',
} as const;
