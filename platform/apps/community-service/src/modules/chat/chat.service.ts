import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Model, Types } from "mongoose";
import { RabbitMqEventBus } from "../../../../../libs/shared/src";
import { CommunityActor } from "../../common/community-auth.guard";
import {
  Conversation,
  ConversationDocument,
  ConversationParticipant,
} from "../../entities/conversation.schema";
import { Message, MessageDocument } from "../../entities/message.schema";
import {
  ChatPaginationDto,
  CreateConversationDto,
  SendMessageDto,
} from "./dto/chat.dto";

export interface ChatDelivery {
  data: Record<string, unknown>;
  participantIds: string[];
  recipientIds: string[];
}

export interface ReadReceipt {
  conversationId: string;
  readerId: string;
  messageIds: string[];
  readAt: string;
  participantIds: string[];
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectModel(Conversation.name)
    private readonly conversations: Model<ConversationDocument>,
    @InjectModel(Message.name)
    private readonly messages: Model<MessageDocument>,
    private readonly eventBus: RabbitMqEventBus,
  ) {}

  async listConversations(actor: CommunityActor) {
    const conversations = await this.conversations
      .find({ "participants.id": actor.sub })
      .sort({ updatedAt: -1 })
      .limit(100)
      .exec();

    return {
      data: conversations.map((item) => this.conversationView(item, actor.sub)),
    };
  }

  async getConversation(
    actor: CommunityActor,
    conversationId: string,
    query: ChatPaginationDto,
  ) {
    const conversation = await this.requireConversation(
      conversationId,
      actor.sub,
    );
    const result = await this.messagePage(conversationId, query);
    return {
      data: {
        ...this.conversationView(conversation, actor.sub),
        messages: result.data,
        pagination: result.pagination,
      },
    };
  }

  async getMessages(
    actor: CommunityActor,
    conversationId: string,
    query: ChatPaginationDto,
  ) {
    await this.requireConversation(conversationId, actor.sub);
    return this.messagePage(conversationId, query);
  }

  async createConversation(actor: CommunityActor, dto: CreateConversationDto) {
    if (actor.role !== "USER") {
      throw new ForbiddenException(
        "Only customers can start a store conversation",
      );
    }
    if (actor.sub === dto.storeId) {
      throw new BadRequestException(
        "Conversation participants must be different",
      );
    }

    const existing = await this.conversations.findOne({
      type: "USER_TO_STORE",
      "context.type": dto.contextType,
      "context.id": dto.contextId,
      participants: {
        $all: [
          { $elemMatch: { type: "USER", id: actor.sub } },
          { $elemMatch: { type: "BUSINESS", id: dto.storeId } },
        ],
      },
    });

    if (existing) {
      return {
        message: "Conversation already exists",
        data: this.conversationView(existing, actor.sub),
      };
    }

    const participants: ConversationParticipant[] = [
      {
        type: "USER",
        id: actor.sub,
        name: this.actorName(actor),
        avatar: actor.avatar,
      },
      { type: "BUSINESS", id: dto.storeId, name: "Store" },
    ];
    const conversation = await this.conversations.create({
      participants,
      type: "USER_TO_STORE",
      context: { type: dto.contextType, id: dto.contextId },
      unreadCount: { [actor.sub]: 0, [dto.storeId]: 0 },
    });
    const delivery = await this.sendMessage(actor, conversation.id, {
      content: dto.initialMessage,
      messageType: "TEXT",
    });

    return {
      message: "Conversation created",
      data: {
        ...this.conversationView(conversation, actor.sub),
        messages: [delivery.data],
      },
      delivery,
    };
  }

  async sendMessage(
    actor: CommunityActor,
    conversationId: string,
    dto: SendMessageDto,
  ): Promise<ChatDelivery> {
    this.validateAttachments(dto);
    const conversation = await this.ensureWritable(actor, conversationId);

    const sender = this.participant(conversation, actor.sub);
    const recipientIds = conversation.participants
      .filter((item) => item.id !== actor.sub)
      .map((item) => item.id);
    const message = await this.messages.create({
      conversationId: conversation._id,
      senderType: sender.type,
      senderId: actor.sub,
      senderName: this.actorName(actor, sender.name),
      senderAvatar: actor.avatar ?? sender.avatar,
      content: dto.content.trim(),
      messageType: dto.messageType ?? "TEXT",
      attachments: dto.attachments ?? [],
      status: "SENT",
      readBy: [actor.sub],
    });

    const unreadIncrement = Object.fromEntries(
      recipientIds.map((id) => [`unreadCount.${this.safeMapKey(id)}`, 1]),
    );
    const update = await this.conversations.updateOne(
      { _id: conversation._id, status: "ACTIVE" },
      {
        $set: {
          lastMessage: {
            id: message._id,
            content: message.content,
            senderType: message.senderType,
            senderId: message.senderId,
            createdAt: message.createdAt,
          },
        },
        ...(recipientIds.length ? { $inc: unreadIncrement } : {}),
      },
    );
    if (!update.matchedCount) {
      await this.messages.deleteOne({ _id: message._id });
      throw new BadRequestException("Conversation is closed");
    }

    const data = this.messageView(message);
    void this.publishMessageEvent(data, conversation, recipientIds);
    return {
      data,
      participantIds: conversation.participants.map((item) => item.id),
      recipientIds,
    };
  }

  async closeConversation(actor: CommunityActor, conversationId: string) {
    const conversation = await this.requireConversation(
      conversationId,
      actor.sub,
    );
    if (conversation.status !== "CLOSED") {
      conversation.status = "CLOSED";
      await conversation.save();
    }
    return { message: "Conversation closed" };
  }

  async markRead(
    actor: CommunityActor,
    conversationId: string,
  ): Promise<ReadReceipt> {
    const conversation = await this.requireConversation(
      conversationId,
      actor.sub,
    );
    const unread = await this.messages
      .find({
        conversationId: conversation._id,
        senderId: { $ne: actor.sub },
        status: { $ne: "READ" },
      })
      .select("_id")
      .exec();
    const messageIds = unread.map((message) => message.id);
    const readAt = new Date();

    if (messageIds.length) {
      await this.messages.updateMany(
        { _id: { $in: unread.map((message) => message._id) } },
        {
          $set: { status: "READ", readAt },
          $addToSet: { readBy: actor.sub },
        },
      );
    }
    await this.conversations.updateOne(
      { _id: conversation._id },
      { $set: { [`unreadCount.${this.safeMapKey(actor.sub)}`]: 0 } },
    );

    return {
      conversationId,
      readerId: actor.sub,
      messageIds,
      readAt: readAt.toISOString(),
      participantIds: conversation.participants.map((item) => item.id),
    };
  }

  async markDelivered(messageId: string) {
    if (!Types.ObjectId.isValid(messageId)) return null;
    const deliveredAt = new Date();
    const message = await this.messages.findOneAndUpdate(
      { _id: messageId, status: "SENT" },
      { $set: { status: "DELIVERED", deliveredAt } },
      { new: true },
    );
    return message ? this.messageView(message) : null;
  }

  async markConversationDelivered(
    actor: CommunityActor,
    conversationId: string,
  ) {
    const conversation = await this.requireConversation(
      conversationId,
      actor.sub,
    );
    const pending = await this.messages
      .find({
        conversationId: conversation._id,
        senderId: { $ne: actor.sub },
        status: "SENT",
      })
      .select("_id")
      .exec();
    if (!pending.length) return [];
    const deliveredAt = new Date();
    await this.messages.updateMany(
      { _id: { $in: pending.map((message) => message._id) } },
      { $set: { status: "DELIVERED", deliveredAt } },
    );
    return pending.map((message) => message.id);
  }

  async requireParticipantIds(actor: CommunityActor, conversationId: string) {
    const conversation = await this.requireConversation(
      conversationId,
      actor.sub,
    );
    return conversation.participants.map((item) => item.id);
  }

  async ensureWritable(actor: CommunityActor, conversationId: string) {
    const conversation = await this.requireConversation(
      conversationId,
      actor.sub,
    );
    if (conversation.status !== "ACTIVE") {
      throw new BadRequestException("Conversation is closed");
    }
    return conversation;
  }

  private async requireConversation(id: string, actorId: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException("Conversation not found");
    }
    const conversation = await this.conversations.findById(id);
    if (!conversation) throw new NotFoundException("Conversation not found");
    this.participant(conversation, actorId);
    return conversation;
  }

  private participant(conversation: ConversationDocument, actorId: string) {
    const participant = conversation.participants.find(
      (item) => item.id === actorId,
    );
    if (!participant) {
      throw new ForbiddenException(
        "You are not a participant of this conversation",
      );
    }
    return participant;
  }

  private async messagePage(id: string, query: ChatPaginationDto) {
    const filter = { conversationId: new Types.ObjectId(id) };
    const [messages, total] = await Promise.all([
      this.messages
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .exec(),
      this.messages.countDocuments(filter),
    ]);
    return {
      data: messages.reverse().map((message) => this.messageView(message)),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        hasNext: query.page * query.limit < total,
      },
    };
  }

  private conversationView(
    conversation: ConversationDocument,
    actorId: string,
  ) {
    const user = conversation.participants.find((item) => item.type === "USER");
    const store = conversation.participants.find(
      (item) => item.type === "BUSINESS",
    );
    return {
      id: conversation.id,
      type: conversation.type,
      user: user
        ? { id: user.id, fullName: user.name, avatar: user.avatar }
        : null,
      store: store
        ? { id: store.id, name: store.name, logo: store.avatar }
        : null,
      lastMessage: conversation.lastMessage
        ? {
            id: String(conversation.lastMessage.id),
            content: conversation.lastMessage.content,
            senderType: conversation.lastMessage.senderType,
            senderId: conversation.lastMessage.senderId,
            createdAt: conversation.lastMessage.createdAt,
          }
        : null,
      unreadCount: this.unreadFor(conversation, actorId),
      context: conversation.context,
      status: conversation.status,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  }

  private messageView(message: MessageDocument): Record<string, unknown> {
    return {
      id: message.id,
      conversationId: String(message.conversationId),
      senderType: message.senderType,
      senderId: message.senderId,
      senderName: message.senderName,
      senderAvatar: message.senderAvatar,
      content: message.content,
      messageType: message.messageType,
      attachments: message.attachments,
      status: message.status,
      readBy: message.readBy,
      deliveredAt: message.deliveredAt,
      readAt: message.readAt,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }

  private unreadFor(conversation: ConversationDocument, actorId: string) {
    if (conversation.unreadCount instanceof Map) {
      return conversation.unreadCount.get(actorId) ?? 0;
    }
    return Number(
      (conversation.unreadCount as unknown as Record<string, number>)?.[
        actorId
      ] ?? 0,
    );
  }

  private validateAttachments(dto: SendMessageDto) {
    const attachments = dto.attachments ?? [];
    if (
      dto.messageType === "IMAGE" &&
      !attachments.some((item) => item.type === "IMAGE")
    ) {
      throw new BadRequestException(
        "IMAGE messages require an image attachment",
      );
    }
    if (
      dto.messageType === "FILE" &&
      !attachments.some((item) => item.type === "FILE")
    ) {
      throw new BadRequestException("FILE messages require a file attachment");
    }
  }

  private actorName(actor: CommunityActor, fallback?: string) {
    return actor.fullName?.trim() || actor.email || fallback || "HUKI user";
  }

  private safeMapKey(id: string) {
    if (id.includes(".") || id.includes("$")) {
      throw new BadRequestException("Invalid participant identifier");
    }
    return id;
  }

  private async publishMessageEvent(
    message: Record<string, unknown>,
    conversation: ConversationDocument,
    recipientIds: string[],
  ) {
    try {
      await this.eventBus.publish({
        eventId: randomUUID(),
        eventType: "chat.message.sent",
        occurredAt: new Date().toISOString(),
        producer: "community-service",
        version: 1,
        aggregateId: conversation.id,
        payload: {
          conversationId: conversation.id,
          recipientIds,
          message,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Could not publish chat.message.sent: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
