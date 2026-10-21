import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AffiliateAuditService } from '../audit/affiliate-audit.service';
import {
  AffiliatePartnerStatus,
  AffiliateApplicantType,
  Prisma,
} from '../../../../prisma/generated/client';
import {
  SubmitAffiliateApplicationDto,
  ResubmitAffiliateApplicationDto,
  AdminReviewApplicationDto,
} from '../dto/affiliate-application.dto';
import { AFFILIATE_EVENTS } from '@huki/shared';
import { randomBytes } from 'crypto';

const RESERVED_AFFILIATE_CODES = new Set([
  'ADMIN',
  'ADMINISTRATOR',
  'HUKI',
  'HUKIEBOOK',
  'ROOT',
  'API',
  'AFFILIATE',
  'PARTNER',
  'SUPPORT',
  'HELP',
  'SYSTEM',
  'MODERATOR',
  'STAFF',
  'OFFICIAL',
]);

@Injectable()
export class AffiliateApplicationService {
  private readonly logger = new Logger(AffiliateApplicationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AffiliateAuditService,
  ) {}

  /**
   * Check affiliateCode availability and validate format/reserved words
   */
  async checkCodeAvailability(rawCode: string): Promise<{
    code: string;
    available: boolean;
    reason?: string;
  }> {
    const code = (rawCode || '').trim().toUpperCase();

    if (!code || code.length < 4 || code.length > 24) {
      return {
        code,
        available: false,
        reason: 'Mã tiếp thị phải từ 4 đến 24 ký tự',
      };
    }

    if (!/^[A-Z0-9_]+$/.test(code)) {
      return {
        code,
        available: false,
        reason: 'Mã tiếp thị chỉ gồm chữ cái, số và dấu gạch dưới',
      };
    }

    if (RESERVED_AFFILIATE_CODES.has(code)) {
      return {
        code,
        available: false,
        reason: 'Mã tiếp thị thuộc danh sách từ khóa hệ thống dành riêng',
      };
    }

    const existing = await this.prisma.affiliateProfile.findUnique({
      where: { affiliateCode: code },
      select: { id: true },
    });

    if (existing) {
      return {
        code,
        available: false,
        reason: 'Mã tiếp thị đã có người sử dụng',
      };
    }

    return {
      code,
      available: true,
    };
  }

  /**
   * Get application/profile of current user
   */
  async getMyProfile(userId: string): Promise<any> {
    const profile = await this.prisma.affiliateProfile.findUnique({
      where: { userId },
      include: {
        channels: { orderBy: { isPrimary: 'desc' } },
        consents: { orderBy: { acceptedAt: 'desc' }, take: 1 },
        wallet: true,
      },
    });

    if (!profile) {
      return {
        hasProfile: false,
        profile: null,
      };
    }

    const now = new Date();
    const isCoolingDown =
      profile.status === AffiliatePartnerStatus.REJECTED &&
      profile.cooldownUntil &&
      now < profile.cooldownUntil;

    return {
      hasProfile: true,
      profile: {
        ...profile,
        isCoolingDown,
        cooldownRemainingMs: isCoolingDown && profile.cooldownUntil ? profile.cooldownUntil.getTime() - now.getTime() : 0,
        canResubmit: profile.status === AffiliatePartnerStatus.REQUEST_CHANGES && profile.resubmitCount < 3,
        remainingResubmits: Math.max(0, 3 - profile.resubmitCount),
      },
    };
  }

  /**
   * Submit new affiliate application
   */
  async submitApplication(
    userId: string,
    dto: SubmitAffiliateApplicationDto,
    meta: { ipAddress?: string; userAgent?: string; requestId?: string } = {},
  ): Promise<any> {
    // 1. Check existing profile for this user
    const existing = await this.prisma.affiliateProfile.findUnique({
      where: { userId },
    });

    const now = new Date();

    if (existing) {
      if (existing.status === AffiliatePartnerStatus.ACTIVE) {
        throw new ConflictException('Tài khoản đã có hồ sơ Tiếp thị liên kết đang hoạt động');
      }
      if (existing.status === AffiliatePartnerStatus.PENDING_REVIEW) {
        throw new ConflictException('Hồ sơ của bạn đang trong hàng đợi xét duyệt');
      }
      if (existing.status === AffiliatePartnerStatus.REQUEST_CHANGES) {
        throw new ConflictException(
          'Hồ sơ của bạn đã có yêu cầu chỉnh sửa. Vui lòng sử dụng chức năng nộp lại (resubmit).',
        );
      }
      if (existing.status === AffiliatePartnerStatus.REJECTED) {
        if (existing.cooldownUntil && now < existing.cooldownUntil) {
          const dateStr = existing.cooldownUntil.toLocaleDateString('vi-VN');
          throw new ConflictException(
            `Hồ sơ của bạn đã bị từ chối trước đó. Bạn có thể nộp lại hồ sơ sau ngày ${dateStr} (hết thời gian chờ 14 ngày).`,
          );
        }
      }
    }

    // 2. Validate Channels: 1-10 channels, exactly 1 primary, no duplicate canonicalUrl
    if (!dto.channels || dto.channels.length === 0) {
      throw new BadRequestException('Bắt buộc phải có ít nhất 1 kênh quảng bá');
    }
    if (dto.channels.length > 10) {
      throw new BadRequestException('Tối đa 10 kênh quảng bá');
    }

    const primaryCount = dto.channels.filter((c) => c.isPrimary).length;
    if (primaryCount !== 1) {
      throw new BadRequestException('Hồ sơ phải có chính xác 1 kênh chính (isPrimary = true)');
    }

    const canonicalSet = new Set<string>();
    for (const c of dto.channels) {
      const canonical = c.canonicalUrl.toLowerCase().trim();
      if (canonicalSet.has(canonical)) {
        throw new BadRequestException(`Phát hiện kênh trùng lặp trong hồ sơ: ${c.url}`);
      }
      canonicalSet.add(canonical);
    }

    // 3. Validate Paid Traffic condition
    if (dto.hasPaidTraffic && (!dto.paidTrafficSources || dto.paidTrafficSources.length === 0)) {
      throw new BadRequestException('Khi bật lưu lượng trả phí, bắt buộc phải chọn ít nhất 1 nguồn paid traffic');
    }

    // 4. Validate affiliateCode
    const codeCheck = await this.checkCodeAvailability(dto.affiliateCode);
    if (!codeCheck.available) {
      // If user had existing rejected profile with same code, allow reusing own code
      if (!existing || existing.affiliateCode !== dto.affiliateCode.toUpperCase()) {
        throw new ConflictException(codeCheck.reason || 'Mã tiếp thị không khả dụng');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      let profile: any;

      if (existing && existing.status === AffiliatePartnerStatus.REJECTED) {
        // Re-activating previously rejected profile after cooldown
        await tx.affiliateChannel.deleteMany({
          where: { profileId: existing.id },
        });

        profile = await tx.affiliateProfile.update({
          where: { id: existing.id },
          data: {
            displayName: dto.displayName.trim(),
            affiliateCode: dto.affiliateCode.trim().toUpperCase(),
            bio: dto.bio.trim(),
            contactEmail: dto.contactEmail.trim().toLowerCase(),
            contactPhone: dto.contactPhone.trim(),
            applicantType: dto.applicantType,
            promotionDescription: dto.promotionDescription.trim(),
            hasPaidTraffic: dto.hasPaidTraffic,
            paidTrafficSources: dto.hasPaidTraffic ? dto.paidTrafficSources : [],
            contentCategories: dto.contentCategories,
            promotionMethods: dto.promotionMethods,
            taxId: dto.taxId ? dto.taxId.trim() : null,
            payoutSetupLater: dto.payoutSetupLater,
            avatarUrl: dto.avatarUrl || null,
            status: AffiliatePartnerStatus.PENDING_REVIEW,
            rejectionReason: null,
            requestedChanges: Prisma.DbNull,
            resubmitCount: 0,
            cooldownUntil: null,
            version: { increment: 1 },
          },
        });
      } else {
        // Fresh profile creation
        profile = await tx.affiliateProfile.create({
          data: {
            userId,
            displayName: dto.displayName.trim(),
            affiliateCode: dto.affiliateCode.trim().toUpperCase(),
            bio: dto.bio.trim(),
            contactEmail: dto.contactEmail.trim().toLowerCase(),
            contactPhone: dto.contactPhone.trim(),
            applicantType: dto.applicantType,
            promotionDescription: dto.promotionDescription.trim(),
            hasPaidTraffic: dto.hasPaidTraffic,
            paidTrafficSources: dto.hasPaidTraffic ? dto.paidTrafficSources : [],
            contentCategories: dto.contentCategories,
            promotionMethods: dto.promotionMethods,
            taxId: dto.taxId ? dto.taxId.trim() : null,
            payoutSetupLater: dto.payoutSetupLater,
            avatarUrl: dto.avatarUrl || null,
            status: AffiliatePartnerStatus.PENDING_REVIEW,
            resubmitCount: 0,
          },
        });
      }

      // Create channels
      for (const c of dto.channels) {
        await tx.affiliateChannel.create({
          data: {
            profileId: profile.id,
            type: c.type,
            url: c.url.trim(),
            canonicalUrl: c.canonicalUrl.toLowerCase().trim(),
            handle: c.handle ? c.handle.trim() : null,
            followersRange: c.followersRange,
            isPrimary: c.isPrimary,
          },
        });
      }

      // Record consent
      await tx.affiliateConsent.create({
        data: {
          profileId: profile.id,
          termsVersion: dto.termsVersion,
          privacyVersion: dto.privacyVersion,
          marketingConsent: dto.marketingConsent || false,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        },
      });

      // Create in-app notification
      await tx.notification.create({
        data: {
          userId,
          type: 'AFFILIATE_APPLICATION_RECEIVED',
          title: 'Hồ sơ Tiếp thị liên kết đã được gửi',
          message:
            'Hồ sơ của bạn đã được chuyển vào hàng đợi xét duyệt. Đội ngũ HuKi sẽ phản hồi trong vòng 48 giờ.',
          data: {
            profileId: profile.id,
            affiliateCode: profile.affiliateCode,
          },
        },
      });

      // Create outbox event
      await tx.outboxEvent.create({
        data: {
          eventId: randomBytes(16).toString('hex'),
          type: AFFILIATE_EVENTS.APPLICATION_SUBMITTED,
          aggregateId: profile.id,
          payload: {
            profileId: profile.id,
            userId,
            affiliateCode: profile.affiliateCode,
            displayName: profile.displayName,
            submittedAt: now.toISOString(),
          },
        },
      });

      // Audit log
      await this.auditService.log(
        {
          actorId: userId,
          actorRole: 'USER',
          action: 'AFFILIATE_APPLICATION_SUBMITTED',
          resource: 'AffiliateProfile',
          resourceId: profile.id,
          afterState: {
            id: profile.id,
            affiliateCode: profile.affiliateCode,
            status: profile.status,
          },
          requestId: meta.requestId,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        },
        tx,
      );

      return profile;
    });
  }

  /**
   * Resubmit application after Admin requested changes
   * Rule: Maximum 3 resubmits. If >= 3, automatically transition to REJECTED with 14-day cooldown.
   */
  async resubmitApplication(
    userId: string,
    dto: ResubmitAffiliateApplicationDto,
    meta: { ipAddress?: string; userAgent?: string; requestId?: string } = {},
  ): Promise<any> {
    const profile = await this.prisma.affiliateProfile.findUnique({
      where: { userId },
      include: { channels: true },
    });

    if (!profile) {
      throw new NotFoundException('Không tìm thấy hồ sơ Tiếp thị liên kết');
    }

    if (profile.status !== AffiliatePartnerStatus.REQUEST_CHANGES) {
      throw new ConflictException(
        `Chỉ có thể nộp lại hồ sơ khi ở trạng thái YÊU CẦU CHỈNH SỬA (REQUEST_CHANGES). Trạng thái hiện tại: ${profile.status}`,
      );
    }

    const now = new Date();

    // Check maximum 3 resubmission attempts limit
    if (profile.resubmitCount >= 3) {
      const cooldownUntil = new Date(now.getTime() + 14 * 24 * 3600 * 1000);
      const autoRejectReason = 'Hồ sơ đã vượt quá số lần yêu cầu chỉnh sửa (tối đa 3 lần).';

      await this.prisma.$transaction(async (tx) => {
        await tx.affiliateProfile.update({
          where: { id: profile.id },
          data: {
            status: AffiliatePartnerStatus.REJECTED,
            rejectionReason: autoRejectReason,
            cooldownUntil,
            version: { increment: 1 },
          },
        });

        await tx.notification.create({
          data: {
            userId,
            type: 'AFFILIATE_APPLICATION_AUTO_REJECTED',
            title: 'Hồ sơ Tiếp thị liên kết đã bị từ chối',
            message: `${autoRejectReason} Bạn có thể nộp lại hồ sơ sau 14 ngày.`,
            data: {
              profileId: profile.id,
              cooldownUntil: cooldownUntil.toISOString(),
            },
          },
        });

        await tx.outboxEvent.create({
          data: {
            eventId: randomBytes(16).toString('hex'),
            type: AFFILIATE_EVENTS.APPLICATION_REJECTED,
            aggregateId: profile.id,
            payload: {
              profileId: profile.id,
              userId,
              reason: autoRejectReason,
              cooldownUntil: cooldownUntil.toISOString(),
            },
          },
        });

        await this.auditService.log(
          {
            actorId: 'SYSTEM',
            actorRole: 'SYSTEM',
            action: 'AFFILIATE_APPLICATION_AUTO_REJECTED_MAX_ATTEMPTS',
            resource: 'AffiliateProfile',
            resourceId: profile.id,
            reason: autoRejectReason,
            afterState: { status: AffiliatePartnerStatus.REJECTED, cooldownUntil },
            requestId: meta.requestId,
          },
          tx,
        );
      });

      throw new BadRequestException(
        'Hồ sơ của bạn đã vượt quá 3 lần chỉnh sửa và tự động bị từ chối. Bạn có thể nộp lại sau 14 ngày.',
      );
    }

    // Process valid resubmission
    return this.prisma.$transaction(async (tx) => {
      const newResubmitCount = profile.resubmitCount + 1;

      // Update channels if provided
      if (dto.channels && dto.channels.length > 0) {
        const primaryCount = dto.channels.filter((c) => c.isPrimary).length;
        if (primaryCount !== 1) {
          throw new BadRequestException('Hồ sơ phải có chính xác 1 kênh chính');
        }

        await tx.affiliateChannel.deleteMany({
          where: { profileId: profile.id },
        });

        for (const c of dto.channels) {
          await tx.affiliateChannel.create({
            data: {
              profileId: profile.id,
              type: c.type,
              url: c.url.trim(),
              canonicalUrl: c.canonicalUrl.toLowerCase().trim(),
              handle: c.handle ? c.handle.trim() : null,
              followersRange: c.followersRange,
              isPrimary: c.isPrimary,
            },
          });
        }
      }

      const updated = await tx.affiliateProfile.update({
        where: { id: profile.id },
        data: {
          displayName: dto.displayName ? dto.displayName.trim() : profile.displayName,
          bio: dto.bio ? dto.bio.trim() : profile.bio,
          contactEmail: dto.contactEmail ? dto.contactEmail.trim().toLowerCase() : profile.contactEmail,
          contactPhone: dto.contactPhone ? dto.contactPhone.trim() : profile.contactPhone,
          promotionDescription: dto.promotionDescription
            ? dto.promotionDescription.trim()
            : profile.promotionDescription,
          hasPaidTraffic: dto.hasPaidTraffic !== undefined ? dto.hasPaidTraffic : profile.hasPaidTraffic,
          paidTrafficSources: (dto.paidTrafficSources ? dto.paidTrafficSources : profile.paidTrafficSources) as Prisma.InputJsonValue,
          contentCategories: (dto.contentCategories ? dto.contentCategories : profile.contentCategories) as Prisma.InputJsonValue,
          promotionMethods: (dto.promotionMethods ? dto.promotionMethods : profile.promotionMethods) as Prisma.InputJsonValue,
          taxId: dto.taxId !== undefined ? (dto.taxId ? dto.taxId.trim() : null) : profile.taxId,
          status: AffiliatePartnerStatus.PENDING_REVIEW,
          requestedChanges: Prisma.DbNull,
          resubmitCount: newResubmitCount,
          version: { increment: 1 },
        },
      });

      await tx.notification.create({
        data: {
          userId,
          type: 'AFFILIATE_APPLICATION_RESUBMITTED',
          title: 'Hồ sơ đã được gửi lại thành công',
          message: `Hồ sơ chỉnh sửa của bạn (lần ${newResubmitCount}/3) đã được chuyển đến ban quản trị để xét duyệt.`,
          data: {
            profileId: profile.id,
            resubmitCount: newResubmitCount,
          },
        },
      });

      await tx.outboxEvent.create({
        data: {
          eventId: randomBytes(16).toString('hex'),
          type: AFFILIATE_EVENTS.APPLICATION_SUBMITTED,
          aggregateId: profile.id,
          payload: {
            profileId: profile.id,
            userId,
            resubmitCount: newResubmitCount,
            resubmittedAt: now.toISOString(),
          },
        },
      });

      await this.auditService.log(
        {
          actorId: userId,
          actorRole: 'USER',
          action: 'AFFILIATE_APPLICATION_RESUBMITTED',
          resource: 'AffiliateProfile',
          resourceId: profile.id,
          beforeState: { status: profile.status, resubmitCount: profile.resubmitCount },
          afterState: { status: updated.status, resubmitCount: updated.resubmitCount },
          requestId: meta.requestId,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        },
        tx,
      );

      return updated;
    });
  }

  // ============================================
  // ADMIN REVIEW & WORKFLOWS
  // ============================================

  /**
   * List affiliate applications for Admin review queue
   */
  async adminListApplications(query: {
    status?: AffiliatePartnerStatus;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    items: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit || 20)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { affiliateCode: { contains: term, mode: 'insensitive' } },
        { displayName: { contains: term, mode: 'insensitive' } },
        { contactEmail: { contains: term, mode: 'insensitive' } },
        { contactPhone: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.affiliateProfile.findMany({
        where,
        include: {
          channels: { where: { isPrimary: true } },
          wallet: {
            select: {
              availableBalance: true,
              lifetimeEarned: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.affiliateProfile.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get single application details for Admin
   */
  async adminGetApplicationDetail(profileId: string): Promise<any> {
    const profile = await this.prisma.affiliateProfile.findUnique({
      where: { id: profileId },
      include: {
        channels: true,
        consents: { orderBy: { acceptedAt: 'desc' } },
        wallet: true,
        fraudCases: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!profile) {
      throw new NotFoundException(`Không tìm thấy hồ sơ đối tác với ID: ${profileId}`);
    }

    const auditLogs = await this.prisma.affiliateAuditLog.findMany({
      where: { resourceId: profileId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      profile,
      auditTimeline: auditLogs,
    };
  }

  /**
   * Admin approves application -> ACTIVE
   */
  async adminApprove(
    profileId: string,
    reviewerId: string,
    reviewerRole: string,
    meta: { requestId?: string } = {},
  ): Promise<any> {
    const profile = await this.prisma.affiliateProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile) {
      throw new NotFoundException(`Không tìm thấy hồ sơ ${profileId}`);
    }

    if (profile.status === AffiliatePartnerStatus.ACTIVE) {
      return profile; // Idempotent
    }

    if (profile.status !== AffiliatePartnerStatus.PENDING_REVIEW) {
      throw new ConflictException(
        `Không thể phê duyệt hồ sơ ở trạng thái '${profile.status}'. Hồ sơ phải ở PENDING_REVIEW.`,
      );
    }

    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.affiliateProfile.update({
        where: { id: profileId },
        data: {
          status: AffiliatePartnerStatus.ACTIVE,
          reviewedBy: reviewerId,
          reviewedAt: now,
          rejectionReason: null,
          requestedChanges: Prisma.DbNull,
          version: { increment: 1 },
        },
      });

      // Ensure wallet exists
      await tx.affiliateWallet.upsert({
        where: { affiliateProfileId: profileId },
        create: {
          affiliateProfileId: profileId,
          userId: profile.userId,
        },
        update: {},
      });

      // Notify user
      await tx.notification.create({
        data: {
          userId: profile.userId,
          type: 'AFFILIATE_APPLICATION_APPROVED',
          title: 'Chúc mừng! Hồ sơ Tiếp thị liên kết đã được phê duyệt',
          message: `Chào mừng bạn gia nhập mạng lưới đối tác HuKi! Mã tiếp thị của bạn là [${profile.affiliateCode}].`,
          data: {
            profileId,
            affiliateCode: profile.affiliateCode,
          },
        },
      });

      // Outbox event
      await tx.outboxEvent.create({
        data: {
          eventId: randomBytes(16).toString('hex'),
          type: AFFILIATE_EVENTS.APPLICATION_APPROVED,
          aggregateId: profileId,
          payload: {
            profileId,
            userId: profile.userId,
            affiliateCode: profile.affiliateCode,
            approvedBy: reviewerId,
            approvedAt: now.toISOString(),
          },
        },
      });

      // Audit log
      await this.auditService.log(
        {
          actorId: reviewerId,
          actorRole: reviewerRole,
          action: 'AFFILIATE_APPLICATION_APPROVED',
          resource: 'AffiliateProfile',
          resourceId: profileId,
          beforeState: { status: profile.status },
          afterState: { status: updated.status, reviewedBy: reviewerId },
          requestId: meta.requestId,
        },
        tx,
      );

      return updated;
    });
  }

  /**
   * Admin requests changes from applicant -> REQUEST_CHANGES
   */
  async adminRequestChanges(
    profileId: string,
    reviewerId: string,
    reviewerRole: string,
    dto: { reason: string; requestedChanges?: Record<string, string> },
    meta: { requestId?: string } = {},
  ): Promise<any> {
    const profile = await this.prisma.affiliateProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile) {
      throw new NotFoundException(`Không tìm thấy hồ sơ ${profileId}`);
    }

    if (profile.status !== AffiliatePartnerStatus.PENDING_REVIEW) {
      throw new ConflictException(
        `Chỉ có thể yêu cầu chỉnh sửa hồ sơ ở trạng thái PENDING_REVIEW. Hiện tại: ${profile.status}`,
      );
    }

    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.affiliateProfile.update({
        where: { id: profileId },
        data: {
          status: AffiliatePartnerStatus.REQUEST_CHANGES,
          reviewedBy: reviewerId,
          reviewedAt: now,
          rejectionReason: dto.reason.trim(),
          requestedChanges: dto.requestedChanges || {},
          version: { increment: 1 },
        },
      });

      await tx.notification.create({
        data: {
          userId: profile.userId,
          type: 'AFFILIATE_APPLICATION_REQUEST_CHANGES',
          title: 'Hồ sơ Tiếp thị liên kết cần bổ sung thông tin',
          message: `Ban quản trị yêu cầu chỉnh sửa hồ sơ: "${dto.reason}". Bạn có thể chỉnh sửa và nộp lại ngay.`,
          data: {
            profileId,
            reason: dto.reason,
            requestedChanges: dto.requestedChanges,
          },
        },
      });

      await tx.outboxEvent.create({
        data: {
          eventId: randomBytes(16).toString('hex'),
          type: AFFILIATE_EVENTS.APPLICATION_CHANGES_REQUESTED,
          aggregateId: profileId,
          payload: {
            profileId,
            userId: profile.userId,
            reason: dto.reason,
            requestedChanges: dto.requestedChanges,
          },
        },
      });

      await this.auditService.log(
        {
          actorId: reviewerId,
          actorRole: reviewerRole,
          action: 'AFFILIATE_APPLICATION_CHANGES_REQUESTED',
          resource: 'AffiliateProfile',
          resourceId: profileId,
          reason: dto.reason,
          beforeState: { status: profile.status },
          afterState: { status: updated.status, reason: dto.reason },
          requestId: meta.requestId,
        },
        tx,
      );

      return updated;
    });
  }

  /**
   * Admin rejects application -> REJECTED with 14 days cooldown
   */
  async adminReject(
    profileId: string,
    reviewerId: string,
    reviewerRole: string,
    reason: string,
    meta: { requestId?: string } = {},
  ): Promise<any> {
    const profile = await this.prisma.affiliateProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile) {
      throw new NotFoundException(`Không tìm thấy hồ sơ ${profileId}`);
    }

    const now = new Date();
    const cooldownUntil = new Date(now.getTime() + 14 * 24 * 3600 * 1000);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.affiliateProfile.update({
        where: { id: profileId },
        data: {
          status: AffiliatePartnerStatus.REJECTED,
          reviewedBy: reviewerId,
          reviewedAt: now,
          rejectionReason: reason.trim(),
          cooldownUntil,
          version: { increment: 1 },
        },
      });

      await tx.notification.create({
        data: {
          userId: profile.userId,
          type: 'AFFILIATE_APPLICATION_REJECTED',
          title: 'Hồ sơ Tiếp thị liên kết không được chấp thuận',
          message: `Lý do: "${reason}". Bạn có thể gửi lại hồ sơ sau 14 ngày (${cooldownUntil.toLocaleDateString('vi-VN')}).`,
          data: {
            profileId,
            reason,
            cooldownUntil: cooldownUntil.toISOString(),
          },
        },
      });

      await tx.outboxEvent.create({
        data: {
          eventId: randomBytes(16).toString('hex'),
          type: AFFILIATE_EVENTS.APPLICATION_REJECTED,
          aggregateId: profileId,
          payload: {
            profileId,
            userId: profile.userId,
            reason,
            cooldownUntil: cooldownUntil.toISOString(),
          },
        },
      });

      await this.auditService.log(
        {
          actorId: reviewerId,
          actorRole: reviewerRole,
          action: 'AFFILIATE_APPLICATION_REJECTED',
          resource: 'AffiliateProfile',
          resourceId: profileId,
          reason,
          beforeState: { status: profile.status },
          afterState: { status: updated.status, reason, cooldownUntil },
          requestId: meta.requestId,
        },
        tx,
      );

      return updated;
    });
  }

  /**
   * Admin suspends active partner -> SUSPENDED
   */
  async adminSuspend(
    profileId: string,
    reviewerId: string,
    reviewerRole: string,
    reason: string,
    meta: { requestId?: string } = {},
  ): Promise<any> {
    const profile = await this.prisma.affiliateProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile) {
      throw new NotFoundException(`Không tìm thấy hồ sơ ${profileId}`);
    }

    if (profile.status !== AffiliatePartnerStatus.ACTIVE) {
      throw new ConflictException(`Chỉ có thể tạm ngưng hồ sơ đang ACTIVE. Hiện tại: ${profile.status}`);
    }

    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.affiliateProfile.update({
        where: { id: profileId },
        data: {
          status: AffiliatePartnerStatus.SUSPENDED,
          suspendedAt: now,
          suspendedReason: reason.trim(),
          version: { increment: 1 },
        },
      });

      await tx.notification.create({
        data: {
          userId: profile.userId,
          type: 'AFFILIATE_PROFILE_SUSPENDED',
          title: 'Tài khoản Tiếp thị liên kết đã bị tạm ngưng',
          message: `Tài khoản đối tác của bạn bị tạm ngưng do: "${reason}". Vui lòng liên hệ hỗ trợ để biết thêm chi tiết.`,
          data: {
            profileId,
            reason,
          },
        },
      });

      await tx.outboxEvent.create({
        data: {
          eventId: randomBytes(16).toString('hex'),
          type: AFFILIATE_EVENTS.PROFILE_SUSPENDED,
          aggregateId: profileId,
          payload: {
            profileId,
            userId: profile.userId,
            reason,
            suspendedAt: now.toISOString(),
          },
        },
      });

      await this.auditService.log(
        {
          actorId: reviewerId,
          actorRole: reviewerRole,
          action: 'AFFILIATE_PROFILE_SUSPENDED',
          resource: 'AffiliateProfile',
          resourceId: profileId,
          reason,
          beforeState: { status: profile.status },
          afterState: { status: updated.status, reason },
          requestId: meta.requestId,
        },
        tx,
      );

      return updated;
    });
  }

  /**
   * Admin re-activates suspended partner -> ACTIVE
   */
  async adminActivate(
    profileId: string,
    reviewerId: string,
    reviewerRole: string,
    meta: { requestId?: string } = {},
  ): Promise<any> {
    const profile = await this.prisma.affiliateProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile) {
      throw new NotFoundException(`Không tìm thấy hồ sơ ${profileId}`);
    }

    if (profile.status !== AffiliatePartnerStatus.SUSPENDED) {
      throw new ConflictException(`Chỉ có thể kích hoạt lại hồ sơ đang SUSPENDED. Hiện tại: ${profile.status}`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.affiliateProfile.update({
        where: { id: profileId },
        data: {
          status: AffiliatePartnerStatus.ACTIVE,
          suspendedAt: null,
          suspendedReason: null,
          version: { increment: 1 },
        },
      });

      await tx.notification.create({
        data: {
          userId: profile.userId,
          type: 'AFFILIATE_PROFILE_ACTIVATED',
          title: 'Tài khoản Tiếp thị liên kết đã được khôi phục',
          message: 'Tài khoản đối tác của bạn đã được kích hoạt lại và có thể tiếp tục tạo link quảng bá.',
          data: { profileId },
        },
      });

      await tx.outboxEvent.create({
        data: {
          eventId: randomBytes(16).toString('hex'),
          type: AFFILIATE_EVENTS.PROFILE_ACTIVATED,
          aggregateId: profileId,
          payload: {
            profileId,
            userId: profile.userId,
          },
        },
      });

      await this.auditService.log(
        {
          actorId: reviewerId,
          actorRole: reviewerRole,
          action: 'AFFILIATE_PROFILE_REACTIVATED',
          resource: 'AffiliateProfile',
          resourceId: profileId,
          beforeState: { status: profile.status },
          afterState: { status: updated.status },
          requestId: meta.requestId,
        },
        tx,
      );

      return updated;
    });
  }
}
