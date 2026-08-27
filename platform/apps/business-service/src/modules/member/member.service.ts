import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { InviteMemberDto } from "./dto/member.dto";
import {
  InvitationStatus,
  MemberStatus,
} from "../../../prisma/generated/client";
import {
  throwNotFound,
  throwBadRequest,
  throwForbidden,
} from "@huki/shared/errors";
import { ErrorCode } from "@huki/shared/errors";
import { EmailService } from "@huki/shared";

@Injectable()
export class MemberService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  // ==================== INVITE MEMBER ====================
  async inviteMember(businessId: string, userId: string, dto: InviteMemberDto) {
    const email = dto.email.trim().toLowerCase();
    // Check if inviter is owner or manager
    const canInvite = await this.canManageMembers(businessId, userId);
    if (!canInvite) {
      throwForbidden(ErrorCode.AUTHZ_ROLE_INSUFFICIENT);
    }

    // Check if email already invited
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

    // Create invitation (expires in 7 days)
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

    // Create member
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

    // Update invitation
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
    // Check permission
    await this.checkMemberAccess(businessId, userId);

    const members = await this.prisma.member.findMany({
      where: {
        businessId,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });

    return { data: members };
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

    return member;
  }

  // ==================== UPDATE MEMBER ====================
  async updateMemberRole(
    businessId: string,
    memberId: string,
    adminId: string,
    newRole: string,
  ) {
    // Only owner can change roles
    const isOwner = await this.isOwner(businessId, adminId);
    if (!isOwner) {
      throwForbidden(ErrorCode.AUTHZ_ROLE_INSUFFICIENT);
    }

    const member = await this.getMember(businessId, memberId);

    // Cannot change owner role
    if (member!.role === "OWNER") {
      throwBadRequest(ErrorCode.MEMBER_ROLE_IMMUTABLE);
    }

    return this.prisma.member.update({
      where: { id: memberId },
      data: { role: newRole as any },
    });
  }

  // ==================== REMOVE MEMBER ====================
  async removeMember(businessId: string, memberId: string, adminId: string) {
    // Only owner can remove members
    const isOwner = await this.isOwner(businessId, adminId);
    if (!isOwner) {
      throwForbidden(ErrorCode.AUTHZ_ROLE_INSUFFICIENT);
    }

    const member = await this.getMember(businessId, memberId);

    if (member!.role === "OWNER") {
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

    if (member!.role === "OWNER") {
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
    return this.checkMemberRole(businessId, userId, ["OWNER", "MANAGER"]);
  }

  private async isOwner(businessId: string, userId: string): Promise<boolean> {
    return this.checkMemberRole(businessId, userId, ["OWNER"]);
  }

  private async checkMemberAccess(
    businessId: string,
    userId: string,
  ): Promise<boolean> {
    return this.checkMemberRole(businessId, userId, [
      "OWNER",
      "MANAGER",
      "ORDER_STAFF",
      "CONTENT_STAFF",
      "FINANCE_STAFF",
    ]);
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

    if (!member || member.status !== "ACTIVE") {
      return false;
    }

    return allowedRoles.includes(member.role);
  }
}
