import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsQueryService } from '../services/AnalyticsQueryService';
import { DailyRollupService } from '../services/DailyRollupService';
import { DailyRollupRunner } from '../services/DailyRollupRunner';
import { GMVService } from '../services/GMVService';
import { DateRangeQueryDto, RollupDayDto } from '../dto/analytics.dto';
import { GmvQueryDto } from '../dto/gmv.dto';
import { CurrentUser, Roles, RolesGuard } from '@huki/shared';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly queryService: AnalyticsQueryService,
    private readonly rollupService: DailyRollupService,
    private readonly rollupRunner: DailyRollupRunner,
    private readonly gmvService: GMVService,
  ) {}

  // ==========================================
  // GMV CALCULATION ENDPOINTS (Task 80)
  // ==========================================

  @Get('gmv')
  @UseGuards(RolesGuard)
  @Roles('PLATFORM_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Get platform-wide GMV overview (all-time, daily, weekly, monthly)' })
  async getPlatformGmv(@Query() query: GmvQueryDto) {
    const data = await this.gmvService.getPlatformGMV(query.from, query.to, query.interval);
    return { data };
  }

  @Get('store/:storeId/gmv')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get store GMV overview (all-time, daily, weekly, monthly, by book)' })
  async getStoreGmv(
    @Param('storeId') storeId: string,
    @Query() query: GmvQueryDto,
    @CurrentUser() user: any,
  ) {
    this.assertStoreAccess(user, storeId);
    const data = await this.gmvService.getStoreGMV(storeId, query.from, query.to, query.interval);
    return { data };
  }

  // ==========================================
  // PLATFORM ANALYTICS (Admin Only)
  // ==========================================

  @Get('platform/summary')
  @UseGuards(RolesGuard)
  @Roles('PLATFORM_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Get platform-wide analytics summary' })
  async getPlatformSummary(@Query() query: DateRangeQueryDto) {
    const data = await this.queryService.getPlatformSummary(query.from, query.to);
    return { data };
  }

  @Get('platform/daily')
  @UseGuards(RolesGuard)
  @Roles('PLATFORM_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Get platform daily metrics time series' })
  async getPlatformDaily(@Query() query: DateRangeQueryDto) {
    const data = await this.queryService.getPlatformDaily(query.from, query.to, query.metric);
    return { data };
  }

  @Get('platform/bestsellers')
  @UseGuards(RolesGuard)
  @Roles('PLATFORM_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Get platform-wide bestseller rankings' })
  async getPlatformBestsellers(@Query() query: DateRangeQueryDto) {
    const data = await this.queryService.getPlatformBestsellers(
      query.from,
      query.to,
      query.by,
      query.limit,
    );
    return { data };
  }

  // ==========================================
  // STORE ANALYTICS (Store Owner / Seller)
  // ==========================================

  @Get('store/:storeId/summary')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get store analytics summary' })
  async getStoreSummary(
    @Param('storeId') storeId: string,
    @Query() query: DateRangeQueryDto,
    @CurrentUser() user: any,
  ) {
    this.assertStoreAccess(user, storeId);
    const data = await this.queryService.getStoreSummary(storeId, query.from, query.to);
    return { data };
  }

  @Get('store/:storeId/daily')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get store daily metrics time series' })
  async getStoreDaily(
    @Param('storeId') storeId: string,
    @Query() query: DateRangeQueryDto,
    @CurrentUser() user: any,
  ) {
    this.assertStoreAccess(user, storeId);
    const data = await this.queryService.getStoreDaily(storeId, query.from, query.to, query.metric);
    return { data };
  }

  @Get('store/:storeId/bestsellers')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get store bestseller rankings' })
  async getStoreBestsellers(
    @Param('storeId') storeId: string,
    @Query() query: DateRangeQueryDto,
    @CurrentUser() user: any,
  ) {
    this.assertStoreAccess(user, storeId);
    const data = await this.queryService.getStoreBestsellers(
      storeId,
      query.from,
      query.to,
      query.by,
      query.limit,
    );
    return { data };
  }

  // ==========================================
  // ADMIN ROLLUP TRIGGER
  // ==========================================

  @Post('daily/rollup')
  @UseGuards(RolesGuard)
  @Roles('PLATFORM_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Trigger daily rollup aggregation for a specific date' })
  async triggerRollup(@Body() dto: RollupDayDto) {
    const data = await this.rollupRunner.executeRollup({
      date: dto.date,
      source: 'MANUAL',
    });
    return {
      message: 'Daily rollup completed',
      data,
    };
  }

  /**
   * Helper: enforce fail-closed store access authorization
   */
  private assertStoreAccess(user: any, targetStoreId: string) {
    if (!user) {
      throw new ForbiddenException('Access denied: Unauthorized');
    }
    const isPlatformAdmin = user.role === 'PLATFORM_ADMIN' || user.role === 'ADMIN';
    if (isPlatformAdmin) {
      return;
    }

    // If storeId is provided in user claims or store membership context
    if (user.storeId && user.storeId === targetStoreId) {
      return;
    }

    // Fail-closed for all unverified cross-store queries
    throw new ForbiddenException(`Access denied: You are not authorized to view analytics for store ${targetStoreId}`);
  }
}
