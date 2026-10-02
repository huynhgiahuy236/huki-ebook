import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaService } from './prisma/prisma.service';
import { EventCollector } from './services/EventCollector';
import { EventProcessor } from './services/EventProcessor';
import { DailyRollupService } from './services/DailyRollupService';
import { DailyRollupRunner } from './services/DailyRollupRunner';
import { DailyRollupJob } from './jobs/DailyRollupJob';
import { AnalyticsQueryService } from './services/AnalyticsQueryService';
import { GMVService } from './services/GMVService';
import { AffinityScoringService } from './services/AffinityScoringService';
import { RecommendationService } from './services/RecommendationService';
import { FootprintService } from './services/FootprintService';
import { RecalculateAffinityJob } from './jobs/RecalculateAffinityJob';
import { CatalogClientService } from './services/CatalogClientService';
import { EventsController } from './routes/events';
import { AnalyticsController } from './routes/analytics';
import { RecommendationController } from './routes/recommendations';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
  ],
  controllers: [
    EventsController,
    AnalyticsController,
    RecommendationController,
  ],
  providers: [
    PrismaService,
    EventCollector,
    EventProcessor,
    DailyRollupService,
    DailyRollupRunner,
    DailyRollupJob,
    AnalyticsQueryService,
    GMVService,
    AffinityScoringService,
    RecommendationService,
    FootprintService,
    RecalculateAffinityJob,
    CatalogClientService,
  ],
  exports: [
    PrismaService,
    EventCollector,
    EventProcessor,
    DailyRollupService,
    DailyRollupRunner,
    DailyRollupJob,
    AnalyticsQueryService,
    GMVService,
    AffinityScoringService,
    RecommendationService,
    FootprintService,
    RecalculateAffinityJob,
    CatalogClientService,
  ],
})
export class AppModule {}
