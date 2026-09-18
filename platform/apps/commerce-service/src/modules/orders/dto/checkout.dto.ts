import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '../../../../prisma/generated/client';

export interface ShippingAddress {
  recipientName: string;
  phone: string;
  line1: string;
  ward: string;
  district: string;
  province: string;
}

export class ShippingAddressDto implements ShippingAddress {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  recipientName: string;
  @ApiProperty() @IsPhoneNumber('VN') phone: string;
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(250) line1: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(100) ward: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(100) district: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(100) province: string;
}

export class CheckoutPreviewDto {
  @ApiPropertyOptional({ description: 'Address ID - validated against user ownership' })
  @IsOptional()
  @IsUUID()
  addressId?: string;

  @ApiPropertyOptional({ type: ShippingAddressDto, description: 'Deprecated: Use addressId instead' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress?: ShippingAddressDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional({ description: 'Platform voucher code' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  platformVoucherCode?: string;

  @ApiPropertyOptional({ description: 'Store voucher codes by store ID' })
  @IsOptional()
  storeVoucherCodes?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Shipping voucher code' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  shippingVoucherCode?: string;
}

export class CheckoutConfirmDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() sessionId: string;

  @ApiPropertyOptional({ description: 'Address ID - validated against user ownership' })
  @IsOptional()
  @IsUUID()
  addressId?: string;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  paymentProvider?: string;

  @ApiPropertyOptional({ description: 'Platform voucher code (re-validated on confirm)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  platformVoucherCode?: string;

  @ApiPropertyOptional({ description: 'Store voucher codes by store ID (re-validated on confirm)' })
  @IsOptional()
  storeVoucherCodes?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Shipping voucher code (re-validated on confirm)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  shippingVoucherCode?: string;
}

export class CancelOrderDto {
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(500) reason: string;
}

export class ShipOrderDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(100) carrier: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(100) trackingCode: string;
}
