import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsUUID,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum VoucherType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
  FREE_SHIPPING = 'FREE_SHIPPING',
}

export enum VoucherScope {
  PLATFORM = 'PLATFORM',
  STORE = 'STORE',
}

export enum VoucherStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
  USED_UP = 'USED_UP',
}

export class CreateVoucherDto {
  @ApiProperty({ example: 'HUKI10' })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiProperty({ example: 'Giảm 10% cho đơn hàng đầu tiên' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'Áp dụng cho đơn hàng từ 100.000đ' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: VoucherType, example: VoucherType.PERCENTAGE })
  @IsEnum(VoucherType)
  type: VoucherType;

  @ApiProperty({ example: 10, description: 'Percentage (1-100) or fixed amount' })
  @IsNumber()
  @Min(0)
  value: number;

  @ApiPropertyOptional({ example: 100000, description: 'Minimum order amount' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  minOrderAmount?: number;

  @ApiPropertyOptional({ example: 50000, description: 'Maximum discount amount' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  maxDiscountAmount?: number;

  @ApiProperty({ enum: VoucherScope, default: VoucherScope.PLATFORM })
  @IsEnum(VoucherScope)
  scope: VoucherScope;

  @ApiPropertyOptional({ description: 'Store ID if scope is STORE' })
  @IsUUID()
  @IsOptional()
  storeId?: string;

  @ApiPropertyOptional({ example: 100, description: 'Total usage limit' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  totalUsage?: number;

  @ApiPropertyOptional({ example: 1, description: 'Max usage per user' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  maxUsagePerUser?: number;

  @ApiProperty({ example: '2026-08-01T00:00:00Z' })
  @IsDateString()
  startsAt: string;

  @ApiProperty({ example: '2026-08-31T23:59:59Z' })
  @IsDateString()
  expiresAt: string;
}

export class UpdateVoucherDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: VoucherType })
  @IsEnum(VoucherType)
  @IsOptional()
  type?: VoucherType;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  value?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  minOrderAmount?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  maxDiscountAmount?: number;

  @ApiPropertyOptional({ enum: VoucherScope })
  @IsEnum(VoucherScope)
  @IsOptional()
  scope?: VoucherScope;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  totalUsage?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(1)
  maxUsagePerUser?: number;

  @ApiPropertyOptional({ enum: VoucherStatus })
  @IsEnum(VoucherStatus)
  @IsOptional()
  status?: VoucherStatus;
}

export class VoucherQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsNumber()
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ enum: VoucherStatus })
  @IsEnum(VoucherStatus)
  @IsOptional()
  status?: VoucherStatus;

  @ApiPropertyOptional({ enum: VoucherScope })
  @IsEnum(VoucherScope)
  @IsOptional()
  scope?: VoucherScope;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  storeId?: string;
}

export class ValidateVoucherDto {
  @ApiProperty({ example: 'HUKI10' })
  @IsString()
  code: string;

  @ApiProperty({ example: 200000, description: 'Order subtotal' })
  @IsNumber()
  @Min(0)
  orderSubtotal: number;

  @ApiPropertyOptional({ description: 'Store ID for store-scoped vouchers' })
  @IsUUID()
  @IsOptional()
  storeId?: string;
}
