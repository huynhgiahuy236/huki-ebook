import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsUUID, Max, Min } from 'class-validator';
import { CartItemFormat } from '../../../../prisma/generated/client';

export class AddCartItemDto {
  @IsUUID()
  bookId: string;

  @ApiProperty({ enum: CartItemFormat })
  @IsEnum(CartItemFormat)
  format: CartItemFormat;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  quantity: number;
}
