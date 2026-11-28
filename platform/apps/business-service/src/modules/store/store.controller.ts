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
} from '@nestjs/swagger';
import { StoreService } from './store.service';
import { CreateStoreDto, UpdateStoreDto } from './dto/store.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public, CurrentUser, Roles } from '@huki/shared/decorators';
import { RolesGuard } from '@huki/shared/guards';
import { ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';

@ApiTags('Stores')
@ApiBearerAuth('JWT-auth')
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
  @ApiSuccessResponse(undefined, { status: 201, description: 'Store created successfully' })
  @ApiStandardErrors(400, 401, 403, 404, 409)
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
  @ApiSuccessResponse(undefined, { isArray: true, description: 'List of stores' })
  @ApiStandardErrors(401, 404)
  async getMyStores(
    @Query('businessId') businessId: string,
    @CurrentUser('id') userId: string,
  ) {
    const stores = await this.storeService.getStoresByBusiness(businessId, userId);
    return { data: stores };
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLATFORM_ADMIN')
  @ApiOperation({ summary: 'List stores for platform administration' })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Admin paginated stores list' })
  @ApiStandardErrors(401, 403)
  async getAllStoresForAdmin(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.storeService.getAllStores({
      status: status as any,
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    }, true);
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
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Paginated list of stores' })
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
  @ApiSuccessResponse(undefined, { description: 'Store details' })
  @ApiStandardErrors(404)
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
  @ApiSuccessResponse(undefined, { description: 'Store details' })
  @ApiStandardErrors(404)
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
  @ApiSuccessResponse(undefined, { description: 'Store updated successfully' })
  @ApiStandardErrors(400, 401, 403, 404)
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
  @ApiSuccessResponse(undefined, { description: 'Store deleted successfully' })
  @ApiStandardErrors(401, 403, 404)
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
  @ApiSuccessResponse(undefined, { description: 'Store approved successfully' })
  @ApiStandardErrors(401, 403, 404)
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
  @ApiSuccessResponse(undefined, { description: 'Store rejected' })
  @ApiStandardErrors(400, 401, 403, 404)
  async rejectStore(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ) {
    const store = await this.storeService.rejectStore(id, adminId);
    return { message: 'Từ chối cửa hàng', data: store };
  }
}
