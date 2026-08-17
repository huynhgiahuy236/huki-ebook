import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema()
export class Attachment {
  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  url: string;

  @Prop()
  thumbnail: string;

  @Prop()
  size: number;
}

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true })
  conversationId: Types.ObjectId;

  @Prop({ enum: ['USER', 'BUSINESS'], required: true })
  senderType: string;

  @Prop({ type: Types.ObjectId, required: true })
  senderId: Types.ObjectId;

  @Prop({ required: true })
  senderName: string;

  @Prop({ required: true })
  content: string;

  @Prop({ enum: ['TEXT', 'IMAGE', 'FILE', 'ORDER', 'BOOK', 'SYSTEM'], default: 'TEXT' })
  messageType: string;

  @Prop({ type: [Attachment], default: [] })
  attachments: Attachment[];

  @Prop({ enum: ['SENT', 'DELIVERED', 'READ'], default: 'SENT' })
  status: string;

  @Prop()
  deliveredAt: Date;

  @Prop()
  readAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
