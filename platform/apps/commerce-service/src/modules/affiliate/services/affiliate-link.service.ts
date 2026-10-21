import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { AffiliateAuditService } from '../audit/affiliate-audit.service';
import {
  CreateAffiliateLinkDto,
  QueryAffiliateLinksDto,
} from '../dto/affiliate-link.dto';
import {
  AffiliateLinkTargetType,
  BookFormat,
} from '../../../../prisma/generated/client';

const BOT_USER_AGENT_REGEX =
  /(bot|crawler|spider|googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|rogerbot|linkedinbot|embedly|quora link preview|showyoubot|outbrain|pinterest\/0\.|pinterestbot|slackbot|vkShare|W3C_Validator|whatsapp)/i;

@Injectable()
export class AffiliateLinkService {
  private readonly logger = new Logger(AffiliateLinkService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AffiliateAuditService,
  ) {}

  /**
   * Helper: Get current active platform policy
   */
  async getActivePolicy() {
    const policy = await this.prisma.affiliatePolicy.findFirst({
      where: { isActive: true },
      orderBy: { effectiveFrom: 'desc' },
    });

    return (
      policy || {
        id: 'default-fallback',
        cookieDurationDays: 30,
        defaultPhysicalRate: 5.0,
        defaultEbookRate: 10.0,
        defaultAudioRate: 10.0,
        minRate: 1.0,
        maxPhysicalRate: 30.0,
        maxDigitalRate: 50.0,
      }
    );
  }

  /**
   * 1. Create a new Affiliate Link
   */
  async createLink(userId: string, dto: CreateAffiliateLinkDto) {
    // 1. Verify user profile exists and is ACTIVE
    const profile = await this.prisma.affiliateProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Hồ sơ đối tác tiếp thị không tồn tại');
    }

    if (profile.status !== 'ACTIVE') {
      throw new ForbiddenException(
        'Tài khoản đối tác chưa được kích hoạt hoặc đang tạm ngưng',
      );
    }

    // 2. Parse target URL to deduce TargetType and IDs
    const parsedTarget = this.parseTargetUrl(
      dto.targetUrl,
      dto.targetBookId,
      dto.targetStoreId,
    );

    // 3. If target is BOOK, verify book exists and check affiliate eligibility
    if (parsedTarget.targetBookId) {
      const book = await this.prisma.book.findUnique({
        where: { id: parsedTarget.targetBookId },
        include: {
          affiliateSetting: true,
        },
      });

      if (!book) {
        throw new NotFoundException('Sách không tồn tại trong hệ thống');
      }

      // Check store affiliate setting
      const storeSetting = await this.prisma.storeAffiliateSetting.findUnique({
        where: { storeId: book.storeId },
      });

      if (storeSetting && !storeSetting.isEnabled) {
        throw new BadRequestException(
          'Gian hàng của cuốn sách này hiện đang tạm tắt chương trình tiếp thị liên kết',
        );
      }

      // Check book specific override
      if (book.affiliateSetting && !book.affiliateSetting.isEligible) {
        throw new BadRequestException(
          'Cuốn sách này hiện không tham gia chương trình tiếp thị liên kết',
        );
      }

      parsedTarget.targetStoreId = book.storeId;
    }

    // 4. Resolve Short Code
    let shortCode: string;
    if (dto.customShortCode) {
      const existing = await this.prisma.affiliateLink.findUnique({
        where: { shortCode: dto.customShortCode.toLowerCase() },
      });
      if (existing) {
        throw new BadRequestException(
          `Mã rút gọn "${dto.customShortCode}" đã được sử dụng. Vui lòng chọn mã khác`,
        );
      }
      shortCode = dto.customShortCode.toLowerCase();
    } else {
      // Auto generate: ${affiliateCode}_${random6}
      shortCode = await this.generateUniqueShortCode(profile.affiliateCode);
    }

    // 5. Create Link record
    const link = await this.prisma.affiliateLink.create({
      data: {
        profileId: profile.id,
        shortCode,
        originalUrl: dto.targetUrl,
        targetType: parsedTarget.targetType,
        targetBookId: parsedTarget.targetBookId,
        targetStoreId: parsedTarget.targetStoreId,
        campaignName: dto.campaignName?.trim() || null,
        subId: dto.subId?.trim() || null,
      },
    });

    // 6. Audit & Outbox
    await this.auditService.log({
      actorId: userId,
      actorRole: 'AFFILIATE',
      action: 'AFFILIATE_LINK_CREATED',
      resource: 'AffiliateLink',
      resourceId: link.id,
      metadata: {
        shortCode: link.shortCode,
        targetType: link.targetType,
        targetUrl: link.originalUrl,
      },
      afterState: link,
    });

    await this.prisma.outboxEvent.create({
      data: {
        eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: 'affiliate.link.created',
        aggregateId: link.id,
        payload: {
          linkId: link.id,
          profileId: profile.id,
          shortCode: link.shortCode,
          targetUrl: link.originalUrl,
          targetType: link.targetType,
        },
      },
    });

    return {
      ...link,
      shortUrl: `/r/${link.shortCode}`,
    };
  }

  /**
   * 2. List Links of current Affiliate Partner
   */
  async listMyLinks(userId: string, query: QueryAffiliateLinksDto) {
    const profile = await this.prisma.affiliateProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Hồ sơ đối tác tiếp thị không tồn tại');
    }

    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(50, Math.max(1, Number(query.limit || 10)));
    const skip = (page - 1) * limit;

    const where: any = {
      profileId: profile.id,
    };

    if (query.targetType) {
      where.targetType = query.targetType;
    }

    if (query.search?.trim()) {
      where.OR = [
        { shortCode: { contains: query.search.trim(), mode: 'insensitive' } },
        { campaignName: { contains: query.search.trim(), mode: 'insensitive' } },
        { originalUrl: { contains: query.search.trim(), mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.affiliateLink.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.affiliateLink.count({ where }),
    ]);

    return {
      items: items.map((link) => ({
        ...link,
        shortUrl: `/r/${link.shortCode}`,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * 3. Resolve Short Code with Bot Filter & 1-minute Rate Limit
   */
  async resolveShortCode(
    shortCode: string,
    meta: { ip?: string; userAgent?: string; referer?: string },
  ) {
    const cleanCode = (shortCode || '').trim().toLowerCase();
    const link = await this.prisma.affiliateLink.findUnique({
      where: { shortCode: cleanCode },
      include: {
        profile: true,
      },
    });

    if (!link || !link.isActive) {
      throw new NotFoundException('Liên kết không tồn tại hoặc đã ngừng hoạt động');
    }

    if (link.profile.status !== 'ACTIVE') {
      throw new NotFoundException('Liên kết tiếp thị tạm thời không khả dụng');
    }

    const targetUrl = link.originalUrl;
    const policy = await this.getActivePolicy();
    const userAgent = meta.userAgent || '';
    const ip = meta.ip || '127.0.0.1';

    // A. Bot Filtering Decision
    const isBot = BOT_USER_AGENT_REGEX.test(userAgent);
    if (isBot) {
      this.logger.log(
        `[Bot Ignored] Link ${link.shortCode} accessed by bot UA: ${userAgent.slice(0, 50)}`,
      );
      return {
        targetUrl,
        isBot: true,
        cookieToken: null,
      };
    }

    // B. Deduplication (1 click per minute for same IP)
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex');
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

    const recentClick = await this.prisma.affiliateAttribution.findFirst({
      where: {
        linkId: link.id,
        ipHash,
        createdAt: { gte: oneMinuteAgo },
      },
    });

    if (recentClick) {
      this.logger.log(
        `[Rate Limited Click] Throttled rapid click for link ${link.shortCode} from IP hash ${ipHash.slice(0, 10)}`,
      );
      return {
        targetUrl,
        isThrottled: true,
        // Do not expose an existing attribution nonce to another request that
        // merely shares the same IP (for example users behind the same NAT).
        // A browser that owns the original click already has its cookie.
        cookieToken: null,
      };
    }

    // C. Valid Human Click: Update link clickCount & create attribution record
    const cookieToken = crypto.randomBytes(32).toString('hex');
    const cookieTokenHash = crypto
      .createHash('sha256')
      .update(cookieToken)
      .digest('hex');
    const sessionNonce = crypto.randomUUID();
    const cookieDurationDays = policy.cookieDurationDays || 30;
    const expiresAt = new Date(
      Date.now() + cookieDurationDays * 24 * 60 * 60 * 1000,
    );

    await this.prisma.$transaction([
      this.prisma.affiliateLink.update({
        where: { id: link.id },
        data: {
          clickCount: { increment: 1 },
        },
      }),
      this.prisma.affiliateAttribution.create({
        data: {
          linkId: link.id,
          profileId: link.profileId,
          sessionNonce,
          cookieTokenHash,
          ipHash,
          userAgent: userAgent.slice(0, 500),
          targetUrl,
          expiresAt,
        },
      }),
    ]);

    // Outbox event for click analytics
    await this.prisma.outboxEvent.create({
      data: {
        eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: 'affiliate.click.recorded',
        aggregateId: sessionNonce,
        payload: {
          linkId: link.id,
          profileId: link.profileId,
          shortCode: link.shortCode,
          sessionNonce,
          targetUrl,
          expiresAt,
          ipHash,
        },
      },
    });

    return {
      targetUrl,
      cookieToken,
      cookieMaxAgeSeconds: cookieDurationDays * 86400,
      shortCode: link.shortCode,
      profileId: link.profileId,
    };
  }

  /**
   * 4. Get Book Commission Details & Active Link for /book/:id card
   */
  async getBookCommissionForAffiliate(userId: string | null, bookId: string) {
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      include: {
        affiliateSetting: true,
      },
    });

    if (!book) {
      throw new NotFoundException('Sách không tồn tại');
    }

    const policy = await this.getActivePolicy();
    const storeSetting = await this.prisma.storeAffiliateSetting.findUnique({
      where: { storeId: book.storeId },
    });

    // Check store & book eligibility
    const isStoreEnabled = storeSetting?.isEnabled ?? true;
    const isBookEligible = book.affiliateSetting?.isEligible ?? true;
    const isOverallEligible = isStoreEnabled && isBookEligible;

    // Resolve effective rate
    let effectiveRate: number;
    if (
      book.affiliateSetting?.customRate !== null &&
      book.affiliateSetting?.customRate !== undefined
    ) {
      effectiveRate = Number(book.affiliateSetting.customRate);
    } else if (book.format === BookFormat.PHYSICAL) {
      effectiveRate =
        storeSetting?.physicalRate !== null &&
        storeSetting?.physicalRate !== undefined
          ? Number(storeSetting.physicalRate)
          : Number(policy.defaultPhysicalRate);
    } else {
      effectiveRate =
        storeSetting?.ebookRate !== null && storeSetting?.ebookRate !== undefined
          ? Number(storeSetting.ebookRate)
          : Number(policy.defaultEbookRate);
    }

    const price = Math.max(0, Math.floor(Number(book.price)));
    const estimatedCommissionAmount = isOverallEligible
      ? Math.floor((price * effectiveRate) / 100)
      : 0;

    // If userId provided, check if user has an active profile and existing link
    let existingShortUrl: string | null = null;
    let isAffiliateActive = false;

    if (userId) {
      const profile = await this.prisma.affiliateProfile.findUnique({
        where: { userId },
      });

      if (profile && profile.status === 'ACTIVE') {
        isAffiliateActive = true;
        const existingLink = await this.prisma.affiliateLink.findFirst({
          where: {
            profileId: profile.id,
            targetBookId: book.id,
            isActive: true,
          },
          orderBy: { createdAt: 'desc' },
        });

        if (existingLink) {
          existingShortUrl = `/r/${existingLink.shortCode}`;
        }
      }
    }

    return {
      bookId: book.id,
      title: book.title,
      price,
      format: book.format,
      isEligible: isOverallEligible,
      effectiveRate: isOverallEligible ? effectiveRate : 0,
      estimatedCommissionAmount,
      isAffiliateActive,
      existingShortUrl,
      cookieDurationDays: policy.cookieDurationDays || 30,
    };
  }

  /**
   * 4b. List books eligible for affiliate marketplace (with store-level & book-level opt-in filter)
   */
  async listAffiliateMarketplaceBooks(
    userId: string | null,
    query: {
      search?: string;
      format?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
    },
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 12));
    const skip = (page - 1) * limit;

    // 1. Find stores that have disabled affiliate
    const disabledStores = await this.prisma.storeAffiliateSetting.findMany({
      where: { isEnabled: false },
      select: { storeId: true },
    });
    const disabledStoreIds = disabledStores.map((s) => s.storeId);

    // 2. Find books that have disabled affiliate
    const disabledBooks = await this.prisma.bookAffiliateSetting.findMany({
      where: { isEligible: false },
      select: { bookId: true },
    });
    const disabledBookIds = disabledBooks.map((b) => b.bookId);

    // 3. Build where clause
    const where: any = {
      status: { notIn: ['DRAFT', 'ARCHIVED', 'SUSPENDED'] },
      ...(disabledStoreIds.length > 0 && {
        storeId: { notIn: disabledStoreIds },
      }),
      ...(disabledBookIds.length > 0 && {
        id: { notIn: disabledBookIds },
      }),
    };

    if (query.search?.trim()) {
      where.title = {
        contains: query.search.trim(),
        mode: 'insensitive',
      };
    }

    if (query.format && query.format !== 'ALL') {
      where.format = query.format;
    }

    // 4. Query books
    let orderBy: any = { createdAt: 'desc' };
    if (query.sortBy === 'price_asc') orderBy = { price: 'asc' };
    else if (query.sortBy === 'price_desc') orderBy = { price: 'desc' };
    else if (query.sortBy === 'oldest') orderBy = { createdAt: 'asc' };

    const [total, books, policy, userProfile] = await Promise.all([
      this.prisma.book.count({ where }),
      this.prisma.book.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          affiliateSetting: true,
        },
      }),
      this.getActivePolicy(),
      userId
        ? this.prisma.affiliateProfile.findUnique({ where: { userId } })
        : null,
    ]);

    // 5. Fetch store settings in batch
    const storeIds = Array.from(new Set(books.map((b) => b.storeId)));
    const storeSettings = await this.prisma.storeAffiliateSetting.findMany({
      where: { storeId: { in: storeIds } },
    });
    const storeSettingMap = new Map(storeSettings.map((s) => [s.storeId, s]));

    // 6. Fetch existing links for this user if active CTV
    const existingLinksMap = new Map<string, string>();
    if (userProfile && userProfile.status === 'ACTIVE' && books.length > 0) {
      const existingLinks = await this.prisma.affiliateLink.findMany({
        where: {
          profileId: userProfile.id,
          targetBookId: { in: books.map((b) => b.id) },
          isActive: true,
        },
      });
      existingLinks.forEach((l) => {
        if (l.targetBookId) {
          existingLinksMap.set(l.targetBookId, `/r/${l.shortCode}`);
        }
      });
    }

    // 7. Calculate commission for each book
    const items = books.map((book) => {
      const storeSetting = storeSettingMap.get(book.storeId);
      let effectiveRate: number;
      if (
        book.affiliateSetting?.customRate !== null &&
        book.affiliateSetting?.customRate !== undefined
      ) {
        effectiveRate = Number(book.affiliateSetting.customRate);
      } else if (book.format === BookFormat.PHYSICAL) {
        effectiveRate =
          storeSetting?.physicalRate !== null &&
          storeSetting?.physicalRate !== undefined
            ? Number(storeSetting.physicalRate)
            : Number(policy.defaultPhysicalRate);
      } else {
        effectiveRate =
          storeSetting?.ebookRate !== null && storeSetting?.ebookRate !== undefined
            ? Number(storeSetting.ebookRate)
            : Number(policy.defaultEbookRate);
      }

      const price = Math.max(0, Math.floor(Number(book.price)));
      const estimatedCommissionAmount = Math.floor((price * effectiveRate) / 100);

      return {
        bookId: book.id,
        id: book.id,
        title: book.title,
        slug: book.slug || book.id,
        cover: book.coverUrl || null,
        coverImage: book.coverUrl || null,
        coverUrl: book.coverUrl || null,
        price,
        format: book.format,
        storeId: book.storeId,
        effectiveRate,
        estimatedCommissionAmount,
        existingShortUrl: existingLinksMap.get(book.id) || null,
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * 5. Verify Attribution for Checkout & Check Self-Referral
   */
  async verifyAttributionForCheckout(
    cookieToken: string,
    buyerUserId?: string,
  ) {
    if (!cookieToken) return null;

    const cookieTokenHash = crypto
      .createHash('sha256')
      .update(cookieToken)
      .digest('hex');

    const attribution = await this.prisma.affiliateAttribution.findUnique({
      where: { cookieTokenHash },
      include: {
        profile: true,
        link: true,
      },
    });

    if (!attribution) return null;

    // Check expiration
    if (new Date() > attribution.expiresAt) {
      return null;
    }

    // Check Partner Status
    if (attribution.profile.status !== 'ACTIVE') {
      return null;
    }

    // Anti-Fraud: Block self-referral
    if (buyerUserId && attribution.profile.userId === buyerUserId) {
      this.logger.warn(
        `[Anti-Fraud] Self-referral blocked: buyerUserId ${buyerUserId} matches affiliate ${attribution.profile.userId}`,
      );
      return {
        isValid: false,
        reason: 'SELF_REFERRAL_BLOCKED',
      };
    }

    return {
      isValid: true,
      attributionId: attribution.id,
      linkId: attribution.linkId,
      profileId: attribution.profileId,
      affiliateUserId: attribution.profile.userId,
      affiliateCode: attribution.profile.affiliateCode,
    };
  }

  private parseTargetUrl(
    url: string,
    explicitBookId?: string,
    explicitStoreId?: string,
  ): {
    targetType: AffiliateLinkTargetType;
    targetBookId?: string;
    targetStoreId?: string;
  } {
    if (explicitBookId) {
      return {
        targetType: AffiliateLinkTargetType.BOOK,
        targetBookId: explicitBookId,
        targetStoreId: explicitStoreId,
      };
    }

    if (explicitStoreId) {
      return {
        targetType: AffiliateLinkTargetType.STORE,
        targetStoreId: explicitStoreId,
      };
    }

    const clean = url.trim();

    // Check /book/:id or /books/:id
    const bookMatch = clean.match(/\/(?:book|books)\/([a-zA-Z0-9_-]+)/);
    if (bookMatch) {
      return {
        targetType: AffiliateLinkTargetType.BOOK,
        targetBookId: bookMatch[1],
      };
    }

    // Check /shop/:slug or /store/:slug
    const storeMatch = clean.match(/\/(shop|store)\/([a-zA-Z0-9_-]+)/);
    if (storeMatch) {
      return {
        targetType: AffiliateLinkTargetType.STORE,
        targetStoreId: storeMatch[2],
      };
    }

    // Check /books or /category
    if (clean.includes('/books') || clean.includes('/category')) {
      return {
        targetType: AffiliateLinkTargetType.CATEGORY,
      };
    }

    return {
      targetType: AffiliateLinkTargetType.HOME,
    };
  }

  private async generateUniqueShortCode(prefix: string): Promise<string> {
    const cleanPrefix = prefix.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    for (let i = 0; i < 5; i++) {
      const rand = crypto.randomBytes(3).toString('hex'); // 6 chars
      const candidate = `${cleanPrefix}_${rand}`;
      const existing = await this.prisma.affiliateLink.findUnique({
        where: { shortCode: candidate },
      });
      if (!existing) {
        return candidate;
      }
    }
    return `${cleanPrefix}_${Date.now().toString(36)}`;
  }
}
