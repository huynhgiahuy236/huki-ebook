import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { BookActor } from "../../common/book-auth.guard";
import {
  throwForbidden,
  throwNotFound,
  ErrorCode,
} from "@huki/shared/errors";
import { OrderStatus, PaymentStatus } from "../../../prisma/generated/client";

export interface EscrowFinancials {
  totalAmount: number;
  platformFee: number; // 15% commission (POL-14)
  sellerNet: number; // 85% net payout (POL-14)
  frozenAmount?: number;
  sellerPortion?: number;
}

export interface EscrowStatusResult {
  orderId: string;
  orderCode: string;
  sellerOrderId: string | null;
  status: "ESCROW_HOLDING" | "ESCROW_FROZEN" | "ESCROW_UNFROZEN" | "ESCROW_RELEASED" | "ESCROW_REFUNDED";
  isFrozen: boolean;
  canRelease: boolean;
  blockReason?: string;
  financials: EscrowFinancials;
  holdingPeriod: {
    totalHoldingSeconds: number;
    deliveredAt: string | null;
    isDelivered: boolean;
    isExpired: boolean;
  };
  disputeContext: {
    disputeId?: string;
    disputeType?: string;
    frozenAt?: string;
    ruling?: string;
    resolvedAt?: string;
    routing?: string;
  } | null;
}

@Injectable()
export class EscrowService {
  private readonly logger = new Logger(EscrowService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate 85/15 Escrow Revenue Split according to POL-14 (SPLIT-001)
   */
  calculateEscrowSplit(amount: number, platformFeePercent: number = 15): EscrowFinancials {
    const totalAmount = Math.max(0, amount);
    const platformFee = Math.round((totalAmount * platformFeePercent) / 100);
    const sellerNet = totalAmount - platformFee;

    return {
      totalAmount,
      platformFee,
      sellerNet,
    };
  }

  /**
   * Get runtime Escrow status for an Order or specific SellerOrder (Task 65 / POL-14 / POL-12)
   */
  async getEscrowStatus(
    actor: BookActor,
    orderId: string,
    sellerOrderId?: string,
  ): Promise<EscrowStatusResult> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        sellerOrders: {
          include: { items: true },
        },
      },
    });

    if (!order) {
      throwNotFound(ErrorCode.ORDER_NOT_FOUND, "Không tìm thấy đơn hàng");
    }

    // RBAC & IDOR check: Buyer, seller of sub-order, or Platform Admin
    const isBuyer = order.userId === actor.sub;
    const isSeller = order.sellerOrders.some((so) => so.ownerUserId === actor.sub);
    const isAdmin = actor.role === "PLATFORM_ADMIN";

    if (!isBuyer && !isSeller && !isAdmin) {
      throwForbidden(ErrorCode.AUTHZ_NOT_OWNER, "Không có quyền truy cập trạng thái ký quỹ của đơn hàng này");
    }

    const histories = await this.prisma.orderStatusHistory.findMany({
      where: { orderId },
      orderBy: { createdAt: "desc" },
    });

    let targetSellerOrder: (typeof order.sellerOrders)[number] | null = null;
    if (sellerOrderId) {
      targetSellerOrder = order.sellerOrders.find((so) => so.id === sellerOrderId) || null;
      if (!targetSellerOrder) {
        throwNotFound(ErrorCode.SELLER_ORDER_NOT_FOUND, "Không tìm thấy gói hàng");
      }
    } else if (order.sellerOrders.length === 1) {
      targetSellerOrder = order.sellerOrders[0];
    }

    const amount = targetSellerOrder ? Number(targetSellerOrder.grandTotal) : Number(order.grandTotal);
    const split = this.calculateEscrowSplit(amount);

    // Determine frozen status
    // Find dispute & escrow freeze entries
    const freezeEntry = histories.find(
      (h) =>
        (h.toStatus === "ESCROW_FROZEN" || h.toStatus === "DISPUTE_OPENED") &&
        (!sellerOrderId || !h.sellerOrderId || h.sellerOrderId === sellerOrderId),
    );

    const unfreezeEntry = histories.find(
      (h) =>
        (h.toStatus === "ESCROW_UNFROZEN" || h.toStatus.startsWith("RULING_")) &&
        (!sellerOrderId || !h.sellerOrderId || h.sellerOrderId === sellerOrderId),
    );

    const isFrozen =
      !!freezeEntry &&
      (!unfreezeEntry || new Date(freezeEntry.createdAt) > new Date(unfreezeEntry.createdAt));

    let status: EscrowStatusResult["status"] = "ESCROW_HOLDING";
    let blockReason: string | undefined;

    if (isFrozen) {
      status = "ESCROW_FROZEN";
      blockReason = "Dòng tiền đang bị đóng băng ký quỹ do có khiếu nại tranh chấp chưa phân xử";
    } else if (unfreezeEntry) {
      const meta = (unfreezeEntry.metadata as any) || {};
      if (meta.routing === "REFUND_BUYER" || unfreezeEntry.toStatus === "RULING_BUYER_WINS") {
        status = "ESCROW_REFUNDED";
      } else {
        status = "ESCROW_UNFROZEN";
      }
    } else if (order.status === OrderStatus.COMPLETED && order.paymentStatus === PaymentStatus.SUCCEEDED) {
      status = "ESCROW_RELEASED";
    }

    // Holding period calculation (POL-14: 7 days for physical, 24h for digital)
    const requiresShipping = targetSellerOrder ? targetSellerOrder.requiresShipping : true;
    const totalHoldingSeconds = requiresShipping ? 7 * 24 * 3600 : 24 * 3600;
    const deliveredAt = targetSellerOrder?.completedAt?.toISOString() || null;
    const isDelivered = !!targetSellerOrder?.completedAt || order.status === OrderStatus.COMPLETED;

    const disputeMeta = freezeEntry ? ((freezeEntry.metadata as any) || {}) : null;
    const rulingMeta = unfreezeEntry ? ((unfreezeEntry.metadata as any) || {}) : null;

    return {
      orderId,
      orderCode: order.code,
      sellerOrderId: sellerOrderId || targetSellerOrder?.id || null,
      status,
      isFrozen,
      canRelease: !isFrozen && (order.paymentStatus === PaymentStatus.SUCCEEDED || order.paymentMethod === "COD"),
      blockReason,
      financials: {
        ...split,
        frozenAmount: isFrozen ? split.totalAmount : undefined,
        sellerPortion: isFrozen ? split.sellerNet : undefined,
      },
      holdingPeriod: {
        totalHoldingSeconds,
        deliveredAt,
        isDelivered,
        isExpired: isDelivered && !isFrozen,
      },
      disputeContext: freezeEntry
        ? {
            disputeId: disputeMeta?.disputeId,
            disputeType: disputeMeta?.disputeType,
            frozenAt: freezeEntry.createdAt.toISOString(),
            ruling: rulingMeta?.ruling,
            resolvedAt: unfreezeEntry?.createdAt.toISOString(),
            routing: rulingMeta?.routing,
          }
        : null,
    };
  }

  /**
   * Release eligibility guard for settlement jobs / automated payout (Task 65 / POL-14)
   */
  async canReleaseEscrow(
    orderId: string,
    sellerOrderId?: string,
  ): Promise<{ canRelease: boolean; reason?: string }> {
    const histories = await this.prisma.orderStatusHistory.findMany({
      where: { orderId },
      orderBy: { createdAt: "desc" },
    });

    const freezeEntry = histories.find(
      (h) =>
        (h.toStatus === "ESCROW_FROZEN" || h.toStatus === "DISPUTE_OPENED") &&
        (!sellerOrderId || !h.sellerOrderId || h.sellerOrderId === sellerOrderId),
    );

    const unfreezeEntry = histories.find(
      (h) =>
        (h.toStatus === "ESCROW_UNFROZEN" || h.toStatus.startsWith("RULING_")) &&
        (!sellerOrderId || !h.sellerOrderId || h.sellerOrderId === sellerOrderId),
    );

    const isFrozen =
      !!freezeEntry &&
      (!unfreezeEntry || new Date(freezeEntry.createdAt) > new Date(unfreezeEntry.createdAt));

    if (isFrozen) {
      return {
        canRelease: false,
        reason: "Dòng tiền ký quỹ đang bị đóng băng (ESCROW_FROZEN) do tranh chấp đang mở",
      };
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return { canRelease: false, reason: "Đơn hàng không tồn tại" };
    }

    if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.REFUNDED) {
      return { canRelease: false, reason: "Đơn hàng đã bị hủy hoặc hoàn tiền" };
    }

    return { canRelease: true };
  }

  /**
   * List all currently frozen escrow holdings for Platform Admin audit (Task 65 / POL-14)
   */
  async listFrozenEscrows(actor: BookActor) {
    if (actor.role !== "PLATFORM_ADMIN") {
      throwForbidden(
        ErrorCode.AUTHZ_ROLE_INSUFFICIENT,
        "Chỉ Platform Admin mới có quyền truy cập báo cáo đóng băng ký quỹ",
      );
    }

    // Find all histories with ESCROW_FROZEN or DISPUTE_OPENED
    const freezeHistories = await this.prisma.orderStatusHistory.findMany({
      where: {
        OR: [
          { toStatus: "ESCROW_FROZEN" },
          { toStatus: "DISPUTE_OPENED" },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        order: {
          include: {
            sellerOrders: true,
          },
        },
      },
    });

    // Group by disputeId / orderId and check if unfreeze exists
    const frozenMap = new Map<string, any>();

    for (const h of freezeHistories) {
      const meta = (h.metadata as any) || {};
      const disputeId = meta.disputeId || h.id;

      if (!frozenMap.has(disputeId)) {
        const order = h.order;
        const targetSellerOrder = order?.sellerOrders.find(
          (so) => so.id === (meta.sellerOrderId || h.sellerOrderId),
        );
        const amount = targetSellerOrder
          ? Number(targetSellerOrder.grandTotal)
          : order
          ? Number(order.grandTotal)
          : 0;
        const split = this.calculateEscrowSplit(amount);

        frozenMap.set(disputeId, {
          disputeId,
          orderId: h.orderId,
          orderCode: order?.code || "N/A",
          sellerOrderId: meta.sellerOrderId || h.sellerOrderId || null,
          frozenAmount: split.totalAmount,
          frozenSellerPortion: split.sellerNet,
          frozenPlatformFee: split.platformFee,
          frozenAt: h.createdAt.toISOString(),
          reason: h.description,
          disputeType: meta.disputeType || "OTHER",
        });
      }
    }

    const items = Array.from(frozenMap.values());
    const totalFrozenAmount = items.reduce((acc, it) => acc + it.frozenAmount, 0);
    const totalFrozenSellerPortion = items.reduce((acc, it) => acc + it.frozenSellerPortion, 0);

    return {
      data: items,
      totalCount: items.length,
      totalFrozenAmount,
      totalFrozenSellerPortion,
    };
  }
}
