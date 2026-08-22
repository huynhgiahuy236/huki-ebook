import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import {
  ATTACHMENT_TYPES,
  AttachmentType,
  MESSAGE_TYPES,
  MessageType,
} from "../../../entities/message.schema";
import {
  CHAT_CONTEXT_TYPES,
  ChatContextType,
} from "../../../entities/conversation.schema";

export class ChatPaginationDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 50, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;
}

export class ChatIdParamDto {
  @ApiProperty()
  @IsMongoId()
  id!: string;
}

export class MessageAttachmentDto {
  @ApiProperty({ enum: ATTACHMENT_TYPES })
  @IsIn(ATTACHMENT_TYPES)
  type!: AttachmentType;

  @ApiProperty()
  @IsUrl({ require_protocol: true })
  url!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_protocol: true })
  thumbnail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  size?: number;
}

export class SendMessageDto {
  @ApiProperty({ minLength: 1, maxLength: 10_000 })
  @IsString()
  @Length(1, 10_000)
  content!: string;

  @ApiPropertyOptional({ enum: MESSAGE_TYPES, default: "TEXT" })
  @IsOptional()
  @IsIn(MESSAGE_TYPES)
  messageType: MessageType = "TEXT";

  @ApiPropertyOptional({ type: [MessageAttachmentDto], maxItems: 10 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => MessageAttachmentDto)
  attachments?: MessageAttachmentDto[];
}

export class CreateConversationDto {
  @ApiProperty()
  @IsUUID()
  storeId!: string;

  @ApiProperty({ enum: CHAT_CONTEXT_TYPES })
  @IsIn(CHAT_CONTEXT_TYPES)
  contextType!: ChatContextType;

  @ApiProperty()
  @IsUUID()
  contextId!: string;

  @ApiProperty({ minLength: 1, maxLength: 10_000 })
  @IsString()
  @Length(1, 10_000)
  initialMessage!: string;
}

export class ConversationEventDto {
  @ApiProperty()
  @IsMongoId()
  conversationId!: string;
}

export class SocketSendMessageDto extends SendMessageDto {
  @ApiProperty()
  @IsMongoId()
  conversationId!: string;
}
