import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsPositive,
  Min,
} from 'class-validator';

export class PhysicalBookDetailsDto {
  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ default: 300 })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  weight?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  length?: number;

  @ApiPropertyOptional({ default: 13 })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  width?: number;

  @ApiPropertyOptional({ default: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  height?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  physicalEnabled?: boolean;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;
}

export class DigitalBookDetailsDto {
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  digitalEnabled?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  allowOnlineRead?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  allowDownload?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  drmEnabled?: boolean;
}
