import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAiAudioPlanDto {
  @ApiProperty({ example: 'AI_VOICE_BASIC_100K' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Gói AI Voice Tiết Kiệm (1 Tháng)' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 100000 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 30 })
  @IsNumber()
  @Min(1)
  durationDays: number;

  @ApiProperty({ example: 'Kích hoạt giọng đọc AI tự nhiên chuẩn Studio HUKI cho 01 ấn bản Ebook DRM.' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 'Studio AI Chuẩn (Nam / Bắc)' })
  @IsString()
  @IsNotEmpty()
  voiceType: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isPopular?: boolean;

  @ApiPropertyOptional({ example: 'ACTIVE' })
  @IsString()
  @IsOptional()
  status?: string;
}

export class UpdateAiAudioPlanDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(1)
  @IsOptional()
  durationDays?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  voiceType?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isPopular?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  status?: string;
}
