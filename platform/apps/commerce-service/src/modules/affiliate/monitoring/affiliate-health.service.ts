import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AffiliateReconciliationService } from '../services/affiliate-reconciliation.service';
import { AffiliateMetricsService } from './affiliate-metrics.service';
import { AffiliateAlertService } from './affiliate-alert.service';

export interface AffiliateSubsystemHealth {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  subsystem: 'affiliate-marketing';
  slo: {
    availabilityTarget: string;
    trackingCheckoutP95TargetMs: number;
    reportingP95TargetMs: number;
  };
  components: {
    database: { status: 'ok' | 'error'; latencyMs?: number; error?: string };
    outboxQueue: { status: 'ok' | 'warning' | 'critical'; lagCount: number };
    ledgerReconciliation: { status: 'balanced' | 'imbalanced'; totalBalanceDiff: number };
    settlementWorker: { status: 'ready' | 'running' | 'degraded'; lastRunAt?: Date };
  };
}

@Injectable()
export class AffiliateHealthService {
  private readonly logger = new Logger(AffiliateHealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reconciliationService: AffiliateReconciliationService,
    private readonly metricsService: AffiliateMetricsService,
    private readonly alertService: AffiliateAlertService,
  ) {}

  /**
   * Run full health & operational sanity check of the Affiliate Subsystem
   */
  async checkHealth(): Promise<AffiliateSubsystemHealth> {
    const startDb = Date.now();
    let dbStatus: 'ok' | 'error' = 'ok';
    let dbLatency = 0;
    let dbError: string | undefined;

    // 1. Check DB connectivity on affiliate tables
    try {
      await this.prisma.affiliateProfile.count({ take: 1 });
      dbLatency = Date.now() - startDb;
    } catch (err: any) {
      dbStatus = 'error';
      dbError = err?.message || 'Database error';
    }

    // 2. Check Outbox Queue Backlog
    let lagCount = 0;
    try {
      lagCount = await this.prisma.outboxEvent.count({
        where: {
          type: { startsWith: 'AFFILIATE_' },
        },
      });
      this.metricsService.setOutboxLag(lagCount);

      if (lagCount >= 1000) {
        await this.alertService.notifyOutboxBacklog(lagCount);
      }
    } catch (err: any) {
      this.logger.error(`Error querying outbox lag: ${err?.message}`);
    }

    const outboxStatus: 'ok' | 'warning' | 'critical' =
      lagCount >= 1000 ? 'critical' : lagCount >= 200 ? 'warning' : 'ok';

    // 3. Check Ledger Reconciliation Sanity
    let ledgerStatus: 'balanced' | 'imbalanced' = 'balanced';
    let totalBalanceDiff = 0;
    try {
      const audit = await this.reconciliationService.runReconciliationAudit();
      totalBalanceDiff = audit.discrepancies?.walletVsLedgerMismatch || 0;
      ledgerStatus = audit.isHealthy ? 'balanced' : 'imbalanced';
      this.metricsService.setLedgerStatus(audit.isHealthy);

      if (!audit.isHealthy) {
        await this.alertService.notifyLedgerImbalance(totalBalanceDiff, audit as any);
      }
    } catch (err: any) {
      this.logger.error(`Error during ledger reconciliation sanity check: ${err?.message}`);
    }

    // 4. Check Settlement Worker
    const lastSettlementAudit = await this.prisma.affiliateAuditLog.findFirst({
      where: {
        resource: 'AFFILIATE_SETTLEMENT',
        action: 'HOLDING_COMMISSIONS_SETTLED',
      },
      orderBy: { createdAt: 'desc' },
    });

    const overallStatus: 'ok' | 'degraded' | 'error' =
      dbStatus === 'error' || ledgerStatus === 'imbalanced' || outboxStatus === 'critical'
        ? 'error'
        : outboxStatus === 'warning'
        ? 'degraded'
        : 'ok';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      subsystem: 'affiliate-marketing',
      slo: {
        availabilityTarget: '99.9%',
        trackingCheckoutP95TargetMs: 150,
        reportingP95TargetMs: 500,
      },
      components: {
        database: {
          status: dbStatus,
          latencyMs: dbLatency,
          error: dbError,
        },
        outboxQueue: {
          status: outboxStatus,
          lagCount,
        },
        ledgerReconciliation: {
          status: ledgerStatus,
          totalBalanceDiff,
        },
        settlementWorker: {
          status: 'ready',
          lastRunAt: lastSettlementAudit ? lastSettlementAudit.createdAt : undefined,
        },
      },
    };
  }
}
