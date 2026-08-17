import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  HistoryActorType, Order, OrderItem, OrderStatus, OrderStatusHistory, OutboxEvent, OutboxStatus,
  PaymentStatus, SellerOrder, SellerOrderStatus,
} from '../../entities';
import { BookActor } from '../../common/book-auth.guard';
import { CancelOrderDto, ShipOrderDto } from './dto/checkout.dto';
import { OrderQueryDto, SellerOrderQueryDto } from './dto/order-query.dto';
import { InventoryReservationService } from './inventory-reservation.service';

const IMMUTABLE = new Set([SellerOrderStatus.COMPLETED, SellerOrderStatus.CANCELLED]);
const SHIPPED = new Set([SellerOrderStatus.SHIPPED, SellerOrderStatus.DELIVERED, SellerOrderStatus.COMPLETED]);

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(SellerOrder) private readonly sellerOrders: Repository<SellerOrder>,
    @InjectRepository(OrderStatusHistory) private readonly history: Repository<OrderStatusHistory>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly reservations: InventoryReservationService,
  ) {}

  async buyerList(userId: string, query: OrderQueryDto) {
    const [items, total] = await this.orders.findAndCount({
      where: { userId, ...(query.status && { status: query.status }) },
      relations: { sellerOrders: { items: true } }, order: { createdAt: 'DESC' },
      skip: (query.page - 1) * query.limit, take: query.limit,
    });
    return { items: items.map((item) => this.buyerView(item)), pagination: this.pagination(query.page, query.limit, total) };
  }

  async buyerDetail(userId: string, id: string) {
    const order = await this.orders.findOne({ where: { id, userId }, relations: { sellerOrders: { items: true } } });
    if (!order) throw new NotFoundException('Order not found');
    return this.buyerView(order);
  }

  async sellerList(actor: BookActor, query: SellerOrderQueryDto) {
    const where = { ...(actor.role !== 'PLATFORM_ADMIN' && { ownerUserId: actor.sub }), ...(query.status && { status: query.status }) };
    const [items, total] = await this.sellerOrders.findAndCount({ where, relations: { items: true, order: true }, order: { createdAt: 'DESC' }, skip: (query.page - 1) * query.limit, take: query.limit });
    return { items: items.map((item) => this.sellerView(item)), pagination: this.pagination(query.page, query.limit, total) };
  }

  async sellerDetail(actor: BookActor, id: string) {
    const sellerOrder = await this.sellerOrders.findOne({ where: { id }, relations: { items: true, order: true } });
    this.assertSeller(sellerOrder, actor);
    return this.sellerView(sellerOrder!);
  }

  confirm(actor: BookActor, id: string) {
    return this.transition(actor, id, [SellerOrderStatus.PENDING_CONFIRMATION], async (manager, sellerOrder) => {
      sellerOrder.confirmedAt = new Date();
      return sellerOrder.requiresShipping ? SellerOrderStatus.CONFIRMED : SellerOrderStatus.COMPLETED;
    }, 'Seller confirmed order');
  }

  prepare(actor: BookActor, id: string) {
    return this.transition(actor, id, [SellerOrderStatus.CONFIRMED], async () => SellerOrderStatus.PREPARING, 'Seller is preparing order');
  }

  ship(actor: BookActor, id: string, dto: ShipOrderDto) {
    return this.transition(actor, id, [SellerOrderStatus.PREPARING], async (manager, sellerOrder) => {
      await this.reservations.commit(manager, sellerOrder.orderId, sellerOrder.items.map((item) => item.id));
      sellerOrder.carrier = dto.carrier;
      sellerOrder.trackingCode = dto.trackingCode;
      sellerOrder.shippedAt = new Date();
      return SellerOrderStatus.SHIPPED;
    }, 'Order handed to carrier', { carrier: dto.carrier, trackingCode: dto.trackingCode });
  }

  deliver(actor: BookActor, id: string) {
    return this.transition(actor, id, [SellerOrderStatus.SHIPPED], async (_manager, sellerOrder) => {
      sellerOrder.completedAt = new Date();
      return SellerOrderStatus.COMPLETED;
    }, 'Order delivered');
  }

  async cancelBuyer(userId: string, id: string, dto: CancelOrderDto) {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.getRepository(Order).findOne({ where: { id, userId }, lock: { mode: 'pessimistic_write' } });
      if (!order) throw new NotFoundException('Order not found');
      order.sellerOrders = await manager.getRepository(SellerOrder).find({ where: { orderId: order.id }, relations: { items: true } });
      if (order.sellerOrders.some((item) => SHIPPED.has(item.status))) throw new ConflictException('An order cannot be cancelled after shipment');
      const now = new Date();
      for (const sellerOrder of order.sellerOrders.filter((item) => !IMMUTABLE.has(item.status))) {
        const from = sellerOrder.status;
        sellerOrder.status = SellerOrderStatus.CANCELLED; sellerOrder.cancelledAt = now; sellerOrder.cancelReason = dto.reason;
        await manager.save(sellerOrder);
        await this.record(manager, order.id, sellerOrder.id, from, sellerOrder.status, 'Buyer cancelled seller order', HistoryActorType.USER, userId, { reason: dto.reason });
      }
      await this.reservations.release(manager, order.id);
      order.cancelReason = dto.reason; order.cancelledAt = now;
      await this.aggregate(manager, order, HistoryActorType.USER, userId);
      if (order.paymentStatus === PaymentStatus.SUCCEEDED) order.paymentStatus = PaymentStatus.REFUND_PENDING;
      await manager.save(order);
      await this.event(manager, 'order.cancelled', order.id, { orderId: order.id, reason: dto.reason });
      return order;
    });
  }

  async cancelSeller(actor: BookActor, id: string, dto: CancelOrderDto) {
    return this.dataSource.transaction(async (manager) => {
      const sellerOrder = await manager.getRepository(SellerOrder).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      this.assertSeller(sellerOrder, actor);
      sellerOrder!.items = await manager.getRepository(OrderItem).find({ where: { sellerOrderId: id } });
      sellerOrder!.order = await manager.getRepository(Order).findOneByOrFail({ id: sellerOrder!.orderId });
      if (SHIPPED.has(sellerOrder!.status) || IMMUTABLE.has(sellerOrder!.status)) throw new ConflictException('Seller order can no longer be cancelled');
      const from = sellerOrder!.status;
      sellerOrder!.status = SellerOrderStatus.CANCELLED; sellerOrder!.cancelledAt = new Date(); sellerOrder!.cancelReason = dto.reason;
      await manager.save(sellerOrder!);
      await this.reservations.release(manager, sellerOrder!.orderId, sellerOrder!.items.map((item) => item.id));
      await this.record(manager, sellerOrder!.orderId, sellerOrder!.id, from, sellerOrder!.status, 'Seller cancelled order', HistoryActorType.SELLER, actor.sub, { reason: dto.reason });
      await this.aggregate(manager, sellerOrder!.order, HistoryActorType.SELLER, actor.sub);
      if (sellerOrder!.order.paymentStatus === PaymentStatus.SUCCEEDED) {
        sellerOrder!.order.paymentStatus = PaymentStatus.REFUND_PENDING;
        await manager.save(sellerOrder!.order);
      }
      await this.event(manager, 'seller-order.cancelled', sellerOrder!.orderId, { sellerOrderId: sellerOrder!.id, reason: dto.reason });
      return sellerOrder;
    });
  }

  async tracking(userId: string, id: string) {
    const order = await this.orders.findOne({ where: { id, userId }, relations: { sellerOrders: { items: true } } });
    if (!order) throw new NotFoundException('Order not found');
    const timeline = await this.history.find({ where: { orderId: id }, order: { createdAt: 'ASC' } });
    return { orderId: id, status: order.status, sellers: order.sellerOrders.map(({ id, code, status, carrier, trackingCode }) => ({ id, code, status, carrier, trackingCode })), timeline };
  }

  private async transition(actor: BookActor, id: string, allowed: SellerOrderStatus[], change: (manager: EntityManager, sellerOrder: SellerOrder) => Promise<SellerOrderStatus>, title: string, metadata: Record<string, unknown> | null = null) {
    return this.dataSource.transaction(async (manager) => {
      const sellerOrder = await manager.getRepository(SellerOrder).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      this.assertSeller(sellerOrder, actor);
      if (!allowed.includes(sellerOrder!.status)) throw new ConflictException(`Cannot transition from ${sellerOrder!.status}`);
      sellerOrder!.items = await manager.getRepository(OrderItem).find({ where: { sellerOrderId: id } });
      sellerOrder!.order = await manager.getRepository(Order).findOneByOrFail({ id: sellerOrder!.orderId });
      const from = sellerOrder!.status;
      sellerOrder!.status = await change(manager, sellerOrder!);
      if (sellerOrder!.status === SellerOrderStatus.COMPLETED) sellerOrder!.completedAt = new Date();
      await manager.save(sellerOrder!);
      await this.record(manager, sellerOrder!.orderId, sellerOrder!.id, from, sellerOrder!.status, title, HistoryActorType.SELLER, actor.sub, metadata);
      await this.aggregate(manager, sellerOrder!.order, HistoryActorType.SELLER, actor.sub);
      await this.event(manager, 'seller-order.status-changed', sellerOrder!.orderId, { sellerOrderId: sellerOrder!.id, from, to: sellerOrder!.status });
      return sellerOrder;
    });
  }

  private async aggregate(manager: EntityManager, order: Order, actorType: HistoryActorType, actorId: string) {
    const sellers = await manager.getRepository(SellerOrder).find({ where: { orderId: order.id } });
    const previous = order.status;
    if (sellers.every((item) => item.status === SellerOrderStatus.CANCELLED)) order.status = OrderStatus.CANCELLED;
    else if (sellers.every((item) => item.status === SellerOrderStatus.COMPLETED)) order.status = OrderStatus.COMPLETED;
    else if (sellers.some((item) => [SellerOrderStatus.SHIPPED, SellerOrderStatus.DELIVERED].includes(item.status))) order.status = OrderStatus.SHIPPING;
    else if (sellers.some((item) => item.status === SellerOrderStatus.CANCELLED)) order.status = OrderStatus.PARTIALLY_CANCELLED;
    else order.status = order.paymentStatus === PaymentStatus.PENDING && order.paymentMethod === 'ONLINE_PAYMENT' ? OrderStatus.PENDING_PAYMENT : OrderStatus.PROCESSING;
    await manager.save(order);
    if (previous !== order.status) await this.record(manager, order.id, null, previous, order.status, 'Order status updated', actorType, actorId, null);
  }

  private record(manager: EntityManager, orderId: string, sellerOrderId: string | null, fromStatus: string | null, toStatus: string, title: string, actorType: HistoryActorType, actorId: string | null, metadata: Record<string, unknown> | null) {
    return manager.save(manager.create(OrderStatusHistory, { orderId, sellerOrderId, fromStatus, toStatus, title, description: null, actorType, actorId, metadata }));
  }
  private event(manager: EntityManager, type: string, aggregateId: string, payload: Record<string, unknown>) {
    return manager.save(manager.create(OutboxEvent, { eventId: randomUUID(), type, aggregateId, payload, status: OutboxStatus.PENDING, publishedAt: null }));
  }
  private assertSeller(order: SellerOrder | null, actor: BookActor): asserts order is SellerOrder {
    if (!order) throw new NotFoundException('Seller order not found');
    if (actor.role !== 'PLATFORM_ADMIN' && order.ownerUserId !== actor.sub) throw new ForbiddenException('Seller order does not belong to this account');
  }
  private pagination(page: number, limit: number, total: number) { return { page, limit, total, totalPages: Math.ceil(total / limit) }; }
  private buyerView(order: Order) {
    const { idempotencyKey: _idempotencyKey, deletedAt: _deletedAt, ...safe } = order;
    return safe;
  }
  private sellerView(sellerOrder: SellerOrder) {
    const { order, deletedAt: _deletedAt, ...safe } = sellerOrder;
    return {
      ...safe,
      order: order && {
        id: order.id, code: order.code, status: order.status, paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus, shippingAddress: order.shippingAddress, note: order.note, createdAt: order.createdAt,
      },
    };
  }
}
