import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { OrderStatus, SellerOrderStatus } from '../../../../prisma/generated/client';

export class OrderQueryDto {
  @ApiPropertyOptional({ default: 1 }) @Type(() => Number) @IsOptional() @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ default: 20 }) @Type(() => Number) @IsOptional() @IsInt() @Min(1) @Max(100) limit = 20;
  @ApiPropertyOptional({ enum: OrderStatus }) @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus;
}

export class SellerOrderQueryDto {
  @ApiPropertyOptional({ default: 1 }) @Type(() => Number) @IsOptional() @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ default: 20 }) @Type(() => Number) @IsOptional() @IsInt() @Min(1) @Max(100) limit = 20;
  @ApiPropertyOptional({ enum: SellerOrderStatus })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'PROCESSING') return SellerOrderStatus.PREPARING;
    if (value === 'SHIPPING') return SellerOrderStatus.SHIPPED;
    if (value === 'PENDING') return SellerOrderStatus.PENDING_CONFIRMATION;
    return value;
  })
  @IsEnum(SellerOrderStatus)
  status?: SellerOrderStatus;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() business?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() store?: string;
  @ApiPropertyOptional() @IsOptional() search?: string;
}


