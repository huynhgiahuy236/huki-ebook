import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  MODERATION_ACTIONS,
  ModerationAction,
  REPORT_REASONS,
  REPORT_STATUSES,
  REPORT_TARGET_TYPES,
  ReportReason,
  ReportStatus,
  ReportTargetType,
} from '../../../entities/report.schema';

export class CreateReportDto {
  @ApiProperty({ enum: REPORT_REASONS })
  @IsIn(REPORT_REASONS)
  reason!: ReportReason;

  @ApiPropertyOptional({ maxLength: 2_000 })
  @IsOptional()
  @IsString()
  @Length(3, 2_000)
  description?: string;
}

export class ModerationIdParamDto {
  @IsMongoId()
  id!: string;
}

export class ModerationTargetParamDto extends ModerationIdParamDto {
  @ApiProperty({ enum: ['POST', 'COMMENT', 'REVIEW'] })
  @IsIn(['POST', 'COMMENT', 'REVIEW'])
  targetType!: Extract<ReportTargetType, 'POST' | 'COMMENT' | 'REVIEW'>;
}

export class ReportListQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @IsIn(REPORT_STATUSES)
  status?: ReportStatus;

  @IsOptional()
  @IsIn(REPORT_TARGET_TYPES)
  targetType?: ReportTargetType;
}

export class ModerationQueueQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @IsIn(['POST', 'COMMENT', 'REVIEW'])
  targetType?: Extract<ReportTargetType, 'POST' | 'COMMENT' | 'REVIEW'>;

  @IsOptional()
  @IsIn(['PENDING_REVIEW', 'FLAGGED'])
  status?: 'PENDING_REVIEW' | 'FLAGGED';
}

export class ResolveReportDto {
  @ApiProperty({ enum: ['RESOLVED', 'DISMISSED'] })
  @IsIn(['RESOLVED', 'DISMISSED'])
  outcome!: Extract<ReportStatus, 'RESOLVED' | 'DISMISSED'>;

  @ApiProperty({ enum: MODERATION_ACTIONS })
  @IsIn(MODERATION_ACTIONS)
  action!: ModerationAction;

  @ApiProperty({ minLength: 3, maxLength: 2_000 })
  @IsString()
  @Length(3, 2_000)
  note!: string;
}

export class ModerateContentDto {
  @ApiProperty({ enum: ['APPROVE', 'HIDE', 'DELETE'] })
  @IsIn(['APPROVE', 'HIDE', 'DELETE'])
  action!: 'APPROVE' | 'HIDE' | 'DELETE';

  @ApiPropertyOptional({ maxLength: 2_000 })
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  note?: string;
}
