import { Decimal } from '@prisma/client/runtime/library';

export enum BankTransferResultStatus {
  SUCCESS = 'SUCCESS',
  DEFINITIVE_FAILURE = 'DEFINITIVE_FAILURE',
  UNKNOWN_RESULT = 'UNKNOWN_RESULT',
}

export interface BankTransferParams {
  transferKey: string; // Deterministic external transfer reference (e.g. PAYOUT-${payoutId})
  payoutId: string;
  storeId: string;
  amount: string | Decimal;
  currency: string;
  bankCode?: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  memo: string;
}

export interface BankTransferResult {
  status: BankTransferResultStatus;
  provider: string;
  providerRef: string;
  transferKey: string;
  transferredAt?: Date;
  errorMessage?: string;
  rawResponse?: Record<string, any>;
}

export interface BankTransferProvider {
  readonly name: string;
  transfer(params: BankTransferParams): Promise<BankTransferResult>;
  queryStatus(transferKey: string): Promise<BankTransferResult>;
}

export const BANK_TRANSFER_PROVIDER = 'BANK_TRANSFER_PROVIDER';
