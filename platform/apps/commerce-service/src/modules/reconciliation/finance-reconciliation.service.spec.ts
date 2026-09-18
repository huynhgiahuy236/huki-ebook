import { Test, TestingModule } from '@nestjs/testing';
import { FinanceReconciliationService } from './finance-reconciliation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import {
  LedgerAccountType,
  LedgerEntryDirection,
  OrderStatus,
  PaymentStatus,
  SellerOrderStatus,
} from '../../../prisma/generated/client';
import { BookActor } from '../../common/book-auth.guard';
import { DiscrepancyType, ReconciliationSeverity } from './dto/reconciliation.dto';
import { ForbiddenException } from '@nestjs/common';

describe('FinanceReconciliationService (Task 74 Financial Reconciliation & Audit Trail)', () => {
  let service: FinanceReconciliationService;
  let prisma: any;

  const mockAdminActor: BookActor = {
    sub: 'admin-user-1',
    role: 'PLATFORM_ADMIN',
  };

  const mockMerchantActor: BookActor = {
    sub: 'merchant-user-1',
    role: 'STORE_OWNER',
    storeId: 'store-1',
  } as any;

  beforeEach(async () => {
    let currentMockRun: any = {};

    prisma = {
      ledgerTransaction: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
      },
      ledgerEntry: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      ledgerAccountSummary: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({}),
      },
      wallet: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
      },
      walletTransaction: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      order: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      sellerOrder: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      store: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      sellerWallet: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
      },
      payoutRequest: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
      },
      financeReconciliationRun: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockImplementation((args) => {
          currentMockRun = { id: 'run-1', ...args.data };
          return Promise.resolve(currentMockRun);
        }),
        update: jest.fn().mockImplementation((args) => {
          currentMockRun = { ...currentMockRun, ...args.data };
          return Promise.resolve(currentMockRun);
        }),
      },
      outboxEvent: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn().mockImplementation((cb) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinanceReconciliationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<FinanceReconciliationService>(FinanceReconciliationService);
  });

  // =========================================================================
  // 1. HEALTHY SCENARIOS
  // =========================================================================
  it('1. returns status PASS with 0 discrepancies for a healthy store', async () => {
    const report = await service.reconcile({}, mockAdminActor);
    expect(report.status).toBe('PASS');
    expect(report.totalDiscrepancies).toBe(0);
    expect(report.discrepancies).toHaveLength(0);
  });

  // =========================================================================
  // 2. DOUBLE-ENTRY LEDGER INVARIANTS (WAL-002)
  // =========================================================================
  it('2. detects UNBALANCED_TRANSACTION when Sum(Debit) !== Sum(Credit) (WAL-002 violation)', async () => {
    prisma.ledgerTransaction.findMany.mockResolvedValue([
      {
        id: 'tx-unbalanced-1',
        transactionNumber: 'LTX-UNBALANCED',
        currency: 'VND',
        storeId: 'store-1',
        entries: [
          {
            id: 'e1',
            accountType: LedgerAccountType.ESCROW_HOLDING,
            direction: LedgerEntryDirection.DEBIT,
            amount: new Decimal(100000),
            currency: 'VND',
            storeId: null,
          },
          {
            id: 'e2',
            accountType: LedgerAccountType.SELLER_PENDING,
            direction: LedgerEntryDirection.CREDIT,
            amount: new Decimal(85000), // Mismatched credit
            currency: 'VND',
            storeId: 'store-1',
          },
        ],
      },
    ]);

    const report = await service.reconcile({}, mockAdminActor);
    expect(report.status).toBe('FAIL');
    expect(report.severityBreakdown.critical).toBeGreaterThan(0);
    const unb = report.discrepancies.find((d) => d.type === DiscrepancyType.UNBALANCED_TRANSACTION);
    expect(unb).toBeDefined();
    expect(unb?.severity).toBe(ReconciliationSeverity.CRITICAL);
  });

  it('3. detects INSUFFICIENT_ENTRIES when a transaction has fewer than 2 entries', async () => {
    prisma.ledgerTransaction.findMany.mockResolvedValue([
      {
        id: 'tx-single-entry',
        transactionNumber: 'LTX-SINGLE',
        currency: 'VND',
        entries: [
          {
            id: 'e1',
            accountType: LedgerAccountType.ESCROW_HOLDING,
            direction: LedgerEntryDirection.DEBIT,
            amount: new Decimal(100000),
            currency: 'VND',
          },
        ],
      },
    ]);

    const report = await service.reconcile({}, mockAdminActor);
    expect(report.discrepancies.some((d) => d.type === DiscrepancyType.INSUFFICIENT_ENTRIES)).toBe(true);
  });

  it('4. detects INVALID_ENTRY_AMOUNT when amount is zero or negative', async () => {
    prisma.ledgerTransaction.findMany.mockResolvedValue([
      {
        id: 'tx-zero-amt',
        transactionNumber: 'LTX-ZERO',
        currency: 'VND',
        entries: [
          {
            id: 'e1',
            accountType: LedgerAccountType.ESCROW_HOLDING,
            direction: LedgerEntryDirection.DEBIT,
            amount: new Decimal(0),
            currency: 'VND',
          },
          {
            id: 'e2',
            accountType: LedgerAccountType.SELLER_PENDING,
            direction: LedgerEntryDirection.CREDIT,
            amount: new Decimal(0),
            currency: 'VND',
            storeId: 'store-1',
          },
        ],
      },
    ]);

    const report = await service.reconcile({}, mockAdminActor);
    expect(report.discrepancies.some((d) => d.type === DiscrepancyType.INVALID_ENTRY_AMOUNT)).toBe(true);
  });

  it('5. detects CURRENCY_MISMATCH when entry currency differs from transaction currency', async () => {
    prisma.ledgerTransaction.findMany.mockResolvedValue([
      {
        id: 'tx-curr-mismatch',
        transactionNumber: 'LTX-CURR',
        currency: 'VND',
        entries: [
          {
            id: 'e1',
            accountType: LedgerAccountType.ESCROW_HOLDING,
            direction: LedgerEntryDirection.DEBIT,
            amount: new Decimal(100),
            currency: 'USD', // Mismatched currency
          },
          {
            id: 'e2',
            accountType: LedgerAccountType.SELLER_PENDING,
            direction: LedgerEntryDirection.CREDIT,
            amount: new Decimal(100),
            currency: 'VND',
            storeId: 'store-1',
          },
        ],
      },
    ]);

    const report = await service.reconcile({}, mockAdminActor);
    expect(report.discrepancies.some((d) => d.type === DiscrepancyType.CURRENCY_MISMATCH)).toBe(true);
  });

  it('6. detects MISSING_STORE_DIMENSION when seller accounts lack storeId', async () => {
    prisma.ledgerTransaction.findMany.mockResolvedValue([
      {
        id: 'tx-no-store',
        transactionNumber: 'LTX-NOSTORE',
        currency: 'VND',
        entries: [
          {
            id: 'e1',
            accountType: LedgerAccountType.ESCROW_HOLDING,
            direction: LedgerEntryDirection.DEBIT,
            amount: new Decimal(50000),
            currency: 'VND',
          },
          {
            id: 'e2',
            accountType: LedgerAccountType.SELLER_PENDING,
            direction: LedgerEntryDirection.CREDIT,
            amount: new Decimal(50000),
            currency: 'VND',
            storeId: null, // Missing required store dimension
          },
        ],
      },
    ]);

    const report = await service.reconcile({}, mockAdminActor);
    expect(report.discrepancies.some((d) => d.type === DiscrepancyType.MISSING_STORE_DIMENSION)).toBe(true);
  });

  // =========================================================================
  // 3. LEDGER ACCOUNT SUMMARY RECONCILIATION & REBUILD
  // =========================================================================
  it('7. detects SUMMARY_PROJECTION_DRIFT when summary differs from recomputed ledger entries', async () => {
    prisma.ledgerAccountSummary.findMany.mockResolvedValue([
      {
        id: 'sum-1',
        accountType: LedgerAccountType.SELLER_AVAILABLE,
        storeId: 'store-1',
        currency: 'VND',
        totalDebits: new Decimal(0),
        totalCredits: new Decimal(200000),
        netBalance: new Decimal(200000),
      },
    ]);

    // Recomputed actual entries sum to 300,000 credits
    prisma.ledgerEntry.findMany.mockImplementation(({ where }: any) => {
      if (where && where.ledgerTransaction) {
        return Promise.resolve([]); // No orphans
      }
      return Promise.resolve([
        {
          id: 'e1',
          accountType: LedgerAccountType.SELLER_AVAILABLE,
          direction: LedgerEntryDirection.CREDIT,
          amount: new Decimal(300000),
          currency: 'VND',
          storeId: 'store-1',
        },
      ]);
    });

    const report = await service.reconcile({}, mockAdminActor);
    expect(report.discrepancies.some((d) => d.type === DiscrepancyType.SUMMARY_PROJECTION_DRIFT)).toBe(true);
    expect(report.status).toBe('PASS_WITH_WARNINGS');
  });

  it('8. rebuildAccountSummaries correctly updates summary projection to match immutable entries', async () => {
    prisma.ledgerEntry.findMany.mockResolvedValue([
      {
        id: 'e1',
        accountType: LedgerAccountType.SELLER_AVAILABLE,
        direction: LedgerEntryDirection.CREDIT,
        amount: new Decimal(500000),
        currency: 'VND',
        storeId: 'store-1',
      },
    ]);

    prisma.ledgerAccountSummary.findMany.mockResolvedValue([
      {
        id: 'sum-1',
        accountType: LedgerAccountType.SELLER_AVAILABLE,
        storeId: 'store-1',
        currency: 'VND',
        totalDebits: new Decimal(0),
        totalCredits: new Decimal(200000), // Stale
        netBalance: new Decimal(200000),
      },
    ]);

    const res = await service.rebuildAccountSummaries({ dryRun: false }, mockAdminActor);
    expect(res.totalDriftCorrected).toBe(1);
    expect(prisma.ledgerAccountSummary.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          totalCredits: new Decimal(500000),
          netBalance: new Decimal(500000),
        }),
      }),
    );
  });

  it('9. rebuildAccountSummaries with dryRun=true returns preview without modifying DB', async () => {
    prisma.ledgerEntry.findMany.mockResolvedValue([
      {
        id: 'e1',
        accountType: LedgerAccountType.SELLER_AVAILABLE,
        direction: LedgerEntryDirection.CREDIT,
        amount: new Decimal(500000),
        currency: 'VND',
        storeId: 'store-1',
      },
    ]);

    const res = await service.rebuildAccountSummaries({ dryRun: true }, mockAdminActor);
    expect(res.dryRun).toBe(true);
    expect(res.adjustments).toHaveLength(1);
    expect(prisma.ledgerAccountSummary.upsert).not.toHaveBeenCalled();
  });

  // =========================================================================
  // 4. WALLET WAL-001 & NON-NEGATIVE BALANCES
  // =========================================================================
  it('10. detects NEGATIVE_BALANCE when available, pending, or frozen is negative', async () => {
    prisma.wallet.findMany.mockResolvedValue([
      {
        id: 'w-neg',
        storeId: 'store-1',
        availableBalance: new Decimal(-50000),
        pendingBalance: new Decimal(100000),
        frozenBalance: new Decimal(0),
      },
    ]);

    const report = await service.reconcile({}, mockAdminActor);
    expect(report.discrepancies.some((d) => d.type === DiscrepancyType.NEGATIVE_BALANCE)).toBe(true);
    expect(report.status).toBe('FAIL');
  });

  // =========================================================================
  // 5. PENDING BALANCE GROSS VS NET INVARIANT
  // =========================================================================
  it('11. reconciles Wallet pendingBalance against expected net proceeds (85% net of unsettled orders)', async () => {
    prisma.wallet.findMany.mockResolvedValue([
      {
        id: 'w-1',
        storeId: 'store-1',
        availableBalance: new Decimal(0),
        pendingBalance: new Decimal(85000),
        frozenBalance: new Decimal(0),
      },
    ]);

    prisma.wallet.findUnique.mockResolvedValue({
      id: 'w-1',
      storeId: 'store-1',
      availableBalance: new Decimal(0),
      pendingBalance: new Decimal(85000), // Correct net expected pending
      frozenBalance: new Decimal(0),
    });

    prisma.sellerOrder.findMany.mockResolvedValue([
      {
        id: 'so-1',
        storeId: 'store-1',
        grandTotal: new Decimal(100000), // Net = 85,000 VND
        status: SellerOrderStatus.PREPARING,
        order: {
          status: OrderStatus.PROCESSING,
          paymentStatus: PaymentStatus.SUCCEEDED,
          paymentMethod: 'PAYOS',
          statusHistory: [],
        },
      },
    ]);

    const report = await service.reconcile({}, mockAdminActor);
    expect(report.discrepancies.filter((d) => d.type === DiscrepancyType.PENDING_GROSS_NET_MISMATCH)).toHaveLength(0);
  });

  it('12. detects PENDING_GROSS_NET_MISMATCH when wallet pendingBalance differs from unsettled net proceeds', async () => {
    prisma.wallet.findMany.mockResolvedValue([
      {
        id: 'w-1',
        storeId: 'store-1',
        availableBalance: new Decimal(0),
        pendingBalance: new Decimal(100000),
        frozenBalance: new Decimal(0),
      },
    ]);

    prisma.wallet.findUnique.mockResolvedValue({
      id: 'w-1',
      storeId: 'store-1',
      availableBalance: new Decimal(0),
      pendingBalance: new Decimal(100000), // Mismatch: treated gross as net
      frozenBalance: new Decimal(0),
    });

    prisma.sellerOrder.findMany.mockResolvedValue([
      {
        id: 'so-1',
        storeId: 'store-1',
        grandTotal: new Decimal(100000), // Expected net = 85,000 VND
        status: SellerOrderStatus.PREPARING,
        order: {
          status: OrderStatus.PROCESSING,
          paymentStatus: PaymentStatus.SUCCEEDED,
          paymentMethod: 'PAYOS',
          statusHistory: [],
        },
      },
    ]);

    const report = await service.reconcile({}, mockAdminActor);
    expect(report.discrepancies.some((d) => d.type === DiscrepancyType.PENDING_GROSS_NET_MISMATCH)).toBe(true);
  });

  // =========================================================================
  // 6. AVAILABLE & FROZEN BALANCE INTEGRATION GAPS
  // =========================================================================
  it('13. detects ACCOUNTING_INTEGRATION_GAP when wallet available/frozen differs from ledger summary', async () => {
    prisma.wallet.findMany.mockResolvedValue([
      {
        id: 'w-1',
        storeId: 'store-1',
        availableBalance: new Decimal(500000),
        pendingBalance: new Decimal(0),
        frozenBalance: new Decimal(100000),
      },
    ]);

    prisma.wallet.findUnique.mockResolvedValue({
      id: 'w-1',
      storeId: 'store-1',
      availableBalance: new Decimal(500000),
      frozenBalance: new Decimal(100000),
    });

    prisma.ledgerAccountSummary.findUnique.mockImplementation(({ where }: any) => {
      if (where.accountType_storeId_currency.accountType === LedgerAccountType.SELLER_AVAILABLE) {
        return { netBalance: new Decimal(400000) }; // Discrepancy
      }
      if (where.accountType_storeId_currency.accountType === LedgerAccountType.SELLER_FROZEN) {
        return { netBalance: new Decimal(0) }; // Unmirrored freeze
      }
      return null;
    });

    const report = await service.reconcile({}, mockAdminActor);
    expect(report.discrepancies.some((d) => d.type === DiscrepancyType.ACCOUNTING_INTEGRATION_GAP)).toBe(true);
    expect(report.status).toBe('PASS_WITH_WARNINGS');
  });

  // =========================================================================
  // 7. PAYMENT INGESTION LIFECYCLE
  // =========================================================================
  it('14. detects MISSING_PAYMENT_INGESTION when paid order has no ESCROW_INGEST ledger transaction', async () => {
    prisma.order.findMany.mockResolvedValue([
      {
        id: 'ord-1',
        paymentStatus: PaymentStatus.SUCCEEDED,
        sellerOrders: [{ id: 'so-1', code: 'SO-1', storeId: 'store-1' }],
      },
    ]);

    prisma.ledgerTransaction.findUnique.mockResolvedValue(null); // Missing ingest

    const report = await service.reconcile({}, mockAdminActor);
    expect(report.discrepancies.some((d) => d.type === DiscrepancyType.MISSING_PAYMENT_INGESTION)).toBe(true);
  });

  it('15. detects MISSING_PENDING_WALLET_CREDIT when ledger ingestion exists but wallet transaction is missing', async () => {
    prisma.order.findMany.mockResolvedValue([
      {
        id: 'ord-1',
        paymentStatus: PaymentStatus.SUCCEEDED,
        sellerOrders: [{ id: 'so-1', code: 'SO-1', storeId: 'store-1' }],
      },
    ]);

    prisma.ledgerTransaction.findUnique.mockResolvedValue({ id: 'tx-ingest-1' });
    prisma.walletTransaction.findFirst.mockResolvedValue(null); // Missing wallet credit

    const report = await service.reconcile({}, mockAdminActor);
    expect(report.discrepancies.some((d) => d.type === DiscrepancyType.MISSING_PENDING_WALLET_CREDIT)).toBe(true);
  });

  // =========================================================================
  // 8. SETTLEMENT LIFECYCLE & OUTBOX
  // =========================================================================
  it('16. detects SETTLEMENT_WITHOUT_LEDGER when ESCROW_RELEASED order lacks settlement ledger transaction', async () => {
    prisma.sellerOrder.findMany.mockResolvedValue([
      {
        id: 'so-1',
        code: 'SO-1',
        storeId: 'store-1',
        order: {
          statusHistory: [{ toStatus: 'ESCROW_RELEASED', sellerOrderId: 'so-1' }],
        },
      },
    ]);

    prisma.ledgerTransaction.findUnique.mockResolvedValue(null); // Missing ledger settlement

    const report = await service.reconcile({}, mockAdminActor);
    expect(report.discrepancies.some((d) => d.type === DiscrepancyType.SETTLEMENT_WITHOUT_LEDGER)).toBe(true);
  });

  it('17. detects SETTLEMENT_WITHOUT_WALLET when settlement ledger exists but wallet transition is missing', async () => {
    prisma.sellerOrder.findMany.mockResolvedValue([
      {
        id: 'so-1',
        code: 'SO-1',
        storeId: 'store-1',
        order: {
          statusHistory: [{ toStatus: 'ESCROW_RELEASED', sellerOrderId: 'so-1' }],
        },
      },
    ]);

    prisma.ledgerTransaction.findUnique.mockResolvedValue({ id: 'tx-settle-1' });
    prisma.walletTransaction.findFirst.mockResolvedValue(null); // Missing wallet movement

    const report = await service.reconcile({}, mockAdminActor);
    expect(report.discrepancies.some((d) => d.type === DiscrepancyType.SETTLEMENT_WITHOUT_WALLET)).toBe(true);
  });

  it('18. detects MISSING_OUTBOX_EVENT when settlement completed but SETTLEMENT_COMPLETED event is absent', async () => {
    prisma.sellerOrder.findMany.mockResolvedValue([
      {
        id: 'so-1',
        code: 'SO-1',
        storeId: 'store-1',
        order: {
          statusHistory: [{ toStatus: 'ESCROW_RELEASED', sellerOrderId: 'so-1' }],
        },
      },
    ]);

    prisma.ledgerTransaction.findUnique.mockResolvedValue({ id: 'tx-settle-1' });
    prisma.walletTransaction.findFirst.mockResolvedValue({ id: 'wtx-settle-1' });
    prisma.outboxEvent.findFirst.mockResolvedValue(null); // Missing outbox event

    const report = await service.reconcile({}, mockAdminActor);
    expect(report.discrepancies.some((d) => d.type === DiscrepancyType.MISSING_OUTBOX_EVENT)).toBe(true);
  });

  // =========================================================================
  // 9. MULTI-TENANT ISOLATION & CROSS-STORE CONTAMINATION
  // =========================================================================
  it('19. detects CROSS_STORE_CONTAMINATION when Store A transaction contains Store B entry (CRITICAL)', async () => {
    prisma.ledgerTransaction.findMany.mockResolvedValue([
      {
        id: 'tx-cross-1',
        transactionNumber: 'LTX-CROSS',
        storeId: 'store-A',
        currency: 'VND',
        entries: [
          {
            id: 'e1',
            accountType: LedgerAccountType.SELLER_PENDING,
            direction: LedgerEntryDirection.DEBIT,
            amount: new Decimal(100000),
            currency: 'VND',
            storeId: 'store-A',
          },
          {
            id: 'e2',
            accountType: LedgerAccountType.SELLER_AVAILABLE,
            direction: LedgerEntryDirection.CREDIT,
            amount: new Decimal(100000),
            currency: 'VND',
            storeId: 'store-B', // Cross-store contamination!
          },
        ],
      },
    ]);

    const report = await service.reconcile({}, mockAdminActor);
    const cross = report.discrepancies.find((d) => d.type === DiscrepancyType.CROSS_STORE_CONTAMINATION);
    expect(cross).toBeDefined();
    expect(cross?.severity).toBe(ReconciliationSeverity.CRITICAL);
  });

  // =========================================================================
  // 10. RBAC & TENANT ISOLATION
  // =========================================================================
  it('20. forbids non-admin merchant from triggering global reconciliation', async () => {
    await expect(
      service.reconcile({ storeId: 'other-store-2' }, mockMerchantActor),
    ).rejects.toThrow(ForbiddenException);
  });

  it('21. forbids non-admin merchant from rebuilding account summaries', async () => {
    await expect(
      service.rebuildAccountSummaries({}, mockMerchantActor),
    ).rejects.toThrow(ForbiddenException);
  });

  // =========================================================================
  // 11. IMMUTABILITY & PRECISION
  // =========================================================================
  it('22. ensures reconciliation execution does NOT perform write mutations on historical records', async () => {
    await service.reconcile({}, mockAdminActor);
    expect(prisma.ledgerTransaction.findMany).toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled(); // No write transaction during audit
  });

  it('23. preserves Decimal precision across calculations without floating-point rounding errors', async () => {
    prisma.ledgerTransaction.findMany.mockResolvedValue([
      {
        id: 'tx-dec-1',
        transactionNumber: 'LTX-DEC',
        currency: 'VND',
        storeId: 'store-1',
        entries: [
          {
            id: 'e1',
            accountType: LedgerAccountType.ESCROW_HOLDING,
            direction: LedgerEntryDirection.DEBIT,
            amount: new Decimal('123456789.99'),
            currency: 'VND',
          },
          {
            id: 'e2',
            accountType: LedgerAccountType.SELLER_PENDING,
            direction: LedgerEntryDirection.CREDIT,
            amount: new Decimal('123456789.99'),
            currency: 'VND',
            storeId: 'store-1',
          },
        ],
      },
    ]);

    const report = await service.reconcile({}, mockAdminActor);
    expect(report.discrepancies.filter((d) => d.type === DiscrepancyType.UNBALANCED_TRANSACTION)).toHaveLength(0);
  });

  it('24. detects ORPHAN_ENTRY when a LedgerEntry has no parent LedgerTransaction', async () => {
    prisma.ledgerEntry.findMany.mockImplementation(({ where }: any) => {
      if (where && where.ledgerTransaction) {
        return Promise.resolve([
          {
            id: 'orphan-1',
            accountType: LedgerAccountType.ESCROW_HOLDING,
            amount: new Decimal(50000),
            currency: 'VND',
            storeId: null,
          },
        ]);
      }
      return Promise.resolve([]);
    });

    const report = await service.reconcile({}, mockAdminActor);
    const orphan = report.discrepancies.find((d) => d.type === DiscrepancyType.ORPHAN_ENTRY);
    expect(orphan).toBeDefined();
    expect(orphan?.severity).toBe(ReconciliationSeverity.CRITICAL);
  });

  it('25. reconciles multi-vendor master order with isolated sub-orders across Store A and Store B', async () => {
    prisma.wallet.findMany.mockResolvedValue([
      { id: 'w-A', storeId: 'store-A', availableBalance: new Decimal(0), pendingBalance: new Decimal(85000), frozenBalance: new Decimal(0) },
      { id: 'w-B', storeId: 'store-B', availableBalance: new Decimal(0), pendingBalance: new Decimal(170000), frozenBalance: new Decimal(0) },
    ]);

    prisma.wallet.findUnique.mockImplementation(({ where }: any) => {
      if (where.storeId === 'store-A') {
        return Promise.resolve({ id: 'w-A', storeId: 'store-A', availableBalance: new Decimal(0), pendingBalance: new Decimal(85000), frozenBalance: new Decimal(0) });
      }
      if (where.storeId === 'store-B') {
        return Promise.resolve({ id: 'w-B', storeId: 'store-B', availableBalance: new Decimal(0), pendingBalance: new Decimal(170000), frozenBalance: new Decimal(0) });
      }
      return Promise.resolve(null);
    });

    prisma.walletTransaction.findMany.mockImplementation(({ where }: any) => {
      if (where.walletId === 'w-A') {
        return Promise.resolve([
          { id: 'tx-A', walletId: 'w-A', availableAfter: new Decimal(0), pendingAfter: new Decimal(85000), frozenAfter: new Decimal(0), createdAt: new Date() },
        ]);
      }
      if (where.walletId === 'w-B') {
        return Promise.resolve([
          { id: 'tx-B', walletId: 'w-B', availableAfter: new Decimal(0), pendingAfter: new Decimal(170000), frozenAfter: new Decimal(0), createdAt: new Date() },
        ]);
      }
      return Promise.resolve([]);
    });

    prisma.sellerOrder.findMany.mockImplementation(({ where }: any) => {
      if (where.storeId === 'store-A') {
        return Promise.resolve([
          {
            id: 'so-A1',
            storeId: 'store-A',
            grandTotal: new Decimal(100000), // Net = 85,000 VND
            status: SellerOrderStatus.PREPARING,
            order: { status: OrderStatus.PROCESSING, paymentStatus: PaymentStatus.SUCCEEDED, statusHistory: [] },
          },
        ]);
      }
      if (where.storeId === 'store-B') {
        return Promise.resolve([
          {
            id: 'so-B1',
            storeId: 'store-B',
            grandTotal: new Decimal(200000), // Net = 170,000 VND
            status: SellerOrderStatus.PREPARING,
            order: { status: OrderStatus.PROCESSING, paymentStatus: PaymentStatus.SUCCEEDED, statusHistory: [] },
          },
        ]);
      }
      return Promise.resolve([]);
    });

    const report = await service.reconcile({}, mockAdminActor);
    expect(report.discrepancies.filter((d) => d.type === DiscrepancyType.PENDING_GROSS_NET_MISMATCH)).toHaveLength(0);
    expect(report.status).toBe('PASS');
  });

  it('26. supports date-filtered scoped queries and batchSize limits', async () => {
    const report = await service.reconcile(
      {
        dateFrom: '2026-09-01T00:00:00.000Z',
        dateTo: '2026-09-18T23:59:59.999Z',
        batchSize: 50,
      },
      mockAdminActor,
    );
    expect(report).toBeDefined();
    expect(prisma.ledgerTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 50,
        where: expect.objectContaining({
          postedAt: expect.any(Object),
        }),
      }),
    );
  });

  // =========================================================================
  // 9. PAYOUT RESERVATION & REVERSAL AUDIT (TASK 76)
  // =========================================================================
  it('27. detects PAYOUT_MISSING_WALLET_RESERVATION when an active PENDING payout has no wallet reservation', async () => {
    prisma.payoutRequest.findMany.mockResolvedValueOnce([
      {
        id: 'po-test-1',
        storeId: 'store-1',
        walletId: 'wallet-1',
        amount: new Decimal('500000'),
        status: 'PENDING',
      },
    ]);
    prisma.walletTransaction.findFirst.mockResolvedValueOnce(null); // Missing wallet reservation

    const report = await service.reconcile({}, mockAdminActor);
    const disc = report.discrepancies.find((d) => d.type === DiscrepancyType.PAYOUT_MISSING_WALLET_RESERVATION);
    expect(disc).toBeDefined();
    expect(disc?.severity).toBe(ReconciliationSeverity.CRITICAL);
    expect(report.status).toBe('FAIL');
  });

  it('28. detects PAYOUT_REJECTION_RELEASE_MISMATCH when a REJECTED payout has missing release', async () => {
    prisma.payoutRequest.findMany.mockResolvedValueOnce([
      {
        id: 'po-test-2',
        storeId: 'store-1',
        walletId: 'wallet-1',
        amount: new Decimal('200000'),
        status: 'REJECTED',
      },
    ]);
    prisma.walletTransaction.findFirst.mockResolvedValueOnce(null); // Missing release tx

    const report = await service.reconcile({}, mockAdminActor);
    const disc = report.discrepancies.find((d) => d.type === DiscrepancyType.PAYOUT_REJECTION_RELEASE_MISMATCH);
    expect(disc).toBeDefined();
    expect(disc?.severity).toBe(ReconciliationSeverity.CRITICAL);
    expect(report.status).toBe('FAIL');
  });

  it('29. detects PAYOUT_MISSING_DISBURSEMENT_WALLET when a COMPLETED payout lacks DEBIT_FROZEN wallet transaction', async () => {
    prisma.payoutRequest.findMany.mockResolvedValueOnce([
      {
        id: 'po-test-3',
        storeId: 'store-1',
        walletId: 'wallet-1',
        amount: new Decimal('300000'),
        status: 'COMPLETED',
      },
    ]);
    prisma.walletTransaction.findFirst.mockResolvedValueOnce(null); // Missing DEBIT_FROZEN

    const report = await service.reconcile({}, mockAdminActor);
    const disc = report.discrepancies.find((d) => d.type === DiscrepancyType.PAYOUT_MISSING_DISBURSEMENT_WALLET);
    expect(disc).toBeDefined();
    expect(disc?.severity).toBe(ReconciliationSeverity.CRITICAL);
    expect(report.status).toBe('FAIL');
  });

  it('30. detects PAYOUT_MISSING_DISBURSEMENT_LEDGER when a COMPLETED payout lacks PAYOUT_CLEARING ledger transaction', async () => {
    prisma.payoutRequest.findMany.mockResolvedValueOnce([
      {
        id: 'po-test-4',
        storeId: 'store-1',
        walletId: 'wallet-1',
        amount: new Decimal('400000'),
        status: 'COMPLETED',
      },
    ]);
    prisma.walletTransaction.findFirst.mockResolvedValueOnce({
      id: 'wtx-disb-1',
      walletId: 'wallet-1',
      type: 'DEBIT_FROZEN',
      amount: new Decimal('400000'),
    });
    prisma.ledgerTransaction.findFirst.mockResolvedValueOnce(null); // Missing ledger disbursement

    const report = await service.reconcile({}, mockAdminActor);
    const disc = report.discrepancies.find((d) => d.type === DiscrepancyType.PAYOUT_MISSING_DISBURSEMENT_LEDGER);
    expect(disc).toBeDefined();
    expect(disc?.severity).toBe(ReconciliationSeverity.CRITICAL);
    expect(report.status).toBe('FAIL');
  });

  // =========================================================================
  // TASK 78: EOD FINANCIAL RECONCILIATION & AUDIT REPORT GENERATION
  // =========================================================================

  it('31. runs EOD reconciliation successfully and persists immutable audit report', async () => {
    prisma.payoutRequest.findMany.mockResolvedValue([
      {
        id: 'po-eod-1',
        storeId: 'store-1',
        walletId: 'wallet-1',
        amount: new Decimal('500000'),
        status: 'COMPLETED',
        updatedAt: new Date(),
      },
    ]);
    prisma.walletTransaction.findFirst.mockResolvedValue({
      id: 'wtx-1',
      walletId: 'wallet-1',
      type: 'DEBIT_FROZEN',
      amount: new Decimal('500000'),
    });
    const mockDisbLedgerTx = {
      id: 'ltx-1',
      transactionNumber: 'LTX-001',
      currency: 'VND',
      storeId: 'store-1',
      entries: [
        {
          id: 'le-1',
          ledgerTransactionId: 'ltx-1',
          accountType: LedgerAccountType.SELLER_FROZEN,
          direction: LedgerEntryDirection.DEBIT,
          amount: new Decimal('500000'),
          storeId: 'store-1',
          currency: 'VND',
        },
        {
          id: 'le-2',
          ledgerTransactionId: 'ltx-1',
          accountType: LedgerAccountType.PAYOUT_CLEARING,
          direction: LedgerEntryDirection.CREDIT,
          amount: new Decimal('500000'),
          storeId: 'store-1',
          currency: 'VND',
        },
      ],
    };
    prisma.ledgerTransaction.findFirst.mockResolvedValue(mockDisbLedgerTx);
    prisma.ledgerTransaction.findUnique.mockImplementation((args: any) => {
      if (args?.where?.id === 'ltx-1') return Promise.resolve(mockDisbLedgerTx);
      return Promise.resolve(null);
    });
    prisma.ledgerTransaction.findMany.mockResolvedValue([mockDisbLedgerTx]);
    prisma.ledgerEntry.findMany.mockImplementation((args: any) => {
      if (args?.where?.ledgerTransaction) {
        return Promise.resolve([]); // No orphan entries
      }
      if (args?.where?.accountType) {
        return Promise.resolve(mockDisbLedgerTx.entries.filter((e) => e.accountType === args.where.accountType));
      }
      return Promise.resolve(mockDisbLedgerTx.entries);
    });
    prisma.ledgerAccountSummary.findMany.mockResolvedValue([
      {
        accountType: LedgerAccountType.PAYOUT_CLEARING,
        storeId: 'store-1',
        totalDebits: new Decimal(0),
        totalCredits: new Decimal('500000'),
        netBalance: new Decimal('-500000'), // Expected open credit balance
      },
    ]);

    const result = await service.runEodReconciliation(
      { businessDate: '2026-09-19' },
      mockAdminActor,
    );

    if (result.status !== 'COMPLETED_PASS') {
      console.log('REMAINING DISCREPANCY IN TEST 31:', JSON.stringify(result.discrepancies, null, 2));
    }

    expect(result).toBeDefined();
    expect(result.businessDate).toBe('2026-09-19');
    expect(result.timezone).toBe('Asia/Ho_Chi_Minh');
    expect(result.status).toBe('COMPLETED_PASS');
    expect(result.summary.externalCashAccountingStatus).toBe('GAP_NOT_PROVEN');
    expect(result.summary.externalBankProviderStatus).toBe('MOCK_PROVIDER_ONLY');
    expect(result.summary.payoutClearingDifference).toBe('0.00');
    expect(prisma.financeReconciliationRun.create).toHaveBeenCalled();
    expect(prisma.financeReconciliationRun.update).toHaveBeenCalled();
  });

  it('32. throws BadRequestException when a duplicate EOD run is already in progress for the same date/scope', async () => {
    prisma.financeReconciliationRun.findFirst.mockResolvedValueOnce({
      id: 'active-run-1',
      runNumber: 'EOD-20260919-RUN-01',
      businessDate: '2026-09-19',
      status: 'RUNNING',
      startedAt: new Date(), // Started just now
    });

    await expect(
      service.runEodReconciliation({ businessDate: '2026-09-19' }, mockAdminActor),
    ).rejects.toThrow('An EOD reconciliation run is already active for business date 2026-09-19');
  });

  it('33. allows reruns for the same business date and increments runNumber without mutating previous runs', async () => {
    prisma.financeReconciliationRun.findFirst.mockResolvedValueOnce(null); // No active RUNNING run
    prisma.financeReconciliationRun.count.mockResolvedValueOnce(2); // 2 previous runs exist

    const result = await service.runEodReconciliation(
      { businessDate: '2026-09-19' },
      mockAdminActor,
    );

    expect(result.runNumber).toBe('EOD-20260919-RUN-03');
  });

  it('34. does not flag expected open PAYOUT_CLEARING credit balance as corruption', async () => {
    prisma.payoutRequest.findMany.mockResolvedValue([
      {
        id: 'po-comp-1',
        storeId: 'store-1',
        walletId: 'wallet-1',
        amount: new Decimal('1000000'),
        status: 'COMPLETED',
        updatedAt: new Date(),
      },
    ]);
    prisma.walletTransaction.findFirst.mockResolvedValue({
      id: 'wtx-1',
      walletId: 'wallet-1',
      type: 'DEBIT_FROZEN',
      amount: new Decimal('1000000'),
    });
    prisma.ledgerTransaction.findFirst.mockResolvedValue({
      id: 'ltx-1',
      entries: [
        {
          accountType: LedgerAccountType.SELLER_FROZEN,
          direction: LedgerEntryDirection.DEBIT,
          amount: new Decimal('1000000'),
        },
        {
          accountType: LedgerAccountType.PAYOUT_CLEARING,
          direction: LedgerEntryDirection.CREDIT,
          amount: new Decimal('1000000'),
        },
      ],
    });
    prisma.ledgerEntry.findMany.mockResolvedValue([
      {
        accountType: LedgerAccountType.PAYOUT_CLEARING,
        direction: LedgerEntryDirection.CREDIT,
        amount: new Decimal('1000000'),
        storeId: 'store-1',
        currency: 'VND',
      },
    ]);
    prisma.ledgerAccountSummary.findMany.mockResolvedValue([
      {
        accountType: LedgerAccountType.PAYOUT_CLEARING,
        storeId: 'store-1',
        totalDebits: new Decimal(0),
        totalCredits: new Decimal('1000000'),
        netBalance: new Decimal('-1000000'), // Exactly matches -1000000
      },
    ]);

    const result = await service.runEodReconciliation(
      { businessDate: '2026-09-19' },
      mockAdminActor,
    );

    // No clearing discrepancy should be generated
    const clearingDisc = result.discrepancies.find((d) => d.entityId === 'PAYOUT_CLEARING');
    expect(clearingDisc).toBeUndefined();
    expect(result.summary.payoutClearingDifference).toBe('0.00');
  });

  it('35. detects unexpected PAYOUT_CLEARING discrepancy when actual balance diverges from completed payouts', async () => {
    prisma.payoutRequest.findMany.mockResolvedValue([
      {
        id: 'po-comp-2',
        storeId: 'store-1',
        walletId: 'wallet-1',
        amount: new Decimal('1000000'),
        status: 'COMPLETED',
        updatedAt: new Date(),
      },
    ]);
    prisma.walletTransaction.findFirst.mockResolvedValue({
      id: 'wtx-1',
      walletId: 'wallet-1',
      type: 'DEBIT_FROZEN',
      amount: new Decimal('1000000'),
    });
    prisma.ledgerTransaction.findFirst.mockResolvedValue({
      id: 'ltx-1',
      entries: [
        {
          accountType: LedgerAccountType.SELLER_FROZEN,
          direction: LedgerEntryDirection.DEBIT,
          amount: new Decimal('1000000'),
        },
        {
          accountType: LedgerAccountType.PAYOUT_CLEARING,
          direction: LedgerEntryDirection.CREDIT,
          amount: new Decimal('1000000'),
        },
      ],
    });
    prisma.ledgerAccountSummary.findMany.mockResolvedValue([
      {
        accountType: LedgerAccountType.PAYOUT_CLEARING,
        storeId: 'store-1',
        totalDebits: new Decimal(0),
        totalCredits: new Decimal('800000'),
        netBalance: new Decimal('-800000'), // Divergence: 200,000 difference
      },
    ]);

    const result = await service.runEodReconciliation(
      { businessDate: '2026-09-19' },
      mockAdminActor,
    );

    const clearingDisc = result.discrepancies.find((d) => d.entityId === 'PAYOUT_CLEARING');
    expect(clearingDisc).toBeDefined();
    expect(clearingDisc?.severity).toBe(ReconciliationSeverity.ERROR);
    expect(result.status).toBe('COMPLETED_FAIL');
  });

  it('36. reports stale PROCESSING payouts as warning', async () => {
    prisma.payoutRequest.findMany.mockResolvedValue([
      {
        id: 'po-stale-1',
        storeId: 'store-1',
        walletId: 'wallet-1',
        amount: new Decimal('200000'),
        status: 'PROCESSING',
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
    ]);
    prisma.walletTransaction.findFirst.mockResolvedValue({
      id: 'wtx-res-1',
      walletId: 'wallet-1',
      type: 'MOVE_AVAILABLE_TO_FROZEN',
      amount: new Decimal('200000'),
    });
    prisma.ledgerTransaction.findFirst.mockResolvedValue({
      id: 'ltx-res-1',
      entries: [
        {
          accountType: LedgerAccountType.SELLER_AVAILABLE,
          direction: LedgerEntryDirection.DEBIT,
          amount: new Decimal('200000'),
        },
        {
          accountType: LedgerAccountType.SELLER_FROZEN,
          direction: LedgerEntryDirection.CREDIT,
          amount: new Decimal('200000'),
        },
      ],
    });

    const result = await service.runEodReconciliation(
      { businessDate: '2026-09-19' },
      mockAdminActor,
    );

    expect(result.summary.staleProcessingPayouts).toBe(1);
    const staleDisc = result.discrepancies.find((d) => d.entityId === 'STALE_PROCESSING');
    expect(staleDisc).toBeDefined();
    expect(staleDisc?.severity).toBe(ReconciliationSeverity.WARNING);
    expect(result.status).toBe('COMPLETED_WARNING');
  });

  it('37. denies merchant from executing platform EOD reconciliation', async () => {
    await expect(
      service.runEodReconciliation({ businessDate: '2026-09-19' }, mockMerchantActor),
    ).rejects.toThrow(ForbiddenException);
  });

  it('38. denies merchant from querying EOD reconciliation runs history', async () => {
    await expect(
      service.getEodReconciliationRuns({}, mockMerchantActor),
    ).rejects.toThrow(ForbiddenException);
  });

  it('39. audits FAILED payout before refund: verifies reservation is still intact in FROZEN balance', async () => {
    prisma.payoutRequest.findMany.mockResolvedValue([
      {
        id: 'po-failed-1',
        storeId: 'store-1',
        walletId: 'wallet-1',
        amount: new Decimal('300000'),
        status: 'FAILED',
        updatedAt: new Date(),
      },
    ]);
    prisma.walletTransaction.findFirst.mockResolvedValue({
      id: 'wtx-res-1',
      walletId: 'wallet-1',
      referenceType: 'PAYOUT_REQUEST',
      referenceId: 'po-failed-1',
      type: 'MOVE_AVAILABLE_TO_FROZEN',
      amount: new Decimal('300000'),
    });
    prisma.ledgerTransaction.findFirst.mockResolvedValue({
      id: 'ltx-res-1',
      referenceType: 'PAYOUT_REQUEST',
      referenceId: 'po-failed-1',
      entries: [
        {
          accountType: LedgerAccountType.SELLER_AVAILABLE,
          direction: LedgerEntryDirection.DEBIT,
          amount: new Decimal('300000'),
        },
        {
          accountType: LedgerAccountType.SELLER_FROZEN,
          direction: LedgerEntryDirection.CREDIT,
          amount: new Decimal('300000'),
        },
      ],
    });

    const report = await service.reconcile({}, mockAdminActor);
    const payoutDiscs = report.discrepancies.filter((d) => d.entityId === 'po-failed-1');
    expect(payoutDiscs).toHaveLength(0);
  });

  it('40. audits FAILED payout after safe refund: status is REJECTED with PAYOUT_CANCEL_REFUND release', async () => {
    prisma.payoutRequest.findMany.mockResolvedValue([
      {
        id: 'po-refunded-1',
        storeId: 'store-1',
        walletId: 'wallet-1',
        amount: new Decimal('300000'),
        status: 'REJECTED',
        rejectionReason: '[HỦY DO LỖI CHUYỂN KHOẢN] Test refund',
        updatedAt: new Date(),
      },
    ]);
    prisma.walletTransaction.findFirst.mockResolvedValue({
      id: 'wtx-rel-1',
      walletId: 'wallet-1',
      referenceType: 'PAYOUT_CANCEL_REFUND',
      referenceId: 'po-refunded-1',
      type: 'MOVE_FROZEN_TO_AVAILABLE',
      amount: new Decimal('300000'),
    });
    prisma.ledgerTransaction.findFirst.mockResolvedValue({
      id: 'ltx-rel-1',
      referenceType: 'PAYOUT_CANCEL_REFUND',
      referenceId: 'po-refunded-1',
      entries: [
        {
          accountType: LedgerAccountType.SELLER_FROZEN,
          direction: LedgerEntryDirection.DEBIT,
          amount: new Decimal('300000'),
        },
        {
          accountType: LedgerAccountType.SELLER_AVAILABLE,
          direction: LedgerEntryDirection.CREDIT,
          amount: new Decimal('300000'),
        },
      ],
    });

    const report = await service.reconcile({}, mockAdminActor);
    const payoutDiscs = report.discrepancies.filter((d) => d.entityId === 'po-refunded-1');
    expect(payoutDiscs).toHaveLength(0);
  });

  it('41. flags AUDITABILITY_GAP when historical settlement lacks calculation metadata', async () => {
    prisma.sellerOrder.findMany.mockResolvedValue([
      {
        id: 'so-gap-1',
        code: 'SO-GAP-001',
        storeId: 'store-1',
        order: {
          id: 'ord-1',
          statusHistory: [{ toStatus: 'ESCROW_RELEASED', sellerOrderId: 'so-gap-1' }],
        },
      },
    ]);
    prisma.ledgerTransaction.findUnique.mockResolvedValue({
      id: 'ltx-so-1',
      transactionNumber: 'LTX-SETTLE-001',
      idempotencyKey: 'SETTLEMENT:so-gap-1',
      metadata: null, // Missing historical metadata
    });
    prisma.walletTransaction.findFirst.mockResolvedValue({
      id: 'wtx-so-1',
      referenceType: 'SETTLEMENT',
      referenceId: 'so-gap-1',
      amount: new Decimal('170000'),
    });
    prisma.outboxEvent.findFirst.mockResolvedValue({
      id: 'evt-1',
      type: 'SETTLEMENT_COMPLETED',
    });

    const report = await service.reconcile({}, mockAdminActor);
    const gapDisc = report.discrepancies.find((d) => d.type === DiscrepancyType.AUDITABILITY_GAP);
    expect(gapDisc).toBeDefined();
    expect(gapDisc?.severity).toBe(ReconciliationSeverity.WARNING);
    expect(gapDisc?.details).toContain('PolicyConfig fallback is intentionally omitted');
  });

  it('42. verifies rerun on same businessDate creates new run without modifying RUN-01', async () => {
    const run01Data = {
      id: 'run-1',
      runNumber: 'EOD-20260919-RUN-01',
      businessDate: '2026-09-19',
      status: 'COMPLETED_PASS',
      summary: { totalChecked: 10 },
      counts: { totalChecked: 10, totalMatched: 10 },
      completedAt: new Date('2026-09-19T10:00:00Z'),
    };

    prisma.financeReconciliationRun.findMany.mockResolvedValue([run01Data]);
    prisma.financeReconciliationRun.findFirst.mockResolvedValue(null); // No active RUNNING

    const run02 = await service.runEodReconciliation(
      { businessDate: '2026-09-19' },
      mockAdminActor,
    );

    expect(run02.runNumber).toBe('EOD-20260919-RUN-02');
    // Verify prisma.update was called with run02's id, never run-1
    expect(prisma.financeReconciliationRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: run02.id },
      }),
    );
  });

  it('43. retries run number generation on unique constraint collision (P2002)', async () => {
    prisma.financeReconciliationRun.findMany.mockResolvedValue([
      { runNumber: 'EOD-20260919-RUN-01' },
    ]);
    prisma.financeReconciliationRun.findFirst.mockResolvedValue(null);

    // Fail first create with P2002, succeed on second attempt
    const p2002Error: any = new Error('Unique constraint failed on the fields: (`run_number`)');
    p2002Error.code = 'P2002';

    prisma.financeReconciliationRun.create
      .mockRejectedValueOnce(p2002Error)
      .mockResolvedValueOnce({
        id: 'run-retry-2',
        runNumber: 'EOD-20260919-RUN-03',
        businessDate: '2026-09-19',
        timezone: 'Asia/Ho_Chi_Minh',
        status: 'RUNNING',
      });

    const result = await service.runEodReconciliation(
      { businessDate: '2026-09-19' },
      mockAdminActor,
    );

    expect(prisma.financeReconciliationRun.create).toHaveBeenCalledTimes(2);
    expect(result).toBeDefined();
  });
});


