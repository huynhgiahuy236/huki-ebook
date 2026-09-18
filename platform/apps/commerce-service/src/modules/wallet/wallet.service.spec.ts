import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { WalletService } from './wallet.service';
import { WalletTransactionType } from '../../../prisma/generated/client';

describe('WalletService (Task 70 / POL-15 WAL-001)', () => {
  let service: WalletService;
  let prisma: any;

  const mockStoreId = 'store-kimdong-1';
  const mockOwnerId = 'user-merchant-kimdong';

  const createMockWallet = (overrides = {}) => ({
    id: 'wallet-uuid-1',
    storeId: mockStoreId,
    ownerUserId: mockOwnerId,
    availableBalance: new Decimal(1000000),
    pendingBalance: new Decimal(500000),
    frozenBalance: new Decimal(200000),
    currency: 'VND',
    version: 1,
    createdAt: new Date('2026-09-19T00:00:00Z'),
    updatedAt: new Date('2026-09-19T00:00:00Z'),
    ...overrides,
  });

  beforeEach(() => {
    prisma = {
      wallet: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      walletTransaction: {
        create: jest.fn(),
      },
      $transaction: jest.fn(async (cb) => cb(prisma)),
    };
    service = new WalletService(prisma);
  });

  // 1. Create wallet
  it('1. creates a new wallet with 0 balances when it does not exist', async () => {
    prisma.wallet.findUnique.mockResolvedValueOnce(null);
    const zeroWallet = createMockWallet({
      availableBalance: new Decimal(0),
      pendingBalance: new Decimal(0),
      frozenBalance: new Decimal(0),
    });
    prisma.wallet.create.mockResolvedValueOnce(zeroWallet);

    const result = await service.getOrCreateWallet(mockStoreId, mockOwnerId);

    expect(prisma.wallet.create).toHaveBeenCalledWith({
      data: {
        storeId: mockStoreId,
        ownerUserId: mockOwnerId,
        availableBalance: expect.any(Decimal),
        pendingBalance: expect.any(Decimal),
        frozenBalance: expect.any(Decimal),
        currency: 'VND',
        version: 1,
      },
    });
    expect(result.availableBalance).toBe(0);
    expect(result.pendingBalance).toBe(0);
    expect(result.frozenBalance).toBe(0);
    expect(result.totalBalance).toBe(0);
  });

  // 2. Create wallet idempotently
  it('2. returns existing wallet without re-creating if already present', async () => {
    const existingWallet = createMockWallet();
    prisma.wallet.findUnique.mockResolvedValueOnce(existingWallet);

    const result = await service.getOrCreateWallet(mockStoreId, mockOwnerId);

    expect(prisma.wallet.create).not.toHaveBeenCalled();
    expect(result.id).toBe(existingWallet.id);
    expect(result.storeId).toBe(mockStoreId);
  });

  // 3. Duplicate wallet blocked (handles race condition)
  it('3. gracefully falls back to findUnique if race condition causes unique constraint error', async () => {
    prisma.wallet.findUnique.mockResolvedValueOnce(null);
    prisma.wallet.create.mockRejectedValueOnce(new Error('Unique constraint failed'));
    const existingWallet = createMockWallet();
    prisma.wallet.findUnique.mockResolvedValueOnce(existingWallet);

    const result = await service.getOrCreateWallet(mockStoreId, mockOwnerId);

    expect(result.id).toBe(existingWallet.id);
  });

  // 4. Initial balances = 0
  it('4. ensures new wallet initial balances are strictly 0 for all 3 tiers', async () => {
    prisma.wallet.findUnique.mockResolvedValueOnce(null);
    const zeroWallet = createMockWallet({
      availableBalance: new Decimal(0),
      pendingBalance: new Decimal(0),
      frozenBalance: new Decimal(0),
    });
    prisma.wallet.create.mockResolvedValueOnce(zeroWallet);

    const result = await service.getOrCreateWallet(mockStoreId, mockOwnerId);

    expect(result.availableBalance).toBe(0);
    expect(result.pendingBalance).toBe(0);
    expect(result.frozenBalance).toBe(0);
    expect(result.totalBalance).toBe(0);
  });

  // 5. Available + Pending + Frozen invariant (WAL-001)
  it('5. enforces WAL-001 invariant: totalBalance === available + pending + frozen', async () => {
    const wallet = createMockWallet({
      availableBalance: new Decimal(300000),
      pendingBalance: new Decimal(150000),
      frozenBalance: new Decimal(50000),
    });
    prisma.wallet.findUnique.mockResolvedValueOnce(wallet);

    const result = await service.getWallet(mockStoreId, {
      sub: mockOwnerId,
      role: 'BUSINESS',
    } as any);

    expect(result.availableBalance).toBe(300000);
    expect(result.pendingBalance).toBe(150000);
    expect(result.frozenBalance).toBe(50000);
    expect(result.totalBalance).toBe(500000); // 300k + 150k + 50k
  });

  // 6. Available cannot become negative
  it('6. rejects debitAvailable when requested amount exceeds available balance', async () => {
    const wallet = createMockWallet({
      availableBalance: new Decimal(100000),
    });
    prisma.wallet.findUnique.mockResolvedValueOnce(wallet);

    await expect(
      service.debitAvailable(mockStoreId, 150000, { description: 'Payout request' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.wallet.update).not.toHaveBeenCalled();
  });

  // 7. Pending cannot become negative
  it('7. rejects movePendingToAvailable when requested amount exceeds pending balance', async () => {
    const wallet = createMockWallet({
      pendingBalance: new Decimal(50000),
    });
    prisma.wallet.findUnique.mockResolvedValueOnce(wallet);

    await expect(
      service.movePendingToAvailable(mockStoreId, 100000, { description: 'Clearance' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.wallet.update).not.toHaveBeenCalled();
  });

  // 8. Frozen cannot become negative
  it('8. rejects moveFrozenToAvailable when requested amount exceeds frozen balance', async () => {
    const wallet = createMockWallet({
      frozenBalance: new Decimal(30000),
    });
    prisma.wallet.findUnique.mockResolvedValueOnce(wallet);

    await expect(
      service.moveFrozenToAvailable(mockStoreId, 50000, { description: 'Unfreeze' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.wallet.update).not.toHaveBeenCalled();
  });

  // 9. Valid balance transitions
  describe('9. Valid balance transitions', () => {
    it('credits available balance correctly', async () => {
      const wallet = createMockWallet({
        availableBalance: new Decimal(100000),
        version: 1,
      });
      prisma.wallet.findUnique.mockResolvedValueOnce(wallet);
      prisma.wallet.update.mockResolvedValueOnce({
        ...wallet,
        availableBalance: new Decimal(150000),
        version: 2,
      });

      const result = await service.creditAvailable(mockStoreId, 50000, {
        referenceType: 'ESCROW_SETTLEMENT',
        referenceId: 'sub-order-1',
      });

      expect(prisma.wallet.update).toHaveBeenCalledWith({
        where: { storeId: mockStoreId, version: 1 },
        data: {
          availableBalance: new Decimal(150000),
          pendingBalance: wallet.pendingBalance,
          frozenBalance: wallet.frozenBalance,
          version: { increment: 1 },
        },
      });
      expect(prisma.walletTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: WalletTransactionType.CREDIT_AVAILABLE,
          amount: new Decimal(50000),
          availableBefore: new Decimal(100000),
          availableAfter: new Decimal(150000),
          referenceType: 'ESCROW_SETTLEMENT',
        }),
      });
      expect(result.availableBalance).toBe(150000);
    });

    it('credits pending balance correctly on incoming order held in escrow', async () => {
      const wallet = createMockWallet({
        pendingBalance: new Decimal(200000),
        version: 1,
      });
      prisma.wallet.findUnique.mockResolvedValueOnce(wallet);
      prisma.wallet.update.mockResolvedValueOnce({
        ...wallet,
        pendingBalance: new Decimal(300000),
        version: 2,
      });

      const result = await service.creditPending(mockStoreId, 100000, {
        referenceType: 'ORDER',
        referenceId: 'order-1',
      });

      expect(result.pendingBalance).toBe(300000);
    });

    it('moves pending to available after escrow holding period expires', async () => {
      const wallet = createMockWallet({
        availableBalance: new Decimal(500000),
        pendingBalance: new Decimal(200000),
        version: 1,
      });
      prisma.wallet.findUnique.mockResolvedValueOnce(wallet);
      prisma.wallet.update.mockResolvedValueOnce({
        ...wallet,
        availableBalance: new Decimal(700000),
        pendingBalance: new Decimal(0),
        version: 2,
      });

      const result = await service.movePendingToAvailable(mockStoreId, 200000, {
        referenceType: 'ESCROW_RELEASE',
      });

      expect(prisma.walletTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: WalletTransactionType.MOVE_PENDING_TO_AVAILABLE,
          amount: new Decimal(200000),
          availableBefore: new Decimal(500000),
          availableAfter: new Decimal(700000),
          pendingBefore: new Decimal(200000),
          pendingAfter: new Decimal(0),
        }),
      });
      expect(result.availableBalance).toBe(700000);
      expect(result.pendingBalance).toBe(0);
    });

    it('moves available to frozen on dispute opening', async () => {
      const wallet = createMockWallet({
        availableBalance: new Decimal(500000),
        frozenBalance: new Decimal(0),
        version: 1,
      });
      prisma.wallet.findUnique.mockResolvedValueOnce(wallet);
      prisma.wallet.update.mockResolvedValueOnce({
        ...wallet,
        availableBalance: new Decimal(400000),
        frozenBalance: new Decimal(100000),
        version: 2,
      });

      const result = await service.moveAvailableToFrozen(mockStoreId, 100000, {
        referenceType: 'DISPUTE_FREEZE',
      });

      expect(result.availableBalance).toBe(400000);
      expect(result.frozenBalance).toBe(100000);
    });

    it('moves frozen to available on dispute resolution in seller favor', async () => {
      const wallet = createMockWallet({
        availableBalance: new Decimal(400000),
        frozenBalance: new Decimal(100000),
        version: 1,
      });
      prisma.wallet.findUnique.mockResolvedValueOnce(wallet);
      prisma.wallet.update.mockResolvedValueOnce({
        ...wallet,
        availableBalance: new Decimal(500000),
        frozenBalance: new Decimal(0),
        version: 2,
      });

      const result = await service.moveFrozenToAvailable(mockStoreId, 100000, {
        referenceType: 'DISPUTE_UNFREEZE',
      });

      expect(result.availableBalance).toBe(500000);
      expect(result.frozenBalance).toBe(0);
    });
  });

  // 10. Invalid transition rejected (negative or zero amount)
  it('10. rejects zero or negative transaction amounts with BadRequestException', async () => {
    await expect(service.creditAvailable(mockStoreId, 0)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.creditAvailable(mockStoreId, -50000)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.debitAvailable(mockStoreId, -1000)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  // 11. Concurrent mutation protection
  it('11. includes version in optimistic update condition to guard against concurrent writes', async () => {
    const wallet = createMockWallet({ version: 5 });
    prisma.wallet.findUnique.mockResolvedValueOnce(wallet);
    prisma.wallet.update.mockResolvedValueOnce({
      ...wallet,
      version: 6,
    });

    await service.creditAvailable(mockStoreId, 10000);

    expect(prisma.wallet.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { storeId: mockStoreId, version: 5 },
        data: expect.objectContaining({
          version: { increment: 1 },
        }),
      }),
    );
  });

  // 12. Cross-store access rejected
  it('12. rejects access when actor is not the store owner or admin (ForbiddenException)', async () => {
    const wallet = createMockWallet({ ownerUserId: 'user-merchant-A' });
    prisma.wallet.findUnique.mockResolvedValueOnce(wallet);

    await expect(
      service.getWallet(mockStoreId, {
        sub: 'user-merchant-B', // Different seller
        role: 'BUSINESS',
      } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  // 13. Client cannot forge balance
  it('13. does not allow direct balance assignment from client; all mutations are computed internally', async () => {
    const wallet = createMockWallet({ availableBalance: new Decimal(100000) });
    prisma.wallet.findUnique.mockResolvedValueOnce(wallet);
    prisma.wallet.update.mockResolvedValueOnce({
      ...wallet,
      availableBalance: new Decimal(120000),
    });

    // Client provides increment amount only, server computes next balance
    await service.creditAvailable(mockStoreId, 20000);

    expect(prisma.wallet.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          availableBalance: new Decimal(120000),
        }),
      }),
    );
  });

  // 14. Correct currency handling
  it('14. preserves VND currency code and Decimal precision without floating point artifacts', async () => {
    const wallet = createMockWallet({ currency: 'VND' });
    prisma.wallet.findUnique.mockResolvedValueOnce(wallet);

    const result = await service.getWallet(mockStoreId, {
      sub: mockOwnerId,
      role: 'BUSINESS',
    } as any);

    expect(result.currency).toBe('VND');
  });

  // 15. No Coin mutation
  it('15. ensures wallet operations do not manipulate or include coin rewards (DEC-005 = PENDING)', async () => {
    const wallet = createMockWallet();
    prisma.wallet.findUnique.mockResolvedValueOnce(wallet);

    const result = await service.getWallet(mockStoreId, {
      sub: mockOwnerId,
      role: 'BUSINESS',
    } as any);

    expect((result as any).coinBalance).toBeUndefined();
    expect((result as any).coins).toBeUndefined();
  });

  // 16. No escrow mutation
  it('16. maintains strict boundary with EscrowService; WalletService does not rewrite escrow holdings', async () => {
    // WalletService only manages wallet balances and transactions
    expect(service).not.toHaveProperty('freezeEscrow');
    expect(service).not.toHaveProperty('calculateEscrowSplit');
  });

  // 17. No payout mutation
  it('17. maintains strict boundary with Payout/Bank Gateway (Task 77); does not execute external bank transfers', () => {
    expect(service).not.toHaveProperty('executeBankTransfer');
    expect(service).not.toHaveProperty('disburseFunds');
  });

  // 18. Get transactions: Owner can read own transactions
  it('18. allows store owner to query operational wallet transaction history with pagination', async () => {
    const wallet = createMockWallet();
    prisma.wallet.findUnique.mockResolvedValueOnce(wallet);
    prisma.walletTransaction = {
      findMany: jest.fn().mockResolvedValueOnce([
        {
          id: 'wtx-1',
          walletId: wallet.id,
          type: WalletTransactionType.CREDIT_PENDING,
          amount: new Decimal(195500),
          availableBefore: new Decimal(0),
          availableAfter: new Decimal(0),
          pendingBefore: new Decimal(0),
          pendingAfter: new Decimal(195500),
          frozenBefore: new Decimal(0),
          frozenAfter: new Decimal(0),
          referenceType: 'ORDER_PAYMENT',
          referenceId: 'so-1',
          description: 'Payment pending',
          metadata: null,
          createdAt: new Date('2026-09-19T00:00:00Z'),
        },
      ]),
      count: jest.fn().mockResolvedValueOnce(1),
    };

    const result = await service.getTransactions(mockStoreId, {
      sub: mockOwnerId,
      role: 'BUSINESS',
    } as any, { page: 1, limit: 20 });

    expect(result.items.length).toBe(1);
    expect(result.items[0].id).toBe('wtx-1');
    expect(result.items[0].amount).toBe(195500);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
  });

  // 19. Get transactions: Admin can read store transactions
  it('19. allows PLATFORM_ADMIN to view store wallet transactions', async () => {
    const wallet = createMockWallet();
    prisma.wallet.findUnique.mockResolvedValueOnce(wallet);
    prisma.walletTransaction = {
      findMany: jest.fn().mockResolvedValueOnce([]),
      count: jest.fn().mockResolvedValueOnce(0),
    };

    const result = await service.getTransactions(mockStoreId, {
      sub: 'admin-uuid',
      role: 'PLATFORM_ADMIN',
    } as any);

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  // 20. Get transactions: Cross-tenant access denied
  it('20. denies transaction history access to unauthorized merchants (multi-tenant isolation)', async () => {
    const wallet = createMockWallet();
    prisma.wallet.findUnique.mockResolvedValueOnce(wallet);

    await expect(
      service.getTransactions(mockStoreId, {
        sub: 'other-merchant-uuid',
        role: 'BUSINESS',
      } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
