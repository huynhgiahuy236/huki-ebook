import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import { LedgerAccountType, LedgerEntryDirection } from '../../../../prisma/generated/client';

export class LedgerEntryDto {
  @ApiProperty({ enum: LedgerAccountType, description: 'Target accounting account' })
  @IsEnum(LedgerAccountType)
  accountType!: LedgerAccountType;

  @ApiProperty({ enum: LedgerEntryDirection, description: 'DEBIT or CREDIT' })
  @IsEnum(LedgerEntryDirection)
  direction!: LedgerEntryDirection;

  @ApiProperty({ description: 'Positive monetary amount', example: 100000 })
  @IsPositive()
  amount!: number;

  @ApiPropertyOptional({ description: 'Currency code', default: 'VND' })
  @IsOptional()
  @IsString()
  currency?: string = 'VND';

  @ApiPropertyOptional({ description: 'Store ID dimension for store-scoped accounts' })
  @IsOptional()
  @IsString()
  storeId?: string;

  @ApiPropertyOptional({ description: 'Line item description' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class PostLedgerTransactionDto {
  @ApiProperty({ description: 'Unique idempotency key for this financial transaction' })
  @IsString()
  idempotencyKey!: string;

  @ApiProperty({ description: 'Business description of the transaction' })
  @IsString()
  description!: string;

  @ApiProperty({ description: 'Reference category (e.g. ORDER_PAYMENT, ESCROW_RELEASE, DISPUTE_FREEZE)' })
  @IsString()
  referenceType!: string;

  @ApiProperty({ description: 'Identifier of source entity (orderId, refundId, etc.)' })
  @IsString()
  referenceId!: string;

  @ApiPropertyOptional({ description: 'Primary store ID for store-scoped transaction' })
  @IsOptional()
  @IsString()
  storeId?: string;

  @ApiPropertyOptional({ description: 'Transaction currency', default: 'VND' })
  @IsOptional()
  @IsString()
  currency?: string = 'VND';

  @ApiProperty({ type: [LedgerEntryDto], description: 'Double-entry journal entries (SUM(DEBIT) == SUM(CREDIT))' })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => LedgerEntryDto)
  entries!: LedgerEntryDto[];

  @ApiPropertyOptional({ description: 'Additional structured metadata' })
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class ReversalTransactionDto {
  @ApiProperty({ description: 'ID of original ledger transaction to reverse' })
  @IsString()
  originalTransactionId!: string;

  @ApiProperty({ description: 'Unique idempotency key for the compensating reversal transaction' })
  @IsString()
  idempotencyKey!: string;

  @ApiProperty({ description: 'Reason for accounting reversal' })
  @IsString()
  reversalReason!: string;

  @ApiPropertyOptional({ description: 'Optional description override' })
  @IsOptional()
  @IsString()
  description?: string;
}
