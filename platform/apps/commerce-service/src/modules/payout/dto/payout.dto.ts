import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PayoutRequestStatus } from '../../../../prisma/generated/client';

export class CreatePayoutRequestDto {
  @ApiProperty({
    description: 'Target Store ID',
    example: 'store-123',
  })
  @IsString()
  @IsNotEmpty()
  storeId: string;

  @ApiProperty({
    description: 'Requested withdrawal amount (VND, string or number)',
    example: '1000000',
  })
  @IsNotEmpty()
  amount: string | number;

  @ApiProperty({
    description: 'Task 75 Single-Use Finance Authorization Token (purpose WALLET_WITHDRAWAL)',
    example: 'fin_auth_abc123xyz',
  })
  @IsString()
  @IsNotEmpty()
  financeAuthToken: string;

  @ApiProperty({
    description: 'Unique client idempotency key to prevent double reservation',
    example: 'IDEMP-PO-20260919-0001',
  })
  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;
}

export enum PayoutReviewAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class ReviewPayoutDto {
  @ApiProperty({
    description: 'Review decision: APPROVE or REJECT',
    enum: PayoutReviewAction,
    example: PayoutReviewAction.APPROVE,
  })
  @IsEnum(PayoutReviewAction)
  action: PayoutReviewAction;

  @ApiPropertyOptional({
    description: 'Mandatory reason when rejecting payout request',
    example: 'Tài khoản thụ hưởng tạm thời bị khóa hoặc có dấu hiệu bất thường',
  })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class PayoutQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    description: 'Filter by payout status',
    enum: PayoutRequestStatus,
  })
  @IsOptional()
  @IsEnum(PayoutRequestStatus)
  status?: PayoutRequestStatus;
}

export class DisburseBatchDto {
  @ApiProperty({
    description: 'List of Approved Payout Request IDs to disburse',
    example: ['po_123', 'po_456'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  payoutIds: string[];
}

export class CancelFailedPayoutDto {
  @ApiProperty({
    description: 'Reason for cancelling failed payout and releasing frozen balance',
    example: 'Ngân hàng thụ hưởng từ chối nhận tiền, hủy lệnh và hoàn tiền vào ví khả dụng',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export interface BankSnapshotView {
  bankCode?: string;
  bankName: string;
  accountNumberMasked: string;
  maskedAccountNumber?: string;
  accountHolder: string;
  businessName?: string;
}

export interface PayoutRequestView {
  id: string;
  storeId: string;
  walletId: string;
  amount: string; // Exact Decimal string
  currency: string;
  status: PayoutRequestStatus;
  bankSnapshot: BankSnapshotView;
  requestedBy: string;
  reviewedBy: string | null;
  requestedAt: Date;
  reviewedAt: Date | null;
  disbursedAt?: Date | null;
  provider?: string | null;
  providerRef?: string | null;
  failureReason?: string | null;
  rejectionReason: string | null;
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DisbursementResultView {
  payoutId: string;
  status: PayoutRequestStatus;
  success: boolean;
  provider?: string;
  providerRef?: string;
  disbursedAt?: Date;
  failureReason?: string;
  error?: string;
}

export interface BatchDisbursementResultView {
  total: number;
  succeeded: number;
  failed: number;
  results: DisbursementResultView[];
}
