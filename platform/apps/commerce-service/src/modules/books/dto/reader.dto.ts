import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateBookmarkDto {
  @ApiPropertyOptional({ description: 'Book ID or UUID' })
  @IsOptional()
  @IsString()
  bookId?: string;

  @ApiPropertyOptional({ description: 'Product ID or UUID (alias for bookId)' })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty({ description: 'Page number for bookmark', example: 42 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageNumber: number;

  @ApiPropertyOptional({ description: 'Optional bookmark note or highlight snippet', example: 'Đoạn mở đầu quan trọng' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class SaveProgressDto {
  @ApiPropertyOptional({ description: 'Book ID or UUID' })
  @IsOptional()
  @IsString()
  bookId?: string;

  @ApiPropertyOptional({ description: 'Product ID or UUID (alias for bookId)' })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty({ description: 'Current reading page number', example: 42 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  currentPage: number;

  @ApiPropertyOptional({ description: 'Reading percentage complete (0.00 - 100.00)', example: 35.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage?: number;
}
