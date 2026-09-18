import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  BankTransferParams,
  BankTransferProvider,
  BankTransferResult,
  BankTransferResultStatus,
} from './bank-transfer.provider';

@Injectable()
export class MockBankTransferProvider implements BankTransferProvider {
  public readonly name = 'MOCK_BANK';
  private readonly logger = new Logger(MockBankTransferProvider.name);

  // In-memory transfer registry keyed by deterministic transferKey for idempotency and queryStatus
  private readonly transfersByTransferKey = new Map<string, BankTransferResult>();

  // Testing hooks
  private forceDefinitiveFailure = false;
  private definitiveFailureReason: string | null = null;
  private simulateUnknownTimeout = false;
  private unknownTimeoutReason: string | null = null;

  setForceDefinitiveFailure(force: boolean, reason: string = 'Tài khoản thụ hưởng không tồn tại hoặc bị khóa'): void {
    this.forceDefinitiveFailure = force;
    this.definitiveFailureReason = force ? reason : null;
  }

  setSimulateUnknownTimeout(enable: boolean, reason: string = 'Cổng ngân hàng không phản hồi (504 Gateway Timeout)'): void {
    this.simulateUnknownTimeout = enable;
    this.unknownTimeoutReason = enable ? reason : null;
  }

  clearRegistry(): void {
    this.transfersByTransferKey.clear();
    this.forceDefinitiveFailure = false;
    this.definitiveFailureReason = null;
    this.simulateUnknownTimeout = false;
    this.unknownTimeoutReason = null;
  }

  async transfer(params: BankTransferParams): Promise<BankTransferResult> {
    this.logger.log(
      `Initiating bank transfer [key=${params.transferKey}] for payout ${params.payoutId}: ${params.amount} ${params.currency} to ${params.bankName} (${params.accountNumber})`,
    );

    // 1. Idempotency Check: If transfer with this transferKey already succeeded, return cached result without duplicate disbursement
    const existing = this.transfersByTransferKey.get(params.transferKey);
    if (existing && existing.status === BankTransferResultStatus.SUCCESS) {
      this.logger.log(
        `Idempotent transfer detected for key ${params.transferKey}. Returning existing success ref: ${existing.providerRef}`,
      );
      return existing;
    }

    // 2. Simulated Unknown Timeout (Network crash / Gateway timeout while transfer state is uncertain)
    if (this.simulateUnknownTimeout) {
      this.logger.warn(`Simulating UNKNOWN_RESULT timeout for transferKey ${params.transferKey}`);
      // Record in bank registry as SUCCESS internally to simulate "bank processed it, but network timed out on return"
      const hiddenBankRef = `MOCK-VCB-TRANS-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
      this.transfersByTransferKey.set(params.transferKey, {
        status: BankTransferResultStatus.SUCCESS,
        provider: this.name,
        providerRef: hiddenBankRef,
        transferKey: params.transferKey,
        transferredAt: new Date(),
      });

      return {
        status: BankTransferResultStatus.UNKNOWN_RESULT,
        provider: this.name,
        providerRef: `MOCK-TIMEOUT-${params.transferKey}`,
        transferKey: params.transferKey,
        errorMessage: this.unknownTimeoutReason || 'Cổng ngân hàng không phản hồi (504 Gateway Timeout).',
      };
    }

    // 3. Simulated Definitive Failure (Invalid account number / explicitly requested failure)
    if (
      this.forceDefinitiveFailure ||
      params.memo?.includes('FAIL_TRANSFER') ||
      params.accountNumber === '9999999999' ||
      params.accountNumber === '0000000000'
    ) {
      const reason =
        this.definitiveFailureReason ||
        'Tài khoản thụ hưởng không tồn tại hoặc bị từ chối bởi ngân hàng nhận.';
      this.logger.warn(`Definitive failure triggered for transferKey ${params.transferKey}: ${reason}`);

      const failedResult: BankTransferResult = {
        status: BankTransferResultStatus.DEFINITIVE_FAILURE,
        provider: this.name,
        providerRef: `MOCK-FAIL-${params.transferKey}`,
        transferKey: params.transferKey,
        errorMessage: reason,
      };
      this.transfersByTransferKey.set(params.transferKey, failedResult);
      return failedResult;
    }

    // 4. Success Path
    const providerRef = `MOCK-VCB-TRANS-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const successResult: BankTransferResult = {
      status: BankTransferResultStatus.SUCCESS,
      provider: this.name,
      providerRef,
      transferKey: params.transferKey,
      transferredAt: new Date(),
      rawResponse: {
        statusCode: '00',
        message: 'Giao dịch chuyển khoản thành công',
        transactionRef: providerRef,
        transferKey: params.transferKey,
        amount: params.amount.toString(),
        currency: params.currency,
        recipient: {
          bankCode: params.bankCode,
          bankName: params.bankName,
          accountNumber: params.accountNumber,
          accountHolder: params.accountHolder,
        },
      },
    };

    this.transfersByTransferKey.set(params.transferKey, successResult);
    return successResult;
  }

  async queryStatus(transferKey: string): Promise<BankTransferResult> {
    this.logger.log(`Querying external bank transfer status for key: ${transferKey}`);
    const existing = this.transfersByTransferKey.get(transferKey);
    if (existing) {
      return existing;
    }

    // If not found in external provider registry, it was never executed
    return {
      status: BankTransferResultStatus.DEFINITIVE_FAILURE,
      provider: this.name,
      providerRef: `MOCK-NOT-FOUND-${transferKey}`,
      transferKey,
      errorMessage: 'Không tìm thấy thông tin giao dịch trên hệ thống ngân hàng.',
    };
  }
}
