import { Module } from '@nestjs/common';
import { EventsModule as SharedEventsModule } from '../../../../../libs/shared/src';
import { ShipmentsModule } from '../shipments/shipments.module';
import { ShippingOrderEventConsumer } from './shipping-order-event.consumer';
import { ShippingOutboxPublisher } from './shipping-outbox.publisher';

@Module({
  imports: [SharedEventsModule, ShipmentsModule],
  providers: [ShippingOutboxPublisher, ShippingOrderEventConsumer],
})
export class ShippingEventsModule {}
