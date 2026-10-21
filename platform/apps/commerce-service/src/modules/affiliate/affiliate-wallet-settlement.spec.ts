import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { AffiliateWalletService } from './services/affiliate-wallet.service';
import { AffiliateSettlementWorker } from './services/affiliate-settlement-worker.service';
import { AffiliateReconciliationService } from './services/affiliate-reconciliation.service';
import { AffiliateLifecycleService } from './services/affiliate-lifecycle.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import {
  AffiliateCommissionStatus,
  AffiliateWalletTxType,
  LedgerAccountType,
  LedgerEntryDirection,
} from '../../../prisma/generated/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('AffiliateWalletService & Phase 8 Settlement / Reconciliation', () => {
  let walletService: AffiliateWalletService;
  let settlementWorker: AffiliateSettlementWorker;
  let reconciliationService: AffiliateReconciliationService;

  const mockWallet = {
    id: 'wallet-123',
    affiliateProfileId: 'profile-123',
    userId: 'user-ctv-1',
    availableBalance: new Decimal(500000),
    pendingBalance: new Decimal(100000),
    holdingBalance: new Decimal(200000),
    frozenBalance: new Decimal(0),
    lifetimeEarned: new Decimal(800000),
    lifetimePaid: new Decimal(300000),
    currency: 'VND',
    version: 1,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const mockProfile = {
    id: 'profile-123',
    userId: 'user-ctv-1',
    affiliateCode: 'CTV_HUY',
    displayName: 'Gia Huy CTV',
  };

  const mockPrisma = {
    affiliateProfile: {
      findUnique: jest.fn(),
    },
    affiliateWallet: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    affiliateWalletTransaction: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    affiliateAuditLog: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    affiliateCommission: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    ledgerAccountSummary: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(async (cb) => cb(mockPrisma)),
  };

  const mockLedgerService = {
    postTransactionWithTx: jest.fn(),
    getAccountBalance: jest.fn(),
  };

  const mockLifecycleService = {
    processMaturedHoldings: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AffiliateWalletService,
        AffiliateSettlementWorker,
        AffiliateReconciliationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LedgerService, useValue: mockLedgerService },
        { provide: AffiliateLifecycleService, useValue: mockLifecycleService },
      ],
    }).compile();

    walletService = module.get<AffiliateWalletService>(AffiliateWalletService);
    settlementWorker = module.get<AffiliateSettlementWorker>(AffiliateSettlementWorker);
    reconciliationService = module.get<AffiliateReconciliationService>(
      AffiliateReconciliationService,
    );
  });

  describe('AffiliateWalletService - Balance Queries', () => {
    it('should return correct wallet balances when availableBalance is positive', async () => {
      mockPrisma.affiliateProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrisma.affiliateWallet.findUnique.mockResolvedValue(mockWallet);

      const result = await walletService.getWalletByUserId('user-ctv-1');

      expect(result.availableBalance).toBe(500000);
      expect(result.netAvailableBalance).toBe(500000);
      expect(result.debtBalance).toBe(0);
      expect(result.holdingBalance).toBe(200000);
      expect(result.pendingBalance).toBe(100000);
      expect(result.currency).toBe('VND');
    });

    it('should calculate debtBalance and zero netAvailableBalance when availableBalance is negative (Debt)', async () => {
      mockPrisma.affiliateProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrisma.affiliateWallet.findUnique.mockResolvedValue({
        ...mockWallet,
        availableBalance: new Decimal(-150000), // Negative balance due to returns
      });

      const result = await walletService.getWalletByUserId('user-ctv-1');

      expect(result.availableBalance).toBe(-150000);
      expect(result.netAvailableBalance).toBe(0);
      expect(result.debtBalance).toBe(150000); // Absolute debt
    });

    it('should return paginated transactions with count', async () => {
      mockPrisma.affiliateWallet.findUnique.mockResolvedValue(mockWallet);
      mockPrisma.affiliateWalletTransaction.findMany.mockResolvedValue([
        {
          id: 'tx-1',
          walletId: 'wallet-123',
          type: AffiliateWalletTxType.MOVE_HOLDING_TO_AVAILABLE,
          amount: new Decimal(50000),
          balanceBefore: new Decimal(450000),
          balanceAfter: new Decimal(500000),
          currency: 'VND',
          referenceType: 'COMMISSION_SETTLED',
          referenceId: 'comm-1',
          description: 'Settled commission',
          createdAt: new Date('2026-02-01'),
        },
      ]);
      mockPrisma.affiliateWalletTransaction.count.mockResolvedValue(1);

      const result = await walletService.getTransactions('user-ctv-1', { page: 1, limit: 10 });

      expect(result.items.length).toBe(1);
      expect(result.total).toBe(1);
      expect(result.items[0].amount).toBe(50000);
      expect(result.items[0].type).toBe(AffiliateWalletTxType.MOVE_HOLDING_TO_AVAILABLE);
    });
  });

  describe('AffiliateWalletService - Maker-Checker Manual Adjustments', () => {
    it('should reject adjustment request if amount is zero or negative', async () => {
      await expect(
        walletService.requestManualAdjustment({
          profileId: 'profile-123',
          amount: 0,
          direction: 'CREDIT',
          reason: 'Correction for delayed commission',
          requestedBy: 'admin-maker-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject adjustment request if reason is too short', async () => {
      await expect(
        walletService.requestManualAdjustment({
          profileId: 'profile-123',
          amount: 50000,
          direction: 'CREDIT',
          reason: 'Too short',
          requestedBy: 'admin-maker-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create a pending adjustment request in audit log (Maker step)', async () => {
      mockPrisma.affiliateProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrisma.affiliateWallet.findUnique.mockResolvedValue(mockWallet);
      mockPrisma.affiliateAuditLog.create.mockResolvedValue({
        id: 'audit-adj-1',
        createdAt: new Date(),
      });

      const res = await walletService.requestManualAdjustment({
        profileId: 'profile-123',
        amount: 100000,
        direction: 'CREDIT',
        reason: 'Goodwill compensation for delayed shipping commission',
        requestedBy: 'admin-maker-1',
      });

      expect(res.status).toBe('PENDING_APPROVAL');
      expect(res.adjustmentId).toBe('audit-adj-1');
      expect(mockPrisma.affiliateAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'WALLET_ADJUSTMENT_REQUESTED',
            actorId: 'admin-maker-1',
          }),
        }),
      );
    });

    it('should fail approval if approver is the same as requester (Maker-Checker violation)', async () => {
      mockPrisma.affiliateAuditLog.findUnique.mockResolvedValue({
        id: 'audit-adj-1',
        action: 'WALLET_ADJUSTMENT_REQUESTED',
        resourceId: 'wallet-123',
        metadata: {
          status: 'PENDING_APPROVAL',
          requestedBy: 'admin-1', // Same admin
          amount: 100000,
          direction: 'CREDIT',
        },
      });

      await expect(
        walletService.approveManualAdjustment('audit-adj-1', 'admin-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should successfully execute CREDIT adjustment with double-entry Ledger posting', async () => {
      mockPrisma.affiliateAuditLog.findUnique.mockResolvedValue({
        id: 'audit-adj-1',
        action: 'WALLET_ADJUSTMENT_REQUESTED',
        resourceId: 'wallet-123',
        reason: 'Goodwill credit',
        metadata: {
          status: 'PENDING_APPROVAL',
          profileId: 'profile-123',
          requestedBy: 'admin-maker-1',
          amount: 100000,
          direction: 'CREDIT',
        },
      });
      mockPrisma.affiliateWallet.findUnique.mockResolvedValue(mockWallet);
      mockLedgerService.postTransactionWithTx.mockResolvedValue({ id: 'ledger-tx-999' });

      const res = await walletService.approveManualAdjustment('audit-adj-1', 'admin-checker-2');

      expect(res.status).toBe('APPROVED');
      expect(res.approvedBy).toBe('admin-checker-2');
      expect(res.balanceAfter).toBe(600000); // 500k + 100k
      expect(mockLedgerService.postTransactionWithTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          entries: [
            expect.objectContaining({
              accountType: LedgerAccountType.PLATFORM_MARKETING_EXPENSE,
              direction: LedgerEntryDirection.DEBIT,
              amount: 100000,
            }),
            expect.objectContaining({
              accountType: LedgerAccountType.AFFILIATE_PAYABLE_AVAILABLE,
              direction: LedgerEntryDirection.CREDIT,
              amount: 100000,
            }),
          ],
        }),
      );
      expect(mockPrisma.affiliateWalletTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: AffiliateWalletTxType.MANUAL_ADJUSTMENT_CREDIT,
            amount: new Decimal(100000),
          }),
        }),
      );
    });

    it('should successfully execute DEBIT adjustment with double-entry Ledger posting', async () => {
      mockPrisma.affiliateAuditLog.findUnique.mockResolvedValue({
        id: 'audit-adj-2',
        action: 'WALLET_ADJUSTMENT_REQUESTED',
        resourceId: 'wallet-123',
        reason: 'Penalty correction',
        metadata: {
          status: 'PENDING_APPROVAL',
          profileId: 'profile-123',
          requestedBy: 'admin-maker-1',
          amount: 50000,
          direction: 'DEBIT',
        },
      });
      mockPrisma.affiliateWallet.findUnique.mockResolvedValue(mockWallet);
      mockLedgerService.postTransactionWithTx.mockResolvedValue({ id: 'ledger-tx-888' });

      const res = await walletService.approveManualAdjustment('audit-adj-2', 'admin-checker-2');

      expect(res.status).toBe('APPROVED');
      expect(res.balanceAfter).toBe(450000); // 500k - 50k
      expect(mockLedgerService.postTransactionWithTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          entries: [
            expect.objectContaining({
              accountType: LedgerAccountType.AFFILIATE_PAYABLE_AVAILABLE,
              direction: LedgerEntryDirection.DEBIT,
              amount: 50000,
            }),
            expect.objectContaining({
              accountType: LedgerAccountType.PLATFORM_MARKETING_EXPENSE,
              direction: LedgerEntryDirection.CREDIT,
              amount: 50000,
            }),
          ],
        }),
      );
      expect(mockPrisma.affiliateWalletTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: AffiliateWalletTxType.MANUAL_ADJUSTMENT_DEBIT,
            amount: new Decimal(50000),
          }),
        }),
      );
    });

    it('should reject manual adjustment request and mark audit log REJECTED', async () => {
      mockPrisma.affiliateAuditLog.findUnique.mockResolvedValue({
        id: 'audit-adj-3',
        action: 'WALLET_ADJUSTMENT_REQUESTED',
        metadata: {
          status: 'PENDING_APPROVAL',
        },
      });

      const res = await walletService.rejectManualAdjustment(
        'audit-adj-3',
        'admin-checker-2',
        'Insufficient justification provided',
      );

      expect(res.status).toBe('REJECTED');
      expect(res.rejectionReason).toBe('Insufficient justification provided');
      expect(mockPrisma.affiliateAuditLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'audit-adj-3' },
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              status: 'REJECTED',
            }),
          }),
        }),
      );
    });
  });

  describe('AffiliateSettlementWorker - Batch Execution', () => {
    it('should trigger processMaturedHoldings and record audit completion', async () => {
      mockLifecycleService.processMaturedHoldings.mockResolvedValue({
        processedCount: 5,
        settledCommissions: [
          { id: 'c-1', profileId: 'p-1', amount: 250000, ledgerTxId: 'tx-1' },
        ],
      });

      const res = (await settlementWorker.runSettlementBatch(undefined, 100)) as any;

      expect(res.status).toBe('SUCCESS');
      expect(res.settledCount).toBe(1);
      expect(res.totalAmountReleased).toBe(250000);
      expect(mockLifecycleService.processMaturedHoldings).toHaveBeenCalledWith(100);
      expect(mockPrisma.affiliateAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'SETTLEMENT_BATCH_COMPLETED',
            actorId: 'SYSTEM_SETTLEMENT_WORKER',
          }),
        }),
      );
    });
  });

  describe('AffiliateReconciliationService - Consistency & Anomaly Detection', () => {
    it('should return BALANCED when Commissions, Wallets, and Ledger agree', async () => {
      mockPrisma.affiliateCommission.aggregate
        .mockResolvedValueOnce({
          _count: { id: 10 },
          _sum: { commissionAmount: new Decimal(1000000) },
        }) // AVAILABLE
        .mockResolvedValueOnce({
          _count: { id: 1 },
          _sum: { commissionAmount: new Decimal(100000) },
        }); // REVERSED

      mockPrisma.affiliateWallet.aggregate.mockResolvedValue({
        _count: { id: 2 },
        _sum: {
          availableBalance: new Decimal(900000), // 1000k - 100k
          holdingBalance: new Decimal(200000),
          frozenBalance: new Decimal(0),
          pendingBalance: new Decimal(50000),
          lifetimeEarned: new Decimal(1000000),
        },
      });

      mockPrisma.ledgerAccountSummary.findFirst.mockResolvedValue({
        netBalance: new Decimal(900000),
      });

      mockPrisma.affiliateWallet.findMany.mockResolvedValue([
        {
          id: 'w-1',
          affiliateProfileId: 'p-1',
          userId: 'u-1',
          availableBalance: new Decimal(900000),
          lifetimePaid: new Decimal(0),
          profile: {
            id: 'p-1',
            userId: 'u-1',
            commissions: [
              { status: AffiliateCommissionStatus.AVAILABLE, commissionAmount: new Decimal(1000000) },
              { status: AffiliateCommissionStatus.REVERSED, commissionAmount: new Decimal(100000) },
            ],
          },
        },
      ]);

      const report = await reconciliationService.runReconciliationAudit();

      expect(report.isHealthy).toBe(true);
      expect(report.status).toBe('BALANCED');
      expect(report.discrepancies.walletVsLedgerMismatch).toBe(0);
      expect(report.discrepancies.anomalies.length).toBe(0);
      expect(report.commissions.netCommissionEarned).toBe(900000);
    });

    it('should detect MISMATCH_DETECTED when Ledger balance diverges from Wallet total', async () => {
      mockPrisma.affiliateCommission.aggregate
        .mockResolvedValueOnce({
          _count: { id: 1 },
          _sum: { commissionAmount: new Decimal(500000) },
        })
        .mockResolvedValueOnce({
          _count: { id: 0 },
          _sum: { commissionAmount: null },
        });

      mockPrisma.affiliateWallet.aggregate.mockResolvedValue({
        _count: { id: 1 },
        _sum: {
          availableBalance: new Decimal(500000),
          holdingBalance: new Decimal(0),
          frozenBalance: new Decimal(0),
          pendingBalance: new Decimal(0),
          lifetimeEarned: new Decimal(500000),
        },
      });

      mockPrisma.ledgerAccountSummary.findFirst.mockResolvedValue({
        netBalance: new Decimal(450000), // 50,000 difference!
      });

      mockPrisma.affiliateWallet.findMany.mockResolvedValue([]);

      const report = await reconciliationService.runReconciliationAudit();

      expect(report.isHealthy).toBe(false);
      expect(report.status).toBe('MISMATCH_DETECTED');
      expect(report.discrepancies.walletVsLedgerMismatch).toBe(50000);
    });
  });
});
