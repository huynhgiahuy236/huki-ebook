import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  DomainEvent,
  ORDER_EVENTS,
  PAYMENT_EVENTS,
  SHIPPING_EVENTS,
} from '../../../../../libs/shared/src';
import { Prisma, SellerOrderStatus } from '../../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryReservationService } from './inventory-reservation.service';

@Injectable()
export class OrderCompletionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reservations: InventoryReservationService,
  ) {}

  async processShippingEvent(event: DomainEvent): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        const duplicate = await tx.inboxEvent.findUnique({
          where: { eventId: event.eventId },
        });
        if (duplicate) return;
        const payload = event.payload as Record<string, any>;
        const sellerOrder = await tx.sellerOrder.findUnique({
          where: { id: payload.sellerOrderId },
          include: { items: true, order: true },
        });
        if (!sellerOrder)
          throw new NotFoundException(
            `Seller order ${payload.sellerOrderId} not found`,
          );

        if (event.eventType === SHIPPING_EVENTS.PICKED_UP) {
          await this.reservations.commit(
            tx,
            sellerOrder.orderId,
            sellerOrder.items.map((item) => item.id),
          );
        }

        const status = this.sellerStatus(event.eventType);
        if (
          status &&
          sellerOrder.status !== SellerOrderStatus.CANCELLED &&
          sellerOrder.status !== SellerOrderStatus.COMPLETED
        ) {
          await tx.sellerOrder.update({
            where: { id: sellerOrder.id },
            data: {
              status,
              trackingCode: payload.trackingNumber ?? sellerOrder.trackingCode,
              shippedAt:
                status === SellerOrderStatus.SHIPPED
                  ? new Date(event.occurredAt)
                  : undefined,
              completedAt:
                status === SellerOrderStatus.COMPLETED
                  ? new Date(event.occurredAt)
                  : undefined,
            },
          });
          await tx.orderStatusHistory.create({
            data: {
              orderId: sellerOrder.orderId,
              sellerOrderId: sellerOrder.id,
              fromStatus: sellerOrder.status,
              toStatus: status,
              title:
                status === SellerOrderStatus.COMPLETED
                  ? 'Order delivered'
                  : 'Shipment status updated',
              description: `Shipping event: ${event.eventType}`,
              actorType: 'SYSTEM',
              metadata: {
                shipmentId: payload.shipmentId,
                trackingNumber: payload.trackingNumber,
              },
            },
          });
          if (status === SellerOrderStatus.SHIPPED) {
            await tx.order.updateMany({
              where: {
                id: sellerOrder.orderId,
                status: { notIn: ['COMPLETED', 'CANCELLED', 'REFUNDED'] },
              },
              data: { status: 'SHIPPING' },
            });
          }
          if (status === SellerOrderStatus.COMPLETED) {
            await this.completeIfReady(tx, sellerOrder.orderId);
          }
        }

        await tx.inboxEvent.create({
          data: {
            eventId: event.eventId,
            type: event.eventType,
            aggregateId: event.aggregateId,
            payload: event.payload as Prisma.InputJsonValue,
          },
        });
      });
    } catch (error) {
      if ((error as { code?: string }).code !== 'P2002') throw error;
    }
  }

  async processInventoryReleaseEvent(event: DomainEvent): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        if (
          await tx.inboxEvent.findUnique({ where: { eventId: event.eventId } })
        )
          return;
        const orderId = String(event.payload.orderId ?? event.aggregateId);
        await this.reservations.release(tx, orderId);
        await tx.inboxEvent.create({
          data: {
            eventId: event.eventId,
            type: event.eventType,
            aggregateId: event.aggregateId,
            payload: event.payload as Prisma.InputJsonValue,
          },
        });
      });
    } catch (error) {
      if ((error as { code?: string }).code !== 'P2002') throw error;
    }
  }

  async completeIfReady(
    tx: Prisma.TransactionClient,
    orderId: string,
  ): Promise<boolean> {
    const remaining = await tx.sellerOrder.count({
      where: {
        orderId,
        status: {
          notIn: [SellerOrderStatus.COMPLETED, SellerOrderStatus.CANCELLED],
        },
      },
    });
    if (remaining > 0) return false;
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { sellerOrders: true },
    });
    if (!order || order.status === 'COMPLETED' || order.status === 'CANCELLED')
      return false;

    const cancelledCount = order.sellerOrders.filter(
      ({ status }) => status === SellerOrderStatus.CANCELLED,
    ).length;
    if (cancelledCount > 0) {
      const terminalStatus =
        cancelledCount === order.sellerOrders.length
          ? 'CANCELLED'
          : 'PARTIALLY_CANCELLED';
      await tx.order.update({
        where: { id: orderId },
        data: { status: terminalStatus },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: terminalStatus,
          title:
            terminalStatus === 'CANCELLED'
              ? 'Order cancelled'
              : 'Order partially completed',
          description:
            'All seller orders are terminal and at least one seller order was cancelled',
          actorType: 'SYSTEM',
        },
      });
      return false;
    }

    const now = new Date();
    const codPaid =
      order.paymentMethod === 'COD' && order.paymentStatus !== 'SUCCEEDED';
    if (codPaid) {
      await tx.payment.updateMany({
        where: {
          orderId,
          method: 'COD',
          status: { in: ['PENDING', 'PROCESSING'] },
        },
        data: {
          status: 'SUCCEEDED',
          paidAt: now,
          transactionId: `COD-${order.code}`,
        },
      });
    }
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: 'COMPLETED',
        ...(codPaid ? { paymentStatus: 'SUCCEEDED' } : {}),
      },
    });
    await tx.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus: 'COMPLETED',
        title: 'Order completed',
        description:
          'All seller orders have reached a terminal successful state',
        actorType: 'SYSTEM',
      },
    });
    const basePayload = {
      orderId,
      orderCode: order.code,
      userId: order.userId,
      amount: Number(order.grandTotal),
      paymentMethod: order.paymentMethod,
      sellerOrders: order.sellerOrders.map(({ id, ownerUserId, storeId }) => ({
        sellerOrderId: id,
        ownerUserId,
        storeId,
      })),
    };
    const outbox: Prisma.OutboxEventCreateManyInput[] = [
      {
        eventId: randomBytes(16).toString('hex'),
        type: ORDER_EVENTS.COMPLETED,
        aggregateId: orderId,
        payload: basePayload as Prisma.InputJsonValue,
      },
    ];
    if (codPaid) {
      outbox.push(
        {
          eventId: randomBytes(16).toString('hex'),
          type: ORDER_EVENTS.PAID,
          aggregateId: orderId,
          payload: { ...basePayload, provider: 'COD' } as Prisma.InputJsonValue,
        },
        {
          eventId: randomBytes(16).toString('hex'),
          type: PAYMENT_EVENTS.SUCCEEDED,
          aggregateId: orderId,
          payload: { ...basePayload, provider: 'COD' } as Prisma.InputJsonValue,
        },
      );
    }
    await tx.outboxEvent.createMany({ data: outbox });
    return true;
  }

  private sellerStatus(eventType: string): SellerOrderStatus | null {
    if (
      [
        SHIPPING_EVENTS.PICKED_UP,
        SHIPPING_EVENTS.IN_TRANSIT,
        SHIPPING_EVENTS.OUT_FOR_DELIVERY,
      ].includes(eventType as any)
    ) {
      return SellerOrderStatus.SHIPPED;
    }
    return eventType === SHIPPING_EVENTS.DELIVERED
      ? SellerOrderStatus.COMPLETED
      : null;
  }
}
