import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';
import { BookFormat } from '../../../entities';

export enum BookSortBy {
  CREATED_AT = 'createdAt',
  PUBLISHED_AT = 'publishedAt',
  PRICE = 'price',
  TITLE = 'title',
}

export enum BookSortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class BookListQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({ description: 'Title, ISBN, author or publisher', minLength: 2 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ description: 'Category UUID or slug' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ default: false })
  @Transform(({ value }) => value === true || value === 'true')
  @IsOptional()
  @IsBoolean()
  includeChildren = false;

  @ApiPropertyOptional({ description: 'Author UUID or slug' })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiPropertyOptional({ description: 'Publisher UUID or slug' })
  @IsOptional()
  @IsString()
  publisher?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  store?: string;

  @ApiPropertyOptional({ enum: BookFormat })
  @IsOptional()
  @IsEnum(BookFormat)
  format?: BookFormat;

  @ApiPropertyOptional({ minimum: 0 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ enum: BookSortBy, default: BookSortBy.CREATED_AT })
  @IsOptional()
  @IsEnum(BookSortBy)
  sortBy = BookSortBy.CREATED_AT;

  @ApiPropertyOptional({ enum: BookSortDirection, default: BookSortDirection.DESC })
  @IsOptional()
  @IsEnum(BookSortDirection)
  order = BookSortDirection.DESC;
}
