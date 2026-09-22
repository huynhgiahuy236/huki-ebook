import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateBusinessDto, UpdateBusinessDto } from './dto/business.dto';
import { BusinessStatus, BusinessType, StoreStatus, MemberStatus } from '../../../prisma/generated/client';
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
    let business;
    try {
      business = await this.prisma.business.create({
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
    } catch (err: any) {
      if (err?.code === 'P2002') {
        const target = err?.meta?.target;
        if (Array.isArray(target)) {
          if (target.includes('tax_code') || target.includes('taxCode')) {
            throwConflict(ErrorCode.BUSINESS_TAX_CODE_EXISTS, 'Mã số thuế này đã được đăng ký bởi một đơn vị khác trên hệ thống.');
          }
          if (target.includes('email')) {
            throwConflict(ErrorCode.BUSINESS_ALREADY_EXISTS, 'Email doanh nghiệp này đã được đăng ký trên hệ thống.');
          }
        }
        throwConflict(ErrorCode.BUSINESS_ALREADY_EXISTS, 'Thông tin doanh nghiệp bị trùng lặp với hồ sơ đã có.');
      }
      throw err;
    }

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
            banner: true,
            description: true,
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
      where: { ownerId: userId, deletedAt: null },
      include: {
        stores: {
          where: { deletedAt: null },
        },
        members: {
          where: { deletedAt: null },
        },
      },
    });

    if (business) {
      return {
        ...business,
        currentMember: {
          role: 'OWNER',
          permissions: ['*'],
        },
      };
    }

    // Check if user is an active member of a business
    const memberRecord = await this.prisma.member.findFirst({
      where: { userId, status: MemberStatus.ACTIVE, deletedAt: null },
      include: {
        business: {
          include: {
            stores: {
              where: { deletedAt: null },
            },
            members: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });

    if (memberRecord?.business) {
      return {
        ...memberRecord.business,
        currentMember: {
          id: memberRecord.id,
          role: memberRecord.role,
          permissions: memberRecord.permissions,
        },
      };
    }

    return null;
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
        const identityDbUrl =
          process.env.IDENTITY_DATABASE_URL ||
          process.env.DATABASE_URL?.replace(/\/[^\/]+$/, '/huki_identity') ||
          'postgresql://postgres:postgres123@localhost:5432/huki_identity';
        const pgClient = new Client({ connectionString: identityDbUrl });
        await pgClient.connect();
        await pgClient.query('UPDATE users SET role = $1 WHERE id = $2', ['BUSINESS', business.ownerId]);
        await pgClient.end();
        console.log(`[business.service] Successfully updated user ${business.ownerId} role to BUSINESS in identity database`);
      } catch (err: any) {
        console.error('[business.service] Warning: Failed to sync user role to identity database:', err?.message || err);
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

  async getMyFollowedBusinesses(userId: string) {
    const records = await (this.prisma as any).businessFollower.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        business: {
          include: {
            stores: {
              where: { deletedAt: null },
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
                logo: true,
                banner: true,
                description: true,
              },
            },
          },
        },
      },
    });
    return records.map((r: any) => ({
      followerId: r.id,
      followedAt: r.createdAt,
      business: r.business,
    }));
  }

  private getIdentityDbClient() {
    const { Client } = require('pg');
    const identityDbUrl =
      process.env.IDENTITY_DATABASE_URL ||
      process.env.DATABASE_URL?.replace(/\/[^\/]+$/, '/huki_identity') ||
      'postgresql://postgres:postgres123@localhost:5432/huki_identity';
    return new Client({ connectionString: identityDbUrl });
  }

  async getBusinessFollowers(businessId: string, page = 1, limit = 10, search = '') {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Math.min(100, Number(limit) || 10));

    // 1. Fetch all follower records for this business
    const allFollowers = await (this.prisma as any).businessFollower.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });

    if (!allFollowers || allFollowers.length === 0) {
      return {
        items: [],
        total: 0,
        page: pageNum,
        limit: limitNum,
        totalPages: 0,
      };
    }

    const userIds = allFollowers.map((f: any) => f.userId);

    // 2. Fetch user details from identity_db
    const userMap: Record<string, any> = {};
    try {
      const pgClient = this.getIdentityDbClient();
      await pgClient.connect();
      const res = await pgClient.query(
        'SELECT id, full_name, email, phone, avatar, status FROM users WHERE id = ANY($1)',
        [userIds],
      );
      await pgClient.end();

      for (const row of res.rows) {
        userMap[row.id] = {
          fullName: row.full_name,
          email: row.email,
          phone: row.phone,
          avatar: row.avatar,
          status: row.status || 'ACTIVE',
        };
      }
    } catch (err: any) {
      console.warn(
        '[BusinessService] Failed to load user details from identity DB for followers:',
        err?.message || err,
      );
    }

    // 3. Map follower items
    let mappedItems = allFollowers.map((f: any) => {
      const u = userMap[f.userId] || {
        fullName: 'Khách Hàng',
        email: '',
        phone: null,
        avatar: null,
        status: 'ACTIVE',
      };
      // Customer code: short readable ID (e.g. KH-8F4A12)
      const cleanId = (f.userId || f.id || '').replace(/-/g, '').toUpperCase();
      const customerCode = `KH-${cleanId.slice(0, 6)}`;

      return {
        id: f.id,
        userId: f.userId,
        customerCode,
        fullName: u.fullName || 'Khách Hàng',
        email: u.email,
        phone: u.phone,
        avatar: u.avatar,
        status: u.status || 'ACTIVE',
        createdAt: f.createdAt,
      };
    });

    // 4. Search filter (if provided)
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      mappedItems = mappedItems.filter((item: any) =>
        item.fullName?.toLowerCase().includes(q) ||
        item.phone?.toLowerCase().includes(q) ||
        item.customerCode?.toLowerCase().includes(q) ||
        item.email?.toLowerCase().includes(q),
      );
    }

    const total = mappedItems.length;
    const totalPages = Math.ceil(total / limitNum) || 1;
    const offset = (pageNum - 1) * limitNum;
    const items = mappedItems.slice(offset, offset + limitNum);

    return {
      items,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
    };
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

  // ==================== BUSINESS PROFILE UPDATE REQUESTS ====================
  async createUpdateRequest(userId: string, requestedData: any) {
    const business = await this.prisma.business.findFirst({
      where: { ownerId: userId, deletedAt: null },
      include: { stores: { where: { deletedAt: null } } },
    });

    if (!business) {
      throwNotFound(ErrorCode.BUSINESS_NOT_FOUND, 'Bạn chưa có doanh nghiệp nào trên hệ thống.');
      return;
    }

    // Rate Limit: 1 request every 2 minutes (120 seconds)
    const latestRequest = await (this.prisma as any).businessUpdateRequest.findFirst({
      where: { businessId: business.id },
      orderBy: { createdAt: 'desc' },
    });

    if (latestRequest) {
      const now = Date.now();
      const lastCreatedTime = new Date(latestRequest.createdAt).getTime();
      const diffSeconds = Math.floor((now - lastCreatedTime) / 1000);
      const COOLDOWN_SECONDS = 120;

      if (diffSeconds < COOLDOWN_SECONDS) {
        const remaining = COOLDOWN_SECONDS - diffSeconds;
        throwBadRequest(
          ErrorCode.BUSINESS_NOT_APPROVED,
          `Mỗi doanh nghiệp chỉ có thể gửi yêu cầu cập nhật sau mỗi 2 phút. Vui lòng chờ ${remaining} giây nữa.`,
        );
      }
    }

    const updateRequest = await (this.prisma as any).businessUpdateRequest.create({
      data: {
        businessId: business.id,
        requestedBy: userId,
        requestedData: requestedData || {},
        status: 'PENDING',
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            taxCode: true,
          },
        },
      },
    });

    return updateRequest;
  }

  async getMyUpdateRequests(userId: string) {
    const business = await this.prisma.business.findFirst({
      where: { ownerId: userId, deletedAt: null },
    });

    if (!business) {
      return { data: [], latest: null, cooldownRemaining: 0 };
    }

    const requests = await (this.prisma as any).businessUpdateRequest.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: 'desc' },
    });

    let cooldownRemaining = 0;
    if (requests.length > 0) {
      const lastCreatedTime = new Date(requests[0].createdAt).getTime();
      const diffSeconds = Math.floor((Date.now() - lastCreatedTime) / 1000);
      if (diffSeconds < 120) {
        cooldownRemaining = 120 - diffSeconds;
      }
    }

    return {
      data: requests,
      latest: requests[0] || null,
      cooldownRemaining,
    };
  }

  async getAllUpdateRequestsForAdmin(status?: string, page = 1, limit = 50) {
    const where: any = {};
    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      where.status = status;
    }

    const [requests, total] = await Promise.all([
      (this.prisma as any).businessUpdateRequest.findMany({
        where,
        include: {
          business: {
            include: {
              stores: {
                where: { deletedAt: null },
              },
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).businessUpdateRequest.count({ where }),
    ]);

    return {
      data: requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUpdateRequestById(id: string) {
    const request = await (this.prisma as any).businessUpdateRequest.findUnique({
      where: { id },
      include: {
        business: {
          include: {
            stores: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });

    if (!request) {
      throwNotFound(ErrorCode.BUSINESS_NOT_FOUND, 'Không tìm thấy yêu cầu cập nhật.');
    }

    return request;
  }

  async approveUpdateRequest(id: string, adminId: string) {
    const request = await (this.prisma as any).businessUpdateRequest.findUnique({
      where: { id },
      include: { business: { include: { stores: true } } },
    });

    if (!request) {
      throwNotFound(ErrorCode.BUSINESS_NOT_FOUND, 'Không tìm thấy yêu cầu cập nhật.');
      return;
    }

    if (request.status !== 'PENDING') {
      throwBadRequest(ErrorCode.BUSINESS_NOT_APPROVED, 'Yêu cầu này đã được xử lý trước đó.');
    }

    const data = request.requestedData || {};

    // 1. Cập nhật bảng Business
    const businessUpdateData: any = {};
    if (data.name) businessUpdateData.name = data.name;
    if (data.phone) businessUpdateData.phone = data.phone;
    if (data.email) businessUpdateData.email = data.email;
    if (data.taxCode) businessUpdateData.taxCode = data.taxCode;
    if (data.businessType) businessUpdateData.businessType = data.businessType;

    // Address / Headquarters: lưu mảng các trụ sở dưới dạng JSON hoặc string
    if (data.headquarters && Array.isArray(data.headquarters)) {
      businessUpdateData.address = JSON.stringify(data.headquarters);
    } else if (data.address) {
      businessUpdateData.address = data.address;
    }

    await this.prisma.business.update({
      where: { id: request.businessId },
      data: businessUpdateData,
    });

    // 2. Cập nhật Store (nếu có store tương ứng)
    const primaryStore = request.business?.stores?.[0];
    if (primaryStore) {
      const storeUpdateData: any = {};
      if (data.storeName || data.name) storeUpdateData.name = data.storeName || data.name;
      if (data.description || data.storeDescription) storeUpdateData.description = data.description || data.storeDescription;
      if (data.logo || data.storeLogo) storeUpdateData.logo = data.logo || data.storeLogo;
      if (data.banner || data.storeBanner) storeUpdateData.banner = data.banner || data.storeBanner;
      if (data.email || data.storeEmail) storeUpdateData.email = data.email || data.storeEmail;
      if (data.phone || data.storePhone) storeUpdateData.phone = data.phone || data.storePhone;
      if (data.storeAddress || data.address) storeUpdateData.address = data.storeAddress || data.address;

      await this.prisma.store.update({
        where: { id: primaryStore.id },
        data: storeUpdateData,
      });
    }

    // 3. Đổi trạng thái request sang APPROVED
    const updatedRequest = await (this.prisma as any).businessUpdateRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });

    return {
      message: 'Đã phê duyệt và cập nhật thông tin doanh nghiệp thành công',
      data: updatedRequest,
    };
  }

  async rejectUpdateRequest(id: string, adminId: string, reason: string) {
    const request = await (this.prisma as any).businessUpdateRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throwNotFound(ErrorCode.BUSINESS_NOT_FOUND, 'Không tìm thấy yêu cầu cập nhật.');
      return;
    }

    if (request.status !== 'PENDING') {
      throwBadRequest(ErrorCode.BUSINESS_NOT_APPROVED, 'Yêu cầu này đã được xử lý trước đó.');
    }

    const updatedRequest = await (this.prisma as any).businessUpdateRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: reason || 'Thông tin chưa đạt yêu cầu của ban quản trị sàn.',
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });

    return {
      message: 'Đã từ chối yêu cầu cập nhật thông tin',
      data: updatedRequest,
    };
  }
}
