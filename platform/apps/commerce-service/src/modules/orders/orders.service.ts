import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { BookActor } from '../../common/book-auth.guard';
import { CancelOrderDto, ShipOrderDto } from './dto/checkout.dto';
import { OrderQueryDto, SellerOrderQueryDto } from './dto/order-query.dto';
import { InventoryReservationService } from './inventory-reservation.service';
import { SellerOrderStatus, Prisma } from '../../../prisma/generated/client';

const IMMUTABLE = new Set<SellerOrderStatus>([SellerOrderStatus.COMPLETED, SellerOrderStatus.CANCELLED]);
const SHIPPED = new Set<SellerOrderStatus>([SellerOrderStatus.SHIPPED, SellerOrderStatus.DELIVERED, SellerOrderStatus.COMPLETED]);

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reservations: InventoryReservationService,
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
    if (!order) throw new NotFoundException('Order not found');
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
    return this.transition(actor, id, [SellerOrderStatus.PENDING_CONFIRMATION], async (tx, sellerOrder) => {
      await tx.sellerOrder.update({
        where: { id },
        data: { confirmedAt: new Date() },
      });
      return sellerOrder.requiresShipping ? SellerOrderStatus.CONFIRMED : SellerOrderStatus.COMPLETED;
    }, 'Seller confirmed order');
  }

  async prepare(actor: BookActor, id: string) {
    return this.transition(actor, id, [SellerOrderStatus.CONFIRMED], async () => {
      return SellerOrderStatus.PREPARING;
    }, 'Seller is preparing order');
  }

  async ship(actor: BookActor, id: string, dto: ShipOrderDto) {
    return this.transition(actor, id, [SellerOrderStatus.PREPARING], async (tx, sellerOrder) => {
      const itemIds = sellerOrder.items.map((item: { id: string }) => item.id);
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
    }, 'Order handed to carrier', { carrier: dto.carrier, trackingCode: dto.trackingCode });
  }

  async deliver(actor: BookActor, id: string) {
    return this.transition(actor, id, [SellerOrderStatus.SHIPPED], async (tx, sellerOrder) => {
      await tx.sellerOrder.update({
        where: { id },
        data: { completedAt: new Date() },
      });
      if (sellerOrder.order.paymentMethod === 'COD') {
        const remaining = await tx.sellerOrder.count({
          where: {
            orderId: sellerOrder.orderId,
            id: { not: sellerOrder.id },
            status: { notIn: [SellerOrderStatus.COMPLETED, SellerOrderStatus.CANCELLED] },
          },
        });
        if (remaining === 0) {
          const now = new Date();
          await tx.payment.updateMany({
            where: { orderId: sellerOrder.orderId, method: 'COD', status: 'PENDING' },
            data: { status: 'SUCCEEDED', paidAt: now, transactionId: `COD-${sellerOrder.order.code}` },
          });
          await tx.order.update({
            where: { id: sellerOrder.orderId },
            data: { paymentStatus: 'SUCCEEDED', status: 'COMPLETED' },
          });
          await tx.outboxEvent.create({
            data: {
              eventId: randomBytes(16).toString('hex'),
              type: 'payment.succeeded',
              aggregateId: sellerOrder.orderId,
              payload: { orderId: sellerOrder.orderId, provider: 'COD' },
            },
          });
        }
      }
      return SellerOrderStatus.COMPLETED;
    }, 'Order delivered');
  }

  async cancelBuyer(userId: string, id: string, dto: CancelOrderDto) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id, userId },
        include: { sellerOrders: { include: { items: true } } },
      });
      if (!order) throw new NotFoundException('Order not found');

      if (order.sellerOrders.some((item) => SHIPPED.has(item.status))) {
        throw new ConflictException('An order cannot be cancelled after shipment');
      }

      const now = new Date();
      const itemIds: string[] = [];

      for (const sellerOrder of order.sellerOrders) {
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

      await this.reservations.release(tx as any, order.id, itemIds);

      const newStatus = order.sellerOrders.every((s) => s.status === SellerOrderStatus.CANCELLED)
        ? 'CANCELLED'
        : 'PARTIALLY_CANCELLED';

      await tx.order.update({
        where: { id },
        data: {
          status: newStatus,
          cancelReason: dto.reason,
          cancelledAt: now,
          paymentStatus: order.paymentStatus === 'SUCCEEDED' ? 'REFUND_PENDING' : order.paymentStatus,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: newStatus,
          title: 'Buyer cancelled order',
          actorType: 'USER',
          actorId: userId,
        },
      });

      await tx.outboxEvent.create({
        data: {
          eventId: randomBytes(16).toString('hex'),
          type: 'order.cancelled',
          aggregateId: order.id,
          payload: { orderId: order.id, reason: dto.reason },
          status: 'PENDING',
        },
      });

      return order;
    });
  }

  async cancelSeller(actor: BookActor, id: string, dto: CancelOrderDto) {
    return this.prisma.$transaction(async (tx) => {
      const sellerOrder = await tx.sellerOrder.findUnique({
        where: { id },
        include: { items: true, order: true },
      });
      this.assertSeller(sellerOrder, actor);

      if (SHIPPED.has(sellerOrder!.status) || IMMUTABLE.has(sellerOrder!.status)) {
        throw new ConflictException('Seller order can no longer be cancelled');
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

      await tx.outboxEvent.create({
        data: {
          eventId: randomBytes(16).toString('hex'),
          type: 'seller-order.cancelled',
          aggregateId: sellerOrder!.orderId,
          payload: { sellerOrderId: sellerOrder!.id, reason: dto.reason },
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
    if (!order) throw new NotFoundException('Order not found');

    const timeline = await this.prisma.orderStatusHistory.findMany({
      where: { orderId: id },
      orderBy: { createdAt: 'asc' },
    });

    return {
      orderId: id,
      status: order.status,
      sellers: order.sellerOrders.map(({ id, code, status, carrier, trackingCode }) => ({
        id, code, status, carrier, trackingCode,
      })),
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
        throw new ConflictException(`Cannot transition from ${sellerOrder!.status}`);
      }

      const fromStatus = sellerOrder!.status;
      const newStatus = await change(tx, sellerOrder);

      await tx.sellerOrder.update({
        where: { id },
        data: {
          status: newStatus,
          completedAt: newStatus === SellerOrderStatus.COMPLETED ? new Date() : undefined,
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
        },
      });

      await tx.outboxEvent.create({
        data: {
          eventId: randomBytes(16).toString('hex'),
          type: 'seller-order.status-changed',
          aggregateId: sellerOrder!.orderId,
          payload: { sellerOrderId: sellerOrder!.id, from: fromStatus, to: newStatus },
          status: 'PENDING',
        },
      });

      return sellerOrder;
    });
  }

  private assertSeller(order: any, actor: BookActor): asserts order {
    if (!order) throw new NotFoundException('Seller order not found');
    if (actor.role !== 'PLATFORM_ADMIN' && order.ownerUserId !== actor.sub) {
      throw new ForbiddenException('Seller order does not belong to this account');
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
      order: sellerOrder.order ? {
        id: sellerOrder.order.id,
        code: sellerOrder.order.code,
        status: sellerOrder.order.status,
        paymentMethod: sellerOrder.order.paymentMethod,
        paymentStatus: sellerOrder.order.paymentStatus,
        shippingAddress: sellerOrder.order.shippingAddress,
        note: sellerOrder.order.note,
        createdAt: sellerOrder.order.createdAt,
      } : null,
    };
  }
}
