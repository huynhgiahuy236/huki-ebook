import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  Query,
  Headers,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { SellerAffiliateService } from '../services/seller-affiliate.service';
import {
  UpdateStoreAffiliateSettingDto,
  UpdateBookAffiliateSettingDto,
  BulkUpdateBooksAffiliateDto,
  QueryStoreBooksAffiliateDto,
  SellerNetPreviewQueryDto,
} from '../dto/seller-affiliate.dto';

@Controller('seller/stores/:storeId/affiliate')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class SellerAffiliateController {
  constructor(private readonly sellerAffiliateService: SellerAffiliateService) {}

  /**
   * Get store affiliate setting, platform policy, and effective rates
   */
  @Get('settings')
  async getStoreSettings(@Param('storeId') storeId: string) {
    const data = await this.sellerAffiliateService.getStoreSettings(storeId);
    return {
      success: true,
      data,
    };
  }

  /**
   * Update store affiliate setting
   */
  @Put('settings')
  async updateStoreSettings(
    @Param('storeId') storeId: string,
    @Headers('x-user-id') userId: string,
    @Body() dto: UpdateStoreAffiliateSettingDto,
  ) {
    const actorId = userId || 'seller-owner';
    const data = await this.sellerAffiliateService.updateStoreSettings(
      storeId,
      actorId,
      dto,
    );
    return {
      success: true,
      message: 'Cập nhật cấu hình hoa hồng Gian hàng thành công',
      data,
    };
  }

  /**
   * List store books with affiliate eligibility status & net preview
   */
  @Get('books')
  async listStoreBooks(
    @Param('storeId') storeId: string,
    @Query() query: QueryStoreBooksAffiliateDto,
  ) {
    const data = await this.sellerAffiliateService.listStoreBooks(
      storeId,
      query,
    );
    return {
      success: true,
      data,
    };
  }

  /**
   * Update single book affiliate setting (isEligible, customRate, notes)
   */
  @Put('books/:bookId')
  async updateBookSetting(
    @Param('storeId') storeId: string,
    @Param('bookId') bookId: string,
    @Headers('x-user-id') userId: string,
    @Body() dto: UpdateBookAffiliateSettingDto,
  ) {
    const actorId = userId || 'seller-owner';
    const data = await this.sellerAffiliateService.updateBookSetting(
      storeId,
      bookId,
      actorId,
      dto,
    );
    return {
      success: true,
      message: 'Cập nhật trạng thái sách thành công',
      data,
    };
  }

  /**
   * Bulk update books affiliate eligibility & custom rate
   */
  @Post('books/bulk')
  async bulkUpdateBooks(
    @Param('storeId') storeId: string,
    @Headers('x-user-id') userId: string,
    @Body() dto: BulkUpdateBooksAffiliateDto,
  ) {
    const actorId = userId || 'seller-owner';
    const data = await this.sellerAffiliateService.bulkUpdateBooks(
      storeId,
      actorId,
      dto,
    );
    return {
      success: true,
      message: `Cập nhật thành công ${data.updatedCount} cuốn sách`,
      data,
    };
  }

  /**
   * Calculate live Seller-Net revenue preview
   */
  @Get('preview-net')
  async previewSellerNet(
    @Param('storeId') storeId: string,
    @Query() query: SellerNetPreviewQueryDto,
  ) {
    const data = this.sellerAffiliateService.calculateSellerNetPreview(
      Number(query.price || 0),
      query.format,
      query.customRate,
    );
    return {
      success: true,
      data,
    };
  }
}
