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
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';
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
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(ThrottlerGuard)
export class ContentReportsController {
  constructor(private readonly moderation: ModerationService) {}

  @Post('reviews/:id/report')
  @UseGuards(AuthenticatedCommunityGuard)
  @ApiOperation({ summary: 'Report a review' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Report created' })
  @ApiStandardErrors(400, 401, 404, 429)
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
  @ApiSuccessResponse(undefined, { status: 201, description: 'Book report created' })
  @ApiStandardErrors(400, 404, 429)
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
  @ApiSuccessResponse(undefined, { status: 201, description: 'Book report created' })
  @ApiStandardErrors(400, 404, 429)
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
  @ApiBearerAuth('JWT-auth')
  @UseGuards(AuthenticatedCommunityGuard)
  @ApiOperation({ summary: 'Get book moderation / lock reason & seller appeal status for Seller' })
  @ApiSuccessResponse(undefined, { description: 'Book moderation detail for seller' })
  @ApiStandardErrors(401, 404)
  getBookModerationStatus(@Param('id') id: string) {
    return this.moderation.getBookModerationDetailForSeller(id);
  }

  @Post('books/:id/appeal')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(AuthenticatedCommunityGuard)
  @ApiOperation({ summary: 'Seller submits explanation / unlock request for a suspended book' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Book unlock appeal submitted' })
  @ApiStandardErrors(400, 401, 403, 404)
  appealBookUnlock(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param('id') id: string,
    @Body() dto: BookUnlockAppealDto,
  ) {
    return this.moderation.appealBookUnlock(actor, id, dto);
  }
}

@ApiTags('Admin moderation')
@ApiBearerAuth('JWT-auth')
@Controller('admin/moderation')
@UseGuards(AuthenticatedCommunityGuard, PlatformAdminCommunityGuard)
export class AdminModerationController {
  constructor(private readonly moderation: ModerationService) {}

  @Get('reports')
  @ApiOperation({ summary: 'List moderation reports (platform admin)' })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Paginated report list' })
  @ApiStandardErrors(401, 403)
  reports(@Query() query: ReportListQueryDto) {
    return this.moderation.listReports(query);
  }

  @Get('reports/:id')
  @ApiOperation({ summary: 'Get moderation report details (platform admin)' })
  @ApiSuccessResponse(undefined, { description: 'Moderation report details' })
  @ApiStandardErrors(401, 403, 404)
  report(@Param() { id }: ModerationIdParamDto) {
    return this.moderation.reportDetail(id);
  }

  @Patch('reports/:id/review')
  @ApiOperation({ summary: 'Start reviewing a report (platform admin)' })
  @ApiSuccessResponse(undefined, { description: 'Report moved to reviewing state' })
  @ApiStandardErrors(400, 401, 403, 404)
  review(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: ModerationIdParamDto,
  ) {
    return this.moderation.startReview(actor, id);
  }

  @Patch('reports/:id/resolve')
  @ApiOperation({ summary: 'Resolve or dismiss a report (platform admin)' })
  @ApiSuccessResponse(undefined, { description: 'Report resolved' })
  @ApiStandardErrors(400, 401, 403, 404)
  resolve(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: ModerationIdParamDto,
    @Body() dto: ResolveReportDto,
  ) {
    return this.moderation.resolve(actor, id, dto);
  }

  @Get('queue')
  @ApiOperation({ summary: 'List flagged content moderation queue (platform admin)' })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Paginated moderation queue' })
  @ApiStandardErrors(401, 403)
  queue(@Query() query: ModerationQueueQueryDto) {
    return this.moderation.queue(query);
  }

  @Patch('content/:targetType/:id')
  @ApiOperation({ summary: 'Apply a moderation action to content (platform admin)' })
  @ApiSuccessResponse(undefined, { description: 'Moderation action applied' })
  @ApiStandardErrors(400, 401, 403, 404)
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
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'searchQuery', required: false, type: String })
  @ApiQuery({ name: 'reason', required: false, type: String })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Book reports grouped with statistics' })
  @ApiStandardErrors(401, 403)
  bookReports(
    @Query('status') status?: string,
    @Query('searchQuery') searchQuery?: string,
    @Query('reason') reason?: string,
  ) {
    return this.moderation.listBookReports({ status, searchQuery, reason });
  }

  @Post('books/:id/action')
  @ApiOperation({ summary: 'Moderate a book violation (platform admin)' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Moderation action executed' })
  @ApiStandardErrors(400, 401, 403, 404)
  moderateBook(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param('id') id: string,
    @Body() dto: BookModerationActionDto,
  ) {
    return this.moderation.moderateBook(actor, id, dto);
  }
}
