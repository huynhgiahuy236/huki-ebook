import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export enum InventoryOperation {
  SET = 'SET',
  ADD = 'ADD',
  SUBTRACT = 'SUBTRACT',
}

export enum InventoryReason {
  MANUAL_ADJUSTMENT = 'MANUAL_ADJUSTMENT',
  DAMAGED = 'DAMAGED',
  RETURNED = 'RETURNED',
  SOLD = 'SOLD',
  CORRECTION = 'CORRECTION',
}

export class UpdateInventoryDto {
  @ApiProperty({ enum: InventoryOperation })
  @IsEnum(InventoryOperation)
  operation: InventoryOperation;

  @ApiProperty({ minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity: number;

  @ApiProperty({ enum: InventoryReason })
  @IsEnum(InventoryReason)
  reason: InventoryReason;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  orderId?: string;
}
