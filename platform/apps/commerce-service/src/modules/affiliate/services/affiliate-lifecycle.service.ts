import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { AffiliateCommissionStateMachineService } from '../state-machine/affiliate-commission-state-machine.service';
import { AffiliateCommissionStatus } from '../../../../prisma/generated/client';

export interface ProcessHoldingsResult {
  processedCount: number;
  settledCommissions: Array<{
    id: string;
    profileId: string;
    amount: number;
    ledgerTxId: string;
  }>;
}

@Injectable()
export class AffiliateLifecycleService {
  private readonly logger = new Logger(AffiliateLifecycleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stateMachine: AffiliateCommissionStateMachineService,
  ) {}

  /**
   * 1. Order Delivered Trigger
   * Sách giấy: Giữ 7 ngày (168 giờ) sau khi giao thành công (Delivered).
   * Sách điện tử: Giữ 24 giờ sau khi thanh toán thành công (Paid) hoặc giao thành công.
   */
  async handleOrderDelivered(
    orderId: string,
    sellerOrderId?: string,
    deliveredAt: Date = new Date(),
    tx?: any,
  ) {
    const client = tx || this.prisma;
    const where: any = {
      orderId,
      status: AffiliateCommissionStatus.PENDING,
    };
    if (sellerOrderId) {
      where.orderItem = { sellerOrderId };
    }

    const pendingCommissions = await client.affiliateCommission.findMany({
      where,
    });

    const results: any[] = [];
    for (const comm of pendingCommissions) {
      const snapshot = comm.policySnapshot as Record<string, unknown> | null;
      const snapshotHoldingHours = Number(snapshot?.holdingDurationHours);
      const isDigital =
        comm.bookFormat === 'DIGITAL' ||
        comm.bookFormat === 'EBOOK' ||
        comm.bookFormat === 'AUDIO';
      const holdingDurationHours =
        Number.isFinite(snapshotHoldingHours) && snapshotHoldingHours >= 0
          ? snapshotHoldingHours
          : isDigital
            ? 24
            : 168;

      const updated = tx
        ? await this.stateMachine.transitionToHolding(
            comm.id,
            holdingDurationHours,
            deliveredAt,
            tx,
          )
        : await this.stateMachine.transitionToHolding(
            comm.id,
            holdingDurationHours,
            deliveredAt,
          );
      results.push(updated);
    }

    if (results.length > 0) {
      this.logger.log(
        `[Order Delivered] Moved ${results.length} commissions to HOLDING for order ${orderId}`,
      );
    }
    return results;
  }

  /**
   * 2. Digital Order Paid Trigger
   * Bắt đầu đếm ngược 24h holding ngay khi sách điện tử được thanh toán thành công.
   */
  async handleDigitalOrderPaid(
    orderId: string,
    paidAt: Date = new Date(),
    tx?: any,
  ) {
    const client = tx || this.prisma;
    const digitalCommissions = await client.affiliateCommission.findMany({
      where: {
        orderId,
        status: AffiliateCommissionStatus.PENDING,
        bookFormat: { in: ['DIGITAL', 'EBOOK', 'AUDIO'] },
      },
    });

    const results: any[] = [];
    for (const comm of digitalCommissions) {
      const updated = await this.stateMachine.transitionToHolding(
        comm.id,
        24,
        paidAt,
      );
      results.push(updated);
    }

    if (results.length > 0) {
      this.logger.log(
        `[Digital Paid] Moved ${results.length} digital commissions to HOLDING for order ${orderId}`,
      );
    }
    return results;
  }

  /**
   * 3. Buyer-Confirm Shortcut (Quyết định 2)
   * Khi Buyer bấm xác nhận hài lòng sớm, rút ngắn thời hạn giữ xuống còn 24 giờ.
   */
  async handleBuyerConfirmReceipt(
    orderId: string,
    confirmedAt: Date = new Date(),
    tx?: any,
  ) {
    const client = tx || this.prisma;
    const holdingCommissions = await client.affiliateCommission.findMany({
      where: {
        orderId,
        status: AffiliateCommissionStatus.HOLDING,
      },
    });

    const updatedCommissions: any[] = [];
    const targetHoldingUntil = new Date(
      confirmedAt.getTime() + 24 * 3600 * 1000,
    );

    for (const comm of holdingCommissions) {
      // If current holdingUntil is further in future than 24h from now, shorten it to 24h
      if (comm.holdingUntil && comm.holdingUntil > targetHoldingUntil) {
        const updated = await client.affiliateCommission.update({
          where: { id: comm.id },
          data: {
            holdingUntil: targetHoldingUntil,
            version: { increment: 1 },
          },
        });
        updatedCommissions.push(updated);
        this.logger.log(
          `[Buyer Shortcut] Commission ${comm.id} holding period reduced to 24h (ending at ${targetHoldingUntil.toISOString()})`,
        );
      }
    }

    return updatedCommissions;
  }

  /**
   * 4. Order Cancelled (Quyết định 3)
   * Huỷ toàn bộ hoa hồng PENDING hoặc HOLDING của đơn hàng.
   */
  async handleOrderCancelled(orderId: string, reason: string, tx?: any) {
    const client = tx || this.prisma;
    const commissions = await client.affiliateCommission.findMany({
      where: {
        orderId,
        status: {
          in: [
            AffiliateCommissionStatus.PENDING,
            AffiliateCommissionStatus.HOLDING,
          ],
        },
      },
    });

    const cancelled: any[] = [];
    for (const comm of commissions) {
      const res = await this.stateMachine.cancelCommission(
        comm.id,
        reason || 'Order cancelled',
      );
      cancelled.push(res);
    }

    if (cancelled.length > 0) {
      this.logger.log(
        `[Order Cancelled] Cancelled ${cancelled.length} commissions for order ${orderId}`,
      );
    }
    return cancelled;
  }

  /**
   * 5. Partial Refund / Line-Item Return (Quyết định 4 & 3)
   * Trả cuốn nào thì huỷ/đảo hoa hồng của đúng cuốn đó (orderItemId).
   * - Nếu PENDING/HOLDING: Huỷ thẳng (CANCELLED).
   * - Nếu AVAILABLE: Đảo bút toán (REVERSED), ví âm thì ghi nợ (Debt).
   */
  async handleOrderItemRefunded(
    orderItemId: string,
    reason: string,
    tx?: any,
  ) {
    const client = tx || this.prisma;
    const commission = await client.affiliateCommission.findUnique({
      where: { orderItemId },
    });

    if (!commission) {
      return null;
    }

    if (
      commission.status === AffiliateCommissionStatus.PENDING ||
      commission.status === AffiliateCommissionStatus.HOLDING
    ) {
      return this.stateMachine.cancelCommission(
        commission.id,
        reason || 'Line item returned / refunded before settlement',
      );
    }

    if (commission.status === AffiliateCommissionStatus.AVAILABLE) {
      return this.stateMachine.reverseCommission(
        commission.id,
        reason || 'Line item returned / refunded after settlement (Reversed)',
      );
    }

    return commission;
  }

  /**
   * 6. Dispute Opened / Return Requested
   * Chặn không cho giải phóng hoa hồng khi đang có khiếu nại.
   */
  async handleDisputeOpened(
    orderId: string,
    orderItemIds?: string[],
    tx?: any,
  ) {
    const client = tx || this.prisma;
    const where: any = { orderId };
    if (orderItemIds && orderItemIds.length > 0) {
      where.orderItemId = { in: orderItemIds };
    }

    const commissions = await client.affiliateCommission.findMany({ where });
    for (const comm of commissions) {
      await this.stateMachine.blockDispute(comm.id);
    }
    this.logger.log(
      `[Dispute Blocked] Blocked ${commissions.length} commissions for dispute on order ${orderId}`,
    );
    return commissions;
  }

  /**
   * 7. Dispute Dismissed / Buyer Claim Rejected
   * Gỡ chặn tranh chấp để tiếp tục chu trình holding.
   */
  async handleDisputeDismissed(
    orderId: string,
    orderItemIds?: string[],
    tx?: any,
  ) {
    const client = tx || this.prisma;
    const where: any = { orderId, disputeBlocked: true };
    if (orderItemIds && orderItemIds.length > 0) {
      where.orderItemId = { in: orderItemIds };
    }

    const commissions = await client.affiliateCommission.findMany({ where });
    for (const comm of commissions) {
      await this.stateMachine.unblockDispute(comm.id);
    }
    this.logger.log(
      `[Dispute Unblocked] Unblocked ${commissions.length} commissions for order ${orderId}`,
    );
    return commissions;
  }

  /**
   * 8. Process Matured Holdings (Scheduled / Batch Worker)
   * Tự động giải phóng các khoản hoa hồng HOLDING đã hết hạn và không bị dispute,
   * chuyển sang AVAILABLE và ghi nhận Double-Entry Ledger.
   */
  async processMaturedHoldings(
    batchSize: number = 50,
    now: Date = new Date(),
  ): Promise<ProcessHoldingsResult> {
    const maturedCommissions = await this.prisma.affiliateCommission.findMany({
      where: {
        status: AffiliateCommissionStatus.HOLDING,
        disputeBlocked: false,
        holdingUntil: { lte: now },
      },
      take: batchSize,
      orderBy: { holdingUntil: 'asc' },
    });

    const settledCommissions: Array<{
      id: string;
      profileId: string;
      amount: number;
      ledgerTxId: string;
    }> = [];

    for (const comm of maturedCommissions) {
      try {
        const settled = await this.stateMachine.settleCommission(comm.id, now);
        settledCommissions.push({
          id: settled.commissionId,
          profileId: comm.profileId,
          amount: settled.amount,
          ledgerTxId: settled.ledgerTransactionId,
        });

        // Fire outbox event for real-time notification & reporting
        await this.prisma.outboxEvent.create({
          data: {
            eventId: crypto.randomBytes(16).toString('hex'),
            type: 'AFFILIATE_COMMISSION_AVAILABLE',
            aggregateId: comm.id,
            payload: {
              commissionId: comm.id,
              profileId: comm.profileId,
              orderId: comm.orderId,
              orderItemId: comm.orderItemId,
              amount: settled.amount,
              settledAt: settled.settledAt,
              ledgerTxId: settled.ledgerTransactionId,
            },
          },
        });
      } catch (err: any) {
        this.logger.error(
          `Failed to settle matured commission ${comm.id}: ${err.message}`,
          err.stack,
        );
      }
    }

    this.logger.log(
      `[Matured Holdings Worker] Successfully settled ${settledCommissions.length} of ${maturedCommissions.length} commissions at ${now.toISOString()}`,
    );

    return {
      processedCount: maturedCommissions.length,
      settledCommissions,
    };
  }

  /**
   * Release commissions when the commerce escrow is actually released.
   * This is the canonical path for environments whose real return window is
   * shorter than the affiliate policy fallback (for example the 2-minute
   * local/UAT window).
   */
  async handleEscrowReleased(orderId: string, releasedAt: Date = new Date()) {
    const commissions = await this.prisma.affiliateCommission.findMany({
      where: {
        orderId,
        status: AffiliateCommissionStatus.HOLDING,
        disputeBlocked: false,
      },
    });

    const settled: Array<
      Awaited<
        ReturnType<AffiliateCommissionStateMachineService['settleCommission']>
      >
    > = [];
    for (const commission of commissions) {
      const result = await this.stateMachine.settleCommission(
        commission.id,
        releasedAt,
      );
      settled.push(result);
    }

    if (settled.length > 0) {
      this.logger.log(
        `[Escrow Released] Settled ${settled.length} commissions for order ${orderId}`,
      );
    }
    return settled;
  }
}
