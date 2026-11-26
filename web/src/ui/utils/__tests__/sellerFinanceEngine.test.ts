import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PLATFORM_COMMISSION_PERCENT,
  DEFAULT_PARTNER_REVENUE_PERCENT,
  DEFAULT_PLATFORM_FEE_RATE,
  formatRevenueSplitLabel,
  calculateSellerFinancials,
} from '../sellerFinanceEngine';

describe('sellerFinanceEngine commission and revenue split defaults (BUG-19)', () => {
  it('uses 95% partner / 5% platform fee as the single source of truth', () => {
    expect(DEFAULT_PLATFORM_COMMISSION_PERCENT).toBe(5);
    expect(DEFAULT_PARTNER_REVENUE_PERCENT).toBe(95);
    expect(DEFAULT_PLATFORM_FEE_RATE).toBe(0.05);
    expect(formatRevenueSplitLabel()).toBe('95% Đối tác • 5% Sàn');
    expect(formatRevenueSplitLabel(5, 'dash')).toBe('95% NXB - 5% Sàn');
    expect(formatRevenueSplitLabel(5, 'slash')).toBe('95% NXB / 5% Sàn');
  });

  it('computes 5% platform fee and 95% net revenue when escrow items lack precomputed fees', () => {
    const metrics = calculateSellerFinancials({
      escrowItems: [
        {
          id: 'order-1',
          subtotal: 100000,
          status: 'COMPLETED',
          orderStatus: 'COMPLETED',
          paymentStatus: 'PAID',
        } as any,
      ],
    });

    expect(metrics.totalGrossGMV).toBe(100000);
    expect(metrics.totalPlatformFee).toBe(5000);
    expect(metrics.totalNetRevenue).toBe(95000);
    expect(metrics.platformFeePercent).toBe(5);
  });
});
