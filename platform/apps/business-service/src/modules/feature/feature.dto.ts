import { IsOptional, IsString, IsBoolean, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFeatureDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  featureId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEnabledGlobally?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  maintenanceReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scheduledDisableAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scheduledEnableAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scheduledReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  disabledBusinesses?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  enabledBusinesses?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  businessIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  featureIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isBlocked?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isBusinessEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  updatedBy?: string;
}

