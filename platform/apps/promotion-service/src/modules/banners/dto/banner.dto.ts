import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsEnum,
  IsBoolean,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum BannerScope {
  HOMEPAGE = 'HOMEPAGE',
  CATEGORY = 'CATEGORY',
  STORE = 'STORE',
}

export class CreateBannerDto {
  @ApiProperty({ example: 'Summer Sale' })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: 'https://cdn.example.com/banner.jpg' })
  @IsString()
  image: string;

  @ApiPropertyOptional({ example: '/promotions/summer-sale' })
  @IsString()
  @IsOptional()
  link?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsNumber()
  @IsOptional()
  position?: number;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ enum: BannerScope, default: BannerScope.HOMEPAGE })
  @IsEnum(BannerScope)
  @IsOptional()
  scope?: BannerScope;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  storeId?: string;
}

export class UpdateBannerDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  image?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  link?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  position?: number;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class BannerQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsNumber()
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ enum: BannerScope })
  @IsEnum(BannerScope)
  @IsOptional()
  scope?: BannerScope;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  storeId?: string;
}
