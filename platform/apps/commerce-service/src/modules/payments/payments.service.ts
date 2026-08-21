import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  CartItemFormat,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  SellerOrderStatus,
} from '../../../prisma/generated/client';
import { BookActor } from '../../common/book-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryReservationService } from '../orders/inventory-reservation.service';
import { CreateRefundDto, InitiatePaymentDto, PayOSWebhookDto, SettleRefundDto } from './dto/payment.dto';
import { PayOSService } from './payos.service';

@Injectable()
export class PaymentsService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(PaymentsService.name);
  private expirationTimer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly payos: PayOSService,
    private readonly reservations: InventoryReservationService,
  ) {}

  onApplicationBootstrap(): void {
    this.expirationTimer = setInterval(() => {
      void this.expirePendingPayments().catch((error) =>
        this.logger.error('Unable to expire pending PayOS payments', error),
      );
    }, 60_000);
    this.expirationTimer.unref();
  }

  onModuleDestroy(): void {
    if (this.expirationTimer) clearInterval(this.expirationTimer);
  }

  async initiate(userId: string, orderId: string, dto: InitiatePaymentDto) {
    await this.expirePendingPayments();
    const order = await this.prisma.order.findFirst({ where: { id: orderId, userId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.paymentMethod !== PaymentMethod.ONLINE_PAYMENT) {
      throw new BadRequestException('COD orders do not use a PayOS payment link');
    }
    if (order.paymentStatus === PaymentStatus.SUCCEEDED) {
      throw new ConflictException('Order has already been paid');
    }
    if (['CANCELLED', 'REFUNDED'].includes(order.status)) {
      throw new ConflictException('Order can no longer be paid');
    }

    const active = await this.prisma.payment.findFirst({
      where: {
        orderId,
        provider: 'PAYOS',
        status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (active?.checkoutUrl) return this.paymentView(active);

    const amount = Number(order.grandTotal);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw new BadRequestException('PayOS amount must be a positive integer in VND');
    }
    const orderCode = Math.floor(Date.now() / 1000) * 1000 + Math.floor(Math.random() * 1000);
    const expiresAt = new Date(Date.now() + 15 * 60_000);
    const link = await this.payos.createPaymentLink({
      orderCode,
      amount,
      description: `HUKI ${order.code.slice(-16)}`.slice(0, 25),
      returnUrl: dto.returnUrl,
      cancelUrl: dto.cancelUrl,
      expiredAt: Math.floor(expiresAt.getTime() / 1000),
    });

    const payment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          orderId,
          amount,
          method: PaymentMethod.ONLINE_PAYMENT,
          status: PaymentStatus.PROCESSING,
          provider: 'PAYOS',
          payosOrderId: String(link.orderCode),
          payosPaymentLinkId: link.paymentLinkId,
          checkoutUrl: link.checkoutUrl,
          qrCode: link.qrCode,
          expiresAt,
        },
      });
      await tx.order.update({
        where: { id: orderId },
        data: { paymentProvider: 'PAYOS', paymentStatus: PaymentStatus.PROCESSING },
      });
      return created;
    });
    return this.paymentView(payment);
  }

  async getOrderPayment(userId: string, orderId: string) {
    await this.expirePendingPayments();
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { payments: { orderBy: { createdAt: 'desc' } }, refunds: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return {
      orderId: order.id,
      orderCode: order.code,
      paymentStatus: order.paymentStatus,
      payments: order.payments.map((payment) => this.paymentView(payment)),
      refunds: order.refunds.map((refund) => ({ ...refund, amount: Number(refund.amount) })),
    };
  }

  async handlePayOSWebhook(payload: PayOSWebhookDto) {
    if (!payload?.data || !this.payos.verifyWebhook(payload)) {
      throw new BadRequestException('Invalid PayOS webhook signature');
    }
    if (!payload.success || payload.code !== '00') return { success: true };

    const payosOrderId = String(payload.data.orderCode);
    const payment = await this.prisma.payment.findFirst({
      where: { provider: 'PAYOS', payosOrderId },
      include: {
        order: { include: { sellerOrders: { include: { items: true } } } },
      },
    });
    // PayOS sends a signed test webhook while confirming the URL.
    if (!payment) return { success: true };
    if (payment.status === PaymentStatus.SUCCEEDED) return { success: true };
    if (Number(payment.amount) !== Number(payload.data.amount)) {
      throw new BadRequestException('PayOS webhook amount does not match the order');
    }

    const paidAt = this.parsePayOSDate(payload.data.transactionDateTime);
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.payment.updateMany({
        where: {
          id: payment.id,
          status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
        },
        data: {
          status: PaymentStatus.SUCCEEDED,
          transactionId: payload.data.reference ?? payosOrderId,
          payosPaymentLinkId: payload.data.paymentLinkId ?? payment.payosPaymentLinkId,
          payosReturnCode: payload.code,
          callbackData: payload as unknown as Prisma.InputJsonValue,
          paidAt,
          failureReason: null,
        },
      });
      if (updated.count === 0) return;

      await tx.order.update({
        where: { id: payment.orderId },
        data: { paymentStatus: PaymentStatus.SUCCEEDED, status: 'PROCESSING' },
      });
      await tx.sellerOrder.updateMany({
        where: { orderId: payment.orderId, status: SellerOrderStatus.PENDING_PAYMENT },
        data: { status: SellerOrderStatus.PENDING_CONFIRMATION },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: payment.orderId,
          fromStatus: payment.order.status,
          toStatus: 'PROCESSING',
          title: 'Payment confirmed via PayOS',
          description: `Transaction: ${payload.data.reference ?? payosOrderId}`,
          actorType: 'SYSTEM',
        },
      });
      await tx.outboxEvent.create({
        data: {
          eventId: `PAYOS-${payosOrderId}`,
          type: 'payment.succeeded',
          aggregateId: payment.orderId,
          payload: {
            orderId: payment.orderId,
            paymentId: payment.id,
            transactionId: payload.data.reference ?? payosOrderId,
            amount: Number(payload.data.amount),
            provider: 'PAYOS',
          },
        },
      });

      const digitalItems = payment.order.sellerOrders
        .flatMap(({ items }) => items)
        .filter(({ format }) => format === CartItemFormat.DIGITAL);
      for (const item of digitalItems) {
        await tx.bookAccess.upsert({
          where: { userId_bookId: { userId: payment.order.userId, bookId: item.bookId } },
          create: {
            userId: payment.order.userId,
            bookId: item.bookId,
            orderId: payment.orderId,
            sellerOrderId: item.sellerOrderId,
          },
          update: { status: 'ACTIVE', orderId: payment.orderId, sellerOrderId: item.sellerOrderId },
        });
      }
    });
    return { success: true };
  }

  async requestRefund(actor: BookActor, orderId: string, dto: CreateRefundDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payments: {
          where: { status: { in: [PaymentStatus.SUCCEEDED, PaymentStatus.PARTIAL_REFUND] } },
          orderBy: { paidAt: 'desc' },
        },
        refunds: { where: { status: { in: ['PENDING', 'PROCESSING', 'SUCCEEDED'] } } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (actor.role !== 'PLATFORM_ADMIN' && order.userId !== actor.sub) {
      throw new ForbiddenException('Order does not belong to this account');
    }
    const payment = order.payments[0];
    if (!payment) throw new ConflictException('Order has no successful payment to refund');
    const alreadyRequested = order.refunds.reduce((sum, refund) => sum + Number(refund.amount), 0);
    const remaining = Number(payment.amount) - alreadyRequested;
    const amount = dto.amount ?? remaining;
    if (amount <= 0 || amount > remaining) {
      throw new BadRequestException(`Refund amount exceeds remaining refundable amount (${remaining})`);
    }

    return this.prisma.$transaction(async (tx) => {
      const refund = await tx.refund.create({
        data: {
          orderId,
          paymentId: payment.id,
          amount,
          reason: dto.reason,
          status: 'PENDING',
          provider: 'PAYOS',
          requestedBy: actor.sub,
        },
      });
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.REFUND_PENDING },
      });
      await tx.order.update({
        where: { id: orderId },
        data: { paymentStatus: PaymentStatus.REFUND_PENDING },
      });
      await tx.outboxEvent.create({
        data: {
          eventId: randomBytes(16).toString('hex'),
          type: 'refund.requested',
          aggregateId: orderId,
          payload: { refundId: refund.id, orderId, paymentId: payment.id, amount, provider: 'PAYOS' },
        },
      });
      return { ...refund, amount: Number(refund.amount) };
    });
  }

  async settleRefund(actor: BookActor, refundId: string, dto: SettleRefundDto) {
    if (actor.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only a platform administrator can reconcile refunds');
    }
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
      include: { payment: true, order: true },
    });
    if (!refund) throw new NotFoundException('Refund not found');
    if (!['PENDING', 'PROCESSING'].includes(refund.status)) {
      throw new ConflictException('Refund has already been reconciled');
    }
    if (!dto.succeeded && !dto.failureReason) {
      throw new BadRequestException('failureReason is required for a failed refund');
    }

    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const settled = await tx.refund.update({
        where: { id: refundId },
        data: dto.succeeded
          ? {
              status: 'SUCCEEDED',
              processedAt: now,
              providerReference: dto.providerReference,
              failureReason: null,
            }
          : {
              status: 'FAILED',
              failedAt: now,
              failureReason: dto.failureReason,
              providerReference: dto.providerReference,
            },
      });

      const succeeded = await tx.refund.aggregate({
        where: { paymentId: refund.paymentId, status: 'SUCCEEDED' },
        _sum: { amount: true },
      });
      const refundedAmount = Number(succeeded._sum.amount ?? 0);
      const fullyRefunded = refundedAmount >= Number(refund.payment.amount);
      const paymentStatus = dto.succeeded
        ? fullyRefunded ? PaymentStatus.REFUNDED : PaymentStatus.PARTIAL_REFUND
        : refundedAmount > 0 ? PaymentStatus.PARTIAL_REFUND : PaymentStatus.SUCCEEDED;

      await tx.payment.update({ where: { id: refund.paymentId }, data: { status: paymentStatus } });
      await tx.order.update({
        where: { id: refund.orderId },
        data: {
          paymentStatus,
          ...(fullyRefunded ? { status: 'REFUNDED' } : {}),
        },
      });
      if (fullyRefunded) {
        await tx.bookAccess.updateMany({
          where: { orderId: refund.orderId, status: 'ACTIVE' },
          data: { status: 'REVOKED' },
        });
      }
      await tx.outboxEvent.create({
        data: {
          eventId: randomBytes(16).toString('hex'),
          type: dto.succeeded ? 'refund.succeeded' : 'refund.failed',
          aggregateId: refund.orderId,
          payload: {
            refundId,
            orderId: refund.orderId,
            amount: Number(refund.amount),
            providerReference: dto.providerReference,
          },
        },
      });
      return { ...settled, amount: Number(settled.amount) };
    });
  }

  async expirePendingPayments() {
    const expired = await this.prisma.payment.findMany({
      where: {
        provider: 'PAYOS',
        status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
        expiresAt: { lte: new Date() },
      },
      include: { order: { include: { sellerOrders: { include: { items: true } } } } },
    });
    for (const payment of expired) {
      await this.prisma.$transaction(async (tx) => {
        const changed = await tx.payment.updateMany({
          where: {
            id: payment.id,
            status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
          },
          data: { status: PaymentStatus.EXPIRED, failedAt: new Date(), failureReason: 'Payment link expired' },
        });
        if (!changed.count) return;
        const itemIds = payment.order.sellerOrders.flatMap(({ items }) => items.map(({ id }) => id));
        await this.reservations.release(tx, payment.orderId, itemIds);
        await tx.sellerOrder.updateMany({
          where: { orderId: payment.orderId, status: SellerOrderStatus.PENDING_PAYMENT },
          data: { status: SellerOrderStatus.CANCELLED, cancelledAt: new Date(), cancelReason: 'Payment expired' },
        });
        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            paymentStatus: PaymentStatus.EXPIRED,
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancelReason: 'Payment expired',
          },
        });
      });
    }
    return { expired: expired.length };
  }

  private paymentView(payment: any) {
    return {
      id: payment.id,
      orderId: payment.orderId,
      amount: Number(payment.amount),
      method: payment.method,
      provider: payment.provider,
      status: payment.status,
      transactionId: payment.transactionId,
      checkoutUrl: payment.checkoutUrl,
      qrCode: payment.qrCode,
      expiresAt: payment.expiresAt,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
    };
  }

  private parsePayOSDate(value?: string): Date {
    if (!value) return new Date();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }
}
