import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { CheckoutConfirmDto, CheckoutPreviewDto } from './dto/checkout.dto';
import { InventoryReservationService } from './inventory-reservation.service';
import {
  BookFormat,
  BookStatus,
  CartItemFormat,
  PaymentMethod,
  PaymentStatus,
  SellerOrderStatus,
  Prisma,
} from '../../../prisma/generated/client';
import { ORDER_EVENTS } from '../../../../../libs/shared/src';
import { throwBadRequest, throwNotFound, throwConflict } from '@huki/shared/errors';
import { ErrorCode } from '@huki/shared/errors';

export interface CheckoutSnapshotItem {
  cartItemId: string;
  bookId: string;
  storeId: string;
  ownerUserId: string;
  title: string;
  coverUrl: string | null;
  isbn: string | null;
  format: CartItemFormat;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  weight: number;
}

export interface CheckoutSnapshotGroup {
  storeId: string;
  ownerUserId: string;
  requiresShipping: boolean;
  itemSubtotal: number;
  shippingFee: number;
  grandTotal: number;
  items: CheckoutSnapshotItem[];
}

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly config: ConfigService,
    private readonly reservations: InventoryReservationService,
  ) {}

  async preview(userId: string, dto: CheckoutPreviewDto) {
    const cart = await this.cartService.getCartEntity(userId);
    if (!cart!.items.length) throwBadRequest(ErrorCode.CART_EMPTY);

    const items: CheckoutSnapshotItem[] = cart!.items.map((item) => {
      const book = item.book as any;
      if (book.status !== BookStatus.PUBLISHED) {
        throwConflict(ErrorCode.BOOK_NOT_FOUND);
      }

      if (item.format === CartItemFormat.PHYSICAL) {
        if (
          ![BookFormat.PHYSICAL, BookFormat.BOTH].includes(book.format) ||
          !book.physicalDetails?.physicalEnabled
        ) {
          throwConflict(ErrorCode.BOOK_FORMAT_NOT_AVAILABLE);
        }
        if (
          book.physicalDetails.stock - book.physicalDetails.reserved <
          item.quantity
        ) {
          throwConflict(ErrorCode.INVENTORY_INSUFFICIENT);
        }
      } else {
        if (
          ![BookFormat.DIGITAL, BookFormat.BOTH].includes(book.format) ||
          !book.digitalDetails?.digitalEnabled
        ) {
          throwConflict(ErrorCode.BOOK_FORMAT_NOT_AVAILABLE);
        }
      }

      const unitPrice = Number(book.price);
      return {
        cartItemId: item.id,
        bookId: book.id,
        storeId: book.storeId,
        ownerUserId: book.ownerUserId,
        title: book.title,
        coverUrl: book.coverUrl,
        isbn: book.isbn,
        format: item.format,
        quantity: item.quantity,
        unitPrice,
        subtotal: unitPrice * item.quantity,
        weight:
          item.format === CartItemFormat.PHYSICAL && book.physicalDetails
            ? book.physicalDetails.weight * item.quantity
            : 0,
      };
    });

    const requiresShipping = items.some(
      (item) => item.format === CartItemFormat.PHYSICAL,
    );
    if (requiresShipping && !dto.shippingAddress) {
      throwBadRequest(ErrorCode.SHIPPING_ADDRESS_REQUIRED);
    }

    const baseFee = Number(
      this.config.get('checkout.shippingBaseFee') ??
        process.env.CHECKOUT_SHIPPING_BASE_FEE ??
        30000,
    );

    const grouped = new Map<string, CheckoutSnapshotGroup>();
    for (const item of items) {
      let group = grouped.get(item.storeId);
      if (!group) {
        group = {
          storeId: item.storeId,
          ownerUserId: item.ownerUserId,
          requiresShipping: false,
          itemSubtotal: 0,
          shippingFee: 0,
          grandTotal: 0,
          items: [],
        };
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
    const snapshot = {
      groups,
      itemSubtotal: groups.reduce((sum, g) => sum + g.itemSubtotal, 0),
      shippingTotal: groups.reduce((sum, g) => sum + g.shippingFee, 0),
      discountTotal: 0,
      grandTotal: groups.reduce((sum, g) => sum + g.grandTotal, 0),
      shippingAddress: dto.shippingAddress ?? null,
      note: dto.note ?? null,
    };

    const ttlMinutes = Number(
      this.config.get('checkout.sessionTtlMinutes') ??
        process.env.CHECKOUT_SESSION_TTL_MINUTES ??
        15,
    );
    const session = await this.prisma.checkoutSession.create({
      data: {
        userId,
        cartId: cart!.id,
        cartUpdatedAt: cart!.updatedAt as Date,
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
      },
    });

    return { sessionId: session.id, expiresAt: session.expiresAt, ...snapshot };
  }

  async confirm(
    userId: string,
    idempotencyKey: string,
    dto: CheckoutConfirmDto,
  ) {
    if (!idempotencyKey || idempotencyKey.length > 100) {
      throwBadRequest(ErrorCode.IDEMPOTENCY_KEY_REQUIRED);
    }

    // Check for existing order
    const existing = await this.prisma.order.findFirst({
      where: { userId, idempotencyKey },
      include: { sellerOrders: { include: { items: true } } },
    });
    if (existing) return this.confirmResponse(existing, true);

    try {
      const order = await this.prisma.$transaction(async (tx) => {
        const rawSession = await tx.checkoutSession.findUnique({
          where: { id: dto.sessionId },
        });

        if (!rawSession || rawSession.userId !== userId) {
          throwNotFound(ErrorCode.CHECKOUT_SESSION_NOT_FOUND);
        }
        const session = rawSession!;
        if (session.consumedAt) {
          throwConflict(ErrorCode.CHECKOUT_SESSION_CONSUMED);
        }
        if (session.expiresAt < new Date()) {
          throwConflict(ErrorCode.CHECKOUT_SESSION_EXPIRED);
        }

        const snapshot = session.snapshot as any;

        if (
          dto.paymentMethod === PaymentMethod.ONLINE_PAYMENT &&
          dto.paymentProvider &&
          dto.paymentProvider.toUpperCase() !== 'PAYOS'
        ) {
          throwBadRequest(ErrorCode.PAYMENT_PROVIDER_INVALID);
        }
        if (
          dto.paymentMethod === PaymentMethod.COD &&
          snapshot.groups.some((group: CheckoutSnapshotGroup) =>
            group.items.some((item) => item.format !== CartItemFormat.PHYSICAL),
          )
        ) {
          throwBadRequest(ErrorCode.COD_NOT_AVAILABLE);
        }

        // Create order
        const order = await tx.order.create({
          data: {
            code: this.code('ORD'),
            userId,
            idempotencyKey,
            itemSubtotal: snapshot.itemSubtotal,
            shippingTotal: snapshot.shippingTotal,
            discountTotal: snapshot.discountTotal,
            grandTotal: snapshot.grandTotal,
            paymentMethod: dto.paymentMethod,
            paymentProvider:
              dto.paymentMethod === PaymentMethod.ONLINE_PAYMENT
                ? 'PAYOS'
                : 'COD',
            paymentStatus: PaymentStatus.PENDING,
            status:
              dto.paymentMethod === PaymentMethod.COD
                ? 'PROCESSING'
                : 'PENDING_PAYMENT',
            shippingAddress: snapshot.shippingAddress,
            note: snapshot.note,
          },
        });

        if (dto.paymentMethod === PaymentMethod.COD) {
          await tx.payment.create({
            data: {
              orderId: order.id,
              amount: order.grandTotal,
              method: PaymentMethod.COD,
              status: PaymentStatus.PENDING,
              provider: 'COD',
            },
          });
        }

        // Grant digital book access immediately for all orders (COD and online)
        const allItems = snapshot.groups.flatMap((group: any) => group.items);
        const digitalItems = allItems.filter(
          (item: CheckoutSnapshotItem) => item.format === CartItemFormat.DIGITAL,
        );
        for (const item of digitalItems) {
          const sellerOrder = snapshot.groups.find((g: any) =>
            g.items.some((i: any) => i.cartItemId === item.cartItemId),
          );
          await tx.bookAccess.upsert({
            where: {
              userId_bookId: { userId, bookId: item.bookId },
            },
            create: {
              userId,
              bookId: item.bookId,
              orderId: order.id,
              sellerOrderId: sellerOrder?.sellerOrderId,
            },
            update: {
              status: 'ACTIVE',
              orderId: order.id,
              sellerOrderId: sellerOrder?.sellerOrderId,
            },
          });
        }

        const shipmentSellerOrders: Array<{
          sellerOrderId: string;
          storeId: string;
          ownerUserId: string;
          requiresShipping: boolean;
          weight: number;
          codAmount: number;
        }> = [];

        // Create seller orders and items
        for (let i = 0; i < snapshot.groups.length; i++) {
          const group = snapshot.groups[i];
          const sellerOrder = await tx.sellerOrder.create({
            data: {
              orderId: order.id,
              code: `${order.code}-S${i + 1}`,
              storeId: group.storeId,
              ownerUserId: group.ownerUserId,
              requiresShipping: group.requiresShipping,
              itemSubtotal: group.itemSubtotal,
              shippingFee: group.shippingFee,
              grandTotal: group.grandTotal,
              status:
                dto.paymentMethod === PaymentMethod.COD
                  ? SellerOrderStatus.PENDING_CONFIRMATION
                  : SellerOrderStatus.PENDING_PAYMENT,
            },
          });

          const orderItems = await Promise.all(
            group.items.map((item: any) =>
              tx.orderItem.create({
                data: {
                  sellerOrderId: sellerOrder.id,
                  bookId: item.bookId,
                  bookTitle: item.title,
                  bookCoverUrl: item.coverUrl,
                  bookIsbn: item.isbn,
                  format: item.format,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  subtotal: item.subtotal,
                },
              }),
            ),
          );

          shipmentSellerOrders.push({
            sellerOrderId: sellerOrder.id,
            storeId: group.storeId,
            ownerUserId: group.ownerUserId,
            requiresShipping: group.requiresShipping,
            weight: group.items.reduce(
              (total: number, item: CheckoutSnapshotItem) =>
                total + item.weight,
              0,
            ),
            codAmount:
              dto.paymentMethod === PaymentMethod.COD ? group.grandTotal : 0,
          });

          // Reserve inventory for physical books
          await this.reservations.reserve(tx, order.id, orderItems);
        }

        // Create order status history
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            fromStatus: null,
            toStatus: order.status,
            title: 'Order created',
            actorType: 'USER',
            actorId: userId,
          },
        });

        // Create outbox event
        await tx.outboxEvent.create({
          data: {
            eventId: randomBytes(16).toString('hex'),
            type: ORDER_EVENTS.CREATED,
            aggregateId: order.id,
            payload: {
              orderId: order.id,
              orderCode: order.code,
              userId,
              total: order.grandTotal,
              paymentMethod: order.paymentMethod,
              paymentStatus: order.paymentStatus,
              shippingAddress: snapshot.shippingAddress
                ? {
                    receiverName: snapshot.shippingAddress.recipientName,
                    receiverPhone: snapshot.shippingAddress.phone,
                    address: snapshot.shippingAddress.line1,
                    province: snapshot.shippingAddress.province,
                    district: snapshot.shippingAddress.district,
                    ward: snapshot.shippingAddress.ward,
                  }
                : null,
              sellerOrders: shipmentSellerOrders,
            },
            status: 'PENDING',
          },
        });

        // Mark session as consumed
        await tx.checkoutSession.update({
          where: { id: session!.id },
          data: { consumedAt: new Date() },
        });

        // Clear cart items
        await tx.cartItem.deleteMany({ where: { cartId: session!.cartId } });

        return order;
      });

      return this.confirmResponse(order, false);
    } catch (error) {
      if ((error as any).code === 'P2002') {
        const duplicate = await this.prisma.order.findFirst({
          where: { userId, idempotencyKey },
          include: { sellerOrders: { include: { items: true } } },
        });
        if (duplicate) return this.confirmResponse(duplicate, true);
      }
      throw error;
    }
  }

  private code(prefix: string) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = randomBytes(4).toString('hex').toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  private confirmResponse(order: any, replayed: boolean) {
    return {
      order,
      idempotentReplay: replayed,
      paymentRequired:
        order.paymentMethod === PaymentMethod.ONLINE_PAYMENT &&
        order.paymentStatus !== PaymentStatus.SUCCEEDED,
      paymentProvider: order.paymentProvider,
    };
  }
}
