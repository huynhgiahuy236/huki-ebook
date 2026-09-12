import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisService } from './redis.service';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = process.env.REDIS_HOST || configService.get('REDIS_HOST') || configService.get('redis.host', 'localhost');
        const port = Number(process.env.REDIS_PORT || configService.get('REDIS_PORT') || 6379);
        const password = process.env.REDIS_PASSWORD || configService.get('redis.password') || undefined;

        const redis = new Redis({
          host,
          port,
          password,
          maxRetriesPerRequest: null,
          enableOfflineQueue: false,
          retryStrategy: (times) => Math.min(times * 100, 3000),
        });

        redis.on('connect', () => console.log('Redis connected'));
        redis.on('error', (err) => {
          // Log redis warning silently without crashing app
        });

        return redis;
      },
    },
    RedisService,
  ],
  exports: [REDIS_CLIENT, RedisService],
})
export class RedisModule {}
