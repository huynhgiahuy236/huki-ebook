import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongooseSchema, Types } from "mongoose";
import { PARTICIPANT_TYPES, ParticipantType } from "./conversation.schema";

export const MESSAGE_TYPES = [
  "TEXT",
  "IMAGE",
  "FILE",
  "ORDER",
  "BOOK",
  "SYSTEM",
] as const;
export const MESSAGE_STATUSES = ["SENT", "DELIVERED", "READ"] as const;
export const ATTACHMENT_TYPES = ["IMAGE", "FILE"] as const;

export type MessageType = (typeof MESSAGE_TYPES)[number];
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];
export type AttachmentType = (typeof ATTACHMENT_TYPES)[number];

@Schema({ _id: false })
export class MessageAttachment {
  @Prop({ required: true, type: String, enum: ATTACHMENT_TYPES })
  type!: AttachmentType;

  @Prop({ required: true })
  url!: string;

  @Prop()
  name?: string;

  @Prop()
  thumbnail?: string;

  @Prop({ min: 0 })
  size?: number;
}

export const MessageAttachmentSchema =
  SchemaFactory.createForClass(MessageAttachment);

export type MessageDocument = HydratedDocument<Message>;

@Schema({ timestamps: true, collection: "messages" })
export class Message {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "Conversation",
    required: true,
  })
  conversationId!: Types.ObjectId;

  @Prop({ required: true, type: String, enum: PARTICIPANT_TYPES })
  senderType!: ParticipantType;

  @Prop({ required: true, type: String })
  senderId!: string;

  @Prop({ required: true, trim: true })
  senderName!: string;

  @Prop()
  senderAvatar?: string;

  @Prop({ required: true, trim: true, maxlength: 10_000 })
  content!: string;

  @Prop({
    required: true,
    type: String,
    enum: MESSAGE_TYPES,
    default: "TEXT",
  })
  messageType!: MessageType;

  @Prop({ type: [MessageAttachmentSchema], default: [] })
  attachments!: MessageAttachment[];

  @Prop({
    required: true,
    type: String,
    enum: MESSAGE_STATUSES,
    default: "SENT",
  })
  status!: MessageStatus;

  @Prop({ type: [String], default: [] })
  readBy!: string[];

  @Prop()
  deliveredAt?: Date;

  @Prop()
  readAt?: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1, createdAt: -1 });
MessageSchema.index({ conversationId: 1, status: 1, createdAt: -1 });
