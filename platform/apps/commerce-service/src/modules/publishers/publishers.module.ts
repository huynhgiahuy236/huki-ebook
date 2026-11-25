import { Module } from '@nestjs/common';
import { PublishersController } from './publishers.controller';
import { IssuingCompaniesController } from './issuing-companies.controller';
import { TranslatorsController } from './translators.controller';
import { PublishersService } from './publishers.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [PublishersController, IssuingCompaniesController, TranslatorsController],
  providers: [PublishersService],
  exports: [PublishersService],
})
export class PublishersModule {}
