import { Logger, UsePipes, ValidationPipe } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { CommunityActor } from "../../common/community-auth.guard";
import { ChatDelivery, ChatService, ReadReceipt } from "./chat.service";
import { ConversationEventDto, SocketSendMessageDto } from "./dto/chat.dto";

type AuthenticatedSocket = Socket & { data: { actor?: CommunityActor } };

@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }),
)
@WebSocketGateway({
  namespace: "/chat",
  cors: { origin: process.env.SOCKET_CORS_ORIGIN ?? "*" },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly chat: ChatService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.tokenFrom(client);
      if (!token) throw new Error("Bearer token is required");
      const actor = await this.jwt.verifyAsync<CommunityActor>(token);
      if (!actor.sub || !actor.role) throw new Error("Invalid access token");
      client.data.actor = actor;
      await client.join(this.userRoom(actor.sub));
      client.broadcast.emit("user:online", { userId: actor.sub });
      client.broadcast.emit("user_online", { userId: actor.sub });
    } catch (error) {
      this.logger.warn(
        `Socket authentication failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    const actor = client.data.actor;
    if (!actor || !this.server) return;
    const remaining = await this.server
      .in(this.userRoom(actor.sub))
      .fetchSockets();
    if (!remaining.length) {
      client.broadcast.emit("user:offline", { userId: actor.sub });
      client.broadcast.emit("user_offline", { userId: actor.sub });
    }
  }

  @SubscribeMessage("conversation:join")
  join(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: ConversationEventDto,
  ) {
    return this.joinConversation(client, dto);
  }

  @SubscribeMessage("join_conversation")
  joinLegacy(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: ConversationEventDto,
  ) {
    return this.joinConversation(client, dto);
  }

  @SubscribeMessage("conversation:leave")
  leave(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: ConversationEventDto,
  ) {
    return this.leaveConversation(client, dto);
  }

  @SubscribeMessage("leave_conversation")
  leaveLegacy(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: ConversationEventDto,
  ) {
    return this.leaveConversation(client, dto);
  }

  @SubscribeMessage("message:send")
  send(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: SocketSendMessageDto,
  ) {
    return this.sendFromSocket(client, dto);
  }

  @SubscribeMessage("send_message")
  sendLegacy(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: SocketSendMessageDto,
  ) {
    return this.sendFromSocket(client, dto);
  }

  @SubscribeMessage("message:read")
  read(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: ConversationEventDto,
  ) {
    return this.readFromSocket(client, dto);
  }

  @SubscribeMessage("typing:start")
  typingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: ConversationEventDto,
  ) {
    return this.setTyping(client, dto, true);
  }

  @SubscribeMessage("typing:stop")
  typingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: ConversationEventDto,
  ) {
    return this.setTyping(client, dto, false);
  }

  @SubscribeMessage("typing")
  typingLegacy(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: ConversationEventDto,
  ) {
    return this.setTyping(client, dto, true);
  }

  async publishMessage(delivery: ChatDelivery) {
    const conversationId = String(delivery.data.conversationId);
    const target = this.targetRooms(conversationId, delivery.participantIds);
    target.emit("message:new", delivery.data);
    target.emit("new_message", delivery.data);

    const recipientSockets = await Promise.all(
      delivery.recipientIds.map((id) =>
        this.server.in(this.userRoom(id)).fetchSockets(),
      ),
    );
    if (!recipientSockets.some((sockets) => sockets.length)) return;

    const delivered = await this.chat.markDelivered(String(delivery.data.id));
    if (delivered) {
      const receipt = {
        conversationId,
        messageId: delivered.id,
        deliveredAt: delivered.deliveredAt,
      };
      target.emit("message:delivered", receipt);
      target.emit("message_delivered", receipt);
    }
  }

  publishReadReceipt(receipt: ReadReceipt) {
    const target = this.targetRooms(
      receipt.conversationId,
      receipt.participantIds,
    );
    target.emit("message:read", receipt);
    target.emit("message_read", receipt);
  }

  publishClosed(conversationId: string, participantIds: string[]) {
    this.targetRooms(conversationId, participantIds).emit(
      "conversation:closed",
      { conversationId },
    );
  }

  private async joinConversation(
    client: AuthenticatedSocket,
    dto: ConversationEventDto,
  ) {
    try {
      const actor = this.actor(client);
      await this.chat.requireParticipantIds(actor, dto.conversationId);
      await client.join(this.conversationRoom(dto.conversationId));
      const messageIds = await this.chat.markConversationDelivered(
        actor,
        dto.conversationId,
      );
      if (messageIds.length) {
        client
          .to(this.conversationRoom(dto.conversationId))
          .emit("message:delivered", {
            conversationId: dto.conversationId,
            messageIds,
          });
      }
      return { conversationId: dto.conversationId, joined: true };
    } catch (error) {
      throw this.wsError(error);
    }
  }

  private async leaveConversation(
    client: AuthenticatedSocket,
    dto: ConversationEventDto,
  ) {
    try {
      const actor = this.actor(client);
      await this.chat.requireParticipantIds(actor, dto.conversationId);
      await client.leave(this.conversationRoom(dto.conversationId));
      return { conversationId: dto.conversationId, joined: false };
    } catch (error) {
      throw this.wsError(error);
    }
  }

  private async sendFromSocket(
    client: AuthenticatedSocket,
    dto: SocketSendMessageDto,
  ) {
    try {
      const { conversationId, ...message } = dto;
      const delivery = await this.chat.sendMessage(
        this.actor(client),
        conversationId,
        message,
      );
      await this.publishMessage(delivery);
      return delivery.data;
    } catch (error) {
      throw this.wsError(error);
    }
  }

  private async readFromSocket(
    client: AuthenticatedSocket,
    dto: ConversationEventDto,
  ) {
    try {
      const receipt = await this.chat.markRead(
        this.actor(client),
        dto.conversationId,
      );
      this.publishReadReceipt(receipt);
      return receipt;
    } catch (error) {
      throw this.wsError(error);
    }
  }

  private async setTyping(
    client: AuthenticatedSocket,
    dto: ConversationEventDto,
    isTyping: boolean,
  ) {
    try {
      const actor = this.actor(client);
      await this.chat.requireParticipantIds(actor, dto.conversationId);
      await client.join(this.conversationRoom(dto.conversationId));
      const payload = {
        conversationId: dto.conversationId,
        userId: actor.sub,
        isTyping,
      };
      client
        .to(this.conversationRoom(dto.conversationId))
        .emit("typing:user", payload);
      client
        .to(this.conversationRoom(dto.conversationId))
        .emit("user_typing", payload);
      return payload;
    } catch (error) {
      throw this.wsError(error);
    }
  }

  private targetRooms(conversationId: string, participantIds: string[]) {
    let target = this.server.to(this.conversationRoom(conversationId));
    for (const id of participantIds) target = target.to(this.userRoom(id));
    return target;
  }

  private actor(client: AuthenticatedSocket) {
    if (!client.data.actor) throw new WsException("Authentication required");
    return client.data.actor;
  }

  private tokenFrom(client: Socket) {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === "string" && authToken) return authToken;
    const [type, token] =
      client.handshake.headers.authorization?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }

  private conversationRoom(id: string) {
    return `conversation:${id}`;
  }

  private userRoom(id: string) {
    return `user:${id}`;
  }

  private wsError(error: unknown) {
    return error instanceof WsException
      ? error
      : new WsException(error instanceof Error ? error.message : "Chat error");
  }
}
