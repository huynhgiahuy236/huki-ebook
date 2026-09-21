import { ConflictException } from '@nestjs/common';
import { DailyRollupRunner } from '../src/services/DailyRollupRunner';
import { DailyRollupService, RollupResult } from '../src/services/DailyRollupService';

describe('DailyRollupRunner', () => {
  let runner: DailyRollupRunner;
  let mockRollupService: jest.Mocked<DailyRollupService>;

  const mockResult: RollupResult = {
    date: '2026-09-19',
    aggregatesUpdated: 10,
    scopes: {
      platform: 4,
      store: 4,
      book: 2,
    },
  };

  beforeEach(() => {
    mockRollupService = {
      aggregateDay: jest.fn().mockResolvedValue(mockResult),
    } as any;

    runner = new DailyRollupRunner(mockRollupService);
    // Use 0ms delay for fast deterministic tests
    runner.defaultRetryDelayMs = 0;
  });

  describe('Single-Writer & Execution Parity', () => {
    it('TC-01: should delegate aggregation to DailyRollupService for SCHEDULED trigger', async () => {
      const result = await runner.executeRollup({
        date: '2026-09-19',
        source: 'SCHEDULED',
      });

      expect(mockRollupService.aggregateDay).toHaveBeenCalledWith('2026-09-19');
      expect(result).toEqual(mockResult);
      expect(runner.isDateLocked('2026-09-19')).toBe(false);
    });

    it('TC-02: should delegate aggregation to DailyRollupService for MANUAL trigger', async () => {
      const result = await runner.executeRollup({
        date: '2026-09-19',
        source: 'MANUAL',
      });

      expect(mockRollupService.aggregateDay).toHaveBeenCalledWith('2026-09-19');
      expect(result).toEqual(mockResult);
      expect(runner.isDateLocked('2026-09-19')).toBe(false);
    });
  });

  describe('Same-Process Concurrency & Date-Keyed Lock', () => {
    it('TC-06: should skip scheduled trigger if the same date is already locked', async () => {
      let resolveFirstRun: (val: any) => void;
      const firstRunPromise = new Promise((res) => {
        resolveFirstRun = res;
      });

      mockRollupService.aggregateDay.mockImplementationOnce(() => firstRunPromise as any);

      // Start first execution (SCHEDULED)
      const run1 = runner.executeRollup({ date: '2026-09-19', source: 'SCHEDULED' });

      expect(runner.isDateLocked('2026-09-19')).toBe(true);

      // Start second execution (SCHEDULED) for same date
      const run2 = await runner.executeRollup({ date: '2026-09-19', source: 'SCHEDULED' });

      expect(run2).toEqual({
        skipped: true,
        reason: 'ALREADY_IN_PROGRESS',
        date: '2026-09-19',
        source: 'SCHEDULED',
      });

      // Complete first run
      resolveFirstRun!(mockResult);
      await run1;

      expect(runner.isDateLocked('2026-09-19')).toBe(false);
    });

    it('TC-07: should reject manual trigger with 409 Conflict if same date is currently being processed by cron', async () => {
      let resolveFirstRun: (val: any) => void;
      const firstRunPromise = new Promise((res) => {
        resolveFirstRun = res;
      });

      mockRollupService.aggregateDay.mockImplementationOnce(() => firstRunPromise as any);

      const cronRun = runner.executeRollup({ date: '2026-09-19', source: 'SCHEDULED' });

      expect(runner.isDateLocked('2026-09-19')).toBe(true);

      // Attempt manual trigger while cron is running
      await expect(
        runner.executeRollup({ date: '2026-09-19', source: 'MANUAL' }),
      ).rejects.toThrow(ConflictException);

      resolveFirstRun!(mockResult);
      await cronRun;

      expect(runner.isDateLocked('2026-09-19')).toBe(false);
    });

    it('TC-09: should reject second manual trigger with 409 Conflict if same date is already in progress', async () => {
      let resolveFirstRun: (val: any) => void;
      const firstRunPromise = new Promise((res) => {
        resolveFirstRun = res;
      });

      mockRollupService.aggregateDay.mockImplementationOnce(() => firstRunPromise as any);

      const manualRun1 = runner.executeRollup({ date: '2026-09-19', source: 'MANUAL' });

      await expect(
        runner.executeRollup({ date: '2026-09-19', source: 'MANUAL' }),
      ).rejects.toThrow(ConflictException);

      resolveFirstRun!(mockResult);
      await manualRun1;
    });

    it('TC-10: should allow concurrent rollups for DIFFERENT business dates', async () => {
      let resolveDate1: (val: any) => void;
      let resolveDate2: (val: any) => void;

      mockRollupService.aggregateDay
        .mockImplementationOnce(() => new Promise((res) => (resolveDate1 = res)) as any)
        .mockImplementationOnce(() => new Promise((res) => (resolveDate2 = res)) as any);

      const run1 = runner.executeRollup({ date: '2026-09-18', source: 'MANUAL' });
      const run2 = runner.executeRollup({ date: '2026-09-19', source: 'SCHEDULED' });

      expect(runner.isDateLocked('2026-09-18')).toBe(true);
      expect(runner.isDateLocked('2026-09-19')).toBe(true);
      expect(runner.getActiveDates()).toEqual(expect.arrayContaining(['2026-09-18', '2026-09-19']));

      resolveDate1!(mockResult);
      resolveDate2!(mockResult);

      const [res1, res2] = await Promise.all([run1, run2]);
      expect(res1).toEqual(mockResult);
      expect(res2).toEqual(mockResult);

      expect(runner.isDateLocked('2026-09-18')).toBe(false);
      expect(runner.isDateLocked('2026-09-19')).toBe(false);
    });
  });

  describe('Retry & Lock Retention', () => {
    it('TC-12: should retry 1 time for SCHEDULED trigger under held lock and succeed', async () => {
      mockRollupService.aggregateDay
        .mockRejectedValueOnce(new Error('Transient DB timeout'))
        .mockResolvedValueOnce(mockResult);

      const result = await runner.executeRollup({
        date: '2026-09-19',
        source: 'SCHEDULED',
        retryDelayMs: 1,
      });

      expect(mockRollupService.aggregateDay).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockResult);
      expect(runner.isDateLocked('2026-09-19')).toBe(false);
    });

    it('TC-13: should hold lock during retry wait so manual requests are rejected during retry delay', async () => {
      let delayResolve: () => void;
      jest.spyOn(runner, 'delay').mockImplementationOnce(() => {
        return new Promise<void>((resolve) => {
          delayResolve = resolve;
        });
      });

      mockRollupService.aggregateDay
        .mockRejectedValueOnce(new Error('DB failure'))
        .mockResolvedValueOnce(mockResult);

      // Start cron run
      const cronRun = runner.executeRollup({
        date: '2026-09-19',
        source: 'SCHEDULED',
        retryDelayMs: 1000,
      });

      // Allow microtask to process first attempt rejection and enter delay
      await new Promise((res) => setImmediate(res));

      // Lock must be held while waiting to retry
      expect(runner.isDateLocked('2026-09-19')).toBe(true);

      // Attempt manual trigger while cron is in retry wait
      await expect(
        runner.executeRollup({ date: '2026-09-19', source: 'MANUAL' }),
      ).rejects.toThrow(ConflictException);

      // Resume retry
      delayResolve!();
      await cronRun;

      expect(runner.isDateLocked('2026-09-19')).toBe(false);
    });

    it('TC-14: should release lock cleanly when rollup fails permanently and allow subsequent execution', async () => {
      mockRollupService.aggregateDay.mockRejectedValue(new Error('Persistent error'));

      await expect(
        runner.executeRollup({
          date: '2026-09-19',
          source: 'SCHEDULED',
          maxRetries: 1,
          retryDelayMs: 1,
        }),
      ).rejects.toThrow('Persistent error');

      expect(runner.isDateLocked('2026-09-19')).toBe(false);

      // Lock should be available for subsequent execution
      mockRollupService.aggregateDay.mockReset();
      mockRollupService.aggregateDay.mockResolvedValueOnce(mockResult);
      const secondRun = await runner.executeRollup({
        date: '2026-09-19',
        source: 'MANUAL',
      });
      expect(secondRun).toEqual(mockResult);
      expect(runner.isDateLocked('2026-09-19')).toBe(false);
    });

    it('TC-15: should fail MANUAL trigger immediately on error with 0 retries', async () => {
      mockRollupService.aggregateDay.mockRejectedValueOnce(new Error('Manual DB error'));

      await expect(
        runner.executeRollup({
          date: '2026-09-19',
          source: 'MANUAL',
        }),
      ).rejects.toThrow('Manual DB error');

      // Exactly 1 call (no retries)
      expect(mockRollupService.aggregateDay).toHaveBeenCalledTimes(1);
      expect(runner.isDateLocked('2026-09-19')).toBe(false);
    });
  });
});
