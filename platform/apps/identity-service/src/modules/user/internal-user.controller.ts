import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiBody } from '@nestjs/swagger';
import { ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';
import { UserService } from './user.service';

class InternalAuthGuard {
  canActivate(context: any): boolean {
    const request = context.switchToHttp().getRequest();
    const expected = process.env.INTERNAL_SERVICE_KEY;
    const supplied = request.headers['x-internal-service-key'];
    if (!expected || supplied !== expected) {
      throw new HttpException('Unauthorized internal service', HttpStatus.UNAUTHORIZED);
    }
    return true;
  }
}

@ApiTags('Internal - Users')
@ApiHeader({ name: 'x-internal-service-key', required: true, description: 'Internal service authentication key' })
@Controller('internal/users')
@UseGuards(InternalAuthGuard)
export class InternalUserController {
  constructor(private readonly userService: UserService) {}

  @Post('lookup-by-email')
  @ApiOperation({ summary: 'Internal: Lookup user by email' })
  @ApiBody({ schema: { type: 'object', required: ['email'], properties: { email: { type: 'string', example: 'user@huki.com' } } } })
  @ApiSuccessResponse(undefined, { description: 'User basic info or null' })
  @ApiStandardErrors(401)
  async lookupByEmail(@Body() body: { email: string }) {
    const user = await this.userService.findByEmail(body.email || '');
    return { data: user ? { id: user.id, role: user.role } : null };
  }

  @Post('member-accounts')
  @ApiOperation({ summary: 'Internal: Create business member account' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['fullName', 'email', 'password'],
      properties: {
        fullName: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string', nullable: true },
        password: { type: 'string' },
      },
    },
  })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Member account created' })
  @ApiStandardErrors(400, 401, 409)
  async createMemberAccount(@Body() body: { fullName: string; email: string; phone?: string | null; password: string }) {
    return { data: await this.userService.createBusinessMemberAccount(body) };
  }

  @Patch(':id/member-access')
  @ApiOperation({ summary: 'Internal: Prepare business member access' })
  @ApiSuccessResponse(undefined, { description: 'Member access prepared' })
  @ApiStandardErrors(401, 404)
  async prepareMemberAccess(@Param('id') id: string) {
    return { data: await this.userService.prepareBusinessMemberAccess(id) };
  }

  @Patch(':id/password')
  @ApiOperation({ summary: 'Internal: Reset user password' })
  @ApiBody({ schema: { type: 'object', required: ['password'], properties: { password: { type: 'string' } } } })
  @ApiSuccessResponse(undefined, { description: 'Password reset' })
  @ApiStandardErrors(400, 401, 404)
  async resetPassword(@Param('id') id: string, @Body() body: { password: string }) {
    return { data: await this.userService.resetPasswordInternally(id, body.password) };
  }

  @Patch(':id/business-role')
  @ApiOperation({ summary: 'Internal: Set business role for user' })
  @ApiSuccessResponse(undefined, { description: 'Business role updated' })
  @ApiStandardErrors(401, 404)
  async setBusinessRole(@Param('id') id: string) {
    return { data: await this.userService.setBusinessRoleInternally(id) };
  }

  @Post('profiles')
  @ApiOperation({ summary: 'Internal: Batch fetch public user profiles' })
  @ApiBody({ schema: { type: 'object', required: ['userIds'], properties: { userIds: { type: 'array', items: { type: 'string' } } } } })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Public profiles list' })
  @ApiStandardErrors(401)
  async profiles(@Body() body: { userIds: string[] }) {
    return { data: await this.userService.getPublicProfiles(body.userIds || []) };
  }

  @Get('by-role/:role')
  @ApiOperation({ summary: 'Internal: List users by role' })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Users list by role' })
  @ApiStandardErrors(401)
  async listByRole(@Param('role') role: string) {
    return { data: await this.userService.findUsersByRole(role) };
  }
}
