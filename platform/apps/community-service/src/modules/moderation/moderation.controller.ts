import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  AuthenticatedCommunityGuard,
  CommunityActor,
  OptionalCommunityAuthGuard,
  PlatformAdminCommunityGuard,
} from '../../common/community-auth.guard';
import { CurrentCommunityActor } from '../../common/current-community-actor.decorator';
import {
  BookModerationActionDto,
  BookUnlockAppealDto,
  CreateBookReportDto,
  CreateReportDto,
  ModerateContentDto,
  ModerationIdParamDto,
  ModerationQueueQueryDto,
  ModerationTargetParamDto,
  ReportListQueryDto,
  ResolveReportDto,
} from './dto/moderation.dto';
import { ModerationService } from './moderation.service';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller()
@UseGuards(ThrottlerGuard)
export class ContentReportsController {
  constructor(private readonly moderation: ModerationService) {}

  @Post('reviews/:id/report')
  @UseGuards(AuthenticatedCommunityGuard)
  @ApiOperation({ summary: 'Report a review' })
  @ApiResponse({ status: 201, description: 'Report created' })
  @ApiBadRequestResponse({ description: 'Invalid or duplicate report' })
  @ApiNotFoundResponse({ description: 'Review not found' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiTooManyRequestsResponse({ description: 'Report rate limit exceeded' })
  @Throttle({ default: { limit: 10, ttl: 60 * 60_000 } })
  reportReview(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: ModerationIdParamDto,
    @Body() dto: CreateReportDto,
  ) {
    return this.moderation.report(actor, 'REVIEW', id, dto);
  }

  @Post('books/:id/report')
  @ApiOperation({ summary: 'Report a book violation' })
  @ApiResponse({ status: 201, description: 'Book report created' })
  @Throttle({ default: { limit: 20, ttl: 60 * 60_000 } })
  @UseGuards(OptionalCommunityAuthGuard, ThrottlerGuard)
  reportBook(
    @CurrentCommunityActor() actor: CommunityActor | undefined,
    @Param('id') id: string,
    @Body() dto: CreateBookReportDto,
  ) {
    return this.moderation.reportBook(actor, id, dto);
  }

  @Post('moderation/books/:id/report')
  @ApiOperation({ summary: 'Report a book violation (alias)' })
  @ApiResponse({ status: 201, description: 'Book report created' })
  @Throttle({ default: { limit: 20, ttl: 60 * 60_000 } })
  @UseGuards(OptionalCommunityAuthGuard, ThrottlerGuard)
  reportBookAlias(
    @CurrentCommunityActor() actor: CommunityActor | undefined,
    @Param('id') id: string,
    @Body() dto: CreateBookReportDto,
  ) {
    return this.moderation.reportBook(actor, id, dto);
  }

  @Get('books/:id/moderation-status')
  @ApiBearerAuth()
  @UseGuards(AuthenticatedCommunityGuard)
  @ApiOperation({ summary: 'Get book moderation / lock reason & seller appeal status for Seller' })
  @ApiResponse({ status: 200, description: 'Book moderation detail for seller' })
  getBookModerationStatus(@Param('id') id: string) {
    return this.moderation.getBookModerationDetailForSeller(id);
  }

  @Post('books/:id/appeal')
  @ApiBearerAuth()
  @UseGuards(AuthenticatedCommunityGuard)
  @ApiOperation({ summary: 'Seller submits explanation / unlock request for a suspended book' })
  @ApiResponse({ status: 201, description: 'Book unlock appeal submitted' })
  appealBookUnlock(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param('id') id: string,
    @Body() dto: BookUnlockAppealDto,
  ) {
    return this.moderation.appealBookUnlock(actor, id, dto);
  }
}

@ApiTags('Admin moderation')
@ApiBearerAuth()
@Controller('admin/moderation')
@UseGuards(AuthenticatedCommunityGuard, PlatformAdminCommunityGuard)
export class AdminModerationController {
  constructor(private readonly moderation: ModerationService) {}

  @Get('reports')
  @ApiOperation({ summary: 'List moderation reports (platform admin)' })
  @ApiResponse({ status: 200, description: 'Paginated report list' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Platform administrator role required' })
  reports(@Query() query: ReportListQueryDto) {
    return this.moderation.listReports(query);
  }

  @Get('reports/:id')
  @ApiOperation({ summary: 'Get moderation report details (platform admin)' })
  @ApiResponse({ status: 200, description: 'Moderation report details' })
  @ApiNotFoundResponse({ description: 'Report not found' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Platform administrator role required' })
  report(@Param() { id }: ModerationIdParamDto) {
    return this.moderation.reportDetail(id);
  }

  @Patch('reports/:id/review')
  @ApiOperation({ summary: 'Start reviewing a report (platform admin)' })
  @ApiResponse({ status: 200, description: 'Report moved to reviewing state' })
  @ApiNotFoundResponse({ description: 'Report not found' })
  @ApiBadRequestResponse({ description: 'Invalid report state transition' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Platform administrator role required' })
  review(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: ModerationIdParamDto,
  ) {
    return this.moderation.startReview(actor, id);
  }

  @Patch('reports/:id/resolve')
  @ApiOperation({ summary: 'Resolve or dismiss a report (platform admin)' })
  @ApiResponse({ status: 200, description: 'Report resolved' })
  @ApiNotFoundResponse({ description: 'Report not found' })
  @ApiBadRequestResponse({ description: 'Invalid resolution or state transition' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Platform administrator role required' })
  resolve(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: ModerationIdParamDto,
    @Body() dto: ResolveReportDto,
  ) {
    return this.moderation.resolve(actor, id, dto);
  }

  @Get('queue')
  @ApiOperation({ summary: 'List flagged content moderation queue (platform admin)' })
  @ApiResponse({ status: 200, description: 'Paginated moderation queue' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Platform administrator role required' })
  queue(@Query() query: ModerationQueueQueryDto) {
    return this.moderation.queue(query);
  }

  @Patch('content/:targetType/:id')
  @ApiOperation({ summary: 'Apply a moderation action to content (platform admin)' })
  @ApiResponse({ status: 200, description: 'Moderation action applied' })
  @ApiNotFoundResponse({ description: 'Target content not found' })
  @ApiBadRequestResponse({ description: 'Unsupported target or moderation action' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Platform administrator role required' })
  content(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() params: ModerationTargetParamDto,
    @Body() dto: ModerateContentDto,
  ) {
    return this.moderation.moderateContent(
      actor,
      params.targetType,
      params.id,
      dto,
    );
  }

  @Get('books')
  @ApiOperation({ summary: 'List book moderation reports (platform admin)' })
  @ApiResponse({ status: 200, description: 'Book reports grouped with statistics' })
  bookReports(
    @Query('status') status?: string,
    @Query('searchQuery') searchQuery?: string,
    @Query('reason') reason?: string,
  ) {
    return this.moderation.listBookReports({ status, searchQuery, reason });
  }

  @Post('books/:id/action')
  @ApiOperation({ summary: 'Moderate a book violation (platform admin)' })
  @ApiResponse({ status: 200, description: 'Moderation action executed' })
  moderateBook(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param('id') id: string,
    @Body() dto: BookModerationActionDto,
  ) {
    return this.moderation.moderateBook(actor, id, dto);
  }
}
