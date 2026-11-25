import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsIn,
  IsArray,
  ValidateNested,
  ArrayMaxSize,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const ALLOWED_TELEMETRY_EVENT_TYPES = [
  'PAGE_VIEW',
  'PRODUCT_VIEW',
  'PRODUCT_VIEW_LONG',
  'READ_SAMPLE',
  'SEARCH_QUERY',
  'BOUNCE',
  'FOLLOW_AUTHOR',
  'FOLLOW_STORE',
  'CATEGORY_VIEW',
  'AUTHOR_VIEW',
  'ADD_TO_CART',
  'SAVE_WISHLIST',
  'PURCHASE_BOOK',
  'READING_PROGRESS',
] as const;

export type AllowedTelemetryEventType = (typeof ALLOWED_TELEMETRY_EVENT_TYPES)[number];

export class CreateEventDto {
  @ApiPropertyOptional({ description: 'Client event UUID', example: 'd3b07384-d113-467b-a25e-e47852c06922' })
  @IsOptional()
  @IsString()
  event_id?: string;

  @IsOptional()
  @IsString()
  sourceEventId?: string;

  @ApiPropertyOptional({
    description: 'Telemetry event type',
    enum: ALLOWED_TELEMETRY_EVENT_TYPES,
    example: 'PAGE_VIEW',
  })
  @IsOptional()
  @IsString()
  @IsIn(ALLOWED_TELEMETRY_EVENT_TYPES as unknown as string[], {
    message: `event_type must be one of: ${ALLOWED_TELEMETRY_EVENT_TYPES.join(', ')}`,
  })
  event_type?: AllowedTelemetryEventType;

  @IsOptional()
  @IsString()
  @IsIn(ALLOWED_TELEMETRY_EVENT_TYPES as unknown as string[], {
    message: `eventType must be one of: ${ALLOWED_TELEMETRY_EVENT_TYPES.join(', ')}`,
  })
  eventType?: AllowedTelemetryEventType;

  @ApiPropertyOptional({ description: 'User ID (overridden by server auth context if authenticated)' })
  @IsOptional()
  @IsString()
  user_id?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Anonymous session ID' })
  @IsOptional()
  @IsString()
  session_id?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Store ID' })
  @IsOptional()
  @IsString()
  store_id?: string;

  @IsOptional()
  @IsString()
  storeId?: string;

  @ApiPropertyOptional({ description: 'Book ID' })
  @IsOptional()
  @IsString()
  book_id?: string;

  @IsOptional()
  @IsString()
  bookId?: string;

  @ApiPropertyOptional({ description: 'Custom event properties' })
  @IsOptional()
  properties?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Client context metadata' })
  @IsOptional()
  context?: {
    ip?: string;
    user_agent?: string;
    userAgent?: string;
    referrer?: string;
    url?: string;
    [key: string]: any;
  };

  @ApiPropertyOptional({ description: 'Timestamp when event occurred' })
  @IsOptional()
  timestamp?: string | Date;

  @IsOptional()
  createdAt?: string | Date;
}

export class CreateBatchEventsDto {
  @ApiProperty({ type: [CreateEventDto], description: 'List of events (max 50 per batch)' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50, { message: 'Maximum batch size is 50 events' })
  @ValidateNested({ each: true })
  @Type(() => CreateEventDto)
  events!: CreateEventDto[];
}
