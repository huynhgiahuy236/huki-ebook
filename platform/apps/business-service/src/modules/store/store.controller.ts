/**
 * HUKI EBOOK - Store Controller
 *
 * Handles store creation, management, and admin approval
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
} from '@nestjs/swagger';
import { StoreService } from './store.service';
import { CreateStoreDto, UpdateStoreDto } from './dto/store.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public, CurrentUser, Roles } from '@huki/shared/decorators';
import { RolesGuard } from '@huki/shared/guards';

@ApiTags('Stores')
@ApiBearerAuth()
@Controller('stores')
@UseGuards(JwtAuthGuard)
export class StoreController {
  constructor(private storeService: StoreService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new store',
    description: 'Creates a new store under a business.',
  })
  @ApiQuery({ name: 'businessId', description: 'Business ID' })
  @ApiResponse({ status: 201, description: 'Store created successfully' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiNotFoundResponse({ description: 'Business not found' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  async createStore(
    @Body() dto: CreateStoreDto,
    @Query('businessId') businessId: string,
    @CurrentUser('id') userId: string,
  ) {
    const store = await this.storeService.createStore(businessId, userId, dto);
    return {
      message: 'Tạo cửa hàng thành công',
      data: store,
    };
  }

  @Get('my')
  @ApiOperation({
    summary: 'Get my stores',
    description: 'Returns stores belonging to the user\'s business.',
  })
  @ApiQuery({ name: 'businessId', description: 'Business ID' })
  @ApiResponse({ status: 200, description: 'List of stores' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  async getMyStores(
    @Query('businessId') businessId: string,
    @CurrentUser('id') userId: string,
  ) {
    const stores = await this.storeService.getStoresByBusiness(businessId, userId);
    return { data: stores };
  }

  @Get()
  @Public()
  @ApiOperation({
    summary: 'List all stores',
    description: 'Returns a paginated list of all stores.',
  })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Paginated list of stores' })
  async getAllStores(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.storeService.getAllStores({
      status: status as any,
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
    return result;
  }

  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Get store by ID',
    description: 'Returns store details by ID.',
  })
  @ApiParam({ name: 'id', description: 'Store ID' })
  @ApiResponse({ status: 200, description: 'Store details' })
  @ApiNotFoundResponse({ description: 'Store not found' })
  async getStoreById(@Param('id') id: string) {
    const store = await this.storeService.getStoreById(id);
    return { data: store };
  }

  @Get('slug/:slug')
  @Public()
  @ApiOperation({
    summary: 'Get store by slug',
    description: 'Returns store details by URL-friendly slug.',
  })
  @ApiParam({ name: 'slug', description: 'Store slug' })
  @ApiResponse({ status: 200, description: 'Store details' })
  @ApiNotFoundResponse({ description: 'Store not found' })
  async getStoreBySlug(@Param('slug') slug: string) {
    const store = await this.storeService.getStoreBySlug(slug);
    return { data: store };
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update store',
    description: 'Updates store details. Only business owner/admin can update.',
  })
  @ApiParam({ name: 'id', description: 'Store ID' })
  @ApiResponse({ status: 200, description: 'Store updated successfully' })
  @ApiNotFoundResponse({ description: 'Store not found' })
  @ApiForbiddenResponse({ description: 'Not authorized to update this store' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  async updateStore(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateStoreDto,
  ) {
    const store = await this.storeService.updateStore(id, userId, dto);
    return {
      message: 'Cập nhật cửa hàng thành công',
      data: store,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete store',
    description: 'Soft deletes a store. Only business owner/admin can delete.',
  })
  @ApiParam({ name: 'id', description: 'Store ID' })
  @ApiResponse({ status: 200, description: 'Store deleted successfully' })
  @ApiNotFoundResponse({ description: 'Store not found' })
  @ApiForbiddenResponse({ description: 'Not authorized to delete this store' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  async deleteStore(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.storeService.updateStore(id, userId, { isActive: false } as any);
    return { message: 'Xóa cửa hàng thành công' };
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLATFORM_ADMIN')
  @ApiOperation({
    summary: 'Approve store',
    description: 'Admin endpoint: Approves a pending store. Requires PLATFORM_ADMIN role.',
  })
  @ApiParam({ name: 'id', description: 'Store ID' })
  @ApiResponse({ status: 200, description: 'Store approved successfully' })
  @ApiNotFoundResponse({ description: 'Store not found' })
  @ApiForbiddenResponse({ description: 'Requires PLATFORM_ADMIN role' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  async approveStore(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ) {
    const store = await this.storeService.approveStore(id, adminId);
    return { message: 'Duyệt cửa hàng thành công', data: store };
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLATFORM_ADMIN')
  @ApiOperation({
    summary: 'Reject store',
    description: 'Admin endpoint: Rejects a pending store. Requires PLATFORM_ADMIN role.',
  })
  @ApiParam({ name: 'id', description: 'Store ID' })
  @ApiResponse({ status: 200, description: 'Store rejected' })
  @ApiBadRequestResponse({ description: 'Store already approved/rejected' })
  @ApiNotFoundResponse({ description: 'Store not found' })
  @ApiForbiddenResponse({ description: 'Requires PLATFORM_ADMIN role' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  async rejectStore(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ) {
    const store = await this.storeService.rejectStore(id, adminId);
    return { message: 'Từ chối cửa hàng', data: store };
  }
}
