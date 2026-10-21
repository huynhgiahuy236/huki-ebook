import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AffiliateLifecycleService } from './affiliate-lifecycle.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AffiliateSettlementWorker {
  private readonly logger = new Logger(AffiliateSettlementWorker.name);
  private isRunning = false;

  constructor(
    private readonly lifecycleService: AffiliateLifecycleService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Daily Settlement Batch at 00:00 Asia/Ho_Chi_Minh (UTC+7 -> 17:00 UTC).
   * Automatically sweeps all matured holding commissions and settles to AVAILABLE.
   */
  @Cron('0 17 * * *')
  async handleDailySettlementCron() {
    this.logger.log('Starting daily scheduled affiliate settlement worker (00:00 VN / 17:00 UTC)...');
    try {
      const result = await this.runSettlementBatch();
      this.logger.log(`Daily settlement completed: ${JSON.stringify(result)}`);
    } catch (error: any) {
      this.logger.error(`Daily settlement worker failed: ${error.message}`, error.stack);
    }
  }

  /**
   * Run settlement batch with lock to prevent concurrent executions
   */
  async runSettlementBatch(cutoffDate?: Date, batchSize: number = 200) {
    if (this.isRunning) {
      this.logger.warn('Settlement batch is already running. Skipping concurrent invocation.');
      return { status: 'SKIPPED_ALREADY_RUNNING' };
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      const result = await this.lifecycleService.processMaturedHoldings(batchSize);
      const elapsedMs = Date.now() - startTime;
      const settledCount = result.settledCommissions.length;
      const totalAmountReleased = result.settledCommissions.reduce(
        (sum, c) => sum + Number(c.amount),
        0,
      );

      // Record system audit log
      await this.prisma.affiliateAuditLog.create({
        data: {
          actorId: 'SYSTEM_SETTLEMENT_WORKER',
          actorRole: 'SYSTEM',
          action: 'SETTLEMENT_BATCH_COMPLETED',
          resource: 'AFFILIATE_COMMISSIONS',
          reason: 'Daily scheduled 00:00 settlement cycle',
          metadata: {
            processedCount: result.processedCount,
            settledCount,
            totalAmountReleased,
            elapsedMs,
            executedAt: new Date().toISOString(),
          },
        },
      });

      return {
        status: 'SUCCESS' as const,
        processedCount: result.processedCount,
        settledCount,
        totalAmountReleased,
        settledCommissions: result.settledCommissions,
        elapsedMs,
      };
    } finally {
      this.isRunning = false;
    }
  }
}
