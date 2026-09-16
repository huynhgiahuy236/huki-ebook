import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsUUID, Max, Min, ValidateNested } from 'class-validator';
import { CartItemFormat } from '../../../../prisma/generated/client';

export class GuestCartItemDto {
  @IsUUID()
  @ApiProperty({ example: 'uuid-book-id' })
  bookId: string;

  @ApiProperty({ enum: CartItemFormat })
  @IsEnum(CartItemFormat)
  format: CartItemFormat;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  @ApiProperty({ example: 1 })
  quantity: number;
}

export class MergeCartDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuestCartItemDto)
  @ApiProperty({ type: [GuestCartItemDto] })
  items: GuestCartItemDto[];
}
