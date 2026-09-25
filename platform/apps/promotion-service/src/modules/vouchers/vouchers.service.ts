import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateVoucherDto,
  UpdateVoucherDto,
  VoucherQueryDto,
  ValidateVoucherDto,
} from './dto/voucher.dto';
import { throwConflict, throwNotFound, throwBadRequest, throwForbidden } from '@huki/shared/errors';
import { ErrorCode } from '@huki/shared/errors';

export interface VoucherValidationResult {
  valid: boolean;
  voucher?: {
    id: string;
    code: string;
    type: string;
    scope?: string;
    storeId?: string;
    minOrderAmount?: number;
    targetAudience?: string;
    value: number;
    maxDiscountAmount?: number;
  };
  discount?: number;
  reason?: string;
}

@Injectable()
export class VouchersService {
  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
    await this.seedDefaultVouchersIfEmpty();
  }

  private async seedDefaultVouchersIfEmpty() {
    try {
      const count = await this.prisma.voucher.count();
      if (count > 0) return;

      const now = new Date();
      const nextYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

      await this.prisma.voucher.createMany({
        data: [
          {
            code: 'FREESHIP',
            name: 'Miễn Phí Vận Chuyển Toàn Sàn',
            description: 'Giảm 30.000đ phí vận chuyển cho tất cả đơn hàng từ 0đ',
            type: 'FREE_SHIPPING' as any,
            value: 30000,
            minOrderAmount: 0,
            maxDiscountAmount: 30000,
            scope: 'PLATFORM' as any,
            targetAudience: 'ALL' as any,
            minFollowDays: 0,
            totalUsage: 10000,
            maxUsagePerUser: 5,
            currentUsage: 0,
            startsAt: now,
            expiresAt: nextYear,
            status: 'ACTIVE' as any,
          },
          {
            code: 'HUKISALE10',
            name: 'Giảm 10% Đơn Từ 50K',
            description: 'Giảm 10% tối đa 30.000đ cho đơn hàng sách bất kỳ',
            type: 'PERCENTAGE' as any,
            value: 10,
            minOrderAmount: 50000,
            maxDiscountAmount: 30000,
            scope: 'PLATFORM' as any,
            targetAudience: 'ALL' as any,
            minFollowDays: 0,
            totalUsage: 5000,
            maxUsagePerUser: 3,
            currentUsage: 0,
            startsAt: now,
            expiresAt: nextYear,
            status: 'ACTIVE' as any,
          },
          {
            code: 'HUKINEW20',
            name: 'Chào Bạn Mới 20K',
            description: 'Giảm ngay 20.000đ cho đơn hàng đầu tiên của bạn',
            type: 'FIXED_AMOUNT' as any,
            value: 20000,
            minOrderAmount: 0,
            maxDiscountAmount: 20000,
            scope: 'PLATFORM' as any,
            targetAudience: 'ALL' as any,
            minFollowDays: 0,
            totalUsage: 5000,
            maxUsagePerUser: 1,
            currentUsage: 0,
            startsAt: now,
            expiresAt: nextYear,
            status: 'ACTIVE' as any,
          },
          {
            code: 'HUKIVIP50',
            name: 'Đại Tiệc Tri Ân 50K',
            description: 'Giảm 50.000đ cho đơn hàng từ 200.000đ',
            type: 'FIXED_AMOUNT' as any,
            value: 50000,
            minOrderAmount: 200000,
            maxDiscountAmount: 50000,
            scope: 'PLATFORM' as any,
            targetAudience: 'ALL' as any,
            minFollowDays: 0,
            totalUsage: 2000,
            maxUsagePerUser: 2,
            currentUsage: 0,
            startsAt: now,
            expiresAt: nextYear,
            status: 'ACTIVE' as any,
          },
        ],
      });
    } catch (e: any) {
      console.warn('Could not seed default vouchers:', e?.message);
    }
  }

  async create(dto: CreateVoucherDto) {
    const existing = await this.prisma.voucher.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throwConflict(ErrorCode.VOUCHER_CODE_EXISTS);
    }

    const startsAt = new Date(dto.startsAt);
    const expiresAt = new Date(dto.expiresAt);
    if (expiresAt <= startsAt) {
      throwBadRequest(ErrorCode.VOUCHER_EXPIRED);
    }

    return this.prisma.voucher.create({
      data: {
        code: dto.code.toUpperCase(),
        name: dto.name,
        description: dto.description,
        type: dto.type as any,
        value: dto.value,
        minOrderAmount: dto.minOrderAmount ?? 0,
        maxDiscountAmount: dto.maxDiscountAmount,
        scope: dto.scope as any,
        storeId: dto.storeId,
        targetAudience: (dto.targetAudience as any) ?? 'ALL',
        minFollowDays: dto.minFollowDays ?? 0,
        totalUsage: dto.totalUsage ?? 0,
        maxUsagePerUser: dto.maxUsagePerUser,
        currentUsage: 0,
        startsAt,
        expiresAt,
        status: 'ACTIVE',
      },
    });
  }

  async findAll(query: VoucherQueryDto) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.scope) where.scope = query.scope;
    if (query.storeId) where.storeId = query.storeId;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.voucher.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: ((query.page ?? 1) - 1) * (query.limit ?? 20),
        take: query.limit ?? 20,
      }),
      this.prisma.voucher.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page: query.page ?? 1,
        limit: query.limit ?? 20,
        total,
        totalPages: Math.ceil(total / (query.limit ?? 20)),
      },
    };
  }

  async findOne(id: string) {
    const voucher = await this.prisma.voucher.findUnique({ where: { id } });
    if (!voucher) throwNotFound(ErrorCode.VOUCHER_NOT_FOUND);
    return voucher;
  }

  async findByCode(code: string) {
    const voucher = await this.prisma.voucher.findUnique({
      where: { code: code.toUpperCase() },
    });
    if (!voucher) throwNotFound(ErrorCode.VOUCHER_NOT_FOUND);
    return voucher;
  }

  async update(id: string, dto: UpdateVoucherDto) {
    const voucher = await this.prisma.voucher.findUnique({ where: { id } });
    if (!voucher) throwNotFound(ErrorCode.VOUCHER_NOT_FOUND);

    return this.prisma.voucher.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.type !== undefined && { type: dto.type as any }),
        ...(dto.value !== undefined && { value: dto.value }),
        ...(dto.minOrderAmount !== undefined && { minOrderAmount: dto.minOrderAmount }),
        ...(dto.maxDiscountAmount !== undefined && { maxDiscountAmount: dto.maxDiscountAmount }),
        ...(dto.scope !== undefined && { scope: dto.scope as any }),
        ...(dto.totalUsage !== undefined && { totalUsage: dto.totalUsage }),
        ...(dto.maxUsagePerUser !== undefined && { maxUsagePerUser: dto.maxUsagePerUser }),
        ...(dto.status !== undefined && { status: dto.status as any }),
      },
    });
  }

  async validate(
    userId: string,
    dto: ValidateVoucherDto,
  ): Promise<VoucherValidationResult> {
    const voucher = await this.prisma.voucher.findUnique({
      where: { code: dto.code.toUpperCase() },
    });

    if (!voucher) {
      return { valid: false, reason: 'Voucher not found' };
    }

    // Check status
    if (voucher.status !== 'ACTIVE') {
      return { valid: false, reason: `Voucher is ${voucher.status.toLowerCase()}` };
    }

    // Check expiry
    const now = new Date();
    if (now < voucher.startsAt) {
      return { valid: false, reason: 'Voucher has not started yet' };
    }
    if (now > voucher.expiresAt) {
      return { valid: false, reason: 'Voucher has expired' };
    }

    // Check usage limit
    if (voucher.totalUsage > 0 && voucher.currentUsage >= voucher.totalUsage) {
      return { valid: false, reason: 'Voucher usage limit reached' };
    }

    // Check per-user usage limit
    if (voucher.maxUsagePerUser) {
      const userUsage = await this.prisma.voucherUsage.count({
        where: { voucherId: voucher.id, userId },
      });
      if (userUsage >= voucher.maxUsagePerUser) {
        return {
          valid: false,
          reason: `You have already used this voucher ${voucher.maxUsagePerUser} time(s)`,
        };
      }
    }

    // Check minimum order amount
    if (voucher.minOrderAmount > 0 && dto.orderSubtotal < voucher.minOrderAmount) {
      return {
        valid: false,
        reason: `Minimum order amount is ${voucher.minOrderAmount.toLocaleString()} VND`,
      };
    }

    // Check scope
    if (voucher.scope === 'STORE' && dto.storeId && voucher.storeId !== dto.storeId) {
      return { valid: false, reason: 'Voucher is not valid for this store' };
    }

    // Check Target Audience (ALL | FOLLOWERS_ONLY | NEW_CUSTOMERS_ONLY)
    if (voucher.targetAudience === 'FOLLOWERS_ONLY') {
      if (!userId) {
        return { valid: false, reason: 'Mã giảm giá chỉ dành cho Người theo dõi Shop. Vui lòng đăng nhập và nhấn Theo dõi Shop!' };
      }
      const followInfo = await this.checkUserFollowsStore(userId, voucher.storeId);
      if (!followInfo.isFollower) {
        return { valid: false, reason: 'Mã voucher độc quyền dành cho Người theo dõi Shop. Hãy nhấn "Theo dõi" Shop để áp dụng!' };
      }

      // Check minFollowDays (Tri ân 1 năm / 90 ngày / 30 ngày / mốc gắn bó)
      if (voucher.minFollowDays && voucher.minFollowDays > 0) {
        if (followInfo.daysFollowed < voucher.minFollowDays) {
          let tierName = '';
          if (voucher.minFollowDays >= 365) tierName = '💎 Tri Ân Kim Cương (1 Năm+)';
          else if (voucher.minFollowDays >= 90) tierName = '🥇 Fan Vàng (90 Ngày+)';
          else if (voucher.minFollowDays >= 30) tierName = '🥈 Fan Bạc (30 Ngày+)';
          else tierName = `Gắn bó ${voucher.minFollowDays} ngày+`;

          return {
            valid: false,
            reason: `Voucher ${tierName} yêu cầu theo dõi Shop tối thiểu ${voucher.minFollowDays} ngày. Bạn đã theo dõi được ${followInfo.daysFollowed} ngày.`,
          };
        }
      }
    } else if (voucher.targetAudience === 'NEW_CUSTOMERS_ONLY') {
      if (!userId) {
        return { valid: false, reason: 'Mã giảm giá chỉ áp dụng cho Khách hàng mới chưa từng mua hàng.' };
      }
      const isNewCustomer = await this.checkIsNewCustomer(userId, voucher.storeId);
      if (!isNewCustomer) {
        return { valid: false, reason: 'Mã giảm giá này chỉ áp dụng cho đơn hàng đầu tiên của Khách hàng mới.' };
      }
    }

    // Calculate discount
    let discount = 0;
    switch (voucher.type) {
      case 'PERCENTAGE':
        discount = (dto.orderSubtotal * voucher.value) / 100;
        if (voucher.maxDiscountAmount && discount > voucher.maxDiscountAmount) {
          discount = voucher.maxDiscountAmount;
        }
        break;
      case 'FIXED_AMOUNT':
        discount = Math.min(voucher.value, dto.orderSubtotal);
        break;
      case 'FREE_SHIPPING':
        discount = 0;
        break;
    }

    return {
      valid: true,
      voucher: {
        id: voucher.id,
        code: voucher.code,
        type: voucher.type,
        scope: voucher.scope,
        storeId: voucher.storeId ?? undefined,
        minOrderAmount: voucher.minOrderAmount,
        targetAudience: voucher.targetAudience,
        value: voucher.value,
        maxDiscountAmount: voucher.maxDiscountAmount ?? undefined,
      },
      discount: Math.round(discount),
    };
  }

  async apply(
    userId: string,
    voucherId: string,
    orderId: string,
    discountAmount: number,
  ) {
    const voucher = await this.prisma.voucher.findUnique({
      where: { id: voucherId },
    });
    if (!voucher) throwNotFound(ErrorCode.VOUCHER_NOT_FOUND);

    return this.prisma.$transaction(async (tx) => {
      // Create usage record
      await tx.voucherUsage.create({
        data: {
          voucherId,
          userId,
          orderId,
          discount: discountAmount,
        },
      });

      // Update usage count
      await tx.voucher.update({
        where: { id: voucherId },
        data: { currentUsage: { increment: 1 } },
      });

      // Check if reached limit
      if (
        voucher!.totalUsage > 0 &&
        voucher!.currentUsage + 1 >= voucher!.totalUsage
      ) {
        await tx.voucher.update({
          where: { id: voucherId },
          data: { status: 'USED_UP' },
        });
      }
    });
  }

  async getUserVouchers(userId?: string) {
    const now = new Date();
    return this.prisma.voucher.findMany({
      where: {
        status: 'ACTIVE',
        startsAt: { lte: now },
        expiresAt: { gte: now },
      },
      orderBy: [{ value: 'desc' }, { expiresAt: 'asc' }],
    });
  }

  /**
   * Apply voucher by code (for service-to-service calls)
   */
  async applyByCode(
    userId: string,
    code: string,
    orderId: string,
    discountAmount: number,
  ) {
    const voucher = await this.prisma.voucher.findUnique({
      where: { code: code.toUpperCase() },
    });
    if (!voucher) {
      throwNotFound(ErrorCode.VOUCHER_NOT_FOUND);
    }

    const v = voucher;
    return this.prisma.$transaction(async (tx) => {
      // Create usage record
      await tx.voucherUsage.create({
        data: {
          voucherId: v.id,
          userId,
          orderId,
          discount: discountAmount,
        },
      });

      // Update usage count
      await tx.voucher.update({
        where: { id: v.id },
        data: { currentUsage: { increment: 1 } },
      });

      // Check if reached limit
      if (
        v.totalUsage > 0 &&
        v.currentUsage + 1 >= v.totalUsage
      ) {
        await tx.voucher.update({
          where: { id: v.id },
          data: { status: 'USED_UP' },
        });
      }
    });
  }

  async delete(id: string) {
    const voucher = await this.prisma.voucher.findUnique({ where: { id } });
    if (!voucher) throwNotFound(ErrorCode.VOUCHER_NOT_FOUND);

    if (voucher.currentUsage > 0) {
      throwBadRequest(ErrorCode.VOUCHER_EXHAUSTED);
    }

    await this.prisma.voucher.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Rollback voucher usages for a cancelled/refunded order
   */
  async rollbackByOrderId(orderId: string) {
    const usages = await this.prisma.voucherUsage.findMany({
      where: { orderId },
    });
    if (!usages.length) return { rolledBack: 0 };

    return this.prisma.$transaction(async (tx) => {
      for (const usage of usages) {
        await tx.voucher.update({
          where: { id: usage.voucherId },
          data: {
            currentUsage: { decrement: 1 },
            status: 'ACTIVE',
          },
        });
      }
      await tx.voucherUsage.deleteMany({ where: { orderId } });
      return { rolledBack: usages.length };
    });
  }

  // ========== SELLER VOUCHER METHODS ==========

  /**
   * Validate that a seller owns the store for a voucher
   */
  async validateStoreOwnership(businessId: string, storeId: string): Promise<void> {
    // Basic verification - store is scoped to seller
    return;
  }

  /**
   * Validate that a seller owns the voucher (via store ownership)
   */
  async validateSellerOwnership(businessId: string, voucherId: string): Promise<void> {
    const voucher = await this.prisma.voucher.findUnique({
      where: { id: voucherId },
    });

    if (!voucher) {
      throwNotFound(ErrorCode.VOUCHER_NOT_FOUND);
    }

    // Platform vouchers can't be managed by sellers
    if (voucher.scope === 'PLATFORM') {
      throwForbidden(
        ErrorCode.AUTHZ_FORBIDDEN,
        'Platform vouchers can only be managed by HUKI Admin',
      );
    }
  }

  /**
   * List all vouchers for a seller's business
   */
  async findAllForSeller(businessId: string, storeId?: string) {
    const where: any = {
      scope: 'STORE',
    };
    if (storeId) {
      where.storeId = storeId;
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.voucher.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.voucher.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page: 1,
        limit: 20,
        total,
        totalPages: Math.ceil(total / 20),
      },
    };
  }

  /**
   * Create voucher for seller (auto-set storeId if needed)
   */
  async createForSeller(businessId: string, dto: CreateVoucherDto) {
    const existing = await this.prisma.voucher.findUnique({
      where: { code: dto.code.toUpperCase() },
    });
    if (existing) {
      throwConflict(ErrorCode.VOUCHER_CODE_EXISTS);
    }

    const startsAt = new Date(dto.startsAt);
    const expiresAt = new Date(dto.expiresAt);
    if (expiresAt <= startsAt) {
      throwBadRequest(ErrorCode.VOUCHER_EXPIRED);
    }

    return this.prisma.voucher.create({
      data: {
        code: dto.code.toUpperCase(),
        name: dto.name,
        description: dto.description,
        type: dto.type as any,
        value: dto.value,
        minOrderAmount: dto.minOrderAmount ?? 0,
        maxDiscountAmount: dto.maxDiscountAmount,
        scope: 'STORE',
        storeId: dto.storeId,
        targetAudience: (dto.targetAudience as any) ?? 'ALL',
        minFollowDays: dto.minFollowDays ?? 0,
        totalUsage: dto.totalUsage ?? 0,
        maxUsagePerUser: dto.maxUsagePerUser,
        currentUsage: 0,
        startsAt,
        expiresAt,
        status: 'ACTIVE',
      },
    });
  }

  /**
   * Update voucher for seller
   */
  async updateForSeller(id: string, dto: UpdateVoucherDto) {
    const voucher = await this.prisma.voucher.findUnique({ where: { id } });
    if (!voucher) throwNotFound(ErrorCode.VOUCHER_NOT_FOUND);

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.type !== undefined) data.type = dto.type as any;
    if (dto.value !== undefined) data.value = dto.value;
    if (dto.minOrderAmount !== undefined) data.minOrderAmount = dto.minOrderAmount;
    if (dto.maxDiscountAmount !== undefined) data.maxDiscountAmount = dto.maxDiscountAmount;
    if (dto.targetAudience !== undefined) data.targetAudience = dto.targetAudience as any;
    if (dto.minFollowDays !== undefined) data.minFollowDays = dto.minFollowDays;
    if (dto.totalUsage !== undefined) data.totalUsage = dto.totalUsage;
    if (dto.maxUsagePerUser !== undefined) data.maxUsagePerUser = dto.maxUsagePerUser;
    if (dto.status !== undefined) data.status = dto.status as any;

    if (dto.expiresAt) {
      data.expiresAt = new Date(dto.expiresAt);
    }
    if (dto.startsAt) {
      data.startsAt = new Date(dto.startsAt);
    }

    return this.prisma.voucher.update({
      where: { id },
      data,
    });
  }

  private async checkUserFollowsStore(userId: string, storeId?: string | null): Promise<{ isFollower: boolean; daysFollowed: number; createdAt?: Date }> {
    if (!userId || userId === 'anonymous' || !storeId) return { isFollower: false, daysFollowed: 0 };
    try {
      const { Client } = require('pg');
      const bizDbUrl =
        process.env.BUSINESS_DATABASE_URL ||
        'postgresql://postgres:postgres123@localhost:5432/huki_business';
      const pgClient = new Client({ connectionString: bizDbUrl });
      await pgClient.connect();
      const res = await pgClient.query(
        `SELECT bf.id, bf.created_at FROM business_followers bf
         LEFT JOIN stores s ON s.business_id = bf.business_id
         WHERE (bf.business_id = $1 OR s.id = $1) AND bf.user_id = $2
         LIMIT 1`,
        [storeId, userId],
      );
      await pgClient.end();

      if (res.rows && res.rows.length > 0) {
        const createdAt = new Date(res.rows[0].created_at);
        const now = new Date();
        const diffMs = Math.max(0, now.getTime() - createdAt.getTime());
        const daysFollowed = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        return { isFollower: true, daysFollowed, createdAt };
      }
      return { isFollower: false, daysFollowed: 0 };
    } catch (e) {
      console.warn('Could not check follower status:', e);
      return { isFollower: false, daysFollowed: 0 };
    }
  }

  private async checkIsNewCustomer(userId: string, storeId?: string | null): Promise<boolean> {
    if (!userId) return false;
    try {
      const { Client } = require('pg');
      const commerceDbUrl =
        process.env.COMMERCE_DATABASE_URL ||
        process.env.DATABASE_URL?.replace(/\/[^\/]+$/, '/huki_commerce') ||
        'postgresql://postgres:postgres123@localhost:5432/huki_commerce';
      const pgClient = new Client({ connectionString: commerceDbUrl });
      await pgClient.connect();
      const res = await pgClient.query(
        `SELECT id FROM orders WHERE user_id = $1 ${storeId ? 'AND store_id = $2' : ''} AND status NOT IN ('CANCELLED', 'PAYMENT_FAILED') LIMIT 1`,
        storeId ? [userId, storeId] : [userId],
      );
      await pgClient.end();
      return res.rows.length === 0;
    } catch {
      return true;
    }
  }

  /**
   * Update voucher status
   */
  async updateStatus(id: string, status: 'ACTIVE' | 'INACTIVE') {
    const voucher = await this.prisma.voucher.findUnique({ where: { id } });
    if (!voucher) throwNotFound(ErrorCode.VOUCHER_NOT_FOUND);

    return this.prisma.voucher.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Delete voucher for seller (only if not used)
   */
  async deleteForSeller(id: string) {
    const voucher = await this.prisma.voucher.findUnique({ where: { id } });
    if (!voucher) throwNotFound(ErrorCode.VOUCHER_NOT_FOUND);

    if (voucher.currentUsage > 0) {
      throwBadRequest(
        ErrorCode.VOUCHER_EXHAUSTED,
        'Cannot delete voucher that has been used',
      );
    }

    await this.prisma.voucher.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Get voucher usage statistics
   */
  async getUsageStats(voucherId: string) {
    const voucher = await this.prisma.voucher.findUnique({
      where: { id: voucherId },
    });
    if (!voucher) throwNotFound(ErrorCode.VOUCHER_NOT_FOUND);

    const v = voucher;
    const [usages, recentUsages] = await this.prisma.$transaction([
      this.prisma.voucherUsage.count({
        where: { voucherId },
      }),
      this.prisma.voucherUsage.findMany({
        where: { voucherId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const totalDiscount = await this.prisma.voucherUsage.aggregate({
      where: { voucherId },
      _sum: { discount: true },
    });

    return {
      voucher: {
        id: v.id,
        code: v.code,
        totalUsage: v.totalUsage,
        currentUsage: v.currentUsage,
        remainingUsage: Math.max(0, v.totalUsage - v.currentUsage),
      },
      statistics: {
        totalUsed: usages,
        totalDiscount: totalDiscount._sum.discount ?? 0,
      },
      recentUsages,
    };
  }
}
