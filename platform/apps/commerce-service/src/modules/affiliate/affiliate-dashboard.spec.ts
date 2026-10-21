import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AffiliateDashboardService } from './services/affiliate-dashboard.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AffiliateCommissionStatus } from '../../../prisma/generated/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('AffiliateDashboardService (Phase 9 Reporting & Dashboards)', () => {
  let service: AffiliateDashboardService;

  const mockProfile = {
    id: 'prof-1',
    userId: 'user-ctv-1',
    affiliateCode: 'CTV_HUY',
    displayName: 'Huy CTV',
    status: 'ACTIVE',
    wallet: {
      availableBalance: new Decimal(450000),
      lifetimePaid: new Decimal(200000),
    },
    links: [
      {
        id: 'link-1',
        shortCode: 'huki-huy-1',
        targetType: 'BOOK',
        clickCount: 120,
        conversionCount: 6,
        createdAt: new Date('2026-02-01'),
      },
    ],
  };

  const mockPrisma = {
    affiliateProfile: {
      findUnique: jest.fn(),
      groupBy: jest.fn(),
    },
    affiliateLink: {
      aggregate: jest.fn(),
    },
    affiliateCommission: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    affiliateWallet: {
      aggregate: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AffiliateDashboardService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AffiliateDashboardService>(AffiliateDashboardService);
  });

  describe('getCtvDashboardStats', () => {
    it('should throw NotFoundException if profile does not exist', async () => {
      mockPrisma.affiliateProfile.findUnique.mockResolvedValue(null);
      await expect(service.getCtvDashboardStats('user-unknown')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return aggregated CTV metrics, top links, and recent commissions', async () => {
      mockPrisma.affiliateProfile.findUnique.mockResolvedValue(mockProfile);

      mockPrisma.affiliateLink.aggregate.mockResolvedValue({
        _sum: {
          clickCount: 200,
          conversionCount: 10,
        },
      });

      mockPrisma.affiliateCommission.aggregate
        .mockResolvedValueOnce({ _sum: { commissionAmount: new Decimal(50000) } }) // PENDING
        .mockResolvedValueOnce({ _sum: { commissionAmount: new Decimal(100000) } }) // HOLDING
        .mockResolvedValueOnce({ _sum: { commissionAmount: new Decimal(15000) } }); // REVERSED

      mockPrisma.affiliateCommission.findMany.mockResolvedValue([
        {
          id: 'comm-1',
          orderId: 'ord-101',
          orderItemId: 'item-101',
          bookTitle: 'Đắc Nhân Tâm',
          commissionAmount: new Decimal(25000),
          commissionRate: new Decimal(10.0),
          status: AffiliateCommissionStatus.HOLDING,
          holdingUntil: new Date('2026-03-01'),
          createdAt: new Date('2026-02-20'),
        },
      ]);

      const res = await service.getCtvDashboardStats('user-ctv-1');

      expect(res.profile.affiliateCode).toBe('CTV_HUY');
      expect(res.metrics.clicksCount).toBe(200);
      expect(res.metrics.conversionsCount).toBe(10);
      expect(res.metrics.conversionRate).toBe(5.0); // (10 / 200) * 100
      expect(res.metrics.pendingCommission).toBe(50000);
      expect(res.metrics.holdingCommission).toBe(100000);
      expect(res.metrics.availableCommission).toBe(450000);
      expect(res.metrics.netAvailableCommission).toBe(450000);
      expect(res.metrics.debtCommission).toBe(0);
      expect(res.metrics.reversedCommission).toBe(15000);
      expect(res.recentCommissions.length).toBe(1);
      expect(res.recentCommissions[0].bookTitle).toBe('Đắc Nhân Tâm');
      expect(res.topLinks.length).toBe(1);
      expect(res.version).toBeDefined();
    });

    it('should compute debtCommission correctly when wallet availableBalance is negative', async () => {
      mockPrisma.affiliateProfile.findUnique.mockResolvedValue({
        ...mockProfile,
        wallet: {
          availableBalance: new Decimal(-80000), // Negative balance
          lifetimePaid: new Decimal(200000),
        },
      });

      mockPrisma.affiliateLink.aggregate.mockResolvedValue({
        _sum: { clickCount: 0, conversionCount: 0 },
      });

      mockPrisma.affiliateCommission.aggregate
        .mockResolvedValueOnce({ _sum: { commissionAmount: null } })
        .mockResolvedValueOnce({ _sum: { commissionAmount: null } })
        .mockResolvedValueOnce({ _sum: { commissionAmount: null } });

      mockPrisma.affiliateCommission.findMany.mockResolvedValue([]);

      const res = await service.getCtvDashboardStats('user-ctv-1');

      expect(res.metrics.availableCommission).toBe(-80000);
      expect(res.metrics.netAvailableCommission).toBe(0);
      expect(res.metrics.debtCommission).toBe(80000);
    });
  });

  describe('getSellerDashboardStats', () => {
    it('should calculate attributed orders, revenue, and top books correctly', async () => {
      mockPrisma.affiliateCommission.findMany.mockResolvedValue([
        {
          id: 'comm-1',
          orderId: 'ord-1',
          bookId: 'book-A',
          bookTitle: 'Nhà Giả Kim',
          itemPrice: new Decimal(100000),
          quantity: 2,
          commissionAmount: new Decimal(20000),
          status: AffiliateCommissionStatus.HOLDING,
        },
        {
          id: 'comm-2',
          orderId: 'ord-2',
          bookId: 'book-B',
          bookTitle: 'Tuổi Trẻ Đáng Giá Bao Nhiêu',
          itemPrice: new Decimal(150000),
          quantity: 1,
          commissionAmount: new Decimal(15000),
          status: AffiliateCommissionStatus.AVAILABLE,
        },
      ]);

      const res = await service.getSellerDashboardStats('store-123');

      expect(res.storeId).toBe('store-123');
      expect(res.metrics.totalAttributedOrders).toBe(2);
      expect(res.metrics.totalAttributedRevenue).toBe(350000); // (100k * 2) + (150k * 1)
      expect(res.metrics.totalCommissionCost).toBe(35000); // 20k + 15k
      expect(res.metrics.pendingCommissionCost).toBe(20000);
      expect(res.metrics.settledCommissionCost).toBe(15000);
      expect(res.topBooks.length).toBe(2);
      expect(res.topBooks[0].bookTitle).toBe('Nhà Giả Kim');
    });
  });

  describe('getAdminDashboardStats', () => {
    it('should aggregate platform-wide partners, financials, and traffic', async () => {
      mockPrisma.affiliateProfile.groupBy.mockResolvedValue([
        { status: 'ACTIVE', _count: { id: 25 } },
        { status: 'PENDING_REVIEW', _count: { id: 5 } },
        { status: 'SUSPENDED', _count: { id: 2 } },
      ]);

      mockPrisma.affiliateWallet.aggregate.mockResolvedValue({
        _sum: {
          availableBalance: new Decimal(5000000),
          holdingBalance: new Decimal(1500000),
          pendingBalance: new Decimal(500000),
          lifetimePaid: new Decimal(10000000),
        },
      });

      mockPrisma.affiliateLink.aggregate.mockResolvedValue({
        _sum: {
          clickCount: 10000,
          conversionCount: 450,
        },
      });

      mockPrisma.affiliateCommission.aggregate.mockResolvedValue({
        _sum: { commissionAmount: new Decimal(17000000) },
      });

      const res = await service.getAdminDashboardStats();

      expect(res.partners.total).toBe(32);
      expect(res.partners.active).toBe(25);
      expect(res.partners.pendingReview).toBe(5);
      expect(res.financials.totalCommissionsPaid).toBe(10000000);
      expect(res.financials.totalCommissionsAvailable).toBe(5000000);
      expect(res.traffic.totalClicks).toBe(10000);
      expect(res.traffic.totalConversions).toBe(450);
      expect(res.traffic.averageConversionRate).toBe(4.5);
    });
  });

  describe('exportReport', () => {
    it('should generate valid UTF-8 BOM CSV content with Vietnamese headers and data', async () => {
      mockPrisma.affiliateCommission.findMany.mockResolvedValue([
        {
          id: 'comm-1',
          orderId: 'ord-101',
          bookTitle: 'Đắc Nhân Tâm, Bản Đặc Biệt "VIP"',
          itemPrice: new Decimal(250000),
          quantity: 1,
          commissionRate: new Decimal(10.0),
          commissionAmount: new Decimal(25000),
          status: AffiliateCommissionStatus.AVAILABLE,
          holdingUntil: null,
          createdAt: new Date('2026-02-15T10:00:00Z'),
        },
      ]);

      const result = await service.exportReport('ADMIN', 'platform', 'csv');

      expect(result.contentType).toBe('text/csv; charset=utf-8');
      expect(result.filename).toContain('huki-affiliate-admin');
      // Must start with UTF-8 BOM for Excel
      expect(result.content.charCodeAt(0)).toBe(0xfeff);
      // Contains headers
      expect(result.content).toContain('Mã Hoa Hồng');
      expect(result.content).toContain('Đơn Giá (VNĐ)');
      // Escapes quotes and commas in bookTitle
      expect(result.content).toContain('"Đắc Nhân Tâm, Bản Đặc Biệt ""VIP"""');
      expect(result.content).toContain('25000');
    });
  });
});
