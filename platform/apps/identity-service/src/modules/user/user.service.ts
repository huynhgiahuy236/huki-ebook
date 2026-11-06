import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
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

  private getCommerceDbClient() {
    const { Client } = require('pg');
    const commerceDbUrl =
      process.env.COMMERCE_DATABASE_URL ||
      process.env.DATABASE_URL?.replace(/\/[^\/]+$/, '/huki_commerce') ||
      'postgresql://postgres:postgres123@localhost:5432/huki_commerce';
    return new Client({ connectionString: commerceDbUrl });
  }

  private getBusinessDbClient() {
    const { Client } = require('pg');
    const businessDbUrl =
      process.env.BUSINESS_DATABASE_URL ||
      process.env.DATABASE_URL?.replace(/\/[^\/]+$/, '/huki_business') ||
      'postgresql://postgres:postgres123@localhost:5432/huki_business';
    return new Client({ connectionString: businessDbUrl });
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

    // Query stores and members info from business DB
    let storeMapByOwner: Record<string, string> = {};
    let storeMapByMember: Record<string, { storeName: string; role: string }> = {};

    let pgClient: any = null;
    try {
      pgClient = this.getBusinessDbClient();
      await pgClient.connect();

      // Get businesses and stores
      const bizRes = await pgClient.query(`
        SELECT b.id as business_id, b.owner_id, b.name as business_name, s.name as store_name
        FROM businesses b
        LEFT JOIN stores s ON s.business_id = b.id AND s.deleted_at IS NULL
        WHERE b.deleted_at IS NULL
      `);

      for (const row of bizRes.rows) {
        if (row.owner_id) {
          storeMapByOwner[row.owner_id] = row.store_name || row.business_name || 'Gian hàng';
        }
      }

      // Get members
      const memRes = await pgClient.query(`
        SELECT m.user_id, m.role, s.name as store_name, b.name as business_name
        FROM members m
        JOIN businesses b ON b.id = m.business_id AND b.deleted_at IS NULL
        LEFT JOIN stores s ON s.business_id = b.id AND s.deleted_at IS NULL
        WHERE m.deleted_at IS NULL
      `);

      for (const row of memRes.rows) {
        if (row.user_id) {
          storeMapByMember[row.user_id] = {
            storeName: row.store_name || row.business_name || 'Gian hàng',
            role: row.role,
          };
        }
      }
    } catch (err) {
      console.warn('[UserService] Could not load store details from business DB:', err);
    } finally {
      if (pgClient) {
        await pgClient.end().catch(() => {});
      }
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

  async updateUserByAdmin(id: string, dto: { fullName?: string; email?: string; phone?: string; password?: string; role?: string; status?: string; storeName?: string }) {
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

    if (dto.password && dto.password.trim()) {
      updateData.passwordHash = await bcrypt.hash(dto.password.trim(), 12);
    }

    if (dto.role && user.role !== UserRole.PLATFORM_ADMIN) {
      if (dto.role === 'CUSTOMER') updateData.role = UserRole.USER;
      else if (dto.role === 'SELLER_ADMIN' || dto.role === 'SELLER_STAFF') updateData.role = UserRole.BUSINESS;
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

    // Kiểm tra đơn hàng chưa hoàn tất trong Commerce DB
    try {
      const commerceClient = this.getCommerceDbClient();
      await commerceClient.connect();
      try {
        const orderRes = await commerceClient.query(
          `SELECT id, code, status FROM orders 
           WHERE user_id = $1 
             AND status IN ('PENDING', 'PENDING_PAYMENT', 'PROCESSING', 'SHIPPING') 
           LIMIT 5`,
          [userId]
        );
        if (orderRes.rows && orderRes.rows.length > 0) {
          const codes = orderRes.rows.map((r: any) => r.code).join(', ');
          throw new BadRequestException(
            `Không thể yêu cầu xóa tài khoản do bạn đang có ${orderRes.rows.length} đơn hàng chưa hoàn tất (Mã: ${codes}). Vui lòng chờ hoàn thành đơn hoặc hủy đơn trước khi xóa.`,
          );
        }
      } finally {
        await commerceClient.end().catch(() => {});
      }
    } catch (err: any) {
      if (err instanceof BadRequestException || err instanceof ForbiddenException) {
        throw err;
      }
      console.warn('[UserService] Could not verify orders before deletion OTP:', err?.message || err);
    }

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
    try {
      const commerceClient = this.getCommerceDbClient();
      await commerceClient.connect();
      try {
        const orderRes = await commerceClient.query(
          `SELECT id, code, status FROM orders 
           WHERE user_id = $1 
             AND status IN ('PENDING', 'PENDING_PAYMENT', 'PROCESSING', 'SHIPPING') 
           LIMIT 5`,
          [userId]
        );
        if (orderRes.rows && orderRes.rows.length > 0) {
          const codes = orderRes.rows.map((r: any) => r.code).join(', ');
          throw new BadRequestException(
            `Không thể xóa tài khoản do bạn đang có ${orderRes.rows.length} đơn hàng chưa hoàn tất (Mã: ${codes}). Vui lòng chờ đơn hàng được giao thành công hoặc hủy đơn trước khi xóa tài khoản.`
          );
        }
      } finally {
        await commerceClient.end().catch(() => {});
      }
    } catch (err: any) {
      if (err instanceof BadRequestException || err instanceof ForbiddenException) {
        throw err;
      }
      console.warn('Could not verify active orders before deletion:', err?.message || err);
    }

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
