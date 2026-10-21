import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { AffiliateLinkService } from './services/affiliate-link.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AffiliateAuditService } from './audit/affiliate-audit.service';
import { BookFormat } from '../../../prisma/generated/client';

describe('AffiliateLinkService - Phase 5 Link, Attribution & Analytics (Unit Tests)', () => {
  let service: AffiliateLinkService;
  let prisma: any;
  let auditService: any;

  const mockActiveProfile = {
    id: 'profile-c1',
    userId: 'user-c1',
    affiliateCode: 'DOCGIA1',
    status: 'ACTIVE',
  };

  const mockActivePolicy = {
    id: 'policy-default',
    name: 'Chính sách chuẩn sàn',
    cookieDurationDays: 30,
    defaultPhysicalRate: 5.0,
    defaultEbookRate: 10.0,
    defaultAudioRate: 10.0,
    minRate: 1.0,
    maxPhysicalRate: 30.0,
    maxDigitalRate: 50.0,
  };

  beforeEach(async () => {
    prisma = {
      affiliateProfile: {
        findUnique: jest.fn(),
      },
      affiliatePolicy: {
        findFirst: jest.fn().mockResolvedValue(mockActivePolicy),
      },
      book: {
        findUnique: jest.fn(),
      },
      storeAffiliateSetting: {
        findUnique: jest.fn(),
      },
      affiliateLink: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      affiliateAttribution: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      outboxEvent: {
        create: jest.fn().mockResolvedValue(true),
      },
      $transaction: jest.fn(async (ops: any[]) => ops),
    };

    auditService = {
      log: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AffiliateLinkService,
        { provide: PrismaService, useValue: prisma },
        { provide: AffiliateAuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<AffiliateLinkService>(AffiliateLinkService);
  });

  describe('1. Link Generation & Target Scope (Decision 1)', () => {
    it('should throw ForbiddenException if user profile is not ACTIVE', async () => {
      prisma.affiliateProfile.findUnique.mockResolvedValue({
        id: 'p-pending',
        userId: 'u-pending',
        status: 'PENDING_APPROVAL',
      });

      await expect(
        service.createLink('u-pending', {
          targetUrl: 'https://huki.vn/book/sach-kinh-te',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if target book is in store with disabled affiliate', async () => {
      prisma.affiliateProfile.findUnique.mockResolvedValue(mockActiveProfile);
      prisma.book.findUnique.mockResolvedValue({
        id: 'book-1',
        storeId: 'store-1',
        title: 'Sách Kinh Tế',
        affiliateSetting: null,
      });
      prisma.storeAffiliateSetting.findUnique.mockResolvedValue({
        storeId: 'store-1',
        isEnabled: false,
      });

      await expect(
        service.createLink('user-c1', {
          targetUrl: '/book/book-1',
          targetBookId: 'book-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if target book itself is explicitly disabled', async () => {
      prisma.affiliateProfile.findUnique.mockResolvedValue(mockActiveProfile);
      prisma.book.findUnique.mockResolvedValue({
        id: 'book-1',
        storeId: 'store-1',
        title: 'Sách Kinh Tế',
        affiliateSetting: { isEligible: false },
      });
      prisma.storeAffiliateSetting.findUnique.mockResolvedValue({
        storeId: 'store-1',
        isEnabled: true,
      });

      await expect(
        service.createLink('user-c1', {
          targetUrl: '/book/book-1',
          targetBookId: 'book-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should generate link with custom shortCode if valid and available', async () => {
      prisma.affiliateProfile.findUnique.mockResolvedValue(mockActiveProfile);
      prisma.book.findUnique.mockResolvedValue({
        id: 'van-hoc',
        storeId: 'store-1',
        title: 'Văn học',
        affiliateSetting: null,
      });
      prisma.storeAffiliateSetting.findUnique.mockResolvedValue({
        storeId: 'store-1',
        isEnabled: true,
      });
      prisma.affiliateLink.findUnique.mockResolvedValue(null);
      prisma.affiliateLink.create.mockImplementation(({ data }: any) => ({
        id: 'link-1',
        ...data,
      }));

      const res = await service.createLink('user-c1', {
        targetUrl: 'https://huki.vn/books/van-hoc',
        customShortCode: 'vanhoc_hot',
        campaignName: 'Tet-2027',
        subId: 'facebook_group',
      });

      expect(res.shortCode).toBe('vanhoc_hot');
      expect(res.shortUrl).toBe('/r/vanhoc_hot');
      expect(res.campaignName).toBe('Tet-2027');
      expect(prisma.affiliateLink.create).toHaveBeenCalled();
    });
  });

  describe('2. Resolution, Bot Filtering & Deduplication (Decision 3)', () => {
    it('should throw NotFoundException if shortCode not found', async () => {
      prisma.affiliateLink.findUnique.mockResolvedValue(null);

      await expect(
        service.resolveShortCode('not-found', { ip: '1.2.3.4' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should identify bot User-Agent, returning redirect without click or attribution', async () => {
      prisma.affiliateLink.findUnique.mockResolvedValue({
        id: 'link-1',
        shortCode: 'docgia_abc',
        originalUrl: '/book/1',
        isActive: true,
        profile: { status: 'ACTIVE' },
      });

      const res = await service.resolveShortCode('docgia_abc', {
        ip: '66.249.66.1',
        userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      });

      expect(res.targetUrl).toBe('/book/1');
      expect(res.isBot).toBe(true);
      expect(res.cookieToken).toBeNull();
      expect(prisma.affiliateLink.update).not.toHaveBeenCalled();
      expect(prisma.affiliateAttribution.create).not.toHaveBeenCalled();
    });

    it('should rate-limit duplicate clicks from same IP within 1 minute', async () => {
      prisma.affiliateLink.findUnique.mockResolvedValue({
        id: 'link-1',
        shortCode: 'docgia_abc',
        originalUrl: '/book/1',
        isActive: true,
        profile: { status: 'ACTIVE' },
      });

      // Existing recent attribution from same IP within 1 minute
      prisma.affiliateAttribution.findFirst.mockResolvedValue({
        id: 'recent-attr',
        linkId: 'link-1',
      });

      const res = await service.resolveShortCode('docgia_abc', {
        ip: '14.161.20.10',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0',
      });

      expect(res.targetUrl).toBe('/book/1');
      expect(res.isThrottled).toBe(true);
      expect(res.cookieToken).toBeNull();
      expect(prisma.affiliateLink.update).not.toHaveBeenCalled();
    });

    it('should record valid human click and return secure cookie token', async () => {
      prisma.affiliateLink.findUnique.mockResolvedValue({
        id: 'link-1',
        shortCode: 'docgia_abc',
        originalUrl: '/book/1',
        isActive: true,
        profileId: 'p1',
        profile: { status: 'ACTIVE' },
      });
      prisma.affiliateAttribution.findFirst.mockResolvedValue(null);

      const res = await service.resolveShortCode('docgia_abc', {
        ip: '14.161.20.10',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      });

      expect(res.targetUrl).toBe('/book/1');
      expect(res.cookieToken).toBeDefined();
      expect(res.cookieMaxAgeSeconds).toBe(30 * 86400);
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('3. Anti-Fraud & Self-Referral Prevention (Decision 2)', () => {
    it('should block attribution if buyer matches affiliate partner (self-referral)', async () => {
      prisma.affiliateAttribution.findUnique.mockResolvedValue({
        id: 'attr-1',
        expiresAt: new Date(Date.now() + 86400000),
        profile: {
          id: 'p1',
          userId: 'user-partner-123',
          status: 'ACTIVE',
        },
      });

      const result = await service.verifyAttributionForCheckout(
        'valid-cookie-token',
        'user-partner-123', // Same user!
      );

      expect(result).toEqual({
        isValid: false,
        reason: 'SELF_REFERRAL_BLOCKED',
      });
    });

    it('should validate attribution when buyer is different user', async () => {
      prisma.affiliateAttribution.findUnique.mockResolvedValue({
        id: 'attr-1',
        linkId: 'l1',
        profileId: 'p1',
        expiresAt: new Date(Date.now() + 86400000),
        profile: {
          id: 'p1',
          userId: 'user-partner-123',
          affiliateCode: 'DOCGIA1',
          status: 'ACTIVE',
        },
      });

      const result = await service.verifyAttributionForCheckout(
        'valid-cookie-token',
        'buyer-customer-456', // Different user!
      );

      expect(result?.isValid).toBe(true);
      expect(result?.affiliateCode).toBe('DOCGIA1');
    });
  });

  describe('4. Book Detail Page Commission Card (Decision 4)', () => {
    it('should return live rates and calculate estimated commission for book', async () => {
      prisma.book.findUnique.mockResolvedValue({
        id: 'book-1',
        title: 'Đắc Nhân Tâm',
        price: '120000',
        format: BookFormat.PHYSICAL,
        storeId: 'store-1',
        affiliateSetting: null,
      });
      prisma.storeAffiliateSetting.findUnique.mockResolvedValue({
        storeId: 'store-1',
        isEnabled: true,
        physicalRate: 8.0,
      });
      prisma.affiliateProfile.findUnique.mockResolvedValue(mockActiveProfile);
      prisma.affiliateLink.findFirst.mockResolvedValue({
        shortCode: 'docgia1_dnt',
      });

      const card = await service.getBookCommissionForAffiliate(
        'user-c1',
        'book-1',
      );

      expect(card.price).toBe(120000);
      expect(card.effectiveRate).toBe(8.0);
      expect(card.estimatedCommissionAmount).toBe(9600); // 120,000 * 8%
      expect(card.isAffiliateActive).toBe(true);
      expect(card.existingShortUrl).toBe('/r/docgia1_dnt');
    });
  });
});
