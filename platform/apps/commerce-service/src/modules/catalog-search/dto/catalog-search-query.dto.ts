import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export enum CatalogSearchType {
  CATEGORY = 'CATEGORY',
  AUTHOR = 'AUTHOR',
  PUBLISHER = 'PUBLISHER',
}

export class CatalogSearchQueryDto {
  @ApiProperty({ minLength: 2, maxLength: 100, example: 'nguyen nhat' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  q: string;

  @ApiPropertyOptional({
    enum: CatalogSearchType,
    isArray: true,
    example: 'CATEGORY,AUTHOR',
  })
  @IsOptional()
  @Transform(({ value }) =>
    (Array.isArray(value) ? value : String(value).split(','))
      .map((item: string) => item.trim().toUpperCase())
      .filter(Boolean),
  )
  @ArrayNotEmpty()
  @IsEnum(CatalogSearchType, { each: true })
  types?: CatalogSearchType[];

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;
}
