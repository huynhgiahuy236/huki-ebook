import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma, User, UserRole, UserStatus } from '../../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  private getBusinessDbClient() {
    const { Client } = require('pg');
    const businessDbUrl =
      process.env.BUSINESS_DATABASE_URL ||
      process.env.DATABASE_URL?.replace(/\/[^\/]+$/, '/huki_business') ||
      'postgresql://postgres:postgres123@localhost:5432/huki_business';
    return new Client({ connectionString: businessDbUrl });
  }

  async findById(id: string): Promise<User> {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
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
    data: Pick<Prisma.UserUpdateInput, 'fullName' | 'phone' | 'avatar'>,
  ): Promise<User> {
    await this.findById(userId);
    return this.prisma.user.update({ where: { id: userId }, data });
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

    try {
      const pgClient = this.getBusinessDbClient();
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

      await pgClient.end();
    } catch (err) {
      console.warn('[UserService] Could not load store details from business DB:', err);
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
    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: nextStatus },
    });

    return {
      success: true,
      data: updated,
    };
  }

  async deleteUserByAdmin(id: string) {
    const user = await this.findById(id);
    if (user.role === UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('Không thể xóa tài khoản Quản trị sàn');
    }

    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {
      success: true,
      message: 'Đã xóa người dùng thành công',
    };
  }
}
