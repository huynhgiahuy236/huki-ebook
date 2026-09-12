import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateBusinessDto, UpdateBusinessDto } from './dto/business.dto';
import { BusinessStatus, BusinessType, StoreStatus } from '../../../prisma/generated/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { throwConflict, throwNotFound, throwBadRequest, throwForbidden } from '@huki/shared/errors';
import { ErrorCode } from '@huki/shared/errors';
import { BUSINESS_EVENTS } from '@huki/shared/events';

@Injectable()
export class BusinessService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  // ==================== CREATE ====================
  async registerBusiness(userId: string, dto: CreateBusinessDto) {
    // Check if user already has a business
    const existingBusiness = await this.prisma.business.findFirst({
      where: { ownerId: userId, deletedAt: null },
    });

    if (existingBusiness) {
      if (existingBusiness.status === BusinessStatus.APPROVED) {
        throwConflict(ErrorCode.BUSINESS_ALREADY_EXISTS, 'Tài khoản của bạn đã có một doanh nghiệp được phê duyệt.');
      }
      throwConflict(ErrorCode.BUSINESS_ALREADY_EXISTS, 'Bạn đã có một hồ sơ đăng ký đang chờ xét duyệt hoặc đã tồn tại.');
    }

    // Check if email already exists
    if (dto.email) {
      const emailExists = await this.prisma.business.findFirst({
        where: { email: dto.email, deletedAt: null },
      });

      if (emailExists) {
        throwConflict(ErrorCode.BUSINESS_ALREADY_EXISTS, 'Email doanh nghiệp này đã được đăng ký.');
      }
    }

    // Check if taxCode already exists
    if (dto.taxCode) {
      const taxExists = await this.prisma.business.findFirst({
        where: { taxCode: dto.taxCode, deletedAt: null },
      });

      if (taxExists) {
        throwConflict(ErrorCode.BUSINESS_TAX_CODE_EXISTS, 'Mã số thuế này đã được đăng ký bởi một đơn vị khác.');
      }
    }

    // Create business
    const business = await this.prisma.business.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        taxCode: dto.taxCode,
        businessType: dto.businessType as BusinessType,
        ownerId: userId,
        status: BusinessStatus.PENDING_APPROVAL,
      },
    });

    // Auto-create primary store for the business (1-to-1 unified model)
    const normalizedSlug = dto.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
    let slug = normalizedSlug || `shop-${Date.now()}`;
    const existingStore = await this.prisma.store.findUnique({ where: { slug } });
    if (existingStore) {
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    await this.prisma.store.create({
      data: {
        name: dto.name,
        slug,
        description: `Gian hàng chính hãng phân phối sách của ${dto.name}`,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        businessId: business.id,
        status: StoreStatus.PENDING_APPROVAL,
        isActive: true,
        categoryIds: [],
      },
    });

    // Add owner as member with OWNER role
    await this.prisma.member.create({
      data: {
        businessId: business.id,
        userId: userId,
        role: 'OWNER',
        status: 'ACTIVE',
        acceptedAt: new Date(),
      },
    });

    // Emit event
    this.eventEmitter.emit(BUSINESS_EVENTS.REGISTERED, {
      businessId: business.id,
      ownerId: userId,
      name: business.name,
    });

    return business;
  }

  // ==================== READ ====================
  async getBusinessById(id: string) {
    const business = await this.prisma.business.findUnique({
      where: { id },
      include: {
        stores: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            logo: true,
          },
        },
        members: {
          where: { deletedAt: null },
          select: {
            id: true,
            userId: true,
            role: true,
            status: true,
            acceptedAt: true,
          },
        },
      },
    });

    if (!business) {
      throwNotFound(ErrorCode.BUSINESS_NOT_FOUND);
    }

    return business;
  }

  async getBusinessByOwner(userId: string) {
    const business = await this.prisma.business.findFirst({
      where: { ownerId: userId },
      include: {
        stores: {
          where: { deletedAt: null },
        },
        members: {
          where: { deletedAt: null },
        },
      },
    });

    return business;
  }

  async getAllBusinesses(filters: {
    status?: BusinessStatus;
    search?: string;
    page?: number;
    limit?: number;
  }, includeNonPublic = false) {
    const { status, search, page = 1, limit = 20 } = filters;

    const where: any = {
      deletedAt: null,
      ...(!includeNonPublic && { status: BusinessStatus.APPROVED }),
    };

    if (includeNonPublic && status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [businesses, total] = await Promise.all([
      this.prisma.business.findMany({
        where,
        include: {
          stores: {
            select: { id: true, name: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.business.count({ where }),
    ]);

    return {
      data: businesses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==================== UPDATE ====================
  async updateBusiness(id: string, userId: string, dto: UpdateBusinessDto) {
    // Check ownership
    const business = await this.prisma.business.findUnique({
      where: { id },
    });

    if (!business) {
      throwNotFound(ErrorCode.BUSINESS_NOT_FOUND);
    }

    if (business!.ownerId !== userId) {
      throwForbidden(ErrorCode.AUTHZ_NOT_OWNER);
    }

    return this.prisma.business.update({
      where: { id },
      data: dto,
    });
  }

  // ==================== APPROVAL FLOW ====================
  async approveBusiness(id: string, adminId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id },
    });

    if (!business) {
      throwNotFound(ErrorCode.BUSINESS_NOT_FOUND);
    }

    if (business!.status !== BusinessStatus.PENDING_APPROVAL) {
      throwBadRequest(ErrorCode.BUSINESS_NOT_APPROVED);
    }

    // Mock registry verification (in real app, call actual registry API)
    const registryVerified = await this.mockRegistryVerification(business!.taxCode);

    const updatedBusiness = await this.prisma.business.update({
      where: { id },
      data: {
        status: registryVerified
          ? BusinessStatus.APPROVED
          : BusinessStatus.REJECTED,
        registryVerifiedAt: registryVerified ? new Date() : null,
        approvedAt: registryVerified ? new Date() : null,
        approvedBy: registryVerified ? adminId : null,
        rejectedAt: !registryVerified ? new Date() : null,
        rejectedBy: !registryVerified ? adminId : null,
        rejectionReason: !registryVerified
          ? 'Thông tin đăng ký không hợp lệ'
          : null,
      },
    });

    if (registryVerified && business?.ownerId) {
      // Sync store approval
      await this.prisma.store.updateMany({
        where: { businessId: business.id },
        data: {
          status: StoreStatus.APPROVED,
          isActive: true,
        },
      });

      try {
        const { Client } = require('pg');
        const pgClient = new Client({
          connectionString: process.env.IDENTITY_DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/huki_identity'
        });
        await pgClient.connect();
        await pgClient.query('UPDATE users SET role = $1 WHERE id = $2', ['BUSINESS', business.ownerId]);
        await pgClient.end();
      } catch (err) {
        // Ignore pg error if identity db is handled via event
      }
    } else if (business) {
      await this.prisma.store.updateMany({
        where: { businessId: business.id },
        data: {
          status: StoreStatus.REJECTED,
          isActive: false,
        },
      });
    }

    // Emit event
    this.eventEmitter.emit(
      registryVerified ? BUSINESS_EVENTS.APPROVED : BUSINESS_EVENTS.REJECTED,
      {
        businessId: business!.id,
        ownerId: business!.ownerId,
        approved: registryVerified,
      },
    );

    return updatedBusiness;
  }

  async rejectBusiness(id: string, adminId: string, reason: string) {
    await this.prisma.store.updateMany({
      where: { businessId: id },
      data: {
        status: StoreStatus.REJECTED,
        isActive: false,
      },
    });

    return this.prisma.business.update({
      where: { id },
      data: {
        status: BusinessStatus.REJECTED,
        rejectedAt: new Date(),
        rejectedBy: adminId,
        rejectionReason: reason,
      },
    });
  }

  async suspendBusiness(id: string) {
    await this.prisma.store.updateMany({
      where: { businessId: id },
      data: {
        status: StoreStatus.SUSPENDED,
        isActive: false,
      },
    });

    return this.prisma.business.update({
      where: { id },
      data: {
        status: BusinessStatus.SUSPENDED,
      },
    });
  }

  // ==================== FOLLOW / UNFOLLOW ====================
  async followBusiness(userId: string, businessId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!business) {
      throwNotFound(ErrorCode.BUSINESS_NOT_FOUND, 'Không tìm thấy nhà xuất bản/doanh nghiệp');
    }

    const follower = await (this.prisma as any).businessFollower.upsert({
      where: {
        businessId_userId: {
          businessId,
          userId,
        },
      },
      create: {
        businessId,
        userId,
      },
      update: {},
    });

    const totalFollowers = await (this.prisma as any).businessFollower.count({
      where: { businessId },
    });

    return {
      followed: true,
      businessId,
      totalFollowers,
      follower,
    };
  }

  async unfollowBusiness(userId: string, businessId: string) {
    try {
      await (this.prisma as any).businessFollower.delete({
        where: {
          businessId_userId: {
            businessId,
            userId,
          },
        },
      });
    } catch {
      // Ignored if not found
    }

    const totalFollowers = await (this.prisma as any).businessFollower.count({
      where: { businessId },
    });

    return {
      followed: false,
      businessId,
      totalFollowers,
    };
  }

  async getMyFollowedBusinessIds(userId: string): Promise<string[]> {
    const records = await (this.prisma as any).businessFollower.findMany({
      where: { userId },
      select: { businessId: true },
    });
    return records.map((r: { businessId: string }) => r.businessId);
  }

  // ==================== HELPERS ====================
  private async mockRegistryVerification(
    taxCode: string | null,
  ): Promise<boolean> {
    // Mock verification - always return true if taxCode exists
    // In production, call actual registry API
    return !!taxCode;
  }

  // Check if user is owner or manager of business
  async isBusinessMember(
    businessId: string,
    userId: string,
    allowedRoles: string[] = ['OWNER', 'MANAGER'],
  ): Promise<boolean> {
    const member = await this.prisma.member.findUnique({
      where: {
        businessId_userId: {
          businessId,
          userId,
        },
      },
    });

    if (!member || member.status !== 'ACTIVE') {
      return false;
    }

    return allowedRoles.includes(member.role);
  }
}
