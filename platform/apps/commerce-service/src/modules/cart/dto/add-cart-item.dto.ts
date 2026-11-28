import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsUUID, Max, Min } from 'class-validator';
import { CartItemFormat } from '../../../../prisma/generated/client';

export class AddCartItemDto {
  @ApiProperty({ format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  bookId: string;

  @ApiProperty({ enum: CartItemFormat })
  @IsEnum(CartItemFormat)
  format: CartItemFormat;

  @ApiProperty({ example: 1, minimum: 1, maximum: 99 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  quantity: number;
}
