import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RecommendationService } from '../services/RecommendationService';
import { FootprintService } from '../services/FootprintService';
import { RecalculateAffinityJob } from '../jobs/RecalculateAffinityJob';
import {
  GetForYouDto,
  GetSimilarBooksDto,
  GetFootprintSummaryDto,
  DeleteFootprintDto,
} from '../dto/recommendation.dto';
import { CurrentUser, Roles, RolesGuard } from '@huki/shared';

@ApiTags('Recommendations')
@ApiBearerAuth()
@Controller('analytics/recommendations')
export class RecommendationController {
  constructor(
    private readonly recommendationService: RecommendationService,
    private readonly footprintService: FootprintService,
    private readonly recalculateJob: RecalculateAffinityJob,
  ) {}

  /**
   * GET /analytics/recommendations/for-you
   * Personalized book recommendations for the current user
   */
  @Get('for-you')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get personalized book recommendations for the current user' })
  async getForYouRecommendations(
    @Query() query: GetForYouDto,
    @CurrentUser() user: any,
  ) {
    // Use query userId if provided (for admin/testing), otherwise use current user
    const targetUserId = query.userId || user?.id;

    if (!targetUserId) {
      throw new ForbiddenException('User ID is required for personalized recommendations');
    }

    // Get purchased books to exclude
    const excludeBookIds = await this.recommendationService.getUserPurchasedBookIds(targetUserId);

    const recommendations = await this.recommendationService.getForYouRecommendations(
      targetUserId,
      query.limit || 20,
      excludeBookIds,
    );

    return { data: recommendations };
  }

  /**
   * GET /analytics/recommendations/similar/:bookId
   * Get similar books based on category and author
   */
  @Get('similar/:bookId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get similar books based on category and author' })
  async getSimilarBooks(
    @Param('bookId') bookId: string,
    @Query() query: GetSimilarBooksDto,
  ) {
    const recommendations = await this.recommendationService.getSimilarBooks(
      bookId,
      query.userId,
      query.limit || 10,
      [],
    );

    return { data: recommendations };
  }

  // ==========================================
  // FOOTPRINT MANAGEMENT (GDPR Compliance)
  // ==========================================

  /**
   * GET /analytics/recommendations/footprint/:userId
   * Get user's footprint summary (for admin or self)
   */
  @Get('footprint/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get user footprint summary' })
  async getFootprintSummary(
    @Param('userId') userId: string,
    @CurrentUser() user: any,
  ) {
    // Only allow users to see their own footprint, or admins to see anyone's
    const isAdmin = user?.role === 'PLATFORM_ADMIN' || user?.role === 'ADMIN';
    if (!isAdmin && user?.id !== userId) {
      throw new ForbiddenException('You can only view your own footprint');
    }

    const summary = await this.footprintService.getFootprintSummary(userId);
    return { data: summary };
  }

  /**
   * DELETE /analytics/recommendations/footprint/:userId
   * Delete all footprint data for a user (GDPR right to erasure)
   */
  @Delete('footprint/:userId')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete all footprint data for a user (GDPR compliance)' })
  async deleteUserFootprint(
    @Param('userId') userId: string,
    @CurrentUser() user: any,
  ) {
    // Only admins can delete footprints (or users deleting their own via special endpoint)
    const isAdmin = user?.role === 'PLATFORM_ADMIN' || user?.role === 'ADMIN';
    if (!isAdmin && user?.id !== userId) {
      throw new ForbiddenException('You can only delete your own footprint');
    }

    const result = await this.footprintService.deleteUserFootprint(userId);
    return {
      message: 'Footprint data deleted successfully',
      data: result,
    };
  }

  // ==========================================
  // ADMIN JOBS (Internal/Admin Only)
  // ==========================================

  /**
   * POST /analytics/recommendations/jobs/recalculate
   * Manually trigger affinity recalculation (admin only)
   */
  @Post('jobs/recalculate')
  @UseGuards(RolesGuard)
  @Roles('PLATFORM_ADMIN', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually trigger affinity score recalculation' })
  async triggerRecalculation() {
    const result = await this.recalculateJob.triggerManualRecalculation();
    return {
      message: 'Affinity recalculation completed',
      data: result,
    };
  }

  /**
   * POST /analytics/recommendations/jobs/decay
   * Manually trigger decay application (admin only)
   */
  @Post('jobs/decay')
  @UseGuards(RolesGuard)
  @Roles('PLATFORM_ADMIN', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually trigger decay application for old interactions' })
  async triggerDecay(@Query('months') months: number = 1, @Query('decay') decay: number = 5) {
    const affectedCount = await this.recalculateJob.triggerManualDecay(months, decay);
    return {
      message: 'Decay applied successfully',
      data: { affectedRecords: affectedCount },
    };
  }
}
