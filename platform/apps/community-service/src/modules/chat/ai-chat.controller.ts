import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { AiChatService } from "./ai-chat.service";
import { AskAiDto } from "./dto/ai-chat.dto";

@ApiTags("Chat")
@Throttle({ default: { limit: 30, ttl: 60_000 } })
@UseGuards(ThrottlerGuard)
@Controller("chat/ai")
export class AiChatController {
  constructor(private readonly aiService: AiChatService) {}

  @Post()
  @ApiOperation({ summary: "Chat with HUKI AI Assistant (Google Gemini integration)" })
  async ask(@Body() dto: AskAiDto) {
    return this.aiService.askAi(dto);
  }
}
