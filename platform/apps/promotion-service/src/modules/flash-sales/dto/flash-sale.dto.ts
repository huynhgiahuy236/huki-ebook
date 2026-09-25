import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsUUID,
  IsEnum,
  IsInt,
  IsArray,
  IsUrl,
  Min,
  MaxLength,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum FlashSaleStatus {
  SCHEDULED = "SCHEDULED",
  ACTIVE = "ACTIVE",
  ENDED = "ENDED",
}

export class CreateFlashSaleDto {
  @ApiProperty({ example: "Summer Sale 2026" })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: "Giảm giá mùa hè" })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: "Marketing banner URL" })
  @IsUrl({ require_tld: false })
  @IsOptional()
  bannerUrl?: string;

  @ApiProperty({ example: "2026-08-01T00:00:00Z" })
  @IsDateString()
  startsAt: string;

  @ApiProperty({ example: "2026-08-31T23:59:59Z" })
  @IsDateString()
  endsAt: string;
}

export class CreateFlashSaleItemDto {
  @ApiProperty({ description: "Flash sale ID" })
  @IsUUID()
  flashSaleId: string;

  @ApiProperty({ description: "Book ID" })
  @IsUUID()
  bookId: string;

  @ApiProperty({ example: 250000, description: "Original price" })
  @IsInt()
  @Min(0)
  originalPrice: number;

  @ApiProperty({ example: 199000, description: "Sale price" })
  @IsInt()
  @Min(0)
  salePrice: number;

  @ApiProperty({ example: 100, description: "Stock quantity" })
  @IsInt()
  @Min(1)
  stock: number;

  @ApiPropertyOptional({ example: 2, description: "Max per user" })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxPerUser?: number;
}

export class FlashSaleQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ enum: FlashSaleStatus })
  @IsEnum(FlashSaleStatus)
  @IsOptional()
  status?: FlashSaleStatus;
}

export class FlashSaleItemQueryDto {
  @ApiPropertyOptional({ description: "Flash sale ID" })
  @IsUUID()
  @IsOptional()
  flashSaleId?: string;

  @ApiPropertyOptional({ description: "Book ID" })
  @IsUUID()
  @IsOptional()
  bookId?: string;
}

export class ValidateQuotaDto {
  @ApiProperty({ description: "User ID" })
  @IsString()
  userId: string;

  @ApiProperty({ description: "Book ID" })
  @IsUUID()
  bookId: string;

  @ApiPropertyOptional({ description: "Flash Sale ID" })
  @IsUUID()
  @IsOptional()
  flashSaleId?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  quantity?: number = 1;
}

export class ReserveFlashSaleDto {
  @ApiProperty({ description: "User ID" })
  @IsString()
  userId: string;

  @ApiProperty({ description: "Book ID" })
  @IsUUID()
  bookId: string;

  @ApiPropertyOptional({ description: "Flash Sale ID" })
  @IsUUID()
  @IsOptional()
  flashSaleId?: string;

  @ApiProperty({ example: 1, default: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({
    description: "Order ID used as an idempotent reservation key",
  })
  @IsUUID()
  orderId: string;
}

export class ReleaseFlashSaleOrderDto {
  @ApiProperty({
    description: "Order ID whose Flash Sale reservations must be released",
  })
  @IsUUID()
  orderId: string;

  @ApiPropertyOptional({
    description:
      "Only release reservations for these books (used for seller-order cancellation)",
    type: [String],
  })
  @IsArray()
  @IsUUID("4", { each: true })
  @IsOptional()
  bookIds?: string[];
}

export class UpdateFlashSaleStatusDto {
  @ApiProperty({ enum: FlashSaleStatus })
  @IsEnum(FlashSaleStatus)
  status: FlashSaleStatus;
}

export class SellerRegisterFlashSaleItemDto {
  @ApiProperty({ description: "Khung giờ Flash Sale ID" })
  @IsUUID()
  flashSaleId: string;

  @ApiProperty({ description: "Book ID thuộc quyền sở hữu của gian hàng" })
  @IsUUID()
  bookId: string;

  @ApiProperty({ example: 149000, description: "Giá khuyến mãi Flash Sale (phải nhỏ hơn giá niêm yết hiện tại)" })
  @IsInt()
  @Min(1000)
  salePrice: number;

  @ApiProperty({ example: 20, description: "Số lượng tham gia Flash Sale (không vượt tồn khả dụng)" })
  @IsInt()
  @Min(1)
  stock: number;

  @ApiPropertyOptional({ example: 1, description: "Giới hạn mua mỗi khách hàng" })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxPerUser?: number = 1;
}

export class SellerBatchItemDto {
  @IsUUID()
  bookId: string;

  @IsInt()
  @Min(1000)
  salePrice: number;

  @IsInt()
  @Min(1)
  stock: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxPerUser?: number = 1;
}

export class SellerBatchRegisterFlashSaleItemsDto {
  @ApiProperty({ description: "Khung giờ Flash Sale ID" })
  @IsUUID()
  flashSaleId: string;

  @ApiProperty({ description: "Danh sách sản phẩm đăng ký", type: [SellerBatchItemDto] })
  @IsArray()
  items: SellerBatchItemDto[];
}

export class SellerUpdateFlashSaleItemDto {
  @ApiPropertyOptional({ example: 45000, description: "Giá khuyến mãi Flash Sale mới (VNĐ)" })
  @IsOptional()
  @IsInt()
  @Min(1000)
  salePrice?: number;

  @ApiPropertyOptional({ example: 15, description: "Số lượng tham gia Flash Sale mới" })
  @IsOptional()
  @IsInt()
  @Min(1)
  stock?: number;

  @ApiPropertyOptional({ example: 2, description: "Giới hạn mua mỗi khách hàng" })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxPerUser?: number;
}


