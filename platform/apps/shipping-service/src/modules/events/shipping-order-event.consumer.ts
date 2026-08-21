import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import {
  DomainEvent,
  ORDER_EVENTS,
  RabbitMqEventBus,
} from '../../../../../libs/shared/src';
import { Prisma } from '../../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateShipmentsFromOrderDto } from '../shipments/dto/create-shipments.dto';
import { ShipmentsService } from '../shipments/shipments.service';

@Injectable()
export class ShippingOrderEventConsumer implements OnApplicationBootstrap {
  constructor(
    private readonly bus: RabbitMqEventBus,
    private readonly prisma: PrismaService,
    private readonly shipments: ShipmentsService,
  ) {}

  onApplicationBootstrap(): void {
    this.bus.subscribe(
      'shipping-service.order-events',
      [
        ORDER_EVENTS.CREATED,
        ORDER_EVENTS.PAID,
        ORDER_EVENTS.CANCELLED,
        ORDER_EVENTS.SELLER_CANCELLED,
      ],
      (event) => this.handle(event),
    );
  }

  private async handle(event: DomainEvent): Promise<void> {
    if (
      await this.prisma.inboxEvent.findUnique({
        where: { eventId: event.eventId },
      })
    )
      return;
    if (event.eventType === ORDER_EVENTS.CREATED) {
      await this.shipments.createFromOrder(
        event.payload as unknown as CreateShipmentsFromOrderDto,
      );
    } else if (event.eventType === ORDER_EVENTS.CANCELLED) {
      await this.shipments.cancelByOrder(
        String(event.payload.orderId ?? event.aggregateId),
        String(event.payload.reason ?? 'Order cancelled'),
      );
    } else if (
      event.eventType === ORDER_EVENTS.SELLER_CANCELLED &&
      event.payload.requiresShipping !== false
    ) {
      await this.shipments.cancelBySellerOrder(
        String(event.payload.sellerOrderId),
        { reason: String(event.payload.reason ?? 'Seller order cancelled') },
      );
    }
    try {
      await this.prisma.inboxEvent.create({
        data: {
          eventId: event.eventId,
          type: event.eventType,
          aggregateId: event.aggregateId,
          payload: event.payload as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      if ((error as { code?: string }).code !== 'P2002') throw error;
    }
  }
}
