import { apiClient } from './apiClient';
import type { ApiResponse } from './types';

export interface WalletData {
  id: string;
  storeId: string;
  ownerUserId: string;
  availableBalance: number;
  pendingBalance: number;
  frozenBalance: number;
  totalBalance: number;
  currency: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransactionItem {
  id: string;
  walletId: string;
  type:
    | 'CREDIT_AVAILABLE'
    | 'CREDIT_PENDING'
    | 'CREDIT_FROZEN'
    | 'DEBIT_AVAILABLE'
    | 'MOVE_PENDING_TO_AVAILABLE'
    | 'MOVE_AVAILABLE_TO_FROZEN'
    | 'MOVE_FROZEN_TO_AVAILABLE'
    | 'MOVE_FROZEN_TO_PENDING';
  amount: number;
  availableBefore: number;
  availableAfter: number;
  pendingBefore: number;
  pendingAfter: number;
  frozenBefore: number;
  frozenAfter: number;
  referenceType?: string | null;
  referenceId?: string | null;
  description?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
}

export interface WalletTransactionsData {
  items: WalletTransactionItem[];
  total: number;
  page: number;
  limit: number;
}

export interface WalletSecurityStatus {
  hasPin: boolean;
  isLocked: boolean;
  lockedUntil: string | null;
  remainingAttempts: number;
  pinSetAt: string | null;
}

export interface PinVerifyResult {
  verified: boolean;
  step1Token?: string;
  remainingAttempts?: number;
  message: string;
}

export interface TwoFactorChallengeResult {
  challengeId: string;
  expiresInSeconds: number;
  message: string;
}

export interface TwoFactorVerifyResult {
  verified: boolean;
  financeAuthToken: string;
  expiresAt: string;
  message: string;
}

export const walletApi = {
  /**
   * Get 3-Tier Wallet Balance for a store (Available, Pending, Frozen, Total)
   * WAL-001 Invariant: Total = Available + Pending + Frozen
   */
  getStoreWallet: async (storeId: string): Promise<ApiResponse<WalletData>> => {
    return apiClient<WalletData>(`/wallet/store/${encodeURIComponent(storeId)}`, {
      method: 'GET',
    });
  },

  /**
   * Get paginated operational wallet transaction history for a store
   */
  getStoreWalletTransactions: async (
    storeId: string,
    params: { page?: number; limit?: number } = {},
  ): Promise<ApiResponse<WalletTransactionsData>> => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    const qs = searchParams.toString();
    const endpoint = `/wallet/store/${encodeURIComponent(storeId)}/transactions${qs ? `?${qs}` : ''}`;
    return apiClient<WalletTransactionsData>(endpoint, {
      method: 'GET',
    });
  },

  /**
   * Task 75: Get Wallet Security and PIN status
   */
  getSecurityStatus: async (storeId: string): Promise<ApiResponse<WalletSecurityStatus>> => {
    return apiClient<WalletSecurityStatus>(`/wallet/store/${encodeURIComponent(storeId)}/security/status`, {
      method: 'GET',
    });
  },

  /**
   * Task 75: Setup initial 6-digit withdrawal PIN
   */
  setupPin: async (storeId: string, pin: string): Promise<ApiResponse<{ message: string; hasPin: boolean }>> => {
    return apiClient<{ message: string; hasPin: boolean }>(`/wallet/store/${encodeURIComponent(storeId)}/security/pin/setup`, {
      method: 'POST',
      body: JSON.stringify({ storeId, pin }),
    });
  },

  /**
   * Task 75: Verify 6-digit withdrawal PIN (Step 1)
   */
  verifyPin: async (storeId: string, pin: string, purpose?: string): Promise<ApiResponse<PinVerifyResult>> => {
    return apiClient<PinVerifyResult>(`/wallet/store/${encodeURIComponent(storeId)}/security/pin/verify`, {
      method: 'POST',
      body: JSON.stringify({ storeId, pin, purpose }),
    });
  },

  /**
   * Task 75: Request Step-Up 2FA OTP Challenge
   */
  issueTwoFactorChallenge: async (storeId: string, purpose: string, step1Token: string): Promise<ApiResponse<TwoFactorChallengeResult>> => {
    return apiClient<TwoFactorChallengeResult>(`/wallet/store/${encodeURIComponent(storeId)}/security/2fa/challenge`, {
      method: 'POST',
      body: JSON.stringify({ storeId, purpose, step1Token }),
    });
  },

  /**
   * Task 75: Verify 2FA OTP Code (Step 2) -> Obtain Finance Authorization Token
   */
  verifyTwoFactorChallenge: async (storeId: string, challengeId: string, code: string): Promise<ApiResponse<TwoFactorVerifyResult>> => {
    return apiClient<TwoFactorVerifyResult>(`/wallet/store/${encodeURIComponent(storeId)}/security/2fa/verify`, {
      method: 'POST',
      body: JSON.stringify({ storeId, challengeId, code }),
    });
  },
};

export interface PayoutRequestItem {
  id: string;
  storeId: string;
  walletId: string;
  amount: number | string;
  currency: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  bankSnapshot: {
    bankCode?: string;
    bankName: string;
    accountNumber?: string;
    accountNumberMasked?: string;
    maskedAccountNumber?: string;
    accountHolder: string;
    businessName?: string;
    branch?: string;
  };
  requestedBy: string;
  reviewedBy?: string | null;
  requestedAt?: string;
  approvedAt?: string | null;
  reviewedAt?: string | null;
  disbursedAt?: string | null;
  provider?: string | null;
  providerRef?: string | null;
  failureReason?: string | null;
  rejectReason?: string | null;
  rejectionReason?: string | null;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
}

export type PayoutRequestView = PayoutRequestItem;

export interface PayoutRequestsData {
  items: PayoutRequestItem[];
  total: number;
  page: number;
  limit: number;
}

export interface DisbursementResult {
  payoutId: string;
  status: 'COMPLETED' | 'FAILED';
  success: boolean;
  provider?: string;
  providerRef?: string;
  disbursedAt?: string;
  failureReason?: string;
  error?: string;
}

export interface BatchDisbursementResult {
  total: number;
  succeeded: number;
  failed: number;
  results: DisbursementResult[];
}

export const payoutApi = {
  /**
   * Task 76: Create Payout Request (Seller initiates withdrawal)
   */
  createPayoutRequest: async (
    storeId: string,
    data: { amount: number | string; financeAuthToken: string; idempotencyKey: string },
  ): Promise<ApiResponse<PayoutRequestItem>> => {
    return apiClient<PayoutRequestItem>(`/payout/store/${encodeURIComponent(storeId)}/request`, {
      method: 'POST',
      body: JSON.stringify({
        storeId,
        amount: String(data.amount),
        financeAuthToken: data.financeAuthToken,
        idempotencyKey: data.idempotencyKey,
      }),
    });
  },

  /**
   * Task 76: Get Store Payout Requests History (Seller)
   */
  getStorePayoutRequests: async (
    storeId: string,
    params: { page?: number; limit?: number; status?: string } = {},
  ): Promise<ApiResponse<PayoutRequestsData>> => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.status) searchParams.set('status', params.status);
    const qs = searchParams.toString();
    return apiClient<PayoutRequestsData>(`/payout/store/${encodeURIComponent(storeId)}/requests${qs ? `?${qs}` : ''}`, {
      method: 'GET',
    });
  },

  /**
   * Task 76: Platform Admin Review Payout Request (Approve / Reject)
   */
  reviewPayoutRequest: async (
    id: string,
    data: { action: 'APPROVE' | 'REJECT'; rejectReason?: string; rejectionReason?: string },
  ): Promise<ApiResponse<PayoutRequestItem>> => {
    return apiClient<PayoutRequestItem>(`/payout/admin/requests/${encodeURIComponent(id)}/review`, {
      method: 'POST',
      body: JSON.stringify({
        action: data.action,
        rejectionReason: data.rejectionReason || data.rejectReason,
      }),
    });
  },

  /**
   * Task 76: Platform Admin Get All Payout Requests
   */
  getAllPayoutRequests: async (
    params: { page?: number; limit?: number; status?: string } = {},
  ): Promise<ApiResponse<PayoutRequestsData>> => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.status) searchParams.set('status', params.status);
    const qs = searchParams.toString();
    return apiClient<PayoutRequestsData>(`/payout/admin/requests${qs ? `?${qs}` : ''}`, {
      method: 'GET',
    });
  },

  /**
   * Task 77: Platform Admin Disburse Single Approved Payout Request
   */
  disbursePayout: async (id: string): Promise<ApiResponse<DisbursementResult>> => {
    return apiClient<DisbursementResult>(`/payout/admin/requests/${encodeURIComponent(id)}/disburse`, {
      method: 'POST',
    });
  },

  /**
   * Task 77: Platform Admin Batch Disburse Multiple Approved Payout Requests
   */
  disburseBatch: async (payoutIds: string[]): Promise<ApiResponse<BatchDisbursementResult>> => {
    return apiClient<BatchDisbursementResult>('/payout/admin/disburse-batch', {
      method: 'POST',
      body: JSON.stringify({ payoutIds }),
    });
  },

  /**
   * Task 77: Platform Admin Retry Failed Payout Request
   */
  retryPayout: async (id: string): Promise<ApiResponse<DisbursementResult>> => {
    return apiClient<DisbursementResult>(`/payout/admin/requests/${encodeURIComponent(id)}/retry`, {
      method: 'POST',
    });
  },

  /**
   * Task 77: Platform Admin Cancel Failed Payout & Refund Frozen Balance
   */
  cancelFailedAndRefund: async (
    id: string,
    reason: string,
  ): Promise<ApiResponse<PayoutRequestItem>> => {
    return apiClient<PayoutRequestItem>(`/payout/admin/requests/${encodeURIComponent(id)}/cancel-refund`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },
};

// ============================================
// TASK 78: EOD RECONCILIATION & AUDIT API
// ============================================

export interface FinanceControlSummaryView {
  businessDate: string;
  timezone: string;
  walletsAudited: number;
  walletsHealthy: number;
  ledgerTransactionsAudited: number;
  escrowRecordsAudited: number;
  payoutsAudited: number;
  payoutsPending: number;
  payoutsApproved: number;
  payoutsCompleted: number;
  payoutsFailed: number;
  staleProcessingPayouts: number;
  totalPayoutsReservedAmount: string;
  totalPayoutsCompletedAmount: string;
  expectedOpenPayoutClearingAmount: string;
  actualPayoutClearingNetBalance: string;
  payoutClearingDifference: string;
  externalCashAccountingStatus: 'GAP_NOT_PROVEN';
  externalBankProviderStatus: 'MOCK_PROVIDER_ONLY';
}

export interface EodReconciliationRunView {
  id: string;
  runNumber: string;
  businessDate: string;
  timezone: string;
  status: 'RUNNING' | 'COMPLETED_PASS' | 'COMPLETED_WARNING' | 'COMPLETED_FAIL' | 'FAILED';
  triggerType: 'MANUAL' | 'SCHEDULED' | 'ON_DEMAND' | 'API';
  triggeredBy: string;
  storeId?: string | null;
  startedAt: string;
  completedAt?: string | null;
  durationMs?: number | null;
  summary: FinanceControlSummaryView;
  counts: {
    totalChecked: number;
    totalMatched: number;
    totalDiscrepancies: number;
    info: number;
    warning: number;
    error: number;
    critical: number;
  };
  discrepancies: Array<{
    type: string;
    severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    entityType: string;
    entityId: string;
    storeId?: string;
    expected: string;
    actual: string;
    details: string;
    detectedAt: string;
  }>;
  metadata?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface EodRunsResponse {
  items: EodReconciliationRunView[];
  total: number;
  page: number;
  limit: number;
}

export const reconciliationApi = {
  /**
   * Task 78: Execute EOD Reconciliation Run
   */
  runEod: async (
    dto: { businessDate?: string; storeId?: string; batchSize?: number; forceRerun?: boolean } = {},
  ): Promise<ApiResponse<EodReconciliationRunView>> => {
    return apiClient<EodReconciliationRunView>('/admin/finance/reconciliation/eod/run', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  /**
   * Task 78: List historical EOD reconciliation runs
   */
  getEodRuns: async (
    params: { businessDate?: string; storeId?: string; page?: number; limit?: number } = {},
  ): Promise<ApiResponse<EodRunsResponse>> => {
    const searchParams = new URLSearchParams();
    if (params.businessDate) searchParams.set('businessDate', params.businessDate);
    if (params.storeId) searchParams.set('storeId', params.storeId);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    const qs = searchParams.toString();
    return apiClient<EodRunsResponse>(`/admin/finance/reconciliation/eod/runs${qs ? `?${qs}` : ''}`, {
      method: 'GET',
    });
  },

  /**
   * Task 78: Get Latest EOD reconciliation run
   */
  getLatestEodRun: async (
    businessDate?: string,
  ): Promise<ApiResponse<EodReconciliationRunView | null>> => {
    const qs = businessDate ? `?businessDate=${encodeURIComponent(businessDate)}` : '';
    return apiClient<EodReconciliationRunView | null>(`/admin/finance/reconciliation/eod/runs/latest${qs}`, {
      method: 'GET',
    });
  },

  /**
   * Task 78: Get EOD Run Details by ID
   */
  getEodRunById: async (
    id: string,
  ): Promise<ApiResponse<EodReconciliationRunView>> => {
    return apiClient<EodReconciliationRunView>(`/admin/finance/reconciliation/eod/runs/${encodeURIComponent(id)}`, {
      method: 'GET',
    });
  },
};



