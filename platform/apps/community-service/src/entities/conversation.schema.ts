import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ConversationDocument = Conversation & Document;

@Schema()
export class Participant {
  @Prop({ required: true, enum: ['USER', 'BUSINESS'] })
  type: string;

  @Prop({ type: Types.ObjectId, required: true })
  id: Types.ObjectId;
}

@Schema()
export class LastMessage {
  @Prop()
  id: string;

  @Prop()
  content: string;

  @Prop({ enum: ['USER', 'BUSINESS'] })
  senderType: string;

  @Prop()
  createdAt: Date;
}

@Schema()
export class UnreadCount {
  @Prop({ default: 0 })
  USER: number;

  @Prop({ default: 0 })
  BUSINESS: number;
}

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ type: [Participant], required: true })
  participants: Participant[];

  @Prop({ enum: ['USER_TO_STORE'], default: 'USER_TO_STORE' })
  type: string;

  @Prop({ type: Object })
  context: {
    type: string;
    id: Types.ObjectId;
  };

  @Prop({ enum: ['ACTIVE', 'CLOSED'], default: 'ACTIVE' })
  status: string;

  @Prop({ type: LastMessage })
  lastMessage: LastMessage;

  @Prop({ type: UnreadCount, default: { USER: 0, BUSINESS: 0 } })
  unreadCount: UnreadCount;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
