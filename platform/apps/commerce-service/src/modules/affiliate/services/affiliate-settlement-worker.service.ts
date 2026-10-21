import { Injectable, Logger, OnApplicationShutdown, Optional } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AffiliateLifecycleService } from './affiliate-lifecycle.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AffiliateMetricsService } from '../monitoring/affiliate-metrics.service';
import { AffiliateAlertService } from '../monitoring/affiliate-alert.service';

@Injectable()
export class AffiliateSettlementWorker implements OnApplicationShutdown {
  private readonly logger = new Logger(AffiliateSettlementWorker.name);
  private isRunning = false;
  private isShuttingDown = false;

  constructor(
    private readonly lifecycleService: AffiliateLifecycleService,
    private readonly prisma: PrismaService,
    @Optional() private readonly metricsService?: AffiliateMetricsService,
    @Optional() private readonly alertService?: AffiliateAlertService,
  ) {}

  onApplicationShutdown(signal?: string) {
    this.logger.log(`AffiliateSettlementWorker received shutdown signal (${signal}). Preventing new settlement batches.`);
    this.isShuttingDown = true;
  }

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
      if (this.alertService) {
        await this.alertService.notifySettlementWorkerCrash(error);
      }
    }
  }

  /**
   * Run settlement batch with lock to prevent concurrent executions
   */
  async runSettlementBatch(cutoffDate?: Date, batchSize: number = 200) {
    if (this.isShuttingDown) {
      this.logger.warn('Application is shutting down. Rejecting settlement execution.');
      return { status: 'SKIPPED_SHUTTING_DOWN' as const };
    }

    if (this.isRunning) {
      this.logger.warn('Settlement batch is already running. Skipping concurrent invocation.');
      return { status: 'SKIPPED_ALREADY_RUNNING' as const };
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

      // Record Prometheus metrics
      if (this.metricsService) {
        this.metricsService.observeSettlementDuration(elapsedMs / 1000);
        for (let i = 0; i < settledCount; i++) {
          this.metricsService.recordSettlement('CREDIT');
        }
      }

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
    } catch (error: any) {
      if (this.alertService) {
        await this.alertService.notifySettlementWorkerCrash(error);
      }
      throw error;
    } finally {
      this.isRunning = false;
    }
  }
}
