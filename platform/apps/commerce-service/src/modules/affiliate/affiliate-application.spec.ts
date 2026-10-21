import { Test, TestingModule } from '@nestjs/testing';
import { AffiliateApplicationService } from './services/affiliate-application.service';
import { AffiliateAuditService } from './audit/affiliate-audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AffiliatePartnerStatus,
  AffiliateApplicantType,
  AffiliateChannelType,
  AffiliateFollowersRange,
} from '../../../prisma/generated/client';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { SubmitAffiliateApplicationDto } from './dto/affiliate-application.dto';

describe('AffiliateApplicationService — Registration & Review (Phase 3)', () => {
  let service: AffiliateApplicationService;
  let mockPrisma: any;
  let mockAuditService: any;

  beforeEach(async () => {
    mockPrisma = {
      affiliateProfile: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      affiliateChannel: {
        deleteMany: jest.fn(),
        create: jest.fn(),
      },
      affiliateConsent: {
        create: jest.fn(),
      },
      affiliateWallet: {
        upsert: jest.fn(),
      },
      notification: {
        create: jest.fn(),
      },
      outboxEvent: {
        create: jest.fn(),
      },
      affiliateAuditLog: {
        findMany: jest.fn(),
      },
      $transaction: jest.fn(async (cb: (tx: any) => Promise<any>) => cb(mockPrisma)),
    };

    mockAuditService = {
      log: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AffiliateApplicationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AffiliateAuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<AffiliateApplicationService>(AffiliateApplicationService);
  });

  describe('checkCodeAvailability', () => {
    it('should return available for valid new code', async () => {
      mockPrisma.affiliateProfile.findUnique.mockResolvedValue(null);

      const result = await service.checkCodeAvailability('BOOK_LOVER_99');
      expect(result.available).toBe(true);
      expect(result.code).toBe('BOOK_LOVER_99');
    });

    it('should reject codes with invalid length or characters', async () => {
      const resShort = await service.checkCodeAvailability('ABC');
      expect(resShort.available).toBe(false);

      const resSpecial = await service.checkCodeAvailability('INVALID@CODE');
      expect(resSpecial.available).toBe(false);
    });

    it('should reject reserved system codes', async () => {
      const result = await service.checkCodeAvailability('ADMIN');
      expect(result.available).toBe(false);
      expect(result.reason).toContain('danh sách từ khóa hệ thống');
    });

    it('should reject code if already taken', async () => {
      mockPrisma.affiliateProfile.findUnique.mockResolvedValue({ id: 'prof-existing' });

      const result = await service.checkCodeAvailability('TAKEN_CODE');
      expect(result.available).toBe(false);
      expect(result.reason).toContain('đã có người sử dụng');
    });
  });

  describe('submitApplication', () => {
    const validDto: SubmitAffiliateApplicationDto = {
      displayName: 'Nguyen Van A',
      affiliateCode: 'AFF_TESTER_01',
      bio: 'Toi la nguoi yeu sach va muon gioi thieu sach den cong dong doc gia.',
      contactEmail: 'tester@example.com',
      contactPhone: '0987654321',
      applicantType: AffiliateApplicantType.INDIVIDUAL,
      promotionDescription:
        'Toi chia se sach tren kenh TikTok va Facebook ca nhan voi cac video review sach hay.',
      hasPaidTraffic: false,
      contentCategories: ['cat-1', 'cat-2'],
      promotionMethods: ['review', 'social'],
      payoutSetupLater: true,
      channels: [
        {
          type: AffiliateChannelType.FACEBOOK,
          url: 'https://facebook.com/tester.book',
          canonicalUrl: 'https://facebook.com/tester.book',
          followersRange: AffiliateFollowersRange.FROM_1K_TO_5K,
          isPrimary: true,
        },
      ],
      termsVersion: '1.4.1',
      privacyVersion: '1.4.1',
    };

    it('should reject application with duplicate channels', async () => {
      mockPrisma.affiliateProfile.findUnique.mockResolvedValue(null);

      const duplicateChannelsDto: SubmitAffiliateApplicationDto = {
        ...validDto,
        channels: [
          {
            type: AffiliateChannelType.FACEBOOK,
            url: 'https://facebook.com/same',
            canonicalUrl: 'https://facebook.com/same',
            followersRange: AffiliateFollowersRange.FROM_1K_TO_5K,
            isPrimary: true,
          },
          {
            type: AffiliateChannelType.FACEBOOK,
            url: 'https://facebook.com/same?ref=123',
            canonicalUrl: 'https://facebook.com/same',
            followersRange: AffiliateFollowersRange.FROM_1K_TO_5K,
            isPrimary: false,
          },
        ],
      };

      await expect(service.submitApplication('user-1', duplicateChannelsDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject application if no primary channel is designated', async () => {
      mockPrisma.affiliateProfile.findUnique.mockResolvedValue(null);

      const noPrimaryDto = {
        ...validDto,
        channels: [
          {
            ...validDto.channels[0],
            isPrimary: false,
          },
        ],
      };

      await expect(service.submitApplication('user-1', noPrimaryDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject application if hasPaidTraffic is true but no paidTrafficSources', async () => {
      mockPrisma.affiliateProfile.findUnique.mockResolvedValue(null);

      const invalidPaidTrafficDto = {
        ...validDto,
        hasPaidTraffic: true,
        paidTrafficSources: [],
      };

      await expect(service.submitApplication('user-1', invalidPaidTrafficDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should block re-submission if user is within 14-day cooldown after rejection', async () => {
      const futureCooldown = new Date(Date.now() + 7 * 24 * 3600 * 1000); // 7 days remaining
      mockPrisma.affiliateProfile.findUnique.mockResolvedValue({
        id: 'prof-rejected',
        status: AffiliatePartnerStatus.REJECTED,
        cooldownUntil: futureCooldown,
      });

      await expect(service.submitApplication('user-1', validDto)).rejects.toThrow(ConflictException);
    });

    it('should succeed for fresh applicant: creates profile, channels, consent, notification, outbox', async () => {
      mockPrisma.affiliateProfile.findUnique.mockResolvedValue(null);
      mockPrisma.affiliateProfile.create.mockResolvedValue({
        id: 'prof-new-1',
        ...validDto,
        status: AffiliatePartnerStatus.PENDING_REVIEW,
      });

      const result = await service.submitApplication('user-1', validDto);

      expect(result.id).toBe('prof-new-1');
      expect(result.status).toBe(AffiliatePartnerStatus.PENDING_REVIEW);
      expect(mockPrisma.affiliateProfile.create).toHaveBeenCalled();
      expect(mockPrisma.affiliateChannel.create).toHaveBeenCalled();
      expect(mockPrisma.affiliateConsent.create).toHaveBeenCalled();
      expect(mockPrisma.notification.create).toHaveBeenCalled();
      expect(mockPrisma.outboxEvent.create).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalled();
    });
  });

  describe('resubmitApplication', () => {
    it('should allow resubmission when in REQUEST_CHANGES and resubmitCount < 3', async () => {
      mockPrisma.affiliateProfile.findUnique.mockResolvedValue({
        id: 'prof-changes',
        status: AffiliatePartnerStatus.REQUEST_CHANGES,
        resubmitCount: 1,
        displayName: 'Old Name',
      });

      mockPrisma.affiliateProfile.update.mockResolvedValue({
        id: 'prof-changes',
        status: AffiliatePartnerStatus.PENDING_REVIEW,
        resubmitCount: 2,
        displayName: 'Updated Name',
      });

      const result = await service.resubmitApplication('user-1', {
        displayName: 'Updated Name',
      });

      expect(result.status).toBe(AffiliatePartnerStatus.PENDING_REVIEW);
      expect(result.resubmitCount).toBe(2);
      expect(mockPrisma.notification.create).toHaveBeenCalled();
      expect(mockPrisma.outboxEvent.create).toHaveBeenCalled();
    });

    it('should auto-reject and set 14-day cooldown when resubmitCount reaches 3', async () => {
      mockPrisma.affiliateProfile.findUnique.mockResolvedValue({
        id: 'prof-max-resubmits',
        userId: 'user-1',
        status: AffiliatePartnerStatus.REQUEST_CHANGES,
        resubmitCount: 3, // Already used 3 attempts
      });

      await expect(
        service.resubmitApplication('user-1', { displayName: '4th Attempt' }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.affiliateProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prof-max-resubmits' },
          data: expect.objectContaining({
            status: AffiliatePartnerStatus.REJECTED,
            cooldownUntil: expect.any(Date),
          }),
        }),
      );
      expect(mockPrisma.outboxEvent.create).toHaveBeenCalled();
    });
  });

  describe('Admin Review Workflows', () => {
    it('adminApprove: should transition to ACTIVE and create AffiliateWallet', async () => {
      mockPrisma.affiliateProfile.findUnique.mockResolvedValue({
        id: 'prof-1',
        userId: 'user-1',
        affiliateCode: 'CODE_01',
        status: AffiliatePartnerStatus.PENDING_REVIEW,
      });

      mockPrisma.affiliateProfile.update.mockResolvedValue({
        id: 'prof-1',
        userId: 'user-1',
        status: AffiliatePartnerStatus.ACTIVE,
      });

      const result = await service.adminApprove('prof-1', 'admin-sub', 'PLATFORM_ADMIN');

      expect(result.status).toBe(AffiliatePartnerStatus.ACTIVE);
      expect(mockPrisma.affiliateWallet.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { affiliateProfileId: 'prof-1' },
        }),
      );
      expect(mockPrisma.notification.create).toHaveBeenCalled();
      expect(mockPrisma.outboxEvent.create).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('adminRequestChanges: should transition to REQUEST_CHANGES with reasons', async () => {
      mockPrisma.affiliateProfile.findUnique.mockResolvedValue({
        id: 'prof-1',
        userId: 'user-1',
        status: AffiliatePartnerStatus.PENDING_REVIEW,
      });

      mockPrisma.affiliateProfile.update.mockResolvedValue({
        id: 'prof-1',
        status: AffiliatePartnerStatus.REQUEST_CHANGES,
      });

      const result = await service.adminRequestChanges(
        'prof-1',
        'admin-sub',
        'PLATFORM_ADMIN',
        {
          reason: 'Kênh Facebook chưa đạt 1000 người theo dõi thật',
          requestedChanges: { channels: 'Cần bổ sung kênh khác có tương tác' },
        },
      );

      expect(result.status).toBe(AffiliatePartnerStatus.REQUEST_CHANGES);
      expect(mockPrisma.notification.create).toHaveBeenCalled();
      expect(mockPrisma.outboxEvent.create).toHaveBeenCalled();
    });

    it('adminReject: should transition to REJECTED and set 14-day cooldown', async () => {
      mockPrisma.affiliateProfile.findUnique.mockResolvedValue({
        id: 'prof-1',
        userId: 'user-1',
        status: AffiliatePartnerStatus.PENDING_REVIEW,
      });

      mockPrisma.affiliateProfile.update.mockResolvedValue({
        id: 'prof-1',
        status: AffiliatePartnerStatus.REJECTED,
      });

      const result = await service.adminReject(
        'prof-1',
        'admin-sub',
        'PLATFORM_ADMIN',
        'Nội dung kênh không phù hợp với chính sách HuKi',
      );

      expect(result.status).toBe(AffiliatePartnerStatus.REJECTED);
      expect(mockPrisma.affiliateProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: AffiliatePartnerStatus.REJECTED,
            cooldownUntil: expect.any(Date),
          }),
        }),
      );
      expect(mockPrisma.notification.create).toHaveBeenCalled();
    });

    it('adminSuspend & adminActivate: should correctly toggle ACTIVE and SUSPENDED', async () => {
      mockPrisma.affiliateProfile.findUnique.mockResolvedValue({
        id: 'prof-1',
        userId: 'user-1',
        status: AffiliatePartnerStatus.ACTIVE,
      });

      mockPrisma.affiliateProfile.update.mockResolvedValue({
        id: 'prof-1',
        status: AffiliatePartnerStatus.SUSPENDED,
      });

      const suspended = await service.adminSuspend('prof-1', 'admin-1', 'PLATFORM_ADMIN', 'Gian lận click');
      expect(suspended.status).toBe(AffiliatePartnerStatus.SUSPENDED);

      mockPrisma.affiliateProfile.findUnique.mockResolvedValue({
        id: 'prof-1',
        userId: 'user-1',
        status: AffiliatePartnerStatus.SUSPENDED,
      });

      mockPrisma.affiliateProfile.update.mockResolvedValue({
        id: 'prof-1',
        status: AffiliatePartnerStatus.ACTIVE,
      });

      const activated = await service.adminActivate('prof-1', 'admin-1', 'PLATFORM_ADMIN');
      expect(activated.status).toBe(AffiliatePartnerStatus.ACTIVE);
    });
  });
});
