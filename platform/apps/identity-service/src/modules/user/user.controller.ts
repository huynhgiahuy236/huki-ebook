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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, CurrentUser, ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';

import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get('profile')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiSuccessResponse(undefined, { description: 'Current user profile' })
  @ApiStandardErrors(401, 404)
  async getProfile(@CurrentUser('id') userId: string) {
    const user = await this.userService.findById(userId);
    const prefs = (user.onboardingPreferences as Record<string, any>) || {};
    return {
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        status: user.status,
        deletionCount: user.deletionCount ?? 0,
        deletionScheduledAt: user.deletionScheduledAt,
        isPendingDeletion: user.status === 'PENDING_DELETION',
        hasCompletedOnboarding: user.hasCompletedOnboarding,
        primaryGoals: prefs.primaryGoals,
        favoriteGenres: prefs.favoriteGenres,
        preferredCategories: prefs.preferredCategories,
        preferredFormats: prefs.preferredFormats,
        preferredTheme: prefs.preferredTheme,
        readingHabits: prefs.readingHabits,
        dailyMinutesGoal: prefs.dailyMinutesGoal || prefs.readingHabits?.dailyMinutes,
        yearlyBooksTarget: prefs.yearlyBooksTarget || prefs.readingHabits?.yearlyBooksTarget,
        preferredReadingTime: prefs.preferredReadingTime || prefs.readingHabits?.preferredTime,
        wishlist: prefs.wishlist || [],
      },
    };
  }

  @Patch('profile')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiSuccessResponse(undefined, { description: 'Profile updated' })
  @ApiStandardErrors(400, 401)
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() body: UpdateProfileDto,
  ) {
    const user = await this.userService.updateProfile(userId, body);
    const prefs = (user.onboardingPreferences as Record<string, any>) || {};
    return {
      message: 'Profile updated',
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        status: user.status,
        deletionCount: user.deletionCount ?? 0,
        deletionScheduledAt: user.deletionScheduledAt,
        isPendingDeletion: user.status === 'PENDING_DELETION',
        hasCompletedOnboarding: user.hasCompletedOnboarding,
        primaryGoals: prefs.primaryGoals,
        favoriteGenres: prefs.favoriteGenres,
        preferredCategories: prefs.preferredCategories,
        preferredFormats: prefs.preferredFormats,
        preferredTheme: prefs.preferredTheme,
        readingHabits: prefs.readingHabits,
        dailyMinutesGoal: prefs.dailyMinutesGoal || prefs.readingHabits?.dailyMinutes,
        yearlyBooksTarget: prefs.yearlyBooksTarget || prefs.readingHabits?.yearlyBooksTarget,
        preferredReadingTime: prefs.preferredReadingTime || prefs.readingHabits?.preferredTime,
        wishlist: prefs.wishlist || [],
      },
    };
  }

  @Post('request-deletion-otp')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Request OTP for account deletion' })
  @ApiSuccessResponse(undefined, { description: 'Deletion OTP sent' })
  @ApiStandardErrors(400, 401)
  async requestDeletionOtp(@CurrentUser('id') userId: string) {
    return this.userService.requestDeletionOtp(userId);
  }

  @Post('confirm-deletion')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Confirm account deletion with GitHub-style text and OTP' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['confirmationText', 'otp'],
      properties: {
        confirmationText: { type: 'string', example: 'DELETE MY ACCOUNT' },
        otp: { type: 'string', example: '123456' },
        reason: { type: 'string', example: 'No longer needed' },
      },
    },
  })
  @ApiSuccessResponse(undefined, { description: 'Account deletion scheduled' })
  @ApiStandardErrors(400, 401)
  async confirmDeletion(
    @CurrentUser('id') userId: string,
    @Body() dto: { confirmationText: string; otp: string; reason?: string },
  ) {
    return this.userService.confirmDeletion(userId, dto);
  }

  @Post('cancel-deletion')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cancel pending account deletion within 7-day grace period' })
  @ApiSuccessResponse(undefined, { description: 'Account deletion cancelled' })
  @ApiStandardErrors(400, 401)
  async cancelDeletion(@CurrentUser('id') userId: string) {
    return this.userService.cancelDeletion(userId);
  }

  @Post('admin/:id/restore')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Admin restore user account' })
  @ApiSuccessResponse(undefined, { description: 'User account restored' })
  @ApiStandardErrors(401, 403, 404)
  async restoreUserByAdmin(@Param('id') id: string) {
    return this.userService.restoreUserByAdmin(id);
  }

  @Delete('profile')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete current user account (self-service)' })
  @ApiSuccessResponse(undefined, { description: 'Account deleted' })
  @ApiStandardErrors(401)
  async deleteSelf(@CurrentUser('id') userId: string) {
    return this.userService.deleteSelf(userId);
  }

  // ===================== ADMIN USER MANAGEMENT APIS =====================
  @Get('admin/all')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Admin get all users with store info' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Users list' })
  @ApiStandardErrors(401, 403)
  async getAllUsersForAdmin(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
  ) {
    return this.userService.getAllUsersForAdmin({ search, role, status });
  }

  @Post('admin/customer')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Admin create customer account' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['fullName', 'email', 'phone'],
      properties: {
        fullName: { type: 'string', example: 'Nguyen Van B' },
        email: { type: 'string', example: 'customer@huki.com' },
        phone: { type: 'string', example: '0912345678' },
        password: { type: 'string', example: 'Password123!' },
      },
    },
  })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Customer created' })
  @ApiStandardErrors(400, 401, 403, 409)
  async createCustomerByAdmin(
    @Body() dto: { fullName: string; email: string; phone: string; password?: string },
  ) {
    return this.userService.createCustomerByAdmin(dto);
  }

  @Patch('admin/:id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Admin update user' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        fullName: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        role: { type: 'string' },
        status: { type: 'string' },
        storeName: { type: 'string' },
      },
    },
  })
  @ApiSuccessResponse(undefined, { description: 'User updated' })
  @ApiStandardErrors(400, 401, 403, 404)
  async updateUserByAdmin(
    @Param('id') id: string,
    @Body() dto: { fullName?: string; email?: string; phone?: string; role?: string; status?: string; storeName?: string },
  ) {
    return this.userService.updateUserByAdmin(id, dto);
  }

  @Post('admin/:id/toggle-lock')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Admin toggle user lock status' })
  @ApiSuccessResponse(undefined, { description: 'User lock status toggled' })
  @ApiStandardErrors(401, 403, 404)
  async toggleLockByAdmin(@Param('id') id: string) {
    return this.userService.toggleLockByAdmin(id);
  }

  @Delete('admin/:id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Admin delete user' })
  @ApiSuccessResponse(undefined, { description: 'User deleted' })
  @ApiStandardErrors(401, 403, 404)
  async deleteUserByAdmin(@Param('id') id: string) {
    return this.userService.deleteUserByAdmin(id);
  }

  @Get('admin/:id/audit-logs')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Admin get user governance audit logs' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'User audit logs' })
  @ApiStandardErrors(401, 403, 404)
  async getUserAuditLogs(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
  ) {
    const data = await this.userService.getUserAuditLogs(id, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      action,
    });
    return {
      success: true,
      data,
    };
  }
}
