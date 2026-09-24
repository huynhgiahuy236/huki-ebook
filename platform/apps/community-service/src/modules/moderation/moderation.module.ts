import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventsModule } from '@huki/shared';
import { Report, ReportSchema } from '../../entities/report.schema';
import { Review, ReviewSchema } from '../../entities/review.schema';
import {
  AuthenticatedCommunityGuard,
  PlatformAdminCommunityGuard,
} from '../../common/community-auth.guard';
import { AutoModerationService } from './auto-moderation.service';
import {
  AdminModerationController,
  ContentReportsController,
} from './moderation.controller';
import { ModerationService } from './moderation.service';

@Module({
  imports: [
    EventsModule,
    ThrottlerModule.forRoot([{ ttl: 60 * 60_000, limit: 10 }]),
    MongooseModule.forFeature([
      { name: Report.name, schema: ReportSchema },
      { name: Review.name, schema: ReviewSchema },
    ]),
  ],
  controllers: [ContentReportsController, AdminModerationController],
  providers: [
    ModerationService,
    AutoModerationService,
    AuthenticatedCommunityGuard,
    PlatformAdminCommunityGuard,
  ],
  exports: [AutoModerationService],
})
export class ModerationModule {}
