import { Module } from '@nestjs/common';
import { EventsModule as SharedEventsModule } from '@huki/shared';
import { PromotionOutboxService } from './outbox.service';
import { PromotionOutboxPublisher } from './promotion-outbox.publisher';
import { PromotionOrderEventConsumer } from './promotion-order-event.consumer';
import { VouchersModule } from '../vouchers/vouchers.module';
import { FlashSalesModule } from '../flash-sales/flash-sales.module';

@Module({
  imports: [SharedEventsModule, VouchersModule, FlashSalesModule],
  providers: [
    PromotionOutboxService,
    PromotionOutboxPublisher,
    PromotionOrderEventConsumer,
  ],
  exports: [PromotionOutboxService],
})
export class PromotionOutboxModule {}
