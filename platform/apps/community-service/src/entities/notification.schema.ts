import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export const NOTIFICATION_RECIPIENT_TYPES = [
  "USER",
  "BUSINESS",
  "DELIVERY",
  "ADMIN",
  "ALL",
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
  "WATCHDOG_ALERT",
  "BROADCAST",
] as const;

export const NOTIFICATION_SENDER_TYPES = [
  "SYSTEM",
  "ADMIN",
  "SELLER",
  "SHIPPER",
  "USER",
] as const;

export const NOTIFICATION_CATEGORIES = [
  "AUTO_LIFECYCLE",
  "AUTO_WATCHDOG",
  "MANUAL_DIRECT",
  "MANUAL_BROADCAST",
] as const;

export const NOTIFICATION_PRIORITIES = [
  "LOW",
  "NORMAL",
  "HIGH",
  "CRITICAL",
] as const;

export type NotificationRecipientType =
  (typeof NOTIFICATION_RECIPIENT_TYPES)[number];
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type NotificationSenderType =
  (typeof NOTIFICATION_SENDER_TYPES)[number];
export type NotificationCategory =
  (typeof NOTIFICATION_CATEGORIES)[number];
export type NotificationPriority =
  (typeof NOTIFICATION_PRIORITIES)[number];

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

  @Prop({
    type: String,
    enum: NOTIFICATION_SENDER_TYPES,
    default: "SYSTEM",
  })
  senderType!: NotificationSenderType;

  @Prop({ type: String })
  senderId?: string;

  @Prop({ type: String })
  senderName?: string;

  @Prop({ type: String })
  senderAvatar?: string;

  @Prop({
    type: String,
    enum: NOTIFICATION_CATEGORIES,
    default: "AUTO_LIFECYCLE",
  })
  category!: NotificationCategory;

  @Prop({
    type: String,
    enum: NOTIFICATION_PRIORITIES,
    default: "NORMAL",
  })
  priority!: NotificationPriority;

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

  @Prop({ type: [String], default: [] })
  readBy!: string[];

  @Prop()
  expiresAt?: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ recipientId: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, type: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, category: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, priority: 1, createdAt: -1 });
NotificationSchema.index({ recipientType: 1, createdAt: -1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
