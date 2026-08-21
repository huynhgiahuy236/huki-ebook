import { Module } from '@nestjs/common';
import { EventsModule as SharedEventsModule } from '../../../../../libs/shared/src';
import { OrdersModule } from '../orders/orders.module';
import { CommerceEventConsumer } from './commerce-event.consumer';
import { CommerceOutboxPublisher } from './commerce-outbox.publisher';

@Module({
  imports: [SharedEventsModule, OrdersModule],
  providers: [CommerceOutboxPublisher, CommerceEventConsumer],
})
export class CommerceEventsModule {}
