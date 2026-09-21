import { IsOptional, IsString, IsIn, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GmvQueryDto {
  @ApiPropertyOptional({ description: 'Start date in YYYY-MM-DD format', example: '2026-09-01' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'from must be in YYYY-MM-DD format' })
  from?: string;

  @ApiPropertyOptional({ description: 'End date in YYYY-MM-DD format', example: '2026-09-19' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'to must be in YYYY-MM-DD format' })
  to?: string;

  @ApiPropertyOptional({ description: 'Time-bucket aggregation interval', enum: ['daily', 'weekly', 'monthly'], default: 'daily' })
  @IsOptional()
  @IsIn(['daily', 'weekly', 'monthly'], { message: "interval must be one of 'daily', 'weekly', 'monthly'" })
  interval?: 'daily' | 'weekly' | 'monthly';
}
