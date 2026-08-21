import { ConfigService } from '@nestjs/config';
import { ShipmentStatus } from '../../../prisma/generated/client';
import { isShipmentTransitionAllowed } from '../shipments/shipments.service';
import { GhtkMockProvider } from './ghtk-mock.provider';

describe('GhtkMockProvider', () => {
  const values: Record<string, string> = {
    GHTK_PICKUP_PROVINCE: 'Hồ Chí Minh',
    GHTK_MOCK_BASE_FEE: '15000',
    GHTK_MOCK_EXTRA_500G_FEE: '5000',
    GHTK_MOCK_INTER_PROVINCE_FEE: '10000',
    GHTK_MOCK_COD_RATE: '0.005',
  };
  const config = {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
  const provider = new GhtkMockProvider(config);
  it('calculates local fee by 500g units', async () => {
    await expect(
      provider.calculateFee({
        province: 'Ho Chi Minh',
        district: 'Quận 1',
        weight: 1200,
      }),
    ).resolves.toMatchObject({
      shippingFee: 25_000,
      codFee: 0,
      totalFee: 25_000,
      estimatedDays: { min: 1, max: 2 },
    });
  });
  it('adds inter-province and COD fees', async () => {
    await expect(
      provider.calculateFee({
        province: 'Hà Nội',
        district: 'Ba Đình',
        weight: 500,
        codAmount: 200_000,
      }),
    ).resolves.toMatchObject({
      shippingFee: 25_000,
      codFee: 1_000,
      totalFee: 26_000,
      estimatedDays: { min: 3, max: 5 },
    });
  });
  it('creates stable tracking for an idempotent seller order', async () => {
    const input = {
      sellerOrderId: 'seller-order-1',
      province: 'Hồ Chí Minh',
      district: 'Quận 1',
      weight: 500,
    };
    const first = await provider.createShipment(input);
    const second = await provider.createShipment(input);
    expect(first.trackingNumber).toBe(second.trackingNumber);
    expect(first.trackingNumber).toMatch(/^GHTK[A-F0-9]{12}$/);
  });
});

describe('shipment state machine', () => {
  it.each([
    [ShipmentStatus.PENDING, ShipmentStatus.PICKED_UP],
    [ShipmentStatus.PICKED_UP, ShipmentStatus.IN_TRANSIT],
    [ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY],
    [ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.DELIVERED],
    [ShipmentStatus.FAILED, ShipmentStatus.RETURNED],
  ])('allows %s -> %s', (from, to) =>
    expect(isShipmentTransitionAllowed(from, to)).toBe(true),
  );
  it.each([
    [ShipmentStatus.PENDING, ShipmentStatus.DELIVERED],
    [ShipmentStatus.DELIVERED, ShipmentStatus.IN_TRANSIT],
    [ShipmentStatus.RETURNED, ShipmentStatus.OUT_FOR_DELIVERY],
    [ShipmentStatus.CANCELLED, ShipmentStatus.PICKED_UP],
  ])('rejects %s -> %s', (from, to) =>
    expect(isShipmentTransitionAllowed(from, to)).toBe(false),
  );
});
