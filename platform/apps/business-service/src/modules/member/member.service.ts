import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { InviteMemberDto } from './dto/member.dto';
import { InvitationStatus, MemberStatus } from '../../../prisma/generated/client';

@Injectable()
export class MemberService {
  constructor(private prisma: PrismaService) {}

  // ==================== INVITE MEMBER ====================
  async inviteMember(businessId: string, userId: string, dto: InviteMemberDto) {
    // Check if inviter is owner or manager
    const canInvite = await this.canManageMembers(businessId, userId);
    if (!canInvite) {
      throw new BadRequestException('Bạn không có quyền mời thành viên');
    }

    // Check if email already invited
    const existingInvitation = await this.prisma.invitation.findFirst({
      where: {
        email: dto.email,
        businessId,
        status: InvitationStatus.PENDING,
      },
    });

    if (existingInvitation) {
      throw new ConflictException('Lời mời đã được gửi đến email này');
    }

    // Check if user is already a member
    // Note: In real app, we need to lookup user by email first
    // For now, create invitation directly

    // Create invitation (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await this.prisma.invitation.create({
      data: {
        email: dto.email,
        businessId,
        invitedBy: userId,
        role: dto.role,
        expiresAt,
        status: InvitationStatus.PENDING,
      },
    });

    // TODO: Send email with invitation link
    // await this.emailService.sendInvitationEmail(dto.email, invitation.token);

    return {
      message: 'Đã gửi lời mời thành công',
      data: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
      },
    };
  }

  // ==================== ACCEPT INVITATION ====================
  async acceptInvitation(userId: string, userEmail: string, dto: { token: string }) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token: dto.token },
    });

    if (!invitation) {
      throw new NotFoundException('Lời mời không tồn tại');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Lời mời đã được xử lý');
    }

    if (invitation.email !== userEmail) {
      throw new BadRequestException('Email không khớp với lời mời');
    }

    if (new Date() > invitation.expiresAt) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      throw new BadRequestException('Lời mời đã hết hạn');
    }

    // Create member
    const member = await this.prisma.member.create({
      data: {
        businessId: invitation.businessId,
        userId,
        role: invitation.role,
        status: MemberStatus.ACTIVE,
        invitedAt: new Date(),
        invitedBy: invitation.invitedBy,
        acceptedAt: new Date(),
      },
    });

    // Update invitation
    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: InvitationStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
    });

    return {
      message: 'Chấp nhận lời mời thành công',
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
      orderBy: { createdAt: 'desc' },
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
      throw new NotFoundException('Thành viên không tồn tại');
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
      throw new BadRequestException('Chỉ chủ doanh nghiệp mới có quyền thay đổi vai trò');
    }

    const member = await this.getMember(businessId, memberId);

    // Cannot change owner role
    if (member.role === 'OWNER') {
      throw new BadRequestException('Không thể thay đổi vai trò của chủ doanh nghiệp');
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
      throw new BadRequestException('Chỉ chủ doanh nghiệp mới có quyền xóa thành viên');
    }

    const member = await this.getMember(businessId, memberId);

    if (member.role === 'OWNER') {
      throw new BadRequestException('Không thể xóa chủ doanh nghiệp');
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
      throw new NotFoundException('Bạn không phải thành viên của doanh nghiệp này');
    }

    if (member.role === 'OWNER') {
      throw new BadRequestException('Chủ doanh nghiệp không thể rời khỏi doanh nghiệp');
    }

    return this.prisma.member.update({
      where: { id: member.id },
      data: { deletedAt: new Date() },
    });
  }

  // ==================== HELPERS ====================
  private async canManageMembers(businessId: string, userId: string): Promise<boolean> {
    return this.checkMemberRole(businessId, userId, ['OWNER', 'MANAGER']);
  }

  private async isOwner(businessId: string, userId: string): Promise<boolean> {
    return this.checkMemberRole(businessId, userId, ['OWNER']);
  }

  private async checkMemberAccess(businessId: string, userId: string): Promise<boolean> {
    return this.checkMemberRole(businessId, userId, ['OWNER', 'MANAGER', 'ORDER_STAFF', 'CONTENT_STAFF', 'FINANCE_STAFF']);
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

    if (!member || member.status !== 'ACTIVE') {
      return false;
    }

    return allowedRoles.includes(member.role);
  }
}
