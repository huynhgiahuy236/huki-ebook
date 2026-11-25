import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
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

  @ApiPropertyOptional({ description: 'Số giấy phép xuất bản / quyết định xuất bản', example: '1234/QĐ-NXBTH' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  publishingLicenseNumber?: string;

  @ApiPropertyOptional({ description: 'Ngôn ngữ xuất bản', example: 'Tiếng Việt' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  language?: string;

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

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pricePaper?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceEbook?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceCombo?: number;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  authorId?: string;

  @IsOptional()
  @IsUUID()
  publisherId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Đơn vị phát hành / Công ty sách' })
  @IsOptional()
  @IsUUID()
  issuingCompanyId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Dịch giả ID' })
  @IsOptional()
  @IsUUID()
  translatorId?: string;

  @ApiPropertyOptional({ description: 'Tên dịch giả (tự động tạo/gắn nếu chưa có ID)', example: 'Nguyễn Văn A' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  translatorName?: string;

  @ApiPropertyOptional({ description: 'Số trang sách in (Số nguyên dương)', example: 320 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageCount?: number;

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

  @ApiPropertyOptional({ description: 'Whether affiliate is enabled for this book' })
  @IsOptional()
  @Type(() => Boolean)
  enableAffiliate?: boolean;

  }
