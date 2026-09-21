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
import { EventsController } from './routes/events';
import { AnalyticsController } from './routes/analytics';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
  ],
  controllers: [
    EventsController,
    AnalyticsController,
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
  ],
})
export class AppModule {}
