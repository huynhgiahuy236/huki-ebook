import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Prisma
import { PrismaModule } from '../prisma/prisma.module';

// Modules
import { BusinessModule } from './modules/business/business.module';
import { StoreModule } from './modules/store/store.module';
import { MemberModule } from './modules/member/member.module';
import { BusinessOutboxModule } from './modules/outbox/outbox.module';
import { AuditModule } from './modules/audit/audit.module';
import { BroadcastModule } from './modules/broadcast/broadcast.module';
import { FeatureModule } from './modules/feature/feature.module';
import { PenaltyModule } from './modules/penalty/penalty.module';
import { InternalModule } from './modules/internal/internal.module';

// Health
import { HealthController } from './modules/health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),

    // Event emitter for cross-service events
    EventEmitterModule.forRoot(),

    // Prisma
    PrismaModule,

    // Feature modules
    BusinessModule,
    StoreModule,
    MemberModule,
    BusinessOutboxModule,
    AuditModule,
    BroadcastModule,
    FeatureModule,
    PenaltyModule,
    InternalModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
