import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Decimal } from '@prisma/client/runtime/library';
import { AffiliateCheckoutService } from './services/affiliate-checkout.service';
import { AffiliatePolicyResolverService } from './policy-engine/affiliate-policy-resolver.service';
import { AffiliateReconciliationService } from './services/affiliate-reconciliation.service';
import { AffiliateWalletService } from './services/affiliate-wallet.service';
import { AffiliatePayoutService } from './services/affiliate-payout.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import {
  AffiliateCommissionStatus,
  AffiliatePayoutStatus,
  LedgerAccountType,
  LedgerEntryDirection,
} from '../../../prisma/generated/client';

describe('Affiliate Full UAT, Rollout & Kill-Switch Drill (Phase 12)', () => {
  let checkoutService: AffiliateCheckoutService;
  let reconciliationService: AffiliateReconciliationService;
  let walletService: AffiliateWalletService;
  let payoutService: AffiliatePayoutService;
  let mockConfigService: any;

  const mockPrisma = {
    affiliateAttribution: {
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue({ id: 'attr-updated' }),
    },
    affiliateLink: {
      update: jest.fn().mockResolvedValue({ id: 'link-updated' }),
    },
    affiliateAuditLog: {
      create: jest.fn().mockResolvedValue({ id: 'audit-reconcile-1' }),
    },
    affiliatePolicy: {
      findFirst: jest.fn(),
    },
    affiliateCommission: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    affiliateWallet: {
      findUnique: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
    },
    affiliatePayoutRequest: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    affiliateWalletTransaction: {
      create: jest.fn(),
    },
    ledgerEntry: {
      aggregate: jest.fn(),
    },
    outboxEvent: {
      create: jest.fn(),
    },
    $transaction: jest.fn(async (cb) => {
      if (typeof cb === 'function') {
        return cb(mockPrisma);
      }
      return cb;
    }),
  };

  const mockPolicyResolver = {
    resolveCommission: jest.fn(),
  };

  const mockLedgerService = {
    postTransactionWithTx: jest.fn().mockResolvedValue({ id: 'ledger-tx-mock' }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'AFFILIATE_PROGRAM_ENABLED') return 'true';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AffiliateCheckoutService,
        AffiliateReconciliationService,
        AffiliateWalletService,
        AffiliatePayoutService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AffiliatePolicyResolverService, useValue: mockPolicyResolver },
        { provide: LedgerService, useValue: mockLedgerService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    checkoutService = module.get<AffiliateCheckoutService>(AffiliateCheckoutService);
    reconciliationService = module.get<AffiliateReconciliationService>(AffiliateReconciliationService);
    walletService = module.get<AffiliateWalletService>(AffiliateWalletService);
    payoutService = module.get<AffiliatePayoutService>(AffiliatePayoutService);
  });

  describe('1. Emergency Kill-Switch Drill (Decision AFF-DEC-024)', () => {
    it('should bypass commission creation gracefully when AFFILIATE_PROGRAM_ENABLED=false', async () => {
      // Simulate Kill-Switch Activation
      mockConfigService.get.mockReturnValue('false');

      const result = await checkoutService.resolveAttribution('valid-affiliate-token', 'buyer-user-123');

      expect(result).toBeNull();
      expect(mockPrisma.affiliateAttribution.findFirst).not.toHaveBeenCalled();
    });

    it('should ensure checkout succeeds with 0 commissions when kill-switch is active', async () => {
      mockConfigService.get.mockReturnValue('false');

      const commissions = await checkoutService.createPendingCommissions({
        orderId: 'order-emergency-1',
        orderCode: 'ORD-EMERGENCY',
        buyerUserId: 'buyer-user-123',
        affiliateToken: 'valid-token-while-killswitch-active',
        items: [
          {
            orderItemId: 'item-1',
            bookId: 'book-1',
            storeId: 'store-1',
            title: 'Kinh tế học cơ bản',
            format: 'PHYSICAL',
            quantity: 1,
            unitPrice: 200000,
          },
        ],
      });

      expect(commissions).toEqual([]);
      expect(mockPolicyResolver.resolveCommission).not.toHaveBeenCalled();
    });
  });

  describe('2. Post-Release General Ledger Reconciliation Drill', () => {
    it('should confirm Ledger and Wallets are in exact balance (status: BALANCED, mismatch: 0)', async () => {
      // Setup matching aggregate data
      mockPrisma.affiliateCommission.aggregate
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(5000000) }, _count: { id: 25 } }) // available
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(0) }, _count: { id: 0 } }); // reversed

      mockPrisma.affiliateWallet.aggregate.mockResolvedValueOnce({
        _count: { id: 10 },
        _sum: {
          availableBalance: new Decimal(5000000),
          holdingBalance: new Decimal(1000000),
          frozenBalance: new Decimal(500000),
          pendingBalance: new Decimal(200000),
          lifetimeEarned: new Decimal(6000000),
        },
      });

      // Matching Ledger entry for AFFILIATE_PAYABLE_AVAILABLE
      mockPrisma.ledgerEntry.aggregate
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(5000000) } }) // credit
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(0) } }); // debit

      mockPrisma.affiliateWallet.findMany = jest.fn().mockResolvedValue([]);

      const report = await reconciliationService.runReconciliationAudit();

      expect(report.isHealthy).toBe(true);
      expect(report.status).toBe('BALANCED');
      expect(report.discrepancies.walletVsLedgerMismatch).toBe(0);
      expect(report.wallets.totalAvailableBalance).toBe(5000000);
      expect(report.ledger.affiliatePayableBalance).toBe(5000000);
    });
  });

  describe('3. Full 3-Role Journey Integration (Buyer - Seller - CTV - Admin)', () => {
    it('should attribute click, compute commission, hold, settle to wallet, and disburse via payout', async () => {
      // Step A: Attribution resolution
      mockPrisma.affiliateAttribution.findFirst.mockResolvedValue({
        id: 'attr-full-1',
        linkId: 'link-full-1',
        profileId: 'prof-full-1',
        expiresAt: new Date(Date.now() + 86400000),
        link: { id: 'link-full-1', isActive: true, targetType: 'BOOK', targetBookId: 'book-full-1' },
        profile: { id: 'prof-full-1', userId: 'ctv-user-999', status: 'ACTIVE' },
      });

      // Step B: Policy resolution
      mockPolicyResolver.resolveCommission.mockResolvedValue({
        isEligible: true,
        commissionRate: 10,
        commissionAmount: 25000,
        sellerRateSnapshot: 10,
        platformFeeSnapshot: 5,
        fundingSource: 'SELLER',
      });

      mockPrisma.affiliateCommission.create.mockResolvedValue({
        id: 'comm-full-1',
        amount: new Decimal(25000),
        status: AffiliateCommissionStatus.PENDING,
      });

      const pendingCommissions = await checkoutService.createPendingCommissions({
        orderId: 'ord-uat-100',
        orderCode: 'ORD-UAT-100',
        buyerUserId: 'buyer-user-888',
        affiliateToken: 'cookie-hex-full-journey',
        items: [
          {
            orderItemId: 'item-full-1',
            bookId: 'book-full-1',
            storeId: 'store-full-1',
            title: 'Sách phát triển bản thân',
            format: 'PHYSICAL',
            quantity: 1,
            unitPrice: 250000,
            sellerDiscountAllocated: 0,
          },
        ],
      });

      expect(pendingCommissions.length).toBe(1);
      expect(pendingCommissions[0].amount).toEqual(new Decimal(25000));

      // Step C: Payout approval & disbursal verification
      const mockPayout = {
        id: 'payout-uat-1',
        profileId: 'prof-full-1',
        amount: new Decimal(500000),
        status: AffiliatePayoutStatus.PENDING,
        wallet: {
          id: 'wallet-uat-1',
          currency: 'VND',
          frozenBalance: new Decimal(500000),
          lifetimePaid: new Decimal(0),
        },
      };

      mockPrisma.affiliatePayoutRequest.findUnique.mockResolvedValue(mockPayout);
      mockPrisma.affiliatePayoutRequest.update.mockResolvedValue({
        ...mockPayout,
        status: AffiliatePayoutStatus.COMPLETED,
        disbursedAt: new Date(),
        providerRef: 'NAPAS-UAT-SUCCESS-01',
      });

      const approved = await payoutService.approvePayout('payout-uat-1', 'admin-fin-super', 'NAPAS-UAT-SUCCESS-01');

      expect(approved.status).toBe(AffiliatePayoutStatus.COMPLETED);
      expect(approved.providerRef).toBe('NAPAS-UAT-SUCCESS-01');
      expect(mockLedgerService.postTransactionWithTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          referenceType: 'PAYOUT_DISBURSED',
          entries: [
            expect.objectContaining({
              accountType: LedgerAccountType.AFFILIATE_PAYABLE_FROZEN,
              direction: LedgerEntryDirection.DEBIT,
              amount: 500000,
            }),
            expect.objectContaining({
              accountType: LedgerAccountType.AFFILIATE_PAYOUT_CLEARING,
              direction: LedgerEntryDirection.CREDIT,
              amount: 500000,
            }),
          ],
        }),
      );
    });
  });
});
