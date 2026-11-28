import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAppealDto {
  @ApiProperty({ example: 'Cửa hàng đã cung cấp đầy đủ chứng từ hợp lệ' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({ type: 'object' })
  @IsOptional()
  evidence?: Record<string, any>;
}
