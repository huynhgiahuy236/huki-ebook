import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AffiliateLinkTargetType } from '../../../../prisma/generated/client';

export class CreateAffiliateLinkDto {
  @ApiProperty({ example: 'https://huki.ebook.com/books/mat-biec' })
  @IsString()
  @IsNotEmpty()
  targetUrl: string;

  @ApiPropertyOptional({ example: 'mat-biec-review' })
  @IsString()
  @IsOptional()
  @Matches(/^[a-zA-Z0-9_-]{3,50}$/, {
    message: 'Mã rút gọn chỉ chứa chữ cái, số, dấu gạch dưới hoặc gạch nối (3-50 ký tự)',
  })
  customShortCode?: string;

  @ApiPropertyOptional({ example: 'Summer Campaign' })
  @IsString()
  @IsOptional()
  campaignName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  subId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  targetBookId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  targetStoreId?: string;
}

export class QueryAffiliateLinksDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: AffiliateLinkTargetType })
  @IsEnum(AffiliateLinkTargetType)
  @IsOptional()
  targetType?: AffiliateLinkTargetType;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}

export class ResolveLinkQueryDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  subId?: string;
}
