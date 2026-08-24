# Chat Flow

## Overview

Real-time chat giữa buyer và seller (business).

## Flow Diagram

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Open   │───▶│ Get or  │───▶│ Check   │───▶│ Return  │
│  Chat   │    │ Create  │    │ Blocked │    │ History │
│         │    │ Conv.   │    │         │    │         │
└──────────┘    └────┬─────┘    └────┬─────┘    └──────────┘
                      │              │
                      ▼              ▼
                ┌──────────┐   ┌──────────┐
                │ Not     │   │ Blocked  │
                │ Blocked │   │ Return   │
                │ Proceed │   │ Error    │
                └────┬─────┘   └──────────┘
                     │
                     ▼
              ┌──────────┐    ┌──────────┐    ┌──────────┐
              │ Send     │───▶│ Validate │───▶│ Save to  │
              │ Message  │    │ Content  │    │ DB       │
              └──────────┘    └──────────┘    └────┬─────┘
                                                    │
                         ┌──────────────────────────┼──────────────────────────┐
                         │                          │                          │
                         ▼                          ▼                          ▼
                   ┌──────────┐              ┌──────────┐              ┌──────────┐
                   │ Emit to │              │ Emit to │              │ Emit to │
                   │ Sender  │              │ Receiver│              │ Seller  │
                   │ (Socket)│              │ (Socket)│              │ (Socket)│
                   └──────────┘              └──────────┘              └──────────┘
```

## Process

### 1. Get or Create Conversation

```typescript
async getOrCreateConversation(userId: string, partnerId: string) {
  // 1. Check if business is suspended
  const business = await this.prisma.business.findFirst({
    where: { ownerId: partnerId }
  });
  if (business?.status === 'SUSPENDED') {
    throwForbidden(ErrorCode.CHAT_BUSINESS_SUSPENDED);
  }

  // 2. Check if blocked
  const blocked = await this.prisma.chatBlock.findFirst({
    where: {
      OR: [
        { blockerId: userId, blockedId: partnerId },
        { blockerId: partnerId, blockedId: userId },
      ],
    },
  });
  if (blocked) {
    throwForbidden(ErrorCode.CHAT_BLOCKED);
  }

  // 3. Find existing conversation
  let conversation = await this.prisma.conversation.findFirst({
    where: {
      type: 'DIRECT',
      AND: [
        { participants: { some: { userId } } },
        { participants: { some: { userId: partnerId } } },
      ],
    },
    include: { participants: true },
  });

  // 4. Create if not exists
  if (!conversation) {
    conversation = await this.prisma.conversation.create({
      data: {
        type: 'DIRECT',
        participants: {
          create: [
            { userId },
            { userId: partnerId },
          ],
        },
      },
      include: { participants: true },
    });
  }

  return conversation;
}
```

### 2. Send Message

```typescript
async sendMessage(senderId: string, dto: SendMessageDto) {
  // 1. Validate conversation access
  const participant = await this.prisma.conversationParticipant.findFirst({
    where: {
      conversationId: dto.conversationId,
      userId: senderId,
    },
  });
  if (!participant) {
    throwForbidden(ErrorCode.CHAT_CONVERSATION_NOT_FOUND);
  }

  // 2. Check blocked
  const otherParticipant = await this.prisma.conversationParticipant.findFirst({
    where: {
      conversationId: dto.conversationId,
      userId: { not: senderId },
    },
  });
  const blocked = await this.prisma.chatBlock.findFirst({
    where: {
      OR: [
        { blockerId: senderId, blockedId: otherParticipant.userId },
        { blockerId: otherParticipant.userId, blockedId: senderId },
      ],
    },
  });
  if (blocked) {
    throwForbidden(ErrorCode.CHAT_BLOCKED);
  }

  // 3. Validate content
  if (!dto.content?.trim()) {
    throwBadRequest(ErrorCode.VALIDATION_REQUIRED, 'Nội dung tin nhắn bắt buộc');
  }
  if (dto.content.length > 2000) {
    throwBadRequest(ErrorCode.CHAT_MESSAGE_TOO_LONG);
  }

  // 4. Create message
  const message = await this.prisma.message.create({
    data: {
      conversationId: dto.conversationId,
      senderId,
      content: dto.content.trim(),
    },
    include: { sender: { select: { id: true, fullName: true, avatar: true } } },
  });

  // 5. Publish event for notification
  await this.eventBus.publish({
    type: 'chat.message.sent',
    payload: {
      conversationId: dto.conversationId,
      senderId,
      senderName: message.sender.fullName,
      recipients: [otherParticipant.userId],
      message: {
        id: message.id,
        content: message.content,
        senderName: message.sender.fullName,
      },
    },
  });

  // 6. Emit via Socket.IO (if connected)
  this.socketService.emitToUser(otherParticipant.userId, 'newMessage', message);

  return message;
}
```

### 3. Get Conversation Messages

```typescript
async getMessages(userId: string, conversationId: string, dto: PaginationDto) {
  // 1. Verify access
  const participant = await this.prisma.conversationParticipant.findFirst({
    where: { conversationId, userId },
  });
  if (!participant) {
    throwNotFound(ErrorCode.CHAT_CONVERSATION_NOT_FOUND);
  }

  // 2. Get messages
  const [messages, total] = await this.prisma.$transaction([
    this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      skip: (dto.page - 1) * dto.limit,
      take: dto.limit,
      include: {
        sender: { select: { id: true, fullName: true, avatar: true } },
      },
    }),
    this.prisma.message.count({ where: { conversationId } }),
  ]);

  return {
    messages: messages.reverse(), // Oldest first
    pagination: {
      page: dto.page,
      limit: dto.limit,
      total,
      totalPages: Math.ceil(total / dto.limit),
    },
  };
}
```

## Block/Unblock Flow

```typescript
// Block user
async blockUser(blockerId: string, blockedId: string) {
  await this.prisma.chatBlock.create({
    data: { blockerId, blockedId },
  });
}

// Unblock user
async unblockUser(blockerId: string, blockedId: string) {
  await this.prisma.chatBlock.delete({
    where: {
      blockerId_blockedId: { blockerId, blockedId },
    },
  });
}
```

## Error Codes

| Code | Scenario |
|------|----------|
| CHAT_CONVERSATION_NOT_FOUND | Conversation doesn't exist |
| CHAT_MESSAGE_NOT_FOUND | Message doesn't exist |
| CHAT_BLOCKED | One user blocked the other |
| CHAT_BUSINESS_SUSPENDED | Seller's business is suspended |
| CHAT_MESSAGE_TOO_LONG | Message exceeds 2000 chars |

## Socket Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `newMessage` | Server → Client | Message object |
| `messageRead` | Client → Server | { messageId } |
| `typing` | Client ↔ Server | { conversationId, userId } |
| `userOnline` | Server → Client | { userId } |

## Key Files

| File | Description |
|------|-------------|
| `community-service/.../chat.service.ts` | Chat logic |
| `community-service/.../chat.controller.ts` | Chat API |
| `community-service/.../chat.gateway.ts` | Socket.IO gateway |
