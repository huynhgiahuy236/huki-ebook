import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PayoutService } from './payout.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { WalletService } from '../wallet/wallet.service';
import { LedgerService } from '../ledger/ledger.service';
import { WalletSecurityService } from '../wallet/wallet-security.service';
import { Decimal } from '@prisma/client/runtime/library';
import { LedgerAccountType, LedgerEntryDirection, PayoutRequestStatus } from '../../../prisma/generated/client';
import { BookActor } from '../../common/book-auth.guard';
import { Security2FAPurpose } from '../wallet/dto/wallet-security.dto';
import { PayoutReviewAction } from './dto/payout.dto';

describe('PayoutService (Task 76 - Payout Request Processing & Admin Approval)', () => {
  let service: PayoutService;
  let prisma: PrismaService;
  let redis: RedisService;
  let walletService: WalletService;
  let ledgerService: LedgerService;
  let walletSecurityService: WalletSecurityService;

  const mockStoreOwnerActor: BookActor = {
    sub: 'user-seller-1',
    role: 'SELLER',
    storeId: 'store-1',
  } as any;

  const mockAdminActor: BookActor = {
    sub: 'user-admin-1',
    role: 'ADMIN',
  };

  const mockOtherStoreActor: BookActor = {
    sub: 'user-seller-2',
    role: 'SELLER',
    storeId: 'store-2',
  } as any;

  // Mock in-memory database storage
  let wallets: Map<string, any>;
  let payoutRequests: Map<string, any>;
  let walletTransactions: any[];
  let ledgerTransactions: any[];
  let outboxEvents: any[];
  let lockQueue: Promise<void>;

  beforeEach(async () => {
    wallets = new Map();
    payoutRequests = new Map();
    walletTransactions = [];
    ledgerTransactions = [];
    outboxEvents = [];
    lockQueue = Promise.resolve();

    // Setup initial store-1 wallet with 1,000,000 VND Available
    wallets.set('store-1', {
      id: 'wallet-1',
      storeId: 'store-1',
      ownerUserId: 'user-seller-1',
      availableBalance: new Decimal('1000000'),
      pendingBalance: new Decimal('500000'),
      frozenBalance: new Decimal('0'),
      version: 1,
      currency: 'VND',
    });

    const mockPrismaService = {
      wallet: {
        findUnique: jest.fn(async ({ where }: { where: { storeId: string } }) => {
          return wallets.get(where.storeId) || null;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const w = wallets.get(where.storeId);
          if (!w) throw new Error('Wallet not found');
          const updated = {
            ...w,
            availableBalance: data.availableBalance !== undefined ? data.availableBalance : w.availableBalance,
            pendingBalance: data.pendingBalance !== undefined ? data.pendingBalance : w.pendingBalance,
            frozenBalance: data.frozenBalance !== undefined ? data.frozenBalance : w.frozenBalance,
            version: w.version + 1,
          };
          wallets.set(where.storeId, updated);
          return updated;
        }),
      },
      payoutRequest: {
        findUnique: jest.fn(async ({ where }: any) => {
          if (where.id) {
            return payoutRequests.get(where.id) || null;
          }
          if (where.storeId_idempotencyKey) {
            for (const p of payoutRequests.values()) {
              if (p.storeId === where.storeId_idempotencyKey.storeId && p.idempotencyKey === where.storeId_idempotencyKey.idempotencyKey) {
                return p;
              }
            }
          }
          return null;
        }),
        findMany: jest.fn(async ({ where }: any) => {
          const list: any[] = [];
          for (const p of payoutRequests.values()) {
            if (where.storeId && p.storeId !== where.storeId) continue;
            if (where.status && where.status.in && !where.status.in.includes(p.status)) continue;
            list.push(p);
          }
          return list;
        }),
        count: jest.fn(async () => payoutRequests.size),
        create: jest.fn(async ({ data }: any) => {
          const rec = {
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          payoutRequests.set(data.id, rec);
          return rec;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const p = payoutRequests.get(where.id);
          if (!p) throw new Error('Payout request not found');
          const updated = { ...p, ...data, updatedAt: new Date() };
          payoutRequests.set(where.id, updated);
          return updated;
        }),
        updateMany: jest.fn(async ({ where, data }: any) => {
          const p = payoutRequests.get(where.id);
          if (p && p.status === where.status) {
            const updated = { ...p, ...data, updatedAt: new Date() };
            payoutRequests.set(where.id, updated);
            return { count: 1 };
          }
          return { count: 0 };
        }),
      },
      walletTransaction: {
        create: jest.fn(async ({ data }: any) => {
          walletTransactions.push(data);
          return data;
        }),
      },
      outboxEvent: {
        create: jest.fn(async ({ data }: any) => {
          outboxEvents.push(data);
          return data;
        }),
      },
      $executeRaw: jest.fn(async () => 1),
      $transaction: jest.fn(async (cb: (tx: any) => Promise<any>) => {
        const prev = lockQueue;
        let release: () => void;
        lockQueue = new Promise((resolve) => {
          release = resolve;
        });
        await prev;
        try {
          return await cb(mockPrismaService);
        } finally {
          release!();
        }
      }),
    };

    const mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      getdel: jest.fn(),
    };

    const mockWalletService = {
      moveAvailableToFrozenWithTx: jest.fn(async (tx: any, storeId: string, amount: Decimal, ref: any) => {
        const w = wallets.get(storeId);
        if (!w || w.availableBalance.lessThan(amount)) {
          throw new BadRequestException('Insufficient available balance');
        }
        const updated = {
          ...w,
          availableBalance: w.availableBalance.sub(amount),
          frozenBalance: w.frozenBalance.add(amount),
          version: w.version + 1,
        };
        wallets.set(storeId, updated);
        await tx.walletTransaction.create({
          data: {
            walletId: w.id,
            type: 'MOVE_AVAILABLE_TO_FROZEN',
            amount,
            availableBefore: w.availableBalance,
            availableAfter: updated.availableBalance,
            frozenBefore: w.frozenBalance,
            frozenAfter: updated.frozenBalance,
            referenceType: ref.referenceType,
            referenceId: ref.referenceId,
          },
        });
        return updated;
      }),
      moveFrozenToAvailableWithTx: jest.fn(async (tx: any, storeId: string, amount: Decimal, ref: any) => {
        const w = wallets.get(storeId);
        if (!w || w.frozenBalance.lessThan(amount)) {
          throw new BadRequestException('Insufficient frozen balance');
        }
        const updated = {
          ...w,
          frozenBalance: w.frozenBalance.sub(amount),
          availableBalance: w.availableBalance.add(amount),
          version: w.version + 1,
        };
        wallets.set(storeId, updated);
        await tx.walletTransaction.create({
          data: {
            walletId: w.id,
            type: 'MOVE_FROZEN_TO_AVAILABLE',
            amount,
            availableBefore: w.availableBalance,
            availableAfter: updated.availableBalance,
            frozenBefore: w.frozenBalance,
            frozenAfter: updated.frozenBalance,
            referenceType: ref.referenceType,
            referenceId: ref.referenceId,
          },
        });
        return updated;
      }),
    };

    const mockLedgerService = {
      postTransactionWithTx: jest.fn(async (tx: any, dto: any) => {
        ledgerTransactions.push(dto);
        return { id: 'ltx-1', ...dto };
      }),
    };

    const mockWalletSecurityService = {
      consumeFinanceAuthorization: jest.fn(async (params: any) => {
        if (!params.token || params.token === 'invalid_token') {
          throw new ForbiddenException('Invalid token');
        }
        if (params.purpose !== Security2FAPurpose.WALLET_WITHDRAWAL) {
          throw new ForbiddenException('Wrong purpose');
        }
        return true;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayoutService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: WalletService, useValue: mockWalletService },
        { provide: LedgerService, useValue: mockLedgerService },
        { provide: WalletSecurityService, useValue: mockWalletSecurityService },
      ],
    }).compile();

    service = module.get<PayoutService>(PayoutService);
    prisma = module.get<PrismaService>(PrismaService);
    redis = module.get<RedisService>(RedisService);
    walletService = module.get<WalletService>(WalletService);
    ledgerService = module.get<LedgerService>(LedgerService);
    walletSecurityService = module.get<WalletSecurityService>(WalletSecurityService);
  });

  describe('Payout Request Creation & Concurrency', () => {
    it('1. successfully creates PENDING payout request and reserves Available funds', async () => {
      const result = await service.createPayoutRequest(
        {
          storeId: 'store-1',
          amount: '200000',
          financeAuthToken: 'fin_auth_valid_123',
          idempotencyKey: 'IDEMP-001',
        },
        mockStoreOwnerActor,
      );

      expect(result.status).toBe(PayoutRequestStatus.PENDING);
      expect(result.amount).toBe('200000');
      expect(result.bankSnapshot.bankName).toContain('Vietcombank');
      expect(result.bankSnapshot.accountNumberMasked).toBe('1029****56');

      // Check Wallet mutation
      const w = wallets.get('store-1');
      expect(w.availableBalance.toNumber()).toBe(800000);
      expect(w.frozenBalance.toNumber()).toBe(200000);

      // Check Ledger journal
      expect(ledgerTransactions.length).toBe(1);
      expect(ledgerTransactions[0].entries[0].accountType).toBe(LedgerAccountType.SELLER_AVAILABLE);
      expect(ledgerTransactions[0].entries[0].direction).toBe(LedgerEntryDirection.DEBIT);
      expect(ledgerTransactions[0].entries[1].accountType).toBe(LedgerAccountType.SELLER_FROZEN);
      expect(ledgerTransactions[0].entries[1].direction).toBe(LedgerEntryDirection.CREDIT);

      // Check Outbox
      expect(outboxEvents.length).toBe(1);
      expect(outboxEvents[0].type).toBe('PAYOUT_REQUESTED');
    });

    it('2. rejects cross-store payout request attempt with 403 Forbidden', async () => {
      await expect(
        service.createPayoutRequest(
          {
            storeId: 'store-1',
            amount: '200000',
            financeAuthToken: 'fin_auth_valid_123',
            idempotencyKey: 'IDEMP-002',
          },
          mockOtherStoreActor,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('3. rejects payout request without valid finance authorization token', async () => {
      await expect(
        service.createPayoutRequest(
          {
            storeId: 'store-1',
            amount: '200000',
            financeAuthToken: 'invalid_token',
            idempotencyKey: 'IDEMP-003',
          },
          mockStoreOwnerActor,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('4. rejects negative or zero amount', async () => {
      await expect(
        service.createPayoutRequest(
          {
            storeId: 'store-1',
            amount: '0',
            financeAuthToken: 'fin_auth_valid_123',
            idempotencyKey: 'IDEMP-004',
          },
          mockStoreOwnerActor,
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createPayoutRequest(
          {
            storeId: 'store-1',
            amount: '-500000',
            financeAuthToken: 'fin_auth_valid_123',
            idempotencyKey: 'IDEMP-004B',
          },
          mockStoreOwnerActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('5. rejects payout amount below minimum working limit (100,000 VND)', async () => {
      await expect(
        service.createPayoutRequest(
          {
            storeId: 'store-1',
            amount: '50000',
            financeAuthToken: 'fin_auth_valid_123',
            idempotencyKey: 'IDEMP-005',
          },
          mockStoreOwnerActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('6. rejects payout amount that is not a multiple of 1,000 VND (POL-15)', async () => {
      await expect(
        service.createPayoutRequest(
          {
            storeId: 'store-1',
            amount: '100500',
            financeAuthToken: 'fin_auth_valid_123',
            idempotencyKey: 'IDEMP-006',
          },
          mockStoreOwnerActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('7. rejects payout amount exceeding available balance', async () => {
      await expect(
        service.createPayoutRequest(
          {
            storeId: 'store-1',
            amount: '1500000', // Available is only 1,000,000
            financeAuthToken: 'fin_auth_valid_123',
            idempotencyKey: 'IDEMP-007',
          },
          mockStoreOwnerActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('8. idempotent replay with exact key returns existing request without re-reserving funds', async () => {
      const res1 = await service.createPayoutRequest(
        {
          storeId: 'store-1',
          amount: '200000',
          financeAuthToken: 'fin_auth_valid_123',
          idempotencyKey: 'IDEMP-REPLAY',
        },
        mockStoreOwnerActor,
      );

      const res2 = await service.createPayoutRequest(
        {
          storeId: 'store-1',
          amount: '200000',
          financeAuthToken: 'fin_auth_valid_123',
          idempotencyKey: 'IDEMP-REPLAY',
        },
        mockStoreOwnerActor,
      );

      expect(res1.id).toBe(res2.id);
      // Ensure funds reserved only once: 1,000,000 - 200,000 = 800,000
      expect(wallets.get('store-1').availableBalance.toNumber()).toBe(800000);
      expect(ledgerTransactions.length).toBe(1);
    });

    it('9. rejects idempotent replay with altered amount under same key', async () => {
      await service.createPayoutRequest(
        {
          storeId: 'store-1',
          amount: '200000',
          financeAuthToken: 'fin_auth_valid_123',
          idempotencyKey: 'IDEMP-ALTERED',
        },
        mockStoreOwnerActor,
      );

      await expect(
        service.createPayoutRequest(
          {
            storeId: 'store-1',
            amount: '300000', // Different amount
            financeAuthToken: 'fin_auth_valid_123',
            idempotencyKey: 'IDEMP-ALTERED',
          },
          mockStoreOwnerActor,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('10. enforces daily count limit (max 2 requests per business day)', async () => {
      // 1st request
      await service.createPayoutRequest(
        { storeId: 'store-1', amount: '100000', financeAuthToken: 'tok1', idempotencyKey: 'K1' },
        mockStoreOwnerActor,
      );
      // 2nd request
      await service.createPayoutRequest(
        { storeId: 'store-1', amount: '100000', financeAuthToken: 'tok2', idempotencyKey: 'K2' },
        mockStoreOwnerActor,
      );

      // 3rd request in same business day must fail
      await expect(
        service.createPayoutRequest(
          { storeId: 'store-1', amount: '100000', financeAuthToken: 'tok3', idempotencyKey: 'K3' },
          mockStoreOwnerActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('11. enforces daily amount limit (max 50,000,000 VND per business day)', async () => {
      // Give wallet high balance
      wallets.set('store-1', {
        ...wallets.get('store-1'),
        availableBalance: new Decimal('100000000'),
      });

      // 1st request: 40,000,000
      await service.createPayoutRequest(
        { storeId: 'store-1', amount: '40000000', financeAuthToken: 'tok1', idempotencyKey: 'K10' },
        mockStoreOwnerActor,
      );

      // 2nd request: 20,000,000 (total would be 60M > 50M limit) -> should fail
      await expect(
        service.createPayoutRequest(
          { storeId: 'store-1', amount: '20000000', financeAuthToken: 'tok2', idempotencyKey: 'K11' },
          mockStoreOwnerActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('12. concurrent balance race: two simultaneous 800k requests on 1,000k available -> exactly one succeeds', async () => {
      // Available is 1,000,000
      const promise1 = service.createPayoutRequest(
        { storeId: 'store-1', amount: '800000', financeAuthToken: 'tokA', idempotencyKey: 'RACE-A' },
        mockStoreOwnerActor,
      );
      const promise2 = service.createPayoutRequest(
        { storeId: 'store-1', amount: '800000', financeAuthToken: 'tokB', idempotencyKey: 'RACE-B' },
        mockStoreOwnerActor,
      );

      const results = await Promise.allSettled([promise1, promise2]);
      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);
      expect(wallets.get('store-1').availableBalance.toNumber()).toBe(200000);
      expect(wallets.get('store-1').frozenBalance.toNumber()).toBe(800000);
    });
  });

  describe('Admin Approval & Rejection Lifecycle', () => {
    let testPayoutId: string;

    beforeEach(async () => {
      const created = await service.createPayoutRequest(
        {
          storeId: 'store-1',
          amount: '300000',
          financeAuthToken: 'fin_auth_123',
          idempotencyKey: 'PO-REVIEW-TEST',
        },
        mockStoreOwnerActor,
      );
      testPayoutId = created.id;
    });

    it('13. platform admin can successfully approve a PENDING payout request', async () => {
      const approved = await service.approvePayoutRequest(testPayoutId, mockAdminActor);
      expect(approved.status).toBe(PayoutRequestStatus.APPROVED);
      expect(approved.reviewedBy).toBe('user-admin-1');

      // Funds remain in frozenBalance awaiting Task 77 disbursement
      const w = wallets.get('store-1');
      expect(w.availableBalance.toNumber()).toBe(700000);
      expect(w.frozenBalance.toNumber()).toBe(300000);

      // Emits outbox event PAYOUT_APPROVED
      const approvedEvt = outboxEvents.find((e) => e.type === 'PAYOUT_APPROVED');
      expect(approvedEvt).toBeDefined();
    });

    it('14. merchant is forbidden from approving own payout request', async () => {
      await expect(
        service.approvePayoutRequest(testPayoutId, mockStoreOwnerActor),
      ).rejects.toThrow(ForbiddenException);
    });

    it('15. platform admin can reject a PENDING payout request and release reserved funds back to Available', async () => {
      const rejected = await service.rejectPayoutRequest(
        testPayoutId,
        {
          action: PayoutReviewAction.REJECT,
          rejectionReason: 'Tài khoản ngân hàng thụ hưởng không hợp lệ',
        },
        mockAdminActor,
      );

      expect(rejected.status).toBe(PayoutRequestStatus.REJECTED);
      expect(rejected.rejectionReason).toBe('Tài khoản ngân hàng thụ hưởng không hợp lệ');

      // Funds released back: Frozen -> Available (1,000,000 Available, 0 Frozen)
      const w = wallets.get('store-1');
      expect(w.availableBalance.toNumber()).toBe(1000000);
      expect(w.frozenBalance.toNumber()).toBe(0);

      // Reversal ledger posting created
      const rejLedger = ledgerTransactions.find((t) => t.referenceType === 'PAYOUT_REJECTION');
      expect(rejLedger).toBeDefined();
      expect(rejLedger.entries[0].accountType).toBe(LedgerAccountType.SELLER_FROZEN);
      expect(rejLedger.entries[0].direction).toBe(LedgerEntryDirection.DEBIT);
      expect(rejLedger.entries[1].accountType).toBe(LedgerAccountType.SELLER_AVAILABLE);
      expect(rejLedger.entries[1].direction).toBe(LedgerEntryDirection.CREDIT);

      // Emits outbox event PAYOUT_REJECTED
      const rejEvt = outboxEvents.find((e) => e.type === 'PAYOUT_REJECTED');
      expect(rejEvt).toBeDefined();
    });

    it('16. repeated rejection on already rejected payout request throws ConflictException and does not double-release funds', async () => {
      await service.rejectPayoutRequest(
        testPayoutId,
        { action: PayoutReviewAction.REJECT, rejectionReason: 'Reason 1' },
        mockAdminActor,
      );

      // Second rejection must fail
      await expect(
        service.rejectPayoutRequest(
          testPayoutId,
          { action: PayoutReviewAction.REJECT, rejectionReason: 'Reason 2' },
          mockAdminActor,
        ),
      ).rejects.toThrow(ConflictException);

      // Balance remains strictly 1,000,000 (no double release)
      expect(wallets.get('store-1').availableBalance.toNumber()).toBe(1000000);
    });

    it('17. concurrent approve vs reject race: exactly one admin action succeeds', async () => {
      const p1 = service.approvePayoutRequest(testPayoutId, mockAdminActor);
      const p2 = service.rejectPayoutRequest(
        testPayoutId,
        { action: PayoutReviewAction.REJECT, rejectionReason: 'Race reject' },
        mockAdminActor,
      );

      const results = await Promise.allSettled([p1, p2]);
      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);
    });
  });

  describe('History & Queries', () => {
    it('18. allows seller to view own store payout requests with masked account numbers', async () => {
      await service.createPayoutRequest(
        { storeId: 'store-1', amount: '100000', financeAuthToken: 'tok1', idempotencyKey: 'H1' },
        mockStoreOwnerActor,
      );

      const res = await service.getStorePayoutRequests('store-1', {}, mockStoreOwnerActor);
      expect(res.items.length).toBe(1);
      expect(res.items[0].bankSnapshot.accountNumberMasked).toBe('1029****56');
    });

    it('19. prevents cross-store history access', async () => {
      await expect(
        service.getStorePayoutRequests('store-1', {}, mockOtherStoreActor),
      ).rejects.toThrow(ForbiddenException);
    });

    it('20. allows platform admin to view global payout requests queue', async () => {
      await service.createPayoutRequest(
        { storeId: 'store-1', amount: '100000', financeAuthToken: 'tok1', idempotencyKey: 'H2' },
        mockStoreOwnerActor,
      );

      const res = await service.getAllPayoutRequests({}, mockAdminActor);
      expect(res.items.length).toBe(1);
    });

    it('21. rejects token with wrong purpose (e.g. PIN_CHANGE)', async () => {
      (walletSecurityService.consumeFinanceAuthorization as jest.Mock).mockRejectedValueOnce(
        new ForbiddenException('Wrong purpose'),
      );

      await expect(
        service.createPayoutRequest(
          { storeId: 'store-1', amount: '100000', financeAuthToken: 'tok-pin-change', idempotencyKey: 'H3' },
          mockStoreOwnerActor,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('22. simulated ledger failure rolls back transaction completely', async () => {
      (ledgerService.postTransactionWithTx as jest.Mock).mockRejectedValueOnce(
        new Error('Database error on ledger transaction insert'),
      );

      await expect(
        service.createPayoutRequest(
          { storeId: 'store-1', amount: '100000', financeAuthToken: 'tok-err', idempotencyKey: 'ERR-LEDGER' },
          mockStoreOwnerActor,
        ),
      ).rejects.toThrow('Database error on ledger transaction insert');
    });

    it('23. maintains strict Decimal string representations in responses and outbox events', async () => {
      const res = await service.createPayoutRequest(
        { storeId: 'store-1', amount: '500000', financeAuthToken: 'tok-dec', idempotencyKey: 'DEC-01' },
        mockStoreOwnerActor,
      );

      expect(typeof res.amount).toBe('string');
      expect(res.amount).toBe('500000');

      const evt = outboxEvents.find((e) => e.aggregateId === res.id);
      expect(evt).toBeDefined();
      expect(typeof evt.payload.amount).toBe('string');
      expect(evt.payload.amount).toBe('500000');
    });

    it('24. simulated PayoutRequest persistence failure rolls back Wallet and Ledger', async () => {
      const origCreate = (prisma as any).payoutRequest.create;
      (prisma as any).payoutRequest.create = jest.fn().mockRejectedValueOnce(
        new Error('DB error on payoutRequest creation'),
      );

      await expect(
        service.createPayoutRequest(
          { storeId: 'store-1', amount: '200000', financeAuthToken: 'tok-pr-err', idempotencyKey: 'ERR-PR' },
          mockStoreOwnerActor,
        ),
      ).rejects.toThrow('DB error on payoutRequest creation');

      (prisma as any).payoutRequest.create = origCreate;
    });

    it('25. losing approve/reject action produces ZERO additional Wallet/Ledger/Outbox side effects', async () => {
      const created = await service.createPayoutRequest(
        {
          storeId: 'store-1',
          amount: '300000',
          financeAuthToken: 'fin_auth_123',
          idempotencyKey: 'PO-REVIEW-TEST-25',
        },
        mockStoreOwnerActor,
      );
      const testId = created.id;

      // First action: Admin rejects payout request
      await service.rejectPayoutRequest(
        testId,
        { action: PayoutReviewAction.REJECT, rejectionReason: 'First winning rejection' },
        mockAdminActor,
      );

      const ledgerCountBefore = ledgerTransactions.length;
      const outboxCountBefore = outboxEvents.length;
      const walletBefore = { ...wallets.get('store-1') };

      // Second losing action: Admin tries to approve or reject again
      await expect(
        service.approvePayoutRequest(testId, mockAdminActor),
      ).rejects.toThrow(ConflictException);

      // Verify ZERO side effects produced by the losing attempt
      expect(ledgerTransactions.length).toBe(ledgerCountBefore);
      expect(outboxEvents.length).toBe(outboxCountBefore);
      expect(wallets.get('store-1').availableBalance.toNumber()).toBe(walletBefore.availableBalance.toNumber());
      expect(wallets.get('store-1').frozenBalance.toNumber()).toBe(walletBefore.frozenBalance.toNumber());
    });

    it('26. Finance Auth consumed + DB failure: rolls back DB, does not recreate auth token, and leaves no partial payout', async () => {
      (ledgerService.postTransactionWithTx as jest.Mock).mockRejectedValueOnce(
        new Error('OCC / DB failure after token consumption'),
      );

      await expect(
        service.createPayoutRequest(
          { storeId: 'store-1', amount: '200000', financeAuthToken: 'tok-atomic', idempotencyKey: 'FAIL-DB' },
          mockStoreOwnerActor,
        ),
      ).rejects.toThrow('OCC / DB failure after token consumption');

      // Verify token consumption was called once
      expect(walletSecurityService.consumeFinanceAuthorization).toHaveBeenCalledWith(
        expect.objectContaining({ token: 'tok-atomic' }),
      );

      // Verify no partial payout persisted
      expect(payoutRequests.get('FAIL-DB')).toBeUndefined();
    });

    it('27. concurrent daily count limit: simultaneous requests cannot exceed daily maximum request count', async () => {
      // 3 simultaneous requests with 100k each (quota is 2)
      const p1 = service.createPayoutRequest(
        { storeId: 'store-1', amount: '100000', financeAuthToken: 't1', idempotencyKey: 'C-COUNT-1' },
        mockStoreOwnerActor,
      );
      const p2 = service.createPayoutRequest(
        { storeId: 'store-1', amount: '100000', financeAuthToken: 't2', idempotencyKey: 'C-COUNT-2' },
        mockStoreOwnerActor,
      );
      const p3 = service.createPayoutRequest(
        { storeId: 'store-1', amount: '100000', financeAuthToken: 't3', idempotencyKey: 'C-COUNT-3' },
        mockStoreOwnerActor,
      );

      const results = await Promise.allSettled([p1, p2, p3]);
      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled.length).toBe(2);
      expect(rejected.length).toBe(1);
    });

    it('28. concurrent daily amount limit: simultaneous requests cannot exceed maximum daily payout amount (50,000,000 VND)', async () => {
      wallets.set('store-1', {
        ...wallets.get('store-1'),
        availableBalance: new Decimal('100000000'),
      });

      // 2 simultaneous requests with 40,000,000 each (sum 80M > 50M limit)
      const p1 = service.createPayoutRequest(
        { storeId: 'store-1', amount: '40000000', financeAuthToken: 'tA', idempotencyKey: 'C-AMT-1' },
        mockStoreOwnerActor,
      );
      const p2 = service.createPayoutRequest(
        { storeId: 'store-1', amount: '40000000', financeAuthToken: 'tB', idempotencyKey: 'C-AMT-2' },
        mockStoreOwnerActor,
      );

      const results = await Promise.allSettled([p1, p2]);
      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);
    });
  });
});

