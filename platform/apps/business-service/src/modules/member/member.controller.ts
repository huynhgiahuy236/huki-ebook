import { Request } from 'express';
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody, ApiQuery } from '@nestjs/swagger';
import { MemberService } from './member.service';
import {
  InviteMemberDto,
  AcceptInvitationDto,
  UpdateMemberRoleDto,
  ProvisionMemberDto,
  UpdateMemberPermissionsDto,
  UpdateMemberStatusDto,
  ResetMemberPasswordDto,
} from './dto/member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@huki/shared/decorators';
import { ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';

@ApiTags('Members')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard)
export class MemberController {
  constructor(private memberService: MemberService) {}

  @Post('businesses/:businessId/members/provision')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Provision a new member directly (Owner only)' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Member provisioned' })
  @ApiStandardErrors(400, 401, 403, 404, 409)
  async provisionMember(
    @Param('businessId') businessId: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: ProvisionMemberDto,
  ) {
    return this.memberService.provisionMember(businessId, adminId, dto);
  }

  @Post('businesses/:businessId/members/invite')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Invite a new member' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Invitation sent' })
  @ApiStandardErrors(400, 401, 403, 404, 409)
  async inviteMember(
    @Param('businessId') businessId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.memberService.inviteMember(businessId, userId, dto);
  }

  @Post('invitations/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept invitation' })
  @ApiSuccessResponse(undefined, { description: 'Invitation accepted' })
  @ApiStandardErrors(400, 401, 404)
  async acceptInvitation(
    @CurrentUser('id') userId: string,
    @CurrentUser('email') email: string,
    @Body() dto: AcceptInvitationDto,
  ) {
    return this.memberService.acceptInvitation(userId, email, dto);
  }

  @Get('businesses/:businessId/members')
  @ApiOperation({ summary: 'Get all members of a business' })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Business members list' })
  @ApiStandardErrors(401, 403, 404)
  async getMembers(
    @Param('businessId') businessId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.memberService.getMembers(businessId, userId);
  }

  @Get('businesses/:businessId/members/:memberId')
  @ApiOperation({ summary: 'Get a specific member' })
  @ApiSuccessResponse(undefined, { description: 'Member detail' })
  @ApiStandardErrors(401, 404)
  async getMember(
    @Param('businessId') businessId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.memberService.getMember(businessId, memberId);
  }

  @Patch('businesses/:businessId/members/:memberId/permissions')
  @ApiOperation({ summary: 'Update member permissions (Owner only)' })
  @ApiSuccessResponse(undefined, { description: 'Member permissions updated' })
  @ApiStandardErrors(400, 401, 403, 404)
  async updateMemberPermissions(
    @Param('businessId') businessId: string,
    @Param('memberId') memberId: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: UpdateMemberPermissionsDto,
  ) {
    return this.memberService.updateMemberPermissions(
      businessId,
      memberId,
      adminId,
      dto.permissions,
    );
  }

  @Patch('businesses/:businessId/members/:memberId/status')
  @ApiOperation({ summary: 'Update member status (Owner only)' })
  @ApiSuccessResponse(undefined, { description: 'Member status updated' })
  @ApiStandardErrors(400, 401, 403, 404)
  async updateMemberStatus(
    @Param('businessId') businessId: string,
    @Param('memberId') memberId: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: UpdateMemberStatusDto,
  ) {
    return this.memberService.updateMemberStatus(
      businessId,
      memberId,
      adminId,
      dto.status,
    );
  }

  @Post('businesses/:businessId/members/:memberId/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset member password (Owner only)' })
  @ApiSuccessResponse(undefined, { description: 'Member password reset' })
  @ApiStandardErrors(400, 401, 403, 404)
  async resetMemberPassword(
    @Param('businessId') businessId: string,
    @Param('memberId') memberId: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: ResetMemberPasswordDto,
  ) {
    return this.memberService.resetMemberPassword(
      businessId,
      memberId,
      adminId,
      dto.newPassword,
    );
  }

  @Patch('businesses/:businessId/members/:memberId/role')
  @ApiOperation({ summary: 'Update member role (owner only)' })
  @ApiSuccessResponse(undefined, { description: 'Member role updated' })
  @ApiStandardErrors(400, 401, 403, 404)
  async updateMemberRole(
    @Param('businessId') businessId: string,
    @Param('memberId') memberId: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    const member = await this.memberService.updateMemberRole(
      businessId,
      memberId,
      adminId,
      dto.role,
    );
    return { message: 'Cập nhật vai trò thành công', data: member };
  }

  @Delete('businesses/:businessId/members/:memberId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove member (owner only)' })
  @ApiSuccessResponse(undefined, { description: 'Member removed' })
  @ApiStandardErrors(401, 403, 404)
  async removeMember(
    @Param('businessId') businessId: string,
    @Param('memberId') memberId: string,
    @CurrentUser('id') adminId: string,
  ) {
    await this.memberService.removeMember(businessId, memberId, adminId);
    return { message: 'Xóa thành viên thành công' };
  }

  @Post('businesses/:businessId/leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Leave a business' })
  @ApiSuccessResponse(undefined, { description: 'Left business' })
  @ApiStandardErrors(400, 401, 404)
  async leaveBusiness(
    @Param('businessId') businessId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.memberService.leaveBusiness(businessId, userId);
    return { message: 'Rời doanh nghiệp thành công' };
  }

  @Get('members/business/:businessId/audit-logs')
  @ApiOperation({ summary: 'Get member governance audit logs (Store Owner / Authorized Staff / Admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiQuery({ name: 'resource', required: false, type: String })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Member audit logs' })
  @ApiStandardErrors(401, 403, 404)
  async getMemberAuditLogs(
    @Param('businessId') businessId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('resource') resource?: string,
  ) {
    const data = await this.memberService.getMemberAuditLogs(businessId, userId, userRole, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
      action,
      resource,
    });
    return {
      success: true,
      data,
    };
  }

  @Get('businesses/:businessId/members/audit-logs')
  @ApiOperation({ summary: 'Get member governance audit logs alias' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiQuery({ name: 'resource', required: false, type: String })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Member audit logs' })
  @ApiStandardErrors(401, 403, 404)
  async getBusinessMembersAuditLogs(
    @Param('businessId') businessId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('resource') resource?: string,
  ) {
    const data = await this.memberService.getMemberAuditLogs(businessId, userId, userRole, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
      action,
      resource,
    });
    return {
      success: true,
      data,
    };
  }

  @Post('members/business/:businessId/audit-logs')
  @ApiOperation({ summary: 'Record store/staff governance audit log' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['action', 'resource'],
      properties: {
        action: { type: 'string' },
        resource: { type: 'string' },
        resourceId: { type: 'string' },
        actorName: { type: 'string' },
        actorEmail: { type: 'string' },
        actorRole: { type: 'string' },
        beforeState: { type: 'object' },
        afterState: { type: 'object' },
        changedFields: { type: 'array', items: { type: 'string' } },
        metadata: { type: 'object' },
      },
    },
  })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Audit log recorded' })
  @ApiStandardErrors(400, 401, 403)
  async recordAuditLog(
    @Param('businessId') businessId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Body() dto: {
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
    @Req() req: Request,
  ) {
    const res = await this.memberService.recordAuditLog(businessId, userId, userRole, dto, req);
    return {
      success: true,
      data: res,
    };
  }

  @Post('businesses/:businessId/members/audit-logs')
  @ApiOperation({ summary: 'Record store/staff governance audit log alias' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['action', 'resource'],
      properties: {
        action: { type: 'string' },
        resource: { type: 'string' },
        resourceId: { type: 'string' },
        actorName: { type: 'string' },
        actorEmail: { type: 'string' },
        actorRole: { type: 'string' },
        beforeState: { type: 'object' },
        afterState: { type: 'object' },
        changedFields: { type: 'array', items: { type: 'string' } },
        metadata: { type: 'object' },
      },
    },
  })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Audit log recorded' })
  @ApiStandardErrors(400, 401, 403)
  async recordBusinessAuditLogAlias(
    @Param('businessId') businessId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Body() dto: {
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
    @Req() req: Request,
  ) {
    const res = await this.memberService.recordAuditLog(businessId, userId, userRole, dto, req);
    return {
      success: true,
      data: res,
    };
  }
}
