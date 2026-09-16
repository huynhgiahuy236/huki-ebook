import { Injectable } from "@nestjs/common";
import { randomBytes } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { BookActor } from "../../common/book-auth.guard";
import { getSellerScope } from "../../common/seller-scope.util";
import { CancelOrderDto, ShipOrderDto } from "./dto/checkout.dto";
import { OrderQueryDto, SellerOrderQueryDto } from "./dto/order-query.dto";
import { InventoryReservationService } from "./inventory-reservation.service";
import { SellerOrderStatus, Prisma } from "../../../prisma/generated/client";
import { ORDER_EVENTS } from "../../../../../libs/shared/src";
import { OrderCompletionService } from "./order-completion.service";
import {
  throwConflict,
  throwNotFound,
  throwForbidden,
} from "@huki/shared/errors";
import { ErrorCode } from "@huki/shared/errors";
import { FlashSaleClientService } from "./flash-sale-client.service";

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
    private readonly flashSales: FlashSaleClientService,
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
          flashSaleBookIds.push(
            ...sellerOrder.items.map((item) => item.bookId),
          );
        }
      }

      await this.reservations.release(tx as any, o.id, itemIds);

      const newStatus = "CANCELLED";

      await tx.order.update({
        where: { id },
        data: {
          status: newStatus,
          cancelReason: dto.reason,
          cancelledAt: now,
          paymentStatus:
            o.paymentStatus === "SUCCEEDED"
              ? "REFUND_PENDING"
              : o.paymentStatus,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: o.id,
          fromStatus: o.status,
          toStatus: newStatus,
          title: "Buyer cancelled order",
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
