import { Test, TestingModule } from '@nestjs/testing';
import * as crypto from 'crypto';
import { AffiliateCheckoutService } from './services/affiliate-checkout.service';
import { AffiliatePolicyResolverService } from './policy-engine/affiliate-policy-resolver.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AffiliateCheckoutService (Phase 6 Checkout Calculation & PENDING Snapshot)', () => {
  let service: AffiliateCheckoutService;
  let policyResolver: AffiliatePolicyResolverService;
  let prisma: any;

  const mockActiveProfile = {
    id: 'prof-affiliate-1',
    userId: 'user-affiliate-99',
    status: 'ACTIVE',
  };

  const mockActiveBookLink = {
    id: 'link-book-1',
    profileId: 'prof-affiliate-1',
    shortCode: 'affbook1',
    targetType: 'BOOK',
    targetBookId: 'book-target-1',
    targetStoreId: null,
    isActive: true,
    conversionCount: 5,
  };

  const mockActiveStoreLink = {
    id: 'link-store-1',
    profileId: 'prof-affiliate-1',
    shortCode: 'affstore1',
    targetType: 'STORE',
    targetBookId: null,
    targetStoreId: 'store-1',
    isActive: true,
    conversionCount: 2,
  };

  const plainCookieToken = 'a'.repeat(64);
  const tokenHash = crypto.createHash('sha256').update(plainCookieToken).digest('hex');

  const mockValidAttribution = {
    id: 'attr-1',
    linkId: 'link-book-1',
    profileId: 'prof-affiliate-1',
    cookieTokenHash: tokenHash,
    sessionNonce: 'nonce-1234',
    expiresAt: new Date(Date.now() + 86400000 * 30),
    isConverted: false,
    link: mockActiveBookLink,
    profile: mockActiveProfile,
  };

  beforeEach(async () => {
    prisma = {
      affiliateAttribution: {
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      affiliateLink: {
        update: jest.fn().mockResolvedValue({}),
      },
      affiliateCommission: {
        create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'comm-1', ...args.data })),
      },
      outboxEvent: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AffiliateCheckoutService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: AffiliatePolicyResolverService,
          useValue: {
            resolveCommission: jest.fn().mockResolvedValue({
              isEligible: true,
              ratePercent: 10,
              commissionBase: 100000,
              commissionAmount: 10000,
              sourceTier: 'BOOK',
              holdingDurationHours: 168,
              holdingRule: 'PHYSICAL_DAYS_AFTER_DELIVERY',
              policySnapshot: {
                resolvedAt: new Date().toISOString(),
                sourceTier: 'BOOK',
                bookId: 'book-target-1',
                storeId: 'store-1',
                format: 'PHYSICAL',
                itemPrice: 100000,
                quantity: 1,
                sellerDiscountAllocated: 0,
                commissionBase: 100000,
                ratePercent: 10,
                commissionAmount: 10000,
                holdingDurationHours: 168,
              },
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AffiliateCheckoutService>(AffiliateCheckoutService);
    policyResolver = module.get<AffiliatePolicyResolverService>(AffiliatePolicyResolverService);
  });

  describe('resolveAttribution', () => {
    it('returns null if tokenOrNonce is empty', async () => {
      const result = await service.resolveAttribution('');
      expect(result).toBeNull();
      expect(prisma.affiliateAttribution.findFirst).not.toHaveBeenCalled();
    });

    it('returns null if attribution not found in database', async () => {
      prisma.affiliateAttribution.findFirst.mockResolvedValue(null);
      const result = await service.resolveAttribution('nonexistent-token');
      expect(result).toBeNull();
    });

    it('returns null if attribution token has expired', async () => {
      prisma.affiliateAttribution.findFirst.mockResolvedValue({
        ...mockValidAttribution,
        expiresAt: new Date(Date.now() - 1000), // Expired
      });

      const result = await service.resolveAttribution(plainCookieToken);
      expect(result).toBeNull();
    });

    it('returns null if referral link has been deactivated', async () => {
      prisma.affiliateAttribution.findFirst.mockResolvedValue({
        ...mockValidAttribution,
        link: { ...mockActiveBookLink, isActive: false },
      });

      const result = await service.resolveAttribution(plainCookieToken);
      expect(result).toBeNull();
    });

    it('returns null if affiliate profile is not ACTIVE (e.g. SUSPENDED or REJECTED)', async () => {
      prisma.affiliateAttribution.findFirst.mockResolvedValue({
        ...mockValidAttribution,
        profile: { ...mockActiveProfile, status: 'SUSPENDED' },
      });

      const result = await service.resolveAttribution(plainCookieToken);
      expect(result).toBeNull();
    });

    it('returns null and blocks self-referral when buyer is the affiliate', async () => {
      prisma.affiliateAttribution.findFirst.mockResolvedValue(mockValidAttribution);

      // Buyer ID is 'user-affiliate-99', which equals mockActiveProfile.userId
      const result = await service.resolveAttribution(plainCookieToken, 'user-affiliate-99');
      expect(result).toBeNull();
    });

    it('resolves valid attribution by cookieToken hash', async () => {
      prisma.affiliateAttribution.findFirst.mockResolvedValue(mockValidAttribution);

      const result = await service.resolveAttribution(plainCookieToken, 'buyer-123');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('attr-1');
      expect(result?.profile.id).toBe('prof-affiliate-1');
    });

    it('resolves valid attribution by sessionNonce fallback', async () => {
      prisma.affiliateAttribution.findFirst.mockResolvedValue(mockValidAttribution);

      const result = await service.resolveAttribution('nonce-1234', 'buyer-123');
      expect(result).not.toBeNull();
      expect(result?.sessionNonce).toBe('nonce-1234');
    });
  });

  describe('createPendingCommissions (Phase 6 Rules)', () => {
    it('returns empty array if items array is empty', async () => {
      const result = await service.createPendingCommissions({
        orderId: 'ord-1',
        orderCode: 'ORD-2026-001',
        buyerUserId: 'buyer-123',
        items: [],
        affiliateToken: plainCookieToken,
      });

      expect(result).toEqual([]);
      expect(prisma.affiliateCommission.create).not.toHaveBeenCalled();
    });

    it('returns empty array if attribution fails to resolve', async () => {
      prisma.affiliateAttribution.findFirst.mockResolvedValue(null);

      const result = await service.createPendingCommissions({
        orderId: 'ord-1',
        orderCode: 'ORD-2026-001',
        buyerUserId: 'buyer-123',
        items: [
          {
            orderItemId: 'item-1',
            bookId: 'book-target-1',
            storeId: 'store-1',
            title: 'Sách Đắc Nhân Tâm',
            format: 'PHYSICAL',
            quantity: 1,
            unitPrice: 100000,
          },
        ],
        affiliateToken: 'invalid-token',
      });

      expect(result).toEqual([]);
      expect(prisma.affiliateCommission.create).not.toHaveBeenCalled();
    });

    it('enforces Line-Item Scope: attributes only targetBookId for BOOK-level link', async () => {
      prisma.affiliateAttribution.findFirst.mockResolvedValue(mockValidAttribution);

      const result = await service.createPendingCommissions({
        orderId: 'ord-1',
        orderCode: 'ORD-2026-001',
        buyerUserId: 'buyer-123',
        items: [
          {
            orderItemId: 'item-target',
            bookId: 'book-target-1', // Matches targetBookId
            storeId: 'store-1',
            title: 'Sách Mục Tiêu',
            format: 'PHYSICAL',
            quantity: 1,
            unitPrice: 100000,
          },
          {
            orderItemId: 'item-other',
            bookId: 'book-other-99', // Does NOT match targetBookId
            storeId: 'store-1',
            title: 'Sách Khác Không Thuộc Link',
            format: 'PHYSICAL',
            quantity: 1,
            unitPrice: 150000,
          },
        ],
        affiliateToken: plainCookieToken,
      });

      expect(result).toHaveLength(1);
      expect(result[0].bookId).toBe('book-target-1');
      expect(result[0].status).toBe('PENDING');

      // Verify commission created with PENDING status
      expect(prisma.affiliateCommission.create).toHaveBeenCalledTimes(1);
      expect(prisma.affiliateCommission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            profileId: 'prof-affiliate-1',
            orderId: 'ord-1',
            orderItemId: 'item-target',
            bookId: 'book-target-1',
            status: 'PENDING',
            commissionBase: 100000,
            commissionRate: 10,
            commissionAmount: 10000,
          }),
        }),
      );

      // Verify attribution marked converted
      expect(prisma.affiliateAttribution.update).toHaveBeenCalledWith({
        where: { id: 'attr-1' },
        data: expect.objectContaining({
          isConverted: true,
          convertedOrderId: 'ord-1',
          buyerUserId: 'buyer-123',
        }),
      });

      // Verify link conversionCount incremented
      expect(prisma.affiliateLink.update).toHaveBeenCalledWith({
        where: { id: 'link-book-1' },
        data: { conversionCount: { increment: 1 } },
      });

      // Verify outbox event emitted
      expect(prisma.outboxEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'AFFILIATE_COMMISSION_CREATED',
            aggregateId: 'ord-1',
          }),
        }),
      );
    });

    it('enforces Store-Wide Scope: attributes all books in store for STORE-level link', async () => {
      prisma.affiliateAttribution.findFirst.mockResolvedValue({
        ...mockValidAttribution,
        link: mockActiveStoreLink,
      });

      const result = await service.createPendingCommissions({
        orderId: 'ord-store',
        orderCode: 'ORD-2026-STORE',
        buyerUserId: 'buyer-123',
        items: [
          {
            orderItemId: 'item-store-1',
            bookId: 'book-store-a',
            storeId: 'store-1', // Matches store-1
            title: 'Sách Cùng Cửa Hàng 1',
            format: 'PHYSICAL',
            quantity: 1,
            unitPrice: 100000,
          },
          {
            orderItemId: 'item-store-2',
            bookId: 'book-store-b',
            storeId: 'store-1', // Matches store-1
            title: 'Sách Cùng Cửa Hàng 2',
            format: 'DIGITAL',
            quantity: 1,
            unitPrice: 50000,
          },
          {
            orderItemId: 'item-other-store',
            bookId: 'book-store-c',
            storeId: 'store-999', // Different store, ignored
            title: 'Sách Khác Cửa Hàng',
            format: 'PHYSICAL',
            quantity: 1,
            unitPrice: 200000,
          },
        ],
        affiliateToken: plainCookieToken,
      });

      expect(result).toHaveLength(2);
      expect(prisma.affiliateCommission.create).toHaveBeenCalledTimes(2);
    });

    it('skips items if policy resolves to ineligible or 0 commission', async () => {
      prisma.affiliateAttribution.findFirst.mockResolvedValue(mockValidAttribution);
      (policyResolver.resolveCommission as jest.Mock).mockResolvedValueOnce({
        isEligible: false,
        ratePercent: 0,
        commissionBase: 100000,
        commissionAmount: 0,
        sourceTier: 'NONE',
        policySnapshot: {},
      });

      const result = await service.createPendingCommissions({
        orderId: 'ord-ineligible',
        orderCode: 'ORD-2026-INELIGIBLE',
        buyerUserId: 'buyer-123',
        items: [
          {
            orderItemId: 'item-target',
            bookId: 'book-target-1',
            storeId: 'store-1',
            title: 'Sách Không Hợp Lệ Hoa Hồng',
            format: 'PHYSICAL',
            quantity: 1,
            unitPrice: 100000,
          },
        ],
        affiliateToken: plainCookieToken,
      });

      expect(result).toHaveLength(0);
      expect(prisma.affiliateCommission.create).not.toHaveBeenCalled();
      expect(prisma.affiliateAttribution.update).not.toHaveBeenCalled();
    });
  });
});
