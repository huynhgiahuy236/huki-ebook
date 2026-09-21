import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAppealDto {
  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  evidence?: Record<string, any>;
}
