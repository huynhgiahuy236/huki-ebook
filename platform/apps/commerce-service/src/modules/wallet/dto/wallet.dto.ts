import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, IsString, IsUUID, Min } from 'class-validator';

export class WalletResponseDto {
  @ApiProperty({ description: 'Wallet ID' })
  id!: string;

  @ApiProperty({ description: 'Store ID' })
  storeId!: string;

  @ApiProperty({ description: 'Owner User ID' })
  ownerUserId!: string;

  @ApiProperty({ description: 'Available Balance (can be withdrawn or spent)' })
  availableBalance!: number;

  @ApiProperty({ description: 'Pending Balance (held in escrow, awaiting clearance)' })
  pendingBalance!: number;

  @ApiProperty({ description: 'Frozen Balance (frozen due to active disputes or sanctions)' })
  frozenBalance!: number;

  @ApiProperty({ description: 'Total Wallet Value = Available + Pending + Frozen (WAL-001)' })
  totalBalance!: number;

  @ApiProperty({ description: 'Currency code', default: 'VND' })
  currency!: string;

  @ApiProperty({ description: 'Last updated timestamp' })
  updatedAt!: Date;
}

export class WalletTransactionQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}

export class WalletTransactionResponseDto {
  @ApiProperty({ description: 'Transaction ID' })
  id!: string;

  @ApiProperty({ description: 'Wallet ID' })
  walletId!: string;

  @ApiProperty({ description: 'Transaction Type' })
  type!: string;

  @ApiProperty({ description: 'Transaction Amount' })
  amount!: number;

  @ApiProperty({ description: 'Available Balance Before' })
  availableBefore!: number;

  @ApiProperty({ description: 'Available Balance After' })
  availableAfter!: number;

  @ApiProperty({ description: 'Pending Balance Before' })
  pendingBefore!: number;

  @ApiProperty({ description: 'Pending Balance After' })
  pendingAfter!: number;

  @ApiProperty({ description: 'Frozen Balance Before' })
  frozenBefore!: number;

  @ApiProperty({ description: 'Frozen Balance After' })
  frozenAfter!: number;

  @ApiPropertyOptional({ description: 'Reference Type' })
  referenceType?: string;

  @ApiPropertyOptional({ description: 'Reference ID' })
  referenceId?: string;

  @ApiPropertyOptional({ description: 'Description' })
  description?: string;

  @ApiPropertyOptional({ description: 'Metadata' })
  metadata?: any;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: Date;
}

export class PaginatedWalletTransactionsDto {
  @ApiProperty({ type: [WalletTransactionResponseDto] })
  items!: WalletTransactionResponseDto[];

  @ApiProperty({ description: 'Total count' })
  total!: number;

  @ApiProperty({ description: 'Current page' })
  page!: number;

  @ApiProperty({ description: 'Items per page' })
  limit!: number;
}
