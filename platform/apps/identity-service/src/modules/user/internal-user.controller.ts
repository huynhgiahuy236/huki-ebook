import {
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
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

@Controller('internal/users')
@UseGuards(InternalAuthGuard)
export class InternalUserController {
  constructor(private readonly userService: UserService) {}

  @Post('lookup-by-email')
  async lookupByEmail(@Body() body: { email: string }) {
    const user = await this.userService.findByEmail(body.email || '');
    return { data: user ? { id: user.id, role: user.role } : null };
  }

  @Post('member-accounts')
  async createMemberAccount(@Body() body: { fullName: string; email: string; phone?: string | null; password: string }) {
    return { data: await this.userService.createBusinessMemberAccount(body) };
  }

  @Patch(':id/member-access')
  async prepareMemberAccess(@Param('id') id: string) {
    return { data: await this.userService.prepareBusinessMemberAccess(id) };
  }

  @Patch(':id/password')
  async resetPassword(@Param('id') id: string, @Body() body: { password: string }) {
    return { data: await this.userService.resetPasswordInternally(id, body.password) };
  }

  @Patch(':id/business-role')
  async setBusinessRole(@Param('id') id: string) {
    return { data: await this.userService.setBusinessRoleInternally(id) };
  }

  @Post('profiles')
  async profiles(@Body() body: { userIds: string[] }) {
    return { data: await this.userService.getPublicProfiles(body.userIds || []) };
  }
}
