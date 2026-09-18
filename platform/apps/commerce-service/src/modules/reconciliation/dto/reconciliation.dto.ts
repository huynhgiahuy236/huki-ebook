import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export enum ReconciliationSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export enum DiscrepancyType {
  // WAL-002 / Double-Entry Invariants
  UNBALANCED_TRANSACTION = 'UNBALANCED_TRANSACTION',
  ORPHAN_ENTRY = 'ORPHAN_ENTRY',
  INSUFFICIENT_ENTRIES = 'INSUFFICIENT_ENTRIES',
  CURRENCY_MISMATCH = 'CURRENCY_MISMATCH',
  INVALID_ENTRY_AMOUNT = 'INVALID_ENTRY_AMOUNT',
  MISSING_STORE_DIMENSION = 'MISSING_STORE_DIMENSION',

  // Summary Projection Invariants
  SUMMARY_PROJECTION_DRIFT = 'SUMMARY_PROJECTION_DRIFT',

  // Wallet WAL-001 Invariants
  WALLET_INVARIANT_VIOLATION = 'WALLET_INVARIANT_VIOLATION',
  NEGATIVE_BALANCE = 'NEGATIVE_BALANCE',
  WALLET_TX_HISTORY_MISMATCH = 'WALLET_TX_HISTORY_MISMATCH',
  MISSING_WALLET = 'MISSING_WALLET',

  // Pending / Available / Frozen Invariants
  PENDING_GROSS_NET_MISMATCH = 'PENDING_GROSS_NET_MISMATCH',
  AVAILABLE_BALANCE_MISMATCH = 'AVAILABLE_BALANCE_MISMATCH',
  FROZEN_BALANCE_MISMATCH = 'FROZEN_BALANCE_MISMATCH',
  ACCOUNTING_INTEGRATION_GAP = 'ACCOUNTING_INTEGRATION_GAP',

  // Payment Ingestion & Settlement Invariants
  MISSING_PAYMENT_INGESTION = 'MISSING_PAYMENT_INGESTION',
  MISSING_PENDING_WALLET_CREDIT = 'MISSING_PENDING_WALLET_CREDIT',
  SETTLEMENT_WITHOUT_LEDGER = 'SETTLEMENT_WITHOUT_LEDGER',
  SETTLEMENT_WITHOUT_WALLET = 'SETTLEMENT_WITHOUT_WALLET',
  LEDGER_SETTLEMENT_WITHOUT_STATUS = 'LEDGER_SETTLEMENT_WITHOUT_STATUS',
  MISSING_OUTBOX_EVENT = 'MISSING_OUTBOX_EVENT',
  DUPLICATE_INGESTION = 'DUPLICATE_INGESTION',
  DUPLICATE_SETTLEMENT = 'DUPLICATE_SETTLEMENT',

  // Payout Reservation & Disbursement Invariants (Task 76-77)
  PAYOUT_RESERVATION_MISMATCH = 'PAYOUT_RESERVATION_MISMATCH',
  PAYOUT_MISSING_WALLET_RESERVATION = 'PAYOUT_MISSING_WALLET_RESERVATION',
  PAYOUT_MISSING_LEDGER_RESERVATION = 'PAYOUT_MISSING_LEDGER_RESERVATION',
  PAYOUT_REJECTION_RELEASE_MISMATCH = 'PAYOUT_REJECTION_RELEASE_MISMATCH',
  PAYOUT_DISBURSEMENT_MISMATCH = 'PAYOUT_DISBURSEMENT_MISMATCH',
  PAYOUT_MISSING_DISBURSEMENT_LEDGER = 'PAYOUT_MISSING_DISBURSEMENT_LEDGER',
  PAYOUT_MISSING_DISBURSEMENT_WALLET = 'PAYOUT_MISSING_DISBURSEMENT_WALLET',

  // Multi-vendor / Security Invariants
  CROSS_STORE_CONTAMINATION = 'CROSS_STORE_CONTAMINATION',

  // Governance & Metadata
  AUDITABILITY_GAP = 'AUDITABILITY_GAP',
}

export class ReconciliationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by specific Store ID' })
  @IsOptional()
  @IsString()
  storeId?: string;

  @ApiPropertyOptional({ description: 'Filter start date (ISO string)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter end date (ISO string)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Batch processing size', default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  batchSize?: number = 100;

  @ApiPropertyOptional({ description: 'Pagination cursor (last processed ID)' })
  @IsOptional()
  @IsString()
  cursor?: string;
}

export class RebuildSummaryQueryDto {
  @ApiPropertyOptional({ description: 'Dry run mode: preview adjustments without writing to DB', default: false })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean = false;

  @ApiPropertyOptional({ description: 'Target specific store ID' })
  @IsOptional()
  @IsString()
  storeId?: string;
}

export class FinancialDiscrepancyDto {
  @ApiProperty({ enum: DiscrepancyType })
  type!: DiscrepancyType;

  @ApiProperty({ enum: ReconciliationSeverity })
  severity!: ReconciliationSeverity;

  @ApiProperty({ description: 'Entity type (LedgerTransaction, Wallet, SellerOrder, etc.)' })
  entityType!: string;

  @ApiProperty({ description: 'Entity ID' })
  entityId!: string;

  @ApiPropertyOptional({ description: 'Associated store ID' })
  storeId?: string;

  @ApiProperty({ description: 'Expected financial value or state' })
  expected!: string;

  @ApiProperty({ description: 'Actual recorded financial value or state' })
  actual!: string;

  @ApiProperty({ description: 'Detailed diagnostic explanation' })
  details!: string;

  @ApiProperty({ description: 'Timestamp when discrepancy was detected' })
  detectedAt!: Date;
}

export class ReconciliationReportDto {
  @ApiProperty({ description: 'Unique reconciliation run ID' })
  runId!: string;

  @ApiProperty({ description: 'Reconciliation run timestamp' })
  executedAt!: Date;

  @ApiProperty({ description: 'Total duration in milliseconds' })
  durationMs!: number;

  @ApiPropertyOptional({ description: 'Targeted store ID (if scoped)' })
  storeId?: string;

  @ApiProperty({ description: 'Total records scanned across all checks' })
  totalChecked!: number;

  @ApiProperty({ description: 'Total verified matching records' })
  totalMatched!: number;

  @ApiProperty({ description: 'Total discrepancies detected' })
  totalDiscrepancies!: number;

  @ApiProperty({ description: 'Breakdown of discrepancies by severity' })
  severityBreakdown!: {
    info: number;
    warning: number;
    error: number;
    critical: number;
  };

  @ApiProperty({ type: [FinancialDiscrepancyDto], description: 'List of detected discrepancies' })
  discrepancies!: FinancialDiscrepancyDto[];

  @ApiProperty({ description: 'Reconciliation pass status' })
  status!: 'PASS' | 'PASS_WITH_WARNINGS' | 'FAIL';
}

export class SummaryRebuildAdjustmentDto {
  @ApiProperty({ description: 'Account type' })
  accountType!: string;

  @ApiProperty({ description: 'Store ID' })
  storeId!: string;

  @ApiProperty({ description: 'Currency code' })
  currency!: string;

  @ApiProperty({ description: 'Previous total debits' })
  previousDebits!: number;

  @ApiProperty({ description: 'Recomputed total debits' })
  recomputedDebits!: number;

  @ApiProperty({ description: 'Previous total credits' })
  previousCredits!: number;

  @ApiProperty({ description: 'Recomputed total credits' })
  recomputedCredits!: number;

  @ApiProperty({ description: 'Previous net balance' })
  previousNetBalance!: number;

  @ApiProperty({ description: 'Recomputed net balance' })
  recomputedNetBalance!: number;

  @ApiProperty({ description: 'Did projection drift occur' })
  hasDrift!: boolean;
}

export class SummaryRebuildResultDto {
  @ApiProperty({ description: 'Dry run flag' })
  dryRun!: boolean;

  @ApiProperty({ description: 'Total accounts audited' })
  totalAccountsAudited!: number;

  @ApiProperty({ description: 'Total accounts with drift corrected/detected' })
  totalDriftCorrected!: number;

  @ApiProperty({ type: [SummaryRebuildAdjustmentDto] })
  adjustments!: SummaryRebuildAdjustmentDto[];

  @ApiProperty({ description: 'Execution timestamp' })
  executedAt!: Date;
}

// ============================================
// TASK 78: EOD RECONCILIATION & AUDIT RUNS
// ============================================

export class EodReconciliationRunDto {
  @ApiPropertyOptional({ description: 'Target business date (YYYY-MM-DD). Defaults to current business date.', example: '2026-09-19' })
  @IsOptional()
  @IsString()
  businessDate?: string;

  @ApiPropertyOptional({ description: 'Optional specific Store ID to scope reconciliation. Omit for full platform EOD run.' })
  @IsOptional()
  @IsString()
  storeId?: string;

  @ApiPropertyOptional({ description: 'Batch processing size for database cursor streaming', default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  batchSize?: number = 100;

  @ApiPropertyOptional({ description: 'Force rerun even if a previous completed run exists for this business date', default: false })
  @IsOptional()
  @IsBoolean()
  forceRerun?: boolean = false;
}

export class EodRunsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by specific business date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  businessDate?: string;

  @ApiPropertyOptional({ description: 'Filter by specific store ID' })
  @IsOptional()
  @IsString()
  storeId?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}

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
  totalPayoutsReservedAmount: string; // Exact decimal string
  totalPayoutsCompletedAmount: string; // Exact decimal string
  expectedOpenPayoutClearingAmount: string; // Negative credit balance representation
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
  startedAt: Date;
  completedAt?: Date | null;
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
  discrepancies: FinancialDiscrepancyDto[];
  metadata?: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

