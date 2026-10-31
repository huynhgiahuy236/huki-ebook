import { describe, it, expect, beforeEach, vi } from 'vitest';
import { orderSlaWatchdogService, SlaMonitoredOrder } from './orderSlaWatchdogService';
import { sellerPenaltyService } from './sellerPenaltyService';
import { realtimeSyncBus } from './realtimeSyncBus';

describe('OrderSlaWatchdogService', () => {
  const storeId = 'test-store-alpha';

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('does not penalize orders under 24 hours', async () => {
    const orders: SlaMonitoredOrder[] = [
      {
        id: 'ord-fresh-1',
        code: 'ORD-1001',
        storeId,
        storeName: 'Alpha Bookshop',
        createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(), // 5 hours ago
        status: 'PENDING_CONFIRMATION',
      },
    ];

    const result = await orderSlaWatchdogService.evaluateOrders(orders);
    expect(result.lateShipmentPenalties).toBe(0);
    expect(result.cancelledOrders).toBe(0);
  });

  it('automatically applies 1 penalty point (LATE_SHIPMENT) for orders overdue > 24 hours per POL-07 & POL-16', async () => {
    const publishSpy = vi.spyOn(realtimeSyncBus, 'publish');

    const orders: SlaMonitoredOrder[] = [
      {
        id: 'ord-overdue-25h',
        code: 'ORD-538499',
        storeId,
        storeName: 'Alpha Bookshop',
        createdAt: new Date(Date.now() - 25 * 3600 * 1000).toISOString(), // 25 hours ago
        status: 'PENDING_CONFIRMATION',
      },
    ];

    const result = await orderSlaWatchdogService.evaluateOrders(orders);
    expect(result.lateShipmentPenalties).toBe(1);

    const profile = sellerPenaltyService.getProfile(storeId);
    expect(profile.totalPoints).toBeGreaterThanOrEqual(1);

    // Verify notifications were published
    expect(publishSpy).toHaveBeenCalled();
    const calls = publishSpy.mock.calls;

    // Seller alert: BUSINESS recipient, warning about penalty points
    const sellerCall = calls.find((c) => (c[1] as any)?.recipientType === 'BUSINESS');
    expect(sellerCall).toBeDefined();
    expect((sellerCall?.[1] as any)?.title).toContain('ORD-538499');
    expect((sellerCall?.[1] as any)?.message).toContain('Sao Quả Tạ');

    // Admin alert: ADMIN recipient, informational supervision alert
    const adminCall = calls.find((c) => (c[1] as any)?.recipientType === 'ADMIN');
    expect(adminCall).toBeDefined();
    expect((adminCall?.[1] as any)?.title).toContain('Giám sát SLA');
    expect((adminCall?.[1] as any)?.actionUrl).toContain('/admin/penalty-arbitration');
  });

  it('automatically cancels and applies 2 penalty points (NON_FULFILLMENT) for orders overdue > 48 hours', async () => {
    const orders: SlaMonitoredOrder[] = [
      {
        id: 'ord-overdue-50h',
        code: 'ORD-99948H',
        storeId,
        storeName: 'Alpha Bookshop',
        createdAt: new Date(Date.now() - 50 * 3600 * 1000).toISOString(), // 50 hours ago
        status: 'PENDING_CONFIRMATION',
      },
    ];

    const result = await orderSlaWatchdogService.evaluateOrders(orders);
    expect(result.cancelledOrders).toBe(1);

    const profile = sellerPenaltyService.getProfile(storeId);
    const nonFulfillRecord = profile.history.find((h) => h.violationType === 'NON_FULFILLMENT');
    expect(nonFulfillRecord).toBeDefined();
    expect(nonFulfillRecord?.points).toBe(2);
  });
});

