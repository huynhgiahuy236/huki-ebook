import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../../libs/shared/src/decorators/current-user.decorator';
import { UserService } from './user.service';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get('profile')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser() user: any) {
    return { data: user };
  }

  @Patch('profile')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
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

  // ===================== ADMIN USER MANAGEMENT APIS =====================
  @Get('admin/all')
  @ApiOperation({ summary: 'Admin get all users with store info' })
  async getAllUsersForAdmin(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
  ) {
    return this.userService.getAllUsersForAdmin({ search, role, status });
  }

  @Post('admin/customer')
  @ApiOperation({ summary: 'Admin create customer account' })
  async createCustomerByAdmin(
    @Body() dto: { fullName: string; email: string; phone: string; password?: string },
  ) {
    return this.userService.createCustomerByAdmin(dto);
  }

  @Patch('admin/:id')
  @ApiOperation({ summary: 'Admin update user' })
  async updateUserByAdmin(
    @Param('id') id: string,
    @Body() dto: { fullName?: string; email?: string; phone?: string; password?: string; role?: string; status?: string; storeName?: string },
  ) {
    return this.userService.updateUserByAdmin(id, dto);
  }

  @Post('admin/:id/toggle-lock')
  @ApiOperation({ summary: 'Admin toggle user lock status' })
  async toggleLockByAdmin(@Param('id') id: string) {
    return this.userService.toggleLockByAdmin(id);
  }

  @Delete('admin/:id')
  @ApiOperation({ summary: 'Admin delete user' })
  async deleteUserByAdmin(@Param('id') id: string) {
    return this.userService.deleteUserByAdmin(id);
  }
}
