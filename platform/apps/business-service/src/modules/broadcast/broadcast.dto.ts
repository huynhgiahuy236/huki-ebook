import { IsNotEmpty, IsOptional, IsString, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBroadcastDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  summary!: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  content!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: 'MAINTENANCE' | 'POLICY' | 'ORDER' | 'FINANCE' | 'MARKETING' | 'SECURITY';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  severity?: 'INFO' | 'WARNING' | 'CRITICAL';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetType?: 'ALL' | 'SEGMENT' | 'DIRECT';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetSegment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  targetRoles?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  targetBusinessIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  channels?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPinnedTop?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDismissible?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scheduleType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recurringRule?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: 'ACTIVE' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  authorName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actionUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actionLabel?: string;
}

export class UpdateBroadcastActionDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  action!: 'MARK_READ' | 'MARK_ALL_READ' | 'TOGGLE_PIN' | 'DISMISS';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessId?: string;
}

