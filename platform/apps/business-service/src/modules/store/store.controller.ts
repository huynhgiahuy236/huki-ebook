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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { StoreService } from './store.service';
import { CreateStoreDto, UpdateStoreDto } from './dto/store.dto';
import { Public } from '../../../../../libs/shared/src/decorators/public.decorator';

@ApiTags('Stores')
@ApiBearerAuth()
@Controller('stores')
export class StoreController {
  constructor(private storeService: StoreService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new store' })
  async createStore(
    @Body() dto: CreateStoreDto,
    @Query('businessId') businessId: string,
    @Query('userId') userId: string,
  ) {
    const store = await this.storeService.createStore(businessId, userId, dto);
    return {
      message: 'Tạo cửa hàng thành công',
      data: store,
    };
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my stores' })
  async getMyStores(
    @Query('businessId') businessId: string,
    @Query('userId') userId: string,
  ) {
    const stores = await this.storeService.getStoresByBusiness(businessId, userId);
    return { data: stores };
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all stores (public)' })
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
  @ApiOperation({ summary: 'Get store by ID' })
  async getStoreById(@Param('id') id: string) {
    const store = await this.storeService.getStoreById(id);
    return { data: store };
  }

  @Get('slug/:slug')
  @Public()
  @ApiOperation({ summary: 'Get store by slug' })
  async getStoreBySlug(@Param('slug') slug: string) {
    const store = await this.storeService.getStoreBySlug(slug);
    return { data: store };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update store' })
  async updateStore(
    @Param('id') id: string,
    @Query('userId') userId: string,
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
  @ApiOperation({ summary: 'Delete store' })
  async deleteStore(
    @Param('id') id: string,
    @Query('userId') userId: string,
  ) {
    await this.storeService.updateStore(id, userId, { isActive: false } as any);
    return { message: 'Xóa cửa hàng thành công' };
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: Approve store' })
  async approveStore(
    @Param('id') id: string,
    @Query('adminId') adminId: string,
  ) {
    const store = await this.storeService.approveStore(id, adminId);
    return { message: 'Duyệt cửa hàng thành công', data: store };
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: Reject store' })
  async rejectStore(
    @Param('id') id: string,
    @Query('adminId') adminId: string,
  ) {
    const store = await this.storeService.rejectStore(id, adminId);
    return { message: 'Từ chối cửa hàng', data: store };
  }
}
