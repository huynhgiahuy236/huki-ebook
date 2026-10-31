import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PenaltyActionDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  action!: 'RESET_POINTS' | 'APPEAL_VIOLATION' | 'ADMIN_REVIEW_APPEAL' | 'ADD_POINTS';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recordId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  proof?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  decision?: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adminNote?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  violationType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  violationName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  points?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  relatedOrderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  relatedBookTitle?: string;
}

