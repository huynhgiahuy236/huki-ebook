import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from "@nestjs/common";
import { randomBytes } from "crypto";
import {
  CartItemFormat,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  SellerOrderStatus,
} from "../../../prisma/generated/client";
import { BookActor } from "../../common/book-auth.guard";
import { PrismaService } from "../../prisma/prisma.service";
import { InventoryReservationService } from "../orders/inventory-reservation.service";
import {
  CreateRefundDto,
  InitiatePaymentDto,
  PayOSWebhookDto,
  SettleRefundDto,
} from "./dto/payment.dto";
import { PayOSService } from "./payos.service";
import { ORDER_EVENTS, PAYMENT_EVENTS } from "../../../../../libs/shared/src";
import {
  throwBadRequest,
  throwConflict,
  throwNotFound,
  throwForbidden,
} from "@huki/shared/errors";
import { ErrorCode } from "@huki/shared/errors";
import { FlashSaleClientService } from "../orders/flash-sale-client.service";

@Injectable()
export class PaymentsService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(PaymentsService.name);
  private expirationTimer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly payos: PayOSService,
    private readonly reservations: InventoryReservationService,
    private readonly flashSales: FlashSaleClientService,
  ) {}

  onApplicationBootstrap(): void {
    this.expirationTimer = setInterval(() => {
      void this.expirePendingPayments().catch((error) =>
        this.logger.error("Unable to expire pending PayOS payments", error),
      );
    }, 5_000);
    this.expirationTimer.unref();
  }

  onModuleDestroy(): void {
    if (this.expirationTimer) clearInterval(this.expirationTimer);
  }

  async initiate(userId: string, orderId: string, dto: InitiatePaymentDto) {
    await this.expirePendingPayments();
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
    });
    if (!order) throwNotFound(ErrorCode.ORDER_NOT_FOUND);
    const o = order!;
    if (o.paymentMethod !== PaymentMethod.ONLINE_PAYMENT) {
      throwBadRequest(ErrorCode.PAYMENT_PROVIDER_INVALID);
    }
    if (o.paymentStatus === PaymentStatus.SUCCEEDED) {
      throwConflict(ErrorCode.ORDER_ALREADY_PAID);
    }
    if (["CANCELLED", "REFUNDED"].includes(o.status)) {
      throwConflict(ErrorCode.ORDER_CANNOT_CANCEL);
    }

    const active = await this.prisma.payment.findFirst({
      where: {
        orderId,
        provider: "PAYOS",
        status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
    if (active?.checkoutUrl) return this.paymentView(active);

    const amount = Number(o.grandTotal);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throwBadRequest(ErrorCode.VALIDATION_MIN_VALUE);
    }
    const orderCode =
      Math.floor(Date.now() / 1000) * 1000 + Math.floor(Math.random() * 1000);
    const isFlashSaleOrder = await this.flashSales
      .hasReservations(orderId)
      .catch(() => false);
    const paymentTtlSeconds = isFlashSaleOrder ? 60 : 120;
    const expiresAt = new Date(Date.now() + paymentTtlSeconds * 1000);
    const link = await this.payos.createPaymentLink({
      orderCode,
      amount,
      description: `HUKI ${o.code.slice(-16)}`.slice(0, 25),
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
          provider: "PAYOS",
          payosOrderId: String(link.orderCode),
          payosPaymentLinkId: link.paymentLinkId,
          checkoutUrl: link.checkoutUrl,
          qrCode: link.qrCode,
          expiresAt,
          callbackData: { ...link, isFlashSaleOrder } as any,
        },
      });
      await tx.order.update({
        where: { id: orderId },
        data: {
          paymentProvider: "PAYOS",
          paymentStatus: PaymentStatus.PROCESSING,
        },
      });
      return created;
    });
    return this.paymentView(payment);
  }

  async getOrderPayment(userId: string, orderId: string) {
    let order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        sellerOrders: { include: { items: true } },
        payments: { orderBy: { createdAt: "desc" } },
        refunds: true,
      },
    });
    if (!order) throwNotFound(ErrorCode.ORDER_NOT_FOUND);

    const o = order!;
    const activePayment = o.payments.find(
      (p) =>
        p.provider === "PAYOS" &&
        [
          PaymentStatus.PENDING,
          PaymentStatus.PROCESSING,
          PaymentStatus.EXPIRED,
        ].includes(p.status as any),
    );
    if (
      activePayment &&
      activePayment.payosOrderId &&
      activePayment.status !== PaymentStatus.SUCCEEDED
    ) {
      try {
        const linkInfo = await this.payos.getPaymentLinkInformation(
          activePayment.payosOrderId,
        );
        if (linkInfo && linkInfo.status === "PAID") {
          await this.completePaymentFromPayOS(activePayment, linkInfo, o);
          order = await this.prisma.order.findFirst({
            where: { id: orderId, userId },
            include: {
              sellerOrders: { include: { items: true } },
              payments: { orderBy: { createdAt: "desc" } },
              refunds: true,
            },
          });
        }
      } catch {
        // ignore polling error
      }
    }

    if (order?.paymentStatus !== PaymentStatus.SUCCEEDED) {
      await this.expirePendingPayments();
      order = await this.prisma.order.findFirst({
        where: { id: orderId, userId },
        include: {
          sellerOrders: { include: { items: true } },
          payments: { orderBy: { createdAt: "desc" } },
          refunds: true,
        },
      });
    }

    const currentOrder = order!;
    return {
      orderId: currentOrder.id,
      orderCode: currentOrder.code,
      paymentStatus: currentOrder.paymentStatus,
      payments: currentOrder.payments.map((payment) =>
        this.paymentView(payment),
      ),
      refunds: currentOrder.refunds.map((refund) => ({
        ...refund,
        amount: Number(refund.amount),
      })),
    };
  }

  async completePaymentFromPayOS(payment: any, linkInfo: any, fullOrder?: any) {
    const orderData =
      fullOrder ||
      (await this.prisma.order.findUnique({
        where: { id: payment.orderId },
        include: { sellerOrders: { include: { items: true } } },
      }));
    if (!orderData) return;

    const paidAt = linkInfo.transactions?.[0]?.transactionDateTime
      ? this.parsePayOSDate(linkInfo.transactions[0].transactionDateTime)
      : new Date();
    const reference =
      linkInfo.transactions?.[0]?.reference ?? String(payment.payosOrderId);

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.payment.updateMany({
        where: {
          id: payment.id,
          status: {
            in: [
              PaymentStatus.PENDING,
              PaymentStatus.PROCESSING,
              PaymentStatus.EXPIRED,
            ],
          },
        },
        data: {
          status: PaymentStatus.SUCCEEDED,
          transactionId: reference,
          payosReturnCode: "00",
          callbackData: linkInfo as any,
          paidAt,
          failureReason: null,
        },
      });
      if (updated.count === 0) return;

      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: PaymentStatus.SUCCEEDED,
          status: "PROCESSING",
          cancelledAt: null,
          cancelReason: null,
        },
      });
      await tx.sellerOrder.updateMany({
        where: {
          orderId: payment.orderId,
          status: {
            in: [
              SellerOrderStatus.PENDING_PAYMENT,
              SellerOrderStatus.CANCELLED,
            ],
          },
        },
        data: {
          status: SellerOrderStatus.PENDING_CONFIRMATION,
          cancelledAt: null,
          cancelReason: null,
        },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: payment.orderId,
          fromStatus: orderData.status,
          toStatus: "PROCESSING",
          title: "Thanh toán thành công qua PayOS",
          description: `Giao dịch: ${reference}`,
          actorType: "SYSTEM",
        },
      });

      // COMMIT INVENTORY RESERVATION (Deduct physical stock and release temporary reservation lock)
      const physicalItemIds = orderData.sellerOrders
        .flatMap(({ items }: any) => items)
        .filter(({ format }: any) => format === CartItemFormat.PHYSICAL)
        .map(({ id }: any) => id);

      await this.reservations.commit(tx, payment.orderId, physicalItemIds);

      const digitalItems = orderData.sellerOrders
        .flatMap(({ items }: any) => items)
        .filter(({ format }: any) => format === CartItemFormat.DIGITAL);
      for (const item of digitalItems) {
        await tx.bookAccess.upsert({
          where: {
            userId_bookId: {
              userId: orderData.userId,
              bookId: item.bookId,
            },
          },
          create: {
            userId: orderData.userId,
            bookId: item.bookId,
            orderId: payment.orderId,
            status: "ACTIVE",
          },
          update: {
            status: "ACTIVE",
            orderId: payment.orderId,
          },
        });
      }

      await tx.outboxEvent.createMany({
        data: [
          {
            eventId: `PAYOS-${payment.payosOrderId}-${Date.now()}`,
            type: PAYMENT_EVENTS.SUCCEEDED,
            aggregateId: payment.orderId,
            payload: {
              orderId: payment.orderId,
              orderCode: orderData.code,
              userId: orderData.userId,
              amount: Number(payment.amount),
              method: PaymentMethod.ONLINE_PAYMENT,
              transactionId: reference,
            },
          },
          {
            eventId: `ORDER-PAID-${payment.payosOrderId}-${Date.now()}`,
            type: ORDER_EVENTS.PAID,
            aggregateId: payment.orderId,
            payload: {
              orderId: payment.orderId,
              orderCode: orderData.code,
              userId: orderData.userId,
            },
          },
        ],
      });
    });
  }

  async handlePayOSWebhook(payload: PayOSWebhookDto) {
    if (!payload?.data || !this.payos.verifyWebhook(payload)) {
      throwBadRequest(ErrorCode.PAYMENT_SIGNATURE_INVALID);
    }
    if (!payload.success || payload.code !== "00") return { success: true };

    const payosOrderId = String(payload.data.orderCode);
    const payment = await this.prisma.payment.findFirst({
      where: { provider: "PAYOS", payosOrderId },
      include: {
        order: { include: { sellerOrders: { include: { items: true } } } },
      },
    });
    // PayOS sends a signed test webhook while confirming the URL.
    if (!payment) return { success: true };
    if (payment.status === PaymentStatus.SUCCEEDED) return { success: true };
    if (Number(payment.amount) !== Number(payload.data.amount)) {
      throwBadRequest(ErrorCode.PAYMENT_AMOUNT_MISMATCH);
    }

    const paidAt = this.parsePayOSDate(payload.data.transactionDateTime);

    // Check if order was already cancelled due to timeout (Late Webhook Edge Case)
    if (
      payment.order.status === "CANCELLED" ||
      payment.status === PaymentStatus.EXPIRED
    ) {
      return this.handleLateWebhook(payment, payload, paidAt);
    }

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.payment.updateMany({
        where: {
          id: payment.id,
          status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
        },
        data: {
          status: PaymentStatus.SUCCEEDED,
          transactionId: payload.data.reference ?? payosOrderId,
          payosPaymentLinkId:
            payload.data.paymentLinkId ?? payment.payosPaymentLinkId,
          payosReturnCode: payload.code,
          callbackData: payload as unknown as Prisma.InputJsonValue,
          paidAt,
          failureReason: null,
        },
      });
      if (updated.count === 0) return;

      await tx.order.update({
        where: { id: payment.orderId },
        data: { paymentStatus: PaymentStatus.SUCCEEDED, status: "PROCESSING" },
      });
      await tx.sellerOrder.updateMany({
        where: {
          orderId: payment.orderId,
          status: SellerOrderStatus.PENDING_PAYMENT,
        },
        data: { status: SellerOrderStatus.PENDING_CONFIRMATION },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: payment.orderId,
          fromStatus: payment.order.status,
          toStatus: "PROCESSING",
          title: "Thanh toán thành công qua PayOS",
          description: `Giao dịch: ${payload.data.reference ?? payosOrderId}`,
          actorType: "SYSTEM",
        },
      });

      // COMMIT INVENTORY RESERVATION (Deduct physical stock and release temporary reservation lock)
      const physicalItemIds = payment.order.sellerOrders
        .flatMap(({ items }) => items)
        .filter(({ format }) => format === CartItemFormat.PHYSICAL)
        .map(({ id }) => id);

      if (physicalItemIds.length > 0) {
        await this.reservations.commit(tx, payment.orderId, physicalItemIds);
      }

      const eventPayload = {
        orderId: payment.orderId,
        orderCode: payment.order.code,
        userId: payment.order.userId,
        paymentId: payment.id,
        transactionId: payload.data.reference ?? payosOrderId,
        amount: Number(payload.data.amount),
        provider: "PAYOS",
        sellerOrders: payment.order.sellerOrders.map(
          ({ id, ownerUserId, storeId, items }) => ({
            sellerOrderId: id,
            ownerUserId,
            storeId,
            items: items.map(
              ({ id: orderItemId, bookId, format, quantity }) => ({
                orderItemId,
                bookId,
                format,
                quantity,
              }),
            ),
          }),
        ),
      };
      await tx.outboxEvent.createMany({
        data: [
          {
            eventId: `PAYOS-${payosOrderId}`,
            type: PAYMENT_EVENTS.SUCCEEDED,
            aggregateId: payment.orderId,
            payload: eventPayload,
          },
          {
            eventId: `ORDER-PAID-${payosOrderId}`,
            type: ORDER_EVENTS.PAID,
            aggregateId: payment.orderId,
            payload: eventPayload,
          },
        ],
      });

      const digitalItems = payment.order.sellerOrders
        .flatMap(({ items }) => items)
        .filter(({ format }) => format === CartItemFormat.DIGITAL);
      for (const item of digitalItems) {
        await tx.bookAccess.upsert({
          where: {
            userId_bookId: {
              userId: payment.order.userId,
              bookId: item.bookId,
            },
          },
          create: {
            userId: payment.order.userId,
            bookId: item.bookId,
            orderId: payment.orderId,
            sellerOrderId: item.sellerOrderId,
          },
          update: {
            status: "ACTIVE",
            orderId: payment.orderId,
            sellerOrderId: item.sellerOrderId,
          },
        });
      }
    });
    return { success: true };
  }

  private async handleLateWebhook(
    payment: any,
    payload: PayOSWebhookDto,
    paidAt: Date,
  ) {
    const payosOrderId = String(payload.data.orderCode);
    return this.prisma.$transaction(async (tx) => {
      // Step 1: Check physical stock availability
      const allItems = payment.order.sellerOrders.flatMap(
        ({ items }: any) => items,
      );
      const physicalItems = allItems.filter(
        ({ format }: any) => format === CartItemFormat.PHYSICAL,
      );

      const wasFlashSaleOrder = Boolean(
        (payment.callbackData as Record<string, unknown> | null)
          ?.isFlashSaleOrder,
      );
      const timeoutLabel = wasFlashSaleOrder ? "1 phút / 60s" : "2 phút / 120s";
      let canRestore = !wasFlashSaleOrder;
      for (const item of physicalItems) {
        const details = await tx.physicalBookDetails.findUnique({
          where: { bookId: item.bookId },
        });
        if (
          !details ||
          !details.physicalEnabled ||
          details.stock - details.reserved < item.quantity
        ) {
          canRestore = false;
          break;
        }
      }

      if (canRestore) {
        // Step 2A: Stock is available -> Restore order & re-lock inventory
        await this.reservations.reserve(tx, payment.orderId, physicalItems);

        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.SUCCEEDED,
            transactionId: payload.data.reference ?? payosOrderId,
            payosPaymentLinkId:
              payload.data.paymentLinkId ?? payment.payosPaymentLinkId,
            payosReturnCode: payload.code,
            callbackData: payload as unknown as Prisma.InputJsonValue,
            paidAt,
            failureReason: null,
          },
        });

        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            status: "PROCESSING",
            paymentStatus: PaymentStatus.SUCCEEDED,
            cancelledAt: null,
            cancelReason: null,
          },
        });

        await tx.sellerOrder.updateMany({
          where: { orderId: payment.orderId },
          data: {
            status: SellerOrderStatus.PENDING_CONFIRMATION,
            cancelledAt: null,
            cancelReason: null,
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: payment.orderId,
            fromStatus: "CANCELLED",
            toStatus: "PROCESSING",
            title: "Thanh toán PayOS thành công (Khôi phục sau Timeout)",
            description: `Khách chuyển khoản đúng hạn nhưng webhook đến trễ. Tồn kho khả dụng và đơn hàng đã được khôi phục thành công. Giao dịch: ${payload.data.reference ?? payosOrderId}`,
            actorType: "SYSTEM",
          },
        });

        const digitalItems = allItems.filter(
          ({ format }: any) => format === CartItemFormat.DIGITAL,
        );
        for (const item of digitalItems) {
          await tx.bookAccess.upsert({
            where: {
              userId_bookId: {
                userId: payment.order.userId,
                bookId: item.bookId,
              },
            },
            create: {
              userId: payment.order.userId,
              bookId: item.bookId,
              orderId: payment.orderId,
              sellerOrderId: item.sellerOrderId,
            },
            update: {
              status: "ACTIVE",
              orderId: payment.orderId,
              sellerOrderId: item.sellerOrderId,
            },
          });
        }

        return { success: true, restored: true };
      } else {
        // Step 2B: Stock is NOT available -> Auto Refund 100%
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.REFUND_PENDING,
            transactionId: payload.data.reference ?? payosOrderId,
            payosReturnCode: payload.code,
            callbackData: payload as unknown as Prisma.InputJsonValue,
            paidAt,
            failureReason:
              "Late payment received but stock unavailable (Dispute auto-refund)",
          },
        });

        await tx.order.update({
          where: { id: payment.orderId },
          data: { paymentStatus: PaymentStatus.REFUND_PENDING },
        });

        await tx.refund.create({
          data: {
            orderId: payment.orderId,
            paymentId: payment.id,
            amount: payment.amount,
            reason: `Tự động hoàn tiền 100% do khách thanh toán sau khi đơn đã hết hạn ${timeoutLabel} và kho sách đã hết hàng.`,
            status: "PENDING",
            provider: "PAYOS",
            requestedBy: payment.order.userId,
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: payment.orderId,
            fromStatus: "CANCELLED",
            toStatus: "CANCELLED",
            title:
              "Nhận thanh toán sau Timeout - Tự động kích hoạt hoàn tiền 100%",
            description: `Khách đã thanh toán nhưng đơn đã quá hạn ${timeoutLabel}. Hệ thống tạo lệnh hoàn tiền tự động 100% (Số tiền: ${Number(payment.amount).toLocaleString("vi-VN")}đ).`,
            actorType: "SYSTEM",
          },
        });

        return { success: true, restored: false, refundPending: true };
      }
    });
  }

  async requestRefund(actor: BookActor, orderId: string, dto: CreateRefundDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payments: {
          where: {
            status: {
              in: [PaymentStatus.SUCCEEDED, PaymentStatus.PARTIAL_REFUND],
            },
          },
          orderBy: { paidAt: "desc" },
        },
        refunds: {
          where: { status: { in: ["PENDING", "PROCESSING", "SUCCEEDED"] } },
        },
      },
    });
    if (!order) throwNotFound(ErrorCode.ORDER_NOT_FOUND);
    if (actor.role !== "PLATFORM_ADMIN" && order!.userId !== actor.sub) {
      throwForbidden(ErrorCode.AUTHZ_NOT_OWNER);
    }
    const payment = order!.payments[0];
    if (!payment) throwConflict(ErrorCode.REFUND_NOT_ALLOWED);
    const alreadyRequested = order!.refunds.reduce(
      (sum, refund) => sum + Number(refund.amount),
      0,
    );
    const remaining = Number(payment.amount) - alreadyRequested;
    const amount = dto.amount ?? remaining;
    if (amount <= 0 || amount > remaining) {
      throwBadRequest(ErrorCode.REFUND_AMOUNT_INVALID);
    }

    return this.prisma.$transaction(async (tx) => {
      const refund = await tx.refund.create({
        data: {
          orderId,
          paymentId: payment.id,
          amount,
          reason: dto.reason,
          status: "PENDING",
          provider: "PAYOS",
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
          eventId: randomBytes(16).toString("hex"),
          type: "refund.requested",
          aggregateId: orderId,
          payload: {
            refundId: refund.id,
            orderId,
            paymentId: payment.id,
            amount,
            provider: "PAYOS",
          },
        },
      });
      return { ...refund, amount: Number(refund.amount) };
    });
  }

  async settleRefund(actor: BookActor, refundId: string, dto: SettleRefundDto) {
    if (actor.role !== "PLATFORM_ADMIN") {
      throwForbidden(ErrorCode.AUTHZ_ROLE_INSUFFICIENT);
    }
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
      include: { payment: true, order: true },
    });
    if (!refund) throwNotFound(ErrorCode.REFUND_NOT_FOUND);
    const r = refund!;
    if (!["PENDING", "PROCESSING"].includes(r.status)) {
      throwConflict(ErrorCode.REFUND_ALREADY_PROCESSED);
    }
    if (!dto.succeeded && !dto.failureReason) {
      throwBadRequest(ErrorCode.VALIDATION_REQUIRED);
    }

    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const settled = await tx.refund.update({
        where: { id: refundId },
        data: dto.succeeded
          ? {
              status: "SUCCEEDED",
              processedAt: now,
              providerReference: dto.providerReference,
              failureReason: null,
            }
          : {
              status: "FAILED",
              failedAt: now,
              failureReason: dto.failureReason,
              providerReference: dto.providerReference,
            },
      });

      const succeeded = await tx.refund.aggregate({
        where: { paymentId: r.paymentId, status: "SUCCEEDED" },
        _sum: { amount: true },
      });
      const refundedAmount = Number(succeeded._sum.amount ?? 0);
      const fullyRefunded = refundedAmount >= Number(r.payment.amount);
      const paymentStatus = dto.succeeded
        ? fullyRefunded
          ? PaymentStatus.REFUNDED
          : PaymentStatus.PARTIAL_REFUND
        : refundedAmount > 0
          ? PaymentStatus.PARTIAL_REFUND
          : PaymentStatus.SUCCEEDED;

      await tx.payment.update({
        where: { id: r.paymentId },
        data: { status: paymentStatus },
      });
      await tx.order.update({
        where: { id: r.orderId },
        data: {
          paymentStatus,
          ...(fullyRefunded ? { status: "REFUNDED" } : {}),
        },
      });
      if (fullyRefunded) {
        await tx.bookAccess.updateMany({
          where: { orderId: r.orderId, status: "ACTIVE" },
          data: { status: "REVOKED" },
        });
      }
      await tx.outboxEvent.create({
        data: {
          eventId: randomBytes(16).toString("hex"),
          type: dto.succeeded ? "refund.succeeded" : "refund.failed",
          aggregateId: r.orderId,
          payload: {
            refundId,
            orderId: r.orderId,
            amount: Number(r.amount),
            providerReference: dto.providerReference,
          },
        },
      });
      return { ...settled, amount: Number(settled.amount) };
    });
  }

  async expirePendingPayments() {
    const now = new Date();
    const expired = await this.prisma.payment.findMany({
      where: {
        provider: "PAYOS",
        status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
        expiresAt: { lte: now },
      },
      include: {
        order: { include: { sellerOrders: { include: { items: true } } } },
      },
    });
    for (const payment of expired) {
      const isFlashSalePayment = Boolean(
        (payment.callbackData as Record<string, unknown> | null)
          ?.isFlashSaleOrder,
      );
      const timeoutLabel = isFlashSalePayment
        ? "1 phút / 60s"
        : "2 phút / 120s";
      if (payment.payosOrderId) {
        try {
          const linkInfo = await this.payos.getPaymentLinkInformation(
            payment.payosOrderId,
          );
          if (linkInfo && linkInfo.status === "PAID") {
            await this.completePaymentFromPayOS(
              payment,
              linkInfo,
              payment.order,
            );
            continue;
          }
        } catch {
          // ignore error and proceed to expire
        }
      }

      await this.prisma.$transaction(async (tx) => {
        const changed = await tx.payment.updateMany({
          where: {
            id: payment.id,
            status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
          },
          data: {
            status: PaymentStatus.EXPIRED,
            failedAt: now,
            failureReason: `Hết hạn thanh toán (${timeoutLabel})`,
          },
        });
        if (!changed.count) return;
        const itemIds = payment.order.sellerOrders.flatMap(({ items }) =>
          items.map(({ id }) => id),
        );
        await this.reservations.release(tx, payment.orderId, itemIds);
        await tx.sellerOrder.updateMany({
          where: {
            orderId: payment.orderId,
            status: SellerOrderStatus.PENDING_PAYMENT,
          },
          data: {
            status: SellerOrderStatus.CANCELLED,
            cancelledAt: now,
            cancelReason: `Hết hạn thanh toán (Tự động hủy sau ${timeoutLabel})`,
          },
        });
        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            paymentStatus: PaymentStatus.EXPIRED,
            status: "CANCELLED",
            cancelledAt: now,
            cancelReason: `Hết hạn thanh toán (Tự động hủy sau ${timeoutLabel})`,
          },
        });
        await tx.orderStatusHistory.create({
          data: {
            orderId: payment.orderId,
            fromStatus: payment.order.status,
            toStatus: "CANCELLED",
            title: "Đơn hàng đã hết hạn thanh toán",
            description: `Mã QR PayOS hết hạn sau ${timeoutLabel} - Hệ thống tự động thu hồi và giải phóng tồn kho.`,
            actorType: "SYSTEM",
          },
        });
        const failurePayload = {
          orderId: payment.orderId,
          orderCode: payment.order.code,
          userId: payment.order.userId,
          paymentId: payment.id,
          provider: "PAYOS",
          reason: `Hết hạn thanh toán (Tự động hủy sau ${timeoutLabel})`,
          sellerOrders: payment.order.sellerOrders.map(
            ({ id, ownerUserId, storeId }) => ({
              sellerOrderId: id,
              ownerUserId,
              storeId,
            }),
          ),
        };
        await tx.outboxEvent.createMany({
          data: [
            {
              eventId: randomBytes(16).toString("hex"),
              type: PAYMENT_EVENTS.FAILED,
              aggregateId: payment.orderId,
              payload: failurePayload,
            },
            {
              eventId: randomBytes(16).toString("hex"),
              type: ORDER_EVENTS.CANCELLED,
              aggregateId: payment.orderId,
              payload: failurePayload,
            },
          ],
        });
      });
      await this.flashSales
        .releaseOrder(payment.orderId)
        .catch(() => undefined);
    }

    // Flash Sale orphan orders expire after 60 seconds; regular orders after 120 seconds.
    const oneMinuteAgo = new Date(Date.now() - 60_000);
    const twoMinutesAgo = new Date(Date.now() - 120_000);
    const orphanOrders = await this.prisma.order.findMany({
      where: {
        paymentMethod: PaymentMethod.ONLINE_PAYMENT,
        status: "PENDING_PAYMENT",
        createdAt: { lte: oneMinuteAgo },
        payments: {
          none: {
            status: { in: [PaymentStatus.SUCCEEDED, PaymentStatus.PROCESSING] },
          },
        },
      },
      include: {
        sellerOrders: { include: { items: true } },
      },
    });

    const expirableOrphanOrders: typeof orphanOrders = [];
    const flashSaleOrphanOrderIds = new Set<string>();
    for (const order of orphanOrders) {
      const isFlashSaleOrder = await this.flashSales
        .hasReservations(order.id)
        .catch(() => false);
      if (!isFlashSaleOrder && order.createdAt > twoMinutesAgo) continue;
      if (isFlashSaleOrder) flashSaleOrphanOrderIds.add(order.id);
      expirableOrphanOrders.push(order);
    }

    for (const order of expirableOrphanOrders) {
      const timeoutLabel = flashSaleOrphanOrderIds.has(order.id)
        ? "1 phút / 60s"
        : "2 phút / 120s";
      await this.prisma.$transaction(async (tx) => {
        const itemIds = order.sellerOrders.flatMap(({ items }) =>
          items.map(({ id }) => id),
        );
        await this.reservations.release(tx, order.id, itemIds);
        await tx.sellerOrder.updateMany({
          where: {
            orderId: order.id,
            status: SellerOrderStatus.PENDING_PAYMENT,
          },
          data: {
            status: SellerOrderStatus.CANCELLED,
            cancelledAt: now,
            cancelReason: `Hết hạn thanh toán (Tự động hủy sau ${timeoutLabel})`,
          },
        });
        await tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: PaymentStatus.EXPIRED,
            status: "CANCELLED",
            cancelledAt: now,
            cancelReason: `Hết hạn thanh toán (Tự động hủy sau ${timeoutLabel})`,
          },
        });
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            fromStatus: order.status,
            toStatus: "CANCELLED",
            title: "Đơn hàng đã hết hạn thanh toán",
            description: `Đơn hàng chưa thanh toán quá ${timeoutLabel} - Hệ thống tự động thu hồi và giải phóng tồn kho.`,
            actorType: "SYSTEM",
          },
        });
      });
      await this.flashSales.releaseOrder(order.id).catch(() => undefined);
    }

    return { expired: expired.length + expirableOrphanOrders.length };
  }

  private paymentView(payment: any) {
    const rawData = payment.callbackData || {};
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
      accountNumber:
        rawData.accountNumber || payment.accountNumber || undefined,
      accountName: rawData.accountName || payment.accountName || undefined,
      bin: rawData.bin || payment.bin || undefined,
      description: rawData.description || payment.description || undefined,
    };
  }

  private parsePayOSDate(value?: string): Date {
    if (!value) return new Date();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }
}
