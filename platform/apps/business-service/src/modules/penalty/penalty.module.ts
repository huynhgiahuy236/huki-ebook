import { Module } from '@nestjs/common';
import { PenaltyController } from './penalty.controller';
import { PenaltyService } from './penalty.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { BusinessOutboxModule } from '../outbox/outbox.module';

@Module({
  imports: [PrismaModule, BusinessOutboxModule],
  controllers: [PenaltyController],
  providers: [PenaltyService],
  exports: [PenaltyService],
})
export class PenaltyModule {}

