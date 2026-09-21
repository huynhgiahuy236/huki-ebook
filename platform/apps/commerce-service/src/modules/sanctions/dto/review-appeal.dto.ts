import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AppealDecision } from '../../../../prisma/generated/client';

export class ReviewAppealDto {
  @IsEnum(AppealDecision)
  decision: AppealDecision;

  @IsOptional()
  @IsString()
  decisionReason?: string;
}
