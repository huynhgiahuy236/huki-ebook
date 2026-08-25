import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MemberService } from './member.service';
import { InviteMemberDto, AcceptInvitationDto, UpdateMemberRoleDto } from './dto/member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@huki/shared/decorators';

@ApiTags('Members')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard)
export class MemberController {
  constructor(private memberService: MemberService) {}

  @Post('businesses/:businessId/members/invite')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Invite a new member' })
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
  async acceptInvitation(
    @CurrentUser('id') userId: string,
    @CurrentUser('email') email: string,
    @Body() dto: AcceptInvitationDto,
  ) {
    return this.memberService.acceptInvitation(userId, email, dto);
  }

  @Get('businesses/:businessId/members')
  @ApiOperation({ summary: 'Get all members of a business' })
  async getMembers(
    @Param('businessId') businessId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.memberService.getMembers(businessId, userId);
  }

  @Get('businesses/:businessId/members/:memberId')
  @ApiOperation({ summary: 'Get a specific member' })
  async getMember(
    @Param('businessId') businessId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.memberService.getMember(businessId, memberId);
  }

  @Patch('businesses/:businessId/members/:memberId/role')
  @ApiOperation({ summary: 'Update member role (owner only)' })
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
  async leaveBusiness(
    @Param('businessId') businessId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.memberService.leaveBusiness(businessId, userId);
    return { message: 'Rời doanh nghiệp thành công' };
  }
}
