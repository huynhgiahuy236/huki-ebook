import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AffiliateAuditService } from '../audit/affiliate-audit.service';
import {
  UpdateStoreAffiliateSettingDto,
  UpdateBookAffiliateSettingDto,
  BulkUpdateBooksAffiliateDto,
  QueryStoreBooksAffiliateDto,
} from '../dto/seller-affiliate.dto';
import { BookFormat, Prisma } from '../../../../prisma/generated/client';
import { resolveStoreAndBusinessIds } from '../../../common/seller-scope.util';

export interface SellerNetBreakdown {
  grossPrice: number;
  platformFeePercent: number;
  platformFeeAmount: number;
  affiliateRatePercent: number;
  affiliateCommissionAmount: number;
  sellerNetRevenue: number;
  sellerNetMarginPercent: number;
}

@Injectable()
export class SellerAffiliateService {
  private readonly logger = new Logger(SellerAffiliateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AffiliateAuditService,
  ) {}

  /**
   * Helper: Get currently active Platform Affiliate Policy
   */
  async getActivePlatformPolicy() {
    const policy = await this.prisma.affiliatePolicy.findFirst({
      where: { isActive: true },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (policy) {
      return {
        id: policy.id,
        name: policy.name,
        defaultPhysicalRate: Number(policy.defaultPhysicalRate),
        defaultEbookRate: Number(policy.defaultEbookRate),
        defaultAudioRate: Number(policy.defaultAudioRate),
        minRate: Number((policy as any).minRate ?? 1.0),
        maxPhysicalRate: Number((policy as any).maxPhysicalRate ?? 30.0),
        maxDigitalRate: Number((policy as any).maxDigitalRate ?? 50.0),
        cookieDurationDays: policy.cookieDurationDays,
        physicalHoldingDays: policy.physicalHoldingDays,
        digitalHoldingHours: policy.digitalHoldingHours,
      };
    }

    // Default Fallback
    return {
      id: 'default-fallback',
      name: 'Chính sách sàn mặc định HuKi',
      defaultPhysicalRate: 5.0,
      defaultEbookRate: 10.0,
      defaultAudioRate: 10.0,
      minRate: 1.0,
      maxPhysicalRate: 30.0,
      maxDigitalRate: 50.0,
      cookieDurationDays: 30,
      physicalHoldingDays: 7,
      digitalHoldingHours: 24,
    };
  }

  /**
   * Get store settings + platform policy + effective rates
   */
  async getStoreSettings(storeId: string) {
    const policy = await this.getActivePlatformPolicy();

    let storeSetting = await this.prisma.storeAffiliateSetting.findUnique({
      where: { storeId },
    });

    if (!storeSetting) {
      // Default virtual setting if not created yet
      return {
        storeSetting: {
          storeId,
          isEnabled: true,
          autoEnrollNewBooks: true,
          physicalRate: null,
          ebookRate: null,
          audioRate: null,
          version: 1,
        },
        platformPolicy: policy,
        effectiveRates: {
          physicalRate: policy.defaultPhysicalRate,
          ebookRate: policy.defaultEbookRate,
          audioRate: policy.defaultAudioRate,
        },
      };
    }

    const physicalRate =
      storeSetting.physicalRate !== null
        ? Number(storeSetting.physicalRate)
        : policy.defaultPhysicalRate;
    const ebookRate =
      storeSetting.ebookRate !== null
        ? Number(storeSetting.ebookRate)
        : policy.defaultEbookRate;
    const audioRate =
      storeSetting.audioRate !== null
        ? Number(storeSetting.audioRate)
        : policy.defaultAudioRate;

    return {
      storeSetting: {
        id: storeSetting.id,
        storeId: storeSetting.storeId,
        isEnabled: storeSetting.isEnabled,
        autoEnrollNewBooks: (storeSetting as any).autoEnrollNewBooks ?? true,
        physicalRate:
          storeSetting.physicalRate !== null
            ? Number(storeSetting.physicalRate)
            : null,
        ebookRate:
          storeSetting.ebookRate !== null
            ? Number(storeSetting.ebookRate)
            : null,
        audioRate:
          storeSetting.audioRate !== null
            ? Number(storeSetting.audioRate)
            : null,
        version: storeSetting.version,
      },
      platformPolicy: policy,
      effectiveRates: {
        physicalRate,
        ebookRate,
        audioRate,
      },
    };
  }

  /**
   * Update Store Affiliate Settings with Hard Cap Validation
   */
  async updateStoreSettings(
    storeId: string,
    actorId: string,
    dto: UpdateStoreAffiliateSettingDto,
  ) {
    const policy = await this.getActivePlatformPolicy();

    // 1. Hard Validation against Platform Caps (Decision 1)
    if (dto.physicalRate !== undefined && dto.physicalRate !== null) {
      if (dto.physicalRate < policy.minRate) {
        throw new BadRequestException(
          `Tỷ lệ hoa hồng sách in tối thiểu là ${policy.minRate}%`,
        );
      }
      if (dto.physicalRate > policy.maxPhysicalRate) {
        throw new BadRequestException(
          `Tỷ lệ hoa hồng sách in không được vượt quá trần của sàn (${policy.maxPhysicalRate}%)`,
        );
      }
    }

    if (dto.ebookRate !== undefined && dto.ebookRate !== null) {
      if (dto.ebookRate < policy.minRate) {
        throw new BadRequestException(
          `Tỷ lệ hoa hồng Ebook tối thiểu là ${policy.minRate}%`,
        );
      }
      if (dto.ebookRate > policy.maxDigitalRate) {
        throw new BadRequestException(
          `Tỷ lệ hoa hồng Ebook không được vượt quá trần của sàn (${policy.maxDigitalRate}%)`,
        );
      }
    }

    if (dto.audioRate !== undefined && dto.audioRate !== null) {
      if (dto.audioRate < policy.minRate) {
        throw new BadRequestException(
          `Tỷ lệ hoa hồng Sách nói tối thiểu là ${policy.minRate}%`,
        );
      }
      if (dto.audioRate > policy.maxDigitalRate) {
        throw new BadRequestException(
          `Tỷ lệ hoa hồng Sách nói không được vượt quá trần của sàn (${policy.maxDigitalRate}%)`,
        );
      }
    }

    // 2. Upsert Setting
    const existing = await this.prisma.storeAffiliateSetting.findUnique({
      where: { storeId },
    });

    const updated = await this.prisma.storeAffiliateSetting.upsert({
      where: { storeId },
      create: {
        storeId,
        isEnabled: dto.isEnabled,
        autoEnrollNewBooks: dto.autoEnrollNewBooks ?? true,
        physicalRate:
          dto.physicalRate !== undefined && dto.physicalRate !== null
            ? new Prisma.Decimal(dto.physicalRate)
            : null,
        ebookRate:
          dto.ebookRate !== undefined && dto.ebookRate !== null
            ? new Prisma.Decimal(dto.ebookRate)
            : null,
        audioRate:
          dto.audioRate !== undefined && dto.audioRate !== null
            ? new Prisma.Decimal(dto.audioRate)
            : null,
        updatedBy: actorId,
        version: 1,
      },
      update: {
        isEnabled: dto.isEnabled,
        autoEnrollNewBooks:
          dto.autoEnrollNewBooks !== undefined
            ? dto.autoEnrollNewBooks
            : undefined,
        physicalRate:
          dto.physicalRate !== undefined
            ? dto.physicalRate !== null
              ? new Prisma.Decimal(dto.physicalRate)
              : null
            : undefined,
        ebookRate:
          dto.ebookRate !== undefined
            ? dto.ebookRate !== null
              ? new Prisma.Decimal(dto.ebookRate)
              : null
            : undefined,
        audioRate:
          dto.audioRate !== undefined
            ? dto.audioRate !== null
              ? new Prisma.Decimal(dto.audioRate)
              : null
            : undefined,
        updatedBy: actorId,
        version: { increment: 1 },
      },
    });

    // 3. Audit Log & Outbox Event
    await this.auditService.log({
      actorId,
      actorRole: 'SELLER',
      action: 'UPDATE_STORE_AFFILIATE_SETTINGS',
      resource: 'StoreAffiliateSetting',
      resourceId: updated.id,
      metadata: { storeId },
      beforeState: existing ? (existing as any) : null,
      afterState: updated as any,
    });

    await this.prisma.outboxEvent.create({
      data: {
        eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: 'affiliate.store_settings.updated',
        aggregateId: storeId,
        payload: {
          storeId,
          isEnabled: updated.isEnabled,
          physicalRate: updated.physicalRate ? Number(updated.physicalRate) : null,
          ebookRate: updated.ebookRate ? Number(updated.ebookRate) : null,
          audioRate: updated.audioRate ? Number(updated.audioRate) : null,
          updatedAt: updated.updatedAt,
        },
      },
    });

    return this.getStoreSettings(storeId);
  }

  /**
   * List Store Books with Affiliate Eligibility & Effective Rates
   */
  async listStoreBooks(storeId: string, query: QueryStoreBooksAffiliateDto) {
    const policy = await this.getActivePlatformPolicy();
    const storeSetting = await this.prisma.storeAffiliateSetting.findUnique({
      where: { storeId },
    });

    const isStoreEnabled = storeSetting?.isEnabled ?? true;
    const autoEnroll = (storeSetting as any)?.autoEnrollNewBooks ?? true;

    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit || 20)));
    const skip = (page - 1) * limit;

    const storeAndBizIds = await resolveStoreAndBusinessIds(storeId);
    const andConditions: Prisma.BookWhereInput[] = [
      { storeId: { in: storeAndBizIds } },
    ];

    if (query.format && (query.format as any) !== 'ALL' && query.format !== BookFormat.BOTH) {
      andConditions.push({ format: query.format as BookFormat });
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      andConditions.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { isbn: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    const wantIneligible = query.isEligible === false || query.eligibility === 'INELIGIBLE';
    if (wantIneligible) {
      andConditions.push({
        affiliateSetting: { isEligible: false },
      });
    } else {
      // Default & Eligible: ONLY include books where affiliate is turned ON (Rule: "những cuốn bật sẽ vào trong list đó cuốn nào không thì không")
      andConditions.push({
        affiliateSetting: { isEligible: true },
      });
    }

    const where: Prisma.BookWhereInput = {
      AND: andConditions,
    };

    const [total, books] = await Promise.all([
      this.prisma.book.count({ where }),
      this.prisma.book.findMany({
        where,
        include: {
          affiliateSetting: true,
          category: { select: { id: true, name: true } },
          author: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const items = books.map((book) => {
      let isEligible = false;
      let isCustom = false;
      let effectiveRate = policy.defaultPhysicalRate;

      if (book.affiliateSetting) {
        isEligible = isStoreEnabled && book.affiliateSetting.isEligible;
        if (book.affiliateSetting.customRate !== null) {
          isCustom = true;
          effectiveRate = Number(book.affiliateSetting.customRate);
        } else {
          effectiveRate = this.resolveFormatRate(
            book.format,
            storeSetting,
            policy,
          );
        }
      } else {
        // Dynamic Inheritance
        isEligible = isStoreEnabled && autoEnroll;
        effectiveRate = this.resolveFormatRate(
          book.format,
          storeSetting,
          policy,
        );
      }

      const grossPrice = Number(book.price);
      const netBreakdown = this.calculateSellerNetPreview(
        grossPrice,
        book.format,
        effectiveRate,
      );

      return {
        id: book.id,
        bookId: book.id,
        title: book.title,
        slug: book.slug,
        isbn: book.isbn,
        format: book.format,
        coverUrl: book.coverUrl,
        coverImage: book.coverUrl,
        cover: book.coverUrl,
        price: grossPrice,
        status: book.status,
        category: book.category?.name || 'Khác',
        author: book.author?.name || 'Chưa cập nhật',
        isEligible,
        isCustomRate: isCustom,
        effectiveRate,
        customRate: book.affiliateSetting?.customRate
          ? Number(book.affiliateSetting.customRate)
          : null,
        notes: (book.affiliateSetting as any)?.notes || null,
        netPreview: netBreakdown,
        sellerNetBreakdown: netBreakdown,
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
   * Update Single Book Affiliate Setting (with Store Isolation check)
   */
  async updateBookSetting(
    storeId: string,
    bookId: string,
    actorId: string,
    dto: UpdateBookAffiliateSettingDto,
  ) {
    // 1. Store Isolation: Check book belongs to this store
    const book = await this.prisma.book.findFirst({
      where: { id: bookId, storeId },
    });

    if (!book) {
      throw new NotFoundException(
        'Không tìm thấy sách hoặc sách không thuộc quyền quản lý của gian hàng này',
      );
    }

    const policy = await this.getActivePlatformPolicy();

    // 2. Validate custom rate against cap if provided
    if (dto.customRate !== undefined && dto.customRate !== null) {
      const maxCap =
        book.format === BookFormat.PHYSICAL
          ? policy.maxPhysicalRate
          : policy.maxDigitalRate;

      if (dto.customRate < policy.minRate) {
        throw new BadRequestException(
          `Tỷ lệ hoa hồng tùy chỉnh tối thiểu là ${policy.minRate}%`,
        );
      }
      if (dto.customRate > maxCap) {
        throw new BadRequestException(
          `Tỷ lệ hoa hồng cho định dạng ${book.format} không được vượt quá trần của sàn (${maxCap}%)`,
        );
      }
    }

    // 3. Upsert setting
    const existing = await this.prisma.bookAffiliateSetting.findUnique({
      where: { bookId },
    });

    const updated = await this.prisma.bookAffiliateSetting.upsert({
      where: { bookId },
      create: {
        bookId,
        storeId,
        isEligible: dto.isEligible,
        customRate:
          dto.customRate !== undefined && dto.customRate !== null
            ? new Prisma.Decimal(dto.customRate)
            : null,
        notes: dto.notes || null,
        updatedBy: actorId,
        version: 1,
      },
      update: {
        isEligible: dto.isEligible,
        customRate:
          dto.customRate !== undefined
            ? dto.customRate !== null
              ? new Prisma.Decimal(dto.customRate)
              : null
            : undefined,
        notes: dto.notes !== undefined ? dto.notes : undefined,
        updatedBy: actorId,
        version: { increment: 1 },
      },
    });

    // 4. Audit Log
    await this.auditService.log({
      actorId,
      actorRole: 'SELLER',
      action: 'UPDATE_BOOK_AFFILIATE_SETTING',
      resource: 'BookAffiliateSetting',
      resourceId: updated.id,
      metadata: { storeId },
      beforeState: existing ? (existing as any) : null,
      afterState: updated as any,
    });

    return updated;
  }

  /**
   * Bulk Update Books Affiliate Setting (with Store Isolation check & Transaction)
   */
  async bulkUpdateBooks(
    storeId: string,
    actorId: string,
    dto: BulkUpdateBooksAffiliateDto,
  ) {
    if (!dto.bookIds || dto.bookIds.length === 0) {
      throw new BadRequestException('Danh sách sách cập nhật không được trống');
    }

    // 1. Store Isolation: Verify all books belong to store
    const books = await this.prisma.book.findMany({
      where: {
        id: { in: dto.bookIds },
        storeId,
      },
      select: { id: true, format: true },
    });

    if (books.length !== dto.bookIds.length) {
      throw new BadRequestException(
        'Một hoặc nhiều cuốn sách không tìm thấy hoặc không thuộc quyền quản lý của gian hàng',
      );
    }

    const policy = await this.getActivePlatformPolicy();

    // 2. Validate custom rate if provided
    if (dto.customRate !== undefined && dto.customRate !== null) {
      if (dto.customRate < policy.minRate) {
        throw new BadRequestException(
          `Tỷ lệ hoa hồng tùy chỉnh tối thiểu là ${policy.minRate}%`,
        );
      }
      // Check physical cap if any physical book in list
      const hasPhysical = books.some((b) => b.format === BookFormat.PHYSICAL);
      const cap = hasPhysical ? policy.maxPhysicalRate : policy.maxDigitalRate;
      if (dto.customRate > cap) {
        throw new BadRequestException(
          `Tỷ lệ hoa hồng tùy chỉnh không được vượt quá trần của sàn (${cap}%)`,
        );
      }
    }

    // 3. Transactional Bulk Upsert
    const operations = books.map((b) => {
      return this.prisma.bookAffiliateSetting.upsert({
        where: { bookId: b.id },
        create: {
          bookId: b.id,
          storeId,
          isEligible: dto.isEligible !== undefined ? dto.isEligible : true,
          customRate:
            dto.customRate !== undefined && dto.customRate !== null
              ? new Prisma.Decimal(dto.customRate)
              : null,
          updatedBy: actorId,
          version: 1,
        },
        update: {
          isEligible:
            dto.isEligible !== undefined ? dto.isEligible : undefined,
          customRate:
            dto.customRate !== undefined
              ? dto.customRate !== null
                ? new Prisma.Decimal(dto.customRate)
                : null
              : undefined,
          updatedBy: actorId,
          version: { increment: 1 },
        },
      });
    });

    await this.prisma.$transaction(operations);

    // 4. Audit Log & Outbox Event
    await this.auditService.log({
      actorId,
      actorRole: 'SELLER',
      action: 'BULK_UPDATE_BOOK_AFFILIATE_SETTINGS',
      resource: 'BookAffiliateSetting',
      metadata: {
        storeId,
        bookCount: books.length,
        isEligible: dto.isEligible,
        customRate: dto.customRate,
      },
    });

    await this.prisma.outboxEvent.create({
      data: {
        eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: 'affiliate.books.bulk_updated',
        aggregateId: storeId,
        payload: {
          storeId,
          updatedBookCount: books.length,
          bookIds: dto.bookIds,
          isEligible: dto.isEligible,
          customRate: dto.customRate,
          updatedAt: new Date(),
        },
      },
    });

    return {
      success: true,
      updatedCount: books.length,
    };
  }

  /**
   * Decision 3: Seller Net Revenue Preview Calculation
   * Formula: Gross Price - Platform Fee (10%) - Affiliate Commission = Seller Net
   */
  calculateSellerNetPreview(
    grossPrice: number,
    format: BookFormat,
    affiliateRatePercent: number = 0,
  ): SellerNetBreakdown {
    const validPrice = Math.max(0, Math.floor(grossPrice));
    const platformFeePercent = 10.0; // 10% platform fee
    const platformFeeAmount = Math.floor(
      (validPrice * platformFeePercent) / 100,
    );
    const affiliateCommissionAmount = Math.floor(
      (validPrice * affiliateRatePercent) / 100,
    );

    const sellerNetRevenue = Math.max(
      0,
      validPrice - platformFeeAmount - affiliateCommissionAmount,
    );
    const sellerNetMarginPercent =
      validPrice > 0
        ? Number(((sellerNetRevenue / validPrice) * 100).toFixed(1))
        : 0;

    return {
      grossPrice: validPrice,
      platformFeePercent,
      platformFeeAmount,
      affiliateRatePercent,
      affiliateCommissionAmount,
      sellerNetRevenue,
      sellerNetMarginPercent,
    };
  }

  private resolveFormatRate(
    format: BookFormat,
    storeSetting: any,
    policy: any,
  ): number {
    if (format === BookFormat.PHYSICAL) {
      return storeSetting?.physicalRate !== null &&
        storeSetting?.physicalRate !== undefined
        ? Number(storeSetting.physicalRate)
        : policy.defaultPhysicalRate;
    }
    // DIGITAL or BOTH
    return storeSetting?.ebookRate !== null &&
      storeSetting?.ebookRate !== undefined
      ? Number(storeSetting.ebookRate)
      : policy.defaultEbookRate;
  }
}
