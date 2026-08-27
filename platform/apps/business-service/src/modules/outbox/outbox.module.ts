import { Module } from '@nestjs/common';
import { EventsModule as SharedEventsModule } from '../../../../../libs/shared/src';
import { BusinessOutboxService } from './outbox.service';
import { BusinessOutboxPublisher } from './business-outbox.publisher';

@Module({
  imports: [SharedEventsModule],
  providers: [BusinessOutboxService, BusinessOutboxPublisher],
  exports: [BusinessOutboxService],
})
export class BusinessOutboxModule {}
