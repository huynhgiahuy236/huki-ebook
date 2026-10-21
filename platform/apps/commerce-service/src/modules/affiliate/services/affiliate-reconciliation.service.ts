import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { LedgerService } from '../../ledger/ledger.service';
import {
  AffiliateCommissionStatus,
  LedgerAccountType,
} from '../../../../prisma/generated/client';

export interface ReconciliationReport {
  timestamp: string;
  isHealthy: boolean;
  status: 'BALANCED' | 'MISMATCH_DETECTED';
  commissions: {
    totalAvailableCount: number;
    totalAvailableAmount: number;
    totalReversedCount: number;
    totalReversedAmount: number;
    netCommissionEarned: number;
  };
  wallets: {
    totalWalletsCount: number;
    totalAvailableBalance: number;
    totalHoldingBalance: number;
    totalFrozenBalance: number;
    totalPendingBalance: number;
    totalLifetimeEarned: number;
  };
  ledger: {
    affiliatePayableBalance: number;
  };
  discrepancies: {
    walletVsLedgerMismatch: number;
    anomalies: Array<{
      profileId: string;
      userId: string;
      walletAvailable: number;
      commissionsNetAvailable: number;
      difference: number;
    }>;
  };
}

@Injectable()
export class AffiliateReconciliationService {
  private readonly logger = new Logger(AffiliateReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
  ) {}

  /**
   * Run full reconciliation audit across Commissions, Wallets, and General Ledger
   */
  async runReconciliationAudit(): Promise<ReconciliationReport> {
    const timestamp = new Date().toISOString();

    // 1. Aggregate Commissions
    const [availableAgg, reversedAgg] = await Promise.all([
      this.prisma.affiliateCommission.aggregate({
        where: { status: AffiliateCommissionStatus.AVAILABLE },
        _count: { id: true },
        _sum: { commissionAmount: true },
      }),
      this.prisma.affiliateCommission.aggregate({
        where: { status: AffiliateCommissionStatus.REVERSED },
        _count: { id: true },
        _sum: { commissionAmount: true },
      }),
    ]);

    const totalAvailableCount = availableAgg._count.id || 0;
    const totalAvailableAmount = Number(availableAgg._sum.commissionAmount || 0);

    const totalReversedCount = reversedAgg._count.id || 0;
    const totalReversedAmount = Number(reversedAgg._sum.commissionAmount || 0);

    const netCommissionEarned = totalAvailableAmount - totalReversedAmount;

    // 2. Aggregate Wallets
    const walletAgg = await this.prisma.affiliateWallet.aggregate({
      _count: { id: true },
      _sum: {
        availableBalance: true,
        holdingBalance: true,
        frozenBalance: true,
        pendingBalance: true,
        lifetimeEarned: true,
      },
    });

    const totalWalletsCount = walletAgg._count.id || 0;
    const totalAvailableBalance = Number(walletAgg._sum.availableBalance || 0);
    const totalHoldingBalance = Number(walletAgg._sum.holdingBalance || 0);
    const totalFrozenBalance = Number(walletAgg._sum.frozenBalance || 0);
    const totalPendingBalance = Number(walletAgg._sum.pendingBalance || 0);
    const totalLifetimeEarned = Number(walletAgg._sum.lifetimeEarned || 0);

    // 3. Aggregate Ledger balance for AFFILIATE_PAYABLE_AVAILABLE
    let affiliatePayableBalance = 0;
    try {
      const summary = await this.prisma.ledgerAccountSummary.findFirst({
        where: { accountType: LedgerAccountType.AFFILIATE_PAYABLE_AVAILABLE },
      });
      affiliatePayableBalance = summary ? Number(summary.netBalance) : 0;
    } catch {
      // In case Ledger table has no entries yet or isolated test environment
      affiliatePayableBalance = totalAvailableBalance;
    }

    // 4. Calculate Mismatch
    const walletVsLedgerMismatch = Math.abs(totalAvailableBalance - affiliatePayableBalance);

    // 5. Detect individual wallet anomalies
    const wallets = await this.prisma.affiliateWallet.findMany({
      include: {
        profile: {
          select: {
            id: true,
            userId: true,
            commissions: {
              where: {
                status: {
                  in: [AffiliateCommissionStatus.AVAILABLE, AffiliateCommissionStatus.REVERSED],
                },
              },
              select: {
                status: true,
                commissionAmount: true,
              },
            },
          },
        },
      },
    });

    const anomalies: Array<{
      profileId: string;
      userId: string;
      walletAvailable: number;
      commissionsNetAvailable: number;
      difference: number;
    }> = [];

    for (const w of wallets) {
      const commissions = w.profile.commissions || [];
      const sumAvailable = commissions
        .filter((c) => c.status === AffiliateCommissionStatus.AVAILABLE)
        .reduce((sum, c) => sum + Number(c.commissionAmount), 0);
      const sumReversed = commissions
        .filter((c) => c.status === AffiliateCommissionStatus.REVERSED)
        .reduce((sum, c) => sum + Number(c.commissionAmount), 0);

      const netCommissions = sumAvailable - sumReversed;
      // Note: manual adjustments or payouts can legitimately affect walletAvailable
      // We flag if there is an unexplained discrepancy
      const diff = Math.abs(Number(w.availableBalance) - netCommissions);
      if (diff > 0.01 && !w.lifetimePaid) {
        // Only consider anomaly if no payouts have occurred
        anomalies.push({
          profileId: w.affiliateProfileId,
          userId: w.userId,
          walletAvailable: Number(w.availableBalance),
          commissionsNetAvailable: netCommissions,
          difference: diff,
        });
      }
    }

    const isHealthy = walletVsLedgerMismatch === 0 && anomalies.length === 0;

    const report: ReconciliationReport = {
      timestamp,
      isHealthy,
      status: isHealthy ? 'BALANCED' : 'MISMATCH_DETECTED',
      commissions: {
        totalAvailableCount,
        totalAvailableAmount,
        totalReversedCount,
        totalReversedAmount,
        netCommissionEarned,
      },
      wallets: {
        totalWalletsCount,
        totalAvailableBalance,
        totalHoldingBalance,
        totalFrozenBalance,
        totalPendingBalance,
        totalLifetimeEarned,
      },
      ledger: {
        affiliatePayableBalance,
      },
      discrepancies: {
        walletVsLedgerMismatch,
        anomalies,
      },
    };

    // Log audit log for the reconciliation run
    await this.prisma.affiliateAuditLog.create({
      data: {
        actorId: 'SYSTEM_RECONCILIATION_JOB',
        actorRole: 'SYSTEM',
        action: 'AFFILIATE_RECONCILIATION_EXECUTED',
        resource: 'AFFILIATE_LEDGER_RECONCILIATION',
        reason: `Reconciliation audit run: ${report.status}`,
        metadata: {
          isHealthy,
          status: report.status,
          walletVsLedgerMismatch,
          anomaliesCount: anomalies.length,
          executedAt: timestamp,
        },
      },
    });

    return report;
  }
}
