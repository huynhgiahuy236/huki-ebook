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
  @IsString()
  @IsNotEmpty()
  targetUrl: string;

  @IsString()
  @IsOptional()
  @Matches(/^[a-zA-Z0-9_-]{3,50}$/, {
    message: 'Mã rút gọn chỉ chứa chữ cái, số, dấu gạch dưới hoặc gạch nối (3-50 ký tự)',
  })
  customShortCode?: string;

  @IsString()
  @IsOptional()
  campaignName?: string;

  @IsString()
  @IsOptional()
  subId?: string;

  @IsString()
  @IsOptional()
  targetBookId?: string;

  @IsString()
  @IsOptional()
  targetStoreId?: string;
}

export class QueryAffiliateLinksDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(AffiliateLinkTargetType)
  @IsOptional()
  targetType?: AffiliateLinkTargetType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}

export class ResolveLinkQueryDto {
  @IsString()
  @IsOptional()
  subId?: string;
}
