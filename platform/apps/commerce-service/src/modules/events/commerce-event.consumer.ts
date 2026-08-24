import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import {
  DomainEvent,
  ORDER_EVENTS,
  PAYMENT_EVENTS,
  RabbitMqEventBus,
  SHIPPING_EVENTS,
} from '../../../../../libs/shared/src';
import { OrderCompletionService } from '../orders/order-completion.service';

@Injectable()
export class CommerceEventConsumer implements OnApplicationBootstrap {
  constructor(
    private readonly bus: RabbitMqEventBus,
    private readonly completion: OrderCompletionService,
  ) {}

  onApplicationBootstrap(): void {
    this.bus.subscribe(
      'commerce-service.inventory-and-completion',
      [
        ORDER_EVENTS.CANCELLED,
        PAYMENT_EVENTS.FAILED,
        SHIPPING_EVENTS.CREATED,
        SHIPPING_EVENTS.PICKED_UP,
        SHIPPING_EVENTS.IN_TRANSIT,
        SHIPPING_EVENTS.OUT_FOR_DELIVERY,
        SHIPPING_EVENTS.DELIVERED,
        SHIPPING_EVENTS.FAILED,
        SHIPPING_EVENTS.RETURNED,
        SHIPPING_EVENTS.CANCELLED,
      ],
      (event) => this.handle(event),
    );
  }

  private async handle(event: DomainEvent): Promise<void> {
    if (
      [ORDER_EVENTS.CANCELLED, PAYMENT_EVENTS.FAILED].includes(
        event.eventType as any,
      )
    ) {
      await this.completion.processInventoryReleaseEvent(event);
      return;
    }
    if (Object.values(SHIPPING_EVENTS).includes(event.eventType as any)) {
      await this.completion.processShippingEvent(event);
    }
  }
}
