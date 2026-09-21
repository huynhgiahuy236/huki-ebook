import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SanctionsService } from './sanctions.service';
import { AppealsService } from './appeals.service';
import { SanctionsController } from './sanctions.controller';

@Global()
@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [SanctionsController],
  providers: [SanctionsService, AppealsService],
  exports: [SanctionsService, AppealsService],
})
export class SanctionsModule {}
