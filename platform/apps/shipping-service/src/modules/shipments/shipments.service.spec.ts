import { ShipmentStatus } from '../../../prisma/generated/client';
import { ShipmentsService, isShipmentTransitionAllowed } from './shipments.service';
import { CarrierProvider } from '../shipping/carrier.provider';

describe('ShipmentsService', () => {
  let service: ShipmentsService;
  let prisma: any;
  let carrier: jest.Mocked<CarrierProvider>;
  let config: any;

  const mockAddress = {
    receiverName: 'Nguyen Van A',
    receiverPhone: '0901234567',
    address: '123 Le Loi',
    province: 'Hồ Chí Minh',
    district: 'Quận 1',
    ward: 'Phường Bến Nghé',
  };

  beforeEach(() => {
    prisma = {
      shipment: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      deliveryLog: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
      outboxEvent: {
        create: jest.fn(),
      },
      $transaction: jest.fn(async (cbOrArray) => {
        if (Array.isArray(cbOrArray)) return Promise.all(cbOrArray);
        return cbOrArray(prisma);
      }),
    };

    carrier = {
      calculateFee: jest.fn().mockResolvedValue({
        carrier: 'GHTK',
        service: 'STANDARD',
        shippingFee: 15000,
        codFee: 0,
        totalFee: 15000,
        estimatedDays: { min: 1, max: 2 },
      }),
      createShipment: jest.fn().mockResolvedValue({
        trackingNumber: 'GHTK1234567890AB',
        estimatedDeliveryAt: new Date(Date.now() + 86400000 * 2),
      }),
      cancelShipment: jest.fn().mockResolvedValue(undefined),
    };

    config = {
      get: jest.fn((key: string) => {
        if (key === 'SHIPPING_WEBHOOK_SECRET') return 'test-secret';
        return undefined;
      }),
    };

    service = new ShipmentsService(prisma, carrier, config);
  });

  describe('createFromOrder', () => {
    it('skips shipment creation when order has no physical items (pure ebook)', async () => {
      const result = await service.createFromOrder({
        orderId: 'order-1',
        userId: 'user-1',
        paymentMethod: 'ONLINE_PAYMENT',
        paymentStatus: 'SUCCEEDED',
        sellerOrders: [
          {
            sellerOrderId: 'so-1',
            storeId: 'store-1',
            ownerUserId: 'seller-1',
            requiresShipping: false,
            weight: 0,
          },
        ],
      });

      expect(result.skipped).toBe(true);
      expect(result.reason).toBe('NO_PHYSICAL_SELLER_ORDER');
      expect(carrier.createShipment).not.toHaveBeenCalled();
    });

    it('creates shipments for physical seller orders', async () => {
      prisma.shipment.findUnique.mockResolvedValue(null);
      prisma.shipment.create.mockImplementation(({ data }: any) => ({
        id: 'shipment-1',
        ...data,
        status: ShipmentStatus.PENDING,
      }));

      const result = await service.createFromOrder({
        orderId: 'order-1',
        userId: 'user-1',
        paymentMethod: 'ONLINE_PAYMENT',
        paymentStatus: 'SUCCEEDED',
        shippingAddress: mockAddress,
        sellerOrders: [
          {
            sellerOrderId: 'so-1',
            storeId: 'store-1',
            ownerUserId: 'seller-1',
            requiresShipping: true,
            weight: 500,
          },
        ],
      });

      expect(result.skipped).toBe(false);
      expect(result.created).toHaveLength(1);
      expect(carrier.calculateFee).toHaveBeenCalledWith(
        expect.objectContaining({ province: 'Hồ Chí Minh', weight: 500 }),
      );
      expect(carrier.createShipment).toHaveBeenCalledWith(
        expect.objectContaining({ sellerOrderId: 'so-1', weight: 500 }),
      );
    });

    it('creates multiple shipments for multi-vendor physical orders', async () => {
      prisma.shipment.findUnique.mockResolvedValue(null);
      prisma.shipment.create.mockImplementation(({ data }: any) => ({
        id: `shipment-${data.sellerOrderId}`,
        ...data,
        status: ShipmentStatus.PENDING,
      }));

      const result = await service.createFromOrder({
        orderId: 'order-1',
        userId: 'user-1',
        paymentMethod: 'ONLINE_PAYMENT',
        paymentStatus: 'SUCCEEDED',
        shippingAddress: mockAddress,
        sellerOrders: [
          {
            sellerOrderId: 'so-1',
            storeId: 'store-1',
            ownerUserId: 'seller-1',
            requiresShipping: true,
            weight: 500,
          },
          {
            sellerOrderId: 'so-2',
            storeId: 'store-2',
            ownerUserId: 'seller-2',
            requiresShipping: true,
            weight: 800,
          },
        ],
      });

      expect(result.skipped).toBe(false);
      expect(result.created).toHaveLength(2);
      expect(carrier.createShipment).toHaveBeenCalledTimes(2);
    });
  });

  describe('cancelBySellerOrder', () => {
    it('cancels shipment and notifies carrier if tracking number exists', async () => {
      prisma.shipment.findUnique.mockResolvedValue({
        id: 'shipment-1',
        sellerOrderId: 'so-1',
        status: ShipmentStatus.PENDING,
        trackingNumber: 'GHTK1234567890AB',
      });
      prisma.shipment.updateMany.mockResolvedValue({ count: 1 });

      await service.cancelBySellerOrder('so-1', { reason: 'Customer requested' });

      expect(carrier.cancelShipment).toHaveBeenCalledWith('GHTK1234567890AB');
      expect(prisma.shipment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ShipmentStatus.CANCELLED,
          }),
        }),
      );
    });
  });

  describe('state machine transition rules', () => {
    it('verifies standard forward transitions', () => {
      expect(isShipmentTransitionAllowed(ShipmentStatus.PENDING, ShipmentStatus.PICKED_UP)).toBe(true);
      expect(isShipmentTransitionAllowed(ShipmentStatus.PICKED_UP, ShipmentStatus.IN_TRANSIT)).toBe(true);
      expect(isShipmentTransitionAllowed(ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY)).toBe(true);
      expect(isShipmentTransitionAllowed(ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.DELIVERED)).toBe(true);
    });

    it('rejects skipping states (e.g., PENDING directly to DELIVERED)', () => {
      expect(isShipmentTransitionAllowed(ShipmentStatus.PENDING, ShipmentStatus.DELIVERED)).toBe(false);
      expect(isShipmentTransitionAllowed(ShipmentStatus.DELIVERED, ShipmentStatus.IN_TRANSIT)).toBe(false);
    });
  });
});
