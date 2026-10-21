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
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_RECIPIENT_TYPES,
  NOTIFICATION_TYPES,
  NotificationCategory,
  NotificationPriority,
  NotificationRecipientType,
  NotificationType,
} from "../../../entities/notification.schema";

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
  type?: NotificationType;

  @ApiPropertyOptional({ enum: NOTIFICATION_CATEGORIES })
  @IsOptional()
  @IsIn(NOTIFICATION_CATEGORIES)
  category?: NotificationCategory;

  @ApiPropertyOptional({ enum: NOTIFICATION_PRIORITIES })
  @IsOptional()
  @IsIn(NOTIFICATION_PRIORITIES)
  priority?: NotificationPriority;

  @ApiPropertyOptional({ enum: NOTIFICATION_RECIPIENT_TYPES })
  @IsOptional()
  @IsIn(NOTIFICATION_RECIPIENT_TYPES)
  recipientType?: NotificationRecipientType;
}

export class NotificationUnreadCountQueryDto {
  @ApiPropertyOptional({ enum: NOTIFICATION_RECIPIENT_TYPES })
  @IsOptional()
  @IsIn(NOTIFICATION_RECIPIENT_TYPES)
  recipientType?: NotificationRecipientType;
}

export class NotificationReadAllDto {
  @ApiPropertyOptional({ enum: NOTIFICATION_RECIPIENT_TYPES })
  @IsOptional()
  @IsIn(NOTIFICATION_RECIPIENT_TYPES)
  recipientType?: NotificationRecipientType;
}

export class DispatchNotificationDto {
  @ApiProperty({ description: "Target recipient ID (user ID, store ID, or '*' for broadcast)" })
  @IsString()
  @Length(1, 100)
  recipientId!: string;

  @ApiProperty({ enum: NOTIFICATION_RECIPIENT_TYPES, default: "USER" })
  @IsIn(NOTIFICATION_RECIPIENT_TYPES)
  recipientType!: NotificationRecipientType;

  @ApiProperty({ enum: NOTIFICATION_TYPES, default: "SYSTEM" })
  @IsIn(NOTIFICATION_TYPES)
  type!: NotificationType;

  @ApiPropertyOptional({ enum: NOTIFICATION_CATEGORIES, default: "MANUAL_DIRECT" })
  @IsOptional()
  @IsIn(NOTIFICATION_CATEGORIES)
  category?: NotificationCategory;

  @ApiPropertyOptional({ enum: NOTIFICATION_PRIORITIES, default: "NORMAL" })
  @IsOptional()
  @IsIn(NOTIFICATION_PRIORITIES)
  priority?: NotificationPriority;

  @ApiProperty()
  @IsString()
  @Length(1, 200)
  title!: string;

  @ApiProperty()
  @IsString()
  @Length(1, 2000)
  message!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actionUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  payload?: Record<string, unknown>;
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
