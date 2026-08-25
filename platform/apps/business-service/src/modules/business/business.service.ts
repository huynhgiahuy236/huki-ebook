import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateBusinessDto, UpdateBusinessDto } from './dto/business.dto';
import { BusinessStatus, BusinessType } from '../../../prisma/generated/client';
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
      where: { ownerId: userId },
    });

    if (existingBusiness) {
      throwConflict(ErrorCode.BUSINESS_ALREADY_EXISTS);
    }

    // Check if email already exists
    const emailExists = await this.prisma.business.findUnique({
      where: { email: dto.email },
    });

    if (emailExists) {
      throwConflict(ErrorCode.BUSINESS_ALREADY_EXISTS);
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
  }) {
    const { status, search, page = 1, limit = 20 } = filters;

    const where: any = {
      deletedAt: null,
    };

    if (status) {
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
    return this.prisma.business.update({
      where: { id },
      data: {
        status: BusinessStatus.SUSPENDED,
      },
    });
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
