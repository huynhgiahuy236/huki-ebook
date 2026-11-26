import { Injectable, Optional } from '@nestjs/common';
import { createHash, createHmac, randomInt, randomUUID, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateBusinessDto, UpdateBusinessDto } from './dto/business.dto';
import { BusinessStatus, BusinessType, StoreStatus, MemberStatus } from '../../../prisma/generated/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { throwConflict, throwNotFound, throwBadRequest, throwForbidden } from '@huki/shared/errors';
import { ErrorCode } from '@huki/shared/errors';
import { BUSINESS_EVENTS } from '@huki/shared/events';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditActorContext, EmailService } from '@huki/shared';
import { IdentityClientService } from '../identity/identity-client.service';
import { BusinessOutboxService } from '../outbox/outbox.service';

@Injectable()
export class BusinessService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private readonly identity: IdentityClientService,
    private auditService?: AuditService,
    @Optional() private readonly outboxService?: BusinessOutboxService,
    @Optional() private readonly emailService?: EmailService,
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
          bankName: (dto.bank_name || dto.bankName)?.trim() || null,
          bankAccountNumber: (dto.account_number || dto.bankAccountNumber)?.trim() || null,
          bankAccountHolderName: (dto.account_holder_name || dto.bankAccountHolderName || dto.name)?.trim() || null,
          bankBranch: (dto.bank_branch || dto.bankBranch)?.trim() || null,
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
    const storefrontName = (dto.store_name?.trim() || dto.storeName?.trim() || dto.name).trim();
    const normalizedSlug = storefrontName
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
        name: storefrontName,
        slug,
        description: dto.store_name?.trim() 
          ? `Gian hàng chính hãng ${storefrontName} của ${dto.name}` 
          : `Gian hàng chính hãng phân phối sách của ${dto.name}`,
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

  // ==================== HELPER: SANITIZE & FLATTEN STORE ASSETS ====================
  private sanitizeAssetUrl(url?: string | null): string | null {
    if (!url || typeof url !== 'string') return null;
    const trimmed = url.trim();
    if (!trimmed || trimmed.toLowerCase().startsWith('blob:')) return null;
    return trimmed;
  }

  private withFlattenedStoreAssets<T extends Record<string, any>>(
    business: T,
  ): T & { logo?: string | null; banner?: string | null } {
    if (!business) return business;
    const result: Record<string, any> = { ...business };
    if (Array.isArray(business.stores)) {
      result.stores = business.stores.map((s: any) => ({
        ...s,
        ...(s.logo !== undefined ? { logo: this.sanitizeAssetUrl(s.logo) } : {}),
        ...(s.banner !== undefined ? { banner: this.sanitizeAssetUrl(s.banner) } : {}),
      }));
    }
    const primaryStore = Array.isArray(result.stores) ? result.stores[0] : undefined;
    const flattenedLogo = this.sanitizeAssetUrl(result.logo) || primaryStore?.logo || null;
    const flattenedBanner = this.sanitizeAssetUrl(result.banner) || primaryStore?.banner || null;
    if ('logo' in result || primaryStore) {
      result.logo = flattenedLogo;
    }
    if ('banner' in result || primaryStore) {
      result.banner = flattenedBanner;
    }
    return result as T;
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

    const latestApprovedRequest = (this.prisma as any).businessUpdateRequest?.findFirst
      ? await (this.prisma as any).businessUpdateRequest.findFirst({
          where: { businessId: business.id, status: 'APPROVED' },
          orderBy: { reviewedAt: 'desc' },
        })
      : null;
    const extData = (latestApprovedRequest?.requestedData as Record<string, any>) || {};

    return this.withFlattenedStoreAssets({
      ...business,
      ...extData,
    });
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
      const latestApprovedRequest = (this.prisma as any).businessUpdateRequest?.findFirst
        ? await (this.prisma as any).businessUpdateRequest.findFirst({
            where: { businessId: business.id, status: 'APPROVED' },
            orderBy: { reviewedAt: 'desc' },
          })
        : null;
      const extData = (latestApprovedRequest?.requestedData as Record<string, any>) || {};

      return this.withFlattenedStoreAssets({
        ...business,
        ...extData,
        currentMember: {
          role: 'OWNER',
          permissions: ['*'],
        },
      });
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
            select: { id: true, name: true, slug: true, logo: true, banner: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.business.count({ where }),
    ]);

    return {
      data: businesses.map((b) => this.withFlattenedStoreAssets(b)),
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
  async approveBusiness(id: string, adminId: string, actorContext?: Partial<AuditActorContext>) {
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
        await this.identity.setBusinessRole(business.ownerId);
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

    // Record Audit Log
    await this.auditService?.record({
      actor: {
        actorId: adminId,
        actorRole: actorContext?.actorRole || 'PLATFORM_ADMIN',
        requestId: actorContext?.requestId,
        ip: actorContext?.ip,
        userAgent: actorContext?.userAgent,
      },
      module: 'BUSINESS',
      action: registryVerified ? AuditAction.APPROVE : AuditAction.REJECT,
      resource: 'Business',
      resourceId: id,
      storeId: business.id,
      beforeState: { status: business.status, name: business.name, taxCode: business.taxCode },
      afterState: { status: updatedBusiness.status, name: updatedBusiness.name, taxCode: updatedBusiness.taxCode },
      changedFields: ['status'],
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

  async rejectBusiness(id: string, adminId: string, reason: string, actorContext?: Partial<AuditActorContext>) {
    const beforeBusiness = await this.prisma.business.findUnique({ where: { id } });

    await this.prisma.store.updateMany({
      where: { businessId: id },
      data: {
        status: StoreStatus.REJECTED,
        isActive: false,
      },
    });

    const updatedBusiness = await this.prisma.business.update({
      where: { id },
      data: {
        status: BusinessStatus.REJECTED,
        rejectedAt: new Date(),
        rejectedBy: adminId,
        rejectionReason: reason,
      },
    });

    // Record Audit Log
    await this.auditService?.record({
      actor: {
        actorId: adminId,
        actorRole: actorContext?.actorRole || 'PLATFORM_ADMIN',
        requestId: actorContext?.requestId,
        ip: actorContext?.ip,
        userAgent: actorContext?.userAgent,
      },
      module: 'BUSINESS',
      action: AuditAction.REJECT,
      resource: 'Business',
      resourceId: id,
      storeId: id,
      beforeState: beforeBusiness ? { status: beforeBusiness.status, rejectionReason: beforeBusiness.rejectionReason } : null,
      afterState: { status: updatedBusiness.status, rejectionReason: updatedBusiness.rejectionReason },
      changedFields: ['status', 'rejectionReason'],
    });

    return updatedBusiness;
  }

  async suspendBusiness(id: string, adminId?: string, actorContext?: Partial<AuditActorContext>) {
    const beforeBusiness = await this.prisma.business.findUnique({ where: { id } });

    await this.prisma.store.updateMany({
      where: { businessId: id },
      data: {
        status: StoreStatus.SUSPENDED,
        isActive: false,
      },
    });

    const updatedBusiness = await this.prisma.business.update({
      where: { id },
      data: {
        status: BusinessStatus.SUSPENDED,
      },
    });

    // Record Audit Log
    await this.auditService?.record({
      actor: {
        actorId: adminId || actorContext?.actorId || 'SYSTEM',
        actorRole: actorContext?.actorRole || 'PLATFORM_ADMIN',
        requestId: actorContext?.requestId,
        ip: actorContext?.ip,
        userAgent: actorContext?.userAgent,
      },
      module: 'BUSINESS',
      action: AuditAction.SUSPEND,
      resource: 'Business',
      resourceId: id,
      storeId: id,
      beforeState: beforeBusiness ? { status: beforeBusiness.status } : null,
      afterState: { status: updatedBusiness.status },
      changedFields: ['status'],
    });

    return updatedBusiness;
  }

  // ==================== FOLLOW / UNFOLLOW ====================
  async followBusiness(userId: string, businessId: string) {
    let targetBizId = businessId;
    let business = await this.prisma.business.findUnique({
      where: { id: targetBizId },
    });
    if (!business) {
      // Check if businessId is actually a storeId
      const store = await this.prisma.store.findUnique({
        where: { id: businessId },
      });
      if (store?.businessId) {
        targetBizId = store.businessId;
        business = await this.prisma.business.findUnique({
          where: { id: targetBizId },
        });
      }
    }
    if (!business) {
      throwNotFound(ErrorCode.BUSINESS_NOT_FOUND, 'Không tìm thấy nhà xuất bản/doanh nghiệp');
    }

    const follower = await (this.prisma as any).businessFollower.upsert({
      where: {
        businessId_userId: {
          businessId: targetBizId,
          userId,
        },
      },
      create: {
        businessId: targetBizId,
        userId,
      },
      update: {},
    });

    const totalFollowers = await (this.prisma as any).businessFollower.count({
      where: { businessId: targetBizId },
    });

    return {
      followed: true,
      businessId: targetBizId,
      totalFollowers,
      follower,
    };
  }

  async unfollowBusiness(userId: string, businessId: string) {
    let targetBizId = businessId;
    let business = await this.prisma.business.findUnique({
      where: { id: targetBizId },
    });
    if (!business) {
      const store = await this.prisma.store.findUnique({
        where: { id: businessId },
      });
      if (store?.businessId) {
        targetBizId = store.businessId;
      }
    }
    try {
      await (this.prisma as any).businessFollower.delete({
        where: {
          businessId_userId: {
            businessId: targetBizId,
            userId,
          },
        },
      });
    } catch {
      // Ignored if not found
    }

    const totalFollowers = await (this.prisma as any).businessFollower.count({
      where: { businessId: targetBizId },
    });

    return {
      followed: false,
      businessId: targetBizId,
      totalFollowers,
    };
  }

  async getMyFollowedBusinessIds(userId: string): Promise<string[]> {
    const records = await (this.prisma as any).businessFollower.findMany({
      where: { userId },
      select: { businessId: true },
    });
    const businessIds = records.map((r: { businessId: string }) => r.businessId);
    if (businessIds.length === 0) return [];
    const stores = await this.prisma.store.findMany({
      where: { businessId: { in: businessIds }, deletedAt: null },
      select: { id: true, slug: true },
    });
    const allIds = new Set<string>(businessIds);
    stores.forEach((s) => {
      if (s.id) allIds.add(s.id);
      if (s.slug) allIds.add(s.slug);
    });
    return Array.from(allIds);
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
      const profiles = await this.identity.getProfiles(userIds);
      for (const row of profiles) {
        userMap[row.id] = {
          fullName: row.fullName,
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
  private otpSecret(): string {
    return (
      process.env.BUSINESS_OTP_SECRET ||
      process.env.JWT_SECRET ||
      'huki-business-update-otp-secret-v1'
    );
  }

  private hashOtpCode(nonce: string, otpCode: string, businessId: string, userId: string): string {
    return createHash('sha256')
      .update(`${nonce}:${otpCode}:${businessId}:${userId}:${this.otpSecret()}`)
      .digest('hex');
  }

  private signOtpToken(payload: {
    nonce: string;
    codeHash: string;
    businessId: string;
    userId: string;
    email: string;
    exp: number;
  }): string {
    const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const sig = createHmac('sha256', this.otpSecret()).update(encoded).digest('base64url');
    return `${encoded}.${sig}`;
  }

  private verifyOtpTokenSignature(token: string): {
    nonce: string;
    codeHash: string;
    businessId: string;
    userId: string;
    email: string;
    exp: number;
  } | null {
    if (!token || typeof token !== 'string' || !token.includes('.')) return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [encoded, sig] = parts;
    const expectedSig = createHmac('sha256', this.otpSecret()).update(encoded).digest('base64url');
    const a = Buffer.from(sig, 'utf8');
    const b = Buffer.from(expectedSig, 'utf8');
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    try {
      const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
      if (!parsed?.nonce || !parsed?.codeHash || !parsed?.businessId || !parsed?.userId || !parsed?.exp) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private maskEmailAddress(email: string): string {
    const trimmed = String(email || '').trim();
    const atIdx = trimmed.indexOf('@');
    if (atIdx <= 1) return trimmed;
    const local = trimmed.slice(0, atIdx);
    const domain = trimmed.slice(atIdx);
    const visible = local.slice(0, Math.min(2, local.length));
    return `${visible}${'*'.repeat(Math.max(2, local.length - visible.length))}${domain}`;
  }

  private parseHeadquartersList(address: unknown): string[] {
    if (!address) return [];
    if (Array.isArray(address)) return address.map((x) => String(x || '').trim()).filter(Boolean);
    if (typeof address === 'string') {
      const trimmed = address.trim();
      if (!trimmed) return [];
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.map((x) => String(x || '').trim()).filter(Boolean);
      } catch {
        // plain string address
      }
      return [trimmed];
    }
    return [String(address)];
  }

  private buildBusinessSnapshot(business: any, approvedExt: Record<string, any> = {}, ownerName?: string) {
    const primaryStore = Array.isArray(business?.stores) && business.stores.length > 0 ? business.stores[0] : null;
    const hq = this.parseHeadquartersList(
      approvedExt?.headquarters && Array.isArray(approvedExt.headquarters) && approvedExt.headquarters.length > 0
        ? approvedExt.headquarters
        : business?.address,
    );
    const isIndividual = (approvedExt?.businessType || business?.businessType) === 'INDIVIDUAL';
    return {
      name: business?.name || approvedExt?.name || '',
      taxCode: business?.taxCode || approvedExt?.taxCode || '',
      businessType: business?.businessType || approvedExt?.businessType || 'INDIVIDUAL',
      email: business?.email || approvedExt?.email || '',
      phone: business?.phone || approvedExt?.phone || '',
      headquarters: hq,
      address: hq.join(' | '),
      internationalName: approvedExt?.internationalName || '',
      shortName: approvedExt?.shortName || '',
      businessLicenseNumber: approvedExt?.businessLicenseNumber || approvedExt?.registryNumber || business?.registryNumber || '',
      issueDate: approvedExt?.issueDate || '',
      issuePlace: approvedExt?.issuePlace || '',
      ecommerceIndustryCodes: approvedExt?.ecommerceIndustryCodes || '',
      website: approvedExt?.website || '',
      repName: approvedExt?.repName || ownerName || '',
      repPosition: approvedExt?.repPosition || (isIndividual ? 'Chủ hộ kinh doanh' : 'Người đại diện'),
      repIdCardNumber: approvedExt?.repIdCardNumber || '',
      repIdCardIssueDate: approvedExt?.repIdCardIssueDate || '',
      repIdCardIssuePlace: approvedExt?.repIdCardIssuePlace || '',
      operatorName: approvedExt?.operatorName || ownerName || '',
      operatorPhone: approvedExt?.operatorPhone || business?.phone || '',
      operatorEmail: approvedExt?.operatorEmail || business?.email || '',
      bankName: business?.bankName || approvedExt?.bankName || '',
      bankAccountNumber: business?.bankAccountNumber || approvedExt?.bankAccountNumber || '',
      bankAccountHolderName: business?.bankAccountHolderName || approvedExt?.bankAccountHolderName || '',
      bankBranch: business?.bankBranch || approvedExt?.bankBranch || '',
      storeName: primaryStore?.name || approvedExt?.storeName || business?.name || '',
      storeDescription: primaryStore?.description || approvedExt?.storeDescription || '',
    };
  }

  private computeSnapshotChangedLabels(beforeSnap: Record<string, any>, afterData: Record<string, any>): string[] {
    const fieldLabels: Array<[string, string]> = [
      ['name', 'Tên pháp nhân'],
      ['taxCode', 'Mã số thuế'],
      ['businessType', 'Loại hình'],
      ['phone', 'Hotline'],
      ['email', 'Email nhận thông báo'],
      ['headquarters', 'Trụ sở & Chi nhánh'],
      ['businessLicenseNumber', 'Số giấy phép ĐKKD'],
      ['repName', 'Người đại diện / Chủ hộ'],
      ['repPosition', 'Chức danh'],
      ['repIdCardNumber', 'Số CCCD'],
      ['operatorName', 'Người vận hành'],
      ['operatorPhone', 'SĐT vận hành'],
      ['operatorEmail', 'Email vận hành'],
      ['bankName', 'Ngân hàng KYC'],
      ['bankAccountNumber', 'Số tài khoản'],
      ['bankAccountHolderName', 'Chủ tài khoản'],
      ['storeName', 'Tên gian hàng'],
      ['storeDescription', 'Mô tả gian hàng'],
    ];
    const changed: string[] = [];
    for (const [key, label] of fieldLabels) {
      if (afterData[key] === undefined) continue;
      const beforeVal = key === 'headquarters'
        ? this.parseHeadquartersList(beforeSnap[key]).join(' | ')
        : String(beforeSnap[key] ?? '').trim();
      const afterVal = key === 'headquarters'
        ? this.parseHeadquartersList(afterData[key]).join(' | ')
        : String(afterData[key] ?? '').trim();
      if (beforeVal !== afterVal) {
        changed.push(label);
      }
    }
    return changed;
  }

  private async resolveBusinessForOwnerOrMember(userId: string) {
    let business = await this.prisma.business.findFirst({
      where: { ownerId: userId, deletedAt: null },
      include: { stores: { where: { deletedAt: null } } },
    });
    if (!business) {
      const member = await (this.prisma as any).member?.findFirst?.({
        where: { userId, status: 'ACTIVE', role: { in: ['OWNER', 'MANAGER'] }, deletedAt: null },
        include: { business: { include: { stores: { where: { deletedAt: null } } } } },
      });
      if (member?.business && !member.business.deletedAt) {
        business = member.business;
      }
    }
    return business;
  }

  async sendUpdateRequestOtp(userId: string, actorEmail?: string) {
    const business = await this.resolveBusinessForOwnerOrMember(userId);
    if (!business) {
      return throwNotFound(ErrorCode.BUSINESS_NOT_FOUND, 'Bạn chưa có doanh nghiệp nào trên hệ thống.');
    }

    // Check 120s submission cooldown before sending new OTP
    const latestRequest = await (this.prisma as any).businessUpdateRequest?.findFirst?.({
      where: { businessId: business.id },
      orderBy: { createdAt: 'desc' },
    });
    if (latestRequest) {
      const diffSeconds = Math.floor((Date.now() - new Date(latestRequest.createdAt).getTime()) / 1000);
      if (diffSeconds < 120) {
        const remaining = 120 - diffSeconds;
        throwBadRequest(
          ErrorCode.BUSINESS_NOT_APPROVED,
          `Mỗi doanh nghiệp chỉ có thể gửi yêu cầu cập nhật sau mỗi 2 phút. Vui lòng chờ ${remaining} giây nữa.`,
        );
      }
    }

    // Check 60s OTP resend cooldown via auditLog if available
    const resendWindowStart = new Date(Date.now() - 60 * 1000);
    const recentOtpLog = await (this.prisma as any).auditLog?.findFirst?.({
      where: {
        actorId: userId,
        resource: 'BusinessUpdateOtp',
        action: 'UPDATE_REQUEST_OTP_SENT',
        resourceId: business.id,
        createdAt: { gte: resendWindowStart },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (recentOtpLog) {
      const waitSeconds = Math.max(
        1,
        60 - Math.floor((Date.now() - new Date(recentOtpLog.createdAt).getTime()) / 1000),
      );
      throwBadRequest(
        ErrorCode.BUSINESS_NOT_APPROVED,
        `Vui lòng chờ ${waitSeconds} giây trước khi yêu cầu gửi lại mã OTP mới.`,
      );
    }

    const targetEmail = String(business.email || actorEmail || '').trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      throwBadRequest(
        ErrorCode.VALIDATION_ERROR,
        'Không tìm thấy email hợp lệ của chủ gian hàng để gửi mã OTP xác thực.',
      );
    }

    const otpCode = String(randomInt(100000, 1000000));
    const nonce = randomUUID();
    const exp = Date.now() + 10 * 60 * 1000;
    const codeHash = this.hashOtpCode(nonce, otpCode, business.id, userId);
    const otpToken = this.signOtpToken({
      nonce,
      codeHash,
      businessId: business.id,
      userId,
      email: targetEmail,
      exp,
    });

    if (this.emailService) {
      await this.emailService.sendBusinessUpdateOtpEmail(targetEmail, otpCode, business.name);
    }

    await (this.prisma as any).auditLog?.create?.({
      data: {
        actorId: userId,
        actorRole: 'BUSINESS',
        service: 'business-service',
        module: 'business',
        action: 'UPDATE_REQUEST_OTP_SENT',
        resource: 'BusinessUpdateOtp',
        resourceId: business.id,
        storeId: business.id,
        metadata: {
          nonce,
          targetEmail: this.maskEmailAddress(targetEmail),
          expiresAt: new Date(exp).toISOString(),
        },
      },
    }).catch(() => null);

    return {
      otpToken,
      maskedEmail: this.maskEmailAddress(targetEmail),
      expiresInSeconds: 600,
      resendCooldownSeconds: 60,
    };
  }

  async createUpdateRequest(userId: string, rawBody: any) {
    const business = await this.resolveBusinessForOwnerOrMember(userId);

    if (!business) {
      throwNotFound(ErrorCode.BUSINESS_NOT_FOUND, 'Bạn chưa có doanh nghiệp nào trên hệ thống.');
      return;
    }

    const { otpCode, otpToken, _previousSnapshot: _ignoredSnap, ...cleanRequestedData } = rawBody || {};
    const trimmedCode = String(otpCode || '').trim();
    if (!/^\d{6}$/.test(trimmedCode) || !otpToken) {
      throwBadRequest(
        ErrorCode.VALIDATION_ERROR,
        'Vui lòng nhập đầy đủ mã OTP 6 chữ số được gửi về email của bạn để xác thực thay đổi.',
      );
    }

    const decodedToken = this.verifyOtpTokenSignature(String(otpToken));
    if (!decodedToken) {
      throwBadRequest(
        ErrorCode.VALIDATION_ERROR,
        'Phiên xác thực OTP không hợp lệ. Vui lòng yêu cầu gửi lại mã OTP.',
      );
    }
    if (Date.now() > decodedToken!.exp) {
      throwBadRequest(
        ErrorCode.VALIDATION_ERROR,
        'Mã OTP đã hết hạn (quá 10 phút). Vui lòng bấm gửi lại mã OTP mới.',
      );
    }
    if (decodedToken!.businessId !== business.id || decodedToken!.userId !== userId) {
      throwForbidden(
        ErrorCode.AUTHZ_FORBIDDEN,
        'Mã OTP không thuộc về tài khoản hoặc gian hàng hiện tại.',
      );
    }

    const candidateHash = this.hashOtpCode(decodedToken!.nonce, trimmedCode, business.id, userId);
    const hashBufA = Buffer.from(candidateHash, 'utf8');
    const hashBufB = Buffer.from(decodedToken!.codeHash, 'utf8');
    if (hashBufA.length !== hashBufB.length || !timingSafeEqual(hashBufA, hashBufB)) {
      throwBadRequest(
        ErrorCode.VALIDATION_ERROR,
        'Mã OTP 6 chữ số không chính xác. Vui lòng kiểm tra lại hộp thư.',
      );
    }

    // Single-use replay protection
    const usedKey = `${business.id}:${decodedToken!.nonce}`;
    const alreadyUsed = await (this.prisma as any).auditLog?.findFirst?.({
      where: {
        resource: 'BusinessUpdateOtp',
        action: 'UPDATE_REQUEST_OTP_USED',
        resourceId: usedKey,
      },
    });
    if (alreadyUsed) {
      throwBadRequest(
        ErrorCode.VALIDATION_ERROR,
        'Mã OTP này đã được sử dụng. Vui lòng yêu cầu mã OTP mới.',
      );
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

    // Capture full BEFORE snapshot so Admin sees accurate line-by-line diff
    const latestApproved = await (this.prisma as any).businessUpdateRequest?.findFirst?.({
      where: { businessId: business.id, status: 'APPROVED' },
      orderBy: { reviewedAt: 'desc' },
    });
    let ownerProfileName = '';
    try {
      const profiles = await this.identity?.getProfiles?.([business.ownerId]);
      if (Array.isArray(profiles) && profiles[0]?.fullName) {
        ownerProfileName = String(profiles[0].fullName);
      }
    } catch {
      // optional identity lookup
    }
    const previousSnapshot = this.buildBusinessSnapshot(
      business,
      (latestApproved?.requestedData as Record<string, any>) || {},
      ownerProfileName,
    );
    const changedFields = this.computeSnapshotChangedLabels(previousSnapshot, cleanRequestedData);

    // Mark OTP nonce consumed
    await (this.prisma as any).auditLog?.create?.({
      data: {
        actorId: userId,
        actorRole: 'BUSINESS',
        service: 'business-service',
        module: 'business',
        action: 'UPDATE_REQUEST_OTP_USED',
        resource: 'BusinessUpdateOtp',
        resourceId: usedKey,
        storeId: business.id,
        metadata: { email: decodedToken!.email },
      },
    }).catch(() => null);

    const updateRequest = await (this.prisma as any).businessUpdateRequest.create({
      data: {
        businessId: business.id,
        requestedBy: userId,
        requestedData: {
          ...(cleanRequestedData || {}),
          _previousSnapshot: previousSnapshot,
        },
        status: 'PENDING',
      },
      include: {
        business: {
          include: {
            stores: { where: { deletedAt: null } },
          },
        },
      },
    });

    await this.outboxService?.addToOutbox('business.update_requested', updateRequest.id, {
      eventType: 'business.update_requested',
      requestId: updateRequest.id,
      businessId: business.id,
      businessName: business.name,
      ownerId: business.ownerId,
      requestedBy: userId,
      changedFields,
      createdAt: updateRequest.createdAt,
    }).catch(() => null);

    return {
      ...updateRequest,
      currentSnapshot: previousSnapshot,
      changedFields,
    };
  }

  private async hydrateUpdateRequestSnapshot(req: any) {
    if (!req) return req;
    const rawRequested = (req.requestedData && typeof req.requestedData === 'object') ? { ...req.requestedData } : {};
    const savedSnapshot = rawRequested._previousSnapshot;
    delete rawRequested._previousSnapshot;

    let currentSnapshot = savedSnapshot;
    if (!currentSnapshot && req.business) {
      const priorApproved = await (this.prisma as any).businessUpdateRequest?.findFirst?.({
        where: {
          businessId: req.businessId,
          status: 'APPROVED',
          id: { not: req.id },
          ...(req.createdAt ? { reviewedAt: { lte: new Date(req.createdAt) } } : {}),
        },
        orderBy: { reviewedAt: 'desc' },
      });
      let ownerName = '';
      try {
        if (req.business?.ownerId) {
          const profiles = await this.identity?.getProfiles?.([req.business.ownerId]);
          if (Array.isArray(profiles) && profiles[0]?.fullName) {
            ownerName = String(profiles[0].fullName);
          }
        }
      } catch {
        // ignore identity fallback
      }
      currentSnapshot = this.buildBusinessSnapshot(
        req.business,
        (priorApproved?.requestedData as Record<string, any>) || {},
        ownerName,
      );
    }

    return {
      ...req,
      requestedData: rawRequested,
      currentSnapshot: currentSnapshot || this.buildBusinessSnapshot(req.business || {}, {}),
    };
  }

  async getMyUpdateRequests(userId: string) {
    const business = await this.resolveBusinessForOwnerOrMember(userId);

    if (!business) {
      return { data: [], latest: null, cooldownRemaining: 0 };
    }

    const requests = await (this.prisma as any).businessUpdateRequest.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: 'desc' },
    });

    const sanitized = requests.map((r: any) => {
      const { _previousSnapshot, ...cleanReqData } = (r.requestedData || {}) as Record<string, any>;
      return {
        ...r,
        requestedData: cleanReqData,
        currentSnapshot: _previousSnapshot || undefined,
      };
    });

    let cooldownRemaining = 0;
    if (sanitized.length > 0) {
      const lastCreatedTime = new Date(sanitized[0].createdAt).getTime();
      const diffSeconds = Math.floor((Date.now() - lastCreatedTime) / 1000);
      if (diffSeconds < 120) {
        cooldownRemaining = 120 - diffSeconds;
      }
    }

    return {
      data: sanitized,
      latest: sanitized[0] || null,
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

    const hydrated = await Promise.all(requests.map((r: any) => this.hydrateUpdateRequestSnapshot(r)));

    return {
      data: hydrated,
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

    return this.hydrateUpdateRequestSnapshot(request);
  }

  async approveUpdateRequest(id: string, adminId: string, actorContext?: Partial<AuditActorContext>) {
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
    if (data.bankName) businessUpdateData.bankName = data.bankName;
    if (data.bankAccountNumber) businessUpdateData.bankAccountNumber = data.bankAccountNumber;
    if (data.bankAccountHolderName) businessUpdateData.bankAccountHolderName = data.bankAccountHolderName;
    if (data.bankBranch) businessUpdateData.bankBranch = data.bankBranch;
    if (data.registryNumber || data.businessLicenseNumber) businessUpdateData.registryNumber = data.registryNumber || data.businessLicenseNumber;

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
      if (data.logo || data.storeLogo) {
        const cleanLogo = this.sanitizeAssetUrl(data.logo || data.storeLogo);
        if (cleanLogo) storeUpdateData.logo = cleanLogo;
      }
      if (data.banner || data.storeBanner) {
        const cleanBanner = this.sanitizeAssetUrl(data.banner || data.storeBanner);
        if (cleanBanner) storeUpdateData.banner = cleanBanner;
      }
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

    // Record Audit Log
    await this.auditService?.record({
      actor: {
        actorId: adminId,
        actorRole: actorContext?.actorRole || 'PLATFORM_ADMIN',
        requestId: actorContext?.requestId,
        ip: actorContext?.ip,
        userAgent: actorContext?.userAgent,
      },
      module: 'BUSINESS',
      action: AuditAction.APPROVE,
      resource: 'BusinessUpdateRequest',
      resourceId: id,
      storeId: request.businessId,
      beforeState: { status: request.status },
      afterState: { status: 'APPROVED', reviewedBy: adminId, requestedData: data },
      changedFields: ['status', 'reviewedBy'],
    });

    await this.outboxService?.addToOutbox('business.update_approved', id, {
      eventType: 'business.update_approved',
      requestId: id,
      businessId: request.businessId,
      businessName: businessUpdateData.name || request.business?.name,
      requestedBy: request.requestedBy,
      ownerId: request.business?.ownerId,
      adminId,
      status: 'APPROVED',
      reviewedAt: updatedRequest.reviewedAt,
    }).catch(() => null);

    return {
      message: 'Đã phê duyệt và cập nhật thông tin doanh nghiệp thành công',
      data: updatedRequest,
    };
  }

  async rejectUpdateRequest(id: string, adminId: string, reason: string, actorContext?: Partial<AuditActorContext>) {
    const request = await (this.prisma as any).businessUpdateRequest.findUnique({
      where: { id },
      include: { business: { select: { id: true, name: true, ownerId: true } } },
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

    // Record Audit Log
    await this.auditService?.record({
      actor: {
        actorId: adminId,
        actorRole: actorContext?.actorRole || 'PLATFORM_ADMIN',
        requestId: actorContext?.requestId,
        ip: actorContext?.ip,
        userAgent: actorContext?.userAgent,
      },
      module: 'BUSINESS',
      action: AuditAction.REJECT,
      resource: 'BusinessUpdateRequest',
      resourceId: id,
      storeId: request.businessId,
      beforeState: { status: request.status },
      afterState: { status: 'REJECTED', rejectionReason: reason, reviewedBy: adminId },
      changedFields: ['status', 'rejectionReason', 'reviewedBy'],
    });

    await this.outboxService?.addToOutbox('business.update_rejected', id, {
      eventType: 'business.update_rejected',
      requestId: id,
      businessId: request.businessId,
      businessName: request.business?.name,
      requestedBy: request.requestedBy,
      ownerId: request.business?.ownerId,
      adminId,
      status: 'REJECTED',
      reason: updatedRequest.rejectionReason,
      reviewedAt: updatedRequest.reviewedAt,
    }).catch(() => null);

    return {
      message: 'Đã từ chối yêu cầu cập nhật thông tin',
      data: updatedRequest,
    };
  }

  async getBusinessAuditLogs(
    businessId: string,
    params: { page?: number; limit?: number; action?: string },
  ) {
    if (!this.auditService) {
      return { items: [], total: 0, page: 1, limit: 10 };
    }
    return this.auditService.queryAuditLogs({
      resource: 'Business',
      resourceId: businessId,
      page: params.page,
      limit: params.limit,
      action: params.action,
    });
  }
}
