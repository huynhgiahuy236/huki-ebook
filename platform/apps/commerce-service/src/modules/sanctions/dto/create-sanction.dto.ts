import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { SanctionLevel } from '../../../../prisma/generated/client';

export class CreateSanctionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  storeId: string;

  @ApiProperty({ enum: SanctionLevel })
  @IsEnum(SanctionLevel)
  level: SanctionLevel;

  @ApiProperty({ example: 'Vi phạm chính sách bán hàng' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({ example: 'POLICY_VIOLATION_01' })
  @IsOptional()
  @IsString()
  violationCode?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 3, description: 'Required when level is SUSPENSION' })
  @ValidateIf((o) => o.level === SanctionLevel.SUSPENSION)
  @IsInt()
  @Min(1)
  @Max(3)
  durationMonths?: number;

  @ApiPropertyOptional({ type: 'object' })
  @IsOptional()
  evidence?: Record<string, any>;
}
