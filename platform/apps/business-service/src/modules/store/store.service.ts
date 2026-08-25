import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateStoreDto, UpdateStoreDto } from './dto/store.dto';
import { StoreStatus } from '../../../prisma/generated/client';
import { throwNotFound, throwBadRequest, throwForbidden } from '@huki/shared/errors';
import { ErrorCode } from '@huki/shared/errors';
import { BUSINESS_EVENTS } from '@huki/shared/events';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class StoreService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  // ==================== CREATE ====================
  async createStore(businessId: string, userId: string, dto: CreateStoreDto) {
    // Check if user is owner/manager of business
    const isMember = await this.checkStorePermission(businessId, userId, [
      'OWNER',
      'MANAGER',
    ]);
    if (!isMember) {
      throwForbidden(ErrorCode.AUTHZ_NOT_MEMBER);
    }

    // Check if slug is unique
    const slugExists = await this.prisma.store.findUnique({
      where: { slug: dto.slug },
    });
    if (slugExists) {
      throwBadRequest(ErrorCode.STORE_SLUG_EXISTS);
    }

    // Check if business is approved
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!business || business.status !== 'APPROVED') {
      throwBadRequest(ErrorCode.BUSINESS_NOT_APPROVED);
    }

    const store = await this.prisma.store.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        logo: dto.logo,
        banner: dto.banner,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        businessId,
        categoryIds: dto.categoryIds || [],
        status: StoreStatus.PENDING_APPROVAL,
      },
    });

    // Emit event
    this.eventEmitter.emit(BUSINESS_EVENTS.STORE_CREATED, {
      storeId: store.id,
      businessId,
    });

    return store;
  }

  // ==================== READ ====================
  async getStoreById(id: string) {
    const store = await this.prisma.store.findUnique({
      where: { id },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    if (!store) {
      throwNotFound(ErrorCode.STORE_NOT_FOUND);
    }

    return store;
  }

  async getStoreBySlug(slug: string) {
    const store = await this.prisma.store.findUnique({
      where: { slug },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    if (!store) {
      throwNotFound(ErrorCode.STORE_NOT_FOUND);
    }

    return store;
  }

  async getStoresByBusiness(businessId: string, userId: string) {
    // Check if user is member of business
    await this.checkStorePermission(businessId, userId, [
      'OWNER',
      'MANAGER',
      'ORDER_STAFF',
      'CONTENT_STAFF',
    ]);

    return this.prisma.store.findMany({
      where: {
        businessId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllStores(filters: {
    status?: StoreStatus;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, search, page = 1, limit = 20 } = filters;

    const where: any = {
      deletedAt: null,
      status: StoreStatus.APPROVED,
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [stores, total] = await Promise.all([
      this.prisma.store.findMany({
        where,
        include: {
          business: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.store.count({ where }),
    ]);

    return {
      data: stores,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==================== UPDATE ====================
  async updateStore(
    id: string,
    userId: string,
    dto: UpdateStoreDto,
  ) {
    const store = await this.prisma.store.findUnique({ where: { id } });
    if (!store) {
      throwNotFound(ErrorCode.STORE_NOT_FOUND);
    }

    await this.checkStorePermission(store!.businessId, userId, ['OWNER', 'MANAGER']);

    return this.prisma.store.update({
      where: { id },
      data: dto,
    });
  }

  // ==================== APPROVAL ====================
  async approveStore(id: string, adminId: string) {
    return this.prisma.store.update({
      where: { id },
      data: {
        status: StoreStatus.APPROVED,
      },
    });
  }

  async rejectStore(id: string, adminId: string) {
    return this.prisma.store.update({
      where: { id },
      data: {
        status: StoreStatus.REJECTED,
      },
    });
  }

  async suspendStore(id: string) {
    return this.prisma.store.update({
      where: { id },
      data: {
        status: StoreStatus.SUSPENDED,
      },
    });
  }

  // ==================== HELPERS ====================
  private async checkStorePermission(
    businessId: string,
    userId: string,
    allowedRoles: string[],
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
