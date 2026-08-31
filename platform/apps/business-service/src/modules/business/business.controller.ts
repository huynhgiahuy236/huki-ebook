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
}
