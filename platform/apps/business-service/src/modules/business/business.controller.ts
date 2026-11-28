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
  ApiBody,
} from '@nestjs/swagger';
import { BusinessService } from './business.service';
import { CreateBusinessDto, UpdateBusinessDto } from './dto/business.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public, CurrentUser, Roles } from '@huki/shared/decorators';
import { RolesGuard } from '@huki/shared/guards';
import { ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';

@ApiTags('Business')
@ApiBearerAuth('JWT-auth')
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
  @ApiSuccessResponse(undefined, { status: 201, description: 'Business registered successfully' })
  @ApiStandardErrors(400, 401, 409)
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
  @ApiSuccessResponse(undefined, { description: 'Current user business' })
  @ApiStandardErrors(401, 404)
  async getMyBusiness(@CurrentUser('id') userId: string) {
    const business = await this.businessService.getBusinessByOwner(userId);
    return { data: business };
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLATFORM_ADMIN')
  @ApiOperation({ summary: 'List businesses for platform administration' })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Admin paginated businesses list' })
  @ApiStandardErrors(401, 403)
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
  @ApiSuccessResponse(undefined, { isArray: true, description: 'List of followed businesses' })
  @ApiStandardErrors(401)
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
  @ApiSuccessResponse(undefined, { isArray: true, description: 'List of followed business IDs' })
  @ApiStandardErrors(401)
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
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Business followers list' })
  @ApiStandardErrors(404)
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
  @ApiSuccessResponse(undefined, { description: 'Followed business' })
  @ApiStandardErrors(401, 404)
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
  @ApiSuccessResponse(undefined, { description: 'Unfollowed business' })
  @ApiStandardErrors(401, 404)
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
  @ApiSuccessResponse(undefined, { description: 'Business details' })
  @ApiStandardErrors(404)
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
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Paginated list of businesses' })
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
  @ApiSuccessResponse(undefined, { description: 'Business updated successfully' })
  @ApiStandardErrors(400, 401, 403, 404)
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
  @ApiSuccessResponse(undefined, { description: 'Business approved successfully' })
  @ApiStandardErrors(401, 403, 404)
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
  @ApiBody({ schema: { type: 'object', required: ['reason'], properties: { reason: { type: 'string', example: 'Hồ sơ chưa hợp lệ' } } } })
  @ApiSuccessResponse(undefined, { description: 'Business rejected' })
  @ApiStandardErrors(400, 401, 403, 404)
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

  @Post('my/update-request/send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send 6-digit OTP email to verify business profile update request (Seller)' })
  @ApiSuccessResponse(undefined, { description: 'OTP sent' })
  @ApiStandardErrors(401, 404, 429)
  async sendUpdateRequestOtp(
    @CurrentUser('id') userId: string,
    @CurrentUser('email') userEmail?: string,
  ) {
    const result = await this.businessService.sendUpdateRequestOtp(userId, userEmail);
    return {
      success: true,
      message: `Đã gửi mã OTP 6 chữ số đến email ${result.maskedEmail}. Vui lòng kiểm tra hộp thư.`,
      data: result,
    };
  }

  @Post('my/update-request')
  @ApiOperation({ summary: 'Submit a business profile update request (Seller)' })
  @ApiBody({ schema: { type: 'object', description: 'Business update request payload with OTP' } })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Update request submitted' })
  @ApiStandardErrors(400, 401, 404, 409)
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
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Update requests history' })
  @ApiStandardErrors(401, 404)
  async getMyUpdateRequests(@CurrentUser('id') userId: string) {
    const result = await this.businessService.getMyUpdateRequests(userId);
    return {
      success: true,
      data: result.data,
      latest: result.latest,
      cooldownRemaining: result.cooldownRemaining,
    };
  }

  @Get('my/audit-logs')
  @ApiOperation({ summary: 'Get business activity and governance audit logs (Seller)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiQuery({ name: 'resource', required: false, type: String })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Business audit logs' })
  @ApiStandardErrors(401, 404)
  async getMyAuditLogs(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('resource') resource?: string,
  ) {
    const data = await this.businessService.getMyAuditLogs(userId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      action,
      resource,
    });
    return {
      success: true,
      data,
    };
  }

  @Get('admin/update-requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLATFORM_ADMIN')
  @ApiOperation({ summary: 'List all business update requests (Admin)' })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Admin update requests list' })
  @ApiStandardErrors(401, 403)
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
  @ApiSuccessResponse(undefined, { description: 'Update request detail' })
  @ApiStandardErrors(401, 403, 404)
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
  @ApiSuccessResponse(undefined, { description: 'Update request approved' })
  @ApiStandardErrors(400, 401, 403, 404)
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
  @ApiBody({ schema: { type: 'object', required: ['reason'], properties: { reason: { type: 'string', example: 'Thông tin không khớp' } } } })
  @ApiSuccessResponse(undefined, { description: 'Update request rejected' })
  @ApiStandardErrors(400, 401, 403, 404)
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

  @Get('admin/:id/audit-logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get business governance audit logs (Platform Admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Business audit logs' })
  @ApiStandardErrors(401, 403, 404)
  async getBusinessAuditLogs(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
  ) {
    const data = await this.businessService.getBusinessAuditLogs(id, {
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
