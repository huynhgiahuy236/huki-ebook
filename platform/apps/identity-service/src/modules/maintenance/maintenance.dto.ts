import { IsOptional, IsBoolean, IsString, IsArray, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMaintenanceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mode?: 'IMMEDIATE' | 'GRACEFUL';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scheduledStartTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scheduledEndTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  drainDurationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  affectedRoles?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowOfflineDrm?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowShipperOfflineCod?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supportHotline?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supportEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  whitelistIps?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  updatedBy?: string;
}

