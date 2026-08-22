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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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
  @Throttle({ default: { limit: 10, ttl: 60 * 60_000 } })
  reportPost(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: ModerationIdParamDto,
    @Body() dto: CreateReportDto,
  ) {
    return this.moderation.report(actor, 'POST', id, dto);
  }

  @Post('forum/comments/:id/report')
  @Throttle({ default: { limit: 10, ttl: 60 * 60_000 } })
  reportComment(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: ModerationIdParamDto,
    @Body() dto: CreateReportDto,
  ) {
    return this.moderation.report(actor, 'COMMENT', id, dto);
  }

  @Post('reviews/:id/report')
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
  reports(@Query() query: ReportListQueryDto) {
    return this.moderation.listReports(query);
  }

  @Get('reports/:id')
  report(@Param() { id }: ModerationIdParamDto) {
    return this.moderation.reportDetail(id);
  }

  @Patch('reports/:id/review')
  review(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: ModerationIdParamDto,
  ) {
    return this.moderation.startReview(actor, id);
  }

  @Patch('reports/:id/resolve')
  resolve(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: ModerationIdParamDto,
    @Body() dto: ResolveReportDto,
  ) {
    return this.moderation.resolve(actor, id, dto);
  }

  @Get('queue')
  queue(@Query() query: ModerationQueueQueryDto) {
    return this.moderation.queue(query);
  }

  @Patch('content/:targetType/:id')
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
