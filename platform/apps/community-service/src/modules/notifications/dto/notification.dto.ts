import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { NOTIFICATION_DEVICE_TYPES } from "../../../entities/notification-device.schema";
import { NOTIFICATION_TYPES } from "../../../entities/notification.schema";

function optionalBoolean(value: unknown) {
  if (value === "true" || value === true) return true;
  if (value === "false" || value === false) return false;
  return value;
}

export class NotificationListQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => optionalBoolean(value))
  @IsBoolean()
  isRead?: boolean;

  @ApiPropertyOptional({ enum: NOTIFICATION_TYPES })
  @IsOptional()
  @IsIn(NOTIFICATION_TYPES)
  type?: (typeof NOTIFICATION_TYPES)[number];
}

export class NotificationIdParamDto {
  @IsMongoId()
  id!: string;
}

export class EmailNotificationPreferenceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  orderUpdates?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  promotions?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  newsletter?: boolean;
}

export class PushNotificationPreferenceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  orderUpdates?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  chatMessages?: boolean;
}

export class UpdateNotificationPreferenceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  orderUpdates?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  promotions?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  newReviews?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  chatMessages?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  forumActivity?: boolean;

  @ApiPropertyOptional({ type: EmailNotificationPreferenceDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => EmailNotificationPreferenceDto)
  emailNotifications?: EmailNotificationPreferenceDto;

  @ApiPropertyOptional({ type: PushNotificationPreferenceDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PushNotificationPreferenceDto)
  pushNotifications?: PushNotificationPreferenceDto;
}

export class RegisterNotificationDeviceDto {
  @ApiProperty()
  @IsString()
  @Length(20, 4_096)
  deviceToken!: string;

  @ApiProperty({ enum: NOTIFICATION_DEVICE_TYPES })
  @IsIn(NOTIFICATION_DEVICE_TYPES)
  deviceType!: (typeof NOTIFICATION_DEVICE_TYPES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 50)
  appVersion?: string;
}
