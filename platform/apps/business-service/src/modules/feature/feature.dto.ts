import { IsNotEmpty, IsOptional, IsString, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFeatureDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  id!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEnabledGlobally?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  maintenanceReason?: string;

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
  @IsBoolean()
  isBusinessEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  updatedBy?: string;
}

