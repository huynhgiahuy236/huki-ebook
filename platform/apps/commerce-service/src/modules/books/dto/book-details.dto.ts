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
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock: number;

  @Type(() => Number)
  @IsPositive()
  weight: number;

  @Type(() => Number)
  @IsPositive()
  length: number;

  @Type(() => Number)
  @IsPositive()
  width: number;

  @Type(() => Number)
  @IsPositive()
  height: number;

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
}
