import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SellerAffiliateService } from './services/seller-affiliate.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AffiliateAuditService } from './audit/affiliate-audit.service';
import { BookFormat } from '../../../prisma/generated/client';

describe('SellerAffiliateService - Phase 4 Policy & Eligibility (Unit Tests)', () => {
  let service: SellerAffiliateService;
  let prisma: any;
  let auditService: any;

  const mockPolicy = {
    id: 'pol-1',
    name: 'Default Policy',
    defaultPhysicalRate: 5.0,
    defaultEbookRate: 10.0,
    defaultAudioRate: 10.0,
    minRate: 1.0,
    maxPhysicalRate: 30.0,
    maxDigitalRate: 50.0,
    cookieDurationDays: 30,
    physicalHoldingDays: 7,
    digitalHoldingHours: 24,
    isActive: true,
    effectiveFrom: new Date(),
  };

  const mockStore = {
    id: 'store-1',
    name: 'Nhã Nam Official Store',
  };

  beforeEach(async () => {
    prisma = {
      affiliatePolicy: {
        findFirst: jest.fn().mockResolvedValue(mockPolicy),
      },
      storeAffiliateSetting: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      bookAffiliateSetting: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      book: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      outboxEvent: {
        create: jest.fn().mockResolvedValue({ id: 'outbox-1' }),
      },
      $transaction: jest.fn().mockImplementation((promises) => Promise.all(promises)),
    };

    auditService = {
      log: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SellerAffiliateService,
        { provide: PrismaService, useValue: prisma },
        { provide: AffiliateAuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<SellerAffiliateService>(SellerAffiliateService);
  });

  describe('1. Store Settings & Hard Cap Validation (Decision 1)', () => {
    it('should return default inherited rates if store setting not created yet', async () => {
      prisma.storeAffiliateSetting.findUnique.mockResolvedValue(null);

      const result = await service.getStoreSettings('store-1');
      expect(result.storeSetting.isEnabled).toBe(true);
      expect(result.storeSetting.autoEnrollNewBooks).toBe(true);
      expect(result.effectiveRates.physicalRate).toBe(5.0);
      expect(result.effectiveRates.ebookRate).toBe(10.0);
    });

    it('should throw BadRequestException if physicalRate exceeds maxPhysicalRate (30%)', async () => {
      await expect(
        service.updateStoreSettings('store-1', 'seller-user-1', {
          isEnabled: true,
          physicalRate: 35.0, // Exceeds 30% cap
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if ebookRate exceeds maxDigitalRate (50%)', async () => {
      await expect(
        service.updateStoreSettings('store-1', 'seller-user-1', {
          isEnabled: true,
          ebookRate: 55.0, // Exceeds 50% cap
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if rate is below minRate (1%)', async () => {
      await expect(
        service.updateStoreSettings('store-1', 'seller-user-1', {
          isEnabled: true,
          physicalRate: 0.5, // Below 1%
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully update store settings when rates are within caps', async () => {
      prisma.storeAffiliateSetting.findUnique.mockResolvedValue({
        id: 'setting-1',
        storeId: 'store-1',
        isEnabled: true,
        autoEnrollNewBooks: true,
        physicalRate: 8.0,
        ebookRate: 15.0,
        audioRate: 12.0,
        version: 1,
      });

      prisma.storeAffiliateSetting.upsert.mockResolvedValue({
        id: 'setting-1',
        storeId: 'store-1',
        isEnabled: true,
        autoEnrollNewBooks: true,
        physicalRate: 8.0,
        ebookRate: 15.0,
        audioRate: 12.0,
        version: 2,
        updatedAt: new Date(),
      });

      const result = await service.updateStoreSettings('store-1', 'seller-user-1', {
        isEnabled: true,
        physicalRate: 8.0,
        ebookRate: 15.0,
        audioRate: 12.0,
      });

      expect(prisma.storeAffiliateSetting.upsert).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE_STORE_AFFILIATE_SETTINGS',
          metadata: expect.objectContaining({ storeId: 'store-1' }),
        }),
      );
      expect(prisma.outboxEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'affiliate.store_settings.updated',
          }),
        }),
      );
    });
  });

  describe('2. Book Eligibility & Dynamic Inheritance (Decision 2)', () => {
    it('should inherit store rates dynamically for new books without override', async () => {
      prisma.storeAffiliateSetting.findUnique.mockResolvedValue({
        storeId: 'store-1',
        isEnabled: true,
        autoEnrollNewBooks: true,
        physicalRate: 7.0,
        ebookRate: 12.0,
      });

      prisma.book.count.mockResolvedValue(1);
      prisma.book.findMany.mockResolvedValue([
        {
          id: 'book-1',
          title: 'Dế Mèn Phiêu Lưu Ký',
          slug: 'de-men',
          isbn: '9781234567890',
          format: BookFormat.PHYSICAL,
          price: 100000,
          status: 'PUBLISHED',
          affiliateSetting: null, // No specific override
          category: { name: 'Văn học' },
          author: { name: 'Tô Hoài' },
        },
      ]);

      const res = await service.listStoreBooks('store-1', { page: 1, limit: 10 });
      expect(res.items.length).toBe(1);
      expect(res.items[0].isEligible).toBe(true);
      expect(res.items[0].isCustomRate).toBe(false);
      expect(res.items[0].effectiveRate).toBe(7.0); // Inherited from store physicalRate
    });

    it('should respect explicit isEligible = false override', async () => {
      prisma.storeAffiliateSetting.findUnique.mockResolvedValue({
        storeId: 'store-1',
        isEnabled: true,
        autoEnrollNewBooks: true,
        physicalRate: 7.0,
      });

      prisma.book.count.mockResolvedValue(1);
      prisma.book.findMany.mockResolvedValue([
        {
          id: 'book-2',
          title: 'Sách Hạn Chế Hoa Hồng',
          slug: 'sach-han-che',
          format: BookFormat.PHYSICAL,
          price: 200000,
          status: 'PUBLISHED',
          affiliateSetting: {
            isEligible: false, // Explicitly blocked
            customRate: null,
          },
        },
      ]);

      const res = await service.listStoreBooks('store-1', {});
      expect(res.items[0].isEligible).toBe(false);
    });

    it('should use custom rate when customRate is set on book', async () => {
      prisma.storeAffiliateSetting.findUnique.mockResolvedValue({
        storeId: 'store-1',
        isEnabled: true,
        autoEnrollNewBooks: true,
        physicalRate: 5.0,
      });

      prisma.book.count.mockResolvedValue(1);
      prisma.book.findMany.mockResolvedValue([
        {
          id: 'book-3',
          title: 'Sách Best Seller Ưu Đãi',
          slug: 'best-seller',
          format: BookFormat.PHYSICAL,
          price: 150000,
          status: 'PUBLISHED',
          affiliateSetting: {
            isEligible: true,
            customRate: 15.0, // Custom override
          },
        },
      ]);

      const res = await service.listStoreBooks('store-1', {});
      expect(res.items[0].isEligible).toBe(true);
      expect(res.items[0].isCustomRate).toBe(true);
      expect(res.items[0].effectiveRate).toBe(15.0);
    });
  });

  describe('3. Store Isolation & Security Verification', () => {
    it('should throw NotFoundException if book belongs to another store', async () => {
      // Book belongs to store-2, but seller tries to update under store-1
      prisma.book.findFirst.mockResolvedValue(null);

      await expect(
        service.updateBookSetting('store-1', 'alien-book-id', 'seller-user-1', {
          isEligible: false,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if any book in bulk update does not belong to store', async () => {
      // 3 books passed, but only 2 belong to store-1
      prisma.book.findMany.mockResolvedValue([
        { id: 'book-1', format: BookFormat.PHYSICAL },
        { id: 'book-2', format: BookFormat.PHYSICAL },
      ]);

      await expect(
        service.bulkUpdateBooks('store-1', 'seller-user-1', {
          bookIds: ['book-1', 'book-2', 'hacker-book-3'],
          isEligible: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('4. Bulk Updates Execution (Decision 4)', () => {
    it('should transactionally update all valid books in batch', async () => {
      prisma.book.findMany.mockResolvedValue([
        { id: 'b-1', format: BookFormat.PHYSICAL },
        { id: 'b-2', format: BookFormat.PHYSICAL },
        { id: 'b-3', format: BookFormat.PHYSICAL },
      ]);

      prisma.bookAffiliateSetting.upsert.mockResolvedValue({ id: 'set-id' });

      const res = await service.bulkUpdateBooks('store-1', 'seller-user-1', {
        bookIds: ['b-1', 'b-2', 'b-3'],
        isEligible: true,
        customRate: 10.0,
      });

      expect(res.success).toBe(true);
      expect(res.updatedCount).toBe(3);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'BULK_UPDATE_BOOK_AFFILIATE_SETTINGS',
          metadata: expect.objectContaining({ storeId: 'store-1' }),
        }),
      );
    });
  });

  describe('5. Seller Net Revenue Preview Calculation (Decision 3)', () => {
    it('should correctly calculate Price - Platform Fee (10%) - Affiliate Commission = Seller Net', () => {
      const grossPrice = 200000;
      const affiliateRate = 8.0; // 8%

      const result = service.calculateSellerNetPreview(
        grossPrice,
        BookFormat.PHYSICAL,
        affiliateRate,
      );

      // Platform fee = 10% of 200,000 = 20,000
      expect(result.platformFeeAmount).toBe(20000);
      // Affiliate commission = 8% of 200,000 = 16,000
      expect(result.affiliateCommissionAmount).toBe(16000);
      // Seller Net = 200,000 - 20,000 - 16,000 = 164,000
      expect(result.sellerNetRevenue).toBe(164000);
      // Margin = 164,000 / 200,000 = 82%
      expect(result.sellerNetMarginPercent).toBe(82.0);
    });

    it('should prevent negative seller net on zero price', () => {
      const result = service.calculateSellerNetPreview(0, BookFormat.DIGITAL, 15.0);
      expect(result.sellerNetRevenue).toBe(0);
      expect(result.sellerNetMarginPercent).toBe(0);
    });
  });
});
