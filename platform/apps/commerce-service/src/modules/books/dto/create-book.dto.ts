import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsISBN,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { BookFormat } from '../../../../prisma/generated/client';
import { DigitalBookDetailsDto, PhysicalBookDetailsDto } from './book-details.dto';

export class CreateBookDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Business that owns this book/storefront' })
  @IsOptional()
  @IsUUID()
  businessId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiProperty({ example: 'Mắt biếc' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title: string;

  @ApiPropertyOptional({ example: 'mat-biec' })
  @IsOptional()
  @MaxLength(500)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @MaxLength(20)
  isbn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverImage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverUrl?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  authorId?: string;

  @IsOptional()
  @IsUUID()
  publisherId?: string;

  @ApiPropertyOptional({ enum: BookFormat })
  @IsOptional()
  @IsEnum(BookFormat)
  format?: BookFormat;

  @ApiPropertyOptional({ type: PhysicalBookDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PhysicalBookDetailsDto)
  physicalDetails?: PhysicalBookDetailsDto;

  @ApiPropertyOptional({ type: DigitalBookDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DigitalBookDetailsDto)
  digitalDetails?: DigitalBookDetailsDto;
}
