import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { LedgerService } from '../../ledger/ledger.service';
import {
  AffiliatePayoutStatus,
  AffiliateWalletTxType,
  LedgerAccountType,
  LedgerEntryDirection,
} from '../../../../prisma/generated/client';
import { Decimal } from '@prisma/client/runtime/library';
import { SubmitKycDto, ReviewKycDto, CreatePayoutRequestDto } from '../dto/affiliate-payout.dto';
import * as crypto from 'crypto';

@Injectable()
export class AffiliatePayoutService {
  private readonly logger = new Logger(AffiliatePayoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
  ) {}

  /**
   * 1. Submit KYC and Bank Account details (CTV)
   */
  async submitKyc(userId: string, dto: SubmitKycDto) {
    const profile = await this.prisma.affiliateProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException(`Affiliate profile not found for user ${userId}`);
    }

    // Name consistency check
    const normalizedLegalName = dto.legalName.trim().toUpperCase();
    const normalizedHolderName = dto.accountHolderName.trim().toUpperCase();

    if (normalizedLegalName !== normalizedHolderName) {
      throw new BadRequestException(
        `Tên trên CCCD (${dto.legalName}) phải trùng khớp với tên chủ tài khoản ngân hàng (${dto.accountHolderName})`,
      );
    }

    const kycSnapshot = {
      legalName: dto.legalName.trim(),
      idCardNumber: dto.idCardNumber.trim(),
      idCardIssueDate: dto.idCardIssueDate,
      idCardIssuePlace: dto.idCardIssuePlace,
      frontImageUrl: dto.frontImageUrl,
      backImageUrl: dto.backImageUrl,
      bankName: dto.bankName,
      bankCode: dto.bankCode,
      accountNumber: dto.accountNumber.trim(),
      accountHolderName: dto.accountHolderName.trim(),
      submittedAt: new Date().toISOString(),
    };

    const auditLog = await this.prisma.affiliateAuditLog.create({
      data: {
        actorId: userId,
        actorRole: 'AFFILIATE',
        action: 'KYC_SUBMITTED',
        resource: 'AFFILIATE_PROFILE',
        resourceId: profile.id,
        reason: 'CTV submitted KYC identification and bank account',
        metadata: {
          status: 'PENDING_REVIEW',
          ...kycSnapshot,
        },
      },
    });

    return {
      success: true,
      status: 'PENDING_REVIEW',
      submissionId: auditLog.id,
      submittedAt: auditLog.createdAt,
    };
  }

  /**
   * 2. Review KYC (Admin)
   */
  async reviewKyc(profileId: string, reviewerId: string, dto: ReviewKycDto) {
    const profile = await this.prisma.affiliateProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile) {
      throw new NotFoundException(`Profile ${profileId} not found`);
    }

    const latestKycAudit = await this.prisma.affiliateAuditLog.findFirst({
      where: {
        resource: 'AFFILIATE_PROFILE',
        resourceId: profileId,
        action: 'KYC_SUBMITTED',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestKycAudit) {
      throw new NotFoundException(`No pending KYC submission found for profile ${profileId}`);
    }

    const meta = (latestKycAudit.metadata as any) || {};

    if (dto.status === 'APPROVED') {
      await this.prisma.affiliateAuditLog.create({
        data: {
          actorId: reviewerId,
          actorRole: 'ADMIN',
          action: 'KYC_APPROVED',
          resource: 'AFFILIATE_PROFILE',
          resourceId: profileId,
          reason: 'KYC identity and bank account verified',
          metadata: {
            ...meta,
            status: 'APPROVED',
            reviewedBy: reviewerId,
            reviewedAt: new Date().toISOString(),
          },
        },
      });

      return {
        profileId,
        status: 'APPROVED',
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      };
    } else {
      if (!dto.rejectionReason) {
        throw new BadRequestException('Rejection reason is required when rejecting KYC');
      }

      await this.prisma.affiliateAuditLog.create({
        data: {
          actorId: reviewerId,
          actorRole: 'ADMIN',
          action: 'KYC_REJECTED',
          resource: 'AFFILIATE_PROFILE',
          resourceId: profileId,
          reason: dto.rejectionReason,
          metadata: {
            ...meta,
            status: 'REJECTED',
            rejectionReason: dto.rejectionReason,
            reviewedBy: reviewerId,
            reviewedAt: new Date().toISOString(),
          },
        },
      });

      return {
        profileId,
        status: 'REJECTED',
        rejectionReason: dto.rejectionReason,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      };
    }
  }

  /**
   * 3. Get KYC status for a user
   */
  async getKycStatus(userId: string) {
    const profile = await this.prisma.affiliateProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException(`Affiliate profile not found for user ${userId}`);
    }

    const latestLog = await this.prisma.affiliateAuditLog.findFirst({
      where: {
        resource: 'AFFILIATE_PROFILE',
        resourceId: profile.id,
        action: { in: ['KYC_SUBMITTED', 'KYC_APPROVED', 'KYC_REJECTED'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestLog) {
      return {
        status: 'NOT_SUBMITTED',
        isVerified: false,
        bankSnapshot: null,
      };
    }

    const meta = (latestLog.metadata as any) || {};
    const isApproved = latestLog.action === 'KYC_APPROVED';

    return {
      status: isApproved ? 'APPROVED' : latestLog.action === 'KYC_REJECTED' ? 'REJECTED' : 'PENDING_REVIEW',
      isVerified: isApproved,
      rejectionReason: meta.rejectionReason || null,
      bankSnapshot: isApproved || latestLog.action === 'KYC_SUBMITTED' ? {
        bankName: meta.bankName,
        bankCode: meta.bankCode,
        accountNumber: meta.accountNumber,
        accountHolderName: meta.accountHolderName,
      } : null,
      lastUpdated: latestLog.createdAt,
    };
  }

  /**
   * 4. Create Payout Request (CTV)
   * Enforces: KYC Approved, Fraud Gating (no OPEN cases), 24h Daily Limit, Tax Withholding
   */
  async createPayoutRequest(userId: string, dto: CreatePayoutRequestDto) {
    const profile = await this.prisma.affiliateProfile.findUnique({
      where: { userId },
      include: {
        wallet: true,
        fraudCases: {
          where: { status: 'OPEN' },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException(`Affiliate profile not found for user ${userId}`);
    }

    const profileId = profile.id;

    // Idempotency check
    const existing = await this.prisma.affiliatePayoutRequest.findUnique({
      where: {
        profileId_idempotencyKey: {
          profileId,
          idempotencyKey: dto.idempotencyKey,
        },
      },
    });

    if (existing) {
      return existing;
    }

    // 1. KYC Gating
    const kycStatus = await this.getKycStatus(userId);
    if (!kycStatus.isVerified || !kycStatus.bankSnapshot) {
      throw new ForbiddenException(
        'Bạn cần hoàn tất xác minh danh tính và tài khoản ngân hàng (KYC) trước khi tạo yêu cầu rút tiền',
      );
    }

    // 2. Fraud Gating (Decision 3)
    if (profile.fraudCases && profile.fraudCases.length > 0) {
      throw new ForbiddenException(
        'Tài khoản đang có vụ việc nghi vấn gian lận đang được kiểm tra (OPEN Fraud Case). Tính năng rút tiền tạm khóa.',
      );
    }

    // 3. Daily Limit Check (Decision 2: Max 1 request per 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentRequest = await this.prisma.affiliatePayoutRequest.findFirst({
      where: {
        profileId,
        createdAt: { gte: twentyFourHoursAgo },
      },
    });

    if (recentRequest) {
      throw new BadRequestException(
        'Hạn mức tần suất: Mỗi đối tác chỉ được tạo tối đa 1 yêu cầu rút tiền trong vòng 24 giờ.',
      );
    }

    // 4. Wallet Balance Check
    const wallet = profile.wallet;
    if (!wallet) {
      throw new BadRequestException('Affiliate wallet not found');
    }

    const grossAmount = dto.amount;
    const availableNum = Number(wallet.availableBalance);

    if (availableNum < grossAmount) {
      throw new BadRequestException(
        `Số dư khả dụng không đủ. Yêu cầu: ${grossAmount.toLocaleString('vi-VN')} đ, Khả dụng: ${availableNum.toLocaleString('vi-VN')} đ`,
      );
    }

    // 5. Tax Withholding Calculation (Decision 3: 10% tax for payouts >= 2,000,000 VND)
    let taxRate = 0;
    let taxAmount = 0;
    let netAmount = grossAmount;

    if (grossAmount >= 2000000) {
      taxRate = 0.10; // 10%
      taxAmount = Math.floor(grossAmount * taxRate);
      netAmount = grossAmount - taxAmount;
    }

    const grossDec = new Decimal(grossAmount);
    const bankSnapshot = {
      ...kycStatus.bankSnapshot,
      grossAmount,
      taxRate,
      taxAmount,
      netAmount,
    };

    // 6. Execute Atomic Transaction: Freeze Balance, Create Payout, Post Ledger
    return this.prisma.$transaction(async (tx) => {
      const balanceBefore = wallet.availableBalance;
      const balanceAfter = balanceBefore.sub(grossDec);
      const frozenBefore = wallet.frozenBalance;
      const frozenAfter = frozenBefore.add(grossDec);

      // A. Update Wallet balances
      await tx.affiliateWallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: balanceAfter,
          frozenBalance: frozenAfter,
          version: { increment: 1 },
        },
      });

      // B. Create Payout Request
      const payout = await tx.affiliatePayoutRequest.create({
        data: {
          walletId: wallet.id,
          profileId,
          amount: grossDec,
          currency: wallet.currency,
          status: AffiliatePayoutStatus.PENDING,
          bankSnapshot,
          requestedBy: userId,
          idempotencyKey: dto.idempotencyKey,
        },
      });

      // C. Record Wallet Transaction
      await tx.affiliateWalletTransaction.create({
        data: {
          walletId: wallet.id,
          type: AffiliateWalletTxType.FREEZE_AVAILABLE,
          amount: grossDec,
          balanceBefore,
          balanceAfter,
          currency: wallet.currency,
          referenceType: 'PAYOUT_REQUEST',
          referenceId: payout.id,
          idempotencyKey: `AFF-FREEZE-${payout.id}`,
          description: `Freeze balance for payout request #${payout.id.slice(0, 8)}`,
        },
      });

      // D. Post General Ledger double-entry transaction
      await this.ledgerService.postTransactionWithTx(tx, {
        idempotencyKey: `AFF-LEDGER-PAYOUT-FREEZE-${payout.id}`,
        description: `Freeze affiliate payable for payout request #${payout.id.slice(0, 8)}`,
        referenceType: 'PAYOUT_REQUEST',
        referenceId: payout.id,
        currency: wallet.currency,
        entries: [
          {
            accountType: LedgerAccountType.AFFILIATE_PAYABLE_AVAILABLE,
            direction: LedgerEntryDirection.DEBIT,
            amount: grossAmount,
            description: `Debit available payable for payout ${payout.id}`,
          },
          {
            accountType: LedgerAccountType.AFFILIATE_PAYABLE_FROZEN,
            direction: LedgerEntryDirection.CREDIT,
            amount: grossAmount,
            description: `Credit frozen payable for payout ${payout.id}`,
          },
        ],
      });

      // E. Emit Outbox Event
      await tx.outboxEvent.create({
        data: {
          eventId: crypto.randomBytes(16).toString('hex'),
          type: 'AFFILIATE_PAYOUT_REQUESTED',
          aggregateId: payout.id,
          payload: {
            payoutId: payout.id,
            profileId,
            grossAmount,
            taxAmount,
            netAmount,
            requestedAt: payout.requestedAt,
          },
        },
      });

      return payout;
    });
  }

  /**
   * 5. Approve Payout & Disburse (Admin)
   */
  async approvePayout(payoutId: string, reviewerId: string, providerRef?: string) {
    const payout = await this.prisma.affiliatePayoutRequest.findUnique({
      where: { id: payoutId },
      include: { wallet: true },
    });

    if (!payout) {
      throw new NotFoundException(`Payout request ${payoutId} not found`);
    }

    if (payout.status !== AffiliatePayoutStatus.PENDING) {
      throw new ConflictException(`Cannot approve payout in status '${payout.status}'`);
    }

    const wallet = payout.wallet;
    const grossDec = payout.amount;
    const grossAmount = Number(grossDec);
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const frozenBefore = wallet.frozenBalance;
      const frozenAfter = Decimal.max(0, frozenBefore.sub(grossDec));
      const lifetimePaidAfter = wallet.lifetimePaid.add(grossDec);

      // A. Update Wallet
      await tx.affiliateWallet.update({
        where: { id: wallet.id },
        data: {
          frozenBalance: frozenAfter,
          lifetimePaid: lifetimePaidAfter,
          version: { increment: 1 },
        },
      });

      // B. Create Wallet Transaction: DEBIT_FROZEN_FOR_PAYOUT
      await tx.affiliateWalletTransaction.create({
        data: {
          walletId: wallet.id,
          type: AffiliateWalletTxType.DEBIT_FROZEN_FOR_PAYOUT,
          amount: grossDec,
          balanceBefore: frozenBefore,
          balanceAfter: frozenAfter,
          currency: wallet.currency,
          referenceType: 'PAYOUT_DISBURSED',
          referenceId: payout.id,
          idempotencyKey: `AFF-DISBURSE-${payout.id}`,
          description: `Disbursed payout #${payout.id.slice(0, 8)}`,
        },
      });

      // C. Post Ledger Transaction
      await this.ledgerService.postTransactionWithTx(tx, {
        idempotencyKey: `AFF-LEDGER-DISBURSE-${payout.id}`,
        description: `Disburse frozen affiliate payable for payout #${payout.id.slice(0, 8)}`,
        referenceType: 'PAYOUT_DISBURSED',
        referenceId: payout.id,
        currency: wallet.currency,
        entries: [
          {
            accountType: LedgerAccountType.AFFILIATE_PAYABLE_FROZEN,
            direction: LedgerEntryDirection.DEBIT,
            amount: grossAmount,
            description: `Debit frozen payable for completed payout ${payout.id}`,
          },
          {
            accountType: LedgerAccountType.AFFILIATE_PAYOUT_CLEARING,
            direction: LedgerEntryDirection.CREDIT,
            amount: grossAmount,
            description: `Credit payout clearing for bank disbursement`,
          },
        ],
      });

      // D. Update Payout Status to COMPLETED
      const updated = await tx.affiliatePayoutRequest.update({
        where: { id: payoutId },
        data: {
          status: AffiliatePayoutStatus.COMPLETED,
          reviewedBy: reviewerId,
          reviewedAt: now,
          disbursedAt: now,
          providerRef: providerRef || `Napas-${Date.now()}`,
        },
      });

      // E. Emit Outbox Event
      await tx.outboxEvent.create({
        data: {
          eventId: crypto.randomBytes(16).toString('hex'),
          type: 'AFFILIATE_PAYOUT_COMPLETED',
          aggregateId: payout.id,
          payload: {
            payoutId: payout.id,
            profileId: payout.profileId,
            grossAmount,
            disbursedAt: now,
          },
        },
      });

      return updated;
    });
  }

  /**
   * 6. Reject Payout & Refund Frozen Balance to Available (Admin)
   */
  async rejectPayout(payoutId: string, reviewerId: string, reason: string) {
    if (!reason || reason.trim().length < 5) {
      throw new BadRequestException('Lý do từ chối rút tiền phải có ít nhất 5 ký tự');
    }

    const payout = await this.prisma.affiliatePayoutRequest.findUnique({
      where: { id: payoutId },
      include: { wallet: true },
    });

    if (!payout) {
      throw new NotFoundException(`Payout request ${payoutId} not found`);
    }

    if (payout.status !== AffiliatePayoutStatus.PENDING) {
      throw new ConflictException(`Cannot reject payout in status '${payout.status}'`);
    }

    const wallet = payout.wallet;
    const grossDec = payout.amount;
    const grossAmount = Number(grossDec);
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const frozenBefore = wallet.frozenBalance;
      const frozenAfter = Decimal.max(0, frozenBefore.sub(grossDec));
      const availableBefore = wallet.availableBalance;
      const availableAfter = availableBefore.add(grossDec);

      // A. Restore Wallet balances
      await tx.affiliateWallet.update({
        where: { id: wallet.id },
        data: {
          frozenBalance: frozenAfter,
          availableBalance: availableAfter,
          version: { increment: 1 },
        },
      });

      // B. Create Wallet Transaction: UNFREEZE_TO_AVAILABLE
      await tx.affiliateWalletTransaction.create({
        data: {
          walletId: wallet.id,
          type: AffiliateWalletTxType.UNFREEZE_TO_AVAILABLE,
          amount: grossDec,
          balanceBefore: availableBefore,
          balanceAfter: availableAfter,
          currency: wallet.currency,
          referenceType: 'PAYOUT_REJECTED',
          referenceId: payout.id,
          idempotencyKey: `AFF-UNFREEZE-${payout.id}`,
          description: `Unfreeze balance for rejected payout #${payout.id.slice(0, 8)}: ${reason}`,
        },
      });

      // C. Post Balancing Ledger Transaction
      await this.ledgerService.postTransactionWithTx(tx, {
        idempotencyKey: `AFF-LEDGER-UNFREEZE-${payout.id}`,
        description: `Unfreeze affiliate payable for rejected payout #${payout.id.slice(0, 8)}`,
        referenceType: 'PAYOUT_REJECTED',
        referenceId: payout.id,
        currency: wallet.currency,
        entries: [
          {
            accountType: LedgerAccountType.AFFILIATE_PAYABLE_FROZEN,
            direction: LedgerEntryDirection.DEBIT,
            amount: grossAmount,
            description: `Debit frozen payable to restore available balance`,
          },
          {
            accountType: LedgerAccountType.AFFILIATE_PAYABLE_AVAILABLE,
            direction: LedgerEntryDirection.CREDIT,
            amount: grossAmount,
            description: `Restore available payable for rejected payout ${payout.id}`,
          },
        ],
      });

      // D. Update Payout Status to REJECTED
      const updated = await tx.affiliatePayoutRequest.update({
        where: { id: payoutId },
        data: {
          status: AffiliatePayoutStatus.REJECTED,
          reviewedBy: reviewerId,
          reviewedAt: now,
          rejectionReason: reason,
        },
      });

      return updated;
    });
  }

  /**
   * 7. List Payout Requests (Admin / CTV)
   */
  async listPayoutRequests(
    options: {
      profileId?: string;
      status?: AffiliatePayoutStatus;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options.profileId) where.profileId = options.profileId;
    if (options.status) where.status = options.status;

    const [items, total] = await Promise.all([
      this.prisma.affiliatePayoutRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.affiliatePayoutRequest.count({ where }),
    ]);

    return {
      items: items.map((p) => ({
        id: p.id,
        profileId: p.profileId,
        amount: Number(p.amount),
        currency: p.currency,
        status: p.status,
        bankSnapshot: p.bankSnapshot,
        requestedAt: p.requestedAt,
        reviewedAt: p.reviewedAt,
        disbursedAt: p.disbursedAt,
        rejectionReason: p.rejectionReason,
        providerRef: p.providerRef,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
