import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ThrottlerModule } from "@nestjs/throttler";
import { EventsModule } from "../../../../../libs/shared/src";
import { AuthenticatedCommunityGuard } from "../../common/community-auth.guard";
import {
  Conversation,
  ConversationSchema,
} from "../../entities/conversation.schema";
import { Message, MessageSchema } from "../../entities/message.schema";
import { ChatController } from "./chat.controller";
import { ChatAttachmentStorage } from "./chat-attachment.storage";
import { ChatGateway } from "./chat.gateway";
import { ChatService } from "./chat.service";

@Module({
  imports: [
    EventsModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
  ],
  controllers: [ChatController],
  providers: [
    ChatService,
    ChatGateway,
    ChatAttachmentStorage,
    AuthenticatedCommunityGuard,
  ],
})
export class ChatModule {}
