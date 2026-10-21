import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AffiliateStructuredLogger } from './monitoring/affiliate-structured-logger';
import { AffiliateMetricsService } from './monitoring/affiliate-metrics.service';
import { AffiliateAlertService } from './monitoring/affiliate-alert.service';
import { AffiliateHealthService } from './monitoring/affiliate-health.service';
import { AffiliateSettlementWorker } from './services/affiliate-settlement-worker.service';
import { AffiliateLifecycleService } from './services/affiliate-lifecycle.service';
import { AffiliateReconciliationService } from './services/affiliate-reconciliation.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('Affiliate Observability, Alerting & Health (Phase 11)', () => {
  describe('1. AffiliateStructuredLogger & PII Sanitization', () => {
    it('should format structured logs with traceId, durationMs, and metadata', () => {
      const logger = new AffiliateStructuredLogger('TestContext');
      const emitSpy = jest.spyOn(logger as any, 'emit');

      logger.log({
        action: 'LINK_CLICK_PROCESSED',
        traceId: 'req-trace-12345',
        durationMs: 42,
        storeId: 'store-888',
        metadata: {
          shortCode: 'HUYBOOK',
          ipAddress: '127.0.0.1',
        },
      });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'info',
          action: 'LINK_CLICK_PROCESSED',
          traceId: 'req-trace-12345',
          durationMs: 42,
          storeId: 'store-888',
        }),
      );
    });

    it('should sanitize PII fields (CCCD, Bank Account, Phone, Email, Secrets)', () => {
      const sensitiveData = {
        legalName: 'Nguyen Van A',
        idCardNumber: '079199001234',
        accountNumber: '101234567890',
        phoneNumber: '0901234567',
        contactEmail: 'nguyenvana@gmail.com',
        userToken: 'secret-jwt-token-value',
        orderAmount: 250000,
      };

      const masked = AffiliateStructuredLogger.maskPii(sensitiveData);

      expect(masked.legalName).toBe('Nguyen Van A');
      expect(masked.orderAmount).toBe(250000);
      expect(masked.idCardNumber).toBe('079****1234');
      expect(masked.accountNumber).toBe('1012****90');
      expect(masked.phoneNumber).toBe('090****567');
      expect(masked.contactEmail).toBe('n***@gmail.com');
      expect(masked.userToken).toBe('[REDACTED]');
    });
  });

  describe('2. AffiliateMetricsService (Prometheus Metrics)', () => {
    let metricsService: AffiliateMetricsService;

    beforeEach(() => {
      metricsService = new AffiliateMetricsService();
    });

    it('should track link clicks and increment counter with store and status', () => {
      const incSpy = jest.spyOn(metricsService.linkClicksTotal, 'inc');
      metricsService.recordClick('store-123', 'VALID');
      expect(incSpy).toHaveBeenCalledWith({ store_id: 'store-123', status: 'VALID' });
    });

    it('should track commission creation and accumulated VND amount', () => {
      const incCountSpy = jest.spyOn(metricsService.commissionsCreatedTotal, 'inc');
      const incAmountSpy = jest.spyOn(metricsService.commissionAmountTotal, 'inc');

      metricsService.recordCommissionCreated('store-123', 50000, 'PENDING');
      expect(incCountSpy).toHaveBeenCalledWith({ store_id: 'store-123', status: 'PENDING' });
      expect(incAmountSpy).toHaveBeenCalledWith({ store_id: 'store-123' }, 50000);
    });

    it('should update outbox lag and ledger status gauges', () => {
      const setLagSpy = jest.spyOn(metricsService.outboxLagGauge, 'set');
      const setLedgerSpy = jest.spyOn(metricsService.ledgerReconciliationGauge, 'set');

      metricsService.setOutboxLag(45);
      expect(setLagSpy).toHaveBeenCalledWith(45);

      metricsService.setLedgerStatus(true);
      expect(setLedgerSpy).toHaveBeenCalledWith(1);

      metricsService.setLedgerStatus(false);
      expect(setLedgerSpy).toHaveBeenCalledWith(0);
    });

    it('should observe settlement duration in histogram', () => {
      const observeSpy = jest.spyOn(metricsService.settlementDurationHistogram, 'observe');
      metricsService.observeSettlementDuration(1.25);
      expect(observeSpy).toHaveBeenCalledWith(1.25);
    });
  });

  describe('3. AffiliateAlertService (P1/P2 Alert Dispatching)', () => {
    let alertService: AffiliateAlertService;
    const mockConfigService = {
      get: jest.fn().mockReturnValue(null),
    };

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AffiliateAlertService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      alertService = module.get<AffiliateAlertService>(AffiliateAlertService);
    });

    it('should dispatch P1 alert when Ledger Imbalance is detected', async () => {
      const sendAlertSpy = jest.spyOn(alertService, 'sendAlert');

      const res = await alertService.notifyLedgerImbalance(150000, {
        walletTotal: 1000000,
        ledgerTotal: 850000,
      });

      expect(sendAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'P1_CRITICAL',
          alertType: 'LEDGER_IMBALANCE_DETECTED',
        }),
      );
      expect(res.delivered).toBe(true);
    });

    it('should classify outbox backlog >= 1000 as P1_CRITICAL and < 1000 as P2_HIGH', async () => {
      const sendAlertSpy = jest.spyOn(alertService, 'sendAlert');

      // Lag >= 1000 -> P1
      await alertService.notifyOutboxBacklog(1250);
      expect(sendAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'P1_CRITICAL',
          alertType: 'OUTBOX_QUEUE_BACKLOG',
        }),
      );

      // Lag = 300 -> P2
      await alertService.notifyOutboxBacklog(300);
      expect(sendAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'P2_HIGH',
          alertType: 'OUTBOX_QUEUE_BACKLOG',
        }),
      );
    });

    it('should dispatch P1 alert when Settlement Worker crashes', async () => {
      const sendAlertSpy = jest.spyOn(alertService, 'sendAlert');
      const err = new Error('Database connection reset during batch update');

      await alertService.notifySettlementWorkerCrash(err);
      expect(sendAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'P1_CRITICAL',
          alertType: 'SETTLEMENT_WORKER_CRASH',
          message: expect.stringContaining('Database connection reset'),
        }),
      );
    });
  });

  describe('4. AffiliateHealthService (Operational Probes & Sanity)', () => {
    let healthService: AffiliateHealthService;
    let mockPrisma: any;
    let mockReconciliation: any;
    let mockMetrics: any;
    let mockAlert: any;

    beforeEach(async () => {
      mockPrisma = {
        affiliateProfile: { count: jest.fn().mockResolvedValue(10) },
        outboxEvent: { count: jest.fn().mockResolvedValue(15) },
        affiliateAuditLog: { findFirst: jest.fn().mockResolvedValue({ createdAt: new Date() }) },
      };

      mockReconciliation = {
        runReconciliationAudit: jest.fn().mockResolvedValue({
          isHealthy: true,
          status: 'BALANCED',
          discrepancies: { walletVsLedgerMismatch: 0 },
        }),
      };

      mockMetrics = {
        setOutboxLag: jest.fn(),
        setLedgerStatus: jest.fn(),
      };

      mockAlert = {
        notifyLedgerImbalance: jest.fn(),
        notifyOutboxBacklog: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AffiliateHealthService,
          { provide: PrismaService, useValue: mockPrisma },
          { provide: AffiliateReconciliationService, useValue: mockReconciliation },
          { provide: AffiliateMetricsService, useValue: mockMetrics },
          { provide: AffiliateAlertService, useValue: mockAlert },
        ],
      }).compile();

      healthService = module.get<AffiliateHealthService>(AffiliateHealthService);
    });

    it('should report OK status and SLO targets when healthy', async () => {
      const health = await healthService.checkHealth();

      expect(health.status).toBe('ok');
      expect(health.components.database.status).toBe('ok');
      expect(health.components.outboxQueue.status).toBe('ok');
      expect(health.components.ledgerReconciliation.status).toBe('balanced');
      expect(health.slo.availabilityTarget).toBe('99.9%');
      expect(health.slo.trackingCheckoutP95TargetMs).toBe(150);
    });

    it('should report DEGRADED status when outbox lag is between 200 and 999', async () => {
      mockPrisma.outboxEvent.count.mockResolvedValue(450);

      const health = await healthService.checkHealth();
      expect(health.status).toBe('degraded');
      expect(health.components.outboxQueue.status).toBe('warning');
    });

    it('should report ERROR status and trigger alert when ledger is imbalanced', async () => {
      mockReconciliation.runReconciliationAudit.mockResolvedValue({
        isHealthy: false,
        status: 'MISMATCH_DETECTED',
        discrepancies: { walletVsLedgerMismatch: 200000 },
      });

      const health = await healthService.checkHealth();
      expect(health.status).toBe('error');
      expect(health.components.ledgerReconciliation.status).toBe('imbalanced');
      expect(mockAlert.notifyLedgerImbalance).toHaveBeenCalled();
    });
  });

  describe('5. AffiliateSettlementWorker (Metrics & Graceful Shutdown)', () => {
    let worker: AffiliateSettlementWorker;
    let mockLifecycle: any;
    let mockPrisma: any;
    let mockMetrics: any;
    let mockAlert: any;

    beforeEach(async () => {
      mockLifecycle = {
        processMaturedHoldings: jest.fn().mockResolvedValue({
          processedCount: 5,
          settledCommissions: [{ id: 'comm-1', amount: 50000 }, { id: 'comm-2', amount: 75000 }],
        }),
      };

      mockPrisma = {
        affiliateAuditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-settle-1' }) },
      };

      mockMetrics = {
        observeSettlementDuration: jest.fn(),
        recordSettlement: jest.fn(),
      };

      mockAlert = {
        notifySettlementWorkerCrash: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AffiliateSettlementWorker,
          { provide: AffiliateLifecycleService, useValue: mockLifecycle },
          { provide: PrismaService, useValue: mockPrisma },
          { provide: AffiliateMetricsService, useValue: mockMetrics },
          { provide: AffiliateAlertService, useValue: mockAlert },
        ],
      }).compile();

      worker = module.get<AffiliateSettlementWorker>(AffiliateSettlementWorker);
    });

    it('should execute settlement batch, record Prometheus metrics, and audit log', async () => {
      const res = await worker.runSettlementBatch();

      expect(res.status).toBe('SUCCESS');
      expect(res.settledCount).toBe(2);
      expect(res.totalAmountReleased).toBe(125000);
      expect(mockMetrics.observeSettlementDuration).toHaveBeenCalled();
      expect(mockMetrics.recordSettlement).toHaveBeenCalledTimes(2);
      expect(mockPrisma.affiliateAuditLog.create).toHaveBeenCalled();
    });

    it('should reject execution and return SKIPPED_SHUTTING_DOWN when application is shutting down', async () => {
      worker.onApplicationShutdown('SIGTERM');

      const res = await worker.runSettlementBatch();
      expect(res.status).toBe('SKIPPED_SHUTTING_DOWN');
      expect(mockLifecycle.processMaturedHoldings).not.toHaveBeenCalled();
    });

    it('should trigger P1 alert if batch execution throws an unhandled error', async () => {
      mockLifecycle.processMaturedHoldings.mockRejectedValue(new Error('Fatal Postgres connection crash'));

      await expect(worker.runSettlementBatch()).rejects.toThrow('Fatal Postgres connection crash');
      expect(mockAlert.notifySettlementWorkerCrash).toHaveBeenCalled();
    });
  });
});
