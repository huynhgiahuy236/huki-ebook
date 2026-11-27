import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  OnModuleDestroy,
  Optional,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { OnEvent } from '@nestjs/event-emitter';
import { AffiliateLifecycleService } from './affiliate-lifecycle.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { AffiliateMetricsService } from '../monitoring/affiliate-metrics.service';
import { AffiliateAlertService } from '../monitoring/affiliate-alert.service';

const MAX_TIMER_CAP_MS = 6 * 3600 * 1000; // 6h safety ceiling (well below 24.8-day 32-bit timer limit)

@Injectable()
export class AffiliateSettlementWorker
  implements OnApplicationBootstrap, OnModuleDestroy, OnApplicationShutdown
{
  private readonly logger = new Logger(AffiliateSettlementWorker.name);
  private isRunning = false;
  private isShuttingDown = false;
  private nextTimer: NodeJS.Timeout | null = null;
  private scheduledAtMs: number | null = null;

  constructor(
    private readonly lifecycleService: AffiliateLifecycleService,
    private readonly prisma: PrismaService,
    @Optional() private readonly redisService?: RedisService,
    @Optional() private readonly metricsService?: AffiliateMetricsService,
    @Optional() private readonly alertService?: AffiliateAlertService,
  ) { }

  onApplicationBootstrap() {
    // Non-blocking startup sweep clears any overdue HOLDING commissions left after restarts/downtime
    // and arms a single timer strictly for the earliest upcoming holdingUntil (0 polling loop).
    const bootTimer = setTimeout(() => {
      this.sweepAndScheduleNext().catch((err) => {
        this.logger.warn(`Startup affiliate settlement sweep skipped: ${err?.message || err}`);
      });
    }, 2000);
    if (typeof bootTimer.unref === 'function') bootTimer.unref();
  }

  onModuleDestroy() {
    this.clearScheduledTimer();
  }

  onApplicationShutdown(signal?: string) {
    this.logger.log(`AffiliateSettlementWorker received shutdown signal (${signal}). Preventing new settlement batches.`);
    this.isShuttingDown = true;
    this.clearScheduledTimer();
  }

  private clearScheduledTimer() {
    if (this.nextTimer) {
      clearTimeout(this.nextTimer);
      this.nextTimer = null;
      this.scheduledAtMs = null;
    }
  }

  @OnEvent('affiliate.holding.scheduled')
  async handleHoldingScheduled(payload?: { holdingUntil?: Date | string }) {
    if (this.isShuttingDown) return;
    if (payload?.holdingUntil) {
      const targetMs = new Date(payload.holdingUntil).getTime();
      if (Number.isFinite(targetMs)) {
        this.armTimerFor(targetMs);
        return;
      }
    }
    await this.scheduleNextDueSettlement();
  }

  async sweepAndScheduleNext() {
    if (this.isShuttingDown) return;
    try {
      await this.runSettlementBatch();
    } finally {
      await this.scheduleNextDueSettlement();
    }
  }

  /**
   * Smart Next-Due Scheduler: queries at most 1 row via @@index([status, holdingUntil])
   * and sets 1 precise timer instead of polling DB every 15-30s or storing 7-day jobs in Redis.
   */
  async scheduleNextDueSettlement(): Promise<Date | null> {
    if (this.isShuttingDown || !this.prisma?.affiliateCommission?.findFirst) {
      return null;
    }
    const nextDue = await this.prisma.affiliateCommission.findFirst({
      where: {
        status: 'HOLDING',
        disputeBlocked: false,
        holdingUntil: { not: null },
      },
      orderBy: { holdingUntil: 'asc' },
      select: { holdingUntil: true },
    });

    if (!nextDue?.holdingUntil) {
      this.clearScheduledTimer();
      return null;
    }

    const dueMs = new Date(nextDue.holdingUntil).getTime();
    if (Number.isFinite(dueMs)) {
      this.armTimerFor(dueMs);
      return nextDue.holdingUntil;
    }
    return null;
  }

  private armTimerFor(targetMs: number) {
    if (this.isShuttingDown) return;
    const now = Date.now();
    const desiredDelay = Math.max(1000, Math.min(targetMs - now + 250, MAX_TIMER_CAP_MS));
    const wakeupAt = now + desiredDelay;

    // Keep existing timer if it already fires earlier or within 500ms of the new target
    if (this.nextTimer && this.scheduledAtMs !== null && this.scheduledAtMs <= wakeupAt + 500) {
      return;
    }

    this.clearScheduledTimer();
    this.scheduledAtMs = wakeupAt;
    this.nextTimer = setTimeout(() => {
      this.nextTimer = null;
      this.scheduledAtMs = null;
      this.sweepAndScheduleNext().catch((err) => {
        this.logger.warn(`Scheduled next-due affiliate settlement failed: ${err?.message || err}`);
      });
    }, desiredDelay);
    if (typeof this.nextTimer.unref === 'function') {
      this.nextTimer.unref();
    }
  }

  /**
   * Daily Settlement Safety-Net Batch at 00:00 Asia/Ho_Chi_Minh (UTC+7 -> 17:00 UTC).
   */
  @Cron('0 17 * * *')
  async handleDailySettlementCron() {
    this.logger.log('Starting daily scheduled affiliate settlement worker (00:00 VN / 17:00 UTC)...');
    try {
      const result = await this.runSettlementBatch();
      await this.scheduleNextDueSettlement();
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

    const lockKey = 'lock:cron:affiliate_settlement';
    let lockAcquired = false;

    if (this.redisService) {
      const acquired = await this.redisService.setNx(lockKey, process.pid.toString(), 600);
      if (!acquired) {
        this.logger.warn('Settlement batch is already running on another instance (Distributed Lock active). Skipping.');
        return { status: 'SKIPPED_ALREADY_RUNNING' as const };
      }
      lockAcquired = true;
    } else {
      if (this.isRunning) {
        this.logger.warn('Settlement batch is already running. Skipping concurrent invocation.');
        return { status: 'SKIPPED_ALREADY_RUNNING' as const };
      }
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
      if (lockAcquired && this.redisService) {
        await this.redisService.del(lockKey);
      }
    }
  }
}
