import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export const NOTIFICATION_DEVICE_TYPES = ["ANDROID", "IOS", "WEB"] as const;
export type NotificationDeviceType = (typeof NOTIFICATION_DEVICE_TYPES)[number];
export type NotificationDeviceDocument = HydratedDocument<NotificationDevice>;

@Schema({ timestamps: true, collection: "notification_devices" })
export class NotificationDevice {
  @Prop({ required: true, type: String, index: true })
  recipientId!: string;

  @Prop({ required: true, type: String, unique: true })
  deviceToken!: string;

  @Prop({ required: true, type: String, enum: NOTIFICATION_DEVICE_TYPES })
  deviceType!: NotificationDeviceType;

  @Prop({ type: String })
  appVersion?: string;

  @Prop({ default: true })
  enabled!: boolean;

  @Prop({ default: Date.now })
  lastSeenAt!: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const NotificationDeviceSchema =
  SchemaFactory.createForClass(NotificationDevice);
NotificationDeviceSchema.index({ recipientId: 1, enabled: 1 });
