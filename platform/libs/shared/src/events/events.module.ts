import { Global, Module } from '@nestjs/common';
import { RabbitMqEventBus } from './rabbitmq-event-bus.service';

@Global()
@Module({
  providers: [RabbitMqEventBus],
  exports: [RabbitMqEventBus],
})
export class EventsModule {}
