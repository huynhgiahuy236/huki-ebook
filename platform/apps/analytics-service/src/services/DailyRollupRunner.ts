import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { DailyRollupService, RollupResult } from './DailyRollupService';

export type RollupTriggerSource = 'SCHEDULED' | 'MANUAL';

export interface RollupExecutionOptions {
  date: string;
  source: RollupTriggerSource;
  retryDelayMs?: number;
  maxRetries?: number;
}

export interface RollupSkippedResult {
  skipped: boolean;
  reason: string;
  date: string;
  source: RollupTriggerSource;
}

@Injectable()
export class DailyRollupRunner {
  private readonly logger = new Logger(DailyRollupRunner.name);
  private readonly activeDates = new Set<string>();

  // Default retry delay for background scheduled rollups (30 seconds)
  public defaultRetryDelayMs = 30000;

  constructor(private readonly rollupService: DailyRollupService) {}

  /**
   * Check if a specific business date is currently undergoing aggregation
   */
  isDateLocked(date: string): boolean {
    return this.activeDates.has(date);
  }

  /**
   * Get all currently active rollup dates (read-only snapshot)
   */
  getActiveDates(): string[] {
    return Array.from(this.activeDates);
  }

  /**
   * Execute daily rollup with date-keyed concurrency guard, error handling, and retry logic
   */
  async executeRollup(
    options: RollupExecutionOptions,
  ): Promise<RollupResult | RollupSkippedResult> {
    const { date, source } = options;
    const maxRetries = options.maxRetries ?? (source === 'SCHEDULED' ? 1 : 0);
    const retryDelayMs = options.retryDelayMs ?? this.defaultRetryDelayMs;

    // 1. Same-process concurrency guard check
    if (this.activeDates.has(date)) {
      if (source === 'MANUAL') {
        this.logger.warn(`[DailyRollupRunner] Manual rollup rejected for date ${date}: already in progress`);
        throw new ConflictException(`Daily rollup for business date ${date} is already in progress`);
      } else {
        this.logger.warn(`[DailyRollupRunner] Skipping scheduled rollup for date ${date}: already in progress`);
        return {
          skipped: true,
          reason: 'ALREADY_IN_PROGRESS',
          date,
          source,
        };
      }
    }

    // 2. Acquire date lock
    this.activeDates.add(date);
    const startTime = Date.now();
    this.logger.log(`[DailyRollupRunner] [${source}] Starting rollup for business date: ${date}`);

    try {
      let result: RollupResult;
      let attempt = 0;

      while (true) {
        try {
          attempt++;
          result = await this.rollupService.aggregateDay(date);
          break; // Success
        } catch (err: any) {
          if (attempt <= maxRetries) {
            this.logger.warn(
              `[DailyRollupRunner] [${source}] Attempt ${attempt} failed for date ${date}: ${err.message}. Retrying in ${retryDelayMs}ms...`,
            );
            await this.delay(retryDelayMs);
          } else {
            this.logger.error(
              `[DailyRollupRunner] [${source}] Rollup permanently failed for date ${date} after ${attempt} attempt(s): ${err.message}`,
              err.stack,
            );
            throw err;
          }
        }
      }

      const durationMs = Date.now() - startTime;
      this.logger.log(
        `[DailyRollupRunner] [${source}] Successfully completed rollup for date ${date} in ${durationMs}ms. Aggregates updated: ${result.aggregatesUpdated} (Platform: ${result.scopes.platform}, Store: ${result.scopes.store}, Book: ${result.scopes.book})`,
      );

      return result;
    } finally {
      // 3. Always release date lock
      this.activeDates.delete(date);
    }
  }

  /**
   * Injectable/mockable delay helper
   */
  public async delay(ms: number): Promise<void> {
    if (ms <= 0) return;
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
