import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { BookActor } from '../../common/book-auth.guard';
import { CancelOrderDto, ShipOrderDto } from './dto/checkout.dto';
import { OrderQueryDto, SellerOrderQueryDto } from './dto/order-query.dto';
import { InventoryReservationService } from './inventory-reservation.service';
import { SellerOrderStatus, Prisma } from '../../../prisma/generated/client';
import { ORDER_EVENTS } from '../../../../../libs/shared/src';
import { OrderCompletionService } from './order-completion.service';
import { throwConflict, throwNotFound, throwForbidden } from '@huki/shared/errors';
import { ErrorCode } from '@huki/shared/errors';

const IMMUTABLE = new Set<SellerOrderStatus>([
  SellerOrderStatus.COMPLETED,
  SellerOrderStatus.CANCELLED,
]);
const SHIPPED = new Set<SellerOrderStatus>([
  SellerOrderStatus.SHIPPED,
  SellerOrderStatus.DELIVERED,
  SellerOrderStatus.COMPLETED,
]);

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reservations: InventoryReservationService,
    private readonly completion: OrderCompletionService,
  ) {}

  async buyerList(userId: string, query: OrderQueryDto) {
    const where: any = { userId };
    if (query.status) where.status = query.status;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: { sellerOrders: { include: { items: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items: items.map((item) => this.buyerView(item)),
      pagination: this.pagination(query.page, query.limit, total),
    };
  }

  async buyerDetail(userId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId },
      include: { sellerOrders: { include: { items: true } } },
    });
    if (!order) throwNotFound(ErrorCode.ORDER_NOT_FOUND);
    return this.buyerView(order);
  }

  async sellerList(actor: BookActor, query: SellerOrderQueryDto) {
    const where: any = {};
    if (actor.role !== 'PLATFORM_ADMIN') {
      where.ownerUserId = actor.sub;
    }
    if (query.status) where.status = query.status;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.sellerOrder.findMany({
        where,
        include: { items: true, order: true },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.sellerOrder.count({ where }),
    ]);

    return {
      items: items.map((item) => this.sellerView(item)),
      pagination: this.pagination(query.page, query.limit, total),
    };
  }

  async sellerDetail(actor: BookActor, id: string) {
    const sellerOrder = await this.prisma.sellerOrder.findUnique({
      where: { id },
      include: { items: true, order: true },
    });
    this.assertSeller(sellerOrder, actor);
    return this.sellerView(sellerOrder!);
  }

  async confirm(actor: BookActor, id: string) {
    return this.transition(
      actor,
      id,
      [SellerOrderStatus.PENDING_CONFIRMATION],
      async (tx, sellerOrder) => {
        await tx.sellerOrder.update({
          where: { id },
          data: { confirmedAt: new Date() },
        });
        return sellerOrder.requiresShipping
          ? SellerOrderStatus.CONFIRMED
          : SellerOrderStatus.COMPLETED;
      },
      'Seller confirmed order',
    );
  }

  async prepare(actor: BookActor, id: string) {
    return this.transition(
      actor,
      id,
      [SellerOrderStatus.CONFIRMED],
      async () => {
        return SellerOrderStatus.PREPARING;
      },
      'Seller is preparing order',
    );
  }

  async ship(actor: BookActor, id: string, dto: ShipOrderDto) {
    return this.transition(
      actor,
      id,
      [SellerOrderStatus.PREPARING],
      async (tx, sellerOrder) => {
        const itemIds = sellerOrder.items.map(
          (item: { id: string }) => item.id,
        );
        await this.reservations.commit(tx as any, sellerOrder.orderId, itemIds);
        await tx.sellerOrder.update({
          where: { id },
          data: {
            carrier: dto.carrier,
            trackingCode: dto.trackingCode,
            shippedAt: new Date(),
          },
        });
        return SellerOrderStatus.SHIPPED;
      },
      'Order handed to carrier',
      { carrier: dto.carrier, trackingCode: dto.trackingCode },
    );
  }

  async deliver(actor: BookActor, id: string) {
    return this.transition(
      actor,
      id,
      [SellerOrderStatus.SHIPPED],
      async (tx, sellerOrder) => {
        await tx.sellerOrder.update({
          where: { id },
          data: { completedAt: new Date() },
        });
        return SellerOrderStatus.COMPLETED;
      },
      'Order delivered',
    );
  }

  async cancelBuyer(userId: string, id: string, dto: CancelOrderDto) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id, userId },
        include: { sellerOrders: { include: { items: true } } },
      });
      if (!order) throwNotFound(ErrorCode.ORDER_NOT_FOUND);
      const o = order!;

      if (o.sellerOrders.some((item) => SHIPPED.has(item.status))) {
        throwConflict(ErrorCode.ORDER_CANNOT_CANCEL);
      }

      const now = new Date();
      const itemIds: string[] = [];

      for (const sellerOrder of o.sellerOrders) {
        if (!IMMUTABLE.has(sellerOrder.status)) {
          await tx.sellerOrder.update({
            where: { id: sellerOrder.id },
            data: {
              status: SellerOrderStatus.CANCELLED,
              cancelledAt: now,
              cancelReason: dto.reason,
            },
          });
          itemIds.push(...sellerOrder.items.map((item) => item.id));
        }
      }

      await this.reservations.release(tx as any, o.id, itemIds);

      const newStatus = 'CANCELLED';

      await tx.order.update({
        where: { id },
        data: {
          status: newStatus,
          cancelReason: dto.reason,
          cancelledAt: now,
          paymentStatus:
            o.paymentStatus === 'SUCCEEDED'
              ? 'REFUND_PENDING'
              : o.paymentStatus,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: o.id,
          fromStatus: o.status,
          toStatus: newStatus,
          title: 'Buyer cancelled order',
          actorType: 'USER',
          actorId: userId,
        },
      });

      await tx.outboxEvent.create({
        data: {
          eventId: randomBytes(16).toString('hex'),
          type: ORDER_EVENTS.CANCELLED,
          aggregateId: o.id,
          payload: {
            orderId: o.id,
            orderCode: o.code,
            userId: o.userId,
            reason: dto.reason,
            sellerOrders: o.sellerOrders.map(
              ({ id: sellerOrderId, ownerUserId, storeId }) => ({
                sellerOrderId,
                ownerUserId,
                storeId,
              }),
            ),
          },
          status: 'PENDING',
        },
      });

      return o;
    });
  }

  async cancelSeller(actor: BookActor, id: string, dto: CancelOrderDto) {
    return this.prisma.$transaction(async (tx) => {
      const sellerOrder = await tx.sellerOrder.findUnique({
        where: { id },
        include: { items: true, order: true },
      });
      this.assertSeller(sellerOrder, actor);

      if (
        SHIPPED.has(sellerOrder!.status) ||
        IMMUTABLE.has(sellerOrder!.status)
      ) {
        throwConflict(ErrorCode.SELLER_ORDER_CANNOT_CANCEL);
      }

      const itemIds = sellerOrder!.items.map((item) => item.id);
      await this.reservations.release(tx as any, sellerOrder!.orderId, itemIds);

      await tx.sellerOrder.update({
        where: { id },
        data: {
          status: SellerOrderStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelReason: dto.reason,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: sellerOrder!.orderId,
          sellerOrderId: sellerOrder!.id,
          fromStatus: sellerOrder!.status,
          toStatus: SellerOrderStatus.CANCELLED,
          title: 'Seller cancelled order',
          actorType: 'SELLER',
          actorId: actor.sub,
        },
      });

      await this.completion.completeIfReady(tx, sellerOrder!.orderId);

      await tx.outboxEvent.create({
        data: {
          eventId: randomBytes(16).toString('hex'),
          type: ORDER_EVENTS.SELLER_CANCELLED,
          aggregateId: sellerOrder!.orderId,
          payload: {
            orderId: sellerOrder!.orderId,
            orderCode: sellerOrder!.order.code,
            userId: sellerOrder!.order.userId,
            sellerOrderId: sellerOrder!.id,
            requiresShipping: sellerOrder!.requiresShipping,
            sellerOrders: [
              {
                sellerOrderId: sellerOrder!.id,
                ownerUserId: sellerOrder!.ownerUserId,
                storeId: sellerOrder!.storeId,
              },
            ],
            reason: dto.reason,
          },
          status: 'PENDING',
        },
      });

      return sellerOrder;
    });
  }

  async tracking(userId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId },
      include: { sellerOrders: { include: { items: true } } },
    });
    if (!order) throwNotFound(ErrorCode.ORDER_NOT_FOUND);

    const timeline = await this.prisma.orderStatusHistory.findMany({
      where: { orderId: id },
      orderBy: { createdAt: 'asc' },
    });

    return {
      orderId: id,
      status: order!.status,
      sellers: order!.sellerOrders.map(
        ({ id, code, status, carrier, trackingCode }) => ({
          id,
          code,
          status,
          carrier,
          trackingCode,
        }),
      ),
      timeline,
    };
  }

  private async transition(
    actor: BookActor,
    id: string,
    allowed: SellerOrderStatus[],
    change: (tx: any, sellerOrder: any) => Promise<SellerOrderStatus>,
    title: string,
    metadata?: Record<string, unknown>,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const sellerOrder = await tx.sellerOrder.findUnique({
        where: { id },
        include: { items: true, order: true },
      });

      this.assertSeller(sellerOrder, actor);

      if (!allowed.includes(sellerOrder!.status)) {
        throwConflict(ErrorCode.ORDER_STATUS_TRANSITION_INVALID);
      }

      const fromStatus = sellerOrder!.status;
      const newStatus = await change(tx, sellerOrder);

      await tx.sellerOrder.update({
        where: { id },
        data: {
          status: newStatus,
          completedAt:
            newStatus === SellerOrderStatus.COMPLETED ? new Date() : undefined,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: sellerOrder!.orderId,
          sellerOrderId: sellerOrder!.id,
          fromStatus,
          toStatus: newStatus,
          title,
          actorType: 'SELLER',
          actorId: actor.sub,
          metadata: metadata as Prisma.InputJsonValue | undefined,
        },
      });

      if (newStatus === SellerOrderStatus.COMPLETED) {
        await this.completion.completeIfReady(tx, sellerOrder!.orderId);
      }

      await tx.outboxEvent.create({
        data: {
          eventId: randomBytes(16).toString('hex'),
          type:
            newStatus === SellerOrderStatus.CONFIRMED ||
            newStatus === SellerOrderStatus.COMPLETED
              ? ORDER_EVENTS.SELLER_CONFIRMED
              : newStatus === SellerOrderStatus.SHIPPED
                ? ORDER_EVENTS.SELLER_SHIPPED
                : 'SELLER_ORDER_STATUS_CHANGED',
          aggregateId: sellerOrder!.orderId,
          payload: {
            orderId: sellerOrder!.orderId,
            orderCode: sellerOrder!.order.code,
            userId: sellerOrder!.order.userId,
            sellerOrderId: sellerOrder!.id,
            ownerUserId: sellerOrder!.ownerUserId,
            storeId: sellerOrder!.storeId,
            from: fromStatus,
            to: newStatus,
          },
          status: 'PENDING',
        },
      });

      return sellerOrder;
    });
  }

  private assertSeller(order: any, actor: BookActor): asserts order {
    if (!order) throwNotFound(ErrorCode.SELLER_ORDER_NOT_FOUND);
    if (actor.role !== 'PLATFORM_ADMIN' && order.ownerUserId !== actor.sub) {
      throwForbidden(ErrorCode.AUTHZ_NOT_OWNER);
    }
  }

  private pagination(page: number, limit: number, total: number) {
    return { page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  private buyerView(order: any) {
    return {
      id: order.id,
      code: order.code,
      userId: order.userId,
      itemSubtotal: Number(order.itemSubtotal),
      shippingTotal: Number(order.shippingTotal),
      discountTotal: Number(order.discountTotal),
      grandTotal: Number(order.grandTotal),
      paymentMethod: order.paymentMethod,
      paymentProvider: order.paymentProvider,
      paymentStatus: order.paymentStatus,
      status: order.status,
      shippingAddress: order.shippingAddress,
      note: order.note,
      cancelledAt: order.cancelledAt,
      cancelReason: order.cancelReason,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      sellerOrders: order.sellerOrders,
    };
  }

  private sellerView(sellerOrder: any) {
    return {
      id: sellerOrder.id,
      orderId: sellerOrder.orderId,
      code: sellerOrder.code,
      storeId: sellerOrder.storeId,
      ownerUserId: sellerOrder.ownerUserId,
      requiresShipping: sellerOrder.requiresShipping,
      itemSubtotal: Number(sellerOrder.itemSubtotal),
      shippingFee: Number(sellerOrder.shippingFee),
      grandTotal: Number(sellerOrder.grandTotal),
      status: sellerOrder.status,
      carrier: sellerOrder.carrier,
      trackingCode: sellerOrder.trackingCode,
      confirmedAt: sellerOrder.confirmedAt,
      shippedAt: sellerOrder.shippedAt,
      completedAt: sellerOrder.completedAt,
      cancelledAt: sellerOrder.cancelledAt,
      cancelReason: sellerOrder.cancelReason,
      createdAt: sellerOrder.createdAt,
      updatedAt: sellerOrder.updatedAt,
      items: sellerOrder.items,
      order: sellerOrder.order
        ? {
            id: sellerOrder.order.id,
            code: sellerOrder.order.code,
            status: sellerOrder.order.status,
            paymentMethod: sellerOrder.order.paymentMethod,
            paymentStatus: sellerOrder.order.paymentStatus,
            shippingAddress: sellerOrder.order.shippingAddress,
            note: sellerOrder.order.note,
            createdAt: sellerOrder.order.createdAt,
          }
        : null,
    };
  }
}
