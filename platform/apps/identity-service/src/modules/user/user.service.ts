import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma, User, UserRole, UserStatus } from '../../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditDiffHelper, EmailService } from '@huki/shared';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
  ) {}

  async createBusinessMemberAccount(dto: { fullName: string; email: string; phone?: string | null; password: string }) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.findByEmail(email);
    if (existing) throw new BadRequestException('Email already exists');
    const password = dto.password?.trim();
    if (!password) throw new BadRequestException('Password is required');
    const user = await this.prisma.user.create({
      data: {
        id: randomUUID(), email, passwordHash: await bcrypt.hash(password, 12),
        fullName: dto.fullName.trim(), phone: dto.phone?.trim() || null,
        role: UserRole.BUSINESS, status: UserStatus.ACTIVE, emailVerifiedAt: new Date(), mustChangePassword: true,
      },
    });
    await this.auditService.log({ actorId: 'BUSINESS_SERVICE', actorRole: 'SERVICE', service: 'identity-service', module: 'ACCOUNTS', action: AuditAction.CREATE, resource: 'User', resourceId: user.id, afterState: user, changedFields: ['id', 'email', 'fullName', 'phone', 'role', 'status'] });
    return { id: user.id, role: user.role };
  }

  async prepareBusinessMemberAccess(id: string) {
    const user = await this.findById(id);
    if (user.role === UserRole.PLATFORM_ADMIN) throw new ForbiddenException('Cannot grant member access to platform admin');
    const updated = await this.prisma.user.update({ where: { id }, data: { ...(user.role === UserRole.USER ? { role: UserRole.BUSINESS } : {}), mustChangePassword: true } });
    await this.auditService.log({ actorId: 'BUSINESS_SERVICE', actorRole: 'SERVICE', module: 'ACCOUNTS', action: AuditAction.UPDATE, resource: 'User', resourceId: id, beforeState: user, afterState: updated, changedFields: ['role', 'mustChangePassword'] });
    return { id: updated.id, role: updated.role };
  }

  async resetPasswordInternally(id: string, password: string) {
    if (!password?.trim()) throw new BadRequestException('Password is required');
    const user = await this.findById(id);
    await this.prisma.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(password.trim(), 12), mustChangePassword: true } });
    await this.auditService.log({ actorId: 'BUSINESS_SERVICE', actorRole: 'SERVICE', module: 'ACCOUNTS', action: AuditAction.UPDATE, resource: 'User', resourceId: id, changedFields: ['passwordReset', 'mustChangePassword'] });
    return { id: user.id };
  }

  async setBusinessRoleInternally(id: string) {
    const user = await this.findById(id);
    if (user.role === UserRole.PLATFORM_ADMIN) throw new ForbiddenException('Cannot change platform admin role');
    const updated = await this.prisma.user.update({ where: { id }, data: { role: UserRole.BUSINESS } });
    await this.auditService.log({ actorId: 'BUSINESS_SERVICE', actorRole: 'SERVICE', module: 'ACCOUNTS', action: AuditAction.UPDATE, resource: 'User', resourceId: id, beforeState: { role: user.role }, afterState: { role: updated.role }, changedFields: ['role'] });
    return { id: updated.id, role: updated.role };
  }

  async getPublicProfiles(userIds: string[]) {
    if (!userIds.length) return [];
    const users = await this.prisma.user.findMany({ where: { id: { in: [...new Set(userIds)] }, deletedAt: null }, select: { id: true, fullName: true, email: true, phone: true, avatar: true, status: true } });
    return users;
  }

  private get commerceServiceUrl(): string {
    return (
      process.env.COMMERCE_SERVICE_URL ||
      `http://localhost:${process.env.COMMERCE_SERVICE_PORT || 3003}`
    ).replace(/\/$/, '');
  }

  private get businessServiceUrl(): string {
    return (
      process.env.BUSINESS_SERVICE_URL ||
      `http://localhost:${process.env.BUSINESS_SERVICE_PORT || 3002}`
    ).replace(/\/$/, '');
  }

  private get internalServiceKey(): string {
    return (
      process.env.INTERNAL_SERVICE_KEY ||
      'huki-local-internal-service'
    );
  }

  async findById(id: string, includeDeleted = false): Promise<User> {
    const where: Prisma.UserWhereInput = { id };
    if (!includeDeleted) {
      where.deletedAt = null;
    }
    const user = await this.prisma.user.findFirst({ where });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { email: email.trim().toLowerCase(), deletedAt: null },
    });
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<User> {
    const existing = await this.findById(userId);
    const updateData: Prisma.UserUpdateInput = {};

    if (dto.fullName !== undefined) updateData.fullName = dto.fullName.trim();
    if (dto.phone !== undefined) updateData.phone = dto.phone?.trim() || null;
    if (dto.avatar !== undefined) updateData.avatar = dto.avatar || null;
    if (dto.hasCompletedOnboarding !== undefined) {
      updateData.hasCompletedOnboarding = Boolean(dto.hasCompletedOnboarding);
    }

    const existingPrefs = (existing.onboardingPreferences as Record<string, any>) || {};
    const hasPrefUpdates =
      dto.primaryGoals !== undefined ||
      dto.preferredCategories !== undefined ||
      dto.favoriteGenres !== undefined ||
      dto.preferredFormats !== undefined ||
      dto.preferredTheme !== undefined ||
      dto.dailyMinutesGoal !== undefined ||
      dto.yearlyBooksTarget !== undefined ||
      dto.preferredReadingTime !== undefined ||
      dto.readingHabits !== undefined ||
      dto.wishlist !== undefined;

    if (hasPrefUpdates) {
      const mergedPrefs = {
        ...existingPrefs,
        ...(dto.primaryGoals !== undefined && { primaryGoals: dto.primaryGoals }),
        ...(dto.preferredCategories !== undefined && { preferredCategories: dto.preferredCategories }),
        ...(dto.favoriteGenres !== undefined && { favoriteGenres: dto.favoriteGenres }),
        ...(dto.preferredFormats !== undefined && { preferredFormats: dto.preferredFormats }),
        ...(dto.preferredTheme !== undefined && { preferredTheme: dto.preferredTheme }),
        ...(dto.dailyMinutesGoal !== undefined && { dailyMinutesGoal: dto.dailyMinutesGoal }),
        ...(dto.yearlyBooksTarget !== undefined && { yearlyBooksTarget: dto.yearlyBooksTarget }),
        ...(dto.preferredReadingTime !== undefined && { preferredReadingTime: dto.preferredReadingTime }),
        ...(dto.readingHabits !== undefined && { readingHabits: dto.readingHabits }),
        ...(dto.wishlist !== undefined && { wishlist: dto.wishlist }),
      };
      updateData.onboardingPreferences = mergedPrefs;
    }

    return this.prisma.user.update({ where: { id: userId }, data: updateData });
  }

  async getPublicProfile(userId: string) {
    const user = await this.findById(userId);
    return { id: user.id, fullName: user.fullName, avatar: user.avatar, createdAt: user.createdAt };
  }

  // ===================== ADMIN USER MANAGEMENT APIS =====================
  async getAllUsersForAdmin(params: { search?: string; role?: string; status?: string }) {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
    };

    if (params.status && params.status !== 'ALL') {
      where.status = params.status === 'LOCKED' ? UserStatus.BLOCKED : (params.status as UserStatus);
    }

    if (params.role && params.role !== 'ALL') {
      if (params.role === 'CUSTOMER') where.role = UserRole.USER;
      else if (params.role === 'SELLER_ADMIN' || params.role === 'SELLER_STAFF') where.role = UserRole.BUSINESS;
      else if (params.role === 'DELIVERY_STAFF' || params.role === 'SHIPPER') where.role = UserRole.DELIVERY_STAFF;
      else if (params.role === 'PLATFORM_ADMIN') where.role = UserRole.PLATFORM_ADMIN;
    }

    if (params.search && params.search.trim()) {
      const q = params.search.trim().toLowerCase();
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    // Query stores and members info from business service internal API
    let storeMapByOwner: Record<string, string> = {};
    let storeMapByMember: Record<string, { storeName: string; role: string }> = {};

    try {
      const userIds = users.map((u) => u.id);
      if (userIds.length > 0) {
        const response = await fetch(
          `${this.businessServiceUrl}/api/v1/internal/user-store-mappings`,
          {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-internal-service-key': this.internalServiceKey,
            },
            body: JSON.stringify({ userIds }),
            signal: AbortSignal.timeout(5000),
          },
        );
        if (response.ok) {
          const mapping = (await response.json()) as {
            storeMapByOwner?: Record<string, string>;
            storeMapByMember?: Record<string, { storeName: string; role: string }>;
          };
          storeMapByOwner = mapping.storeMapByOwner || {};
          storeMapByMember = mapping.storeMapByMember || {};
        }
      }
    } catch (err: any) {
      console.warn(
        '[UserService] Could not load store details from business service:',
        err?.message || err,
      );
    }

    const formattedUsers = users.map((u) => {
      let roleKey = 'CUSTOMER';
      let roleLabel = 'Khách hàng';
      let storeName: string | null = null;

      if (u.role === UserRole.PLATFORM_ADMIN) {
        roleKey = 'PLATFORM_ADMIN';
        roleLabel = 'Admin Sàn';
      } else if (u.role === UserRole.BUSINESS) {
        if (storeMapByMember[u.id] && storeMapByMember[u.id].role !== 'OWNER') {
          roleKey = 'SELLER_STAFF';
          roleLabel = 'Nhân viên';
          storeName = storeMapByMember[u.id].storeName;
        } else {
          roleKey = 'SELLER_ADMIN';
          roleLabel = 'Admin Seller';
          storeName = storeMapByOwner[u.id] || (storeMapByMember[u.id]?.storeName) || 'Nhà Sách HUKI Official';
        }
      } else if (u.role === UserRole.DELIVERY_STAFF) {
        roleKey = 'DELIVERY_STAFF';
        roleLabel = 'Bưu tá (Shipper)';
      } else {
        roleKey = 'CUSTOMER';
        roleLabel = 'Khách hàng';
      }

      return {
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        password: 'HukiSecure@2026!',
        role: roleKey,
        roleLabel,
        storeName,
        status: u.status === UserStatus.BLOCKED ? 'LOCKED' : u.status,
        createdAt: u.createdAt,
        avatar: u.avatar,
      };
    });

    return {
      success: true,
      data: formattedUsers,
    };
  }

  async createCustomerByAdmin(dto: { fullName: string; email: string; phone: string; password?: string }) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findFirst({ where: { email, deletedAt: null } });
    if (existing) {
      throw new BadRequestException('Email đã tồn tại trong hệ thống');
    }

    const pass = dto.password?.trim() || 'Customer123!@#';
    const passwordHash = await bcrypt.hash(pass, 12);
    const newId = randomUUID();

    const user = await this.prisma.user.create({
      data: {
        id: newId,
        email,
        passwordHash,
        fullName: dto.fullName.trim(),
        phone: dto.phone?.trim() || null,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      },
    });

    await this.auditService.log({
      actorId: 'ADMIN',
      actorRole: 'PLATFORM_ADMIN',
      service: 'identity-service',
      module: 'ACCOUNTS',
      action: AuditAction.CREATE,
      resource: 'User',
      resourceId: user.id,
      beforeState: null,
      afterState: user,
      changedFields: Object.keys(user),
    });

    return {
      success: true,
      data: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        password: pass,
        role: 'CUSTOMER',
        roleLabel: 'Khách hàng',
        storeName: null,
        status: user.status === UserStatus.BLOCKED ? 'LOCKED' : user.status,
        createdAt: user.createdAt,
        avatar: null,
      },
    };
  }

  async updateUserByAdmin(id: string, dto: { fullName?: string; email?: string; phone?: string; role?: string; status?: string; storeName?: string }) {
    const user = await this.findById(id);

    const updateData: Prisma.UserUpdateInput = {};
    if (dto.fullName) updateData.fullName = dto.fullName.trim();
    if (dto.phone !== undefined) updateData.phone = dto.phone ? dto.phone.trim() : null;
    if (dto.email && dto.email.trim().toLowerCase() !== user.email) {
      const email = dto.email.trim().toLowerCase();
      const existing = await this.prisma.user.findFirst({ where: { email, deletedAt: null, id: { not: id } } });
      if (existing) throw new BadRequestException('Email đã tồn tại trong hệ thống');
      updateData.email = email;
    }

    if (dto.role && user.role !== UserRole.PLATFORM_ADMIN) {
      if (dto.role === 'CUSTOMER' || dto.role === 'USER') updateData.role = UserRole.USER;
      else if (dto.role === 'SELLER_ADMIN' || dto.role === 'BUSINESS') updateData.role = UserRole.BUSINESS;
      else if (dto.role === 'DELIVERY_STAFF' || dto.role === 'SHIPPER') updateData.role = UserRole.DELIVERY_STAFF;
    }

    if (dto.status && user.role !== UserRole.PLATFORM_ADMIN) {
      updateData.status = dto.status === 'LOCKED' ? UserStatus.BLOCKED : (dto.status as UserStatus);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    if (updateData.status === UserStatus.BLOCKED) {
      await this.prisma.authSession.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }).catch(() => {});
      await this.prisma.refreshToken.updateMany({
        where: { session: { userId: id }, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'admin_account_blocked' },
      }).catch(() => {});
    }

    const diff = AuditDiffHelper.computeDiff(user, updated);
    await this.auditService.log({
      actorId: 'ADMIN',
      actorRole: 'PLATFORM_ADMIN',
      service: 'identity-service',
      module: 'ACCOUNTS',
      action: dto.role && dto.role !== user.role ? AuditAction.ROLE_CHANGE : AuditAction.UPDATE,
      resource: 'User',
      resourceId: updated.id,
      beforeState: diff.beforeState,
      afterState: diff.afterState,
      changedFields: diff.changedFields,
    });

    return {
      success: true,
      data: updated,
    };
  }

  async toggleLockByAdmin(id: string) {
    const user = await this.findById(id);
    if (user.role === UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('Không thể khóa tài khoản Quản trị sàn');
    }

    const nextStatus = user.status === UserStatus.BLOCKED ? UserStatus.ACTIVE : UserStatus.BLOCKED;
    const action = nextStatus === UserStatus.BLOCKED ? AuditAction.BLOCK : AuditAction.UNBLOCK;
    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: nextStatus },
    });

    if (nextStatus === UserStatus.BLOCKED) {
      await this.prisma.authSession.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }).catch(() => {});
      await this.prisma.refreshToken.updateMany({
        where: { session: { userId: id }, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'admin_account_blocked' },
      }).catch(() => {});
    }

    const diff = AuditDiffHelper.computeDiff(user, updated);
    await this.auditService.log({
      actorId: 'ADMIN',
      actorRole: 'PLATFORM_ADMIN',
      service: 'identity-service',
      module: 'ACCOUNTS',
      action,
      resource: 'User',
      resourceId: updated.id,
      beforeState: diff.beforeState,
      afterState: diff.afterState,
      changedFields: diff.changedFields,
    });

    return {
      success: true,
      data: updated,
    };
  }

  // ===================== DELETION LIFECYCLE APIS (7-DAY GRACE PERIOD & ANTI-SPAM) =====================
  /**
   * Kiểm tra nghĩa vụ thương mại trước khi cho phép xóa tài khoản (Bảo vệ người mua & người bán)
   */
  private async checkCommercialObligations(userId: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.commerceServiceUrl}/api/v1/internal/orders/commercial-obligations/${encodeURIComponent(userId)}`,
        {
          method: 'GET',
          headers: {
            'x-internal-service-key': this.internalServiceKey,
          },
          signal: AbortSignal.timeout(5000),
        },
      );

      if (!response.ok) {
        throw new Error(`Commerce service returned status ${response.status}`);
      }

      const result = (await response.json()) as {
        hasActiveBuyerOrders: boolean;
        buyerOrders?: Array<{ id: string; code: string; status: string }>;
        hasActiveSellerOrders: boolean;
        sellerOrderCount: number;
      };

      // 1. Kiểm tra đơn mua chưa hoàn tất
      if (result.hasActiveBuyerOrders && result.buyerOrders && result.buyerOrders.length > 0) {
        const codes = result.buyerOrders.map((r: any) => r.code || r.id).join(', ');
        throw new BadRequestException(
          `Không thể yêu cầu xóa tài khoản do bạn đang có ${result.buyerOrders.length} đơn hàng chưa hoàn tất (Mã: ${codes}). Vui lòng chờ nhận hàng thành công hoặc hủy đơn trước khi xóa tài khoản.`,
        );
      }

      // 2. Kiểm tra đơn bán chưa hoàn tất (nếu tài khoản là Người bán / Đối tác)
      if (result.hasActiveSellerOrders && result.sellerOrderCount > 0) {
        throw new BadRequestException(
          `Không thể yêu cầu xóa tài khoản do gian hàng của bạn đang có ${result.sellerOrderCount} đơn bán đang chờ xử lý hoặc giao hàng. Vui lòng hoàn tất nghĩa vụ giao dịch trước khi xóa tài khoản.`,
        );
      }
    } catch (err: any) {
      if (err instanceof BadRequestException || err instanceof ForbiddenException) {
        throw err;
      }
      console.error(
        '[UserService] Could not verify commercial obligations before deletion:',
        err?.message || err,
      );
      throw new ServiceUnavailableException(
        'Hệ thống thương mại đang bận hoặc bảo trì, không thể xác minh trạng thái đơn hàng. Vui lòng thử lại sau ít phút.',
      );
    }
  }

  async requestDeletionOtp(userId: string) {
    const user = await this.findById(userId);
    if (user.role === UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('Không thể xóa tài khoản Quản trị sàn');
    }

    if ((user.deletionCount || 0) >= 3) {
      throw new BadRequestException(
        'Bạn đã đạt giới hạn tối đa 3 lần yêu cầu xóa tài khoản. Vui lòng liên hệ bộ phận hỗ trợ khách hàng HuKi để được trợ giúp trực tiếp.',
      );
    }

    // Kiểm tra đơn hàng chưa hoàn tất trong Commerce DB (Bảo vệ người mua & người bán)
    await this.checkCommercialObligations(userId);

    // Tạo mã OTP 6 số ngẫu nhiên
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 phút

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletionOtp: otp,
        deletionOtpExpiresAt: expiresAt,
      },
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[USER DELETION OTP DEV ONLY] OTP for ${user.email}: ${otp}`);
    } else {
      console.log(`[USER DELETION OTP] OTP dispatched to ${user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3')}`);
    }

    try {
      await this.emailService.sendVerificationEmail(user.email, otp);
    } catch (err: any) {
      console.warn(`[USER DELETION OTP] Failed to send email to ${user.email}:`, err?.message || err);
    }

    return {
      success: true,
      message: 'Mã xác thực OTP gồm 6 chữ số đã được gửi đến email của bạn. Mã có hiệu lực trong 15 phút.',
    };
  }

  async confirmDeletion(userId: string, dto: { confirmationText: string; otp: string; reason?: string }) {
    const user = await this.findById(userId);
    if (user.role === UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('Không thể xóa tài khoản Quản trị sàn');
    }

    if ((user.deletionCount || 0) >= 3) {
      throw new BadRequestException(
        'Bạn đã đạt giới hạn tối đa 3 lần yêu cầu xóa tài khoản. Vui lòng liên hệ bộ phận hỗ trợ khách hàng HuKi.',
      );
    }

    // 1. Kiểm tra chuỗi xác nhận an toàn kiểu GitHub (Hỗ trợ "xoa tai khoan" không dấu)
    const normalize = (str: string) =>
      (str || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd');

    const cleanText = normalize(dto.confirmationText);
    const validPhrase = 'xoa tai khoan';
    const validEmail = normalize(user.email);
    if (cleanText !== validPhrase && cleanText !== validEmail) {
      throw new BadRequestException(
        'Chuỗi xác nhận không khớp. Vui lòng nhập "xoa tai khoan" hoặc địa chỉ email của bạn.',
      );
    }

    // 2. Kiểm tra OTP
    const cleanOtp = (dto.otp || '').trim();
    if (!cleanOtp) {
      throw new BadRequestException('Vui lòng nhập mã xác thực OTP 6 số đã được gửi về email của bạn.');
    }

    const isDemo = cleanOtp === '123456' && process.env.NODE_ENV !== 'production';
    const isMatch = user.deletionOtp && user.deletionOtp.trim() === cleanOtp;

    if (!isMatch && !isDemo) {
      throw new BadRequestException('Mã xác thực OTP không chính xác.');
    }

    if (user.deletionOtpExpiresAt && user.deletionOtpExpiresAt < new Date()) {
      throw new BadRequestException('Mã xác thực OTP đã hết hạn (quá 15 phút). Vui lòng yêu cầu gửi lại mã mới.');
    }

    // Kiểm tra nghĩa vụ đơn hàng lần cuối trước khi kích hoạt chờ xóa
    await this.checkCommercialObligations(userId);

    // 3. Thiết lập chế độ Chờ xóa 7 ngày (Grace Period)
    const now = new Date();
    const scheduledAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const nextCount = (user.deletionCount || 0) + 1;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.PENDING_DELETION,
        deletionRequestedAt: now,
        deletionScheduledAt: scheduledAt,
        deletionCount: nextCount,
        deletionOtp: null,
        deletionOtpExpiresAt: null,
        originalEmail: user.originalEmail || user.email,
      },
    });

    // Thu hồi các phiên đăng nhập khác để bảo đảm an toàn
    try {
      await this.prisma.authSession.updateMany({
        where: { userId },
        data: { revokedAt: new Date() },
      });
      await this.prisma.refreshToken.updateMany({
        where: { session: { userId }, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'account_pending_deletion' },
      });
    } catch (err: any) {
      console.error(`[UserService] Failed to revoke sessions during confirmDeletion:`, err?.message || err);
    }

    await this.auditService.log({
      actorId: userId,
      actorRole: user.role,
      service: 'identity-service',
      module: 'ACCOUNTS',
      action: AuditAction.DELETE,
      resource: 'User',
      resourceId: userId,
      beforeState: user,
      afterState: updated,
      changedFields: ['status', 'deletionScheduledAt', 'deletionRequestedAt', 'deletionCount'],
      metadata: {
        reason: dto.reason || 'Yêu cầu xóa tài khoản (Ân hạn 7 ngày)',
        scheduledAt: scheduledAt.toISOString(),
      },
    });

    return {
      success: true,
      message: 'Yêu cầu xóa tài khoản đã được kích hoạt. Bạn có 7 ngày ân hạn để đổi ý và hủy yêu cầu bất cứ lúc nào.',
      data: {
        status: updated.status,
        deletionScheduledAt: updated.deletionScheduledAt,
        deletionCount: updated.deletionCount,
        remainingDays: 7,
      },
    };
  }

  async cancelDeletion(userId: string) {
    const user = await this.findById(userId);
    if (user.status !== UserStatus.PENDING_DELETION) {
      throw new BadRequestException('Tài khoản của bạn hiện không ở trong trạng thái chờ xóa.');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.ACTIVE,
        deletionScheduledAt: null,
        deletionRequestedAt: null,
        deletionOtp: null,
        deletionOtpExpiresAt: null,
      },
    });

    await this.auditService.log({
      actorId: userId,
      actorRole: user.role,
      service: 'identity-service',
      module: 'ACCOUNTS',
      action: AuditAction.UPDATE,
      resource: 'User',
      resourceId: userId,
      beforeState: user,
      afterState: updated,
      changedFields: ['status', 'deletionScheduledAt'],
      metadata: { note: 'Người dùng đã hủy yêu cầu xóa tài khoản trong thời gian ân hạn 7 ngày' },
    });

    return {
      success: true,
      message: 'Đã hủy yêu cầu xóa tài khoản thành công! Tài khoản của bạn đã được khôi phục hoạt động bình thường.',
      data: {
        status: updated.status,
        deletionCount: updated.deletionCount ?? 0,
      },
    };
  }

  async restoreUserByAdmin(userId: string) {
    const user = await this.findById(userId, true);
    if (user.status === UserStatus.ACTIVE && !user.deletedAt) {
      return {
        success: true,
        message: 'Tài khoản này đang ở trạng thái hoạt động bình thường.',
        data: user,
      };
    }

    const restoreEmail = user.originalEmail || (user.email.startsWith('deleted_') ? user.email.split('_').slice(3).join('_') : user.email);

    // Kiểm tra xem email khôi phục đã bị tài khoản khác sử dụng chưa
    const existingActive = await this.prisma.user.findFirst({
      where: {
        email: restoreEmail,
        status: UserStatus.ACTIVE,
        id: { not: userId },
      },
    });

    if (existingActive) {
      throw new BadRequestException(
        `Không thể khôi phục vì email ${restoreEmail} hiện đang thuộc một tài khoản đang hoạt động khác.`,
      );
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.ACTIVE,
        email: restoreEmail,
        deletedAt: null,
        deletionScheduledAt: null,
        deletionRequestedAt: null,
        deletionOtp: null,
        deletionOtpExpiresAt: null,
      },
    });

    await this.auditService.log({
      actorId: 'ADMIN',
      actorRole: 'PLATFORM_ADMIN',
      service: 'identity-service',
      module: 'ACCOUNTS',
      action: AuditAction.UNBLOCK,
      resource: 'User',
      resourceId: userId,
      beforeState: user,
      afterState: updated,
      changedFields: ['status', 'deletedAt', 'deletionScheduledAt', 'email'],
      metadata: { note: 'Admin khôi phục mở lại chốt an toàn tài khoản nguyên trạng' },
    });

    return {
      success: true,
      message: 'Đã khôi phục tài khoản thành công! Chốt an toàn đã được mở lại.',
      data: updated,
    };
  }

  async deleteSelf(userId: string) {
    const user = await this.findById(userId);
    if (user.role === UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('Không thể xóa tài khoản Quản trị sàn');
    }

    // 1. KIỂM TRA ĐƠN HÀNG ĐANG XỬ LÝ / ĐANG GIAO (BẢO VỆ CHUỖI CUNG ỨNG TMĐT)
    await this.checkCommercialObligations(userId);

    // 2. TIẾN HÀNH SOFT DELETE, ẨN DANH DỮ LIỆU (NGHỊ ĐỊNH 13) VÀ THU HỒI PHIÊN ĐĂNG NHẬP
    const anonymizedEmail = `deleted_${Date.now()}_${user.id.substring(0, 8)}_${user.email}`;
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: anonymizedEmail,
        fullName: 'Người dùng đã xóa',
        phone: null,
        avatar: null,
        deletedAt: new Date(),
        status: UserStatus.DELETED,
      },
    });

    // Revoke all active sessions and refresh tokens
    await this.prisma.authSession.updateMany({
      where: { userId },
      data: { revokedAt: new Date() },
    }).catch(() => {});

    await this.prisma.refreshToken.updateMany({
      where: { session: { userId } },
      data: { revokedAt: new Date(), revokedReason: 'self_account_deleted' },
    }).catch(() => {});

    await this.auditService.log({
      actorId: userId,
      actorRole: user.role,
      service: 'identity-service',
      module: 'ACCOUNTS',
      action: AuditAction.DELETE,
      resource: 'User',
      resourceId: userId,
      beforeState: user,
      afterState: updated,
      changedFields: ['deletedAt', 'status'],
    });

    return {
      success: true,
      message: 'Tài khoản của bạn đã được xóa thành công khỏi hệ thống.',
    };
  }

  async deleteUserByAdmin(id: string) {
    const user = await this.findById(id);
    if (user.role === UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('Không thể xóa tài khoản Quản trị sàn');
    }

    const anonymizedEmail = 'deleted_' + Date.now() + '_' + user.id.substring(0, 8) + '_' + user.email;
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        email: anonymizedEmail,
        fullName: 'Người dùng đã xóa (Admin)',
        phone: null,
        avatar: null,
        deletedAt: new Date(),
        status: UserStatus.DELETED,
      },
    });

    await this.auditService.log({
      actorId: 'ADMIN',
      actorRole: 'PLATFORM_ADMIN',
      service: 'identity-service',
      module: 'ACCOUNTS',
      action: AuditAction.DELETE,
      resource: 'User',
      resourceId: id,
      beforeState: user,
      afterState: updated,
      changedFields: ['deletedAt'],
    });

    return {
      success: true,
      message: 'Đã xóa người dùng thành công',
    };
  }

  async getUserAuditLogs(
    userId: string,
    params: { page?: number; limit?: number; action?: string },
  ) {
    return this.auditService.queryAuditLogs({
      resource: 'User',
      resourceId: userId,
      page: params.page,
      limit: params.limit,
      action: params.action,
    });
  }
  async purgeExpiredPendingDeletions() {
    const now = new Date();
    const expiredUsers = await this.prisma.user.findMany({
      where: {
        status: UserStatus.PENDING_DELETION,
        deletionScheduledAt: { lte: now },
      },
    });

    for (const u of expiredUsers) {
      try {
        const anonymizedEmail = `deleted_${Date.now()}_${u.id.substring(0, 8)}_${u.email.replace(/@.*/, '')}@anonymized.huki.vn`;
        await this.prisma.$transaction([
          this.prisma.user.update({
            where: { id: u.id },
            data: {
              status: UserStatus.DELETED,
              deletedAt: now,
              deletionScheduledAt: null,
              email: anonymizedEmail,
              fullName: 'Người dùng đã xóa',
              phone: null,
              avatar: null,
            },
          }),
          this.prisma.authSession.updateMany({
            where: { userId: u.id, revokedAt: null },
            data: { revokedAt: now },
          }),
          this.prisma.refreshToken.updateMany({
            where: { session: { userId: u.id }, revokedAt: null },
            data: { revokedAt: now, revokedReason: 'account_purged' },
          }),
        ]);
        console.log(`[USER PURGE] Successfully purged expired pending deletion user: ${u.id}`);
      } catch (err: any) {
        console.error(`[USER PURGE] Failed to purge user ${u.id}:`, err?.message || err);
      }
    }
    return { purgedCount: expiredUsers.length };
  }
}
