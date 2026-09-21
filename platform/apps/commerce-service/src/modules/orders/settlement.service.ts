import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { WalletService } from '../wallet/wallet.service';
import { PolicyConfigService } from '../../../../../libs/shared/src/config/policy-config.service';
import {
  CartItemFormat,
  LedgerAccountType,
  LedgerEntryDirection,
  OrderStatus,
  PaymentStatus,
  Prisma,
  SellerOrder,
  SellerOrderStatus,
} from '../../../prisma/generated/client';
import { Decimal } from '@prisma/client/runtime/library';
import { BookActor } from '../../common/book-auth.guard';
import { DomainEvent, ORDER_EVENTS } from '../../../../../libs/shared/src';
import { randomBytes } from 'crypto';

export interface SettlementCalculationResult {
  sellerOrderId: string;
  storeId: string;
  orderId: string;
  orderCode: string;
  sellerOrderCode: string;
  itemSubtotal: number;
  shippingFee: number;
  grandTotal: number;
  commissionBasis: 'NET_PAID' | 'SUBTOTAL';
  commissionBasisAmount: number;
  commissionPercent: number;
  platformCommission: number;
  platformSubsidy: number;
  sellerNet: number;
  currency: string;
}

export interface SettlementEligibilityResult {
  sellerOrderId: string;
  isEligible: boolean;
  reason?: string;
  orderStatus?: string;
  paymentStatus?: string;
  sellerOrderStatus?: string;
  format?: 'PHYSICAL' | 'DIGITAL' | 'BOTH';
  isFrozen?: boolean;
  isAlreadySettled?: boolean;
}

export interface SettlementExecutionResult {
  success: boolean;
  sellerOrderId: string;
  storeId: string;
  ledgerTransactionId?: string;
  ledgerTransactionNumber?: string;
  calculation: SettlementCalculationResult;
  settledAt: Date;
  isIdempotentReplay?: boolean;
}

@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
    private readonly walletService: WalletService,
    private readonly policyConfig: PolicyConfigService,
  ) {}

  /**
   * Calculate Platform Commission and Net Seller Proceeds using PolicyConfigService
   * Adheres to DEC-002 (Configured engineering basis) and DEC-004 (Subsidy rate)
   */
  calculateSettlement(sellerOrder: {
    id: string;
    orderId: string;
    code: string;
    storeId: string;
    itemSubtotal: Decimal | number | string;
    shippingFee: Decimal | number | string;
    grandTotal: Decimal | number | string;
    order?: { code?: string };
  }): SettlementCalculationResult {
    const commissionPercent = this.policyConfig.platformCommissionPercent; // Default 15%
    const basis = this.policyConfig.commissionCalculationBasis; // 'NET_PAID' or 'SUBTOTAL' (DEC-002)
    const subsidyRate = this.policyConfig.platformVoucherSubsidyRate; // Default 0 (DEC-004)

    const subtotal = new Decimal(sellerOrder.itemSubtotal);
    const shippingFee = new Decimal(sellerOrder.shippingFee);
    const grandTotal = new Decimal(sellerOrder.grandTotal);

    // Commission Basis: SUBTOTAL (gross book price) vs NET_PAID (grand total paid for sub-order)
    const commissionBasisAmount = basis === 'SUBTOTAL' ? subtotal : grandTotal;

    // Platform Commission = round(basisAmount * commissionPercent / 100)
    const platformCommission = commissionBasisAmount
      .mul(new Decimal(commissionPercent))
      .div(new Decimal(100))
      .toDecimalPlaces(0, Decimal.ROUND_HALF_UP);

    // Platform Voucher Subsidy (POL-14 FEE-001 / DEC-004):
    // Platform reimburses the platform-funded discount portion to the seller
    const discountAmount = Decimal.max(new Decimal(0), subtotal.add(shippingFee).sub(grandTotal));
    const platformSubsidy = discountAmount
      .mul(new Decimal(subsidyRate))
      .toDecimalPlaces(0, Decimal.ROUND_HALF_UP);

    // Seller Net Payout = GrandTotal - Commission + Subsidy
    let sellerNet = grandTotal.sub(platformCommission).add(platformSubsidy);
    if (sellerNet.isNegative()) {
      sellerNet = new Decimal(0);
    }

    return {
      sellerOrderId: sellerOrder.id,
      storeId: sellerOrder.storeId,
      orderId: sellerOrder.orderId,
      orderCode: sellerOrder.order?.code || 'N/A',
      sellerOrderCode: sellerOrder.code,
      itemSubtotal: subtotal.toNumber(),
      shippingFee: shippingFee.toNumber(),
      grandTotal: grandTotal.toNumber(),
      commissionBasis: basis,
      commissionBasisAmount: commissionBasisAmount.toNumber(),
      commissionPercent,
      platformCommission: platformCommission.toNumber(),
      platformSubsidy: platformSubsidy.toNumber(),
      sellerNet: sellerNet.toNumber(),
      currency: 'VND',
    };
  }

  /**
   * Check settlement eligibility for a single SellerOrder unit (POL-14 / POL-15)
   */
  async checkEligibility(sellerOrderId: string): Promise<SettlementEligibilityResult> {
    const sellerOrder = await this.prisma.sellerOrder.findUnique({
      where: { id: sellerOrderId },
      include: {
        order: {
          include: {
            sellerOrders: true,
            statusHistory: { orderBy: { createdAt: 'desc' } },
          },
        },
        items: true,
      },
    });

    if (!sellerOrder) {
      return {
        sellerOrderId,
        isEligible: false,
        reason: `Seller order ${sellerOrderId} not found`,
      };
    }

    const { order, items = [] } = sellerOrder;

    if (!order) {
      return {
        sellerOrderId,
        isEligible: false,
        reason: `Parent order for seller order ${sellerOrderId} not found`,
      };
    }

    // 1. Terminal Cancellation / Refund Guard
    if (
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.REFUNDED ||
      order.paymentStatus === PaymentStatus.REFUND_PENDING ||
      order.paymentStatus === PaymentStatus.REFUNDED ||
      sellerOrder.status === SellerOrderStatus.CANCELLED
    ) {
      return {
        sellerOrderId,
        isEligible: false,
        orderStatus: order.status,
        paymentStatus: order.paymentStatus,
        sellerOrderStatus: sellerOrder.status,
        reason: 'Order or seller order has been cancelled or refunded',
      };
    }

    // 2. Payment Verification Guard
    const isPaid =
      order.paymentStatus === PaymentStatus.SUCCEEDED ||
      (order.paymentMethod === 'COD' && order.status === OrderStatus.COMPLETED);

    if (!isPaid) {
      return {
        sellerOrderId,
        isEligible: false,
        orderStatus: order.status,
        paymentStatus: order.paymentStatus,
        sellerOrderStatus: sellerOrder.status,
        reason: 'Order payment has not succeeded',
      };
    }

    // 3. Dispute & Escrow Freeze Guard (POL-14 / POL-12)
    const histories = order.statusHistory || [];
    const freezeEntry = histories.find(
      (h) =>
        (h.toStatus === 'ESCROW_FROZEN' || h.toStatus === 'DISPUTE_OPENED') &&
        (!h.sellerOrderId || h.sellerOrderId === sellerOrderId),
    );

    const unfreezeEntry = histories.find(
      (h) =>
        (h.toStatus === 'ESCROW_UNFROZEN' || h.toStatus.startsWith('RULING_')) &&
        (!h.sellerOrderId || h.sellerOrderId === sellerOrderId),
    );

    const isFrozen =
      !!freezeEntry &&
      (!unfreezeEntry || new Date(freezeEntry.createdAt) > new Date(unfreezeEntry.createdAt));

    if (isFrozen) {
      return {
        sellerOrderId,
        isEligible: false,
        isFrozen: true,
        orderStatus: order.status,
        sellerOrderStatus: sellerOrder.status,
        reason: 'Escrow is currently frozen (ESCROW_FROZEN) due to active dispute',
      };
    }

    // 4. Idempotency Check: Already Settled
    const alreadyReleased = histories.some(
      (h) =>
        h.toStatus === 'ESCROW_RELEASED' &&
        (h.sellerOrderId === sellerOrderId || (!h.sellerOrderId && order.sellerOrders?.length === 1)),
    );

    const existingTx = await this.prisma.ledgerTransaction.findUnique({
      where: { idempotencyKey: `SETTLEMENT:${sellerOrderId}` },
    });

    if (alreadyReleased || existingTx) {
      return {
        sellerOrderId,
        isEligible: true,
        isAlreadySettled: true,
        orderStatus: order.status,
        sellerOrderStatus: sellerOrder.status,
        reason: 'Escrow has already been cleared and settled',
      };
    }

    // 5. Fulfillment Format & Holding Window Check (POL-14 ESC-001)
    const hasDigital = items.some((i) => i.format === CartItemFormat.DIGITAL);
    const hasPhysical = items.some((i) => i.format === CartItemFormat.PHYSICAL);
    const format: 'PHYSICAL' | 'DIGITAL' | 'BOTH' =
      hasDigital && hasPhysical ? 'BOTH' : hasDigital ? 'DIGITAL' : 'PHYSICAL';

    const now = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

    // Check early buyer confirmation in status history
    const isBuyerConfirmed = histories.some(
      (h) =>
        (h.toStatus === 'BUYER_CONFIRMED' ||
          h.toStatus === 'ORDER_CONFIRMED' ||
          (h.toStatus === 'COMPLETED' && h.actorType === 'USER')) &&
        (!h.sellerOrderId || h.sellerOrderId === sellerOrderId),
    );

    if (format === 'DIGITAL') {
      // POL-14 ESC-001: EBOOK funds are held up to 24h from payment success (or instant upon auto-release window)
      const paidTimestamp = order.createdAt ? new Date(order.createdAt).getTime() : now;
      const is24hPassed = now >= paidTimestamp + TWENTY_FOUR_HOURS_MS;

      // If within 24h and not explicitly confirmed/released
      if (!is24hPassed && !isBuyerConfirmed) {
        return {
          sellerOrderId,
          isEligible: false,
          format,
          orderStatus: order.status,
          sellerOrderStatus: sellerOrder.status,
          reason: 'Digital safety hold active: requires 24h post-payment window or buyer confirmation',
        };
      }

      return {
        sellerOrderId,
        isEligible: true,
        format,
        orderStatus: order.status,
        sellerOrderStatus: sellerOrder.status,
      };
    }

    if (format === 'PHYSICAL' || format === 'BOTH') {
      // Physical & Combo: Requires completed shipment / delivery on THIS specific sub-order
      const isDelivered =
        sellerOrder.status === SellerOrderStatus.COMPLETED ||
        sellerOrder.status === SellerOrderStatus.DELIVERED ||
        !!sellerOrder.completedAt;

      if (!isDelivered) {
        return {
          sellerOrderId,
          isEligible: false,
          format,
          orderStatus: order.status,
          sellerOrderStatus: sellerOrder.status,
          reason: 'Physical shipment has not completed delivery',
        };
      }

      // Find delivery timestamp from completedAt or status history
      const deliveryHistory = histories.find(
        (h) =>
          (h.toStatus === 'DELIVERED' || h.toStatus === 'COMPLETED') &&
          (!h.sellerOrderId || h.sellerOrderId === sellerOrderId),
      );
      const deliveredTimestamp = sellerOrder.completedAt
        ? new Date(sellerOrder.completedAt).getTime()
        : deliveryHistory
        ? new Date(deliveryHistory.createdAt).getTime()
        : sellerOrder.updatedAt
        ? new Date(sellerOrder.updatedAt).getTime()
        : now;

      const is7DaysPassed = now >= deliveredTimestamp + SEVEN_DAYS_MS;

      if (!is7DaysPassed && !isBuyerConfirmed) {
        return {
          sellerOrderId,
          isEligible: false,
          format,
          orderStatus: order.status,
          sellerOrderStatus: sellerOrder.status,
          reason: 'Physical protection window active: requires 7-day holding period (168h) or buyer confirmation',
        };
      }

      return {
        sellerOrderId,
        isEligible: true,
        format,
        orderStatus: order.status,
        sellerOrderStatus: sellerOrder.status,
      };
    }

    return {
      sellerOrderId,
      isEligible: true,
      format,
      orderStatus: order.status,
      sellerOrderStatus: sellerOrder.status,
    };
  }

  /**
   * Settle a single SellerOrder unit:
   * 1. Validates eligibility and dispute guards
   * 2. Idempotently ensures opening escrow position
   * 3. Calculates 85/15 split (or configured basis)
   * 4. Posts Double-Entry Ledger Transaction (Dr SELLER_PENDING, Dr PLATFORM_MARKETING_EXPENSE [if subsidy > 0], Cr SELLER_AVAILABLE, Cr PLATFORM_REVENUE)
   * 5. Moves Seller Wallet: Pending -> Available
   * 6. Records OrderStatusHistory & Outbox Event
   */
  async settleSellerOrder(
    sellerOrderId: string,
    actor?: BookActor,
  ): Promise<SettlementExecutionResult> {
    const sellerOrder = await this.prisma.sellerOrder.findUnique({
      where: { id: sellerOrderId },
      include: {
        order: {
          include: {
            sellerOrders: true,
            statusHistory: { orderBy: { createdAt: 'desc' } },
          },
        },
        items: true,
      },
    });

    if (!sellerOrder) {
      throw new NotFoundException(`Seller order ${sellerOrderId} not found`);
    }

    // Multi-tenant RBAC check if actor is provided
    if (actor) {
      const isAdmin = actor.role === 'ADMIN' || actor.role === 'PLATFORM_ADMIN';
      const isOwner = sellerOrder.ownerUserId === actor.sub || (actor as any).storeId === sellerOrder.storeId;
      if (!isAdmin && !isOwner) {
        throw new ForbiddenException('Access denied: You do not own this seller order settlement');
      }
    }

    // 1. Check Idempotency / Recovery First
    const idempotencyKey = `SETTLEMENT:${sellerOrderId}`;
    const existingLedgerTx = await this.prisma.ledgerTransaction.findUnique({
      where: { idempotencyKey },
      include: { entries: true },
    });

    const calculation = this.calculateSettlement(sellerOrder);

    if (existingLedgerTx) {
      // Check if wallet movement was completed; if not, recover it
      const existingWalletSettlement = await this.prisma.walletTransaction.findFirst({
        where: {
          referenceType: 'SETTLEMENT',
          referenceId: sellerOrderId,
        },
      });

      if (!existingWalletSettlement) {
        this.logger.warn(`Recovering missing wallet settlement for sellerOrder ${sellerOrderId}`);
        await this.walletService.getOrCreateWallet(sellerOrder.storeId, sellerOrder.ownerUserId);
        await this.walletService.movePendingToAvailable(
          sellerOrder.storeId,
          calculation.sellerNet,
          {
            referenceType: 'SETTLEMENT',
            referenceId: sellerOrderId,
            description: `Escrow released net proceeds for sub-order ${sellerOrder.code}`,
            metadata: {
              ledgerTransactionId: existingLedgerTx.id,
              platformCommission: calculation.platformCommission,
            },
          },
        );
      }

      this.logger.log(`Idempotent return for settlement: ${existingLedgerTx.transactionNumber}`);
      return {
        success: true,
        sellerOrderId,
        storeId: sellerOrder.storeId,
        ledgerTransactionId: existingLedgerTx.id,
        ledgerTransactionNumber: existingLedgerTx.transactionNumber,
        calculation,
        settledAt: existingLedgerTx.postedAt,
        isIdempotentReplay: true,
      };
    }

    // 2. Eligibility Guard Check
    const eligibility = await this.checkEligibility(sellerOrderId);
    if (!eligibility.isEligible && !eligibility.isAlreadySettled) {
      throw new UnprocessableEntityException(
        `Settlement ineligible for seller order ${sellerOrder.code}: ${eligibility.reason}`,
      );
    }

    // 3. Payment Ingestion Ledger Precondition (Ensure opening escrow position exists)
    await this.ensureOpeningEscrowIngested(sellerOrder);

    // 4. Post Double-Entry Ledger Transaction
    // Entries: Dr SELLER_PENDING, Dr PLATFORM_MARKETING_EXPENSE (if subsidy > 0), Cr SELLER_AVAILABLE, Cr PLATFORM_REVENUE
    const entries: Array<{
      accountType: LedgerAccountType;
      direction: LedgerEntryDirection;
      amount: number;
      storeId?: string;
      description?: string;
    }> = [
      {
        accountType: LedgerAccountType.SELLER_PENDING,
        direction: LedgerEntryDirection.DEBIT,
        amount: calculation.grandTotal,
        storeId: sellerOrder.storeId || undefined,
        description: `Clear pending seller proceeds for sub-order ${sellerOrder.code}`,
      },
      {
        accountType: LedgerAccountType.SELLER_AVAILABLE,
        direction: LedgerEntryDirection.CREDIT,
        amount: calculation.sellerNet,
        storeId: sellerOrder.storeId || undefined,
        description: `Credit cleared net revenue to seller available account`,
      },
      {
        accountType: LedgerAccountType.PLATFORM_REVENUE,
        direction: LedgerEntryDirection.CREDIT,
        amount: calculation.platformCommission,
        description: `Platform commission earned (${calculation.commissionPercent}% on ${calculation.commissionBasis})`,
      },
    ];

    // If platform subsidized discount (POL-14 FEE-001 / DEC-004), debit PLATFORM_MARKETING_EXPENSE
    if (calculation.platformSubsidy > 0) {
      entries.push({
        accountType: LedgerAccountType.PLATFORM_MARKETING_EXPENSE,
        direction: LedgerEntryDirection.DEBIT,
        amount: calculation.platformSubsidy,
        description: `Platform marketing voucher subsidy funding for sub-order ${sellerOrder.code}`,
      });
    }

    const ledgerTx = await this.ledgerService.postTransaction({
      idempotencyKey,
      description: `Escrow settlement clearance for sub-order ${sellerOrder.code} (${calculation.commissionPercent}% platform commission)`,
      referenceType: 'ESCROW_SETTLEMENT',
      referenceId: sellerOrderId,
      storeId: sellerOrder.storeId,
      currency: 'VND',
      entries,
      metadata: {
        sellerOrderId,
        orderId: sellerOrder.orderId,
        storeId: sellerOrder.storeId,
        commissionBasis: calculation.commissionBasis,
        commissionBasisAmount: calculation.commissionBasisAmount,
        commissionPercent: calculation.commissionPercent,
        platformCommission: calculation.platformCommission,
        platformSubsidy: calculation.platformSubsidy,
        sellerNet: calculation.sellerNet,
      },
    });

    // 5. Atomic Seller Wallet Movement: Pending -> Available (Task 70)
    await this.walletService.getOrCreateWallet(sellerOrder.storeId, sellerOrder.ownerUserId);
    await this.walletService.movePendingToAvailable(
      sellerOrder.storeId,
      calculation.sellerNet,
      {
        referenceType: 'SETTLEMENT',
        referenceId: sellerOrderId,
        description: `Escrow released net proceeds for sub-order ${sellerOrder.code}`,
        metadata: {
          ledgerTransactionId: ledgerTx.id,
          platformCommission: calculation.platformCommission,
        },
      },
    );

    // 6. Record Status History & Outbox Event
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.orderStatusHistory.create({
        data: {
          orderId: sellerOrder.orderId,
          sellerOrderId: sellerOrder.id,
          fromStatus: sellerOrder.status,
          toStatus: 'ESCROW_RELEASED',
          title: 'Escrow settled and released',
          description: `Settlement completed: ${calculation.sellerNet} VND credited to wallet, ${calculation.platformCommission} VND platform fee deducted`,
          actorType: 'SYSTEM',
          metadata: {
            settlementId: ledgerTx.id,
            ledgerTransactionNumber: ledgerTx.transactionNumber,
            sellerOrderId: sellerOrder.id,
            storeId: sellerOrder.storeId,
            grandTotal: calculation.grandTotal,
            platformCommission: calculation.platformCommission,
            sellerNet: calculation.sellerNet,
          },
        },
      });

      await tx.outboxEvent.create({
        data: {
          eventId: `SETTLE-${sellerOrderId}-${now.getTime()}`,
          type: 'SETTLEMENT_COMPLETED',
          aggregateId: sellerOrderId,
          payload: {
            sellerOrderId,
            orderId: sellerOrder.orderId,
            storeId: sellerOrder.storeId,
            ownerUserId: sellerOrder.ownerUserId,
            ledgerTransactionId: ledgerTx.id,
            ledgerTransactionNumber: ledgerTx.transactionNumber,
            grandTotal: calculation.grandTotal.toString(),
            platformCommission: calculation.platformCommission.toString(),
            platformSubsidy: calculation.platformSubsidy.toString(),
            sellerNet: calculation.sellerNet.toString(),
            commissionBasis: calculation.commissionBasis,
            commissionPercent: calculation.commissionPercent.toString(),
            settledAt: now.toISOString(),
          } as Prisma.InputJsonValue,
        },
      });
    });

    this.logger.log(
      `Successfully settled sellerOrder ${sellerOrder.code}: Net=${calculation.sellerNet} VND, Fee=${calculation.platformCommission} VND`,
    );

    return {
      success: true,
      sellerOrderId,
      storeId: sellerOrder.storeId,
      ledgerTransactionId: ledgerTx.id,
      ledgerTransactionNumber: ledgerTx.transactionNumber,
      calculation,
      settledAt: now,
    };
  }

  /**
   * Ingest opening escrow position upon buyer payment:
   * Dr ESCROW_HOLDING, Cr SELLER_PENDING, and Wallet.creditPending
   */
  async ingestPaymentEscrow(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { sellerOrders: true },
    });

    if (!order) return;

    for (const so of order.sellerOrders) {
      await this.ensureOpeningEscrowIngested(so);
    }
  }

  /**
   * Helper: Ensure opening ledger and wallet records exist for a SellerOrder
   */
  async ensureOpeningEscrowIngested(sellerOrder: SellerOrder): Promise<void> {
    const ingestIdempotencyKey = `ESCROW_INGEST:${sellerOrder.id}`;
    const existingTx = await this.prisma.ledgerTransaction.findUnique({
      where: { idempotencyKey: ingestIdempotencyKey },
    });

    if (existingTx) {
      return;
    }

    const calculation = this.calculateSettlement(sellerOrder);

    // 1. Post opening double-entry transaction: Dr ESCROW_HOLDING, Cr SELLER_PENDING
    await this.ledgerService.postTransaction({
      idempotencyKey: ingestIdempotencyKey,
      description: `Customer payment held in escrow for sub-order ${sellerOrder.code}`,
      referenceType: 'PAYMENT_INGESTION',
      referenceId: sellerOrder.id,
      storeId: sellerOrder.storeId,
      currency: 'VND',
      entries: [
        {
          accountType: LedgerAccountType.ESCROW_HOLDING,
          direction: LedgerEntryDirection.DEBIT,
          amount: calculation.grandTotal,
          storeId: sellerOrder.storeId,
          description: `Payment funds deposited into escrow holding pool`,
        },
        {
          accountType: LedgerAccountType.SELLER_PENDING,
          direction: LedgerEntryDirection.CREDIT,
          amount: calculation.grandTotal,
          storeId: sellerOrder.storeId,
          description: `Unreleased pending seller proceeds held in escrow`,
        },
      ],
      metadata: {
        sellerOrderId: sellerOrder.id,
        orderId: sellerOrder.orderId,
        storeId: sellerOrder.storeId,
        grandTotal: calculation.grandTotal,
        sellerNet: calculation.sellerNet,
      },
    });

    // 2. Ensure seller wallet pending balance is credited
    await this.walletService.getOrCreateWallet(
      sellerOrder.storeId,
      sellerOrder.ownerUserId,
    );

    const existingWalletTx = await this.prisma.walletTransaction.findFirst({
      where: {
        referenceType: 'ORDER_PAYMENT',
        referenceId: sellerOrder.id,
      },
    });

    if (!existingWalletTx) {
      await this.walletService.creditPending(sellerOrder.storeId, calculation.sellerNet, {
        referenceType: 'ORDER_PAYMENT',
        referenceId: sellerOrder.id,
        description: `Pending revenue credited from sub-order ${sellerOrder.code}`,
      });
    }
  }

  /**
   * Batch clearance processor: scans and clears all eligible pending seller orders
   */
  async settleEligibleOrders(): Promise<{
    processedCount: number;
    settledCount: number;
    errors: Array<{ sellerOrderId: string; error: string }>;
  }> {
    const candidateOrders = await this.prisma.sellerOrder.findMany({
      where: {
        status: { in: [SellerOrderStatus.COMPLETED, SellerOrderStatus.CONFIRMED, SellerOrderStatus.DELIVERED, SellerOrderStatus.SHIPPED] },
        order: {
          paymentStatus: PaymentStatus.SUCCEEDED,
        },
      },
      include: {
        order: {
          include: { statusHistory: true },
        },
        items: true,
      },
      take: 100,
    });

    let processedCount = 0;
    let settledCount = 0;
    const errors: Array<{ sellerOrderId: string; error: string }> = [];

    for (const so of candidateOrders) {
      processedCount++;
      try {
        const eligibility = await this.checkEligibility(so.id);
        if (eligibility.isEligible && !eligibility.isAlreadySettled) {
          await this.settleSellerOrder(so.id);
          settledCount++;
        }
      } catch (err: any) {
        errors.push({
          sellerOrderId: so.id,
          error: err?.message || String(err),
        });
        this.logger.warn(`Failed to auto-settle sellerOrder ${so.id}: ${err?.message}`);
      }
    }

    return {
      processedCount,
      settledCount,
      errors,
    };
  }
}
