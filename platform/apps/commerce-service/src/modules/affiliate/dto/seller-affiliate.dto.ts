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
  @IsBoolean({ message: 'isEnabled phải là boolean' })
  isEnabled: boolean;

  @IsOptional()
  @IsBoolean({ message: 'autoEnrollNewBooks phải là boolean' })
  autoEnrollNewBooks?: boolean;

  @IsOptional()
  @IsNumber({}, { message: 'physicalRate phải là số' })
  @Min(0, { message: 'Tỷ lệ hoa hồng sách giấy tối thiểu là 0%' })
  @Max(30, { message: 'Tỷ lệ hoa hồng sách giấy tối đa là 30%' })
  @Type(() => Number)
  physicalRate?: number;

  @IsOptional()
  @IsNumber({}, { message: 'ebookRate phải là số' })
  @Min(0, { message: 'Tỷ lệ hoa hồng Ebook tối thiểu là 0%' })
  @Max(50, { message: 'Tỷ lệ hoa hồng Ebook tối đa là 50%' })
  @Type(() => Number)
  ebookRate?: number;

  @IsOptional()
  @IsNumber({}, { message: 'audioRate phải là số' })
  @Min(0, { message: 'Tỷ lệ hoa hồng Audiobook tối thiểu là 0%' })
  @Max(50, { message: 'Tỷ lệ hoa hồng Audiobook tối đa là 50%' })
  @Type(() => Number)
  audioRate?: number;
}

export class UpdateBookAffiliateSettingDto {
  @IsBoolean({ message: 'isEligible phải là boolean' })
  isEligible: boolean;

  @IsOptional()
  @IsNumber({}, { message: 'customRate phải là số' })
  @Min(0, { message: 'Tỷ lệ hoa hồng tùy chỉnh tối thiểu là 0%' })
  @Max(50, { message: 'Tỷ lệ hoa hồng tùy chỉnh tối đa là 50%' })
  @Type(() => Number)
  customRate?: number | null;

  @IsOptional()
  @IsString({ message: 'Ghi chú phải là chuỗi' })
  @MaxLength(500, { message: 'Ghi chú tối đa 500 ký tự' })
  notes?: string;
}

export class BulkUpdateBooksAffiliateDto {
  @IsArray({ message: 'bookIds phải là danh sách ID sách' })
  @ArrayMinSize(1, { message: 'Cần chọn ít nhất 1 cuốn sách' })
  @ArrayMaxSize(100, { message: 'Tối đa cập nhật 100 cuốn sách mỗi lần' })
  @IsString({ each: true, message: 'Mỗi bookId phải là chuỗi hợp lệ' })
  bookIds: string[];

  @IsOptional()
  @IsBoolean({ message: 'isEligible phải là boolean' })
  isEligible?: boolean;

  @IsOptional()
  @IsNumber({}, { message: 'customRate phải là số' })
  @Min(0, { message: 'Tỷ lệ hoa hồng tùy chỉnh tối thiểu là 0%' })
  @Max(50, { message: 'Tỷ lệ hoa hồng tùy chỉnh tối đa là 50%' })
  @Type(() => Number)
  customRate?: number | null;
}

export class QueryStoreBooksAffiliateDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  format?: 'PHYSICAL' | 'DIGITAL' | 'BOTH';

  @IsOptional()
  @IsString()
  eligibility?: 'ALL' | 'ELIGIBLE' | 'INELIGIBLE';

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isEligible?: boolean;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class SellerNetPreviewQueryDto {
  @IsNumber({}, { message: 'price phải là số' })
  @Min(1000, { message: 'Giá sản phẩm tối thiểu 1,000 VND' })
  @Type(() => Number)
  price: number;

  @IsEnum(BookFormat, { message: 'format phải là PHYSICAL, DIGITAL hoặc BOTH' })
  format: BookFormat;

  @IsOptional()
  @IsNumber({}, { message: 'customRate phải là số' })
  @Min(0)
  @Max(50)
  @Type(() => Number)
  customRate?: number;
}
