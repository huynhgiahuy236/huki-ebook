import {
  BadRequestException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { SettlementService } from './settlement.service';
import { PolicyConfigService } from '../../../../../libs/shared/src/config/policy-config.service';
import {
  CartItemFormat,
  LedgerAccountType,
  LedgerEntryDirection,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  SellerOrderStatus,
} from '../../../prisma/generated/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('SettlementService (Task 72 / POL-14 / POL-15)', () => {
  let service: SettlementService;
  let prisma: any;
  let ledgerService: any;
  let walletService: any;
  let policyConfig: PolicyConfigService;

  const mockStoreA = 'store-fahasa';
  const mockStoreB = 'store-kimdong';

  const createMockSellerOrder = (overrides = {}) => ({
    id: 'so-1',
    orderId: 'order-1',
    code: 'SO-20260919-0001',
    storeId: mockStoreA,
    ownerUserId: 'owner-fahasa',
    requiresShipping: true,
    itemSubtotal: new Decimal(200000),
    shippingFee: new Decimal(30000),
    grandTotal: new Decimal(230000),
    status: SellerOrderStatus.COMPLETED,
    carrier: null,
    trackingCode: null,
    confirmedAt: new Date('2026-09-01T00:00:00Z'),
    shippedAt: new Date('2026-09-02T00:00:00Z'),
    completedAt: new Date('2026-09-03T00:00:00Z'), // More than 7 days ago relative to current time
    cancelledAt: null,
    cancelReason: null,
    createdAt: new Date('2026-09-01T00:00:00Z'),
    updatedAt: new Date('2026-09-03T00:00:00Z'),
    order: {
      id: 'order-1',
      code: 'ORD-20260919-0001',
      userId: 'user-buyer-1',
      paymentStatus: PaymentStatus.SUCCEEDED,
      status: OrderStatus.COMPLETED,
      paymentMethod: PaymentMethod.ONLINE_PAYMENT,
      createdAt: new Date('2026-09-01T00:00:00Z'),
      sellerOrders: [],
      statusHistory: [],
    },
    items: [
      {
        id: 'item-1',
        sellerOrderId: 'so-1',
        bookId: 'book-1',
        format: CartItemFormat.PHYSICAL,
        quantity: 1,
        unitPrice: new Decimal(200000),
        subtotal: new Decimal(200000),
      },
    ],
    ...overrides,
  });

  beforeEach(() => {
    prisma = {
      sellerOrder: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      order: {
        findUnique: jest.fn(),
      },
      ledgerTransaction: {
        findUnique: jest.fn(),
      },
      walletTransaction: {
        findFirst: jest.fn(),
      },
      orderStatusHistory: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      outboxEvent: {
        create: jest.fn(),
      },
      $transaction: jest.fn(async (cb) => cb(prisma)),
    };

    ledgerService = {
      postTransaction: jest.fn(),
    };

    walletService = {
      getOrCreateWallet: jest.fn(),
      creditPending: jest.fn(),
      movePendingToAvailable: jest.fn(),
    };

    policyConfig = new PolicyConfigService();

    service = new SettlementService(
      prisma,
      ledgerService,
      walletService,
      policyConfig,
    );
  });

  // REQUIREMENT 1: subsidy = 0 balanced journal
  it('1. verifies subsidy = 0 creates perfectly balanced double-entry journal (Sum Debit == Sum Credit)', async () => {
    const mockSO = createMockSellerOrder();
    prisma.sellerOrder.findUnique.mockResolvedValue(mockSO);
    prisma.ledgerTransaction.findUnique.mockResolvedValue(null);
    prisma.walletTransaction.findFirst.mockResolvedValue(null);
    walletService.getOrCreateWallet.mockResolvedValue({
      id: 'wallet-1',
      storeId: mockStoreA,
      pendingBalance: 195500,
      availableBalance: 0,
    });
    ledgerService.postTransaction.mockResolvedValue({
      id: 'ltx-settle-1',
      transactionNumber: 'LTX-SETTLE-0001',
      totalAmount: 230000,
      postedAt: new Date(),
    });

    const result = await service.settleSellerOrder('so-1');

    expect(result.success).toBe(true);
    expect(result.calculation.platformSubsidy).toBe(0);
    expect(result.calculation.grandTotal).toBe(230000);
    expect(result.calculation.platformCommission).toBe(34500);
    expect(result.calculation.sellerNet).toBe(195500);

    // Sum Debit = 230,000 (SELLER_PENDING)
    // Sum Credit = 195,500 (SELLER_AVAILABLE) + 34,500 (PLATFORM_REVENUE) = 230,000
    expect(ledgerService.postTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        referenceType: 'ESCROW_SETTLEMENT',
        entries: [
          {
            accountType: LedgerAccountType.SELLER_PENDING,
            direction: LedgerEntryDirection.DEBIT,
            amount: 230000,
            storeId: mockStoreA,
            description: expect.any(String),
          },
          {
            accountType: LedgerAccountType.SELLER_AVAILABLE,
            direction: LedgerEntryDirection.CREDIT,
            amount: 195500,
            storeId: mockStoreA,
            description: expect.any(String),
          },
          {
            accountType: LedgerAccountType.PLATFORM_REVENUE,
            direction: LedgerEntryDirection.CREDIT,
            amount: 34500,
            description: expect.any(String),
          },
        ],
      }),
    );
  });

  // REQUIREMENT 2: subsidy > 0 balanced journal
  it('2. verifies subsidy > 0 creates perfectly balanced double-entry journal with PLATFORM_MARKETING_EXPENSE debit', async () => {
    const subsidizedSO = createMockSellerOrder({
      itemSubtotal: new Decimal(200000),
      shippingFee: new Decimal(30000),
      grandTotal: new Decimal(180000), // 50,000 platform discount voucher
    });
    prisma.sellerOrder.findUnique.mockResolvedValue(subsidizedSO);
    prisma.ledgerTransaction.findUnique.mockResolvedValue(null);
    prisma.walletTransaction.findFirst.mockResolvedValue(null);
    walletService.getOrCreateWallet.mockResolvedValue({
      id: 'wallet-1',
      storeId: mockStoreA,
      pendingBalance: 180000,
      availableBalance: 0,
    });
    ledgerService.postTransaction.mockResolvedValue({
      id: 'ltx-settle-sub',
      transactionNumber: 'LTX-SETTLE-SUB-1',
      totalAmount: 230000,
      postedAt: new Date(),
    });

    // Mock platform subsidy rate at 100% of platform discount (DEC-004)
    jest.spyOn(policyConfig, 'platformVoucherSubsidyRate', 'get').mockReturnValue(1.0);

    const result = await service.settleSellerOrder('so-1');

    expect(result.success).toBe(true);
    expect(result.calculation.platformSubsidy).toBe(50000);
    expect(result.calculation.platformCommission).toBe(27000); // 15% on 180,000 net paid = 27,000
    // sellerNet = 180,000 - 27,000 + 50,000 = 203,000
    expect(result.calculation.sellerNet).toBe(203000);

    // Sum Debit = 180,000 (SELLER_PENDING) + 50,000 (PLATFORM_MARKETING_EXPENSE) = 230,000
    // Sum Credit = 203,000 (SELLER_AVAILABLE) + 27,000 (PLATFORM_REVENUE) = 230,000
    // SUM(DEBIT) === SUM(CREDIT)!
    expect(ledgerService.postTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        referenceType: 'ESCROW_SETTLEMENT',
        entries: [
          expect.objectContaining({
            accountType: LedgerAccountType.SELLER_PENDING,
            direction: LedgerEntryDirection.DEBIT,
            amount: 180000,
          }),
          expect.objectContaining({
            accountType: LedgerAccountType.SELLER_AVAILABLE,
            direction: LedgerEntryDirection.CREDIT,
            amount: 203000,
          }),
          expect.objectContaining({
            accountType: LedgerAccountType.PLATFORM_REVENUE,
            direction: LedgerEntryDirection.CREDIT,
            amount: 27000,
          }),
          expect.objectContaining({
            accountType: LedgerAccountType.PLATFORM_MARKETING_EXPENSE,
            direction: LedgerEntryDirection.DEBIT,
            amount: 50000,
          }),
        ],
      }),
    );
  });

  // REQUIREMENT 3: Pending exists before settlement
  it('3. proves seller pending balance is credited upon payment ingestion and exists BEFORE settlement eligibility', async () => {
    const orderWithSubOrder = {
      id: 'ord-pay-1',
      sellerOrders: [createMockSellerOrder({ id: 'so-pre-1', storeId: mockStoreA })],
    };
    prisma.order.findUnique.mockResolvedValue(orderWithSubOrder);
    prisma.ledgerTransaction.findUnique.mockResolvedValue(null);
    prisma.walletTransaction.findFirst.mockResolvedValue(null);
    walletService.getOrCreateWallet.mockResolvedValue({
      id: 'w-1',
      storeId: mockStoreA,
      pendingBalance: 0,
      availableBalance: 0,
    });

    await service.ingestPaymentEscrow('ord-pay-1');

    // 1. Double-entry ledger recognized: Dr ESCROW_HOLDING, Cr SELLER_PENDING
    expect(ledgerService.postTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        referenceType: 'PAYMENT_INGESTION',
        referenceId: 'so-pre-1',
        entries: expect.arrayContaining([
          expect.objectContaining({
            accountType: LedgerAccountType.ESCROW_HOLDING,
            direction: LedgerEntryDirection.DEBIT,
            amount: 230000,
          }),
          expect.objectContaining({
            accountType: LedgerAccountType.SELLER_PENDING,
            direction: LedgerEntryDirection.CREDIT,
            amount: 230000,
          }),
        ]),
      }),
    );

    // 2. Wallet pending balance credited immediately upon payment
    expect(walletService.creditPending).toHaveBeenCalledWith(
      mockStoreA,
      195500,
      expect.objectContaining({
        referenceType: 'ORDER_PAYMENT',
        referenceId: 'so-pre-1',
      }),
    );
  });

  // REQUIREMENT 4: Duplicate payment ingestion is idempotent
  it('4. verifies duplicate payment ingestion calls are completely idempotent and do not double credit', async () => {
    const orderWithSubOrder = {
      id: 'ord-pay-1',
      sellerOrders: [createMockSellerOrder({ id: 'so-dup-1', storeId: mockStoreA })],
    };
    prisma.order.findUnique.mockResolvedValue(orderWithSubOrder);
    // Simulate existing payment ingestion ledger transaction
    prisma.ledgerTransaction.findUnique.mockResolvedValue({
      id: 'ltx-existing-ingest',
      idempotencyKey: 'ESCROW_INGEST:so-dup-1',
    });

    await service.ingestPaymentEscrow('ord-pay-1');

    expect(ledgerService.postTransaction).not.toHaveBeenCalled();
    expect(walletService.creditPending).not.toHaveBeenCalled();
  });

  // REQUIREMENT 5: Physical delivered but hold active => blocked
  it('5. blocks settlement when physical sub-order is DELIVERED but 7-day safety window is still active without buyer confirmation', async () => {
    const recentDelivery = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // Delivered 2 days ago (< 7 days)
    const physicalActiveHoldSO = createMockSellerOrder({
      status: SellerOrderStatus.DELIVERED,
      completedAt: null,
      updatedAt: recentDelivery,
      order: {
        id: 'order-1',
        paymentStatus: PaymentStatus.SUCCEEDED,
        status: OrderStatus.SHIPPING,
        statusHistory: [
          {
            toStatus: 'DELIVERED',
            sellerOrderId: 'so-1',
            createdAt: recentDelivery,
          },
        ],
      },
    });
    prisma.sellerOrder.findUnique.mockResolvedValue(physicalActiveHoldSO);

    await expect(service.settleSellerOrder('so-1')).rejects.toThrow(
      /Physical protection window active: requires 7-day holding period \(168h\) or buyer confirmation/,
    );
  });

  // REQUIREMENT 6: Physical buyer confirmation => eligible if canonical
  it('6. clears physical sub-order immediately when buyer submits early confirmation (BUYER_CONFIRMED) within 7 days', async () => {
    const recentDelivery = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // 1 day ago
    const buyerConfirmedSO = createMockSellerOrder({
      status: SellerOrderStatus.DELIVERED,
      completedAt: null,
      updatedAt: recentDelivery,
      order: {
        id: 'order-1',
        paymentStatus: PaymentStatus.SUCCEEDED,
        status: OrderStatus.COMPLETED,
        statusHistory: [
          {
            toStatus: 'DELIVERED',
            sellerOrderId: 'so-1',
            createdAt: recentDelivery,
          },
          {
            toStatus: 'BUYER_CONFIRMED',
            sellerOrderId: 'so-1',
            createdAt: new Date(),
          },
        ],
      },
    });
    prisma.sellerOrder.findUnique.mockResolvedValue(buyerConfirmedSO);
    prisma.ledgerTransaction.findUnique.mockResolvedValue(null);
    prisma.walletTransaction.findFirst.mockResolvedValue(null);
    walletService.getOrCreateWallet.mockResolvedValue({ id: 'w-1', pendingBalance: 195500, availableBalance: 0 });
    ledgerService.postTransaction.mockResolvedValue({ id: 'ltx-buyer-conf', postedAt: new Date() });

    const result = await service.settleSellerOrder('so-1');
    expect(result.success).toBe(true);
    expect(walletService.movePendingToAvailable).toHaveBeenCalled();
  });

  // REQUIREMENT 7: Physical 7-day expiry => eligible if canonical
  it('7. clears physical sub-order automatically when 7-day safety window (168h) has elapsed post-delivery', async () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    const expiredWindowSO = createMockSellerOrder({
      status: SellerOrderStatus.DELIVERED,
      completedAt: eightDaysAgo,
      order: {
        id: 'order-1',
        paymentStatus: PaymentStatus.SUCCEEDED,
        status: OrderStatus.SHIPPING,
        statusHistory: [
          {
            toStatus: 'DELIVERED',
            sellerOrderId: 'so-1',
            createdAt: eightDaysAgo,
          },
        ],
      },
    });
    prisma.sellerOrder.findUnique.mockResolvedValue(expiredWindowSO);
    prisma.ledgerTransaction.findUnique.mockResolvedValue(null);
    prisma.walletTransaction.findFirst.mockResolvedValue(null);
    walletService.getOrCreateWallet.mockResolvedValue({ id: 'w-1', pendingBalance: 195500, availableBalance: 0 });
    ledgerService.postTransaction.mockResolvedValue({ id: 'ltx-7d', postedAt: new Date() });

    const result = await service.settleSellerOrder('so-1');
    expect(result.success).toBe(true);
  });

  // REQUIREMENT 8: Digital release timing according to POL-14
  it('8. enforces POL-14 digital holding period (blocked < 24h post-payment without confirmation, eligible after 24h)', async () => {
    const recentPaid = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago (< 24h)
    const digitalRecentSO = createMockSellerOrder({
      requiresShipping: false,
      status: SellerOrderStatus.CONFIRMED,
      createdAt: recentPaid,
      order: {
        id: 'order-1',
        createdAt: recentPaid,
        paymentStatus: PaymentStatus.SUCCEEDED,
        status: OrderStatus.PROCESSING,
        statusHistory: [],
      },
      items: [
        {
          id: 'i-digi',
          format: CartItemFormat.DIGITAL,
          quantity: 1,
          unitPrice: new Decimal(100000),
          subtotal: new Decimal(100000),
        },
      ],
      itemSubtotal: new Decimal(100000),
      shippingFee: new Decimal(0),
      grandTotal: new Decimal(100000),
    });
    prisma.sellerOrder.findUnique.mockResolvedValue(digitalRecentSO);

    // Blocked before 24h
    await expect(service.settleSellerOrder('so-1')).rejects.toThrow(
      /Digital safety hold active: requires 24h post-payment window or buyer confirmation/,
    );

    // Eligible after 24h
    const olderPaid = new Date(Date.now() - 26 * 60 * 60 * 1000); // 26 hours ago (> 24h)
    digitalRecentSO.createdAt = olderPaid;
    digitalRecentSO.order.createdAt = olderPaid;
    prisma.ledgerTransaction.findUnique.mockResolvedValue(null);
    prisma.walletTransaction.findFirst.mockResolvedValue(null);
    walletService.getOrCreateWallet.mockResolvedValue({ id: 'w-1', pendingBalance: 85000, availableBalance: 0 });
    ledgerService.postTransaction.mockResolvedValue({ id: 'ltx-digi-24h', postedAt: new Date() });

    const result = await service.settleSellerOrder('so-1');
    expect(result.success).toBe(true);
    expect(result.calculation.sellerNet).toBe(85000);
  });

  // REQUIREMENT 9: BOTH / COMBO timing
  it('9. enforces COMBO format timing: blocked while physical hold is active, released only when physical conditions met', async () => {
    const recentDelivered = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
    const comboSO = createMockSellerOrder({
      id: 'so-combo',
      status: SellerOrderStatus.DELIVERED,
      completedAt: null,
      updatedAt: recentDelivered,
      order: {
        id: 'order-1',
        paymentStatus: PaymentStatus.SUCCEEDED,
        status: OrderStatus.SHIPPING,
        statusHistory: [{ toStatus: 'DELIVERED', sellerOrderId: 'so-combo', createdAt: recentDelivered }],
      },
      items: [
        {
          id: 'i-phys',
          format: CartItemFormat.PHYSICAL,
          quantity: 1,
          unitPrice: new Decimal(150000),
          subtotal: new Decimal(150000),
        },
        {
          id: 'i-digi',
          format: CartItemFormat.DIGITAL,
          quantity: 1,
          unitPrice: new Decimal(50000),
          subtotal: new Decimal(50000),
        },
      ],
      itemSubtotal: new Decimal(200000),
      shippingFee: new Decimal(30000),
      grandTotal: new Decimal(230000),
    });
    prisma.sellerOrder.findUnique.mockResolvedValue(comboSO);

    // Active 7-day physical hold blocks entire combo
    await expect(service.settleSellerOrder('so-combo')).rejects.toThrow(
      /Physical protection window active: requires 7-day holding period \(168h\) or buyer confirmation/,
    );

    // After 7 days passes
    comboSO.completedAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    prisma.ledgerTransaction.findUnique.mockResolvedValue(null);
    prisma.walletTransaction.findFirst.mockResolvedValue(null);
    walletService.getOrCreateWallet.mockResolvedValue({ id: 'w-1', pendingBalance: 195500, availableBalance: 0 });
    ledgerService.postTransaction.mockResolvedValue({ id: 'ltx-combo', postedAt: new Date() });

    const result = await service.settleSellerOrder('so-combo');
    expect(result.success).toBe(true);
  });

  // REQUIREMENT 10: Ledger success + wallet failure recovery path
  it('10. demonstrates recovery when ledger succeeds but wallet movement previously failed', async () => {
    const mockSO = createMockSellerOrder();
    prisma.sellerOrder.findUnique.mockResolvedValue(mockSO);
    // Ledger transaction exists from prior run
    prisma.ledgerTransaction.findUnique.mockResolvedValue({
      id: 'ltx-recovered',
      transactionNumber: 'LTX-REC-001',
      postedAt: new Date(),
    });
    // Wallet settlement transaction was NOT created due to prior failure
    prisma.walletTransaction.findFirst.mockResolvedValue(null);
    walletService.getOrCreateWallet.mockResolvedValue({ id: 'w-1', pendingBalance: 195500, availableBalance: 0 });

    const result = await service.settleSellerOrder('so-1');

    expect(result.success).toBe(true);
    expect(result.isIdempotentReplay).toBe(true);
    // Proves missing wallet movement is recovered and executed
    expect(walletService.movePendingToAvailable).toHaveBeenCalledWith(
      mockStoreA,
      195500,
      expect.objectContaining({
        referenceType: 'SETTLEMENT',
        referenceId: 'so-1',
      }),
    );
  });

  // REQUIREMENT 11: Wallet success + status/outbox failure path
  it('11. handles recovery when wallet was already moved on prior attempt', async () => {
    const mockSO = createMockSellerOrder();
    prisma.sellerOrder.findUnique.mockResolvedValue(mockSO);
    prisma.ledgerTransaction.findUnique.mockResolvedValue({
      id: 'ltx-recovered-2',
      transactionNumber: 'LTX-REC-002',
      postedAt: new Date(),
    });
    // Wallet settlement transaction already exists
    prisma.walletTransaction.findFirst.mockResolvedValue({
      id: 'wtx-settle-1',
      referenceType: 'SETTLEMENT',
      referenceId: 'so-1',
    });

    const result = await service.settleSellerOrder('so-1');

    expect(result.success).toBe(true);
    expect(result.isIdempotentReplay).toBe(true);
    // Does NOT call movePendingToAvailable again (prevents double balance move)
    expect(walletService.movePendingToAvailable).not.toHaveBeenCalled();
  });

  // REQUIREMENT 12: Duplicate settlement
  it('12. returns existing settlement idempotently on duplicate settlement invocation', async () => {
    const mockSO = createMockSellerOrder();
    prisma.sellerOrder.findUnique.mockResolvedValue(mockSO);
    prisma.ledgerTransaction.findUnique.mockResolvedValue({
      id: 'ltx-existing',
      transactionNumber: 'LTX-EXISTING-1',
      postedAt: new Date('2026-09-19T00:00:00Z'),
    });
    prisma.walletTransaction.findFirst.mockResolvedValue({ id: 'wtx-done' });

    const result = await service.settleSellerOrder('so-1');

    expect(result.isIdempotentReplay).toBe(true);
    expect(result.ledgerTransactionId).toBe('ltx-existing');
    expect(ledgerService.postTransaction).not.toHaveBeenCalled();
  });

  // REQUIREMENT 13: Frozen escrow blocked
  it('13. blocks settlement if escrow is currently frozen due to active dispute (ESCROW_FROZEN)', async () => {
    const frozenSO = createMockSellerOrder({
      order: {
        id: 'order-1',
        paymentStatus: PaymentStatus.SUCCEEDED,
        status: OrderStatus.COMPLETED,
        statusHistory: [
          {
            toStatus: 'ESCROW_FROZEN',
            sellerOrderId: 'so-1',
            createdAt: new Date(),
          },
        ],
      },
    });
    prisma.sellerOrder.findUnique.mockResolvedValue(frozenSO);

    await expect(service.settleSellerOrder('so-1')).rejects.toThrow(
      /Escrow is currently frozen \(ESCROW_FROZEN\) due to active dispute/,
    );
    expect(ledgerService.postTransaction).not.toHaveBeenCalled();
  });

  // REQUIREMENT 14: Refund pending / cancelled blocked
  it('14. blocks settlement if order is in REFUND_PENDING, CANCELLED, or REFUNDED state', async () => {
    const refundedSO = createMockSellerOrder({
      status: SellerOrderStatus.CANCELLED,
      order: {
        id: 'order-1',
        status: OrderStatus.REFUNDED,
        paymentStatus: PaymentStatus.REFUNDED,
        statusHistory: [],
      },
    });
    prisma.sellerOrder.findUnique.mockResolvedValue(refundedSO);

    await expect(service.settleSellerOrder('so-1')).rejects.toThrow(
      /Order or seller order has been cancelled or refunded/,
    );
  });

  // REQUIREMENT 15: Store A cannot affect Store B
  it('15. ensures Store A sub-order settlement does not affect or release Store B sub-order funds', async () => {
    const soA = createMockSellerOrder({ id: 'so-A', storeId: mockStoreA });
    prisma.sellerOrder.findUnique.mockResolvedValue(soA);
    prisma.ledgerTransaction.findUnique.mockResolvedValue(null);
    prisma.walletTransaction.findFirst.mockResolvedValue(null);
    walletService.getOrCreateWallet.mockResolvedValue({
      id: 'w-A',
      storeId: mockStoreA,
      pendingBalance: 195500,
      availableBalance: 0,
    });
    ledgerService.postTransaction.mockResolvedValue({
      id: 'ltx-A',
      transactionNumber: 'LTX-A',
      postedAt: new Date(),
    });

    const res = await service.settleSellerOrder('so-A');

    expect(res.storeId).toBe(mockStoreA);
    expect(ledgerService.postTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: mockStoreA, referenceId: 'so-A' }),
    );
    expect(walletService.movePendingToAvailable).toHaveBeenCalledWith(
      mockStoreA,
      expect.any(Number),
      expect.objectContaining({ referenceId: 'so-A' }),
    );
    // Store B was not touched
    expect(walletService.movePendingToAvailable).not.toHaveBeenCalledWith(
      mockStoreB,
      expect.any(Number),
      expect.any(Object),
    );
  });
});
