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
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { ApiSuccessResponse, ApiStandardErrors } from "@huki/shared";
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
@ApiBearerAuth("JWT-auth")
@Throttle({ default: { limit: 240, ttl: 60_000 } })
@UseGuards(AuthenticatedCommunityGuard, ThrottlerGuard)
@Controller("chat/conversations")
export class ChatController {
  constructor(
    private readonly chat: ChatService,
    private readonly gateway: ChatGateway,
    private readonly attachmentStorage: ChatAttachmentStorage,
  ) {}

  @Get()
  @ApiOperation({ summary: "List user's conversations" })
  @ApiQuery({ name: "storeId", required: false, type: String })
  @ApiSuccessResponse(undefined, { isArray: true, description: "Conversations list" })
  @ApiStandardErrors(401)
  list(
    @CurrentCommunityActor() actor: CommunityActor,
    @Query('storeId') storeId?: string,
  ) {
    return this.chat.listConversations(actor, storeId);
  }

  @Post()
  @ApiOperation({ summary: "Create a new conversation" })
  @ApiSuccessResponse(undefined, { status: 201, description: "Conversation created" })
  @ApiStandardErrors(400, 401, 404)
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
  @ApiOperation({ summary: "Get messages in a conversation" })
  @ApiSuccessResponse(undefined, { isArray: true, description: "Conversation messages" })
  @ApiStandardErrors(401, 403, 404)
  messages(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: ChatIdParamDto,
    @Query() query: ChatPaginationDto,
  ) {
    return this.chat.getMessages(actor, id, query);
  }

  @Post(":id/messages")
  @ApiConsumes("application/json", "multipart/form-data")
  @ApiOperation({ summary: "Send a message in a conversation" })
  @ApiSuccessResponse(undefined, { status: 201, description: "Message sent" })
  @ApiStandardErrors(400, 401, 403, 404, 429)
  @UseInterceptors(
    FilesInterceptor("attachments", 10, {
      limits: { fileSize: 30 * 1024 * 1024 },
    }),
  )
  async send(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: ChatIdParamDto,
    @Body() dto: SendMessageDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    await this.chat.ensureWritable(actor, id, dto.storeId);
    const uploaded = await this.attachmentStorage.uploadMany(id, files);
    const delivery = await this.chat.sendMessage(actor, id, {
      ...dto,
      attachments: [...(dto.attachments ?? []), ...uploaded],
    });
    await this.gateway.publishMessage(delivery);
    return { message: "Message sent", data: delivery.data };
  }

  @Patch(":id/read")
  @ApiOperation({ summary: "Mark conversation as read" })
  @ApiQuery({ name: "storeId", required: false, type: String })
  @ApiSuccessResponse(undefined, { description: "Marked as read" })
  @ApiStandardErrors(401, 403, 404)
  async read(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: ChatIdParamDto,
    @Query('storeId') storeId?: string,
  ) {
    const receipt = await this.chat.markRead(actor, id, storeId);
    this.gateway.publishReadReceipt(receipt);
    return { message: "Marked as read" };
  }

  @Post(":id/close")
  @ApiOperation({ summary: "Close a conversation" })
  @ApiSuccessResponse(undefined, { status: 201, description: "Conversation closed" })
  @ApiStandardErrors(401, 403, 404)
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
  @ApiOperation({ summary: "Get conversation details" })
  @ApiSuccessResponse(undefined, { description: "Conversation detail" })
  @ApiStandardErrors(401, 403, 404)
  detail(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: ChatIdParamDto,
    @Query() query: ChatPaginationDto,
  ) {
    return this.chat.getConversation(actor, id, query);
  }
}
