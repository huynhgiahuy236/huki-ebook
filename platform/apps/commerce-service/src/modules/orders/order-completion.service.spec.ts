import { SHIPPING_EVENTS } from '../../../../../libs/shared/src';
import { OrderCompletionService } from './order-completion.service';

describe('OrderCompletionService', () => {
  const tx = {
    inboxEvent: { findUnique: jest.fn(), create: jest.fn() },
    sellerOrder: { findUnique: jest.fn(), update: jest.fn(), count: jest.fn() },
    order: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    orderStatusHistory: { create: jest.fn() },
    payment: { updateMany: jest.fn() },
    outboxEvent: { createMany: jest.fn() },
  };
  const prisma = { $transaction: jest.fn((callback) => callback(tx)) };
  const reservations = { commit: jest.fn(), release: jest.fn() };
  const service = new OrderCompletionService(
    prisma as any,
    reservations as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    tx.inboxEvent.findUnique.mockResolvedValue(null);
    tx.inboxEvent.create.mockResolvedValue({});
  });

  it('commits reserved stock when the carrier picks up a shipment', async () => {
    tx.sellerOrder.findUnique.mockResolvedValue({
      id: 'seller-1',
      orderId: 'order-1',
      status: 'PREPARING',
      trackingCode: null,
      items: [{ id: 'item-1' }],
      order: {},
    });
    await service.processShippingEvent({
      eventId: 'event-1',
      eventType: SHIPPING_EVENTS.PICKED_UP,
      occurredAt: new Date().toISOString(),
      producer: 'shipping-service',
      version: 1,
      aggregateId: 'shipment-1',
      payload: { sellerOrderId: 'seller-1', trackingNumber: 'HUKI-1' },
    });
    expect(reservations.commit).toHaveBeenCalledWith(tx, 'order-1', ['item-1']);
    expect(tx.sellerOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'SHIPPED',
          trackingCode: 'HUKI-1',
        }),
      }),
    );
  });

  it('completes an order and settles COD after the last delivery', async () => {
    tx.sellerOrder.findUnique.mockResolvedValue({
      id: 'seller-1',
      orderId: 'order-1',
      status: 'SHIPPED',
      trackingCode: 'HUKI-1',
      items: [{ id: 'item-1' }],
      order: {},
    });
    tx.sellerOrder.count.mockResolvedValue(0);
    tx.order.findUnique.mockResolvedValue({
      id: 'order-1',
      code: 'ORD-1',
      userId: 'user-1',
      status: 'SHIPPING',
      paymentMethod: 'COD',
      paymentStatus: 'PENDING',
      grandTotal: 120000,
      sellerOrders: [
        { id: 'seller-1', ownerUserId: 'owner-1', storeId: 'store-1' },
      ],
    });
    await service.processShippingEvent({
      eventId: 'event-2',
      eventType: SHIPPING_EVENTS.DELIVERED,
      occurredAt: new Date().toISOString(),
      producer: 'shipping-service',
      version: 1,
      aggregateId: 'shipment-1',
      payload: { sellerOrderId: 'seller-1', trackingNumber: 'HUKI-1' },
    });
    expect(tx.payment.updateMany).toHaveBeenCalled();
    expect(tx.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'COMPLETED',
          paymentStatus: 'SUCCEEDED',
        }),
      }),
    );
    expect(tx.outboxEvent.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ type: 'ORDER_COMPLETED' }),
        expect.objectContaining({ type: 'ORDER_PAID' }),
        expect.objectContaining({ type: 'PAYMENT_SUCCEEDED' }),
      ]),
    });
  });
});
