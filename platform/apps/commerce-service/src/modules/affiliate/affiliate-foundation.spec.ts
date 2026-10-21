import { Test, TestingModule } from '@nestjs/testing';
import { AffiliatePolicyResolverService } from './policy-engine/affiliate-policy-resolver.service';
import { AffiliateCommissionStateMachineService } from './state-machine/affiliate-commission-state-machine.service';
import { AffiliateAuditService } from './audit/affiliate-audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { AuditService } from '../audit/audit.service';
import { Decimal } from '@prisma/client/runtime/library';
import {
  AffiliateCommissionStatus,
  LedgerAccountType,
  LedgerEntryDirection,
} from '../../../prisma/generated/client';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('Affiliate Foundation — Policy Resolver & State Machine (Phase 2)', () => {
  let policyResolver: AffiliatePolicyResolverService;
  let stateMachine: AffiliateCommissionStateMachineService;
  let mockPrisma: any;
  let mockLedgerService: any;
  let mockAuditService: any;

  beforeEach(async () => {
    mockPrisma = {
      bookAffiliateSetting: {
        findUnique: jest.fn(),
      },
      storeAffiliateSetting: {
        findUnique: jest.fn(),
      },
      affiliatePolicy: {
        findFirst: jest.fn(),
      },
      affiliateCommission: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      affiliateProfile: {
        findUnique: jest.fn(),
      },
      affiliateWallet: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      affiliateWalletTransaction: {
        create: jest.fn(),
      },
      affiliateAuditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn(async (cb: (tx: any) => Promise<any>) => cb(mockPrisma)),
    };

    mockLedgerService = {
      postTransactionWithTx: jest.fn(),
    };

    mockAuditService = {
      log: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AffiliatePolicyResolverService,
        AffiliateCommissionStateMachineService,
        AffiliateAuditService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LedgerService, useValue: mockLedgerService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    policyResolver = module.get<AffiliatePolicyResolverService>(AffiliatePolicyResolverService);
    stateMachine = module.get<AffiliateCommissionStateMachineService>(AffiliateCommissionStateMachineService);
  });

  describe('AffiliatePolicyResolverService (3-Tier Precedence & Calculations)', () => {
    it('Tier 1: should honor BookAffiliateSetting when marked ineligible (isEligible=false)', async () => {
      mockPrisma.bookAffiliateSetting.findUnique.mockResolvedValue({
        bookId: 'book-1',
        isEligible: false,
      });

      const result = await policyResolver.resolveCommission({
        bookId: 'book-1',
        storeId: 'store-1',
        format: 'PHYSICAL',
        itemPrice: 100000,
        quantity: 1,
      });

      expect(result.isEligible).toBe(false);
      expect(result.commissionAmount).toBe(0);
      expect(result.sourceTier).toBe('BOOK');
    });

    it('Tier 1: should use customRate from BookAffiliateSetting override when present', async () => {
      mockPrisma.bookAffiliateSetting.findUnique.mockResolvedValue({
        bookId: 'book-1',
        isEligible: true,
        customRate: new Decimal(12.5),
      });

      mockPrisma.affiliatePolicy.findFirst.mockResolvedValue({
        physicalHoldingDays: 7,
        digitalHoldingHours: 24,
      });

      const result = await policyResolver.resolveCommission({
        bookId: 'book-1',
        storeId: 'store-1',
        format: 'PHYSICAL',
        itemPrice: 200000,
        quantity: 1,
        sellerDiscountAllocated: 20000,
      });

      // base = 200000 - 20000 = 180000
      // 180000 * 12.5% = 22500
      expect(result.isEligible).toBe(true);
      expect(result.commissionBase).toBe(180000);
      expect(result.ratePercent).toBe(12.5);
      expect(result.commissionAmount).toBe(22500);
      expect(result.sourceTier).toBe('BOOK');
      expect(result.holdingDurationHours).toBe(7 * 24);
    });

    it('Tier 2: should honor StoreAffiliateSetting format rate when book has no override', async () => {
      mockPrisma.bookAffiliateSetting.findUnique.mockResolvedValue(null);
      mockPrisma.storeAffiliateSetting.findUnique.mockResolvedValue({
        storeId: 'store-1',
        isEnabled: true,
        ebookRate: new Decimal(15.0),
        physicalRate: new Decimal(8.0),
      });
      mockPrisma.affiliatePolicy.findFirst.mockResolvedValue({
        physicalHoldingDays: 7,
        digitalHoldingHours: 24,
      });

      const result = await policyResolver.resolveCommission({
        bookId: 'book-ebook',
        storeId: 'store-1',
        format: 'EBOOK',
        itemPrice: 150000,
        quantity: 1,
      });

      // 150000 * 15% = 22500
      expect(result.isEligible).toBe(true);
      expect(result.ratePercent).toBe(15.0);
      expect(result.commissionAmount).toBe(22500);
      expect(result.sourceTier).toBe('STORE');
      expect(result.holdingDurationHours).toBe(24);
    });

    it('Tier 2: should return ineligible if StoreAffiliateSetting is disabled', async () => {
      mockPrisma.bookAffiliateSetting.findUnique.mockResolvedValue(null);
      mockPrisma.storeAffiliateSetting.findUnique.mockResolvedValue({
        storeId: 'store-1',
        isEnabled: false,
      });

      const result = await policyResolver.resolveCommission({
        bookId: 'book-1',
        storeId: 'store-1',
        format: 'PHYSICAL',
        itemPrice: 100000,
        quantity: 1,
      });

      expect(result.isEligible).toBe(false);
      expect(result.commissionAmount).toBe(0);
      expect(result.sourceTier).toBe('STORE');
    });

    it('Tier 3: should fallback to active Platform AffiliatePolicy when book and store have no custom rate', async () => {
      mockPrisma.bookAffiliateSetting.findUnique.mockResolvedValue(null);
      mockPrisma.storeAffiliateSetting.findUnique.mockResolvedValue(null);
      mockPrisma.affiliatePolicy.findFirst.mockResolvedValue({
        version: 1,
        defaultPhysicalRate: new Decimal(5.0),
        defaultEbookRate: new Decimal(10.0),
        defaultAudioRate: new Decimal(10.0),
        physicalHoldingDays: 7,
        digitalHoldingHours: 24,
      });

      const result = await policyResolver.resolveCommission({
        bookId: 'book-fallback',
        storeId: 'store-1',
        format: 'PHYSICAL',
        itemPrice: 150000,
        quantity: 2,
        sellerDiscountAllocated: 10000,
      });

      // base = 300000 - 10000 = 290000
      // 290000 * 5% = 14500
      expect(result.isEligible).toBe(true);
      expect(result.commissionBase).toBe(290000);
      expect(result.ratePercent).toBe(5.0);
      expect(result.commissionAmount).toBe(14500);
      expect(result.sourceTier).toBe('PLATFORM');
      expect(result.holdingDurationHours).toBe(7 * 24);
      expect(result.holdingRule).toBe('PHYSICAL_DAYS_AFTER_DELIVERY');
    });

    it('should strictly floor commissionAmount without decimals and clamp within commissionBase', async () => {
      mockPrisma.bookAffiliateSetting.findUnique.mockResolvedValue(null);
      mockPrisma.storeAffiliateSetting.findUnique.mockResolvedValue(null);
      mockPrisma.affiliatePolicy.findFirst.mockResolvedValue({
        defaultPhysicalRate: new Decimal(7.33),
        physicalHoldingDays: 7,
        digitalHoldingHours: 24,
      });

      const result = await policyResolver.resolveCommission({
        bookId: 'book-odd',
        storeId: 'store-1',
        format: 'PHYSICAL',
        itemPrice: 99999,
        quantity: 1,
      });

      // 99999 * 7.33% = 7329.9267 -> floor = 7329
      expect(result.commissionAmount).toBe(7329);
      expect(Number.isInteger(result.commissionAmount)).toBe(true);
      expect(result.commissionAmount).toBeLessThanOrEqual(result.commissionBase);
    });
  });

  describe('AffiliateCommissionStateMachineService (Lifecycle & Ledger)', () => {
    const mockProfile = { id: 'prof-1', userId: 'user-1' };
    const mockWallet = {
      id: 'wallet-1',
      affiliateProfileId: 'prof-1',
      userId: 'user-1',
      holdingBalance: new Decimal(0),
      availableBalance: new Decimal(0),
      lifetimeEarned: new Decimal(0),
    };

    it('transitionToHolding: should move PENDING to HOLDING and update wallet holding balance', async () => {
      const mockCommission = {
        id: 'comm-1',
        status: AffiliateCommissionStatus.PENDING,
        commissionAmount: new Decimal(50000),
        currency: 'VND',
        profileId: 'prof-1',
        orderItemId: 'item-1',
      };

      mockPrisma.affiliateCommission.findUnique.mockResolvedValue(mockCommission);
      mockPrisma.affiliateProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrisma.affiliateWallet.findUnique.mockResolvedValue(mockWallet);
      mockPrisma.affiliateCommission.update.mockResolvedValue({
        ...mockCommission,
        status: AffiliateCommissionStatus.HOLDING,
      });

      const result = await stateMachine.transitionToHolding('comm-1', 7 * 24);

      expect(result.status).toBe(AffiliateCommissionStatus.HOLDING);
      expect(mockPrisma.affiliateWallet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'wallet-1' },
          data: expect.objectContaining({
            holdingBalance: new Decimal(50000),
          }),
        }),
      );
      expect(mockPrisma.affiliateWalletTransaction.create).toHaveBeenCalled();
    });

    it('settleCommission: should block settlement if dispute is active', async () => {
      mockPrisma.affiliateCommission.findUnique.mockResolvedValue({
        id: 'comm-dispute',
        status: AffiliateCommissionStatus.HOLDING,
        disputeBlocked: true,
        holdingUntil: new Date(Date.now() - 10000),
      });

      await expect(stateMachine.settleCommission('comm-dispute')).rejects.toThrow(ConflictException);
    });

    it('settleCommission: should block settlement if holding period has not elapsed', async () => {
      mockPrisma.affiliateCommission.findUnique.mockResolvedValue({
        id: 'comm-premature',
        status: AffiliateCommissionStatus.HOLDING,
        disputeBlocked: false,
        holdingUntil: new Date(Date.now() + 1000000), // future
      });

      await expect(stateMachine.settleCommission('comm-premature')).rejects.toThrow(ConflictException);
    });

    it('settleCommission: should post balanced double-entry ledger entries and credit wallet on success', async () => {
      const settledCommission = {
        id: 'comm-valid',
        status: AffiliateCommissionStatus.HOLDING,
        commissionAmount: new Decimal(75000),
        currency: 'VND',
        profileId: 'prof-1',
        storeId: 'store-1',
        orderId: 'order-1',
        orderItemId: 'item-1',
        bookTitle: 'Sach Hay',
        disputeBlocked: false,
        holdingUntil: new Date(Date.now() - 10000), // past
      };

      mockPrisma.affiliateCommission.findUnique.mockResolvedValue(settledCommission);
      mockPrisma.affiliateWallet.findUnique.mockResolvedValue({
        ...mockWallet,
        holdingBalance: new Decimal(75000),
        availableBalance: new Decimal(0),
      });

      mockLedgerService.postTransactionWithTx.mockResolvedValue({
        id: 'LTX-AFF-001',
      });

      const result = await stateMachine.settleCommission('comm-valid');

      expect(result.newStatus).toBe(AffiliateCommissionStatus.AVAILABLE);
      expect(result.ledgerTransactionId).toBe('LTX-AFF-001');

      // Check double-entry ledger entry structure: DEBIT Expense, CREDIT Payable
      expect(mockLedgerService.postTransactionWithTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          referenceType: 'COMMISSION_SETTLEMENT',
          referenceId: 'comm-valid',
          storeId: 'store-1',
          entries: [
            expect.objectContaining({
              accountType: LedgerAccountType.SELLER_COMMISSION_EXPENSE,
              direction: LedgerEntryDirection.DEBIT,
              amount: 75000,
              storeId: 'store-1',
            }),
            expect.objectContaining({
              accountType: LedgerAccountType.AFFILIATE_PAYABLE_AVAILABLE,
              direction: LedgerEntryDirection.CREDIT,
              amount: 75000,
            }),
          ],
        }),
      );

      // Check wallet update
      expect(mockPrisma.affiliateWallet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'wallet-1' },
          data: expect.objectContaining({
            holdingBalance: new Decimal(0),
            availableBalance: new Decimal(75000),
            lifetimeEarned: new Decimal(75000),
          }),
        }),
      );
    });

    it('settleCommission: should be idempotent if already settled', async () => {
      mockPrisma.affiliateCommission.findUnique.mockResolvedValue({
        id: 'comm-already-available',
        status: AffiliateCommissionStatus.AVAILABLE,
        commissionAmount: new Decimal(75000),
        ledgerTxId: 'LTX-EXISTING',
        settledAt: new Date(),
      });

      const result = await stateMachine.settleCommission('comm-already-available');
      expect(result.newStatus).toBe(AffiliateCommissionStatus.AVAILABLE);
      expect(result.ledgerTransactionId).toBe('LTX-EXISTING');
      expect(mockLedgerService.postTransactionWithTx).not.toHaveBeenCalled();
    });

    it('reverseCommission: should post reversing double-entry ledger transaction and debit wallet', async () => {
      const settledCommission = {
        id: 'comm-to-rev',
        status: AffiliateCommissionStatus.AVAILABLE,
        commissionAmount: new Decimal(30000),
        currency: 'VND',
        profileId: 'prof-1',
        storeId: 'store-1',
        orderItemId: 'item-1',
      };

      mockPrisma.affiliateCommission.findUnique.mockResolvedValue(settledCommission);
      mockPrisma.affiliateWallet.findUnique.mockResolvedValue({
        ...mockWallet,
        availableBalance: new Decimal(50000),
      });

      mockLedgerService.postTransactionWithTx.mockResolvedValue({
        id: 'LTX-REV-001',
      });

      const result = await stateMachine.reverseCommission('comm-to-rev', 'Buyer return accepted');

      expect(result.newStatus).toBe(AffiliateCommissionStatus.REVERSED);
      expect(result.reversalLedgerTransactionId).toBe('LTX-REV-001');

      // Check reversing entries: DEBIT Payable, CREDIT Expense
      expect(mockLedgerService.postTransactionWithTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          referenceType: 'COMMISSION_REVERSAL',
          referenceId: 'comm-to-rev',
          entries: [
            expect.objectContaining({
              accountType: LedgerAccountType.AFFILIATE_PAYABLE_AVAILABLE,
              direction: LedgerEntryDirection.DEBIT,
              amount: 30000,
            }),
            expect.objectContaining({
              accountType: LedgerAccountType.SELLER_COMMISSION_EXPENSE,
              direction: LedgerEntryDirection.CREDIT,
              amount: 30000,
              storeId: 'store-1',
            }),
          ],
        }),
      );

      // Check wallet update
      expect(mockPrisma.affiliateWallet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'wallet-1' },
          data: expect.objectContaining({
            availableBalance: new Decimal(20000),
          }),
        }),
      );
    });

    it('dispute controls: should toggle disputeBlocked flag', async () => {
      mockPrisma.affiliateCommission.update.mockResolvedValue({ id: 'comm-1', disputeBlocked: true });
      await stateMachine.blockDispute('comm-1');
      expect(mockPrisma.affiliateCommission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'comm-1' },
          data: expect.objectContaining({ disputeBlocked: true }),
        }),
      );

      mockPrisma.affiliateCommission.update.mockResolvedValue({ id: 'comm-1', disputeBlocked: false });
      await stateMachine.unblockDispute('comm-1');
      expect(mockPrisma.affiliateCommission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'comm-1' },
          data: expect.objectContaining({ disputeBlocked: false }),
        }),
      );
    });
  });
});
