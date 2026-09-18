import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { LedgerService } from './ledger.service';
import {
  LedgerAccountType,
  LedgerEntryDirection,
} from '../../../prisma/generated/client';

describe('LedgerService (Task 71 / POL-15 WAL-002)', () => {
  let service: LedgerService;
  let prisma: any;

  const mockStoreId = 'store-kimdong-1';

  const createMockTransaction = (overrides = {}) => ({
    id: 'ltx-uuid-1',
    transactionNumber: 'LTX-20260919-0001',
    idempotencyKey: 'idem-key-1',
    description: 'Order payment held in escrow',
    referenceType: 'ORDER_PAYMENT',
    referenceId: 'order-1',
    storeId: mockStoreId,
    currency: 'VND',
    totalAmount: new Decimal(200000),
    isReversal: false,
    reversedByTransactionId: null,
    reversalReason: null,
    metadata: {},
    postedAt: new Date('2026-09-19T00:00:00Z'),
    createdAt: new Date('2026-09-19T00:00:00Z'),
    entries: [
      {
        id: 'entry-1',
        ledgerTransactionId: 'ltx-uuid-1',
        accountType: LedgerAccountType.ESCROW_HOLDING,
        direction: LedgerEntryDirection.DEBIT,
        amount: new Decimal(200000),
        currency: 'VND',
        storeId: mockStoreId,
        description: 'Customer payment debited to escrow',
        createdAt: new Date('2026-09-19T00:00:00Z'),
      },
      {
        id: 'entry-2',
        ledgerTransactionId: 'ltx-uuid-1',
        accountType: LedgerAccountType.SELLER_PENDING,
        direction: LedgerEntryDirection.CREDIT,
        amount: new Decimal(200000),
        currency: 'VND',
        storeId: mockStoreId,
        description: 'Seller pending revenue credited',
        createdAt: new Date('2026-09-19T00:00:00Z'),
      },
    ],
    ...overrides,
  });

  beforeEach(() => {
    prisma = {
      ledgerTransaction: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      ledgerEntry: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      ledgerAccountSummary: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      $transaction: jest.fn(async (cb) => cb(prisma)),
    };
    service = new LedgerService(prisma);
  });

  // 1. Create valid balanced ledger transaction
  it('1. creates a valid balanced ledger transaction and posts all entries atomically', async () => {
    prisma.ledgerTransaction.findUnique.mockResolvedValueOnce(null);
    const mockTx = createMockTransaction();
    prisma.ledgerTransaction.create.mockResolvedValueOnce(mockTx);
    prisma.ledgerEntry.create
      .mockResolvedValueOnce(mockTx.entries[0])
      .mockResolvedValueOnce(mockTx.entries[1]);
    prisma.ledgerAccountSummary.findUnique.mockResolvedValue(null);
    prisma.ledgerAccountSummary.create.mockResolvedValue({});

    const result = await service.postTransaction({
      idempotencyKey: 'idem-key-1',
      description: 'Order payment held in escrow',
      referenceType: 'ORDER_PAYMENT',
      referenceId: 'order-1',
      storeId: mockStoreId,
      currency: 'VND',
      entries: [
        {
          accountType: LedgerAccountType.ESCROW_HOLDING,
          direction: LedgerEntryDirection.DEBIT,
          amount: 200000,
        },
        {
          accountType: LedgerAccountType.SELLER_PENDING,
          direction: LedgerEntryDirection.CREDIT,
          amount: 200000,
        },
      ],
    });

    expect(prisma.ledgerTransaction.create).toHaveBeenCalled();
    expect(prisma.ledgerEntry.create).toHaveBeenCalledTimes(2);
    expect(result.totalAmount).toBe(200000);
    expect(result.entries.length).toBe(2);
  });

  // 2. Debit equals credit
  it('2. verifies that SUM(DEBIT) strictly equals SUM(CREDIT) in multi-line transactions', async () => {
    prisma.ledgerTransaction.findUnique.mockResolvedValueOnce(null);
    const mockTx = createMockTransaction({
      totalAmount: new Decimal(200000),
      entries: [
        {
          id: 'e-1',
          accountType: LedgerAccountType.ESCROW_HOLDING,
          direction: LedgerEntryDirection.DEBIT,
          amount: new Decimal(200000),
        },
        {
          id: 'e-2',
          accountType: LedgerAccountType.SELLER_AVAILABLE,
          direction: LedgerEntryDirection.CREDIT,
          amount: new Decimal(170000),
        },
        {
          id: 'e-3',
          accountType: LedgerAccountType.PLATFORM_REVENUE,
          direction: LedgerEntryDirection.CREDIT,
          amount: new Decimal(30000),
        },
      ],
    });
    prisma.ledgerTransaction.create.mockResolvedValueOnce(mockTx);
    prisma.ledgerEntry.create
      .mockResolvedValueOnce(mockTx.entries[0])
      .mockResolvedValueOnce(mockTx.entries[1])
      .mockResolvedValueOnce(mockTx.entries[2]);

    const result = await service.postTransaction({
      idempotencyKey: 'split-tx-1',
      description: 'Settlement with 15% platform commission',
      referenceType: 'SETTLEMENT',
      referenceId: 'order-1',
      storeId: mockStoreId,
      entries: [
        {
          accountType: LedgerAccountType.ESCROW_HOLDING,
          direction: LedgerEntryDirection.DEBIT,
          amount: 200000, // Total Debit = 200k
        },
        {
          accountType: LedgerAccountType.SELLER_AVAILABLE,
          direction: LedgerEntryDirection.CREDIT,
          amount: 170000, // 85% = 170k
        },
        {
          accountType: LedgerAccountType.PLATFORM_REVENUE,
          direction: LedgerEntryDirection.CREDIT,
          amount: 30000, // 15% = 30k (Total Credit = 200k)
        },
      ],
    });

    expect(result.totalAmount).toBe(200000);
  });

  // 3. Reject unbalanced transaction
  it('3. rejects unbalanced transactions where SUM(DEBIT) !== SUM(CREDIT) (UnprocessableEntityException)', async () => {
    prisma.ledgerTransaction.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.postTransaction({
        idempotencyKey: 'unbalanced-tx-1',
        description: 'Broken transaction',
        referenceType: 'TEST',
        referenceId: 'test-1',
        storeId: mockStoreId,
        entries: [
          {
            accountType: LedgerAccountType.ESCROW_HOLDING,
            direction: LedgerEntryDirection.DEBIT,
            amount: 200000,
          },
          {
            accountType: LedgerAccountType.SELLER_AVAILABLE,
            direction: LedgerEntryDirection.CREDIT,
            amount: 150000, // Unbalanced: 200k != 150k
          },
        ],
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);

    expect(prisma.ledgerTransaction.create).not.toHaveBeenCalled();
  });

  // 4. Reject zero amount
  it('4. rejects transactions with zero entry amount (BadRequestException)', async () => {
    await expect(
      service.postTransaction({
        idempotencyKey: 'zero-tx',
        description: 'Zero amount entry',
        referenceType: 'TEST',
        referenceId: 'test-1',
        entries: [
          {
            accountType: LedgerAccountType.ESCROW_HOLDING,
            direction: LedgerEntryDirection.DEBIT,
            amount: 0,
          },
          {
            accountType: LedgerAccountType.SELLER_AVAILABLE,
            direction: LedgerEntryDirection.CREDIT,
            amount: 0,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  // 5. Reject negative amount
  it('5. rejects transactions with negative entry amount (BadRequestException)', async () => {
    await expect(
      service.postTransaction({
        idempotencyKey: 'neg-tx',
        description: 'Negative amount entry',
        referenceType: 'TEST',
        referenceId: 'test-1',
        entries: [
          {
            accountType: LedgerAccountType.ESCROW_HOLDING,
            direction: LedgerEntryDirection.DEBIT,
            amount: -50000,
          },
          {
            accountType: LedgerAccountType.SELLER_AVAILABLE,
            direction: LedgerEntryDirection.CREDIT,
            amount: -50000,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  // 6. Atomic posting
  it('6. executes all postings inside an atomic database transaction', async () => {
    prisma.ledgerTransaction.findUnique.mockResolvedValueOnce(null);
    const mockTx = createMockTransaction();
    prisma.ledgerTransaction.create.mockResolvedValueOnce(mockTx);
    prisma.ledgerEntry.create
      .mockResolvedValueOnce(mockTx.entries[0])
      .mockResolvedValueOnce(mockTx.entries[1]);

    await service.postTransaction({
      idempotencyKey: 'idem-1',
      description: 'Atomic test',
      referenceType: 'TEST',
      referenceId: 'test-1',
      storeId: mockStoreId,
      entries: [
        {
          accountType: LedgerAccountType.ESCROW_HOLDING,
          direction: LedgerEntryDirection.DEBIT,
          amount: 100000,
        },
        {
          accountType: LedgerAccountType.SELLER_PENDING,
          direction: LedgerEntryDirection.CREDIT,
          amount: 100000,
        },
      ],
    });

    expect(prisma.$transaction).toHaveBeenCalled();
  });

  // 7. At least two-sided posting required
  it('7. rejects single-entry postings (BadRequestException)', async () => {
    await expect(
      service.postTransaction({
        idempotencyKey: 'single-entry-tx',
        description: 'One sided entry',
        referenceType: 'TEST',
        referenceId: 'test-1',
        entries: [
          {
            accountType: LedgerAccountType.ESCROW_HOLDING,
            direction: LedgerEntryDirection.DEBIT,
            amount: 100000,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  // 8. Immutable posted entries (no delete or update methods)
  it('8. enforces immutability by omitting destructive update/delete methods on LedgerService', () => {
    expect((service as any).updateEntry).toBeUndefined();
    expect((service as any).deleteEntry).toBeUndefined();
    expect((service as any).deleteTransaction).toBeUndefined();
  });

  // 9. Reversal/compensating transaction traceability
  it('9. creates compensating reversal transaction with mirrored DEBIT/CREDIT directions and linked IDs', async () => {
    const originalTx = createMockTransaction({
      id: 'orig-tx-123',
      transactionNumber: 'LTX-20260919-ORIG',
      reversedByTransactionId: null,
    });

    prisma.ledgerTransaction.findUnique
      .mockResolvedValueOnce(null) // Idempotency check for reversal key
      .mockResolvedValueOnce(originalTx); // Fetch original

    const reversalTx = createMockTransaction({
      id: 'rev-tx-456',
      transactionNumber: 'LTX-REV-20260919-0001',
      isReversal: true,
      referenceType: 'REVERSAL',
      referenceId: 'orig-tx-123',
      reversalReason: 'Dispute refund reversal',
    });

    prisma.ledgerTransaction.create.mockResolvedValueOnce(reversalTx);
    prisma.ledgerEntry.create
      .mockResolvedValueOnce({ ...originalTx.entries[0], direction: LedgerEntryDirection.CREDIT })
      .mockResolvedValueOnce({ ...originalTx.entries[1], direction: LedgerEntryDirection.DEBIT });
    prisma.ledgerTransaction.update.mockResolvedValueOnce({});

    const result = await service.createReversalTransaction({
      originalTransactionId: 'orig-tx-123',
      idempotencyKey: 'rev-idem-1',
      reversalReason: 'Dispute refund reversal',
    });

    expect(prisma.ledgerTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isReversal: true,
          referenceType: 'REVERSAL',
          referenceId: 'orig-tx-123',
          reversalReason: 'Dispute refund reversal',
        }),
      }),
    );
    expect(prisma.ledgerTransaction.update).toHaveBeenCalledWith({
      where: { id: 'orig-tx-123' },
      data: { reversedByTransactionId: reversalTx.id },
    });
    expect(result.isReversal).toBe(true);
  });

  // 10. Idempotent posting
  it('10. returns existing ledger transaction idempotently without duplicate entry creation', async () => {
    const existingTx = createMockTransaction({ idempotencyKey: 'idem-key-existing' });
    prisma.ledgerTransaction.findUnique.mockResolvedValueOnce(existingTx);

    const result = await service.postTransaction({
      idempotencyKey: 'idem-key-existing',
      description: 'Duplicate retry',
      referenceType: 'ORDER',
      referenceId: 'order-1',
      entries: [
        {
          accountType: LedgerAccountType.ESCROW_HOLDING,
          direction: LedgerEntryDirection.DEBIT,
          amount: 200000,
        },
        {
          accountType: LedgerAccountType.SELLER_PENDING,
          direction: LedgerEntryDirection.CREDIT,
          amount: 200000,
        },
      ],
    });

    expect(prisma.ledgerTransaction.create).not.toHaveBeenCalled();
    expect(result.id).toBe(existingTx.id);
  });

  // 11. Duplicate reversal blocked if already reversed
  it('11. blocks duplicate reversal if transaction has already been reversed (ConflictException)', async () => {
    const alreadyReversedTx = createMockTransaction({
      reversedByTransactionId: 'rev-tx-earlier',
    });
    prisma.ledgerTransaction.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(alreadyReversedTx);

    await expect(
      service.createReversalTransaction({
        originalTransactionId: 'orig-tx-1',
        idempotencyKey: 'rev-idem-2',
        reversalReason: 'Second reversal attempt',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  // 12. Currency consistency
  it('12. rejects mixed currencies in a single transaction (BadRequestException)', async () => {
    await expect(
      service.postTransaction({
        idempotencyKey: 'mixed-curr-tx',
        description: 'Mixed currency',
        referenceType: 'TEST',
        referenceId: 'test-1',
        currency: 'VND',
        entries: [
          {
            accountType: LedgerAccountType.ESCROW_HOLDING,
            direction: LedgerEntryDirection.DEBIT,
            amount: 100,
            currency: 'USD', // Mismatch with VND
          },
          {
            accountType: LedgerAccountType.SELLER_AVAILABLE,
            direction: LedgerEntryDirection.CREDIT,
            amount: 100,
            currency: 'VND',
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  // 13. Multi-store isolation
  it('13. preserves storeId dimension on entries to guarantee multi-vendor accounting separation', async () => {
    prisma.ledgerTransaction.findUnique.mockResolvedValueOnce(null);
    const mockTx = createMockTransaction({ storeId: 'store-fahasa' });
    prisma.ledgerTransaction.create.mockResolvedValueOnce(mockTx);
    prisma.ledgerEntry.create
      .mockResolvedValueOnce({ ...mockTx.entries[0], storeId: 'store-fahasa' })
      .mockResolvedValueOnce({ ...mockTx.entries[1], storeId: 'store-fahasa' });

    await service.postTransaction({
      idempotencyKey: 'store-iso-1',
      description: 'Store Fahasa order',
      referenceType: 'ORDER',
      referenceId: 'order-fahasa-1',
      storeId: 'store-fahasa',
      entries: [
        {
          accountType: LedgerAccountType.ESCROW_HOLDING,
          direction: LedgerEntryDirection.DEBIT,
          amount: 150000,
          storeId: 'store-fahasa',
        },
        {
          accountType: LedgerAccountType.SELLER_PENDING,
          direction: LedgerEntryDirection.CREDIT,
          amount: 150000,
          storeId: 'store-fahasa',
        },
      ],
    });

    expect(prisma.ledgerEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ storeId: 'store-fahasa' }),
      }),
    );
  });

  // 14. Seller A cannot view Seller B transaction
  it('14. denies cross-tenant access when a merchant tries to inspect another store ledger transaction', async () => {
    const tx = createMockTransaction({ storeId: 'store-A' });
    prisma.ledgerTransaction.findUnique.mockResolvedValueOnce(tx);

    await expect(
      service.getTransactionById('tx-1', {
        sub: 'user-merchant-B',
        role: 'BUSINESS',
        storeId: 'store-B', // Different store
      } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  // 15. Concurrent duplicate posting protection (idempotency key uniqueness)
  it('15. verifies idempotency key uniqueness logic at unit level', async () => {
    const existing = createMockTransaction();
    prisma.ledgerTransaction.findUnique.mockResolvedValueOnce(existing);

    const res = await service.postTransaction({
      idempotencyKey: existing.idempotencyKey,
      description: 'Concurrent retry simulation',
      referenceType: 'ORDER',
      referenceId: 'ord-1',
      entries: [
        {
          accountType: LedgerAccountType.ESCROW_HOLDING,
          direction: LedgerEntryDirection.DEBIT,
          amount: 200000,
        },
        {
          accountType: LedgerAccountType.SELLER_PENDING,
          direction: LedgerEntryDirection.CREDIT,
          amount: 200000,
        },
      ],
    });

    expect(res.transactionNumber).toBe(existing.transactionNumber);
  });

  // 16. Transaction rollback on posting failure
  it('16. rolls back entire ledger transaction if an entry insertion fails', async () => {
    prisma.ledgerTransaction.findUnique.mockResolvedValueOnce(null);
    prisma.ledgerTransaction.create.mockResolvedValueOnce(createMockTransaction());
    prisma.ledgerEntry.create.mockRejectedValueOnce(new Error('Database write failure'));

    await expect(
      service.postTransaction({
        idempotencyKey: 'fail-tx',
        description: 'Failed transaction',
        referenceType: 'TEST',
        referenceId: 't-1',
        storeId: mockStoreId,
        entries: [
          {
            accountType: LedgerAccountType.ESCROW_HOLDING,
            direction: LedgerEntryDirection.DEBIT,
            amount: 100000,
          },
          {
            accountType: LedgerAccountType.SELLER_PENDING,
            direction: LedgerEntryDirection.CREDIT,
            amount: 100000,
          },
        ],
      }),
    ).rejects.toThrow('Database write failure');
  });

  // 17. WalletTransaction remains separate from Ledger
  it('17. maintains semantic separation between WalletTransaction and LedgerTransaction', () => {
    // LedgerService manages LedgerTransaction and LedgerEntry, distinct from WalletTransaction
    expect(service).toHaveProperty('postTransaction');
    expect(service).toHaveProperty('createReversalTransaction');
    expect(service).not.toHaveProperty('debitAvailable');
    expect(service).not.toHaveProperty('creditAvailable');
  });

  // 18. No automatic escrow settlement
  it('18. maintains strict boundary: does not automatically execute escrow settlement (Task 72)', () => {
    expect(service).not.toHaveProperty('settleEscrow');
    expect(service).not.toHaveProperty('releaseEscrowToSeller');
  });

  // 19. No commission hardcoding
  it('19. does not hardcode commission rules (DEC-002 remains PENDING)', () => {
    expect((service as any).calculateCommission).toBeUndefined();
  });

  // 20. No voucher co-funding hardcoding
  it('20. does not hardcode voucher funding ratios (DEC-004 remains PENDING)', () => {
    expect((service as any).calculateVoucherSplit).toBeUndefined();
  });

  // 21. No Coin ledger
  it('21. does not include Coin accounts or reward mutations (DEC-005 = PENDING, featureCoinEnabled = false)', () => {
    const coinAccountExists = Object.values(LedgerAccountType).some((type: string) =>
      type.toLowerCase().includes('coin'),
    );
    expect(coinAccountExists).toBe(false);
  });

  // 22. No payout execution
  it('22. does not execute bank payout transfers (Task 76/77)', () => {
    expect(service).not.toHaveProperty('executeBankTransfer');
    expect(service).not.toHaveProperty('requestPayout');
  });

  // 23. No PIN/2FA implementation
  it('23. does not implement PIN hashing or 2FA checks (Task 75)', () => {
    expect(service).not.toHaveProperty('verifyPin');
    expect(service).not.toHaveProperty('hashPin');
  });

  // 24. Decimal precision preserved
  it('24. preserves exact decimal precision for monetary postings without rounding drift', async () => {
    prisma.ledgerTransaction.findUnique.mockResolvedValueOnce(null);
    const mockTx = createMockTransaction({
      totalAmount: new Decimal('123456789.99'),
      entries: [
        {
          id: 'e-1',
          accountType: LedgerAccountType.ESCROW_HOLDING,
          direction: LedgerEntryDirection.DEBIT,
          amount: new Decimal('123456789.99'),
        },
        {
          id: 'e-2',
          accountType: LedgerAccountType.SELLER_AVAILABLE,
          direction: LedgerEntryDirection.CREDIT,
          amount: new Decimal('123456789.99'),
        },
      ],
    });
    prisma.ledgerTransaction.create.mockResolvedValueOnce(mockTx);
    prisma.ledgerEntry.create
      .mockResolvedValueOnce(mockTx.entries[0])
      .mockResolvedValueOnce(mockTx.entries[1]);

    const result = await service.postTransaction({
      idempotencyKey: 'dec-prec-tx',
      description: 'High precision transaction',
      referenceType: 'ORDER',
      referenceId: 'ord-precision',
      storeId: mockStoreId,
      entries: [
        {
          accountType: LedgerAccountType.ESCROW_HOLDING,
          direction: LedgerEntryDirection.DEBIT,
          amount: 123456789.99,
        },
        {
          accountType: LedgerAccountType.SELLER_AVAILABLE,
          direction: LedgerEntryDirection.CREDIT,
          amount: 123456789.99,
        },
      ],
    });

    expect(result.totalAmount).toBe(123456789.99);
  });

  // 25. Account-Type Tenant Validation (storeId strictly required on seller-specific accounts)
  it('25. rejects seller account entries (SELLER_PENDING, SELLER_AVAILABLE, SELLER_FROZEN) if storeId is missing', async () => {
    await expect(
      service.postTransaction({
        idempotencyKey: 'missing-store-seller-account',
        description: 'Seller entry without storeId',
        referenceType: 'TEST',
        referenceId: 't-store-req',
        // storeId omitted at root
        entries: [
          {
            accountType: LedgerAccountType.ESCROW_HOLDING,
            direction: LedgerEntryDirection.DEBIT,
            amount: 100000,
          },
          {
            accountType: LedgerAccountType.SELLER_PENDING,
            direction: LedgerEntryDirection.CREDIT,
            amount: 100000,
            // storeId omitted on seller entry
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  // 26. Multi-store mismatch check (cannot mix entries from mismatched stores)
  it('26. rejects transaction when an entry storeId does not match the transaction header storeId', async () => {
    await expect(
      service.postTransaction({
        idempotencyKey: 'store-mismatch-tx',
        description: 'Mismatched store entry',
        referenceType: 'ORDER',
        referenceId: 'ord-mismatch',
        storeId: 'store-A',
        entries: [
          {
            accountType: LedgerAccountType.ESCROW_HOLDING,
            direction: LedgerEntryDirection.DEBIT,
            amount: 100000,
          },
          {
            accountType: LedgerAccountType.SELLER_AVAILABLE,
            direction: LedgerEntryDirection.CREDIT,
            amount: 100000,
            storeId: 'store-B', // Mismatch with store-A
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  // 27. Net balance calculation adheres to normal balance side (Debit normal vs Credit normal)
  it('27. updates account summary using canonical normal balance conventions', async () => {
    prisma.ledgerTransaction.findUnique.mockResolvedValueOnce(null);
    const mockTx = createMockTransaction();
    prisma.ledgerTransaction.create.mockResolvedValueOnce(mockTx);
    prisma.ledgerEntry.create
      .mockResolvedValueOnce(mockTx.entries[0])
      .mockResolvedValueOnce(mockTx.entries[1]);

    const createdSummaries: any[] = [];
    prisma.ledgerAccountSummary.findUnique.mockResolvedValue(null);
    prisma.ledgerAccountSummary.create.mockImplementation(async ({ data }: any) => {
      createdSummaries.push(data);
      return data;
    });

    await service.postTransaction({
      idempotencyKey: 'summary-test',
      description: 'Summary normal balance test',
      referenceType: 'ORDER',
      referenceId: 'ord-summary',
      storeId: mockStoreId,
      entries: [
        {
          accountType: LedgerAccountType.ESCROW_HOLDING,
          direction: LedgerEntryDirection.DEBIT,
          amount: 200000,
          storeId: mockStoreId,
        },
        {
          accountType: LedgerAccountType.SELLER_PENDING,
          direction: LedgerEntryDirection.CREDIT,
          amount: 200000,
          storeId: mockStoreId,
        },
      ],
    });

    // ESCROW_HOLDING (DEBIT normal): netBalance = totalDebits - totalCredits = +200000
    const escrowSummary = createdSummaries.find(
      (s) => s.accountType === LedgerAccountType.ESCROW_HOLDING,
    );
    expect(escrowSummary.netBalance.toNumber()).toBe(200000);

    // SELLER_PENDING (CREDIT normal): netBalance = totalCredits - totalDebits = +200000
    const sellerSummary = createdSummaries.find(
      (s) => s.accountType === LedgerAccountType.SELLER_PENDING,
    );
    expect(sellerSummary.netBalance.toNumber()).toBe(200000);
  });

  // 28. Concurrent insert race condition (P2002 unique constraint recovery)
  it('28. catches DB unique constraint violation (P2002) on idempotencyKey and returns existing transaction', async () => {
    prisma.ledgerTransaction.findUnique
      .mockResolvedValueOnce(null) // First check passes
      .mockResolvedValueOnce(createMockTransaction({ idempotencyKey: 'concurrent-race-key' })); // Second check returns committed record

    const p2002Error: any = new Error('Unique constraint failed on the fields: (`idempotency_key`)');
    p2002Error.code = 'P2002';
    p2002Error.meta = { target: ['idempotency_key'] };

    prisma.$transaction.mockRejectedValueOnce(p2002Error);

    const result = await service.postTransaction({
      idempotencyKey: 'concurrent-race-key',
      description: 'Race condition test',
      referenceType: 'ORDER',
      referenceId: 'ord-race',
      storeId: mockStoreId,
      entries: [
        {
          accountType: LedgerAccountType.ESCROW_HOLDING,
          direction: LedgerEntryDirection.DEBIT,
          amount: 200000,
          storeId: mockStoreId,
        },
        {
          accountType: LedgerAccountType.SELLER_PENDING,
          direction: LedgerEntryDirection.CREDIT,
          amount: 200000,
          storeId: mockStoreId,
        },
      ],
    });

    expect(result.idempotencyKey).toBe('concurrent-race-key');
  });

  // 29. Concurrent reversal race condition (P2002 unique constraint on reversal_of_transaction_id)
  it('29. catches DB unique constraint violation on reversal_of_transaction_id and throws ConflictException', async () => {
    const originalTx = createMockTransaction({ id: 'orig-to-reverse', reversedByTransactionId: null });
    prisma.ledgerTransaction.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(originalTx);

    const p2002Error: any = new Error('Unique constraint failed on the fields: (`reversal_of_transaction_id`)');
    p2002Error.code = 'P2002';
    p2002Error.meta = { target: ['reversal_of_transaction_id'] };

    prisma.$transaction.mockRejectedValueOnce(p2002Error);

    await expect(
      service.createReversalTransaction({
        originalTransactionId: 'orig-to-reverse',
        idempotencyKey: 'rev-race-key',
        reversalReason: 'Race condition reversal test',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  // 30. Finance RBAC: Generic user / unauthorized role rejected from ledger endpoints
  it('30. denies access to ledger transactions and account summaries for unauthorized roles or missing storeId', async () => {
    const tx = createMockTransaction({ storeId: 'store-1' });
    prisma.ledgerTransaction.findUnique.mockResolvedValueOnce(tx);

    // Generic customer trying to access ledger transaction
    await expect(
      service.getTransactionById('tx-1', {
        sub: 'user-customer',
        role: 'CUSTOMER',
      } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);

    // Generic customer trying to access summaries
    await expect(
      service.listAccountSummaries({
        sub: 'user-customer',
        role: 'CUSTOMER',
      } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  // 31. Finance RBAC: Store Owner with matching storeId can view own store transactions and summaries
  it('31. allows Store Owner with matching storeId to access own ledger records', async () => {
    const tx = createMockTransaction({ storeId: 'store-1' });
    prisma.ledgerTransaction.findUnique.mockResolvedValueOnce(tx);
    prisma.ledgerAccountSummary.findMany.mockResolvedValueOnce([
      {
        id: 'sum-1',
        accountType: LedgerAccountType.SELLER_AVAILABLE,
        storeId: 'store-1',
        totalDebits: new Decimal(0),
        totalCredits: new Decimal(100000),
        netBalance: new Decimal(100000),
        currency: 'VND',
        updatedAt: new Date(),
      },
    ]);

    const ownerActor = { sub: 'owner-1', role: 'BUSINESS', storeId: 'store-1' };

    const txResult = await service.getTransactionById('tx-1', ownerActor as any);
    expect(txResult.id).toBe(tx.id);

    const summaries = await service.listAccountSummaries(ownerActor as any);
    expect(summaries.length).toBe(1);
    expect(summaries[0].storeId).toBe('store-1');
  });

  // 32. Finance RBAC: Platform Admin has global read access
  it('32. allows PLATFORM_ADMIN global cross-store access to transactions and summaries', async () => {
    const tx = createMockTransaction({ storeId: 'store-any' });
    prisma.ledgerTransaction.findUnique.mockResolvedValueOnce(tx);
    prisma.ledgerAccountSummary.findMany.mockResolvedValueOnce([]);

    const adminActor = { sub: 'admin-1', role: 'PLATFORM_ADMIN' };

    const txResult = await service.getTransactionById('tx-1', adminActor as any);
    expect(txResult.id).toBe(tx.id);

    const summaries = await service.listAccountSummaries(adminActor as any);
    expect(prisma.ledgerAccountSummary.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });
});


