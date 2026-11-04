import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  Query,
  Res,
  Headers,
  UsePipes,
  ValidationPipe,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { SellerAffiliateService } from '../services/seller-affiliate.service';
import { AffiliateDashboardService } from '../services/affiliate-dashboard.service';
import {
  UpdateStoreAffiliateSettingDto,
  UpdateBookAffiliateSettingDto,
  BulkUpdateBooksAffiliateDto,
  QueryStoreBooksAffiliateDto,
  SellerNetPreviewQueryDto,
} from '../dto/seller-affiliate.dto';
import { AuthenticatedGuard, BookActor } from '../../../common/book-auth.guard';
import { CurrentBookActor } from '../../../common/current-book-actor.decorator';
import { getSellerScope } from '../../../common/seller-scope.util';
import { throwForbidden, ErrorCode } from '@huki/shared/errors';

@Controller('seller/stores/:storeId/affiliate')
@UseGuards(AuthenticatedGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class SellerAffiliateController {
  constructor(
    private readonly sellerAffiliateService: SellerAffiliateService,
    private readonly dashboardService: AffiliateDashboardService,
  ) {}

  private async assertStoreAccess(storeId: string, actor?: BookActor) {
    if (!actor) {
      throwForbidden(ErrorCode.AUTHZ_ROLE_INSUFFICIENT, 'Vui lòng đăng nhập để thao tác.');
    }
    const isPlatformAdmin = actor.role === 'ADMIN' || actor.role === 'PLATFORM_ADMIN';
    if (isPlatformAdmin) return;

    if (!['BUSINESS', 'SELLER', 'BUSINESS_OWNER', 'BUSINESS_STAFF'].includes(actor.role)) {
      throwForbidden(ErrorCode.AUTHZ_ROLE_INSUFFICIENT, 'Chỉ chủ gian hàng hoặc quản trị viên mới có quyền quản lý.');
    }

    const actorStoreId = (actor as any).storeId;
    if (actorStoreId && actorStoreId === storeId) {
      return;
    }

    const scope = await getSellerScope(actor);
    if (!scope.storeIds.includes(storeId)) {
      throwForbidden(ErrorCode.AUTHZ_ROLE_INSUFFICIENT, 'Bạn không có quyền quản lý cấu hình tiếp thị của gian hàng này.');
    }
  }

  /**
   * Get store affiliate setting, platform policy, and effective rates
   */
  @Get('settings')
  async getStoreSettings(
    @Param('storeId') storeId: string,
    @CurrentBookActor() actor?: BookActor,
  ) {
    await this.assertStoreAccess(storeId, actor);
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
    @CurrentBookActor() actor?: BookActor,
  ) {
    await this.assertStoreAccess(storeId, actor);
    const actorId = actor?.sub || userId || 'seller-owner';
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
    @CurrentBookActor() actor?: BookActor,
  ) {
    await this.assertStoreAccess(storeId, actor);
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
    @CurrentBookActor() actor?: BookActor,
  ) {
    await this.assertStoreAccess(storeId, actor);
    const actorId = actor?.sub || userId || 'seller-owner';
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
    @CurrentBookActor() actor?: BookActor,
  ) {
    await this.assertStoreAccess(storeId, actor);
    const actorId = actor?.sub || userId || 'seller-owner';
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
    @CurrentBookActor() actor?: BookActor,
  ) {
    await this.assertStoreAccess(storeId, actor);
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

  /**
   * Get Seller Affiliate performance overview & top books stats
   */
  @Get('dashboard')
  async getSellerDashboard(
    @Param('storeId') storeId: string,
    @CurrentBookActor() actor?: BookActor,
  ) {
    await this.assertStoreAccess(storeId, actor);
    const data = await this.dashboardService.getSellerDashboardStats(storeId);
    return {
      success: true,
      data,
    };
  }

  /**
   * Export Seller affiliate commission orders report
   */
  @Get('reports/export')
  async exportSellerReport(
    @Param('storeId') storeId: string,
    @Query('format') format?: 'csv' | 'xlsx',
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Res({ passthrough: true }) res?: any,
    @CurrentBookActor() actor?: BookActor,
  ) {
    await this.assertStoreAccess(storeId, actor);
    const result = await this.dashboardService.exportReport(
      'SELLER',
      storeId,
      format || 'csv',
      fromDate,
      toDate,
    );

    if (res) {
      res.set({
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      });
    }

    return result.content;
  }
}
