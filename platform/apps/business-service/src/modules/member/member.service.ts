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
import { AuditService } from "../audit/audit.service";
import { AuditAction, AuditActorContext } from "@huki/shared";
import { randomUUID } from "node:crypto";
import { IdentityClientService } from "../identity/identity-client.service";

@Injectable()
export class MemberService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly identity: IdentityClientService,
    private readonly auditService?: AuditService,
  ) {}

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
    let targetUserId: string;
    const initialPass = dto.initialPassword?.trim() || "Staff123!";
    const identityUser = await this.identity.lookupByEmail(email);
    if (identityUser) {
      targetUserId = identityUser.id;
      const existingMember = await this.prisma.member.findFirst({ where: { businessId, userId: targetUserId, deletedAt: null } });
      if (existingMember) throwBadRequest(ErrorCode.MEMBER_ALREADY_EXISTS);
      await this.identity.prepareMemberAccess(targetUserId);
    } else {
      const created = await this.identity.createMemberAccount({ fullName: dto.fullName, email, phone: dto.phone, password: initialPass });
      targetUserId = created.id;
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

    // Record Audit Log (sensitive initialPassword is never logged)
    await this.auditService?.record({
      actor: {
        actorId: adminId,
        actorRole: 'OWNER',
      },
      module: 'STAFF',
      action: AuditAction.INVITE,
      resource: 'Member',
      resourceId: member.id,
      storeId: businessId,
      afterState: {
        id: member.id,
        businessId: member.businessId,
        userId: member.userId,
        role: member.role,
        status: member.status,
        permissions: member.permissions,
        email,
        fullName: dto.fullName,
      },
      changedFields: ['id', 'userId', 'role', 'status', 'permissions'],
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

    // Record Audit Log
    await this.auditService?.record({
      actor: {
        actorId: userId,
        actorRole: 'OWNER',
      },
      module: 'STAFF',
      action: AuditAction.INVITE,
      resource: 'Invitation',
      resourceId: invitation.id,
      storeId: businessId,
      afterState: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        businessId: invitation.businessId,
        expiresAt: invitation.expiresAt,
      },
      changedFields: ['email', 'role', 'businessId'],
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
      const profiles = await this.identity.getProfiles(userIds);
      for (const row of profiles) {
        userMap[row.id] = { fullName: row.fullName, email: row.email, phone: row.phone, avatar: row.avatar };
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
      userInfo = (await this.identity.getProfiles([member.userId]))[0] || null;
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

    // Record Audit Log
    await this.auditService?.record({
      actor: {
        actorId: adminId,
        actorRole: 'OWNER',
      },
      module: 'STAFF',
      action: AuditAction.PERMISSION_CHANGE,
      resource: 'Member',
      resourceId: memberId,
      storeId: businessId,
      beforeState: { permissions: member.permissions },
      afterState: { permissions: updated.permissions },
      changedFields: ['permissions'],
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

    // Record Audit Log
    await this.auditService?.record({
      actor: {
        actorId: adminId,
        actorRole: 'OWNER',
      },
      module: 'STAFF',
      action: AuditAction.UPDATE,
      resource: 'Member',
      resourceId: memberId,
      storeId: businessId,
      beforeState: { status: member.status },
      afterState: { status: updated.status },
      changedFields: ['status'],
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

    const pass = newPassword?.trim() || "Staff123!";
    await this.identity.resetPassword(member.userId, pass);

    // Record Audit Log (Password is NEVER logged)
    await this.auditService?.record({
      actor: {
        actorId: adminId,
        actorRole: 'OWNER',
      },
      module: 'STAFF',
      action: AuditAction.UPDATE,
      resource: 'Member',
      resourceId: memberId,
      storeId: businessId,
      afterState: { id: memberId, userId: member.userId, passwordReset: true },
      changedFields: ['passwordReset'],
    });

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

    const updated = await this.prisma.member.update({
      where: { id: memberId },
      data: { role: newRole as any },
    });

    // Record Audit Log
    await this.auditService?.record({
      actor: {
        actorId: adminId,
        actorRole: 'OWNER',
      },
      module: 'STAFF',
      action: AuditAction.ROLE_CHANGE,
      resource: 'Member',
      resourceId: memberId,
      storeId: businessId,
      beforeState: { role: member.role },
      afterState: { role: updated.role },
      changedFields: ['role'],
    });

    return updated;
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

    const updated = await this.prisma.member.update({
      where: { id: memberId },
      data: { deletedAt: new Date() },
    });

    // Record Audit Log
    await this.auditService?.record({
      actor: {
        actorId: adminId,
        actorRole: 'OWNER',
      },
      module: 'STAFF',
      action: AuditAction.DELETE,
      resource: 'Member',
      resourceId: memberId,
      storeId: businessId,
      beforeState: { id: member.id, role: member.role, status: member.status, deletedAt: null },
      afterState: { id: updated.id, deletedAt: updated.deletedAt },
      changedFields: ['deletedAt'],
    });

    return updated;
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

  // ==================== GOVERNANCE AUDIT LOGS ====================
  async getMemberAuditLogs(
    businessId: string,
    userId: string,
    userRole: string,
    query: { page?: number; limit?: number; action?: string; resource?: string },
  ) {
    let targetBizId = businessId;
    const store = await this.prisma.store.findUnique({
      where: { id: businessId },
      select: { businessId: true },
    });
    if (store?.businessId) {
      targetBizId = store.businessId;
    }

    if (userRole !== 'PLATFORM_ADMIN') {
      const hasAccess = await this.canManageMembers(targetBizId, userId);
      if (!hasAccess) {
        throwForbidden(ErrorCode.AUTHZ_ROLE_INSUFFICIENT);
      }
    }

    if (!this.auditService) {
      return {
        items: [],
        total: 0,
        page: query.page || 1,
        limit: query.limit || 50,
      };
    }

    const filterResource = query.resource && query.resource !== 'ALL' ? query.resource : undefined;

    return this.auditService.queryAuditLogs({
      resource: filterResource,
      storeId: targetBizId,
      page: query.page,
      limit: query.limit,
      action: query.action,
    });
  }

  async recordAuditLog(
    businessId: string,
    userId: string,
    userRole: string,
    dto: {
      action: string;
      resource: string;
      resourceId?: string;
      actorName?: string;
      actorEmail?: string;
      actorRole?: string;
      beforeState?: any;
      afterState?: any;
      changedFields?: string[];
      metadata?: any;
    },
    req?: any,
  ) {
    let targetBizId = businessId;
    const store = await this.prisma.store.findUnique({
      where: { id: businessId },
      select: { businessId: true },
    });
    if (store?.businessId) {
      targetBizId = store.businessId;
    }

    if (userRole !== 'PLATFORM_ADMIN') {
      const isOwner = await this.isOwner(targetBizId, userId);
      if (!isOwner) {
        const member = await this.prisma.member.findUnique({
          where: { businessId_userId: { businessId: targetBizId, userId } },
        });
        if (!member || member.status !== MemberStatus.ACTIVE) {
          throwForbidden(ErrorCode.AUTHZ_ROLE_INSUFFICIENT);
        }
      }
    }

    if (!this.auditService) {
      return { success: false, message: 'AuditService not available' };
    }

    const ip = req?.ip || req?.headers?.['x-forwarded-for'] || '127.0.0.1';
    const userAgent = req?.headers?.['user-agent'] || 'Mozilla/5.0';

    await this.auditService.record({
      actorId: userId,
      actorRole: dto.actorRole || userRole,
      storeId: targetBizId,
      resource: dto.resource || 'Order',
      resourceId: dto.resourceId,
      action: dto.action,
      beforeState: dto.beforeState,
      afterState: dto.afterState,
      changedFields: dto.changedFields,
      ipAddress: typeof ip === 'string' ? ip : String(ip),
      userAgent: typeof userAgent === 'string' ? userAgent : String(userAgent),
      metadata: {
        ...(dto.metadata || {}),
        staffName: dto.actorName,
        staffEmail: dto.actorEmail,
        staffRole: dto.actorRole,
      },
    });

    return { success: true };
  }
}
