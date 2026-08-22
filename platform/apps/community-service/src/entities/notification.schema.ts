import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export const NOTIFICATION_RECIPIENT_TYPES = [
  "USER",
  "BUSINESS",
  "DELIVERY",
  "ADMIN",
] as const;
export const NOTIFICATION_TYPES = [
  "ORDER_STATUS",
  "ORDER_MESSAGE",
  "PAYMENT_SUCCESS",
  "PAYMENT_FAILED",
  "SHIPPING_UPDATE",
  "NEW_REVIEW",
  "NEW_REPLY",
  "NEW_MESSAGE",
  "VOUCHER_EXPIRING",
  "VOUCHER_NEW",
  "FORUM_MENTION",
  "SYSTEM",
  "BOOK_ACCESS",
] as const;

export type NotificationRecipientType =
  (typeof NOTIFICATION_RECIPIENT_TYPES)[number];
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type NotificationDocument = HydratedDocument<Notification>;

@Schema({ timestamps: true, collection: "notifications" })
export class Notification {
  @Prop({ required: true, type: String })
  recipientId!: string;

  @Prop({ required: true, type: String, unique: true })
  sourceKey!: string;

  @Prop({
    required: true,
    type: String,
    enum: NOTIFICATION_RECIPIENT_TYPES,
    default: "USER",
  })
  recipientType!: NotificationRecipientType;

  @Prop({ required: true, type: String, enum: NOTIFICATION_TYPES })
  type!: NotificationType;

  @Prop({ required: true, trim: true, maxlength: 200 })
  title!: string;

  @Prop({ required: true, trim: true, maxlength: 2_000 })
  message!: string;

  @Prop({ type: Object, default: {} })
  payload!: Record<string, unknown>;

  @Prop({ type: String })
  imageUrl?: string;

  @Prop({ type: String })
  actionUrl?: string;

  @Prop({ default: false })
  isRead!: boolean;

  @Prop()
  readAt?: Date;

  @Prop()
  expiresAt?: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ recipientId: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, type: 1, createdAt: -1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
