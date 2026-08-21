import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../../libs/shared/src/decorators/current-user.decorator';
import { UserService } from './user.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser() user: any) {
    return { data: user };
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() body: { fullName?: string; phone?: string; avatar?: string },
  ) {
    const user = await this.userService.updateProfile(userId, body);
    return {
      message: 'Profile updated',
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        avatar: user.avatar,
      },
    };
  }
}
