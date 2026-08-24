import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsUUID,
  IsEnum,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum FlashSaleStatus {
  SCHEDULED = 'SCHEDULED',
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED',
}

export class CreateFlashSaleDto {
  @ApiProperty({ example: 'Summer Sale 2026' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'Giảm giá mùa hè' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '2026-08-01T00:00:00Z' })
  @IsDateString()
  startsAt: string;

  @ApiProperty({ example: '2026-08-31T23:59:59Z' })
  @IsDateString()
  endsAt: string;
}

export class CreateFlashSaleItemDto {
  @ApiProperty({ description: 'Flash sale ID' })
  @IsUUID()
  flashSaleId: string;

  @ApiProperty({ description: 'Book ID' })
  @IsUUID()
  bookId: string;

  @ApiProperty({ example: 250000, description: 'Original price' })
  @IsNumber()
  @Min(0)
  originalPrice: number;

  @ApiProperty({ example: 199000, description: 'Sale price' })
  @IsNumber()
  @Min(0)
  salePrice: number;

  @ApiProperty({ example: 100, description: 'Stock quantity' })
  @IsNumber()
  @Min(1)
  stock: number;

  @ApiPropertyOptional({ example: 2, description: 'Max per user' })
  @IsNumber()
  @Min(1)
  @IsOptional()
  maxPerUser?: number;
}

export class FlashSaleQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsNumber()
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ enum: FlashSaleStatus })
  @IsEnum(FlashSaleStatus)
  @IsOptional()
  status?: FlashSaleStatus;
}

export class FlashSaleItemQueryDto {
  @ApiPropertyOptional({ description: 'Flash sale ID' })
  @IsUUID()
  @IsOptional()
  flashSaleId?: string;

  @ApiPropertyOptional({ description: 'Book ID' })
  @IsUUID()
  @IsOptional()
  bookId?: string;
}
