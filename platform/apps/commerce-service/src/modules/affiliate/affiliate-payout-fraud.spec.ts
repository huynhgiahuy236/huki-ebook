import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { AffiliatePayoutService } from './services/affiliate-payout.service';
import { AffiliateFraudService } from './services/affiliate-fraud.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import {
  AffiliatePayoutStatus,
  AffiliateWalletTxType,
  LedgerAccountType,
  LedgerEntryDirection,
} from '../../../prisma/generated/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('AffiliatePayoutService & AffiliateFraudService (Phase 10: KYC, Payout & Fraud)', () => {
  let payoutService: AffiliatePayoutService;
  let fraudService: AffiliateFraudService;

  const mockProfile = {
    id: 'prof-test-1',
    userId: 'user-ctv-1',
    affiliateCode: 'CTV_TEST_10',
    displayName: 'Nguyen Van A',
    status: 'ACTIVE',
    wallet: {
      id: 'wallet-test-1',
      availableBalance: new Decimal(5000000),
      frozenBalance: new Decimal(0),
      lifetimePaid: new Decimal(1000000),
      currency: 'VND',
    },
    fraudCases: [],
  };

  const mockPrisma = {
    affiliateProfile: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    affiliateAuditLog: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    affiliatePayoutRequest: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    affiliateWallet: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    affiliateWalletTransaction: {
      create: jest.fn(),
    },
    affiliateFraudCase: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
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

  const mockLedgerService = {
    postTransactionWithTx: jest.fn().mockResolvedValue({ id: 'ledger-tx-mock' }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AffiliatePayoutService,
        AffiliateFraudService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LedgerService, useValue: mockLedgerService },
      ],
    }).compile();

    payoutService = module.get<AffiliatePayoutService>(AffiliatePayoutService);
    fraudService = module.get<AffiliateFraudService>(AffiliateFraudService);
  });

  describe('1. KYC & Bank Verification Lifecycle', () => {
    it('should submit KYC successfully when CCCD name matches bank account holder', async () => {
      mockPrisma.affiliateProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrisma.affiliateAuditLog.create.mockResolvedValue({
        id: 'audit-kyc-1',
        createdAt: new Date(),
      });

      const result = await payoutService.submitKyc('user-ctv-1', {
        legalName: 'NGUYEN VAN A',
        idCardNumber: '079199001234',
        idCardIssueDate: '2022-01-01',
        idCardIssuePlace: 'Cuc Canh sat QLHC ve TTXH',
        frontImageUrl: 'https://cdn.huki.vn/kyc/front.jpg',
        backImageUrl: 'https://cdn.huki.vn/kyc/back.jpg',
        bankName: 'Vietcombank',
        bankCode: 'VCB',
        accountNumber: '1012345678',
        accountHolderName: 'nguyen van a ', // Case & trim variation
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('PENDING_REVIEW');
      expect(mockPrisma.affiliateAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'KYC_SUBMITTED',
            resource: 'AFFILIATE_PROFILE',
            resourceId: 'prof-test-1',
          }),
        }),
      );
    });

    it('should reject submission if CCCD name does not match bank account holder', async () => {
      mockPrisma.affiliateProfile.findUnique.mockResolvedValue(mockProfile);

      await expect(
        payoutService.submitKyc('user-ctv-1', {
          legalName: 'NGUYEN VAN A',
          idCardNumber: '079199001234',
          idCardIssueDate: '2022-01-01',
          idCardIssuePlace: 'Cuc Canh sat QLHC ve TTXH',
          frontImageUrl: 'https://cdn.huki.vn/kyc/front.jpg',
          backImageUrl: 'https://cdn.huki.vn/kyc/back.jpg',
          bankName: 'Vietcombank',
          bankCode: 'VCB',
          accountNumber: '1012345678',
          accountHolderName: 'TRAN THI B', // Mismatch!
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow admin to approve submitted KYC', async () => {
      mockPrisma.affiliateProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrisma.affiliateAuditLog.findFirst.mockResolvedValue({
        id: 'audit-kyc-1',
        action: 'KYC_SUBMITTED',
        metadata: {
          legalName: 'NGUYEN VAN A',
          bankName: 'Vietcombank',
          accountNumber: '1012345678',
          accountHolderName: 'NGUYEN VAN A',
        },
      });
      mockPrisma.affiliateAuditLog.create.mockResolvedValue({ id: 'audit-kyc-appr' });

      const res = await payoutService.reviewKyc('prof-test-1', 'admin-super-1', {
        status: 'APPROVED',
      });

      expect(res.status).toBe('APPROVED');
      expect(mockPrisma.affiliateAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'KYC_APPROVED',
            actorId: 'admin-super-1',
          }),
        }),
      );
    });

    it('should allow admin to reject submitted KYC with a reason', async () => {
      mockPrisma.affiliateProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrisma.affiliateAuditLog.findFirst.mockResolvedValue({
        id: 'audit-kyc-1',
        action: 'KYC_SUBMITTED',
        metadata: { legalName: 'NGUYEN VAN A' },
      });
      mockPrisma.affiliateAuditLog.create.mockResolvedValue({ id: 'audit-kyc-rej' });

      const res = await payoutService.reviewKyc('prof-test-1', 'admin-super-1', {
        status: 'REJECTED',
        rejectionReason: 'Ảnh chụp mặt trước bị mờ, không rõ số CCCD',
      });

      expect(res.status).toBe('REJECTED');
      expect(res.rejectionReason).toContain('bị mờ');
    });

    it('should return KYC status with bank snapshot when verified', async () => {
      mockPrisma.affiliateProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrisma.affiliateAuditLog.findFirst.mockResolvedValue({
        action: 'KYC_APPROVED',
        metadata: {
          bankName: 'Techcombank',
          bankCode: 'TCB',
          accountNumber: '1903456789',
          accountHolderName: 'NGUYEN VAN A',
        },
        createdAt: new Date(),
      });

      const status = await payoutService.getKycStatus('user-ctv-1');
      expect(status.isVerified).toBe(true);
      expect(status.status).toBe('APPROVED');
      expect(status.bankSnapshot?.bankCode).toBe('TCB');
    });
  });

  describe('2. Payout Request Creation & Gating Policies', () => {
    it('should block payout request if KYC is not verified', async () => {
      mockPrisma.affiliateProfile.findUnique
        .mockResolvedValueOnce(mockProfile) // for createPayoutRequest
        .mockResolvedValueOnce(mockProfile); // for getKycStatus
      mockPrisma.affiliatePayoutRequest.findUnique.mockResolvedValue(null);
      // No approved KYC log
      mockPrisma.affiliateAuditLog.findFirst.mockResolvedValue(null);

      await expect(
        payoutService.createPayoutRequest('user-ctv-1', {
          amount: 500000,
          idempotencyKey: 'PAY-IDEM-001',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should block payout request if partner has OPEN fraud cases', async () => {
      mockPrisma.affiliateProfile.findUnique
        .mockResolvedValueOnce({
          ...mockProfile,
          fraudCases: [{ id: 'fraud-1', status: 'OPEN' }],
        })
        .mockResolvedValueOnce(mockProfile);
      mockPrisma.affiliatePayoutRequest.findUnique.mockResolvedValue(null);
      mockPrisma.affiliateAuditLog.findFirst.mockResolvedValue({
        action: 'KYC_APPROVED',
        metadata: { bankName: 'Vietcombank', bankCode: 'VCB', accountNumber: '123' },
      });

      await expect(
        payoutService.createPayoutRequest('user-ctv-1', {
          amount: 500000,
          idempotencyKey: 'PAY-IDEM-002',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should block payout request if requested within 24 hours of another request', async () => {
      mockPrisma.affiliateProfile.findUnique
        .mockResolvedValueOnce(mockProfile)
        .mockResolvedValueOnce(mockProfile);
      mockPrisma.affiliatePayoutRequest.findUnique.mockResolvedValue(null);
      mockPrisma.affiliateAuditLog.findFirst.mockResolvedValue({
        action: 'KYC_APPROVED',
        metadata: { bankName: 'Vietcombank', bankCode: 'VCB', accountNumber: '123' },
      });
      // Recent request exists within 24 hours
      mockPrisma.affiliatePayoutRequest.findFirst.mockResolvedValue({
        id: 'recent-payout-1',
        createdAt: new Date(),
      });

      await expect(
        payoutService.createPayoutRequest('user-ctv-1', {
          amount: 500000,
          idempotencyKey: 'PAY-IDEM-003',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should block payout request if amount exceeds available wallet balance', async () => {
      mockPrisma.affiliateProfile.findUnique
        .mockResolvedValueOnce({
          ...mockProfile,
          wallet: {
            ...mockProfile.wallet,
            availableBalance: new Decimal(200000), // Only 200,000 available
          },
        })
        .mockResolvedValueOnce(mockProfile);
      mockPrisma.affiliatePayoutRequest.findUnique.mockResolvedValue(null);
      mockPrisma.affiliateAuditLog.findFirst.mockResolvedValue({
        action: 'KYC_APPROVED',
        metadata: { bankName: 'Vietcombank', bankCode: 'VCB', accountNumber: '123' },
      });
      mockPrisma.affiliatePayoutRequest.findFirst.mockResolvedValue(null); // No recent request

      await expect(
        payoutService.createPayoutRequest('user-ctv-1', {
          amount: 1000000, // Wants 1,000,000
          idempotencyKey: 'PAY-IDEM-004',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should withhold 10% tax for payouts >= 2,000,000 VND and post double-entry freeze Ledger', async () => {
      mockPrisma.affiliateProfile.findUnique
        .mockResolvedValueOnce(mockProfile)
        .mockResolvedValueOnce(mockProfile);
      mockPrisma.affiliatePayoutRequest.findUnique.mockResolvedValue(null);
      mockPrisma.affiliateAuditLog.findFirst.mockResolvedValue({
        action: 'KYC_APPROVED',
        metadata: {
          bankName: 'MB Bank',
          bankCode: 'MB',
          accountNumber: '99998888',
          accountHolderName: 'NGUYEN VAN A',
        },
      });
      mockPrisma.affiliatePayoutRequest.findFirst.mockResolvedValue(null);

      const grossAmount = 3000000; // >= 2,000,000 VND -> tax 10% = 300,000, net = 2,700,000

      mockPrisma.affiliatePayoutRequest.create.mockResolvedValue({
        id: 'payout-test-3m',
        amount: new Decimal(grossAmount),
        status: AffiliatePayoutStatus.PENDING,
        requestedAt: new Date(),
      });

      const res = await payoutService.createPayoutRequest('user-ctv-1', {
        amount: grossAmount,
        idempotencyKey: 'PAY-IDEM-3M',
      });

      // Wallet freeze balance update
      expect(mockPrisma.affiliateWallet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            availableBalance: expect.any(Decimal),
            frozenBalance: expect.any(Decimal),
          }),
        }),
      );

      // Wallet transaction FREEZE_AVAILABLE
      expect(mockPrisma.affiliateWalletTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: AffiliateWalletTxType.FREEZE_AVAILABLE,
            amount: new Decimal(grossAmount),
          }),
        }),
      );

      // Double-entry Ledger entries
      expect(mockLedgerService.postTransactionWithTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          referenceType: 'PAYOUT_REQUEST',
          entries: [
            expect.objectContaining({
              accountType: LedgerAccountType.AFFILIATE_PAYABLE_AVAILABLE,
              direction: LedgerEntryDirection.DEBIT,
              amount: grossAmount,
            }),
            expect.objectContaining({
              accountType: LedgerAccountType.AFFILIATE_PAYABLE_FROZEN,
              direction: LedgerEntryDirection.CREDIT,
              amount: grossAmount,
            }),
          ],
        }),
      );

      // Outbox Event
      expect(mockPrisma.outboxEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'AFFILIATE_PAYOUT_REQUESTED',
            payload: expect.objectContaining({
              grossAmount: 3000000,
              taxAmount: 300000,
              netAmount: 2700000,
            }),
          }),
        }),
      );
    });

    it('should NOT withhold tax for payouts < 2,000,000 VND (tax = 0)', async () => {
      mockPrisma.affiliateProfile.findUnique
        .mockResolvedValueOnce(mockProfile)
        .mockResolvedValueOnce(mockProfile);
      mockPrisma.affiliatePayoutRequest.findUnique.mockResolvedValue(null);
      mockPrisma.affiliateAuditLog.findFirst.mockResolvedValue({
        action: 'KYC_APPROVED',
        metadata: {
          bankName: 'MB Bank',
          bankCode: 'MB',
          accountNumber: '99998888',
        },
      });
      mockPrisma.affiliatePayoutRequest.findFirst.mockResolvedValue(null);

      const grossAmount = 500000; // < 2,000,000 VND -> tax 0

      mockPrisma.affiliatePayoutRequest.create.mockResolvedValue({
        id: 'payout-test-500k',
        amount: new Decimal(grossAmount),
        status: AffiliatePayoutStatus.PENDING,
        requestedAt: new Date(),
      });

      await payoutService.createPayoutRequest('user-ctv-1', {
        amount: grossAmount,
        idempotencyKey: 'PAY-IDEM-500K',
      });

      expect(mockPrisma.outboxEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            payload: expect.objectContaining({
              grossAmount: 500000,
              taxAmount: 0,
              netAmount: 500000,
            }),
          }),
        }),
      );
    });
  });

  describe('3. Payout Disbursal Approval & Rejection Lifecycle', () => {
    it('should approve payout and disburse from frozen balance to clearing', async () => {
      const mockPendingPayout = {
        id: 'payout-pending-1',
        profileId: 'prof-test-1',
        amount: new Decimal(1000000),
        status: AffiliatePayoutStatus.PENDING,
        wallet: {
          id: 'wallet-test-1',
          currency: 'VND',
          frozenBalance: new Decimal(1000000),
          lifetimePaid: new Decimal(500000),
        },
      };

      mockPrisma.affiliatePayoutRequest.findUnique.mockResolvedValue(mockPendingPayout);
      mockPrisma.affiliatePayoutRequest.update.mockResolvedValue({
        ...mockPendingPayout,
        status: AffiliatePayoutStatus.COMPLETED,
      });

      const res = await payoutService.approvePayout('payout-pending-1', 'admin-fin-1', 'NAPAS-987654');

      expect(res.status).toBe(AffiliatePayoutStatus.COMPLETED);

      // Wallet DEBIT_FROZEN_FOR_PAYOUT
      expect(mockPrisma.affiliateWalletTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: AffiliateWalletTxType.DEBIT_FROZEN_FOR_PAYOUT,
            amount: new Decimal(1000000),
          }),
        }),
      );

      // Ledger: DEBIT AFFILIATE_PAYABLE_FROZEN, CREDIT AFFILIATE_PAYOUT_CLEARING
      expect(mockLedgerService.postTransactionWithTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          referenceType: 'PAYOUT_DISBURSED',
          entries: [
            expect.objectContaining({
              accountType: LedgerAccountType.AFFILIATE_PAYABLE_FROZEN,
              direction: LedgerEntryDirection.DEBIT,
              amount: 1000000,
            }),
            expect.objectContaining({
              accountType: LedgerAccountType.AFFILIATE_PAYOUT_CLEARING,
              direction: LedgerEntryDirection.CREDIT,
              amount: 1000000,
            }),
          ],
        }),
      );

      // Outbox Event
      expect(mockPrisma.outboxEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'AFFILIATE_PAYOUT_COMPLETED',
          }),
        }),
      );
    });

    it('should reject payout and unfreeze balance back to available with ledger reversal', async () => {
      const mockPendingPayout = {
        id: 'payout-pending-2',
        profileId: 'prof-test-1',
        amount: new Decimal(1500000),
        status: AffiliatePayoutStatus.PENDING,
        wallet: {
          id: 'wallet-test-1',
          currency: 'VND',
          availableBalance: new Decimal(500000),
          frozenBalance: new Decimal(1500000),
        },
      };

      mockPrisma.affiliatePayoutRequest.findUnique.mockResolvedValue(mockPendingPayout);
      mockPrisma.affiliatePayoutRequest.update.mockResolvedValue({
        ...mockPendingPayout,
        status: AffiliatePayoutStatus.REJECTED,
      });

      const res = await payoutService.rejectPayout(
        'payout-pending-2',
        'admin-fin-1',
        'Tài khoản ngân hàng người nhận không hợp lệ',
      );

      expect(res.status).toBe(AffiliatePayoutStatus.REJECTED);

      // Wallet UNFREEZE_TO_AVAILABLE
      expect(mockPrisma.affiliateWalletTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: AffiliateWalletTxType.UNFREEZE_TO_AVAILABLE,
            amount: new Decimal(1500000),
          }),
        }),
      );

      // Ledger balancing reversal
      expect(mockLedgerService.postTransactionWithTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          referenceType: 'PAYOUT_REJECTED',
          entries: [
            expect.objectContaining({
              accountType: LedgerAccountType.AFFILIATE_PAYABLE_FROZEN,
              direction: LedgerEntryDirection.DEBIT,
              amount: 1500000,
            }),
            expect.objectContaining({
              accountType: LedgerAccountType.AFFILIATE_PAYABLE_AVAILABLE,
              direction: LedgerEntryDirection.CREDIT,
              amount: 1500000,
            }),
          ],
        }),
      );
    });

    it('should fail if attempting to approve or reject an already completed payout', async () => {
      mockPrisma.affiliatePayoutRequest.findUnique.mockResolvedValue({
        id: 'payout-completed',
        status: AffiliatePayoutStatus.COMPLETED,
        amount: new Decimal(500000),
      });

      await expect(
        payoutService.approvePayout('payout-completed', 'admin-1'),
      ).rejects.toThrow(ConflictException);

      await expect(
        payoutService.rejectPayout('payout-completed', 'admin-1', 'Reason valid length'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('4. Fraud Operations & Partner Gating', () => {
    it('should open a fraud case and record an audit log', async () => {
      mockPrisma.affiliateProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrisma.affiliateFraudCase.create.mockResolvedValue({
        id: 'case-001',
        profileId: 'prof-test-1',
        reasonCode: 'CLICK_SPAM_VELOCITY',
        riskScore: new Decimal(88.5),
        status: 'OPEN',
      });

      const result = await fraudService.createFraudCase(
        {
          profileId: 'prof-test-1',
          reasonCode: 'CLICK_SPAM_VELOCITY',
          riskScore: 88.5,
          evidenceDetails: { clicksPerMinute: 350, ipDiversity: 0.02 },
        },
        'risk-engine-bot',
      );

      expect(result.status).toBe('OPEN');
      expect(mockPrisma.affiliateAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'FRAUD_CASE_OPENED',
            actorId: 'risk-engine-bot',
          }),
        }),
      );
    });

    it('should resolve fraud case as CONFIRMED and automatically suspend partner profile', async () => {
      mockPrisma.affiliateFraudCase.findUnique.mockResolvedValue({
        id: 'case-001',
        profileId: 'prof-test-1',
        status: 'OPEN',
      });

      const res = await fraudService.resolveFraudCase('case-001', 'admin-security-1', {
        resolution: 'CONFIRMED',
        note: 'Xác nhận dùng botnet click ảo và đơn hàng giả mạo',
      });

      expect(res.status).toBe('CONFIRMED');
      expect(res.actionTaken).toBe('PARTNER_SUSPENDED');

      // Partner profile suspended
      expect(mockPrisma.affiliateProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prof-test-1' },
          data: expect.objectContaining({
            status: 'SUSPENDED',
          }),
        }),
      );

      // Audit log
      expect(mockPrisma.affiliateAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'FRAUD_CASE_CONFIRMED',
          }),
        }),
      );
    });

    it('should resolve fraud case as DISMISSED and clear flags without suspending', async () => {
      mockPrisma.affiliateFraudCase.findUnique.mockResolvedValue({
        id: 'case-002',
        profileId: 'prof-test-1',
        status: 'OPEN',
      });

      const res = await fraudService.resolveFraudCase('case-002', 'admin-security-1', {
        resolution: 'DISMISSED',
        note: 'Lưu lượng tăng đột biến do livestream TikTok viral, hợp lệ',
      });

      expect(res.status).toBe('DISMISSED');
      expect(res.actionTaken).toBe('FLAG_CLEARED');
      expect(mockPrisma.affiliateProfile.update).not.toHaveBeenCalled();
    });

    it('should correctly report if a profile is gated by open fraud cases', async () => {
      mockPrisma.affiliateFraudCase.count
        .mockResolvedValueOnce(2) // 2 open cases
        .mockResolvedValueOnce(0); // 0 open cases

      const gated = await fraudService.isProfileGatedForFraud('prof-test-1');
      expect(gated).toBe(true);

      const notGated = await fraudService.isProfileGatedForFraud('prof-test-2');
      expect(notGated).toBe(false);
    });
  });
});
