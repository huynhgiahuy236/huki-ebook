/**
 * HUKI EBOOK - Business Controller
 *
 * Handles business registration, management, and admin approval
 */

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
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { BusinessService } from './business.service';
import { CreateBusinessDto, UpdateBusinessDto } from './dto/business.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public, CurrentUser, Roles } from '@huki/shared/decorators';
import { RolesGuard } from '@huki/shared/guards';

@ApiTags('Business')
@ApiBearerAuth()
@Controller('businesses')
@UseGuards(JwtAuthGuard)
export class BusinessController {
  constructor(private businessService: BusinessService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new business',
    description: 'Creates a new business entity. User becomes the owner.',
  })
  @ApiResponse({ status: 201, description: 'Business registered successfully' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'User already has a business' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  async registerBusiness(
    @Body() dto: CreateBusinessDto,
    @CurrentUser('id') userId: string,
  ) {
    const business = await this.businessService.registerBusiness(userId, dto);
    return {
      message: 'Đăng ký doanh nghiệp thành công',
      data: business,
    };
  }

  @Get('my')
  @ApiOperation({
    summary: 'Get my business',
    description: 'Returns the business owned by the current user.',
  })
  @ApiResponse({ status: 200, description: 'Current user business' })
  @ApiNotFoundResponse({ description: 'User does not own a business' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  async getMyBusiness(@CurrentUser('id') userId: string) {
    const business = await this.businessService.getBusinessByOwner(userId);
    return { data: business };
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLATFORM_ADMIN')
  @ApiOperation({ summary: 'List businesses for platform administration' })
  async getAllBusinessesForAdmin(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.businessService.getAllBusinesses({
      status: status as any,
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    }, true);
  }

  @Get('following/my')
  @ApiOperation({
    summary: 'Get businesses followed by current user',
    description: 'Returns a list of businesses followed by the logged-in user with store details.',
  })
  @ApiResponse({ status: 200, description: 'List of followed businesses' })
  async getMyFollowedBusinesses(@CurrentUser('id') userId: string) {
    const data = await this.businessService.getMyFollowedBusinesses(userId);
    return {
      success: true,
      data,
    };
  }

  @Get('following/my-ids')
  @ApiOperation({
    summary: 'Get IDs of businesses followed by current user',
    description: 'Returns a list of business IDs followed by the logged-in user.',
  })
  @ApiResponse({ status: 200, description: 'List of followed business IDs' })
  async getMyFollowedBusinessIds(@CurrentUser('id') userId: string) {
    const data = await this.businessService.getMyFollowedBusinessIds(userId);
    return {
      success: true,
      data,
    };
  }

  @Get(':id/followers')
  @Public()
  @ApiOperation({
    summary: 'Get followers of a business (with pagination and search)',
    description: 'Returns paginated list of users following the specified business/store.',
  })
  @ApiParam({ name: 'id', description: 'Business ID' })
  async getBusinessFollowers(
    @Param('id') businessId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const data = await this.businessService.getBusinessFollowers(
      businessId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      search,
    );
    return {
      success: true,
      data,
    };
  }

  @Post(':id/follow')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Follow a business/publisher',
    description: 'Adds the business to the user\'s followed list.',
  })
  @ApiParam({ name: 'id', description: 'Business ID' })
  async followBusiness(
    @Param('id') businessId: string,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.businessService.followBusiness(userId, businessId);
    return {
      success: true,
      message: 'Đã theo dõi nhà xuất bản thành công',
      data: result,
    };
  }

  @Delete(':id/follow')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Unfollow a business/publisher',
    description: 'Removes the business from the user\'s followed list.',
  })
  @ApiParam({ name: 'id', description: 'Business ID' })
  async unfollowBusiness(
    @Param('id') businessId: string,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.businessService.unfollowBusiness(userId, businessId);
    return {
      success: true,
      message: 'Đã bỏ theo dõi nhà xuất bản',
      data: result,
    };
  }

  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Get business by ID',
    description: 'Returns business details by ID.',
  })
  @ApiParam({ name: 'id', description: 'Business ID' })
  @ApiResponse({ status: 200, description: 'Business details' })
  @ApiNotFoundResponse({ description: 'Business not found' })
  async getBusiness(@Param('id') id: string) {
    const business = await this.businessService.getBusinessById(id);
    return { data: business };
  }

  @Get()
  @Public()
  @ApiOperation({
    summary: 'List all businesses',
    description: 'Returns a paginated list of all businesses.',
  })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (APPROVED/PENDING/REJECTED)' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Paginated list of businesses' })
  async getAllBusinesses(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.businessService.getAllBusinesses({
      status: status as any,
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
    return result;
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update business',
    description: 'Updates business details. Only owner can update.',
  })
  @ApiParam({ name: 'id', description: 'Business ID' })
  @ApiResponse({ status: 200, description: 'Business updated successfully' })
  @ApiNotFoundResponse({ description: 'Business not found' })
  @ApiForbiddenResponse({ description: 'Not the business owner' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  async updateBusiness(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateBusinessDto,
  ) {
    const business = await this.businessService.updateBusiness(id, userId, dto);
    return {
      message: 'Cập nhật doanh nghiệp thành công',
      data: business,
    };
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLATFORM_ADMIN')
  @ApiOperation({
    summary: 'Approve business',
    description: 'Admin endpoint: Approves a pending business. Requires PLATFORM_ADMIN role.',
  })
  @ApiParam({ name: 'id', description: 'Business ID' })
  @ApiResponse({ status: 200, description: 'Business approved successfully' })
  @ApiNotFoundResponse({ description: 'Business not found' })
  @ApiForbiddenResponse({ description: 'Requires PLATFORM_ADMIN role' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  async approveBusiness(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ) {
    const business = await this.businessService.approveBusiness(id, adminId);
    return {
      message: 'Duyệt doanh nghiệp thành công',
      data: business,
    };
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLATFORM_ADMIN')
  @ApiOperation({
    summary: 'Reject business',
    description: 'Admin endpoint: Rejects a pending business. Requires PLATFORM_ADMIN role.',
  })
  @ApiParam({ name: 'id', description: 'Business ID' })
  @ApiResponse({ status: 200, description: 'Business rejected' })
  @ApiBadRequestResponse({ description: 'Business already approved/rejected' })
  @ApiNotFoundResponse({ description: 'Business not found' })
  @ApiForbiddenResponse({ description: 'Requires PLATFORM_ADMIN role' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  async rejectBusiness(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body('reason') reason: string,
  ) {
    const business = await this.businessService.rejectBusiness(id, adminId, reason);
    return {
      message: 'Từ chối doanh nghiệp',
      data: business,
    };
  }

  // ==================== BUSINESS PROFILE UPDATE REQUESTS ENDPOINTS ====================

  @Post('my/update-request')
  @ApiOperation({ summary: 'Submit a business profile update request (Seller)' })
  async submitUpdateRequest(
    @CurrentUser('id') userId: string,
    @Body() body: any,
  ) {
    const request = await this.businessService.createUpdateRequest(userId, body);
    return {
      success: true,
      message: 'Đã gửi yêu cầu cập nhật thông tin thành công. Ban quản trị sàn sẽ xem xét và phản hồi sớm.',
      data: request,
    };
  }

  @Get('my/update-requests')
  @ApiOperation({ summary: 'Get business update requests history and cooldown status (Seller)' })
  async getMyUpdateRequests(@CurrentUser('id') userId: string) {
    const result = await this.businessService.getMyUpdateRequests(userId);
    return {
      success: true,
      data: result.data,
      latest: result.latest,
      cooldownRemaining: result.cooldownRemaining,
    };
  }

  @Get('admin/update-requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLATFORM_ADMIN')
  @ApiOperation({ summary: 'List all business update requests (Admin)' })
  async getAllUpdateRequestsForAdmin(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.businessService.getAllUpdateRequestsForAdmin(
      status,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
    return {
      success: true,
      ...result,
    };
  }

  @Get('admin/update-requests/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get update request detail (Admin)' })
  async getUpdateRequestDetail(@Param('id') id: string) {
    const data = await this.businessService.getUpdateRequestById(id);
    return {
      success: true,
      data,
    };
  }

  @Post('admin/update-requests/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Approve business update request (Admin)' })
  async approveUpdateRequest(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ) {
    const result = await this.businessService.approveUpdateRequest(id, adminId);
    return {
      success: true,
      ...result,
    };
  }

  @Post('admin/update-requests/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Reject business update request (Admin)' })
  async rejectUpdateRequest(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body('reason') reason: string,
  ) {
    const result = await this.businessService.rejectUpdateRequest(id, adminId, reason);
    return {
      success: true,
      ...result,
    };
  }
}
