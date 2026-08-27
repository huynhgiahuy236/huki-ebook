import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { SessionModule } from './modules/session/session.module';
import { RedisModule } from './modules/redis/redis.module';
import { RabbitMQModule } from './modules/rabbitmq/rabbitmq.module';
import { IdentityOutboxModule } from './modules/outbox/outbox.module';

// Guards
import { ThrottlerBehindProxyGuard } from './modules/auth/guards/throttle.guard';

// Config
import configuration from '../config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './modules/health/health.controller';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env', '.env.local'],
    }),

    PrismaModule,

    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ([{
        ttl: configService.get<number>('throttle.ttl') ?? 60_000,
        limit: configService.get<number>('throttle.limit') ?? 100,
      }]),
    }),

    // Redis & RabbitMQ
    RedisModule,
    RabbitMQModule,

    // Feature modules
    AuthModule,
    UserModule,
    SessionModule,
    IdentityOutboxModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard,
    },
  ],
  controllers: [HealthController],
})
export class AppModule {}
