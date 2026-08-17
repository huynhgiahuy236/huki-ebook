import { IsString, IsNumber, IsOptional, IsInt, Min, Max, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddToCartDto {
  @ApiProperty({ example: 'uuid-book-id' })
  @IsString()
  bookId: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  @Max(99)
  quantity: number;
}

export class UpdateCartItemDto {
  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  @Max(99)
  quantity: number;
}

export class CartItemResponseDto {
  id: string;
  bookId: string;
  bookTitle: string;
  bookImage: string | null;
  storeId: string;
  storeName: string;
  price: number;
  salePrice: number | null;
  quantity: number;
  format: string;
  stock: number;
}

export class CartStoreGroupDto {
  storeId: string;
  storeName: string;
  storeLogo: string | null;
  items: CartItemResponseDto[];
  subtotal: number;
}

export class CartResponseDto {
  id: string;
  userId: string;
  stores: CartStoreGroupDto[];
  totalItems: number;
  subtotal: number;
  estimatedShipping: number;
}
