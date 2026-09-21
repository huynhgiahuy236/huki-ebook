import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { DailyRollupRunner } from '../services/DailyRollupRunner';

@Injectable()
export class DailyRollupJob {
  private readonly logger = new Logger(DailyRollupJob.name);

  constructor(
    private readonly runner: DailyRollupRunner,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Calculate previous completed business date string (YYYY-MM-DD) in Asia/Ho_Chi_Minh (UTC+7)
   */
  getPreviousBusinessDate(referenceDate: Date = new Date()): string {
    // Add 7 hours to align with Asia/Ho_Chi_Minh calendar date
    const ictTime = new Date(referenceDate.getTime() + 7 * 60 * 60 * 1000);
    // Subtract 1 calendar day to target the completed previous business day
    ictTime.setUTCDate(ictTime.getUTCDate() - 1);

    const year = ictTime.getUTCFullYear();
    const month = String(ictTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(ictTime.getUTCDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  /**
   * Automated Daily Rollup Cron: runs at 00:05 every day in Asia/Ho_Chi_Minh
   */
  @Cron('5 0 * * *', {
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async handleDailyRollup(referenceDate?: Date): Promise<any> {
    const isEnabled = this.configService.get<string>('ANALYTICS_ROLLUP_CRON_ENABLED', 'true') !== 'false';
    if (!isEnabled) {
      this.logger.log('[DailyRollupJob] Scheduled rollup is disabled via ANALYTICS_ROLLUP_CRON_ENABLED=false');
      return { skipped: true, reason: 'DISABLED' };
    }

    const targetDate = this.getPreviousBusinessDate(referenceDate);
    this.logger.log(`[DailyRollupJob] Triggering scheduled daily rollup for target date: ${targetDate}`);

    try {
      const result = await this.runner.executeRollup({
        date: targetDate,
        source: 'SCHEDULED',
      });
      return result;
    } catch (err: any) {
      this.logger.error(`[DailyRollupJob] Scheduled daily rollup execution failed for ${targetDate}: ${err.message}`, err.stack);
      return { error: err.message, date: targetDate };
    }
  }
}
