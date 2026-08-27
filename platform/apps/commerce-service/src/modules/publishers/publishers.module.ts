import { Module } from '@nestjs/common';
import { PublishersController } from './publishers.controller';
import { PublishersService } from './publishers.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [PublishersController],
  providers: [PublishersService],
  exports: [PublishersService],
})
export class PublishersModule {}
