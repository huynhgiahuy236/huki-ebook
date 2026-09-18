import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
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
import {
  BANK_TRANSFER_PROVIDER,
  BankTransferProvider,
  BankTransferResult,
  BankTransferResultStatus,
} from './bank-transfer.provider';
import {
  BatchDisbursementResultView,
  CancelFailedPayoutDto,
  DisbursementResultView,
  PayoutRequestView,
} from '../dto/payout.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class PayoutProcessorService {
  private readonly logger = new Logger(PayoutProcessorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly ledgerService: LedgerService,
    @Inject(BANK_TRANSFER_PROVIDER)
    private readonly bankProvider: BankTransferProvider,
  ) {}

  /**
   * Validate platform admin permissions
   */
  private validateAdminAccess(actor: BookActor): void {
    const isPlatformAdmin = actor.role === 'ADMIN' || actor.role === 'PLATFORM_ADMIN';
    if (!isPlatformAdmin) {
      throw new ForbiddenException({
        code: 'FORBIDDEN_ADMIN_ACCESS',
        message: 'Chỉ quản trị viên nền tảng (Admin) mới có quyền thực hiện giải ngân chuyển khoản.',
      });
    }
  }

  /**
   * Helper: Generate stable deterministic external transfer key for provider idempotency
   */
  public getDeterministicTransferKey(payoutId: string): string {
    return `PAYOUT-${payoutId}`;
  }

  /**
   * Helper: Sanitize external provider errors to prevent leaking credentials/secrets
   */
  private sanitizeErrorMessage(msg?: string): string {
    if (!msg) return 'Lỗi chuyển khoản ngân hàng không xác định.';
    // Remove potential token/key patterns
    return msg
      .replace(/bearer\s+[a-zA-Z0-9_\-\.]+/gi, 'Bearer [REDACTED]')
      .replace(/token=[a-zA-Z0-9_\-\.]+/gi, 'token=[REDACTED]')
      .replace(/password=[^\s&]+/gi, 'password=[REDACTED]')
      .replace(/client_secret=[^\s&]+/gi, 'client_secret=[REDACTED]')
      .trim();
  }

  /**
   * Disburse a single APPROVED payout request via Banking Provider
   */
  async disbursePayout(
    payoutId: string,
    actor: BookActor,
  ): Promise<DisbursementResultView> {
    this.validateAdminAccess(actor);

    // Step 1: Atomic state transition: APPROVED -> PROCESSING
    const updateResult = await this.prisma.payoutRequest.updateMany({
      where: {
        id: payoutId,
        status: PayoutRequestStatus.APPROVED,
      },
      data: {
        status: PayoutRequestStatus.PROCESSING,
      },
    });

    if (updateResult.count === 0) {
      const current = await this.prisma.payoutRequest.findUnique({
        where: { id: payoutId },
      });
      if (!current) {
        throw new NotFoundException(`Không tìm thấy yêu cầu rút tiền ${payoutId}`);
      }
      throw new ConflictException({
        code: 'INVALID_PAYOUT_STATUS_FOR_DISBURSEMENT',
        message: `Không thể giải ngân: Yêu cầu rút tiền đang ở trạng thái ${current.status}, chỉ chấp nhận APPROVED.`,
      });
    }

    const payout = await this.prisma.payoutRequest.findUnique({
      where: { id: payoutId },
    });
    if (!payout) {
      throw new NotFoundException(`Không tìm thấy yêu cầu rút tiền ${payoutId}`);
    }

    const decAmount = new Decimal(payout.amount);
    const rawSnapshot =
      typeof payout.bankSnapshot === 'string'
        ? JSON.parse(payout.bankSnapshot)
        : payout.bankSnapshot || {};

    const transferKey = this.getDeterministicTransferKey(payout.id);

    // Step 2: Execute transfer with deterministic transferKey
    let transferResult: BankTransferResult;
    try {
      transferResult = await this.bankProvider.transfer({
        transferKey,
        payoutId: payout.id,
        storeId: payout.storeId,
        amount: decAmount,
        currency: payout.currency,
        bankCode: rawSnapshot.bankCode,
        bankName: rawSnapshot.bankName || 'Ngân hàng thụ hưởng',
        accountNumber: rawSnapshot.accountNumber || '',
        accountHolder: rawSnapshot.accountHolder || '',
        memo: `HUKI PAYOUT ${payout.id}`,
      });
    } catch (err: any) {
      this.logger.error(`Unhandled bank transfer exception for payout ${payoutId}: ${err.message}`, err.stack);
      transferResult = {
        status: BankTransferResultStatus.UNKNOWN_RESULT,
        provider: this.bankProvider.name,
        providerRef: `ERR-${randomUUID().slice(0, 8)}`,
        transferKey,
        errorMessage: this.sanitizeErrorMessage(err.message),
      };
    }

    // Step 3a: Success Path
    if (transferResult.status === BankTransferResultStatus.SUCCESS) {
      return this.finalizeDisbursementSuccess(payout, transferResult, actor);
    }

    // Step 3b: Definitive Failure Path (e.g. invalid account, rejected by beneficiary)
    if (transferResult.status === BankTransferResultStatus.DEFINITIVE_FAILURE) {
      const failureReason = this.sanitizeErrorMessage(transferResult.errorMessage);
      await this.prisma.$transaction(async (tx) => {
        await tx.payoutRequest.update({
          where: { id: payout.id },
          data: {
            status: PayoutRequestStatus.FAILED,
            provider: transferResult.provider || this.bankProvider.name,
            providerRef: transferResult.providerRef,
            failureReason,
          },
        });

        await tx.outboxEvent.create({
          data: {
            eventId: `EVT-${randomUUID()}`,
            type: 'PAYOUT_FAILED',
            aggregateId: payout.id,
            payload: {
              payoutId: payout.id,
              storeId: payout.storeId,
              amount: decAmount.toString(),
              provider: transferResult.provider,
              providerRef: transferResult.providerRef,
              failureReason,
              attemptedBy: actor.sub,
            },
          },
        });
      });

      this.logger.warn(`Payout ${payoutId} disbursement definitively failed: ${failureReason}`);

      return {
        payoutId: payout.id,
        status: PayoutRequestStatus.FAILED,
        success: false,
        provider: transferResult.provider,
        providerRef: transferResult.providerRef,
        failureReason,
        error: failureReason,
      };
    }

    // Step 3c: UNKNOWN_RESULT (Timeout, network drop, unhandled 5xx)
    // CRITICAL: DO NOT mark as normal FAILED. Keep in PROCESSING with UNKNOWN_OUTCOME tag to prevent blind resend.
    const unknownReason = `[UNKNOWN_OUTCOME] ${this.sanitizeErrorMessage(transferResult.errorMessage || 'Mạng ngân hàng bị gián đoạn hoặc quá thời gian chờ (Timeout). Cần đối soát trạng thái trước khi thực hiện lại.')}`;
    await this.prisma.$transaction(async (tx) => {
      await tx.payoutRequest.update({
        where: { id: payout.id },
        data: {
          status: PayoutRequestStatus.PROCESSING,
          provider: transferResult.provider || this.bankProvider.name,
          providerRef: transferResult.providerRef,
          failureReason: unknownReason,
        },
      });

      await tx.outboxEvent.create({
        data: {
          eventId: `EVT-${randomUUID()}`,
          type: 'PAYOUT_PROCESSING_UNKNOWN',
          aggregateId: payout.id,
          payload: {
            payoutId: payout.id,
            storeId: payout.storeId,
            transferKey,
            failureReason: unknownReason,
            attemptedBy: actor.sub,
          },
        },
      });
    });

    this.logger.error(`Payout ${payoutId} resulted in UNKNOWN_RESULT: ${unknownReason}`);

    return {
      payoutId: payout.id,
      status: PayoutRequestStatus.PROCESSING,
      success: false,
      provider: transferResult.provider,
      providerRef: transferResult.providerRef,
      failureReason: unknownReason,
      error: unknownReason,
    };
  }

  /**
   * Helper: Finalize successful disbursement in database and ledger atomically
   */
  private async finalizeDisbursementSuccess(
    payout: any,
    transferResult: BankTransferResult,
    actor: BookActor,
  ): Promise<DisbursementResultView> {
    const decAmount = new Decimal(payout.amount);
    const disbursedAt = transferResult.transferredAt || new Date();

    await this.prisma.$transaction(async (tx) => {
      // 1. Mark Payout COMPLETED
      await tx.payoutRequest.update({
        where: { id: payout.id },
        data: {
          status: PayoutRequestStatus.COMPLETED,
          disbursedAt,
          provider: transferResult.provider,
          providerRef: transferResult.providerRef,
          failureReason: null,
        },
      });

      // 2. Debit frozen wallet balance (WAL-001: frozenBalance drops, totalBalance drops)
      await this.walletService.debitFrozenWithTx(tx, payout.storeId, decAmount, {
        referenceType: 'PAYOUT_DISBURSEMENT',
        referenceId: payout.id,
        description: `Giải ngân chuyển khoản ngân hàng thành công (${transferResult.providerRef})`,
      });

      // 3. Post balanced double-entry Ledger journal (DEBIT SELLER_FROZEN, CREDIT PAYOUT_CLEARING)
      await this.ledgerService.postTransactionWithTx(tx, {
        idempotencyKey: `LEDGER-PAYOUT-DISB-${payout.id}`,
        description: `Giải ngân lệnh rút tiền ${payout.id} qua ${transferResult.provider}`,
        referenceType: 'PAYOUT_DISBURSEMENT',
        referenceId: payout.id,
        storeId: payout.storeId,
        currency: payout.currency,
        entries: [
          {
            accountType: LedgerAccountType.SELLER_FROZEN,
            direction: LedgerEntryDirection.DEBIT,
            amount: decAmount.toNumber(),
          },
          {
            accountType: LedgerAccountType.PAYOUT_CLEARING,
            direction: LedgerEntryDirection.CREDIT,
            amount: decAmount.toNumber(),
          },
        ],
      });

      // 4. Outbox Event
      await tx.outboxEvent.create({
        data: {
          eventId: `EVT-${randomUUID()}`,
          type: 'PAYOUT_COMPLETED',
          aggregateId: payout.id,
          payload: {
            payoutId: payout.id,
            storeId: payout.storeId,
            amount: decAmount.toString(),
            provider: transferResult.provider,
            providerRef: transferResult.providerRef,
            disbursedAt: disbursedAt.toISOString(),
            disbursedBy: actor.sub,
          },
        },
      });
    });

    this.logger.log(`Payout ${payout.id} finalized successfully with providerRef ${transferResult.providerRef}`);

    return {
      payoutId: payout.id,
      status: PayoutRequestStatus.COMPLETED,
      success: true,
      provider: transferResult.provider,
      providerRef: transferResult.providerRef,
      disbursedAt,
    };
  }

  /**
   * Retry disbursement for a FAILED or UNKNOWN PROCESSING payout request
   * Reconciles with provider via deterministic transferKey first to prevent double transfer!
   */
  async retryPayout(
    payoutId: string,
    actor: BookActor,
  ): Promise<DisbursementResultView> {
    this.validateAdminAccess(actor);

    const payout = await this.prisma.payoutRequest.findUnique({
      where: { id: payoutId },
    });
    if (!payout) {
      throw new NotFoundException(`Không tìm thấy yêu cầu rút tiền ${payoutId}`);
    }

    if (
      payout.status !== PayoutRequestStatus.FAILED &&
      payout.status !== PayoutRequestStatus.PROCESSING
    ) {
      throw new ConflictException({
        code: 'INVALID_STATUS_FOR_RETRY',
        message: `Chỉ có thể thử lại lệnh rút tiền đang ở trạng thái FAILED hoặc PROCESSING (Hiện tại: ${payout.status}).`,
      });
    }

    const transferKey = this.getDeterministicTransferKey(payout.id);

    // 1. Query external provider status using deterministic transferKey
    const queryResult = await this.bankProvider.queryStatus(transferKey);

    // 2. If provider actually executed transfer successfully in the past, finalize local completion directly
    if (queryResult.status === BankTransferResultStatus.SUCCESS) {
      this.logger.log(`Retry query detected prior external transfer success for key ${transferKey}. Finalizing locally.`);
      return this.finalizeDisbursementSuccess(payout, queryResult, actor);
    }

    // 3. Otherwise, reset status to APPROVED and re-execute transfer with same transferKey
    await this.prisma.payoutRequest.update({
      where: { id: payoutId },
      data: {
        status: PayoutRequestStatus.APPROVED,
        failureReason: null,
      },
    });

    return this.disbursePayout(payoutId, actor);
  }

  /**
   * Cancel a FAILED payout request and release reserved funds back to Seller Available balance.
   * STRICT SAFETY INVARIANT: Must verify with provider that transfer was NOT executed.
   */
  async cancelFailedAndRefund(
    payoutId: string,
    dto: CancelFailedPayoutDto,
    actor: BookActor,
  ): Promise<PayoutRequestView> {
    this.validateAdminAccess(actor);

    if (!dto.reason || dto.reason.trim().length === 0) {
      throw new BadRequestException('Vui lòng cung cấp lý do hủy lệnh rút tiền thất bại.');
    }

    const reason = dto.reason.trim();
    const payout = await this.prisma.payoutRequest.findUnique({
      where: { id: payoutId },
    });
    if (!payout) {
      throw new NotFoundException(`Không tìm thấy yêu cầu rút tiền ${payoutId}`);
    }

    if (
      payout.status !== PayoutRequestStatus.FAILED &&
      payout.status !== PayoutRequestStatus.PROCESSING
    ) {
      throw new ConflictException({
        code: 'INVALID_STATUS_FOR_CANCEL_REFUND',
        message: `Chỉ có thể hủy và hoàn tiền lệnh rút tiền đang ở trạng thái FAILED hoặc PROCESSING (Hiện tại: ${payout.status}).`,
      });
    }

    // Query external provider to prove funds were NOT disbursed
    const transferKey = this.getDeterministicTransferKey(payout.id);
    const queryResult = await this.bankProvider.queryStatus(transferKey);

    if (queryResult.status === BankTransferResultStatus.SUCCESS) {
      // Invariant Protection: Never refund if bank transfer succeeded!
      this.logger.error(`Attempted refund on already disbursed payout ${payoutId}. Auto-recovering to COMPLETED.`);
      await this.finalizeDisbursementSuccess(payout, queryResult, actor);
      throw new ConflictException({
        code: 'CANNOT_REFUND_DISBURSED_PAYOUT',
        message: 'Không thể hoàn tiền: Ngân hàng xác nhận giao dịch đã chuyển khoản thành công. Hệ thống đã tự động cập nhật trạng thái sang COMPLETED.',
      });
    }

    // Confirmed not disbursed: Proceed with atomic refund and compensating ledger journal
    return await this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.payoutRequest.updateMany({
        where: {
          id: payoutId,
          status: { in: [PayoutRequestStatus.FAILED, PayoutRequestStatus.PROCESSING] },
        },
        data: {
          status: PayoutRequestStatus.REJECTED,
          rejectionReason: `[HỦY DO LỖI CHUYỂN KHOẢN] ${reason}`,
          reviewedBy: actor.sub,
          reviewedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        throw new ConflictException('Lệnh rút tiền đã được cập nhật bởi tiến trình khác.');
      }

      const decAmount = new Decimal(payout.amount);

      // Release reserved funds: Frozen -> Available
      await this.walletService.moveFrozenToAvailableWithTx(tx, payout.storeId, decAmount, {
        referenceType: 'PAYOUT_CANCEL_REFUND',
        referenceId: payout.id,
        description: `Hoàn trả số dư khả dụng do hủy lệnh rút tiền lỗi ${payout.id}: ${reason}`,
      });

      // Post compensating Ledger entry: DEBIT SELLER_FROZEN, CREDIT SELLER_AVAILABLE
      await this.ledgerService.postTransactionWithTx(tx, {
        idempotencyKey: `LEDGER-PAYOUT-CAN-${payout.id}`,
        description: `Hoàn trả số dư phong tỏa cho lệnh rút tiền thất bại bị hủy ${payout.id}`,
        referenceType: 'PAYOUT_CANCEL_REFUND',
        referenceId: payout.id,
        storeId: payout.storeId,
        currency: payout.currency,
        entries: [
          {
            accountType: LedgerAccountType.SELLER_FROZEN,
            direction: LedgerEntryDirection.DEBIT,
            amount: decAmount.toNumber(),
          },
          {
            accountType: LedgerAccountType.SELLER_AVAILABLE,
            direction: LedgerEntryDirection.CREDIT,
            amount: decAmount.toNumber(),
          },
        ],
      });

      // Outbox Event
      await tx.outboxEvent.create({
        data: {
          eventId: `EVT-${randomUUID()}`,
          type: 'PAYOUT_CANCELLED_REFUNDED',
          aggregateId: payout.id,
          payload: {
            payoutId: payout.id,
            storeId: payout.storeId,
            amount: decAmount.toString(),
            reason,
            cancelledBy: actor.sub,
          },
        },
      });

      const rawSnapshot =
        typeof payout.bankSnapshot === 'string'
          ? JSON.parse(payout.bankSnapshot)
          : payout.bankSnapshot || {};

      return {
        id: payout.id,
        storeId: payout.storeId,
        walletId: payout.walletId,
        amount: decAmount.toString(),
        currency: payout.currency,
        status: PayoutRequestStatus.REJECTED,
        bankSnapshot: {
          bankCode: rawSnapshot.bankCode,
          bankName: rawSnapshot.bankName || 'Ngân hàng thụ hưởng',
          accountNumberMasked: this.maskAccountNumber(rawSnapshot.accountNumber || ''),
          accountHolder: rawSnapshot.accountHolder || '',
          businessName: rawSnapshot.businessName,
        },
        requestedBy: payout.requestedBy,
        reviewedBy: actor.sub,
        requestedAt: payout.requestedAt,
        reviewedAt: new Date(),
        disbursedAt: payout.disbursedAt,
        provider: payout.provider,
        providerRef: payout.providerRef,
        failureReason: payout.failureReason,
        rejectionReason: `[HỦY DO LỖI CHUYỂN KHOẢN] ${reason}`,
        idempotencyKey: payout.idempotencyKey,
        createdAt: payout.createdAt,
        updatedAt: new Date(),
      };
    });
  }

  /**
   * Reconcile stale/unknown PROCESSING payout with external provider (Processing Recovery Primitive)
   */
  async reconcilePayoutWithProvider(
    payoutId: string,
    actor: BookActor,
  ): Promise<DisbursementResultView> {
    this.validateAdminAccess(actor);

    const payout = await this.prisma.payoutRequest.findUnique({
      where: { id: payoutId },
    });
    if (!payout) {
      throw new NotFoundException(`Không tìm thấy yêu cầu rút tiền ${payoutId}`);
    }

    const transferKey = this.getDeterministicTransferKey(payout.id);
    const queryResult = await this.bankProvider.queryStatus(transferKey);

    if (queryResult.status === BankTransferResultStatus.SUCCESS) {
      return this.finalizeDisbursementSuccess(payout, queryResult, actor);
    }

    if (queryResult.status === BankTransferResultStatus.DEFINITIVE_FAILURE) {
      const failureReason = this.sanitizeErrorMessage(queryResult.errorMessage);
      await this.prisma.payoutRequest.update({
        where: { id: payout.id },
        data: {
          status: PayoutRequestStatus.FAILED,
          failureReason,
        },
      });
      return {
        payoutId: payout.id,
        status: PayoutRequestStatus.FAILED,
        success: false,
        failureReason,
      };
    }

    return {
      payoutId: payout.id,
      status: payout.status,
      success: false,
      failureReason: 'Trạng thái tại ngân hàng vẫn đang chờ xử lý (Pending/Unknown).',
    };
  }

  /**
   * Batch disburse multiple APPROVED payout requests
   */
  async disburseBatch(
    payoutIds: string[],
    actor: BookActor,
  ): Promise<BatchDisbursementResultView> {
    this.validateAdminAccess(actor);

    const results: DisbursementResultView[] = [];
    let succeeded = 0;
    let failed = 0;

    for (const id of payoutIds) {
      try {
        const res = await this.disbursePayout(id, actor);
        results.push(res);
        if (res.success) {
          succeeded++;
        } else {
          failed++;
        }
      } catch (err: any) {
        this.logger.error(`Error processing batch payout ${id}: ${err.message}`);
        results.push({
          payoutId: id,
          status: PayoutRequestStatus.FAILED,
          success: false,
          error: this.sanitizeErrorMessage(err.message),
          failureReason: this.sanitizeErrorMessage(err.message),
        });
        failed++;
      }
    }

    return {
      total: payoutIds.length,
      succeeded,
      failed,
      results,
    };
  }

  private maskAccountNumber(accNo: string): string {
    if (!accNo || accNo.length < 6) return '****';
    const firstPart = accNo.slice(0, 4);
    const lastPart = accNo.slice(-2);
    return `${firstPart}****${lastPart}`;
  }
}
