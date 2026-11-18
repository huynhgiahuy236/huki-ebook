import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import {
  DomainEvent,
  ORDER_EVENTS,
  RabbitMqEventBus,
} from '@huki/shared';
import { Prisma } from '../../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateShipmentsFromOrderDto } from '../shipments/dto/create-shipments.dto';
import { ShipmentsService } from '../shipments/shipments.service';

@Injectable()
export class ShippingOrderEventConsumer implements OnApplicationBootstrap {
  private readonly logger = new Logger(ShippingOrderEventConsumer.name);

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
    const processed = await this.prisma.inboxEvent.findUnique({
      where: { eventId: event.eventId },
      select: { id: true },
    });
    if (processed) {
      this.logger.debug(
        `[ShippingOrderEventConsumer] Duplicate event discarded: ${event.eventId} (${event.eventType})`,
      );
      return;
    }

    // Keep the inbox as a completion record. If processing throws, leave no
    // completed marker so the broker can safely redeliver the event.
    this.logger.log(
      `[ShippingOrderEventConsumer] Processing ${event.eventType} for aggregate ${event.aggregateId} (eventId: ${event.eventId})`,
    );

    if (
      event.eventType === ORDER_EVENTS.CREATED ||
      event.eventType === ORDER_EVENTS.PAID
    ) {
      await this.shipments.createFromOrder(
        event.payload as unknown as CreateShipmentsFromOrderDto,
      );
    } else if (event.eventType === ORDER_EVENTS.CANCELLED) {
      await this.shipments.cancelByOrder(
        String(event.payload?.orderId ?? event.aggregateId),
        String(event.payload?.reason ?? 'Order cancelled'),
      );
    } else if (
      event.eventType === ORDER_EVENTS.SELLER_CANCELLED &&
      event.payload?.requiresShipping !== false
    ) {
      await this.shipments.cancelBySellerOrder(
        String(event.payload.sellerOrderId),
        { reason: String(event.payload?.reason ?? 'Seller order cancelled') },
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
      // A concurrent redelivery may have completed the same event after the
      // initial lookup. The shipment operations are idempotent by their stable
      // sellerOrderId/trackingNumber keys, so this unique conflict is harmless.
      if ((error as { code?: string }).code === 'P2002') return;
      throw error;
    }
  }
}
