import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import {
  BookFormat, BookStatus, Cart, CartItem, CartItemFormat, CheckoutSession, HistoryActorType,
  Order, OrderItem, OrderStatus, OrderStatusHistory, OutboxEvent, OutboxStatus,
  PaymentMethod, PaymentStatus, SellerOrder, SellerOrderStatus,
} from '../../entities';
import { CartService } from '../cart/cart.service';
import { CheckoutConfirmDto, CheckoutPreviewDto } from './dto/checkout.dto';
import { CheckoutSnapshot, CheckoutSnapshotGroup, CheckoutSnapshotItem } from './checkout.types';
import { InventoryReservationService } from './inventory-reservation.service';

@Injectable()
export class CheckoutService {
  constructor(
    private readonly cartService: CartService,
    @InjectRepository(CheckoutSession) private readonly sessions: Repository<CheckoutSession>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly reservations: InventoryReservationService,
  ) {}

  async preview(userId: string, dto: CheckoutPreviewDto) {
    const cart = await this.cartService.getCartEntity(userId);
    if (!cart.items.length) throw new BadRequestException('Cart is empty');
    const items = cart.items.map((item): CheckoutSnapshotItem => {
      const book = item.book;
      if (book.status !== BookStatus.PUBLISHED) throw new ConflictException(`${book.title} is no longer available`);
      if (item.format === CartItemFormat.PHYSICAL) {
        if (![BookFormat.PHYSICAL, BookFormat.BOTH].includes(book.format) || !book.physicalDetails?.physicalEnabled) throw new ConflictException(`${book.title} physical edition is unavailable`);
        if (book.physicalDetails.stock - book.physicalDetails.reserved < item.quantity) throw new ConflictException(`Insufficient stock for ${book.title}`);
      } else if (![BookFormat.DIGITAL, BookFormat.BOTH].includes(book.format) || !book.digitalDetails?.digitalEnabled) {
        throw new ConflictException(`${book.title} digital edition is unavailable`);
      }
      return {
        cartItemId: item.id, bookId: book.id, storeId: book.storeId, ownerUserId: book.ownerUserId,
        title: book.title, coverUrl: book.coverUrl, isbn: book.isbn, format: item.format,
        quantity: item.quantity, unitPrice: book.price, subtotal: book.price * item.quantity,
        weight: item.format === CartItemFormat.PHYSICAL ? book.physicalDetails!.weight * item.quantity : 0,
      };
    });
    const requiresShipping = items.some((item) => item.format === CartItemFormat.PHYSICAL);
    if (requiresShipping && !dto.shippingAddress) throw new BadRequestException('Shipping address is required for physical books');

    const baseFee = Number(this.config.get('checkout.shippingBaseFee') ?? process.env.CHECKOUT_SHIPPING_BASE_FEE ?? 30000);
    const grouped = new Map<string, CheckoutSnapshotGroup>();
    for (const item of items) {
      let group = grouped.get(item.storeId);
      if (!group) {
        group = { storeId: item.storeId, ownerUserId: item.ownerUserId, requiresShipping: false, itemSubtotal: 0, shippingFee: 0, grandTotal: 0, items: [] };
        grouped.set(item.storeId, group);
      }
      group.items.push(item);
      group.itemSubtotal += item.subtotal;
      group.requiresShipping ||= item.format === CartItemFormat.PHYSICAL;
    }
    for (const group of grouped.values()) {
      group.shippingFee = group.requiresShipping ? baseFee : 0;
      group.grandTotal = group.itemSubtotal + group.shippingFee;
    }
    const groups = [...grouped.values()];
    const snapshot: CheckoutSnapshot = {
      groups,
      itemSubtotal: groups.reduce((sum, group) => sum + group.itemSubtotal, 0),
      shippingTotal: groups.reduce((sum, group) => sum + group.shippingFee, 0),
      discountTotal: 0,
      grandTotal: groups.reduce((sum, group) => sum + group.grandTotal, 0),
      shippingAddress: dto.shippingAddress ?? null,
      note: dto.note ?? null,
    };
    const ttlMinutes = Number(this.config.get('checkout.sessionTtlMinutes') ?? process.env.CHECKOUT_SESSION_TTL_MINUTES ?? 15);
    const session = await this.sessions.save(this.sessions.create({
      userId, cartId: cart.id, cartUpdatedAt: cart.updatedAt, snapshot: snapshot as unknown as Record<string, unknown>,
      expiresAt: new Date(Date.now() + ttlMinutes * 60_000), consumedAt: null,
    }));
    return { sessionId: session.id, expiresAt: session.expiresAt, ...snapshot };
  }

  async confirm(userId: string, idempotencyKey: string, dto: CheckoutConfirmDto) {
    if (!idempotencyKey || idempotencyKey.length > 100) throw new BadRequestException('A valid Idempotency-Key header is required');
    const existing = await this.dataSource.getRepository(Order).findOne({ where: { userId, idempotencyKey }, relations: { sellerOrders: { items: true } } });
    if (existing) return this.confirmResponse(existing, true);

    try {
      const order = await this.dataSource.transaction(async (manager) => {
        const session = await manager.getRepository(CheckoutSession).findOne({ where: { id: dto.sessionId, userId }, lock: { mode: 'pessimistic_write' } });
        if (!session) throw new NotFoundException('Checkout session not found');
        if (session.consumedAt) throw new ConflictException('Checkout session has already been consumed');
        if (session.expiresAt.getTime() <= Date.now()) throw new ConflictException('Checkout session has expired');
        const cart = await manager.getRepository(Cart).findOne({ where: { id: session.cartId, userId }, lock: { mode: 'pessimistic_write' } });
        if (!cart || cart.updatedAt.getTime() !== session.cartUpdatedAt.getTime()) throw new ConflictException('Cart changed after checkout preview');
        const snapshot = session.snapshot as unknown as CheckoutSnapshot;
        if (dto.paymentMethod === PaymentMethod.ONLINE_PAYMENT && !dto.paymentProvider) throw new BadRequestException('paymentProvider is required for online payment');
        const order = await manager.save(manager.create(Order, {
          userId, idempotencyKey, code: this.code('ORD'), itemSubtotal: snapshot.itemSubtotal,
          shippingTotal: snapshot.shippingTotal, discountTotal: snapshot.discountTotal, grandTotal: snapshot.grandTotal,
          paymentMethod: dto.paymentMethod, paymentProvider: dto.paymentProvider ?? null, paymentStatus: PaymentStatus.PENDING,
          status: dto.paymentMethod === PaymentMethod.COD ? OrderStatus.PROCESSING : OrderStatus.PENDING_PAYMENT,
          shippingAddress: snapshot.shippingAddress, note: snapshot.note, cancelledAt: null, cancelReason: null,
        }));
        const allItems: OrderItem[] = [];
        order.sellerOrders = [];
        for (const [index, group] of snapshot.groups.entries()) {
          const sellerOrder = await manager.save(manager.create(SellerOrder, {
            orderId: order.id, code: `${order.code}-S${index + 1}`, storeId: group.storeId, ownerUserId: group.ownerUserId,
            requiresShipping: group.requiresShipping, itemSubtotal: group.itemSubtotal, shippingFee: group.shippingFee,
            grandTotal: group.grandTotal, status: dto.paymentMethod === PaymentMethod.COD ? SellerOrderStatus.PENDING_CONFIRMATION : SellerOrderStatus.PENDING_PAYMENT,
            carrier: null, trackingCode: null, confirmedAt: null, shippedAt: null, completedAt: null, cancelledAt: null, cancelReason: null,
          }));
          sellerOrder.items = await manager.save(OrderItem, group.items.map((item) => manager.create(OrderItem, {
            sellerOrderId: sellerOrder.id, bookId: item.bookId, bookTitle: item.title, bookCoverUrl: item.coverUrl,
            bookIsbn: item.isbn, format: item.format, quantity: item.quantity, unitPrice: item.unitPrice, subtotal: item.subtotal,
          })));
          allItems.push(...sellerOrder.items);
          order.sellerOrders.push(sellerOrder);
        }
        await this.reservations.reserve(manager, order.id, allItems);
        await manager.save(manager.create(OrderStatusHistory, {
          orderId: order.id, sellerOrderId: null, fromStatus: null, toStatus: order.status,
          title: 'Order created', description: null, actorType: HistoryActorType.USER, actorId: userId, metadata: null,
        }));
        await manager.save(manager.create(OutboxEvent, {
          eventId: randomUUID(), type: 'order.created', aggregateId: order.id,
          payload: { orderId: order.id, userId, total: order.grandTotal }, status: OutboxStatus.PENDING, publishedAt: null,
        }));
        session.consumedAt = new Date();
        await manager.save(session);
        await manager.getRepository(CartItem).delete({ cartId: cart.id });
        cart.updatedAt = new Date();
        await manager.save(cart);
        return order;
      });
      return this.confirmResponse(order, false);
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        const duplicate = await this.dataSource.getRepository(Order).findOne({ where: { userId, idempotencyKey }, relations: { sellerOrders: { items: true } } });
        if (duplicate) return this.confirmResponse(duplicate, true);
      }
      throw error;
    }
  }

  private code(prefix: string) { return `${prefix}-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`; }
  private confirmResponse(order: Order, replayed: boolean) {
    return { order, idempotentReplay: replayed, paymentRequired: order.paymentMethod === PaymentMethod.ONLINE_PAYMENT && order.paymentStatus !== PaymentStatus.SUCCEEDED, paymentProvider: order.paymentProvider };
  }
}
