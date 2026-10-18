import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ThrottlerModule } from "@nestjs/throttler";
import { EventsModule } from "@huki/shared";
import { AuthenticatedCommunityGuard } from "../../common/community-auth.guard";
import {
  Conversation,
  ConversationSchema,
} from "../../entities/conversation.schema";
import { Message, MessageSchema } from "../../entities/message.schema";
import { QuickReply, QuickReplySchema } from "../../entities/quick-reply.schema";
import { ChatController } from "./chat.controller";
import { AiChatController } from "./ai-chat.controller";
import { QuickReplyController } from "./quick-reply.controller";
import { ChatAttachmentStorage } from "./chat-attachment.storage";
import { ChatGateway } from "./chat.gateway";
import { ChatService } from "./chat.service";
import { AiChatService } from "./ai-chat.service";
import { QuickReplyService } from "./quick-reply.service";

@Module({
  imports: [
    EventsModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
      { name: QuickReply.name, schema: QuickReplySchema },
    ]),
  ],
  controllers: [ChatController, AiChatController, QuickReplyController],
  providers: [
    ChatService,
    AiChatService,
    QuickReplyService,
    ChatGateway,
    ChatAttachmentStorage,
    AuthenticatedCommunityGuard,
  ],
})
export class ChatModule {}
