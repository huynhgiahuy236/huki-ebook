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
  PlatformAdminCommunityGuard,
} from '../../common/community-auth.guard';
import { CurrentCommunityActor } from '../../common/current-community-actor.decorator';
import {
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
@UseGuards(AuthenticatedCommunityGuard, ThrottlerGuard)
export class ContentReportsController {
  constructor(private readonly moderation: ModerationService) {}

  @Post('forum/posts/:id/report')
  @ApiOperation({ summary: 'Report a forum post' })
  @ApiResponse({ status: 201, description: 'Report created' })
  @ApiBadRequestResponse({ description: 'Invalid or duplicate report' })
  @ApiNotFoundResponse({ description: 'Post not found' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiTooManyRequestsResponse({ description: 'Report rate limit exceeded' })
  @Throttle({ default: { limit: 10, ttl: 60 * 60_000 } })
  reportPost(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: ModerationIdParamDto,
    @Body() dto: CreateReportDto,
  ) {
    return this.moderation.report(actor, 'POST', id, dto);
  }

  @Post('forum/comments/:id/report')
  @ApiOperation({ summary: 'Report a forum comment' })
  @ApiResponse({ status: 201, description: 'Report created' })
  @ApiBadRequestResponse({ description: 'Invalid or duplicate report' })
  @ApiNotFoundResponse({ description: 'Comment not found' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiTooManyRequestsResponse({ description: 'Report rate limit exceeded' })
  @Throttle({ default: { limit: 10, ttl: 60 * 60_000 } })
  reportComment(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: ModerationIdParamDto,
    @Body() dto: CreateReportDto,
  ) {
    return this.moderation.report(actor, 'COMMENT', id, dto);
  }

  @Post('reviews/:id/report')
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
}
