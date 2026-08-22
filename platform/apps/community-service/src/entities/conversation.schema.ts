import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongooseSchema, Types } from "mongoose";

export const CONVERSATION_TYPES = ["USER_TO_STORE"] as const;
export const CONVERSATION_STATUSES = ["ACTIVE", "CLOSED"] as const;
export const PARTICIPANT_TYPES = ["USER", "BUSINESS"] as const;
export const CHAT_CONTEXT_TYPES = ["BOOK", "ORDER"] as const;

export type ConversationType = (typeof CONVERSATION_TYPES)[number];
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];
export type ParticipantType = (typeof PARTICIPANT_TYPES)[number];
export type ChatContextType = (typeof CHAT_CONTEXT_TYPES)[number];

@Schema({ _id: false })
export class ConversationParticipant {
  @Prop({ required: true, type: String, enum: PARTICIPANT_TYPES })
  type!: ParticipantType;

  @Prop({ required: true, type: String })
  id!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop()
  avatar?: string;
}

export const ConversationParticipantSchema = SchemaFactory.createForClass(
  ConversationParticipant,
);

@Schema({ _id: false })
export class ConversationContext {
  @Prop({ required: true, type: String, enum: CHAT_CONTEXT_TYPES })
  type!: ChatContextType;

  @Prop({ required: true, type: String })
  id!: string;
}

export const ConversationContextSchema =
  SchemaFactory.createForClass(ConversationContext);

@Schema({ _id: false })
export class ConversationLastMessage {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "Message",
    required: true,
  })
  id!: Types.ObjectId;

  @Prop({ required: true })
  content!: string;

  @Prop({ required: true, type: String, enum: PARTICIPANT_TYPES })
  senderType!: ParticipantType;

  @Prop({ required: true, type: String })
  senderId!: string;

  @Prop({ required: true })
  createdAt!: Date;
}

export const ConversationLastMessageSchema = SchemaFactory.createForClass(
  ConversationLastMessage,
);

export type ConversationDocument = HydratedDocument<Conversation>;

@Schema({ timestamps: true, collection: "conversations" })
export class Conversation {
  @Prop({
    type: [ConversationParticipantSchema],
    required: true,
    validate: {
      validator: (participants: ConversationParticipant[]) =>
        participants.length === 2,
      message: "A conversation must have exactly two participants",
    },
  })
  participants!: ConversationParticipant[];

  @Prop({ required: true, type: String, enum: CONVERSATION_TYPES })
  type!: ConversationType;

  @Prop({ type: ConversationContextSchema, required: true })
  context!: ConversationContext;

  @Prop({ type: String, enum: CONVERSATION_STATUSES, default: "ACTIVE" })
  status!: ConversationStatus;

  @Prop({ type: ConversationLastMessageSchema })
  lastMessage?: ConversationLastMessage;

  @Prop({ type: Map, of: Number, default: () => ({}) })
  unreadCount!: Map<string, number>;

  createdAt!: Date;
  updatedAt!: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

ConversationSchema.index({ "participants.id": 1, status: 1 });
ConversationSchema.index({ "participants.id": 1, updatedAt: -1 });
ConversationSchema.index({ type: 1, status: 1 });
ConversationSchema.index({
  "participants.id": 1,
  "context.type": 1,
  "context.id": 1,
});
