import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { LedgerService } from '../../ledger/ledger.service';
import {
  AffiliateWalletTxType,
  LedgerAccountType,
  LedgerEntryDirection,
} from '../../../../prisma/generated/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface AffiliateWalletBalanceDto {
  walletId: string;
  profileId: string;
  userId: string;
  availableBalance: number;
  netAvailableBalance: number;
  debtBalance: number;
  holdingBalance: number;
  pendingBalance: number;
  frozenBalance: number;
  lifetimeEarned: number;
  lifetimePaid: number;
  currency: string;
  updatedAt: Date;
}

export interface RequestAdjustmentDto {
  profileId: string;
  amount: number;
  direction: 'CREDIT' | 'DEBIT';
  reason: string;
  requestedBy: string;
}

@Injectable()
export class AffiliateWalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
  ) {}

  /**
   * Get or create wallet for a user / affiliate profile
   */
  async getWalletByUserId(userId: string): Promise<AffiliateWalletBalanceDto> {
    const profile = await this.prisma.affiliateProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException(`Affiliate profile not found for user ${userId}`);
    }

    let wallet = await this.prisma.affiliateWallet.findUnique({
      where: { affiliateProfileId: profile.id },
    });

    if (!wallet) {
      wallet = await this.prisma.affiliateWallet.create({
        data: {
          affiliateProfileId: profile.id,
          userId,
          availableBalance: new Decimal(0),
          pendingBalance: new Decimal(0),
          holdingBalance: new Decimal(0),
          frozenBalance: new Decimal(0),
          lifetimeEarned: new Decimal(0),
          lifetimePaid: new Decimal(0),
          currency: 'VND',
        },
      });
    }

    const availableNum = Number(wallet.availableBalance);

    return {
      walletId: wallet.id,
      profileId: profile.id,
      userId: wallet.userId,
      availableBalance: availableNum,
      netAvailableBalance: Math.max(0, availableNum),
      debtBalance: availableNum < 0 ? Math.abs(availableNum) : 0,
      holdingBalance: Number(wallet.holdingBalance),
      pendingBalance: Number(wallet.pendingBalance),
      frozenBalance: Number(wallet.frozenBalance),
      lifetimeEarned: Number(wallet.lifetimeEarned),
      lifetimePaid: Number(wallet.lifetimePaid),
      currency: wallet.currency,
      updatedAt: wallet.updatedAt,
    };
  }

  /**
   * Get wallet by profile ID
   */
  async getWalletByProfileId(profileId: string): Promise<AffiliateWalletBalanceDto> {
    const profile = await this.prisma.affiliateProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile) {
      throw new NotFoundException(`Affiliate profile ${profileId} not found`);
    }

    return this.getWalletByUserId(profile.userId);
  }

  /**
   * Get wallet transactions with pagination and filters
   */
  async getTransactions(
    userId: string,
    query: {
      page?: number;
      limit?: number;
      type?: AffiliateWalletTxType;
      fromDate?: string;
      toDate?: string;
    } = {},
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const wallet = await this.prisma.affiliateWallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      return {
        items: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    const where: any = {
      walletId: wallet.id,
    };

    if (query.type) {
      where.type = query.type;
    }

    if (query.fromDate || query.toDate) {
      where.createdAt = {};
      if (query.fromDate) where.createdAt.gte = new Date(query.fromDate);
      if (query.toDate) where.createdAt.lte = new Date(query.toDate);
    }

    const [items, total] = await Promise.all([
      this.prisma.affiliateWalletTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.affiliateWalletTransaction.count({ where }),
    ]);

    return {
      items: items.map((tx) => ({
        id: tx.id,
        walletId: tx.walletId,
        type: tx.type,
        amount: Number(tx.amount),
        balanceBefore: Number(tx.balanceBefore),
        balanceAfter: Number(tx.balanceAfter),
        currency: tx.currency,
        referenceType: tx.referenceType,
        referenceId: tx.referenceId,
        description: tx.description,
        createdAt: tx.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Maker Step: Request a manual balance adjustment
   * Requires Maker-Checker approval before executing
   */
  async requestManualAdjustment(dto: RequestAdjustmentDto) {
    if (!dto.amount || dto.amount <= 0) {
      throw new BadRequestException('Adjustment amount must be strictly greater than 0');
    }

    if (!dto.reason || dto.reason.trim().length < 10) {
      throw new BadRequestException('Adjustment reason must be at least 10 characters long');
    }

    const profile = await this.prisma.affiliateProfile.findUnique({
      where: { id: dto.profileId },
    });

    if (!profile) {
      throw new NotFoundException(`Affiliate profile ${dto.profileId} not found`);
    }

    const wallet = await this.prisma.affiliateWallet.findUnique({
      where: { affiliateProfileId: profile.id },
    });

    if (!wallet) {
      throw new NotFoundException(`Wallet not found for profile ${dto.profileId}`);
    }

    // Create Audit Log record representing the pending adjustment
    const auditRecord = await this.prisma.affiliateAuditLog.create({
      data: {
        actorId: dto.requestedBy,
        actorRole: 'ADMIN',
        action: 'WALLET_ADJUSTMENT_REQUESTED',
        resource: 'AFFILIATE_WALLET',
        resourceId: wallet.id,
        beforeState: {
          availableBalance: Number(wallet.availableBalance),
          holdingBalance: Number(wallet.holdingBalance),
        },
        reason: dto.reason,
        metadata: {
          status: 'PENDING_APPROVAL',
          profileId: dto.profileId,
          amount: dto.amount,
          direction: dto.direction,
          requestedBy: dto.requestedBy,
          requestedAt: new Date().toISOString(),
        },
      },
    });

    return {
      adjustmentId: auditRecord.id,
      walletId: wallet.id,
      profileId: dto.profileId,
      amount: dto.amount,
      direction: dto.direction,
      status: 'PENDING_APPROVAL',
      requestedBy: dto.requestedBy,
      createdAt: auditRecord.createdAt,
    };
  }

  /**
   * Checker Step: Approve and execute manual balance adjustment
   * Strictly enforces Maker-Checker: approver !== requester
   */
  async approveManualAdjustment(adjustmentId: string, approvedBy: string) {
    const auditRecord = await this.prisma.affiliateAuditLog.findUnique({
      where: { id: adjustmentId },
    });

    if (!auditRecord || auditRecord.action !== 'WALLET_ADJUSTMENT_REQUESTED') {
      throw new NotFoundException(`Adjustment request ${adjustmentId} not found`);
    }

    const meta = (auditRecord.metadata as any) || {};

    if (meta.status !== 'PENDING_APPROVAL') {
      throw new ConflictException(`Adjustment is already ${meta.status}`);
    }

    // Maker-Checker enforcement: requester cannot approve their own request
    if (meta.requestedBy === approvedBy) {
      throw new ForbiddenException(
        'Maker-Checker Violation: Approver must be a different administrator than the requester.',
      );
    }

    const wallet = await this.prisma.affiliateWallet.findUnique({
      where: { id: auditRecord.resourceId! },
    });

    if (!wallet) {
      throw new NotFoundException(`Affiliate wallet ${auditRecord.resourceId} not found`);
    }

    const amountDec = new Decimal(meta.amount);
    const amountNum = Number(amountDec);
    const isCredit = meta.direction === 'CREDIT';

    return this.prisma.$transaction(async (tx) => {
      const balanceBefore = wallet.availableBalance;
      const balanceAfter = isCredit
        ? balanceBefore.add(amountDec)
        : balanceBefore.sub(amountDec);

      // 1. Post balancing Ledger transaction
      const ledgerTx = await this.ledgerService.postTransactionWithTx(tx, {
        idempotencyKey: `AFF-ADJUST-${adjustmentId}`,
        description: `Manual balance adjustment (${meta.direction}): ${auditRecord.reason}`,
        referenceType: 'MANUAL_ADJUSTMENT',
        referenceId: adjustmentId,
        currency: wallet.currency,
        entries: isCredit
          ? [
              {
                accountType: LedgerAccountType.PLATFORM_MARKETING_EXPENSE,
                direction: LedgerEntryDirection.DEBIT,
                amount: amountNum,
                description: `Platform adjustment expense for affiliate ${meta.profileId}`,
              },
              {
                accountType: LedgerAccountType.AFFILIATE_PAYABLE_AVAILABLE,
                direction: LedgerEntryDirection.CREDIT,
                amount: amountNum,
                description: `Manual adjustment credit to affiliate wallet`,
              },
            ]
          : [
              {
                accountType: LedgerAccountType.AFFILIATE_PAYABLE_AVAILABLE,
                direction: LedgerEntryDirection.DEBIT,
                amount: amountNum,
                description: `Manual adjustment deduction from affiliate wallet`,
              },
              {
                accountType: LedgerAccountType.PLATFORM_MARKETING_EXPENSE,
                direction: LedgerEntryDirection.CREDIT,
                amount: amountNum,
                description: `Platform adjustment deduction recovery`,
              },
            ],
      });

      // 2. Update wallet
      await tx.affiliateWallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: balanceAfter,
          version: { increment: 1 },
        },
      });

      // 3. Create wallet transaction
      const txType = isCredit
        ? AffiliateWalletTxType.MANUAL_ADJUSTMENT_CREDIT
        : AffiliateWalletTxType.MANUAL_ADJUSTMENT_DEBIT;

      await tx.affiliateWalletTransaction.create({
        data: {
          walletId: wallet.id,
          type: txType,
          amount: amountDec,
          balanceBefore,
          balanceAfter,
          currency: wallet.currency,
          referenceType: 'MANUAL_ADJUSTMENT',
          referenceId: adjustmentId,
          idempotencyKey: `AFF-TX-ADJUST-${adjustmentId}`,
          description: `Admin manual adjustment: ${auditRecord.reason}`,
        },
      });

      // 4. Update audit log to APPROVED
      await tx.affiliateAuditLog.update({
        where: { id: adjustmentId },
        data: {
          afterState: {
            availableBalance: Number(balanceAfter),
          },
          metadata: {
            ...meta,
            status: 'APPROVED',
            approvedBy,
            approvedAt: new Date().toISOString(),
            ledgerTxId: ledgerTx.id,
          },
        },
      });

      return {
        adjustmentId,
        status: 'APPROVED',
        approvedBy,
        walletId: wallet.id,
        direction: meta.direction,
        amount: amountNum,
        balanceBefore: Number(balanceBefore),
        balanceAfter: Number(balanceAfter),
        ledgerTxId: ledgerTx.id,
      };
    });
  }

  /**
   * Checker Step: Reject manual balance adjustment
   */
  async rejectManualAdjustment(adjustmentId: string, rejectedBy: string, rejectionReason: string) {
    const auditRecord = await this.prisma.affiliateAuditLog.findUnique({
      where: { id: adjustmentId },
    });

    if (!auditRecord || auditRecord.action !== 'WALLET_ADJUSTMENT_REQUESTED') {
      throw new NotFoundException(`Adjustment request ${adjustmentId} not found`);
    }

    const meta = (auditRecord.metadata as any) || {};

    if (meta.status !== 'PENDING_APPROVAL') {
      throw new ConflictException(`Adjustment is already ${meta.status}`);
    }

    await this.prisma.affiliateAuditLog.update({
      where: { id: adjustmentId },
      data: {
        metadata: {
          ...meta,
          status: 'REJECTED',
          rejectedBy,
          rejectedAt: new Date().toISOString(),
          rejectionReason,
        },
      },
    });

    return {
      adjustmentId,
      status: 'REJECTED',
      rejectedBy,
      rejectionReason,
    };
  }
}
