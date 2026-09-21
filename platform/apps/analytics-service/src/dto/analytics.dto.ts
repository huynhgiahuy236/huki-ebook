import {
  IsString,
  IsNotEmpty,
  IsOptional,
  Matches,
  IsIn,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DateRangeQueryDto {
  @ApiPropertyOptional({ description: 'Start date (YYYY-MM-DD)', example: '2026-09-01' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'from must be in YYYY-MM-DD format' })
  from?: string;

  @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD)', example: '2026-09-19' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'to must be in YYYY-MM-DD format' })
  to?: string;

  @ApiPropertyOptional({ description: 'Filter by specific metric name' })
  @IsOptional()
  @IsString()
  metric?: string;

  @ApiPropertyOptional({ description: 'Ranking dimension for bestsellers', enum: ['UNITS', 'GMV'], default: 'UNITS' })
  @IsOptional()
  @IsString()
  @IsIn(['UNITS', 'GMV'], { message: 'by must be either UNITS or GMV' })
  by?: 'UNITS' | 'GMV';

  @ApiPropertyOptional({ description: 'Limit number of results', default: 10, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

export class RollupDayDto {
  @ApiProperty({ description: 'Business date to aggregate (YYYY-MM-DD)', example: '2026-09-18' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in YYYY-MM-DD format' })
  date!: string;
}
