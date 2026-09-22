import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomBytes, randomUUID } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { BookActor } from "../../common/book-auth.guard";
import { getSellerScope } from "../../common/seller-scope.util";
import { CancelOrderDto, ShipOrderDto } from "./dto/checkout.dto";
import {
  CreateDisputeDto,
  ArbitrateDisputeDto,
  AdminDisputeQueryDto,
  ArbitrationRuling,
} from "./dto/dispute.dto";
import { OrderQueryDto, SellerOrderQueryDto } from "./dto/order-query.dto";
import { InventoryReservationService } from "./inventory-reservation.service";
import {
  SellerOrderStatus,
  OrderStatus,
  PaymentStatus,
  Prisma,
} from "../../../prisma/generated/client";
import { ORDER_EVENTS, policyConfig } from "../../../../../libs/shared/src";
import { OrderCompletionService } from "./order-completion.service";
import {
  throwConflict,
  throwNotFound,
  throwForbidden,
} from "@huki/shared/errors";
import { ErrorCode } from "@huki/shared/errors";
import { FlashSaleClientService } from "./flash-sale-client.service";
import { EscrowService } from "./escrow.service";

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
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reservations: InventoryReservationService,
    private readonly completion: OrderCompletionService,
    private readonly flashSales: FlashSaleClientService,
    private readonly escrow: EscrowService,
    private readonly configService: ConfigService,
  ) {}

  async buyerList(userId: string, query: OrderQueryDto) {
    const where: any = { userId };
    if (query.status) where.status = query.status;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: { sellerOrders: { include: { items: true } } },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    const mapped = await Promise.all(items.map((item) => this.buyerView(item)));
    return {
      data: mapped,
      items: mapped,
      pagination: this.pagination(query.page, query.limit, total),
    };
  }

  async buyerDetail(userId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId },
      include: { sellerOrders: { include: { items: true } } },
    });
    if (!order) throwNotFound(ErrorCode.ORDER_NOT_FOUND);
    return await this.buyerView(order);
  }

  async sellerList(actor: BookActor, query: SellerOrderQueryDto) {
    const scope = await getSellerScope(actor);
    const where: any = {};

    if (!scope.isPlatformAdmin) {
      if (scope.storeIds.length === 0 && scope.ownerUserIds.length === 0) {
        return {
          data: [],
          items: [],
          pagination: this.pagination(query.page, query.limit, 0),
        };
      }

      const targetStore = query.store || (query as any).business;
      if (targetStore) {
        if (
          !scope.storeIds.includes(targetStore) &&
          !scope.businessIds.includes(targetStore)
        ) {
          return {
            data: [],
            items: [],
            pagination: this.pagination(query.page, query.limit, 0),
          };
        }
        where.storeId = targetStore;
      } else {
        where.OR = [
          { storeId: { in: scope.storeIds } },
          { ownerUserId: { in: scope.ownerUserIds } },
        ];
      }
    } else if (query.store || (query as any).business) {
      where.storeId = query.store || (query as any).business;
    }

    if (query.status) where.status = query.status;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.sellerOrder.findMany({
        where,
        include: { items: true, order: true },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.sellerOrder.count({ where }),
    ]);

    const mapped = items.map((item) => this.sellerView(item));
    return {
      data: mapped,
      items: mapped,
      pagination: this.pagination(query.page, query.limit, total),
    };
  }

  async sellerDetail(actor: BookActor, id: string) {
    const sellerOrder = await this.prisma.sellerOrder.findUnique({
      where: { id },
      include: { items: true, order: true },
    });
    await this.assertSeller(sellerOrder, actor);
    const timeline = await this.prisma.orderStatusHistory.findMany({
      where: {
        orderId: sellerOrder!.orderId,
        OR: [{ sellerOrderId: id }, { sellerOrderId: null }],
      },
      orderBy: { createdAt: "asc" },
    });
    return { ...this.sellerView(sellerOrder!), timeline };
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
      "Seller confirmed order",
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
      "Seller is preparing order",
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
      "Order handed to carrier",
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
      "Order delivered",
    );
  }

  async cancelBuyer(userId: string, id: string, dto: CancelOrderDto) {
    const flashSaleBookIds: string[] = [];
    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id, userId },
        include: { sellerOrders: { include: { items: true } } },
      });
      if (!order) throwNotFound(ErrorCode.ORDER_NOT_FOUND);
      const o = order!;

      // Idempotency: If already cancelled, return existing order smoothly
      if (o.status === OrderStatus.CANCELLED) {
        return o;
      }

      // Cannot cancel if already shipped or completed
      if (o.sellerOrders.some((item) => SHIPPED.has(item.status))) {
        throwConflict(ErrorCode.ORDER_CANNOT_CANCEL);
      }

      // Canonical Task 58 (Buyer Cancel Before Payment): reject if already paid
      if (o.paymentStatus === PaymentStatus.SUCCEEDED) {
        throwConflict(
          ErrorCode.ORDER_CANNOT_CANCEL,
          "Đơn hàng đã thanh toán thành công, vui lòng yêu cầu trả hàng/hoàn tiền qua cổng khiếu nại",
        );
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
          flashSaleBookIds.push(
            ...sellerOrder.items.map((item) => item.bookId),
          );
        }
      }

      // Atomically release inventory reservations
      await this.reservations.release(tx as any, o.id, itemIds);

      // Invalidate any active payment links/records
      await tx.payment.updateMany({
        where: {
          orderId: id,
          status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
        },
        data: {
          status: PaymentStatus.CANCELLED,
          failedAt: now,
          failureReason: `Đơn hàng đã bị hủy bởi người mua: ${dto.reason}`,
        },
      });

      const newStatus = OrderStatus.CANCELLED;

      await tx.order.update({
        where: { id },
        data: {
          status: newStatus,
          cancelReason: dto.reason,
          cancelledAt: now,
          paymentStatus: PaymentStatus.CANCELLED,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: o.id,
          fromStatus: o.status,
          toStatus: newStatus,
          title: "Buyer cancelled order",
          description: dto.reason,
          actorType: "USER",
          actorId: userId,
        },
      });

      await tx.outboxEvent.create({
        data: {
          eventId: randomBytes(16).toString("hex"),
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
          status: "PENDING",
        },
      });

      return o;
    });
    await this.flashSales
      .releaseOrder(id, flashSaleBookIds)
      .catch(() => undefined);
    return result;
  }

  async cancelBuyerSubOrder(
    userId: string,
    orderId: string,
    sellerOrderId: string,
    dto: CancelOrderDto,
  ) {
    const flashSaleBookIds: string[] = [];
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, userId },
        include: { sellerOrders: { include: { items: true } } },
      });
      if (!order) throwNotFound(ErrorCode.ORDER_NOT_FOUND);
      const o = order!;

      const targetSubOrder = o.sellerOrders.find(
        (so) => so.id === sellerOrderId,
      );
      if (!targetSubOrder) throwNotFound(ErrorCode.SELLER_ORDER_NOT_FOUND);
      const sOrder = targetSubOrder!;

      if (
        SHIPPED.has(sOrder.status) ||
        IMMUTABLE.has(sOrder.status)
      ) {
        throwConflict(ErrorCode.ORDER_CANNOT_CANCEL);
      }

      const now = new Date();
      const itemIds = sOrder.items.map((item) => item.id);
      flashSaleBookIds.push(...sOrder.items.map((item) => item.bookId));

      await tx.sellerOrder.update({
        where: { id: sOrder.id },
        data: {
          status: SellerOrderStatus.CANCELLED,
          cancelledAt: now,
          cancelReason: dto.reason,
        },
      });

      await this.reservations.release(tx as any, o.id, itemIds);

      await tx.orderStatusHistory.create({
        data: {
          orderId: o.id,
          sellerOrderId: sOrder.id,
          fromStatus: sOrder.status,
          toStatus: SellerOrderStatus.CANCELLED,
          title: "Buyer cancelled sub-order",
          actorType: "USER",
          actorId: userId,
        },
      });

      const remainingSubOrders = o.sellerOrders.filter(
        (so) => so.id !== sellerOrderId,
      );
      const allCancelled = remainingSubOrders.every(
        (so) => so.status === SellerOrderStatus.CANCELLED,
      );

      const updatedMasterStatus = allCancelled
        ? "CANCELLED"
        : "PARTIALLY_CANCELLED";

      await tx.order.update({
        where: { id: o.id },
        data: {
          status: updatedMasterStatus,
          cancelReason: allCancelled ? dto.reason : undefined,
          cancelledAt: allCancelled ? now : undefined,
        },
      });

      await tx.outboxEvent.create({
        data: {
          eventId: randomBytes(16).toString("hex"),
          type: ORDER_EVENTS.SELLER_CANCELLED,
          aggregateId: o.id,
          payload: {
            orderId: o.id,
            orderCode: o.code,
            userId: o.userId,
            sellerOrderId: sOrder.id,
            requiresShipping: sOrder.requiresShipping,
            sellerOrders: [
              {
                sellerOrderId: sOrder.id,
                ownerUserId: sOrder.ownerUserId,
                storeId: sOrder.storeId,
              },
            ],
            reason: dto.reason,
          },
          status: "PENDING",
        },
      });
    });

    await this.flashSales
      .releaseOrder(orderId, flashSaleBookIds)
      .catch(() => undefined);

    return this.buyerDetail(userId, orderId);
  }

  async cancelSeller(actor: BookActor, id: string, dto: CancelOrderDto) {
    const sellerOrder = await this.prisma.sellerOrder.findUnique({
      where: { id },
      include: { items: true, order: true },
    });
    await this.assertSeller(sellerOrder, actor);

    const result = await this.prisma.$transaction(async (tx) => {
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
          title: "Seller cancelled order",
          actorType: "SELLER",
          actorId: actor.sub,
        },
      });

      await this.completion.completeIfReady(tx, sellerOrder!.orderId);

      await tx.outboxEvent.create({
        data: {
          eventId: randomBytes(16).toString("hex"),
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
          status: "PENDING",
        },
      });

      return sellerOrder;
    });
    await this.flashSales
      .releaseOrder(
        sellerOrder!.orderId,
        sellerOrder!.items.map((item) => item.bookId),
      )
      .catch(() => undefined);
    return result;
  }

  /**
   * Buyer requests cancellation during packing phase (Task 59)
   */
  async requestCancellation(
    userId: string,
    orderId: string,
    sellerOrderId: string,
    dto: CancelOrderDto,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { sellerOrders: { include: { items: true } } },
    });
    if (!order) throwNotFound(ErrorCode.ORDER_NOT_FOUND);

    const sOrder = order.sellerOrders.find((so) => so.id === sellerOrderId);
    if (!sOrder) throwNotFound(ErrorCode.SELLER_ORDER_NOT_FOUND);

    // If already shipped or completed, buyer cannot cancel in packing phase
    if (SHIPPED.has(sOrder.status)) {
      throwConflict(ErrorCode.SELLER_ORDER_CANNOT_CANCEL, "Đơn hàng đã được giao cho đơn vị vận chuyển, không thể yêu cầu hủy");
    }

    if (IMMUTABLE.has(sOrder.status)) {
      throwConflict(ErrorCode.SELLER_ORDER_CANNOT_CANCEL, "Đơn hàng đã hoàn tất hoặc đã hủy trước đó");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.sellerOrder.update({
        where: { id: sOrder.id },
        data: {
          cancelReason: dto.reason,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          sellerOrderId: sOrder.id,
          fromStatus: sOrder.status,
          toStatus: sOrder.status,
          title: "Buyer requested cancellation during packing",
          description: dto.reason,
          actorType: "USER",
          actorId: userId,
        },
      });

      await tx.outboxEvent.create({
        data: {
          eventId: randomBytes(16).toString("hex"),
          type: ORDER_EVENTS.CANCEL_REQUESTED,
          aggregateId: order.id,
          payload: {
            orderId: order.id,
            orderCode: order.code,
            userId: order.userId,
            sellerOrderId: sOrder.id,
            storeId: sOrder.storeId,
            reason: dto.reason,
          },
          status: "PENDING",
        },
      });
    });

    return this.buyerDetail(userId, orderId);
  }

  /**
   * Seller approves cancellation request during packing (Task 59)
   */
  async approveCancellation(actor: BookActor, id: string, dto?: CancelOrderDto) {
    const sellerOrder = await this.prisma.sellerOrder.findUnique({
      where: { id },
      include: { items: true, order: true },
    });
    await this.assertSeller(sellerOrder, actor);

    if (
      SHIPPED.has(sellerOrder!.status) ||
      IMMUTABLE.has(sellerOrder!.status)
    ) {
      throwConflict(ErrorCode.SELLER_ORDER_CANNOT_CANCEL, "Đơn hàng không ở trạng thái có thể chấp thuận hủy");
    }

    const reason = dto?.reason || sellerOrder!.cancelReason || "Người bán đã chấp thuận yêu cầu hủy đơn";

    const result = await this.prisma.$transaction(async (tx) => {
      const itemIds = sellerOrder!.items.map((item) => item.id);
      await this.reservations.release(tx as any, sellerOrder!.orderId, itemIds);

      await tx.sellerOrder.update({
        where: { id },
        data: {
          status: SellerOrderStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelReason: reason,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: sellerOrder!.orderId,
          sellerOrderId: sellerOrder!.id,
          fromStatus: sellerOrder!.status,
          toStatus: SellerOrderStatus.CANCELLED,
          title: "Seller approved cancellation during packing",
          description: reason,
          actorType: "SELLER",
          actorId: actor.sub,
        },
      });

      // Check if all sub-orders of this order are now cancelled
      const allSubOrders = await tx.sellerOrder.findMany({
        where: { orderId: sellerOrder!.orderId },
      });
      const allCancelled = allSubOrders.every(
        (so) => so.id === id || so.status === SellerOrderStatus.CANCELLED,
      );

      const updatedMasterStatus = allCancelled
        ? OrderStatus.CANCELLED
        : OrderStatus.PARTIALLY_CANCELLED;

      await tx.order.update({
        where: { id: sellerOrder!.orderId },
        data: {
          status: updatedMasterStatus,
          cancelReason: allCancelled ? reason : undefined,
          cancelledAt: allCancelled ? new Date() : undefined,
          paymentStatus:
            sellerOrder!.order.paymentStatus === PaymentStatus.SUCCEEDED
              ? PaymentStatus.REFUND_PENDING
              : sellerOrder!.order.paymentStatus,
        },
      });

      await tx.outboxEvent.create({
        data: {
          eventId: randomBytes(16).toString("hex"),
          type: ORDER_EVENTS.CANCEL_APPROVED,
          aggregateId: sellerOrder!.orderId,
          payload: {
            orderId: sellerOrder!.orderId,
            orderCode: sellerOrder!.order.code,
            userId: sellerOrder!.order.userId,
            sellerOrderId: sellerOrder!.id,
            storeId: sellerOrder!.storeId,
            reason,
          },
          status: "PENDING",
        },
      });

      return sellerOrder;
    });

    await this.flashSales
      .releaseOrder(
        sellerOrder!.orderId,
        sellerOrder!.items.map((item) => item.bookId),
      )
      .catch(() => undefined);

    return result;
  }

  /**
   * Seller rejects cancellation request during packing (Task 59)
   */
  async rejectCancellation(actor: BookActor, id: string, dto: CancelOrderDto) {
    const sellerOrder = await this.prisma.sellerOrder.findUnique({
      where: { id },
      include: { items: true, order: true },
    });
    await this.assertSeller(sellerOrder, actor);

    if (IMMUTABLE.has(sellerOrder!.status)) {
      throwConflict(ErrorCode.SELLER_ORDER_CANNOT_CANCEL, "Đơn hàng đã hoàn tất hoặc đã hủy");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.orderStatusHistory.create({
        data: {
          orderId: sellerOrder!.orderId,
          sellerOrderId: sellerOrder!.id,
          fromStatus: sellerOrder!.status,
          toStatus: sellerOrder!.status,
          title: "Seller rejected cancellation during packing",
          description: dto.reason,
          actorType: "SELLER",
          actorId: actor.sub,
        },
      });

      await tx.outboxEvent.create({
        data: {
          eventId: randomBytes(16).toString("hex"),
          type: ORDER_EVENTS.CANCEL_REJECTED,
          aggregateId: sellerOrder!.orderId,
          payload: {
            orderId: sellerOrder!.orderId,
            orderCode: sellerOrder!.order.code,
            userId: sellerOrder!.order.userId,
            sellerOrderId: sellerOrder!.id,
            storeId: sellerOrder!.storeId,
            reason: dto.reason,
          },
          status: "PENDING",
        },
      });
    });

    return sellerOrder;
  }

  async tracking(userId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId },
      include: { sellerOrders: { include: { items: true } } },
    });
    if (!order) throwNotFound(ErrorCode.ORDER_NOT_FOUND);

    const timeline = await this.prisma.orderStatusHistory.findMany({
      where: { orderId: id },
      orderBy: { createdAt: "asc" },
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
    const initialOrder = await this.prisma.sellerOrder.findUnique({
      where: { id },
      include: { items: true, order: true },
    });
    await this.assertSeller(initialOrder, actor);

    return this.prisma.$transaction(async (tx) => {
      const sellerOrder = await tx.sellerOrder.findUnique({
        where: { id },
        include: { items: true, order: true },
      });

      if (!sellerOrder) throwNotFound(ErrorCode.SELLER_ORDER_NOT_FOUND);
      const sOrder = sellerOrder!;

      if (!allowed.includes(sOrder.status)) {
        throwConflict(ErrorCode.ORDER_STATUS_TRANSITION_INVALID);
      }

      const fromStatus = sOrder.status;
      const newStatus = await change(tx, sOrder);

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
          orderId: sOrder.orderId,
          sellerOrderId: sOrder.id,
          fromStatus,
          toStatus: newStatus,
          title,
          actorType: "SELLER",
          actorId: actor.sub,
          metadata: metadata as Prisma.InputJsonValue | undefined,
        },
      });

      if (newStatus === SellerOrderStatus.COMPLETED) {
        await this.completion.completeIfReady(tx, sOrder.orderId);
      }

      await tx.outboxEvent.create({
        data: {
          eventId: randomBytes(16).toString("hex"),
          type:
            newStatus === SellerOrderStatus.CONFIRMED ||
            newStatus === SellerOrderStatus.COMPLETED
              ? ORDER_EVENTS.SELLER_CONFIRMED
              : newStatus === SellerOrderStatus.SHIPPED
                ? ORDER_EVENTS.SELLER_SHIPPED
                : "SELLER_ORDER_STATUS_CHANGED",
          aggregateId: sOrder.orderId,
          payload: {
            orderId: sOrder.orderId,
            orderCode: sOrder.order.code,
            userId: sOrder.order.userId,
            sellerOrderId: sOrder.id,
            ownerUserId: sOrder.ownerUserId,
            storeId: sOrder.storeId,
            from: fromStatus,
            to: newStatus,
          },
          status: "PENDING",
        },
      });

      return sOrder;
    });
  }

  private async assertSeller(order: any, actor: BookActor): Promise<void> {
    if (!order) throwNotFound(ErrorCode.SELLER_ORDER_NOT_FOUND);
    if (actor.role === "PLATFORM_ADMIN") return;
    if (order.ownerUserId === actor.sub) return;

    const scope = await getSellerScope(actor);
    const hasAccess =
      scope.ownerUserIds.includes(order.ownerUserId) ||
      scope.storeIds.includes(order.storeId) ||
      scope.businessIds.includes(order.storeId);

    if (!hasAccess) {
      throwForbidden(ErrorCode.AUTHZ_NOT_OWNER);
    }
  }

  private pagination(page: number, limit: number, total: number) {
    return { page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  private readonly storeNameCache = new Map<string, { name: string; expiry: number }>();

  private async resolveStoreName(storeId: string): Promise<string> {
    if (!storeId || storeId === 'huki-official' || storeId === 'default-store') {
      return 'Gian Hàng HUKI';
    }

    const cached = this.storeNameCache.get(storeId);
    if (cached && cached.expiry > Date.now()) {
      return cached.name;
    }

    const businessPort = process.env.BUSINESS_SERVICE_PORT || 3002;

    try {
      // 1. Try store by ID
      const resStore = await fetch(`http://localhost:${businessPort}/api/v1/stores/${storeId}`);
      if (resStore.ok) {
        const json = await resStore.json() as any;
        const data = json.data || json;
        if (data?.name) {
          this.storeNameCache.set(storeId, { name: data.name, expiry: Date.now() + 60000 });
          return data.name;
        }
      }
    } catch {
      // Ignore
    }

    try {
      // 2. Try business by ID
      const resBiz = await fetch(`http://localhost:${businessPort}/api/v1/businesses/${storeId}`);
      if (resBiz.ok) {
        const json = await resBiz.json() as any;
        const data = json.data || json;
        if (data?.stores && data.stores.length > 0 && data.stores[0]?.name) {
          const storeName = data.stores[0].name;
          this.storeNameCache.set(storeId, { name: storeName, expiry: Date.now() + 60000 });
          return storeName;
        }
        if (data?.name) {
          this.storeNameCache.set(storeId, { name: data.name, expiry: Date.now() + 60000 });
          return data.name;
        }
      }
    } catch {
      // Ignore
    }

    return 'Gian Hàng HUKI';
  }

  private async buyerView(order: any) {
    const sellerOrders = await Promise.all(
      (order.sellerOrders || []).map(async (so: any) => {
        const storeName = await this.resolveStoreName(so.storeId);
        return {
          id: so.id,
          orderId: so.orderId,
          code: so.code,
          storeId: so.storeId,
          storeName,
          ownerUserId: so.ownerUserId,
          requiresShipping: so.requiresShipping,
          itemSubtotal: Number(so.itemSubtotal),
          shippingFee: Number(so.shippingFee),
          grandTotal: Number(so.grandTotal),
          status: so.status,
          carrier: so.carrier,
          trackingCode: so.trackingCode,
          confirmedAt: so.confirmedAt,
          shippedAt: so.shippedAt,
          completedAt: so.completedAt,
          cancelledAt: so.cancelledAt,
          cancelReason: so.cancelReason,
          createdAt: so.createdAt,
          updatedAt: so.updatedAt,
          items: (so.items || []).map((i: any) => ({
            id: i.id,
            bookId: i.bookId,
            bookTitle: i.bookTitle,
            bookCoverUrl: i.bookCoverUrl,
            bookIsbn: i.bookIsbn,
            format: i.format,
            quantity: i.quantity,
            unitPrice: Number(i.unitPrice),
            subtotal: Number(i.subtotal),
          })),
        };
      })
    );

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
      sellerOrders,
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
      dispatchDeadline:
        sellerOrder.confirmedAt && sellerOrder.requiresShipping
          ? new Date(
              new Date(sellerOrder.confirmedAt).getTime() +
                policyConfig.merchantDispatchDeadlineHours * 3600 * 1000,
            )
          : null,
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

  /**
   * Buyer creates a dispute / complaint (Task 62 / POL-12)
   */
  async createDispute(userId: string, orderId: string, dto: CreateDisputeDto) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        sellerOrders: {
          include: { items: true },
        },
      },
    });

    if (!order) throwNotFound(ErrorCode.ORDER_NOT_FOUND);

    // Validate eligible status for dispute: cannot dispute CANCELLED or unpaid orders
    if (
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.PENDING_PAYMENT
    ) {
      throwConflict(
        ErrorCode.ORDER_CANNOT_CANCEL,
        "Không thể mở khiếu nại đối với đơn hàng đã hủy hoặc chưa thanh toán",
      );
    }

    let targetSellerOrder: (typeof order.sellerOrders)[number] | null = null;
    if (dto.sellerOrderId) {
      targetSellerOrder =
        order.sellerOrders.find((so) => so.id === dto.sellerOrderId) || null;
      if (!targetSellerOrder) {
        throwNotFound(ErrorCode.SELLER_ORDER_NOT_FOUND);
      }
    }

    const disputeId = randomBytes(16).toString("hex");
    const disputedAmount = targetSellerOrder
      ? Number(targetSellerOrder.grandTotal)
      : Number(order.grandTotal);
    const split = this.escrow.calculateEscrowSplit(disputedAmount);

    return this.prisma.$transaction(async (tx) => {
      // 1. Record dispute entry in OrderStatusHistory
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          sellerOrderId: dto.sellerOrderId || null,
          fromStatus: targetSellerOrder
            ? targetSellerOrder.status
            : order.status,
          toStatus: "DISPUTE_OPENED",
          title: "Yêu cầu mở khiếu nại (Dispute Opened)",
          description: dto.description,
          actorType: "USER",
          actorId: userId,
          metadata: {
            disputeId,
            disputeType: dto.type,
            resolution: dto.resolution,
            evidence: dto.evidence || [],
            sellerOrderId: dto.sellerOrderId || null,
            escrowFrozen: true,
            frozenAmount: split.totalAmount,
            sellerPortion: split.sellerNet,
            platformFee: split.platformFee,
          },
        },
      });

      // 2. Record Escrow Frozen in OrderStatusHistory (Task 65 / POL-14 / POL-12)
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          sellerOrderId: dto.sellerOrderId || null,
          fromStatus: "ESCROW_HOLDING",
          toStatus: "ESCROW_FROZEN",
          title: "Đóng băng ký quỹ Escrow (Escrow Frozen)",
          description: `Đóng băng dòng tiền ${split.totalAmount.toLocaleString('vi-VN')}₫ (Gian hàng: ${split.sellerNet.toLocaleString('vi-VN')}₫, Phí sàn: ${split.platformFee.toLocaleString('vi-VN')}₫) do có tranh chấp #${disputeId}`,
          actorType: "SYSTEM",
          metadata: {
            disputeId,
            orderId,
            sellerOrderId: dto.sellerOrderId || null,
            frozenAmount: split.totalAmount,
            sellerPortion: split.sellerNet,
            platformFee: split.platformFee,
            frozenAt: new Date().toISOString(),
          },
        },
      });

      // 3. Emit domain event for downstream arbitration (POL-12)
      await tx.outboxEvent.create({
        data: {
          eventId: randomBytes(16).toString("hex"),
          type: "dispute.created",
          aggregateId: orderId,
          payload: {
            disputeId,
            orderId,
            orderCode: order.code,
            userId,
            sellerOrderId: dto.sellerOrderId || null,
            type: dto.type,
            description: dto.description,
            resolution: dto.resolution,
            evidence: dto.evidence || [],
            createdAt: new Date().toISOString(),
          },
          status: "PENDING",
        },
      });

      // 4. Emit canonical escrow.frozen event (Task 65 / POL-14)
      await tx.outboxEvent.create({
        data: {
          eventId: randomBytes(16).toString("hex"),
          type: "escrow.frozen",
          aggregateId: orderId,
          payload: {
            disputeId,
            orderId,
            orderCode: order.code,
            sellerOrderId: dto.sellerOrderId || null,
            frozenAmount: split.totalAmount,
            sellerPortion: split.sellerNet,
            platformFee: split.platformFee,
            frozenAt: new Date().toISOString(),
          },
          status: "PENDING",
        },
      });

      return {
        id: disputeId,
        orderId,
        sellerOrderId: dto.sellerOrderId || null,
        type: dto.type,
        description: dto.description,
        resolution: dto.resolution,
        evidence: dto.evidence || [],
        status: "DISPUTE_OPENED",
        escrowStatus: "ESCROW_FROZEN",
        frozenAmount: split.totalAmount,
        sellerPortion: split.sellerNet,
        platformFee: split.platformFee,
        createdAt: new Date().toISOString(),
      };
    });
  }

  /**
   * Upload dispute evidence file (Task 63 / POL-12)
   */
  async uploadDisputeEvidence(
    userId: string,
    orderId: string,
    file?: Express.Multer.File,
  ) {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException("Tập tin bằng chứng không được để trống");
    }

    const maxSizeBytes = 5 * 1024 * 1024; // 5MB limit
    if (file.size > maxSizeBytes) {
      throw new BadRequestException("Dung lượng tập tin vượt quá giới hạn 5MB");
    }

    const allowedMimeTypes = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ]);

    if (!allowedMimeTypes.has(file.mimetype)) {
      throw new BadRequestException(
        "Định dạng tập tin không hợp lệ. Chỉ chấp nhận JPG, PNG, WEBP, PDF",
      );
    }

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
    });

    if (!order) {
      throwNotFound(ErrorCode.ORDER_NOT_FOUND);
    }

    if (
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.PENDING_PAYMENT
    ) {
      throwConflict(
        ErrorCode.ORDER_CANNOT_CANCEL,
        "Không thể tải lên bằng chứng cho đơn hàng đã hủy hoặc chưa thanh toán",
      );
    }

    const rawExt = file.originalname.split(".").pop()?.toLowerCase() || "jpg";
    const safeExt = ["jpg", "jpeg", "png", "webp", "pdf"].includes(rawExt)
      ? rawExt
      : "jpg";
    const key = `disputes/${orderId}/${randomUUID()}.${safeExt}`;

    const publicDomain =
      this.configService.get<string>("storage.r2.publicDomain") ||
      "https://storage.huki.vn";
    const evidenceUrl = `${publicDomain}/${key}`;

    return {
      url: evidenceUrl,
      key,
      filename: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      uploadedAt: new Date().toISOString(),
    };
  }

  /**
   * Authorize and fetch dispute evidence access (Task 63 Section 10)
   */
  async getDisputeEvidenceAccess(
    actor: BookActor,
    orderId: string,
    evidenceKey: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { sellerOrders: true },
    });

    if (!order) throwNotFound(ErrorCode.ORDER_NOT_FOUND);

    const isBuyer = order.userId === actor.sub;
    const isSeller = order.sellerOrders.some(
      (so) => so.ownerUserId === actor.sub,
    );
    const isAdmin = actor.role === "PLATFORM_ADMIN";

    if (!isBuyer && !isSeller && !isAdmin) {
      throwForbidden(ErrorCode.AUTHZ_NOT_OWNER);
    }

    const publicDomain =
      this.configService.get<string>("storage.r2.publicDomain") ||
      "https://storage.huki.vn";

    return {
      orderId,
      key: evidenceKey,
      accessUrl: `${publicDomain}/${evidenceKey}`,
      authorizedActorId: actor.sub,
      role: actor.role,
    };
  }

  /**
   * List all disputes for Platform Admin (Task 64 / POL-12)
   */
  async adminListDisputes(actor: BookActor, query?: AdminDisputeQueryDto) {
    if (actor.role !== "PLATFORM_ADMIN") {
      throwForbidden(
        ErrorCode.AUTHZ_ROLE_INSUFFICIENT,
        "Chỉ Platform Admin mới có quyền truy cập cổng trọng tài tranh chấp",
      );
    }

    // Find all OrderStatusHistory entries representing disputes
    const histories = await this.prisma.orderStatusHistory.findMany({
      where: {
        OR: [
          { toStatus: { startsWith: "DISPUTE_" } },
          { toStatus: { startsWith: "RULING_" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        order: {
          include: {
            sellerOrders: {
              include: { items: true },
            },
          },
        },
      },
    });

    // Group history entries by disputeId
    const disputeMap = new Map<string, any>();

    for (const h of histories) {
      const meta = (h.metadata as any) || {};
      const disputeId = meta.disputeId || h.id;

      if (!disputeMap.has(disputeId)) {
        disputeMap.set(disputeId, {
          id: disputeId,
          orderId: h.orderId,
          orderCode: h.order?.code || "N/A",
          userId: h.order?.userId || h.actorId,
          grandTotal: h.order ? Number(h.order.grandTotal) : 0,
          paymentMethod: h.order?.paymentMethod,
          paymentStatus: h.order?.paymentStatus,
          sellerOrderId: meta.sellerOrderId || h.sellerOrderId,
          type: meta.disputeType || "OTHER",
          description: h.toStatus === "DISPUTE_OPENED" ? h.description : "",
          resolution: meta.resolution || "REFUND",
          evidence: meta.evidence || [],
          status: h.toStatus,
          createdAt: h.createdAt,
          updatedAt: h.createdAt,
          ruling: meta.ruling || null,
          rulingNotes: meta.ruling ? h.description : null,
          refundPercentage: meta.refundPercentage || null,
          resolvedAt: meta.resolvedAt || null,
          resolvedBy: meta.ruling ? h.actorId : null,
          adminEmail: meta.adminEmail || null,
          history: [],
        });
      }

      const dispute = disputeMap.get(disputeId);
      dispute.history.push({
        id: h.id,
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        title: h.title,
        description: h.description,
        actorType: h.actorType,
        actorId: h.actorId,
        metadata: h.metadata,
        createdAt: h.createdAt,
      });

      // If this history entry is the dispute opening, populate initial details
      if (h.toStatus === "DISPUTE_OPENED") {
        dispute.type = meta.disputeType || dispute.type;
        dispute.description = h.description || dispute.description;
        dispute.resolution = meta.resolution || dispute.resolution;
        dispute.evidence = meta.evidence || dispute.evidence;
        dispute.createdAt = h.createdAt;
      }

      // Latest ruling takes precedence for the current dispute state
      if (h.toStatus.startsWith("RULING_") && !dispute.ruling) {
        dispute.ruling = meta.ruling || h.toStatus.replace("RULING_", "");
        dispute.rulingNotes = h.description;
        dispute.refundPercentage = meta.refundPercentage || null;
        dispute.resolvedAt = meta.resolvedAt || h.createdAt;
        dispute.resolvedBy = h.actorId;
        dispute.adminEmail = meta.adminEmail;
      }
    }

    let results = Array.from(disputeMap.values());

    // Apply filtering
    if (query?.status) {
      results = results.filter(
        (d) =>
          d.status.toLowerCase().includes(query.status!.toLowerCase()) ||
          (d.ruling &&
            d.ruling.toLowerCase().includes(query.status!.toLowerCase())),
      );
    }
    if (query?.type) {
      results = results.filter((d) => d.type === query.type);
    }
    if (query?.search) {
      const q = query.search.toLowerCase();
      results = results.filter(
        (d) =>
          d.id.toLowerCase().includes(q) ||
          d.orderCode.toLowerCase().includes(q) ||
          (d.description && d.description.toLowerCase().includes(q)),
      );
    }

    return {
      data: results,
      total: results.length,
    };
  }

  /**
   * Get dispute detail for Platform Admin (Task 64 / POL-12)
   */
  async adminGetDisputeDetail(actor: BookActor, disputeId: string) {
    if (actor.role !== "PLATFORM_ADMIN") {
      throwForbidden(
        ErrorCode.AUTHZ_ROLE_INSUFFICIENT,
        "Chỉ Platform Admin mới có quyền truy cập cổng trọng tài tranh chấp",
      );
    }

    const histories = await this.prisma.orderStatusHistory.findMany({
      where: {
        OR: [
          { toStatus: { startsWith: "DISPUTE_" } },
          { toStatus: { startsWith: "RULING_" } },
        ],
      },
      orderBy: { createdAt: "asc" },
      include: {
        order: {
          include: {
            sellerOrders: {
              include: {
                items: {
                  include: { book: true },
                },
              },
            },
          },
        },
      },
    });

    const matchingHistories = histories.filter((h) => {
      const meta = (h.metadata as any) || {};
      return meta.disputeId === disputeId || h.id === disputeId;
    });

    if (matchingHistories.length === 0) {
      throwNotFound(ErrorCode.ORDER_NOT_FOUND, "Không tìm thấy hồ sơ tranh chấp này");
    }

    const openingHistory =
      matchingHistories.find((h) => h.toStatus === "DISPUTE_OPENED") ||
      matchingHistories[0];
    const rulingHistory = [...matchingHistories]
      .reverse()
      .find((h) => h.toStatus.startsWith("RULING_"));

    const meta = (openingHistory.metadata as any) || {};
    const rulingMeta = rulingHistory
      ? ((rulingHistory.metadata as any) || {})
      : null;

    const order = openingHistory.order;
    const targetSellerOrder = order?.sellerOrders.find(
      (so) => so.id === (meta.sellerOrderId || openingHistory.sellerOrderId),
    );

    const publicDomain =
      this.configService.get<string>("storage.r2.publicDomain") ||
      "https://storage.huki.vn";

    const rawEvidence: string[] = meta.evidence || [];
    const evidenceGallery = rawEvidence.map((item) => {
      if (item.startsWith("http")) return item;
      return `${publicDomain}/${item}`;
    });

    return {
      disputeId,
      orderId: openingHistory.orderId,
      orderCode: order?.code || "N/A",
      buyerId: order?.userId,
      orderGrandTotal: order ? Number(order.grandTotal) : 0,
      orderPaymentMethod: order?.paymentMethod,
      orderPaymentStatus: order?.paymentStatus,
      orderStatus: order?.status,
      shippingAddress: order?.shippingAddress,
      sellerOrderId: meta.sellerOrderId || openingHistory.sellerOrderId || null,
      targetSellerOrder: targetSellerOrder
        ? {
            id: targetSellerOrder.id,
            code: targetSellerOrder.code,
            storeId: targetSellerOrder.storeId,
            ownerUserId: targetSellerOrder.ownerUserId,
            grandTotal: Number(targetSellerOrder.grandTotal),
            status: targetSellerOrder.status,
            carrier: targetSellerOrder.carrier,
            trackingCode: targetSellerOrder.trackingCode,
            items: targetSellerOrder.items.map((it) => ({
              id: it.id,
              bookId: it.bookId,
              bookTitle: it.bookTitle,
              bookCoverUrl: it.bookCoverUrl,
              quantity: it.quantity,
              unitPrice: Number(it.unitPrice),
              subtotal: Number(it.subtotal),
              format: it.format,
            })),
          }
        : null,
      type: meta.disputeType || "OTHER",
      description: openingHistory.description || "",
      resolution: meta.resolution || "REFUND",
      evidence: evidenceGallery,
      currentStatus: rulingHistory
        ? rulingHistory.toStatus
        : openingHistory.toStatus,
      isFinalized:
        !!rulingHistory &&
        rulingHistory.toStatus !== "RULING_REQUEST_MORE_INFO",
      ruling: rulingMeta?.ruling || null,
      rulingNotes: rulingHistory ? rulingHistory.description : null,
      refundPercentage: rulingMeta?.refundPercentage || null,
      resolvedAt: rulingMeta?.resolvedAt || null,
      resolvedBy: rulingHistory ? rulingHistory.actorId : null,
      adminEmail: rulingMeta?.adminEmail || null,
      timeline: matchingHistories.map((h) => ({
        id: h.id,
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        title: h.title,
        description: h.description,
        actorType: h.actorType,
        actorId: h.actorId,
        metadata: h.metadata,
        createdAt: h.createdAt,
      })),
    };
  }

  /**
   * Execute Platform Admin Arbitration Ruling (Task 64 / POL-12)
   */
  async adminArbitrateDispute(
    actor: BookActor,
    disputeId: string,
    dto: ArbitrateDisputeDto,
  ) {
    if (actor.role !== "PLATFORM_ADMIN") {
      throwForbidden(
        ErrorCode.AUTHZ_ROLE_INSUFFICIENT,
        "Chỉ Platform Admin mới có thẩm quyền ra phán quyết trọng tài",
      );
    }

    if (dto.ruling === ArbitrationRuling.PARTIAL_SETTLEMENT) {
      if (
        dto.refundPercentage === undefined ||
        dto.refundPercentage <= 0 ||
        dto.refundPercentage >= 100
      ) {
        throw new BadRequestException(
          "Phán quyết hoàn tiền một phần yêu cầu tỷ lệ hoàn tiền hợp lệ từ 1% đến 99%",
        );
      }
    }

    const histories = await this.prisma.orderStatusHistory.findMany({
      where: {
        OR: [
          { toStatus: { startsWith: "DISPUTE_" } },
          { toStatus: { startsWith: "RULING_" } },
        ],
      },
      include: {
        order: {
          include: { sellerOrders: true },
        },
      },
    });

    const matchingHistories = histories.filter((h) => {
      const meta = (h.metadata as any) || {};
      return meta.disputeId === disputeId || h.id === disputeId;
    });

    if (matchingHistories.length === 0) {
      throwNotFound(ErrorCode.ORDER_NOT_FOUND, "Không tìm thấy hồ sơ tranh chấp này");
    }

    // Check if already in a terminal ruling state
    const terminalRulings = new Set([
      "RULING_BUYER_WINS",
      "RULING_SELLER_WINS",
      "RULING_PARTIAL_SETTLEMENT",
      "RULING_CARRIER_AT_FAULT",
    ]);

    const isAlreadyTerminal = matchingHistories.some((h) =>
      terminalRulings.has(h.toStatus),
    );

    if (isAlreadyTerminal) {
      throwConflict(
        ErrorCode.ORDER_CANNOT_CANCEL,
        "Tranh chấp đã có phán quyết trọng tài cuối cùng và không thể phân xử lại",
      );
    }

    const openingHistory =
      matchingHistories.find((h) => h.toStatus === "DISPUTE_OPENED") ||
      matchingHistories[0];
    const order = openingHistory.order;
    const meta = (openingHistory.metadata as any) || {};

    const targetSellerOrderId =
      dto.targetSellerOrderId ||
      meta.sellerOrderId ||
      openingHistory.sellerOrderId ||
      null;

    const targetSellerOrder = order?.sellerOrders.find(
      (so) => so.id === targetSellerOrderId,
    );
    const targetAmount = targetSellerOrder
      ? Number(targetSellerOrder.grandTotal)
      : order
      ? Number(order.grandTotal)
      : 0;
    const split = this.escrow.calculateEscrowSplit(targetAmount);

    let routing = "SETTLE_SELLER";
    let refundAmount = 0;
    let sellerSettlement = split.sellerNet;

    if (dto.ruling === "BUYER_WINS") {
      routing = "REFUND_BUYER";
      refundAmount = split.totalAmount;
      sellerSettlement = 0;
    } else if (dto.ruling === "SELLER_WINS") {
      routing = "SETTLE_SELLER";
      refundAmount = 0;
      sellerSettlement = split.sellerNet;
    } else if (dto.ruling === "PARTIAL_SETTLEMENT") {
      routing = "PARTIAL_SPLIT";
      refundAmount = Math.round((split.totalAmount * (dto.refundPercentage || 50)) / 100);
      sellerSettlement = Math.max(0, Math.round((split.totalAmount - refundAmount) * 0.85));
    } else if (dto.ruling === "CARRIER_AT_FAULT") {
      routing = "CARRIER_INSURANCE";
      refundAmount = 0;
      sellerSettlement = split.sellerNet;
    }

    const rulingStatus = `RULING_${dto.ruling}`;
    const rulingTitle = `Phán quyết trọng tài: ${dto.ruling}`;
    const resolvedAt = new Date().toISOString();

    return this.prisma.$transaction(async (tx) => {
      // 1. Record immutable audit in OrderStatusHistory
      await tx.orderStatusHistory.create({
        data: {
          orderId: openingHistory.orderId,
          sellerOrderId: targetSellerOrderId,
          fromStatus: openingHistory.toStatus,
          toStatus: rulingStatus,
          title: rulingTitle,
          description: dto.notes,
          actorType: "ADMIN",
          actorId: actor.sub,
          metadata: {
            disputeId,
            ruling: dto.ruling,
            notes: dto.notes,
            refundPercentage: dto.refundPercentage || null,
            adminEmail: actor.email,
            resolvedAt,
          },
        },
      });

      // 2. Record Escrow Unfrozen in OrderStatusHistory (Task 65 / POL-14 / POL-12)
      await tx.orderStatusHistory.create({
        data: {
          orderId: openingHistory.orderId,
          sellerOrderId: targetSellerOrderId,
          fromStatus: "ESCROW_FROZEN",
          toStatus: "ESCROW_UNFROZEN",
          title: `Mở khóa ký quỹ — ${rulingTitle}`,
          description: `Giải phóng ký quỹ: Điều hướng ${routing} (Hoàn khách: ${refundAmount.toLocaleString('vi-VN')}₫, Giải ngân Shop: ${sellerSettlement.toLocaleString('vi-VN')}₫)`,
          actorType: "ADMIN",
          actorId: actor.sub,
          metadata: {
            disputeId,
            ruling: dto.ruling,
            routing,
            refundAmount,
            sellerSettlement,
            platformFee: split.platformFee,
            resolvedAt,
          },
        },
      });

      // 3. Emit canonical domain event for dispute resolution (POL-12)
      await tx.outboxEvent.create({
        data: {
          eventId: randomBytes(16).toString("hex"),
          type: "dispute.resolved",
          aggregateId: openingHistory.orderId,
          payload: {
            disputeId,
            orderId: openingHistory.orderId,
            orderCode: order?.code,
            sellerOrderId: targetSellerOrderId,
            ruling: dto.ruling,
            notes: dto.notes,
            refundPercentage: dto.refundPercentage || null,
            resolvedBy: actor.sub,
            adminEmail: actor.email,
            resolvedAt,
          },
          status: "PENDING",
        },
      });

      // 4. Emit canonical escrow.unfrozen event (Task 65 / POL-14)
      await tx.outboxEvent.create({
        data: {
          eventId: randomBytes(16).toString("hex"),
          type: "escrow.unfrozen",
          aggregateId: openingHistory.orderId,
          payload: {
            disputeId,
            orderId: openingHistory.orderId,
            sellerOrderId: targetSellerOrderId,
            ruling: dto.ruling,
            routing,
            refundAmount,
            sellerSettlement,
            platformFee: split.platformFee,
            resolvedBy: actor.sub,
            resolvedAt,
          },
          status: "PENDING",
        },
      });

      return {
        disputeId,
        orderId: openingHistory.orderId,
        ruling: dto.ruling,
        status: rulingStatus,
        escrowStatus: "ESCROW_UNFROZEN",
        routing,
        refundAmount,
        sellerSettlement,
        notes: dto.notes,
        refundPercentage: dto.refundPercentage || null,
        resolvedBy: actor.sub,
        resolvedAt,
        message: "Phán quyết trọng tài đã được ban hành và ký quỹ Escrow được điều hướng thành công",
      };
    });
  }

  /**
   * Get runtime Escrow status for an Order or Sub-Order (Task 65 / POL-14)
   */
  async getEscrowStatus(
    actor: BookActor,
    orderId: string,
    sellerOrderId?: string,
  ) {
    return this.escrow.getEscrowStatus(actor, orderId, sellerOrderId);
  }

  /**
   * List all currently frozen escrows for Platform Admin audit (Task 65 / POL-14)
   */
  async listFrozenEscrows(actor: BookActor) {
    return this.escrow.listFrozenEscrows(actor);
  }

  /**
   * List all items currently in platform escrow holding account (Task fix_checkout_v1)
   */
  async adminListEscrowItems(actor: BookActor, query?: { status?: string; search?: string }) {
    if (actor.role !== 'PLATFORM_ADMIN') {
      throwForbidden(
        ErrorCode.AUTHZ_ROLE_INSUFFICIENT,
        'Chỉ Platform Admin mới có quyền truy cập tài khoản trung gian',
      );
    }

    const orders = await this.prisma.order.findMany({
      where: {
        paymentStatus: PaymentStatus.SUCCEEDED,
      },
      include: {
        sellerOrders: {
          include: {
            items: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const histories = await this.prisma.orderStatusHistory.findMany({
      where: {
        orderId: { in: orders.map((o) => o.id) },
      },
      orderBy: { createdAt: 'desc' },
    });

    const items: any[] = [];

    for (const order of orders) {
      const shipping = (order.shippingAddress as any) || {};
      const customerName = shipping.recipientName || 'Khách Hàng HUKI';
      const customerPhone = shipping.phone || '0901234567';

      for (const sellerOrder of order.sellerOrders) {
        for (const item of sellerOrder.items) {
          // Check item level history metadata
          const itemHistory = histories.find(
            (h) =>
              h.orderId === order.id &&
              (h.metadata as any)?.orderItemId === item.id,
          );

          const freezeEntry = histories.find(
            (h) =>
              h.orderId === order.id &&
              (h.toStatus === 'ESCROW_FROZEN' || h.toStatus === 'DISPUTE_OPENED') &&
              (!h.sellerOrderId || h.sellerOrderId === sellerOrder.id),
          );
          const unfreezeEntry = histories.find(
            (h) =>
              h.orderId === order.id &&
              (h.toStatus === 'ESCROW_UNFROZEN' || h.toStatus === 'ESCROW_RELEASED' || h.toStatus.startsWith('RULING_')) &&
              (!h.sellerOrderId || h.sellerOrderId === sellerOrder.id),
          );

          let escrowStatus: 'HOLDING' | 'FROZEN' | 'RELEASED' = 'HOLDING';

          if (itemHistory) {
            const target = (itemHistory.metadata as any)?.targetStatus;
            if (target) escrowStatus = target;
          } else if (freezeEntry && (!unfreezeEntry || new Date(freezeEntry.createdAt) > new Date(unfreezeEntry.createdAt))) {
            escrowStatus = 'FROZEN';
          } else if (unfreezeEntry && (unfreezeEntry.toStatus === 'ESCROW_RELEASED' || sellerOrder.status === 'COMPLETED')) {
            escrowStatus = 'RELEASED';
          }

          if (!query?.status || query.status === 'ALL' || escrowStatus === query.status) {
            items.push({
              id: item.id,
              orderId: order.id,
              orderCode: order.code,
              orderCreatedAt: order.createdAt.toISOString(),
              storeId: sellerOrder.storeId,
              storeName: sellerOrder.storeId,
              customerName,
              customerPhone,
              bookId: item.bookId,
              bookTitle: item.bookTitle,
              quantity: item.quantity,
              unitPrice: Number(item.unitPrice),
              subtotal: Number(item.subtotal),
              escrowStatus,
            });
          }
        }
      }
    }

    return items;
  }

  /**
   * Update item-level escrow status (Task fix_checkout_v1)
   */
  async adminUpdateEscrowItemStatus(
    actor: BookActor,
    orderItemId: string,
    dto: { status: 'HOLDING' | 'FROZEN' | 'RELEASED'; reason?: string },
  ) {
    if (actor.role !== 'PLATFORM_ADMIN') {
      throwForbidden(
        ErrorCode.AUTHZ_ROLE_INSUFFICIENT,
        'Chỉ Platform Admin mới có quyền cập nhật trạng thái dòng tiền',
      );
    }

    const item = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        sellerOrder: {
          include: {
            order: true,
          },
        },
      },
    });

    if (!item) {
      throwNotFound(ErrorCode.ORDER_NOT_FOUND, 'Không tìm thấy món hàng');
    }

    const historyStatus =
      dto.status === 'FROZEN'
        ? 'ESCROW_FROZEN'
        : dto.status === 'RELEASED'
        ? 'ESCROW_RELEASED'
        : 'ESCROW_HOLDING';

    await this.prisma.orderStatusHistory.create({
      data: {
        orderId: item.sellerOrder.orderId,
        sellerOrderId: item.sellerOrder.id,
        fromStatus: 'ESCROW_STATUS_CHANGE',
        toStatus: historyStatus,
        title: `Cập nhật trạng thái dòng tiền món ${item.bookTitle} sang ${dto.status}`,
        description: dto.reason || `Admin cập nhật dòng tiền món ${item.bookTitle} sang ${dto.status}`,
        actorType: 'ADMIN',
        actorId: actor.sub,
        metadata: {
          orderItemId,
          bookId: item.bookId,
          bookTitle: item.bookTitle,
          subtotal: Number(item.subtotal),
          targetStatus: dto.status,
          updatedBy: actor.email,
        },
      },
    });

    return {
      orderItemId,
      status: dto.status,
      message: `Đã cập nhật trạng thái dòng tiền món ${item.bookTitle} sang ${dto.status}`,
    };
  }
}



