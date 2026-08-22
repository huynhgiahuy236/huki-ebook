import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import {
  AuthenticatedCommunityGuard,
  CommunityActor,
} from "../../common/community-auth.guard";
import { CurrentCommunityActor } from "../../common/current-community-actor.decorator";
import { ChatGateway } from "./chat.gateway";
import { ChatService } from "./chat.service";
import { ChatAttachmentStorage } from "./chat-attachment.storage";
import {
  ChatIdParamDto,
  ChatPaginationDto,
  CreateConversationDto,
  SendMessageDto,
} from "./dto/chat.dto";

@ApiTags("Chat")
@ApiBearerAuth()
@Throttle({ default: { limit: 60, ttl: 60_000 } })
@UseGuards(AuthenticatedCommunityGuard, ThrottlerGuard)
@Controller("chat/conversations")
export class ChatController {
  constructor(
    private readonly chat: ChatService,
    private readonly gateway: ChatGateway,
    private readonly attachmentStorage: ChatAttachmentStorage,
  ) {}

  @Get()
  list(@CurrentCommunityActor() actor: CommunityActor) {
    return this.chat.listConversations(actor);
  }

  @Post()
  async create(
    @CurrentCommunityActor() actor: CommunityActor,
    @Body() dto: CreateConversationDto,
  ) {
    const result = await this.chat.createConversation(actor, dto);
    const { delivery, ...response } = result;
    if (delivery) await this.gateway.publishMessage(delivery);
    return response;
  }

  @Get(":id/messages")
  messages(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: ChatIdParamDto,
    @Query() query: ChatPaginationDto,
  ) {
    return this.chat.getMessages(actor, id, query);
  }

  @Post(":id/messages")
  @ApiConsumes("application/json", "multipart/form-data")
  @UseInterceptors(
    FilesInterceptor("attachments", 10, {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async send(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: ChatIdParamDto,
    @Body() dto: SendMessageDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    await this.chat.ensureWritable(actor, id);
    const uploaded = await this.attachmentStorage.uploadMany(id, files);
    const delivery = await this.chat.sendMessage(actor, id, {
      ...dto,
      attachments: [...(dto.attachments ?? []), ...uploaded],
    });
    await this.gateway.publishMessage(delivery);
    return { message: "Message sent", data: delivery.data };
  }

  @Patch(":id/read")
  async read(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: ChatIdParamDto,
  ) {
    const receipt = await this.chat.markRead(actor, id);
    this.gateway.publishReadReceipt(receipt);
    return { message: "Marked as read" };
  }

  @Post(":id/close")
  async close(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: ChatIdParamDto,
  ) {
    const participantIds = await this.chat.requireParticipantIds(actor, id);
    const response = await this.chat.closeConversation(actor, id);
    this.gateway.publishClosed(id, participantIds);
    return response;
  }

  @Get(":id")
  detail(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: ChatIdParamDto,
    @Query() query: ChatPaginationDto,
  ) {
    return this.chat.getConversation(actor, id, query);
  }
}
