import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import {
  InviteMemberDto,
  ProvisionMemberDto,
  UpdateMemberRoleDto,
} from "./dto/member.dto";
import {
  InvitationStatus,
  MemberRole,
  MemberStatus,
} from "../../../prisma/generated/client";
import {
  throwNotFound,
  throwBadRequest,
  throwForbidden,
} from "@huki/shared/errors";
import { ErrorCode } from "@huki/shared/errors";
import { EmailService } from "@huki/shared";
import { randomUUID } from "node:crypto";

@Injectable()
export class MemberService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  private getIdentityDbClient() {
    const { Client } = require("pg");
    const identityDbUrl =
      process.env.IDENTITY_DATABASE_URL ||
      process.env.DATABASE_URL?.replace(/\/[^\/]+$/, "/huki_identity") ||
      "postgresql://postgres:postgres123@localhost:5432/huki_identity";
    return new Client({ connectionString: identityDbUrl });
  }

  // ==================== PROVISION MEMBER DIRECTLY ====================
  async provisionMember(
    businessId: string,
    adminId: string,
    dto: ProvisionMemberDto,
  ) {
    const canManage = await this.canManageMembers(businessId, adminId);
    if (!canManage) {
      throwForbidden(ErrorCode.AUTHZ_ROLE_INSUFFICIENT);
    }

    const email = dto.email.trim().toLowerCase();
    const pgClient = this.getIdentityDbClient();
    await pgClient.connect();

    let targetUserId: string;
    const initialPass = dto.initialPassword?.trim() || "Staff123!";

    try {
      const userRes = await pgClient.query(
        "SELECT id, role FROM users WHERE email = $1 AND deleted_at IS NULL LIMIT 1",
        [email],
      );

      if (userRes.rows.length > 0) {
        targetUserId = userRes.rows[0].id;
        const existingMember = await this.prisma.member.findFirst({
          where: { businessId, userId: targetUserId, deletedAt: null },
        });
        if (existingMember) {
          throwBadRequest(ErrorCode.MEMBER_ALREADY_EXISTS);
        }

        if (userRes.rows[0].role === "USER") {
          await pgClient.query(
            "UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2",
            ["BUSINESS", targetUserId],
          );
        }
      } else {
        const bcrypt = require("bcrypt");
        const passwordHash = await bcrypt.hash(initialPass, 12);
        const newUserId = randomUUID();

        await pgClient.query(
          `INSERT INTO users (id, email, password_hash, full_name, phone, role, status, email_verified_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, 'BUSINESS', 'ACTIVE', NOW(), NOW(), NOW())`,
          [
            newUserId,
            email,
            passwordHash,
            dto.fullName.trim(),
            dto.phone?.trim() || null,
          ],
        );
        targetUserId = newUserId;
      }
    } finally {
      await pgClient.end();
    }

    const member = await this.prisma.member.create({
      data: {
        businessId,
        userId: targetUserId,
        role: dto.role || MemberRole.ORDER_STAFF,
        status: MemberStatus.ACTIVE,
        permissions: dto.permissions || [],
        invitedBy: adminId,
        acceptedAt: new Date(),
      },
    });

    return {
      message: "Cấp tài khoản nhân viên thành công",
      data: {
        ...member,
        fullName: dto.fullName,
        email,
        phone: dto.phone,
        initialPassword: initialPass,
      },
    };
  }

  // ==================== INVITE MEMBER ====================
  async inviteMember(businessId: string, userId: string, dto: InviteMemberDto) {
    const email = dto.email.trim().toLowerCase();
    const canInvite = await this.canManageMembers(businessId, userId);
    if (!canInvite) {
      throwForbidden(ErrorCode.AUTHZ_ROLE_INSUFFICIENT);
    }

    const existingInvitation = await this.prisma.invitation.findFirst({
      where: {
        email,
        businessId,
        status: InvitationStatus.PENDING,
      },
    });

    if (existingInvitation) {
      throwBadRequest(ErrorCode.MEMBER_ALREADY_EXISTS);
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await this.prisma.invitation.create({
      data: {
        email,
        businessId,
        invitedBy: userId,
        role: dto.role,
        expiresAt,
        status: InvitationStatus.PENDING,
      },
    });

    await this.emailService.sendInvitationEmail(
      invitation.email,
      invitation.token,
    );

    return {
      message: "Đã gửi lời mời thành công",
      data: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
      },
    };
  }

  // ==================== ACCEPT INVITATION ====================
  async acceptInvitation(
    userId: string,
    userEmail: string,
    dto: { token: string },
  ) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token: dto.token },
    });

    if (!invitation) {
      throwNotFound(ErrorCode.MEMBER_INVITATION_INVALID);
    }

    if (invitation!.status !== InvitationStatus.PENDING) {
      throwBadRequest(ErrorCode.MEMBER_INVITATION_INVALID);
    }

    if (invitation!.email !== userEmail) {
      throwBadRequest(ErrorCode.MEMBER_INVITATION_INVALID);
    }

    if (new Date() > invitation!.expiresAt) {
      await this.prisma.invitation.update({
        where: { id: invitation!.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      throwBadRequest(ErrorCode.MEMBER_INVITATION_EXPIRED);
    }

    const member = await this.prisma.member.create({
      data: {
        businessId: invitation!.businessId,
        userId,
        role: invitation!.role,
        status: MemberStatus.ACTIVE,
        invitedAt: new Date(),
        invitedBy: invitation!.invitedBy,
        acceptedAt: new Date(),
      },
    });

    await this.prisma.invitation.update({
      where: { id: invitation!.id },
      data: {
        status: InvitationStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
    });

    return {
      message: "Chấp nhận lời mời thành công",
      data: member,
    };
  }

  // ==================== GET MEMBERS ====================
  async getMembers(businessId: string, userId: string) {
    await this.checkMemberAccess(businessId, userId);

    const members = await this.prisma.member.findMany({
      where: {
        businessId,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });

    if (members.length === 0) {
      return { data: [] };
    }

    const userIds = members.map((m) => m.userId);
    let userMap: Record<
      string,
      {
        fullName: string;
        email: string;
        phone: string | null;
        avatar: string | null;
      }
    > = {};

    try {
      const pgClient = this.getIdentityDbClient();
      await pgClient.connect();
      const res = await pgClient.query(
        "SELECT id, full_name, email, phone, avatar FROM users WHERE id = ANY($1)",
        [userIds],
      );
      await pgClient.end();

      for (const row of res.rows) {
        userMap[row.id] = {
          fullName: row.full_name,
          email: row.email,
          phone: row.phone,
          avatar: row.avatar,
        };
      }
    } catch (err: any) {
      console.warn(
        "[MemberService] Failed to load user details from identity DB:",
        err?.message || err,
      );
    }

    const enrichedMembers = members.map((m) => ({
      ...m,
      user: userMap[m.userId] || {
        fullName: "Nhân viên",
        email: "staff@huki.vn",
        phone: null,
        avatar: null,
      },
    }));

    return { data: enrichedMembers };
  }

  async getMember(businessId: string, memberId: string) {
    const member = await this.prisma.member.findFirst({
      where: {
        id: memberId,
        businessId,
        deletedAt: null,
      },
    });

    if (!member) {
      throwNotFound(ErrorCode.MEMBER_NOT_FOUND);
    }

    let userInfo: any = null;
    try {
      const pgClient = this.getIdentityDbClient();
      await pgClient.connect();
      const res = await pgClient.query(
        "SELECT id, full_name, email, phone, avatar FROM users WHERE id = $1 LIMIT 1",
        [member!.userId],
      );
      await pgClient.end();
      if (res.rows.length > 0) {
        userInfo = {
          fullName: res.rows[0].full_name,
          email: res.rows[0].email,
          phone: res.rows[0].phone,
          avatar: res.rows[0].avatar,
        };
      }
    } catch (err) {
      // Ignore
    }

    return {
      ...member!,
      user: userInfo,
    };
  }

  // ==================== UPDATE MEMBER PERMISSIONS ====================
  async updateMemberPermissions(
    businessId: string,
    memberId: string,
    adminId: string,
    permissions: string[],
  ) {
    const isOwner = await this.isOwner(businessId, adminId);
    if (!isOwner) {
      throwForbidden(ErrorCode.AUTHZ_ROLE_INSUFFICIENT);
    }

    const member = await this.prisma.member.findFirst({
      where: { id: memberId, businessId, deletedAt: null },
    });
    if (!member) {
      throwNotFound(ErrorCode.MEMBER_NOT_FOUND);
    }

    if (member!.role === MemberRole.OWNER) {
      throwBadRequest(ErrorCode.MEMBER_ROLE_IMMUTABLE);
    }

    const updated = await this.prisma.member.update({
      where: { id: memberId },
      data: { permissions },
    });

    return {
      message: "Cập nhật phân quyền thành công",
      data: updated,
    };
  }

  // ==================== UPDATE MEMBER STATUS ====================
  async updateMemberStatus(
    businessId: string,
    memberId: string,
    adminId: string,
    status: MemberStatus,
  ) {
    const isOwner = await this.isOwner(businessId, adminId);
    if (!isOwner) {
      throwForbidden(ErrorCode.AUTHZ_ROLE_INSUFFICIENT);
    }

    const member = await this.prisma.member.findFirst({
      where: { id: memberId, businessId, deletedAt: null },
    });
    if (!member) {
      throwNotFound(ErrorCode.MEMBER_NOT_FOUND);
    }

    if (member!.role === MemberRole.OWNER) {
      throwBadRequest(ErrorCode.MEMBER_ROLE_IMMUTABLE);
    }

    const updated = await this.prisma.member.update({
      where: { id: memberId },
      data: { status },
    });

    return {
      message: "Cập nhật trạng thái thành công",
      data: updated,
    };
  }

  // ==================== RESET MEMBER PASSWORD ====================
  async resetMemberPassword(
    businessId: string,
    memberId: string,
    adminId: string,
    newPassword?: string,
  ) {
    const isOwner = await this.isOwner(businessId, adminId);
    if (!isOwner) {
      throwForbidden(ErrorCode.AUTHZ_ROLE_INSUFFICIENT);
    }

    const member = await this.prisma.member.findFirst({
      where: { id: memberId, businessId, deletedAt: null },
    });
    if (!member) {
      throwNotFound(ErrorCode.MEMBER_NOT_FOUND);
    }

    if (member!.role === MemberRole.OWNER) {
      throwBadRequest(ErrorCode.MEMBER_ROLE_IMMUTABLE);
    }

    const bcrypt = require("bcrypt");
    const pass = newPassword?.trim() || "Staff123!";
    const passwordHash = await bcrypt.hash(pass, 12);

    const pgClient = this.getIdentityDbClient();
    await pgClient.connect();
    try {
      await pgClient.query(
        "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
        [passwordHash, member!.userId],
      );
    } finally {
      await pgClient.end();
    }

    return {
      message: "Đặt lại mật khẩu thành công",
      data: { temporaryPassword: pass },
    };
  }

  // ==================== UPDATE MEMBER ROLE ====================
  async updateMemberRole(
    businessId: string,
    memberId: string,
    adminId: string,
    newRole: string,
  ) {
    const isOwner = await this.isOwner(businessId, adminId);
    if (!isOwner) {
      throwForbidden(ErrorCode.AUTHZ_ROLE_INSUFFICIENT);
    }

    const member = await this.prisma.member.findFirst({
      where: { id: memberId, businessId, deletedAt: null },
    });
    if (!member) {
      throwNotFound(ErrorCode.MEMBER_NOT_FOUND);
    }

    if (member!.role === MemberRole.OWNER) {
      throwBadRequest(ErrorCode.MEMBER_ROLE_IMMUTABLE);
    }

    return this.prisma.member.update({
      where: { id: memberId },
      data: { role: newRole as any },
    });
  }

  // ==================== REMOVE MEMBER ====================
  async removeMember(businessId: string, memberId: string, adminId: string) {
    const isOwner = await this.isOwner(businessId, adminId);
    if (!isOwner) {
      throwForbidden(ErrorCode.AUTHZ_ROLE_INSUFFICIENT);
    }

    const member = await this.prisma.member.findFirst({
      where: { id: memberId, businessId, deletedAt: null },
    });
    if (!member) {
      throwNotFound(ErrorCode.MEMBER_NOT_FOUND);
    }

    if (member!.role === MemberRole.OWNER) {
      throwBadRequest(ErrorCode.MEMBER_ROLE_IMMUTABLE);
    }

    return this.prisma.member.update({
      where: { id: memberId },
      data: { deletedAt: new Date() },
    });
  }

  // ==================== LEAVE BUSINESS ====================
  async leaveBusiness(businessId: string, userId: string) {
    const member = await this.prisma.member.findUnique({
      where: {
        businessId_userId: {
          businessId,
          userId,
        },
      },
    });

    if (!member) {
      throwNotFound(ErrorCode.MEMBER_NOT_FOUND);
    }

    if (member!.role === MemberRole.OWNER) {
      throwBadRequest(ErrorCode.MEMBER_CANNOT_LEAVE);
    }

    return this.prisma.member.update({
      where: { id: member!.id },
      data: { deletedAt: new Date() },
    });
  }

  // ==================== HELPERS ====================
  private async canManageMembers(
    businessId: string,
    userId: string,
  ): Promise<boolean> {
    const isOwner = await this.isOwner(businessId, userId);
    if (isOwner) return true;

    const member = await this.prisma.member.findUnique({
      where: {
        businessId_userId: {
          businessId,
          userId,
        },
      },
    });

    if (!member || member.status !== MemberStatus.ACTIVE) {
      return false;
    }

    if (member.role === MemberRole.MANAGER) return true;

    if (Array.isArray(member.permissions)) {
      return (
        member.permissions.includes("MEMBER_MANAGE") ||
        member.permissions.includes("*")
      );
    }

    return false;
  }

  private async isOwner(businessId: string, userId: string): Promise<boolean> {
    const business = await this.prisma.business.findFirst({
      where: { id: businessId, ownerId: userId, deletedAt: null },
    });
    if (business) return true;

    return this.checkMemberRole(businessId, userId, [MemberRole.OWNER]);
  }

  private async checkMemberAccess(
    businessId: string,
    userId: string,
  ): Promise<boolean> {
    const isOwner = await this.isOwner(businessId, userId);
    if (isOwner) return true;

    const member = await this.prisma.member.findUnique({
      where: {
        businessId_userId: {
          businessId,
          userId,
        },
      },
    });

    return !!(member && member.status === MemberStatus.ACTIVE);
  }

  private async checkMemberRole(
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

    if (!member || member.status !== MemberStatus.ACTIVE) {
      return false;
    }

    return allowedRoles.includes(member.role);
  }
}
