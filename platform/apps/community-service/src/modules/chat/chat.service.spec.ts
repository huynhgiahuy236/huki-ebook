import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { Types } from "mongoose";
import { ConversationSchema } from "../../entities/conversation.schema";
import { MessageSchema } from "../../entities/message.schema";
import { ChatGateway } from "./chat.gateway";
import { ChatService } from "./chat.service";

describe("Sprint 13 chat", () => {
  const conversations = {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
  };
  const messages = {
    create: jest.fn(),
    deleteOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    updateMany: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };
  const eventBus = { publish: jest.fn() };
  const service = new ChatService(
    conversations as any,
    messages as any,
    eventBus as any,
  );
  const actor = {
    sub: "e54bb88f-55a8-4e0a-ad9e-a4d6e456f95c",
    email: "reader@example.com",
    fullName: "Reader",
    role: "USER",
  };
  const storeId = "227694ad-1032-4c02-a29e-9013989a38bb";

  beforeEach(() => jest.clearAllMocks());

  it("stores cross-service participant and sender ids as strings", () => {
    expect(ConversationSchema.path("participants").instance).toBe("Array");
    expect(MessageSchema.path("senderId").instance).toBe("String");
    expect(MessageSchema.path("conversationId").instance).toBe("ObjectId");
  });

  it("defines the documented conversation and message indexes", () => {
    expect(ConversationSchema.indexes()).toEqual(
      expect.arrayContaining([
        [{ "participants.id": 1, updatedAt: -1 }, expect.any(Object)],
      ]),
    );
    expect(MessageSchema.indexes()).toEqual(
      expect.arrayContaining([
        [{ conversationId: 1, createdAt: -1 }, expect.any(Object)],
      ]),
    );
  });

  it("returns an existing conversation instead of creating a duplicate", async () => {
    const existing = conversationDocument();
    conversations.findOne.mockResolvedValue(existing);

    const result = await service.createConversation(actor, {
      storeId,
      contextType: "BOOK",
      contextId: "5df99662-98e4-4688-807e-c1be350f4d42",
      initialMessage: "Is this book available?",
    });

    expect(result.message).toBe("Conversation already exists");
    expect(conversations.create).not.toHaveBeenCalled();
    expect(messages.create).not.toHaveBeenCalled();
  });

  it("atomically updates last message and recipient unread count", async () => {
    const conversation = conversationDocument();
    jest
      .spyOn(service as any, "requireConversation")
      .mockResolvedValue(conversation);
    const message = messageDocument(conversation._id);
    messages.create.mockResolvedValue(message);
    conversations.updateOne.mockResolvedValue({ matchedCount: 1 });
    eventBus.publish.mockResolvedValue(undefined);

    const delivery = await service.sendMessage(actor, conversation.id, {
      content: "Hello store",
      messageType: "TEXT",
    });

    expect(delivery.recipientIds).toEqual([storeId]);
    expect(conversations.updateOne).toHaveBeenCalledWith(
      { _id: conversation._id, status: "ACTIVE" },
      expect.objectContaining({
        $set: expect.objectContaining({
          lastMessage: expect.objectContaining({ senderId: actor.sub }),
        }),
        $inc: { [`unreadCount.${storeId}`]: 1 },
      }),
    );
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "chat.message.sent" }),
    );
  });

  it("does not allow messages in a closed conversation", async () => {
    jest
      .spyOn(service as any, "requireConversation")
      .mockResolvedValue(conversationDocument("CLOSED"));
    await expect(
      service.sendMessage(actor, new Types.ObjectId().toString(), {
        content: "Hello",
        messageType: "TEXT",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("marks incoming messages read and resets only the reader counter", async () => {
    const conversation = conversationDocument();
    jest
      .spyOn(service as any, "requireConversation")
      .mockResolvedValue(conversation);
    const first = {
      _id: new Types.ObjectId(),
      id: new Types.ObjectId().toString(),
    };
    const findChain = {
      select: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([first]),
    };
    messages.find.mockReturnValue(findChain);
    messages.updateMany.mockResolvedValue({ modifiedCount: 1 });
    conversations.updateOne.mockResolvedValue({ modifiedCount: 1 });

    const receipt = await service.markRead(actor, conversation.id);

    expect(receipt.messageIds).toHaveLength(1);
    expect(messages.updateMany).toHaveBeenCalledWith(
      { _id: { $in: [first._id] } },
      expect.objectContaining({
        $set: expect.objectContaining({ status: "READ" }),
      }),
    );
    expect(conversations.updateOne).toHaveBeenCalledWith(
      { _id: conversation._id },
      { $set: { [`unreadCount.${actor.sub}`]: 0 } },
    );
  });

  it("rejects an actor who is not a conversation participant", () => {
    expect(() =>
      (service as any).participant(conversationDocument(), "outsider"),
    ).toThrow(ForbiddenException);
  });

  it("publishes realtime messages and delivery receipts to participant rooms", async () => {
    const target = { emit: jest.fn(), to: jest.fn() };
    target.to.mockReturnValue(target);
    const server = {
      to: jest.fn().mockReturnValue(target),
      in: jest.fn().mockReturnValue({
        fetchSockets: jest.fn().mockResolvedValue([{}]),
      }),
    };
    const gatewayChat = {
      markDelivered: jest.fn().mockResolvedValue({
        id: "message-id",
        deliveredAt: new Date(),
      }),
    };
    const gateway = new ChatGateway({} as any, gatewayChat as any);
    (gateway as any).server = server;

    await gateway.publishMessage({
      data: {
        id: "message-id",
        conversationId: new Types.ObjectId().toString(),
      },
      participantIds: [actor.sub, storeId],
      recipientIds: [storeId],
    });

    expect(target.emit).toHaveBeenCalledWith(
      "message:new",
      expect.objectContaining({ id: "message-id" }),
    );
    expect(target.emit).toHaveBeenCalledWith(
      "message:delivered",
      expect.objectContaining({ messageId: "message-id" }),
    );
  });

  function conversationDocument(status: "ACTIVE" | "CLOSED" = "ACTIVE") {
    const id = new Types.ObjectId();
    return {
      _id: id,
      id: id.toString(),
      type: "USER_TO_STORE",
      status,
      participants: [
        { type: "USER", id: actor.sub, name: "Reader" },
        { type: "BUSINESS", id: storeId, name: "Store" },
      ],
      context: {
        type: "BOOK",
        id: "5df99662-98e4-4688-807e-c1be350f4d42",
      },
      unreadCount: new Map([
        [actor.sub, 0],
        [storeId, 0],
      ]),
      createdAt: new Date(),
      updatedAt: new Date(),
      save: jest.fn(),
    };
  }

  function messageDocument(conversationId: Types.ObjectId) {
    const id = new Types.ObjectId();
    return {
      _id: id,
      id: id.toString(),
      conversationId,
      senderType: "USER",
      senderId: actor.sub,
      senderName: "Reader",
      content: "Hello store",
      messageType: "TEXT",
      attachments: [],
      status: "SENT",
      readBy: [actor.sub],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
});
