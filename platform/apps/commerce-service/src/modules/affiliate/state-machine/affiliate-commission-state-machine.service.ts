import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { LedgerService } from '../../ledger/ledger.service';
import { Decimal } from '@prisma/client/runtime/library';
import {
  AffiliateCommissionStatus,
  LedgerAccountType,
  LedgerEntryDirection,
  AffiliateWalletTxType,
} from '../../../../prisma/generated/client';

export interface SettleCommissionResult {
  commissionId: string;
  previousStatus: AffiliateCommissionStatus;
  newStatus: AffiliateCommissionStatus;
  settledAt: Date;
  ledgerTransactionId: string;
  amount: number;
}

export interface ReverseCommissionResult {
  commissionId: string;
  previousStatus: AffiliateCommissionStatus;
  newStatus: AffiliateCommissionStatus;
  reversedAt: Date;
  reversalLedgerTransactionId: string;
  amount: number;
}

@Injectable()
export class AffiliateCommissionStateMachineService {
  private readonly logger = new Logger(AffiliateCommissionStateMachineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
  ) {}

  /**
   * Transition: PENDING -> HOLDING
   * Starts holding countdown based on order delivery (physical) or payment (digital).
   */
  async transitionToHolding(commissionId: string, holdingDurationHours: number, holdingStartedAt?: Date): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      const commission = await tx.affiliateCommission.findUnique({
        where: { id: commissionId },
      });

      if (!commission) {
        throw new NotFoundException(`AffiliateCommission ${commissionId} not found`);
      }

      // Idempotency: if already in HOLDING or beyond, return early
      if (commission.status === AffiliateCommissionStatus.HOLDING) {
        return commission;
      }

      if (commission.status !== AffiliateCommissionStatus.PENDING) {
        throw new ConflictException(
          `Cannot transition to HOLDING from status '${commission.status}'. Allowed from PENDING only.`,
        );
      }

      const startedAt = holdingStartedAt || new Date();
      const holdingUntil = new Date(startedAt.getTime() + holdingDurationHours * 3600 * 1000);

      const updatedCommission = await tx.affiliateCommission.update({
        where: { id: commissionId },
        data: {
          status: AffiliateCommissionStatus.HOLDING,
          holdingStartedAt: startedAt,
          holdingUntil,
          version: { increment: 1 },
        },
      });

      // Update AffiliateWallet: add to holding balance
      const wallet = await this.ensureWalletExists(tx, commission.profileId);
      const amountDec = new Decimal(commission.commissionAmount.toString());

      const balanceBefore = wallet.holdingBalance;
      const balanceAfter = wallet.holdingBalance.add(amountDec);

      await tx.affiliateWallet.update({
        where: { id: wallet.id },
        data: {
          holdingBalance: balanceAfter,
          version: { increment: 1 },
        },
      });

      await tx.affiliateWalletTransaction.create({
        data: {
          walletId: wallet.id,
          type: AffiliateWalletTxType.MOVE_PENDING_TO_HOLDING,
          amount: amountDec,
          balanceBefore,
          balanceAfter,
          currency: commission.currency,
          referenceType: 'COMMISSION_HOLDING',
          referenceId: commission.id,
          idempotencyKey: `AFF-HOLD-${commission.id}`,
          description: `Commission holding initiated for order item ${commission.orderItemId}`,
        },
      });

      return updatedCommission;
    });
  }

  /**
   * Transition: HOLDING -> AVAILABLE
   * Settles commission upon holding completion and absence of disputes.
   * Posts balanced double-entry Ledger transaction:
   *   DEBIT:  SELLER_COMMISSION_EXPENSE (storeId)
   *   CREDIT: AFFILIATE_PAYABLE_AVAILABLE
   */
  async settleCommission(commissionId: string, now: Date = new Date()): Promise<SettleCommissionResult> {
    return this.prisma.$transaction(async (tx) => {
      const commission = await tx.affiliateCommission.findUnique({
        where: { id: commissionId },
      });

      if (!commission) {
        throw new NotFoundException(`AffiliateCommission ${commissionId} not found`);
      }

      // Idempotency check: if already AVAILABLE, return current settlement
      if (commission.status === AffiliateCommissionStatus.AVAILABLE) {
        return {
          commissionId: commission.id,
          previousStatus: AffiliateCommissionStatus.AVAILABLE,
          newStatus: AffiliateCommissionStatus.AVAILABLE,
          settledAt: commission.settledAt || commission.updatedAt,
          ledgerTransactionId: commission.ledgerTxId || 'EXISTING',
          amount: new Decimal(commission.commissionAmount.toString()).toNumber(),
        };
      }

      if (commission.status !== AffiliateCommissionStatus.HOLDING) {
        throw new ConflictException(
          `Cannot settle commission with status '${commission.status}'. Status must be HOLDING.`,
        );
      }

      if (commission.disputeBlocked) {
        throw new ConflictException(
          `Settlement blocked: commission ${commissionId} is currently blocked by an active dispute.`,
        );
      }

      if (commission.holdingUntil && now < commission.holdingUntil) {
        throw new ConflictException(
          `Settlement blocked: holding period has not elapsed yet. holdingUntil: ${commission.holdingUntil.toISOString()}, now: ${now.toISOString()}`,
        );
      }

      const amountDec = new Decimal(commission.commissionAmount.toString());
      const amountNum = amountDec.toNumber();

      // 1. Post Double-Entry Ledger Transaction
      const ledgerTx = await this.ledgerService.postTransactionWithTx(tx, {
        idempotencyKey: `AFF-SETTLE-${commission.id}`,
        description: `Affiliate commission settlement for item ${commission.orderItemId} (Book: ${commission.bookTitle})`,
        referenceType: 'COMMISSION_SETTLEMENT',
        referenceId: commission.id,
        storeId: commission.storeId,
        currency: commission.currency,
        entries: [
          {
            accountType: LedgerAccountType.SELLER_COMMISSION_EXPENSE,
            direction: LedgerEntryDirection.DEBIT,
            amount: amountNum,
            storeId: commission.storeId,
            description: `Seller commission expense for order ${commission.orderId}`,
          },
          {
            accountType: LedgerAccountType.AFFILIATE_PAYABLE_AVAILABLE,
            direction: LedgerEntryDirection.CREDIT,
            amount: amountNum,
            description: `Available affiliate payable for profile ${commission.profileId}`,
          },
        ],
      });

      // 2. Update AffiliateCommission record
      await tx.affiliateCommission.update({
        where: { id: commissionId },
        data: {
          status: AffiliateCommissionStatus.AVAILABLE,
          settledAt: now,
          ledgerTxId: ledgerTx.id,
          version: { increment: 1 },
        },
      });

      // 3. Update AffiliateWallet: move from holding to available, increment lifetimeEarned
      const wallet = await this.ensureWalletExists(tx, commission.profileId);
      const holdingBefore = wallet.holdingBalance;
      const holdingAfter = Decimal.max(0, holdingBefore.sub(amountDec));

      const availableBefore = wallet.availableBalance;
      const availableAfter = availableBefore.add(amountDec);
      const lifetimeEarnedAfter = wallet.lifetimeEarned.add(amountDec);

      await tx.affiliateWallet.update({
        where: { id: wallet.id },
        data: {
          holdingBalance: holdingAfter,
          availableBalance: availableAfter,
          lifetimeEarned: lifetimeEarnedAfter,
          version: { increment: 1 },
        },
      });

      // 4. Create Wallet Transaction Record
      await tx.affiliateWalletTransaction.create({
        data: {
          walletId: wallet.id,
          type: AffiliateWalletTxType.MOVE_HOLDING_TO_AVAILABLE,
          amount: amountDec,
          balanceBefore: availableBefore,
          balanceAfter: availableAfter,
          currency: commission.currency,
          referenceType: 'COMMISSION_SETTLED',
          referenceId: commission.id,
          idempotencyKey: `AFF-TX-SETTLE-${commission.id}`,
          description: `Commission settled and moved to available balance for order ${commission.orderId}`,
        },
      });

      return {
        commissionId: commission.id,
        previousStatus: AffiliateCommissionStatus.HOLDING,
        newStatus: AffiliateCommissionStatus.AVAILABLE,
        settledAt: now,
        ledgerTransactionId: ledgerTx.id,
        amount: amountNum,
      };
    });
  }

  /**
   * Transition: PENDING/HOLDING -> CANCELLED
   * Used when an order is cancelled or refunded before settlement.
   */
  async cancelCommission(commissionId: string, reason: string): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      const commission = await tx.affiliateCommission.findUnique({
        where: { id: commissionId },
      });

      if (!commission) {
        throw new NotFoundException(`AffiliateCommission ${commissionId} not found`);
      }

      if (commission.status === AffiliateCommissionStatus.CANCELLED) {
        return commission; // Idempotent
      }

      if (
        commission.status !== AffiliateCommissionStatus.PENDING &&
        commission.status !== AffiliateCommissionStatus.HOLDING
      ) {
        throw new ConflictException(
          `Cannot cancel commission with status '${commission.status}'. Only PENDING or HOLDING can be CANCELLED.`,
        );
      }

      const now = new Date();
      const updated = await tx.affiliateCommission.update({
        where: { id: commissionId },
        data: {
          status: AffiliateCommissionStatus.CANCELLED,
          cancelledAt: now,
          cancelReason: reason,
          version: { increment: 1 },
        },
      });

      // If it was in HOLDING, relieve holding balance from wallet
      if (commission.status === AffiliateCommissionStatus.HOLDING) {
        const wallet = await this.ensureWalletExists(tx, commission.profileId);
        const amountDec = new Decimal(commission.commissionAmount.toString());

        const holdingBefore = wallet.holdingBalance;
        const holdingAfter = Decimal.max(0, holdingBefore.sub(amountDec));

        await tx.affiliateWallet.update({
          where: { id: wallet.id },
          data: {
            holdingBalance: holdingAfter,
            version: { increment: 1 },
          },
        });

        await tx.affiliateWalletTransaction.create({
          data: {
            walletId: wallet.id,
            type: AffiliateWalletTxType.CANCEL_HOLDING,
            amount: amountDec,
            balanceBefore: holdingBefore,
            balanceAfter: holdingAfter,
            currency: commission.currency,
            referenceType: 'COMMISSION_CANCEL',
            referenceId: commission.id,
            idempotencyKey: `AFF-CANCEL-${commission.id}`,
            description: `Commission holding cancelled: ${reason}`,
          },
        });
      }

      return updated;
    });
  }

  /**
   * Transition: AVAILABLE -> REVERSED
   * Used for post-settlement return/refund or fraud reversal.
   * Posts balancing double-entry reversal ledger transaction:
   *   DEBIT:  AFFILIATE_PAYABLE_AVAILABLE
   *   CREDIT: SELLER_COMMISSION_EXPENSE (storeId)
   */
  async reverseCommission(commissionId: string, reason: string): Promise<ReverseCommissionResult> {
    return this.prisma.$transaction(async (tx) => {
      const commission = await tx.affiliateCommission.findUnique({
        where: { id: commissionId },
      });

      if (!commission) {
        throw new NotFoundException(`AffiliateCommission ${commissionId} not found`);
      }

      if (commission.status === AffiliateCommissionStatus.REVERSED) {
        return {
          commissionId: commission.id,
          previousStatus: AffiliateCommissionStatus.REVERSED,
          newStatus: AffiliateCommissionStatus.REVERSED,
          reversedAt: commission.reversedAt || commission.updatedAt,
          reversalLedgerTransactionId: commission.reversalLedgerTxId || 'EXISTING',
          amount: new Decimal(commission.commissionAmount.toString()).toNumber(),
        };
      }

      if (commission.status !== AffiliateCommissionStatus.AVAILABLE) {
        throw new ConflictException(
          `Cannot reverse commission with status '${commission.status}'. Status must be AVAILABLE.`,
        );
      }

      const now = new Date();
      const amountDec = new Decimal(commission.commissionAmount.toString());
      const amountNum = amountDec.toNumber();

      // 1. Post Balancing Reversal Ledger Transaction
      const reversalLedgerTx = await this.ledgerService.postTransactionWithTx(tx, {
        idempotencyKey: `AFF-REV-${commission.id}`,
        description: `Affiliate commission reversal for item ${commission.orderItemId}: ${reason}`,
        referenceType: 'COMMISSION_REVERSAL',
        referenceId: commission.id,
        storeId: commission.storeId,
        currency: commission.currency,
        entries: [
          {
            accountType: LedgerAccountType.AFFILIATE_PAYABLE_AVAILABLE,
            direction: LedgerEntryDirection.DEBIT,
            amount: amountNum,
            description: `Reversal debit to affiliate payable for profile ${commission.profileId}`,
          },
          {
            accountType: LedgerAccountType.SELLER_COMMISSION_EXPENSE,
            direction: LedgerEntryDirection.CREDIT,
            amount: amountNum,
            storeId: commission.storeId,
            description: `Reversal credit to seller commission expense for store ${commission.storeId}`,
          },
        ],
      });

      // 2. Update AffiliateCommission record
      await tx.affiliateCommission.update({
        where: { id: commissionId },
        data: {
          status: AffiliateCommissionStatus.REVERSED,
          reversedAt: now,
          reversalReason: reason,
          reversalLedgerTxId: reversalLedgerTx.id,
          version: { increment: 1 },
        },
      });

      // 3. Deduct from AffiliateWallet availableBalance
      const wallet = await this.ensureWalletExists(tx, commission.profileId);
      const availableBefore = wallet.availableBalance;
      const availableAfter = availableBefore.sub(amountDec); // Can go negative if already paid out

      await tx.affiliateWallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: availableAfter,
          version: { increment: 1 },
        },
      });

      await tx.affiliateWalletTransaction.create({
        data: {
          walletId: wallet.id,
          type: AffiliateWalletTxType.REVERSE_AVAILABLE,
          amount: amountDec,
          balanceBefore: availableBefore,
          balanceAfter: availableAfter,
          currency: commission.currency,
          referenceType: 'COMMISSION_REVERSAL',
          referenceId: commission.id,
          idempotencyKey: `AFF-TX-REV-${commission.id}`,
          description: `Commission reversed: ${reason}`,
        },
      });

      return {
        commissionId: commission.id,
        previousStatus: AffiliateCommissionStatus.AVAILABLE,
        newStatus: AffiliateCommissionStatus.REVERSED,
        reversedAt: now,
        reversalLedgerTransactionId: reversalLedgerTx.id,
        amount: amountNum,
      };
    });
  }

  /**
   * Block settlement due to buyer dispute
   */
  async blockDispute(commissionId: string): Promise<any> {
    return this.prisma.affiliateCommission.update({
      where: { id: commissionId },
      data: {
        disputeBlocked: true,
        version: { increment: 1 },
      },
    });
  }

  /**
   * Unblock settlement after dispute resolution in favor of seller
   */
  async unblockDispute(commissionId: string): Promise<any> {
    return this.prisma.affiliateCommission.update({
      where: { id: commissionId },
      data: {
        disputeBlocked: false,
        version: { increment: 1 },
      },
    });
  }

  private async ensureWalletExists(tx: any, profileId: string): Promise<any> {
    let wallet = await tx.affiliateWallet.findUnique({
      where: { affiliateProfileId: profileId },
    });

    if (!wallet) {
      const profile = await tx.affiliateProfile.findUnique({
        where: { id: profileId },
      });

      if (!profile) {
        throw new NotFoundException(`AffiliateProfile ${profileId} not found`);
      }

      wallet = await tx.affiliateWallet.create({
        data: {
          affiliateProfileId: profileId,
          userId: profile.userId,
          availableBalance: new Decimal(0),
          pendingBalance: new Decimal(0),
          holdingBalance: new Decimal(0),
          frozenBalance: new Decimal(0),
          lifetimeEarned: new Decimal(0),
          lifetimePaid: new Decimal(0),
        },
      });
    }

    return wallet;
  }
}
