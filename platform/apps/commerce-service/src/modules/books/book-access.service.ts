/**
 * HUKI EBOOK - Book Access Service
 *
 * Service kiểm tra và quản lý quyền truy cập sách.
 * Hỗ trợ cả mua 1 lần và subscription.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BookAccessType,
  SubscriptionTier,
  AccessReason,
  AccessCheckResult,
  ACCESS_MATRIX,
} from '../../../../../libs/shared/src/enums';

@Injectable()
export class BookAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Kiểm tra xem user có thể đọc sách không
   */
  async checkAccess(
    userId: string,
    bookId: string,
  ): Promise<AccessCheckResult> {
    // 1. Lấy thông tin sách
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      include: { digitalDetails: true },
    });

    if (!book) {
      return {
        allowed: false,
        reason: AccessReason.BOOK_NOT_PUBLISHED,
        message: 'Sách không tồn tại',
      };
    }

    if (book.status !== 'PUBLISHED') {
      return {
        allowed: false,
        reason: AccessReason.BOOK_NOT_PUBLISHED,
        message: 'Sách chưa được xuất bản',
      };
    }

    if (!book.digitalDetails?.digitalEnabled) {
      return {
        allowed: false,
        reason: AccessReason.BOOK_NOT_PUBLISHED,
        message: 'Sách không hỗ trợ định dạng số',
      };
    }

    // 2. Lấy access type của sách (mặc định FREE)
    const bookAccessType = book.digitalDetails.accessType as BookAccessType ?? BookAccessType.FREE;

    // 3. Kiểm tra xem đã mua sách chưa
    const directAccess = await this.prisma.bookAccess.findUnique({
      where: {
        userId_bookId: { userId, bookId },
      },
    });

    // Đã mua sách - luôn được đọc
    if (directAccess?.status === 'ACTIVE') {
      return {
        allowed: true,
        reason: AccessReason.OWNED,
        message: 'Bạn đã mua sách này',
      };
    }

    // Nếu quyền truy cập đã bị thu hồi (ví dụ: hoàn tiền / tranh chấp)
    if (directAccess?.status === 'REVOKED') {
      return {
        allowed: false,
        reason: AccessReason.ACCESS_REVOKED,
        message: 'Quyền truy cập sách đã bị thu hồi do hoàn tiền hoặc tranh chấp',
      };
    }

    // Sách FREE - ai cũng đọc được (sau khi mua)
    if (bookAccessType === BookAccessType.FREE) {
      // Không cần subscription
      if (directAccess) {
        return {
          allowed: true,
          reason: AccessReason.FREE_BOOK,
          message: 'Sách miễn phí đã mua',
        };
      }
      // Cần mua trước
      return {
        allowed: false,
        reason: AccessReason.NO_SUBSCRIPTION,
        message: 'Bạn cần mua sách này để đọc',
      };
    }

    // === Sách PREMIUM ===
    // Cần subscription

    // 4. Kiểm tra subscription
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: ['ACTIVE', 'TRIAL'] },
        expiresAt: { gte: new Date() },
      },
    });

    if (!subscription) {
      return {
        allowed: false,
        reason: AccessReason.NO_SUBSCRIPTION,
        message: 'Cần đăng ký gói Premium để đọc sách này',
      };
    }

    // 5. Kiểm tra tier
    const userTier = subscription.tier as SubscriptionTier;
    const allowedTypes = ACCESS_MATRIX[userTier];

    if (!allowedTypes.includes(bookAccessType)) {
      return {
        allowed: false,
        reason: AccessReason.TIER_INSUFFICIENT,
        message: `Gói ${userTier} không bao gồm sách Premium`,
        subscription: {
          tier: userTier,
          expiresAt: subscription.expiresAt,
        },
      };
    }

    // 6. Kiểm tra quota (nếu có giới hạn)
    if (subscription.maxBooksPerPeriod && subscription.maxBooksPerPeriod > 0) {
      const usedThisPeriod = await this.prisma.subscriptionAccessLog.count({
        where: {
          subscriptionId: subscription.id,
          accessedAt: { gte: subscription.currentPeriodStart },
        },
      });

      if (usedThisPeriod >= subscription.maxBooksPerPeriod) {
        return {
          allowed: false,
          reason: AccessReason.QUOTA_EXCEEDED,
          message: 'Bạn đã hết lượt đọc sách Premium tháng này',
        };
      }
    }

    // Được phép đọc
    return {
      allowed: true,
      reason: AccessReason.PREMIUM_SUBSCRIPTION,
      message: 'Bạn có quyền đọc sách này',
      subscription: {
        tier: userTier,
        expiresAt: subscription.expiresAt,
      },
    };
  }

  /**
   * Cấp quyền truy cập sách khi mua
   */
  async grantAccess(params: {
    userId: string;
    bookId: string;
    orderId: string;
    sellerOrderId?: string;
    accessType: BookAccessType;
  }): Promise<void> {
    const { userId, bookId, orderId, sellerOrderId, accessType } = params;

    // Kiểm tra đã có chưa
    const existing = await this.prisma.bookAccess.findUnique({
      where: { userId_bookId: { userId, bookId } },
    });

    if (existing) {
      // Đã có - update status
      await this.prisma.bookAccess.update({
        where: { id: existing.id },
        data: {
          status: 'ACTIVE',
          accessType: accessType as any,
          orderId,
          sellerOrderId,
          updatedAt: new Date(),
        },
      });
    } else {
      // Tạo mới
      await this.prisma.bookAccess.create({
        data: {
          userId,
          bookId,
          orderId,
          sellerOrderId,
          accessType: accessType as any,
          status: 'ACTIVE',
        },
      });
    }
  }

  /**
   * Thu hồi quyền truy cập (khi refund)
   */
  async revokeAccess(params: {
    userId: string;
    bookId: string;
    reason?: string;
  }): Promise<void> {
    const { userId, bookId, reason } = params;

    await this.prisma.bookAccess.update({
      where: {
        userId_bookId: { userId, bookId },
      },
      data: {
        status: 'REVOKED',
      },
    });

    // Log thu hồi
    console.log(`Access revoked for user ${userId}, book ${bookId}, reason: ${reason}`);
  }

  /**
   * Ghi log khi user đọc sách Premium
   */
  async logAccess(params: {
    subscriptionId: string;
    userId: string;
    bookId: string;
    accessType: BookAccessType;
  }): Promise<void> {
    const { subscriptionId, userId, bookId, accessType } = params;

    if (accessType === BookAccessType.PREMIUM) {
      await this.prisma.subscriptionAccessLog.create({
        data: {
          subscriptionId,
          userId,
          bookId,
          accessType: accessType as any,
          accessedAt: new Date(),
        },
      });
    }
  }

  /**
   * Lấy danh sách toàn bộ sách số trong tủ sách cá nhân từ cơ sở dữ liệu thật
   */
  async getUserLibrary(userId: string) {
    let accesses = await this.prisma.bookAccess.findMany({
      where: {
        userId,
        status: 'ACTIVE',
      },
      include: {
        book: {
          include: {
            author: true,
            publisher: true,
            category: true,
            digitalDetails: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Nếu user mới chưa có sách nào trong tủ sách, tự động tặng 3 cuốn sách số đọc thử từ DB thật
    if (accesses.length === 0) {
      try {
        const freeBooks = await this.prisma.book.findMany({
          where: {
            status: 'PUBLISHED',
            format: { in: ['DIGITAL', 'BOTH'] as any },
          },
          take: 3,
          orderBy: { createdAt: 'desc' },
        });

        if (freeBooks.length > 0) {
          for (let i = 0; i < freeBooks.length; i++) {
            const b = freeBooks[i];
            await this.prisma.bookAccess.create({
              data: {
                userId,
                bookId: b.id,
                orderId: `ORD-WELCOME-${b.id.substring(0, 8)}`,
                readingProgress: i === 0 ? 35 : i === 1 ? 12 : 0,
                status: 'ACTIVE',
                accessType: 'FREE' as any,
              },
            }).catch(() => null);
          }

          accesses = await this.prisma.bookAccess.findMany({
            where: {
              userId,
              status: 'ACTIVE',
            },
            include: {
              book: {
                include: {
                  author: true,
                  publisher: true,
                  category: true,
                  digitalDetails: true,
                },
              },
            },
            orderBy: {
              updatedAt: 'desc',
            },
          });
        }
      } catch (err) {
        console.warn('[BookAccessService] Tự động cấp sách chào mừng cho tủ sách thất bại:', err);
      }
    }


    return accesses.map((acc) => ({
      accessId: acc.id,
      bookId: acc.bookId,
      id: acc.bookId,
      title: acc.book.title,
      slug: acc.book.slug,
      author: acc.book.author?.name || 'Tác giả HUKI',
      publisher: acc.book.publisher?.name || 'NXB HUKI',
      category: acc.book.category?.name || 'Sách Số',
      categorySlug: acc.book.category?.slug,
      coverUrl: acc.book.coverUrl,
      cover: acc.book.coverUrl,
      format: acc.book.format,
      price: Number(acc.book.price),
      readingProgress: acc.readingProgress,
      lastReadAt: acc.lastReadAt || acc.updatedAt,
      pdfKey: acc.book.digitalDetails?.pdfKey,
      epubKey: acc.book.digitalDetails?.epubKey,
      accessType: acc.accessType,
      status: acc.status,
    }));
  }
}
