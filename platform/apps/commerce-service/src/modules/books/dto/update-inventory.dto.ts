import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, Min } from 'class-validator';
import { InventoryOperation, InventoryReason } from '../../../entities';

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
}
