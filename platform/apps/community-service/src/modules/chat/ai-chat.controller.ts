import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiSuccessResponse, ApiStandardErrors } from "@huki/shared";
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
  @ApiSuccessResponse(undefined, { status: 201, description: "AI assistant reply" })
  @ApiStandardErrors(400, 429)
  async ask(@Body() dto: AskAiDto) {
    return this.aiService.askAi(dto);
  }
}
