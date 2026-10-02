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
    // Disabled automatic sample vouchers seeding as requested
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

  async findAll(query: VoucherQueryDto & { activeOnly?: boolean | string }) {
    const where: any = {};
    const now = new Date();

    const isActiveOnly =
      query.activeOnly === true ||
      query.activeOnly === 'true' ||
      query.status === 'ACTIVE' ||
      (!query.status && Boolean(query.storeId));

    if (isActiveOnly) {
      where.status = 'ACTIVE';
      where.startsAt = { lte: now };
      where.expiresAt = { gte: now };
    } else if (query.status) {
      where.status = query.status;
    }

    if (query.scope) where.scope = query.scope;
    if (query.storeId) {
      const relatedIds = await this.getRelatedStoreAndBusinessIds(query.storeId);
      where.storeId = relatedIds.length === 1 ? relatedIds[0] : { in: relatedIds };
    }

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

    // Check if voucher is in user's wallet (Mandatory Claim Rule)
    if (userId && userId !== 'anonymous') {
      const isSaved = await this.prisma.userSavedVoucher.findUnique({
        where: { userId_voucherId: { userId, voucherId: voucher.id } },
      });
      if (!isSaved) {
        return {
          valid: false,
          reason: 'Mã voucher này chưa được lưu vào Ví của bạn. Vui lòng lưu mã vào ví trước khi sử dụng!',
        };
      }
    }

    // Check status
    if (voucher.status !== 'ACTIVE') {
      return { valid: false, reason: `Mã voucher hiện đang ở trạng thái: ${voucher.status}` };
    }

    // Check expiry
    const now = new Date();
    if (now < voucher.startsAt) {
      return { valid: false, reason: 'Mã voucher chưa đến thời gian có hiệu lực sử dụng' };
    }
    if (now > voucher.expiresAt) {
      return { valid: false, reason: 'Mã voucher đã hết hạn sử dụng' };
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
    if (voucher.scope === 'STORE') {
      if (!dto.storeId) {
        return {
          valid: false,
          reason: 'Voucher cửa hàng chỉ áp dụng khi giỏ hàng có sản phẩm của gian hàng phát hành',
        };
      }
      const relatedIds = await this.getRelatedStoreAndBusinessIds(dto.storeId);
      if (voucher.storeId && !relatedIds.includes(voucher.storeId)) {
        return { valid: false, reason: 'Voucher không áp dụng cho gian hàng này' };
      }
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
        discount = voucher.value || 30000;
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

  async isUserEligible(userId: string | undefined, voucher: any): Promise<boolean> {
    if (!voucher || voucher.status !== 'ACTIVE') return false;
    const now = new Date();
    if (voucher.startsAt && new Date(voucher.startsAt) > now) return false;
    if (voucher.expiresAt && new Date(voucher.expiresAt) < now) return false;
    if (voucher.totalUsage > 0 && voucher.currentUsage >= voucher.totalUsage) return false;

    // Check user usage limit if user is known
    if (userId && userId !== 'anonymous' && voucher.maxUsagePerUser) {
      const userUsage = await this.prisma.voucherUsage.count({
        where: { voucherId: voucher.id, userId },
      });
      if (userUsage >= voucher.maxUsagePerUser) {
        return false;
      }
    }

    if (voucher.scope === 'PLATFORM') {
      if (voucher.targetAudience === 'NEW_CUSTOMERS_ONLY') {
        if (!userId || userId === 'anonymous') return false;
        return this.checkIsNewCustomer(userId, null);
      }
      return true; // ALL
    }

    if (voucher.scope === 'STORE') {
      if (voucher.targetAudience === 'ALL') return true;
      if (voucher.targetAudience === 'NEW_CUSTOMERS_ONLY') {
        if (!userId || userId === 'anonymous') return false;
        return this.checkIsNewCustomer(userId, voucher.storeId);
      }
      if (voucher.targetAudience === 'FOLLOWERS_ONLY') {
        if (!userId || userId === 'anonymous') return false;
        const followInfo = await this.checkUserFollowsStore(userId, voucher.storeId);
        if (!followInfo.isFollower) return false;
        if (voucher.minFollowDays && voucher.minFollowDays > 0) {
          return followInfo.daysFollowed >= voucher.minFollowDays;
        }
        return true;
      }
    }

    return true;
  }

  async getEligibleFeed(userId?: string) {
    const now = new Date();
    const allActive = await this.prisma.voucher.findMany({
      where: {
        status: 'ACTIVE',
        startsAt: { lte: now },
        expiresAt: { gte: now },
      },
      orderBy: [{ value: 'desc' }, { expiresAt: 'asc' }],
    });

    // Check eligibility
    const eligibleVouchers: any[] = [];
    for (const v of allActive) {
      const eligible = await this.isUserEligible(userId, v);
      if (eligible) {
        eligibleVouchers.push(v);
      }
    }

    // Check saved state
    let savedIds = new Set<string>();
    if (userId && userId !== 'anonymous') {
      const saved = await this.prisma.userSavedVoucher.findMany({
        where: { userId },
        select: { voucherId: true },
      });
      savedIds = new Set(saved.map((s) => s.voucherId));
    }

    const platformVouchers = eligibleVouchers
      .filter((v) => v.scope === 'PLATFORM')
      .map((v) => ({
        ...v,
        isSaved: savedIds.has(v.id),
      }));

    const shopVouchers = eligibleVouchers
      .filter((v) => v.scope === 'STORE')
      .map((v) => ({
        ...v,
        isSaved: savedIds.has(v.id),
      }));

    // Group shop vouchers by storeId
    const storeIds = Array.from(
      new Set(shopVouchers.map((v) => v.storeId).filter(Boolean)),
    ) as string[];
    const storeMap = await this.getStoreDetailsMap(storeIds);

    const storeGroupsMap = new Map<string, { store: any; vouchers: any[] }>();
    for (const v of shopVouchers) {
      const sId = v.storeId || 'unknown';
      if (!storeGroupsMap.has(sId)) {
        const storeInfo = storeMap.get(sId) || {
          id: sId,
          name: 'Gian hàng đối tác',
          slug: sId,
        };
        storeGroupsMap.set(sId, { store: storeInfo, vouchers: [] });
      }
      storeGroupsMap.get(sId)!.vouchers.push(v);
    }

    return {
      platformVouchers,
      shopVouchersGrouped: Array.from(storeGroupsMap.values()),
    };
  }

  async getHomepageFeed(userId?: string) {
    const now = new Date();
    // 1. Get eligible platform vouchers
    const platformActive = await this.prisma.voucher.findMany({
      where: {
        scope: 'PLATFORM',
        status: 'ACTIVE',
        startsAt: { lte: now },
        expiresAt: { gte: now },
      },
      orderBy: [{ value: 'desc' }, { expiresAt: 'asc' }],
    });

    const eligiblePlatform: any[] = [];
    for (const v of platformActive) {
      if (await this.isUserEligible(userId, v)) {
        eligiblePlatform.push(v);
      }
    }

    // 2. If user is logged in, find stores user follows and get eligible vouchers of those stores
    const eligibleShopVouchers: any[] = [];
    if (userId && userId !== 'anonymous') {
      const followedStoreIds = await this.getUserFollowedStoreAndBusinessIds(userId);
      if (followedStoreIds.length > 0) {
        const shopActive = await this.prisma.voucher.findMany({
          where: {
            scope: 'STORE',
            storeId: { in: followedStoreIds },
            status: 'ACTIVE',
            startsAt: { lte: now },
            expiresAt: { gte: now },
          },
          orderBy: [{ value: 'desc' }, { expiresAt: 'asc' }],
        });
        for (const v of shopActive) {
          if (await this.isUserEligible(userId, v)) {
            eligibleShopVouchers.push(v);
          }
        }
      }
    }

    // Get saved IDs
    let savedIds = new Set<string>();
    if (userId && userId !== 'anonymous') {
      const saved = await this.prisma.userSavedVoucher.findMany({
        where: { userId },
        select: { voucherId: true },
      });
      savedIds = new Set(saved.map((s) => s.voucherId));
    }

    // Attach store info for shop vouchers
    const allShopStoreIds = Array.from(
      new Set(eligibleShopVouchers.map((v) => v.storeId).filter(Boolean)),
    ) as string[];
    const storeMap = await this.getStoreDetailsMap(allShopStoreIds);

    const platformWithSaved = eligiblePlatform.map((v) => ({
      ...v,
      isSaved: savedIds.has(v.id),
    }));

    const shopWithSaved = eligibleShopVouchers.map((v) => ({
      ...v,
      isSaved: savedIds.has(v.id),
      store: v.storeId ? storeMap.get(v.storeId) : undefined,
    }));

    return {
      vouchers: [...platformWithSaved, ...shopWithSaved],
      platformVouchers: platformWithSaved,
      shopVouchers: shopWithSaved,
    };
  }

  async saveToWallet(userId: string, voucherId: string) {
    if (!userId || userId === 'anonymous') {
      throwBadRequest(ErrorCode.AUTH_TOKEN_MISSING, 'Vui lòng đăng nhập để lưu voucher vào ví');
    }
    const voucher = await this.prisma.voucher.findUnique({
      where: { id: voucherId },
    });
    if (!voucher) {
      throwNotFound(ErrorCode.VOUCHER_NOT_FOUND, 'Không tìm thấy mã voucher');
    }
    const eligible = await this.isUserEligible(userId, voucher);
    if (!eligible) {
      throwBadRequest(ErrorCode.VOUCHER_NOT_APPLICABLE, 'Bạn chưa đủ điều kiện để lưu voucher này');
    }
    await this.prisma.userSavedVoucher.upsert({
      where: { userId_voucherId: { userId, voucherId } },
      create: { userId, voucherId },
      update: {},
    });
    return { success: true, message: 'Đã lưu voucher vào ví của bạn!' };
  }

  async unsaveFromWallet(userId: string, voucherId: string) {
    if (!userId || userId === 'anonymous') {
      throwBadRequest(ErrorCode.AUTH_TOKEN_MISSING, 'Vui lòng đăng nhập');
    }
    await this.prisma.userSavedVoucher.deleteMany({
      where: { userId, voucherId },
    });
    return { success: true, message: 'Đã xóa voucher khỏi ví!' };
  }

  async getWalletVouchers(userId: string) {
    if (!userId || userId === 'anonymous') {
      return {
        platform: { freeship: [], discount: [], all: [] },
        stores: [],
        totalCount: 0,
      };
    }
    const savedRecords = await this.prisma.userSavedVoucher.findMany({
      where: { userId },
      include: { voucher: true },
      orderBy: { savedAt: 'desc' },
    });

    const now = new Date();
    const validSaved = savedRecords.filter((record) => {
      const v = record.voucher;
      if (!v) return false;
      if (v.status !== 'ACTIVE') return false;
      if (v.startsAt && new Date(v.startsAt) > now) return false;
      if (v.expiresAt && new Date(v.expiresAt) < now) return false;
      if (v.totalUsage > 0 && v.currentUsage >= v.totalUsage) return false;
      return true;
    });

    // Also verify per-user max usage limit
    const validVouchers: any[] = [];
    for (const record of validSaved) {
      const v = record.voucher;
      if (v.maxUsagePerUser) {
        const count = await this.prisma.voucherUsage.count({
          where: { voucherId: v.id, userId },
        });
        if (count >= v.maxUsagePerUser) continue;
      }
      validVouchers.push({ ...v, savedAt: record.savedAt, isSaved: true });
    }

    const platformFreeship = validVouchers.filter(
      (v) => v.scope === 'PLATFORM' && v.type === 'FREE_SHIPPING',
    );
    const platformDiscount = validVouchers.filter(
      (v) => v.scope === 'PLATFORM' && v.type !== 'FREE_SHIPPING',
    );
    const shopVouchers = validVouchers.filter((v) => v.scope === 'STORE');

    const storeIds = Array.from(
      new Set(shopVouchers.map((v) => v.storeId).filter(Boolean)),
    ) as string[];
    const storeMap = await this.getStoreDetailsMap(storeIds);

    const storeGroupsMap = new Map<string, { store: any; vouchers: any[] }>();
    for (const v of shopVouchers) {
      const sId = v.storeId || 'unknown';
      if (!storeGroupsMap.has(sId)) {
        const storeInfo = storeMap.get(sId) || {
          id: sId,
          name: 'Gian hàng đối tác',
          slug: sId,
        };
        storeGroupsMap.set(sId, { store: storeInfo, vouchers: [] });
      }
      storeGroupsMap.get(sId)!.vouchers.push(v);
    }

    return {
      platform: {
        freeship: platformFreeship,
        discount: platformDiscount,
        all: [...platformFreeship, ...platformDiscount],
      },
      stores: Array.from(storeGroupsMap.values()),
      totalCount: validVouchers.length,
    };
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

    const targetLookupId = storeId || businessId;
    if (targetLookupId && targetLookupId !== 'seller' && targetLookupId !== 'all') {
      const relatedIds = await this.getRelatedStoreAndBusinessIds(targetLookupId);
      if (relatedIds.length > 0) {
        where.storeId = { in: relatedIds };
      } else {
        where.storeId = targetLookupId;
      }
    } else if (!targetLookupId) {
      return {
        items: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      };
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

  private async getRelatedStoreAndBusinessIds(id?: string | null): Promise<string[]> {
    if (!id) return [];
    try {
      const { Client } = require('pg');
      const bizDbUrl =
        process.env.BUSINESS_DATABASE_URL ||
        'postgresql://postgres:postgres123@localhost:5432/huki_business';
      const pgClient = new Client({ connectionString: bizDbUrl });
      await pgClient.connect();
      const res = await pgClient.query(
        `SELECT s.id as store_id, s.business_id, b.owner_id
         FROM stores s
         LEFT JOIN businesses b ON s.business_id = b.id
         WHERE s.id = $1 OR s.business_id = $1 OR b.id = $1 OR b.owner_id = $1`,
        [id],
      );
      await pgClient.end();
      const ids = new Set<string>([id]);
      if (res.rows && res.rows.length > 0) {
        for (const row of res.rows) {
          if (row.store_id) ids.add(row.store_id);
          if (row.business_id) ids.add(row.business_id);
          if (row.owner_id) ids.add(row.owner_id);
        }
      }
      return Array.from(ids);
    } catch {
      return [id];
    }
  }

  private async checkUserFollowsStore(userId: string, storeId?: string | null): Promise<{ isFollower: boolean; daysFollowed: number; createdAt?: Date }> {
    if (!userId || userId === 'anonymous' || !storeId) return { isFollower: false, daysFollowed: 0 };
    try {
      const relatedIds = await this.getRelatedStoreAndBusinessIds(storeId);
      const { Client } = require('pg');
      const bizDbUrl =
        process.env.BUSINESS_DATABASE_URL ||
        'postgresql://postgres:postgres123@localhost:5432/huki_business';
      const pgClient = new Client({ connectionString: bizDbUrl });
      await pgClient.connect();
      const res = await pgClient.query(
        `SELECT bf.id, bf.created_at FROM business_followers bf
         WHERE bf.business_id = ANY($1) AND bf.user_id = $2
         LIMIT 1`,
        [relatedIds, userId],
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
      const relatedIds = await this.getRelatedStoreAndBusinessIds(storeId);
      const { Client } = require('pg');
      const commerceDbUrl =
        process.env.COMMERCE_DATABASE_URL ||
        process.env.DATABASE_URL?.replace(/\/[^\/]+$/, '/huki_commerce') ||
        'postgresql://postgres:postgres123@localhost:5432/huki_commerce';
      const pgClient = new Client({ connectionString: commerceDbUrl });
      await pgClient.connect();
      const res = await pgClient.query(
        `SELECT id FROM orders WHERE user_id = $1 ${relatedIds.length > 0 ? 'AND (store_id = ANY($2) OR business_id = ANY($2))' : ''} AND status NOT IN ('CANCELLED', 'PAYMENT_FAILED') LIMIT 1`,
        relatedIds.length > 0 ? [userId, relatedIds] : [userId],
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

  async getStoreDetailsMap(storeIds: string[]): Promise<Map<string, { id: string; name: string; slug: string; logo?: string; businessId?: string }>> {
    const map = new Map<string, any>();
    if (!storeIds || !storeIds.length) return map;
    try {
      const { Client } = require('pg');
      const bizDbUrl =
        process.env.BUSINESS_DATABASE_URL ||
        'postgresql://postgres:postgres123@localhost:5432/huki_business';
      const pgClient = new Client({ connectionString: bizDbUrl });
      await pgClient.connect();
      const res = await pgClient.query(
        `SELECT id, name, slug, logo, business_id FROM stores WHERE id = ANY($1) OR business_id = ANY($1)`,
        [storeIds],
      );
      await pgClient.end();
      if (res.rows && res.rows.length > 0) {
        for (const row of res.rows) {
          const info = {
            id: row.id,
            name: row.name,
            slug: row.slug,
            logo: row.logo,
            businessId: row.business_id,
          };
          map.set(row.id, info);
          if (row.business_id) {
            map.set(row.business_id, info);
          }
        }
      }
    } catch (e) {
      console.warn('Could not fetch store details:', e);
    }
    return map;
  }

  private async getUserFollowedStoreAndBusinessIds(userId: string): Promise<string[]> {
    if (!userId || userId === 'anonymous') return [];
    try {
      const { Client } = require('pg');
      const bizDbUrl =
        process.env.BUSINESS_DATABASE_URL ||
        'postgresql://postgres:postgres123@localhost:5432/huki_business';
      const pgClient = new Client({ connectionString: bizDbUrl });
      await pgClient.connect();
      const res = await pgClient.query(
        `SELECT bf.business_id, s.id as store_id 
         FROM business_followers bf
         LEFT JOIN stores s ON s.business_id = bf.business_id
         WHERE bf.user_id = $1`,
        [userId],
      );
      await pgClient.end();
      const ids = new Set<string>();
      if (res.rows && res.rows.length > 0) {
        for (const row of res.rows) {
          if (row.business_id) ids.add(row.business_id);
          if (row.store_id) ids.add(row.store_id);
        }
      }
      return Array.from(ids);
    } catch (e) {
      console.warn('Could not fetch followed store IDs:', e);
      return [];
    }
  }

  async getUsagesByOrderIds(orderIds: string[]) {
    if (!orderIds || !orderIds.length) return [];
    return this.prisma.voucherUsage.findMany({
      where: { orderId: { in: orderIds } },
      include: {
        voucher: {
          select: {
            id: true,
            code: true,
            scope: true,
            storeId: true,
            type: true,
            value: true,
          },
        },
      },
    });
  }
}
