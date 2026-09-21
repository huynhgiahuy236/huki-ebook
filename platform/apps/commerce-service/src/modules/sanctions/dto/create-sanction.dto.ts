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
  @IsUUID()
  @IsNotEmpty()
  storeId: string;

  @IsEnum(SanctionLevel)
  level: SanctionLevel;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  @IsString()
  violationCode?: string;

  @ValidateIf((o) => o.level === SanctionLevel.SUSPENSION)
  @IsInt()
  @Min(1)
  @Max(3)
  durationMonths?: number;

  @IsOptional()
  evidence?: Record<string, any>;
}
