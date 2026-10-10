import { IsArray, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ChatHistoryItemDto {
  @ApiProperty({ enum: ['user', 'assistant'] })
  @IsString()
  role: 'user' | 'assistant';

  @ApiProperty()
  @IsString()
  content: string;
}

export class AskAiDto {
  @ApiProperty({ description: "User's query for HUKI AI Assistant" })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ type: [ChatHistoryItemDto], description: "Recent conversation context" })
  @IsOptional()
  @IsArray()
  history?: ChatHistoryItemDto[];

  @ApiPropertyOptional({ description: "Session or User ID for Redis chat memory" })
  @IsOptional()
  @IsString()
  sessionId?: string;
}
