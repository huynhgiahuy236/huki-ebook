import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
    if (!cart.items.length) throw new BadRequestException('Cart is empty');

    const items: CheckoutSnapshotItem[] = cart.items.map((item) => {
      const book = item.book as any;
      if (book.status !== BookStatus.PUBLISHED) {
        throw new ConflictException(`${book.title} is no longer available`);
      }

      if (item.format === CartItemFormat.PHYSICAL) {
        if (
          ![BookFormat.PHYSICAL, BookFormat.BOTH].includes(book.format) ||
          !book.physicalDetails?.physicalEnabled
        ) {
          throw new ConflictException(
            `${book.title} physical edition is unavailable`,
          );
        }
        if (
          book.physicalDetails.stock - book.physicalDetails.reserved <
          item.quantity
        ) {
          throw new ConflictException(`Insufficient stock for ${book.title}`);
        }
      } else {
        if (
          ![BookFormat.DIGITAL, BookFormat.BOTH].includes(book.format) ||
          !book.digitalDetails?.digitalEnabled
        ) {
          throw new ConflictException(
            `${book.title} digital edition is unavailable`,
          );
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
      throw new BadRequestException(
        'Shipping address is required for physical books',
      );
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
        cartId: cart.id,
        cartUpdatedAt: cart.updatedAt,
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
      throw new BadRequestException(
        'A valid Idempotency-Key header is required',
      );
    }

    // Check for existing order
    const existing = await this.prisma.order.findFirst({
      where: { userId, idempotencyKey },
      include: { sellerOrders: { include: { items: true } } },
    });
    if (existing) return this.confirmResponse(existing, true);

    try {
      const order = await this.prisma.$transaction(async (tx) => {
        const session = await tx.checkoutSession.findUnique({
          where: { id: dto.sessionId },
        });

        if (!session || session.userId !== userId) {
          throw new NotFoundException('Checkout session not found');
        }
        if (session.consumedAt) {
          throw new ConflictException(
            'Checkout session has already been consumed',
          );
        }
        if (session.expiresAt < new Date()) {
          throw new ConflictException('Checkout session has expired');
        }

        const snapshot = session.snapshot as any;

        if (
          dto.paymentMethod === PaymentMethod.ONLINE_PAYMENT &&
          dto.paymentProvider &&
          dto.paymentProvider.toUpperCase() !== 'PAYOS'
        ) {
          throw new BadRequestException(
            'PAYOS is the only supported online payment provider',
          );
        }
        if (
          dto.paymentMethod === PaymentMethod.COD &&
          snapshot.groups.some((group: CheckoutSnapshotGroup) =>
            group.items.some((item) => item.format !== CartItemFormat.PHYSICAL),
          )
        ) {
          throw new BadRequestException(
            'COD is available only for physical books',
          );
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
            type: 'order.created',
            aggregateId: order.id,
            payload: { orderId: order.id, userId, total: order.grandTotal },
            status: 'PENDING',
          },
        });

        // Mark session as consumed
        await tx.checkoutSession.update({
          where: { id: session.id },
          data: { consumedAt: new Date() },
        });

        // Clear cart items
        await tx.cartItem.deleteMany({ where: { cartId: session.cartId } });

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
