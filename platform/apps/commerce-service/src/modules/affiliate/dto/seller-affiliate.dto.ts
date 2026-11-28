import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BookFormat } from '../../../../prisma/generated/client';

export class UpdateStoreAffiliateSettingDto {
  @ApiProperty({ example: true })
  @IsBoolean({ message: 'isEnabled phải là boolean' })
  isEnabled: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean({ message: 'autoEnrollNewBooks phải là boolean' })
  autoEnrollNewBooks?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 30 })
  @IsOptional()
  @IsNumber({}, { message: 'physicalRate phải là số' })
  @Min(0, { message: 'Tỷ lệ hoa hồng sách giấy tối thiểu là 0%' })
  @Max(30, { message: 'Tỷ lệ hoa hồng sách giấy tối đa là 30%' })
  @Type(() => Number)
  physicalRate?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 50 })
  @IsOptional()
  @IsNumber({}, { message: 'ebookRate phải là số' })
  @Min(0, { message: 'Tỷ lệ hoa hồng Ebook tối thiểu là 0%' })
  @Max(50, { message: 'Tỷ lệ hoa hồng Ebook tối đa là 50%' })
  @Type(() => Number)
  ebookRate?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 50 })
  @IsOptional()
  @IsNumber({}, { message: 'audioRate phải là số' })
  @Min(0, { message: 'Tỷ lệ hoa hồng Audiobook tối thiểu là 0%' })
  @Max(50, { message: 'Tỷ lệ hoa hồng Audiobook tối đa là 50%' })
  @Type(() => Number)
  audioRate?: number;
}

export class UpdateBookAffiliateSettingDto {
  @ApiProperty({ example: true })
  @IsBoolean({ message: 'isEligible phải là boolean' })
  isEligible: boolean;

  @ApiPropertyOptional({ nullable: true, minimum: 0, maximum: 50 })
  @IsOptional()
  @IsNumber({}, { message: 'customRate phải là số' })
  @Min(0, { message: 'Tỷ lệ hoa hồng tùy chỉnh tối thiểu là 0%' })
  @Max(50, { message: 'Tỷ lệ hoa hồng tùy chỉnh tối đa là 50%' })
  @Type(() => Number)
  customRate?: number | null;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString({ message: 'Ghi chú phải là chuỗi' })
  @MaxLength(500, { message: 'Ghi chú tối đa 500 ký tự' })
  notes?: string;
}

export class BulkUpdateBooksAffiliateDto {
  @ApiProperty({ type: [String] })
  @IsArray({ message: 'bookIds phải là danh sách ID sách' })
  @ArrayMinSize(1, { message: 'Cần chọn ít nhất 1 cuốn sách' })
  @ArrayMaxSize(100, { message: 'Tối đa cập nhật 100 cuốn sách mỗi lần' })
  @IsString({ each: true, message: 'Mỗi bookId phải là chuỗi hợp lệ' })
  bookIds: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean({ message: 'isEligible phải là boolean' })
  isEligible?: boolean;

  @ApiPropertyOptional({ nullable: true, minimum: 0, maximum: 50 })
  @IsOptional()
  @IsNumber({}, { message: 'customRate phải là số' })
  @Min(0, { message: 'Tỷ lệ hoa hồng tùy chỉnh tối thiểu là 0%' })
  @Max(50, { message: 'Tỷ lệ hoa hồng tùy chỉnh tối đa là 50%' })
  @Type(() => Number)
  customRate?: number | null;
}

export class QueryStoreBooksAffiliateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['PHYSICAL', 'DIGITAL', 'BOTH'] })
  @IsOptional()
  @IsString()
  format?: 'PHYSICAL' | 'DIGITAL' | 'BOTH';

  @ApiPropertyOptional({ enum: ['ALL', 'ELIGIBLE', 'INELIGIBLE'] })
  @IsOptional()
  @IsString()
  eligibility?: 'ALL' | 'ELIGIBLE' | 'INELIGIBLE';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isEligible?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class SellerNetPreviewQueryDto {
  @ApiProperty({ minimum: 1000 })
  @IsNumber({}, { message: 'price phải là số' })
  @Min(1000, { message: 'Giá sản phẩm tối thiểu 1,000 VND' })
  @Type(() => Number)
  price: number;

  @ApiProperty({ enum: BookFormat })
  @IsEnum(BookFormat, { message: 'format phải là PHYSICAL, DIGITAL hoặc BOTH' })
  format: BookFormat;

  @IsOptional()
  @IsNumber({}, { message: 'customRate phải là số' })
  @Min(0)
  @Max(50)
  @Type(() => Number)
  customRate?: number;
}
