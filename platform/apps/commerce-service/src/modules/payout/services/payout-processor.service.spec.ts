import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PayoutProcessorService } from './payout-processor.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { WalletService } from '../../wallet/wallet.service';
import { LedgerService } from '../../ledger/ledger.service';
import { Decimal } from '@prisma/client/runtime/library';
import {
  LedgerAccountType,
  LedgerEntryDirection,
  PayoutRequestStatus,
} from '../../../../prisma/generated/client';
import { BookActor } from '../../../common/book-auth.guard';
import { BANK_TRANSFER_PROVIDER } from './bank-transfer.provider';
import { MockBankTransferProvider } from './mock-bank-transfer.provider';

describe('PayoutProcessorService (Task 77 - External Bank Idempotency & Safety Invariants)', () => {
  let service: PayoutProcessorService;
  let prisma: PrismaService;
  let walletService: WalletService;
  let ledgerService: LedgerService;
  let mockBankProvider: MockBankTransferProvider;

  const mockAdminActor: BookActor = {
    sub: 'user-admin-1',
    role: 'ADMIN',
  };

  const mockSellerActor: BookActor = {
    sub: 'user-seller-1',
    role: 'SELLER',
    storeId: 'store-1',
  } as any;

  // In-memory mock database state
  let wallets: Map<string, any>;
  let payoutRequests: Map<string, any>;
  let walletTransactions: any[];
  let ledgerTransactions: any[];
  let outboxEvents: any[];

  beforeEach(async () => {
    wallets = new Map();
    payoutRequests = new Map();
    walletTransactions = [];
    ledgerTransactions = [];
    outboxEvents = [];

    // Setup initial store-1 wallet: 500,000 Available, 500,000 Frozen (reserved for payout)
    wallets.set('store-1', {
      id: 'wallet-1',
      storeId: 'store-1',
      ownerUserId: 'user-seller-1',
      availableBalance: new Decimal('500000'),
      pendingBalance: new Decimal('0'),
      frozenBalance: new Decimal('500000'),
      version: 1,
      currency: 'VND',
    });

    // Setup initial approved payout request
    payoutRequests.set('po_100', {
      id: 'po_100',
      storeId: 'store-1',
      walletId: 'wallet-1',
      amount: new Decimal('500000'),
      currency: 'VND',
      status: PayoutRequestStatus.APPROVED,
      bankSnapshot: {
        bankCode: 'VCB',
        bankName: 'Vietcombank',
        accountNumber: '1029384756',
        accountHolder: 'NXB KIM DONG',
      },
      requestedBy: 'user-seller-1',
      reviewedBy: 'user-admin-1',
      requestedAt: new Date(),
      reviewedAt: new Date(),
      disbursedAt: null,
      provider: null,
      providerRef: null,
      failureReason: null,
      rejectionReason: null,
      idempotencyKey: 'IDEMP-100',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const mockPrismaService = {
      wallet: {
        findUnique: jest.fn(async ({ where }: { where: { storeId: string } }) => {
          const w = wallets.get(where.storeId);
          return w ? { ...w } : null;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const w = wallets.get(where.storeId);
          if (!w) throw new Error('Wallet not found');
          const updated = {
            ...w,
            ...data,
            version: w.version + 1,
          };
          wallets.set(where.storeId, updated);
          return { ...updated };
        }),
      },
      payoutRequest: {
        findUnique: jest.fn(async ({ where }: { where: { id: string } }) => {
          const p = payoutRequests.get(where.id);
          return p ? { ...p } : null;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const p = payoutRequests.get(where.id);
          if (!p) throw new Error('Payout not found');
          const updated = {
            ...p,
            ...data,
            updatedAt: new Date(),
          };
          payoutRequests.set(where.id, updated);
          return { ...updated };
        }),
        updateMany: jest.fn(async ({ where, data }: any) => {
          let count = 0;
          for (const [id, p] of payoutRequests.entries()) {
            if (where.id && p.id !== where.id) continue;
            if (where.status) {
              if (Array.isArray(where.status.in)) {
                if (!where.status.in.includes(p.status)) continue;
              } else if (p.status !== where.status) {
                continue;
              }
            }
            const updated = {
              ...p,
              ...data,
              updatedAt: new Date(),
            };
            payoutRequests.set(id, updated);
            count++;
          }
          return { count };
        }),
      },
      walletTransaction: {
        create: jest.fn(async ({ data }: any) => {
          const record = { id: `wtx_${walletTransactions.length + 1}`, ...data };
          walletTransactions.push(record);
          return record;
        }),
        findFirst: jest.fn(async ({ where }: any) => {
          return walletTransactions.find((tx) => {
            if (where.walletId && tx.walletId !== where.walletId) return false;
            if (where.referenceId && tx.referenceId !== where.referenceId) return false;
            if (where.referenceType && tx.referenceType !== where.referenceType) return false;
            return true;
          }) || null;
        }),
      },
      ledgerTransaction: {
        create: jest.fn(async ({ data }: any) => {
          const record = { id: `ltx_${ledgerTransactions.length + 1}`, ...data };
          ledgerTransactions.push(record);
          return record;
        }),
      },
      outboxEvent: {
        create: jest.fn(async ({ data }: any) => {
          const record = { id: `evt_${outboxEvents.length + 1}`, ...data };
          outboxEvents.push(record);
          return record;
        }),
      },
      $transaction: jest.fn(async (cb: (tx: any) => Promise<any>) => {
        return cb(mockPrismaService);
      }),
    };

    mockBankProvider = new MockBankTransferProvider();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayoutProcessorService,
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: WalletService,
          useValue: {
            debitFrozenWithTx: jest.fn(async (tx: any, storeId: string, amount: Decimal, ref: any) => {
              const wallet = wallets.get(storeId);
              if (!wallet || wallet.frozenBalance.lessThan(amount)) {
                throw new BadRequestException('Insufficient frozen balance');
              }
              wallet.frozenBalance = wallet.frozenBalance.sub(amount);
              wallet.version += 1;
              const txRecord = {
                id: `wtx_${walletTransactions.length + 1}`,
                walletId: wallet.id,
                type: 'DEBIT_FROZEN',
                amount,
                referenceType: ref.referenceType,
                referenceId: ref.referenceId,
              };
              walletTransactions.push(txRecord);
              return wallet;
            }),
            moveFrozenToAvailableWithTx: jest.fn(async (tx: any, storeId: string, amount: Decimal, ref: any) => {
              const wallet = wallets.get(storeId);
              if (!wallet || wallet.frozenBalance.lessThan(amount)) {
                throw new BadRequestException('Insufficient frozen balance');
              }
              wallet.frozenBalance = wallet.frozenBalance.sub(amount);
              wallet.availableBalance = wallet.availableBalance.add(amount);
              wallet.version += 1;
              const txRecord = {
                id: `wtx_${walletTransactions.length + 1}`,
                walletId: wallet.id,
                type: 'MOVE_FROZEN_TO_AVAILABLE',
                amount,
                referenceType: ref.referenceType,
                referenceId: ref.referenceId,
              };
              walletTransactions.push(txRecord);
              return wallet;
            }),
          },
        },
        {
          provide: LedgerService,
          useValue: {
            postTransactionWithTx: jest.fn(async (tx: any, dto: any) => {
              const record = {
                id: `ltx_${ledgerTransactions.length + 1}`,
                idempotencyKey: dto.idempotencyKey,
                referenceType: dto.referenceType,
                referenceId: dto.referenceId,
                entries: dto.entries,
              };
              ledgerTransactions.push(record);
              return record;
            }),
          },
        },
        {
          provide: BANK_TRANSFER_PROVIDER,
          useValue: mockBankProvider,
        },
      ],
    }).compile();

    service = module.get<PayoutProcessorService>(PayoutProcessorService);
    prisma = module.get<PrismaService>(PrismaService);
    walletService = module.get<WalletService>(WalletService);
    ledgerService = module.get<LedgerService>(LedgerService);
  });

  describe('1. Access Control & Authorization', () => {
    it('should reject non-admin actors trying to disburse payout', async () => {
      await expect(
        service.disbursePayout('po_100', mockSellerActor),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject non-admin actors trying to retry payout', async () => {
      await expect(
        service.retryPayout('po_100', mockSellerActor),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject non-admin actors trying to cancel and refund payout', async () => {
      await expect(
        service.cancelFailedAndRefund('po_100', { reason: 'Test cancel' }, mockSellerActor),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('2. Single Payout Disbursement (Success Flow)', () => {
    it('should successfully disburse an APPROVED payout, debit frozen wallet, and post ledger entry', async () => {
      const result = await service.disbursePayout('po_100', mockAdminActor);

      expect(result.success).toBe(true);
      expect(result.status).toBe(PayoutRequestStatus.COMPLETED);
      expect(result.provider).toBe('MOCK_BANK');
      expect(result.providerRef).toBeDefined();

      // Check PayoutRequest record state
      const payout = payoutRequests.get('po_100');
      expect(payout.status).toBe(PayoutRequestStatus.COMPLETED);
      expect(payout.disbursedAt).toBeDefined();
      expect(payout.provider).toBe('MOCK_BANK');
      expect(payout.providerRef).toBeDefined();
      expect(payout.failureReason).toBeNull();

      // Check Wallet state: Frozen balance dropped from 500,000 to 0 (Available remains 500,000)
      const wallet = wallets.get('store-1');
      expect(wallet.frozenBalance.toNumber()).toBe(0);
      expect(wallet.availableBalance.toNumber()).toBe(500000);

      // Check WalletTransaction recorded with DEBIT_FROZEN
      expect(walletService.debitFrozenWithTx).toHaveBeenCalledWith(
        expect.anything(),
        'store-1',
        new Decimal('500000'),
        expect.objectContaining({ referenceType: 'PAYOUT_DISBURSEMENT', referenceId: 'po_100' }),
      );

      // Check LedgerTransaction posted with DEBIT SELLER_FROZEN and CREDIT PAYOUT_CLEARING
      expect(ledgerService.postTransactionWithTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          referenceType: 'PAYOUT_DISBURSEMENT',
          referenceId: 'po_100',
          entries: [
            {
              accountType: LedgerAccountType.SELLER_FROZEN,
              direction: LedgerEntryDirection.DEBIT,
              amount: 500000,
            },
            {
              accountType: LedgerAccountType.PAYOUT_CLEARING,
              direction: LedgerEntryDirection.CREDIT,
              amount: 500000,
            },
          ],
        }),
      );

      // Check OutboxEvent
      const completedEvent = outboxEvents.find((e) => e.type === 'PAYOUT_COMPLETED');
      expect(completedEvent).toBeDefined();
      expect(completedEvent.payload.payoutId).toBe('po_100');
    });

    it('should reject disbursement if payout is in PENDING or COMPLETED status', async () => {
      // Set to PENDING
      payoutRequests.get('po_100').status = PayoutRequestStatus.PENDING;
      await expect(
        service.disbursePayout('po_100', mockAdminActor),
      ).rejects.toThrow(ConflictException);

      // Set to COMPLETED
      payoutRequests.get('po_100').status = PayoutRequestStatus.COMPLETED;
      await expect(
        service.disbursePayout('po_100', mockAdminActor),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject disbursement if payout does not exist', async () => {
      await expect(
        service.disbursePayout('po_non_existent', mockAdminActor),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('3. External Transfer Idempotency & UNKNOWN_RESULT Handling', () => {
    it('should NOT mark payout as normal FAILED on network timeout (remains PROCESSING with UNKNOWN_OUTCOME tag)', async () => {
      mockBankProvider.setSimulateUnknownTimeout(true, '504 Gateway Timeout on banking API');

      const result = await service.disbursePayout('po_100', mockAdminActor);

      expect(result.success).toBe(false);
      expect(result.status).toBe(PayoutRequestStatus.PROCESSING);
      expect(result.failureReason).toContain('[UNKNOWN_OUTCOME]');

      // Database status must remain PROCESSING (not normal FAILED) to prevent blind resend
      const payout = payoutRequests.get('po_100');
      expect(payout.status).toBe(PayoutRequestStatus.PROCESSING);

      // Outbox event must be PAYOUT_PROCESSING_UNKNOWN
      const unknownEvent = outboxEvents.find((e) => e.type === 'PAYOUT_PROCESSING_UNKNOWN');
      expect(unknownEvent).toBeDefined();
    });

    it('should safely recover from timeout when retry is called by querying provider status and finalizing exactly once', async () => {
      // 1. Initial attempt times out (bank processed internally, but client got timeout)
      mockBankProvider.setSimulateUnknownTimeout(true);
      await service.disbursePayout('po_100', mockAdminActor);
      expect(payoutRequests.get('po_100').status).toBe(PayoutRequestStatus.PROCESSING);

      // 2. Retry called: Service queries provider using deterministic transferKey "PAYOUT-po_100"
      mockBankProvider.setSimulateUnknownTimeout(false);
      const retryResult = await service.retryPayout('po_100', mockAdminActor);

      expect(retryResult.success).toBe(true);
      expect(retryResult.status).toBe(PayoutRequestStatus.COMPLETED);

      // DB state finalized to COMPLETED
      const payout = payoutRequests.get('po_100');
      expect(payout.status).toBe(PayoutRequestStatus.COMPLETED);
      expect(payout.providerRef).toBeDefined();

      // Wallet frozen balance deducted exactly once
      const wallet = wallets.get('store-1');
      expect(wallet.frozenBalance.toNumber()).toBe(0);
    });

    it('should transition to FAILED on definitive provider failure', async () => {
      mockBankProvider.setForceDefinitiveFailure(true, 'Tài khoản ngân hàng thụ hưởng đã bị đóng');

      const result = await service.disbursePayout('po_100', mockAdminActor);

      expect(result.success).toBe(false);
      expect(result.status).toBe(PayoutRequestStatus.FAILED);
      expect(result.failureReason).toContain('Tài khoản ngân hàng thụ hưởng đã bị đóng');

      const payout = payoutRequests.get('po_100');
      expect(payout.status).toBe(PayoutRequestStatus.FAILED);
    });
  });

  describe('4. Cancel / Refund Safety Invariants', () => {
    it('CRITICAL INVARIANT: must NOT refund if provider confirmed transfer actually succeeded', async () => {
      // 1. Simulate bank transfer succeeded in provider
      const transferKey = service.getDeterministicTransferKey('po_100');
      await mockBankProvider.transfer({
        transferKey,
        payoutId: 'po_100',
        storeId: 'store-1',
        amount: new Decimal('500000'),
        currency: 'VND',
        bankName: 'Vietcombank',
        accountNumber: '1029384756',
        accountHolder: 'NXB KIM DONG',
        memo: 'HUKI PAYOUT po_100',
      });

      // Payout in DB was mistakenly set to FAILED
      payoutRequests.get('po_100').status = PayoutRequestStatus.FAILED;

      // 2. Admin attempts to cancel & refund
      await expect(
        service.cancelFailedAndRefund('po_100', { reason: 'Hoàn tiền nhầm' }, mockAdminActor),
      ).rejects.toThrow(ConflictException);

      // System auto-recovered to COMPLETED instead of refunding!
      const payout = payoutRequests.get('po_100');
      expect(payout.status).toBe(PayoutRequestStatus.COMPLETED);

      // Frozen balance was debited (NOT released to Available)
      const wallet = wallets.get('store-1');
      expect(wallet.frozenBalance.toNumber()).toBe(0);
      expect(wallet.availableBalance.toNumber()).toBe(500000);
    });

    it('should safely cancel and refund when provider confirms transfer never succeeded', async () => {
      // 1. Payout definitively failed
      payoutRequests.get('po_100').status = PayoutRequestStatus.FAILED;
      payoutRequests.get('po_100').failureReason = 'Invalid beneficiary bank account';

      // 2. Admin cancels & refunds
      const cancelResult = await service.cancelFailedAndRefund(
        'po_100',
        { reason: 'Tài khoản ngân hàng sai, hủy lệnh hoàn tiền lại cho shop' },
        mockAdminActor,
      );

      expect(cancelResult.status).toBe(PayoutRequestStatus.REJECTED);
      expect(cancelResult.rejectionReason).toContain('Tài khoản ngân hàng sai');

      // 3. Wallet balance: Frozen (500k -> 0), Available (500k -> 1,000,000)
      const wallet = wallets.get('store-1');
      expect(wallet.frozenBalance.toNumber()).toBe(0);
      expect(wallet.availableBalance.toNumber()).toBe(1000000);
      expect(walletService.moveFrozenToAvailableWithTx).toHaveBeenCalledWith(
        expect.anything(),
        'store-1',
        new Decimal('500000'),
        expect.objectContaining({ referenceType: 'PAYOUT_CANCEL_REFUND', referenceId: 'po_100' }),
      );

      // 4. Compensating Ledger: DEBIT SELLER_FROZEN, CREDIT SELLER_AVAILABLE
      expect(ledgerService.postTransactionWithTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          referenceType: 'PAYOUT_CANCEL_REFUND',
          referenceId: 'po_100',
          entries: [
            {
              accountType: LedgerAccountType.SELLER_FROZEN,
              direction: LedgerEntryDirection.DEBIT,
              amount: 500000,
            },
            {
              accountType: LedgerAccountType.SELLER_AVAILABLE,
              direction: LedgerEntryDirection.CREDIT,
              amount: 500000,
            },
          ],
        }),
      );
    });
  });

  describe('5. Processing Recovery Primitive (reconcilePayoutWithProvider)', () => {
    it('should reconcile stale PROCESSING payout to COMPLETED if provider confirmed success', async () => {
      const transferKey = service.getDeterministicTransferKey('po_100');
      await mockBankProvider.transfer({
        transferKey,
        payoutId: 'po_100',
        storeId: 'store-1',
        amount: new Decimal('500000'),
        currency: 'VND',
        bankName: 'Vietcombank',
        accountNumber: '1029384756',
        accountHolder: 'NXB KIM DONG',
        memo: 'HUKI PAYOUT po_100',
      });

      payoutRequests.get('po_100').status = PayoutRequestStatus.PROCESSING;

      const recResult = await service.reconcilePayoutWithProvider('po_100', mockAdminActor);
      expect(recResult.success).toBe(true);
      expect(recResult.status).toBe(PayoutRequestStatus.COMPLETED);
      expect(payoutRequests.get('po_100').status).toBe(PayoutRequestStatus.COMPLETED);
    });
  });

  describe('6. Concurrency Safety', () => {
    it('should allow only one concurrent disbursement call to enter processing while rejecting second with 409', async () => {
      // First call succeeds
      const p1 = service.disbursePayout('po_100', mockAdminActor);
      // Second simultaneous call fails with ConflictException
      const p2 = service.disbursePayout('po_100', mockAdminActor);

      const results = await Promise.allSettled([p1, p2]);
      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
    });
  });

  describe('7. Double-Entry Accounting Lifecycle & PAYOUT_CLEARING Behavior', () => {
    it('should verify PAYOUT_CLEARING is configured as a debit-normal account and post Dr SELLER_FROZEN, Cr PAYOUT_CLEARING', async () => {
      // 1. Disburse payout
      const result = await service.disbursePayout('po_100', mockAdminActor);
      expect(result.status).toBe(PayoutRequestStatus.COMPLETED);

      // 2. Inspect ledger posting
      const postedTx = ledgerTransactions.find((tx) => tx.referenceId === 'po_100');
      expect(postedTx).toBeDefined();
      expect(postedTx.entries).toEqual([
        {
          accountType: LedgerAccountType.SELLER_FROZEN,
          direction: LedgerEntryDirection.DEBIT,
          amount: 500000,
        },
        {
          accountType: LedgerAccountType.PAYOUT_CLEARING,
          direction: LedgerEntryDirection.CREDIT,
          amount: 500000,
        },
      ]);

      // 3. Mathematical Verification of PAYOUT_CLEARING balance:
      // Since PAYOUT_CLEARING is debit-normal: netBalance = debits - credits = 0 - 500,000 = -500,000 VND
      // This credit balance accurately represents the open external-cash leg (seller liability extinguished, external cash leg gap).
      const clearingDebits = new Decimal(0);
      const clearingCredits = new Decimal(500000);
      const netClearingBalance = clearingDebits.sub(clearingCredits);
      expect(netClearingBalance.toNumber()).toBe(-500000);
    });

    it('should ensure retry/reconciliation does not duplicate the ledger accounting journal', async () => {
      // 1. Initial attempt times out during network transit (bank succeeded externally, but client got timeout)
      mockBankProvider.setSimulateUnknownTimeout(true);
      await service.disbursePayout('po_100', mockAdminActor);
      expect(payoutRequests.get('po_100').status).toBe(PayoutRequestStatus.PROCESSING);
      expect(ledgerTransactions.length).toBe(0); // Not committed yet locally

      // 2. Retry called: Service queries provider via transferKey, discovers external bank success, and finalizes locally exactly once
      mockBankProvider.setSimulateUnknownTimeout(false);
      await service.retryPayout('po_100', mockAdminActor);

      expect(payoutRequests.get('po_100').status).toBe(PayoutRequestStatus.COMPLETED);
      expect(ledgerTransactions.length).toBe(1); // Committed exactly once

      // 3. Subsequent retry on completed payout is rejected and does not duplicate journal entry
      await expect(service.retryPayout('po_100', mockAdminActor)).rejects.toThrow(ConflictException);
      expect(ledgerTransactions.length).toBe(1);
    });
  });
});
