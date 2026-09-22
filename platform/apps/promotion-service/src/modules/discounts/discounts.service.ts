import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateBookDiscountDto,
  UpdateBookDiscountDto,
  DiscountType,
  DiscountStatus,
} from './dto/discount.dto';
import { throwBadRequest, throwNotFound } from '@huki/shared/errors';
import { ErrorCode } from '@huki/shared/errors';

@Injectable()
export class DiscountsService {
  private readonly logger = new Logger(DiscountsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create or update discount for a book
   */
  async createOrUpdateDiscount(dto: CreateBookDiscountDto) {
    const startsAt = new Date(dto.startsAt);
    const expiresAt = new Date(dto.expiresAt);

    if (isNaN(startsAt.getTime()) || isNaN(expiresAt.getTime())) {
      throwBadRequest(ErrorCode.VOUCHER_EXPIRED, 'Thời gian bắt đầu hoặc kết thúc không hợp lệ');
    }

    if (expiresAt <= startsAt) {
      throwBadRequest(ErrorCode.VOUCHER_EXPIRED, 'Thời gian kết thúc phải diễn ra sau thời gian bắt đầu');
    }

    if (dto.type === DiscountType.PERCENTAGE && (dto.value <= 0 || dto.value > 100)) {
      throwBadRequest(ErrorCode.VOUCHER_LIMIT_REACHED, 'Phần trăm giảm giá phải từ 1% đến 100%');
    }

    if (dto.value <= 0) {
      throwBadRequest(ErrorCode.VOUCHER_LIMIT_REACHED, 'Giá trị giảm giá phải lớn hơn 0');
    }

    // Check if there is already an active/scheduled discount for this book
    const existing = await this.prisma.bookDiscount.findFirst({
      where: {
        bookId: dto.bookId,
        status: DiscountStatus.ACTIVE,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      // Update existing discount
      return this.prisma.bookDiscount.update({
        where: { id: existing.id },
        data: {
          type: dto.type,
          value: dto.value,
          minQuantity: dto.minQuantity ?? existing.minQuantity,
          startsAt,
          expiresAt,
          status: DiscountStatus.ACTIVE,
        },
      });
    }

    // Create new discount
    return this.prisma.bookDiscount.create({
      data: {
        bookId: dto.bookId,
        type: dto.type,
        value: dto.value,
        minQuantity: dto.minQuantity,
        startsAt,
        expiresAt,
        status: DiscountStatus.ACTIVE,
      },
    });
  }

  /**
   * Get active or latest discount for a book
   */
  async getDiscountByBookId(bookId: string) {
    const now = new Date();
    // Prioritize currently active discount
    const activeDiscount = await this.prisma.bookDiscount.findFirst({
      where: {
        bookId,
        status: DiscountStatus.ACTIVE,
        startsAt: { lte: now },
        expiresAt: { gte: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (activeDiscount) {
      return {
        ...activeDiscount,
        isCurrentlyActive: true,
      };
    }

    // Fallback to any future scheduled or recent discount
    const latest = await this.prisma.bookDiscount.findFirst({
      where: {
        bookId,
        status: DiscountStatus.ACTIVE,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (latest) {
      return {
        ...latest,
        isCurrentlyActive: latest.startsAt <= now && latest.expiresAt >= now,
      };
    }

    return null;
  }

  /**
   * Get all discounts for a list of book IDs
   */
  async getDiscountsForBooks(bookIds: string[]) {
    if (!bookIds || bookIds.length === 0) return [];

    const now = new Date();
    const discounts = await this.prisma.bookDiscount.findMany({
      where: {
        bookId: { in: bookIds },
        status: DiscountStatus.ACTIVE,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by bookId (prioritizing the currently active one)
    const map = new Map<string, any>();
    for (const d of discounts) {
      const isCurrentlyActive = d.startsAt <= now && d.expiresAt >= now;
      const existing = map.get(d.bookId);
      if (!existing || (!existing.isCurrentlyActive && isCurrentlyActive)) {
        map.set(d.bookId, {
          ...d,
          isCurrentlyActive,
        });
      }
    }

    return Array.from(map.values());
  }

  /**
   * Cancel a discount by ID
   */
  async cancelDiscount(id: string) {
    const existing = await this.prisma.bookDiscount.findUnique({
      where: { id },
    });

    if (!existing) {
      throwNotFound(ErrorCode.BOOK_NOT_FOUND, 'Không tìm thấy thông tin giảm giá');
    }

    return this.prisma.bookDiscount.update({
      where: { id },
      data: { status: DiscountStatus.CANCELLED },
    });
  }

  /**
   * Public/Internal: Get active discount for price calculation
   */
  async getActiveDiscount(bookId: string) {
    const now = new Date();
    const discount = await this.prisma.bookDiscount.findFirst({
      where: {
        bookId,
        status: DiscountStatus.ACTIVE,
        startsAt: { lte: now },
        expiresAt: { gte: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!discount) return null;

    return {
      id: discount.id,
      bookId: discount.bookId,
      type: discount.type,
      value: discount.value,
      startsAt: discount.startsAt,
      expiresAt: discount.expiresAt,
    };
  }
}
