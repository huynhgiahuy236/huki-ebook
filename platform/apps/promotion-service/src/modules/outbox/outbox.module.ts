import { Module } from '@nestjs/common';
import { EventsModule as SharedEventsModule } from '../../../../../libs/shared/src';
import { PromotionOutboxService } from './outbox.service';
import { PromotionOutboxPublisher } from './promotion-outbox.publisher';

@Module({
  imports: [SharedEventsModule],
  providers: [PromotionOutboxService, PromotionOutboxPublisher],
  exports: [PromotionOutboxService],
})
export class PromotionOutboxModule {}
