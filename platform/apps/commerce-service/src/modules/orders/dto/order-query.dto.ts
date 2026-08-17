import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { OrderStatus, SellerOrderStatus } from '../../../entities';

export class OrderQueryDto {
  @ApiPropertyOptional({ default: 1 }) @Type(() => Number) @IsOptional() @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ default: 20 }) @Type(() => Number) @IsOptional() @IsInt() @Min(1) @Max(100) limit = 20;
  @ApiPropertyOptional({ enum: OrderStatus }) @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus;
}

export class SellerOrderQueryDto {
  @ApiPropertyOptional({ default: 1 }) @Type(() => Number) @IsOptional() @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ default: 20 }) @Type(() => Number) @IsOptional() @IsInt() @Min(1) @Max(100) limit = 20;
  @ApiPropertyOptional({ enum: SellerOrderStatus }) @IsOptional() @IsEnum(SellerOrderStatus) status?: SellerOrderStatus;
}

