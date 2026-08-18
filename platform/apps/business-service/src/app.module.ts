import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Prisma
import { PrismaModule } from './prisma/prisma.module';

// Modules
import { BusinessModule } from './modules/business/business.module';
import { StoreModule } from './modules/store/store.module';
import { MemberModule } from './modules/member/member.module';

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
  ],
  controllers: [HealthController],
})
export class AppModule {}
