import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ required: true, index: true })
  recipientId: string;

  @Prop({ required: true, unique: true })
  sourceKey: string;

  @Prop({ enum: ['USER', 'BUSINESS', 'DELIVERY', 'ADMIN'], default: 'USER' })
  recipientType: string;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ type: Object })
  payload: Record<string, any>;

  @Prop({ default: false })
  isRead: boolean;

  @Prop()
  readAt: Date;

  @Prop()
  expiresAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// TTL index for auto-delete expired notifications
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
NotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
