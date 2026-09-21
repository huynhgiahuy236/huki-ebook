import { ConfigService } from '@nestjs/config';
import { DailyRollupJob } from '../src/jobs/DailyRollupJob';
import { DailyRollupRunner } from '../src/services/DailyRollupRunner';

describe('DailyRollupJob', () => {
  let job: DailyRollupJob;
  let mockRunner: jest.Mocked<DailyRollupRunner>;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    mockRunner = {
      executeRollup: jest.fn().mockResolvedValue({
        date: '2026-09-19',
        aggregatesUpdated: 10,
        scopes: { platform: 4, store: 4, book: 2 },
      }),
    } as any;

    mockConfigService = {
      get: jest.fn().mockReturnValue('true'),
    } as any;

    job = new DailyRollupJob(mockRunner, mockConfigService);
  });

  describe('Target Business Date & Timezone Calculation (ICT = UTC+7)', () => {
    it('TC-03: should correctly determine yesterday date for standard 00:05 ICT execution', () => {
      // 2026-09-20 00:05:00 ICT is 2026-09-19 17:05:00 UTC
      const refDate = new Date('2026-09-19T17:05:00.000Z');
      const targetDate = job.getPreviousBusinessDate(refDate);

      expect(targetDate).toBe('2026-09-19');
    });

    it('TC-04: should handle month boundaries correctly in ICT timezone', () => {
      // 2026-10-01 00:05:00 ICT is 2026-09-30 17:05:00 UTC
      const refDate = new Date('2026-09-30T17:05:00.000Z');
      const targetDate = job.getPreviousBusinessDate(refDate);

      expect(targetDate).toBe('2026-09-30');
    });

    it('TC-04b: should handle year boundaries correctly in ICT timezone', () => {
      // 2027-01-01 00:05:00 ICT is 2026-12-31 17:05:00 UTC
      const refDate = new Date('2026-12-31T17:05:00.000Z');
      const targetDate = job.getPreviousBusinessDate(refDate);

      expect(targetDate).toBe('2026-12-31');
    });

    it('TC-04c: should handle February / March boundary correctly in ICT timezone', () => {
      // 2026-03-01 00:05:00 ICT is 2026-02-28 17:05:00 UTC
      const refDate = new Date('2026-02-28T17:05:00.000Z');
      const targetDate = job.getPreviousBusinessDate(refDate);

      expect(targetDate).toBe('2026-02-28');
    });
  });

  describe('Job Orchestration & Invocation', () => {
    it('TC-01: should invoke DailyRollupRunner with target date and SCHEDULED source', async () => {
      const refDate = new Date('2026-09-19T17:05:00.000Z'); // 2026-09-20 00:05 ICT
      const result = await job.handleDailyRollup(refDate);

      expect(mockRunner.executeRollup).toHaveBeenCalledWith({
        date: '2026-09-19',
        source: 'SCHEDULED',
      });
      expect(result).toEqual({
        date: '2026-09-19',
        aggregatesUpdated: 10,
        scopes: { platform: 4, store: 4, book: 2 },
      });
    });

    it('TC-15: should skip execution when ANALYTICS_ROLLUP_CRON_ENABLED is false', async () => {
      mockConfigService.get.mockReturnValue('false');

      const result = await job.handleDailyRollup();

      expect(result).toEqual({ skipped: true, reason: 'DISABLED' });
      expect(mockRunner.executeRollup).not.toHaveBeenCalled();
    });

    it('TC-14: should catch unhandled runner errors without crashing process', async () => {
      mockRunner.executeRollup.mockRejectedValueOnce(new Error('Fatal database connection error'));

      const refDate = new Date('2026-09-19T17:05:00.000Z');
      const result = await job.handleDailyRollup(refDate);

      expect(result).toEqual({
        error: 'Fatal database connection error',
        date: '2026-09-19',
      });
    });
  });
});
