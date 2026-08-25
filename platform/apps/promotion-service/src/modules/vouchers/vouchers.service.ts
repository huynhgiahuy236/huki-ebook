import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateVoucherDto,
  UpdateVoucherDto,
  VoucherQueryDto,
  ValidateVoucherDto,
} from './dto/voucher.dto';
import { throwConflict, throwNotFound, throwBadRequest } from '@huki/shared/errors';
import { ErrorCode } from '@huki/shared/errors';

export interface VoucherValidationResult {
  valid: boolean;
  voucher?: {
    id: string;
    code: string;
    type: string;
    value: number;
    maxDiscountAmount?: number;
  };
  discount?: number;
  reason?: string;
}

@Injectable()
export class VouchersService {
  constructor(private readonly prisma: PrismaService) {}

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

  async getUserVouchers(userId: string) {
    const now = new Date();
    return this.prisma.voucher.findMany({
      where: {
        status: 'ACTIVE',
        startsAt: { lte: now },
        expiresAt: { gte: now },
        OR: [
          { scope: 'PLATFORM' },
          { scope: 'STORE' },
        ],
      },
      orderBy: { expiresAt: 'asc' },
    });
  }

  async delete(id: string) {
    const voucher = await this.prisma.voucher.findUnique({ where: { id } });
    if (!voucher) throwNotFound(ErrorCode.VOUCHER_NOT_FOUND);

    if (voucher!.currentUsage > 0) {
      throwBadRequest(ErrorCode.VOUCHER_EXHAUSTED);
    }

    await this.prisma.voucher.delete({ where: { id } });
    return { success: true };
  }
}
