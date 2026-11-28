import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AppealDecision } from '../../../../prisma/generated/client';

export class ReviewAppealDto {
  @ApiProperty({ enum: AppealDecision })
  @IsEnum(AppealDecision)
  decision: AppealDecision;

  @ApiPropertyOptional({ example: 'Chứng từ xác thực hợp lệ' })
  @IsOptional()
  @IsString()
  decisionReason?: string;
}
