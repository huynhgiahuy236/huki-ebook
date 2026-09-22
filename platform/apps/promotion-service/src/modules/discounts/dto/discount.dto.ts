import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsDateString,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
}

export enum DiscountStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export class CreateBookDiscountDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Book ID' })
  @IsUUID()
  bookId: string;

  @ApiProperty({ enum: DiscountType, example: DiscountType.PERCENTAGE })
  @IsEnum(DiscountType)
  type: DiscountType;

  @ApiProperty({ example: 10, description: 'Percentage (1-100) or fixed amount in VND' })
  @IsNumber()
  @Min(0.01)
  value: number;

  @ApiPropertyOptional({ example: 1, description: 'Minimum quantity to apply discount' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  minQuantity?: number;

  @ApiProperty({ example: '2026-09-21T00:00:00.000Z', description: 'Start date and time' })
  @IsDateString()
  startsAt: string;

  @ApiProperty({ example: '2026-09-30T23:59:59.000Z', description: 'Expiration date and time' })
  @IsDateString()
  expiresAt: string;
}

export class UpdateBookDiscountDto {
  @ApiPropertyOptional({ enum: DiscountType, example: DiscountType.PERCENTAGE })
  @IsEnum(DiscountType)
  @IsOptional()
  type?: DiscountType;

  @ApiPropertyOptional({ example: 15, description: 'Percentage or fixed amount in VND' })
  @IsNumber()
  @IsOptional()
  @Min(0.01)
  value?: number;

  @ApiPropertyOptional({ example: '2026-09-21T00:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  startsAt?: string;

  @ApiPropertyOptional({ example: '2026-09-30T23:59:59.000Z' })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @ApiPropertyOptional({ enum: DiscountStatus, example: DiscountStatus.ACTIVE })
  @IsEnum(DiscountStatus)
  @IsOptional()
  status?: DiscountStatus;
}
