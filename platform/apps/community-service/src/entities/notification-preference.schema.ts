import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

@Schema({ _id: false })
export class EmailNotificationPreference {
  @Prop({ default: true })
  orderUpdates!: boolean;

  @Prop({ default: false })
  promotions!: boolean;

  @Prop({ default: true })
  newsletter!: boolean;
}

@Schema({ _id: false })
export class PushNotificationPreference {
  @Prop({ default: true })
  enabled!: boolean;

  @Prop({ default: true })
  orderUpdates!: boolean;

  @Prop({ default: true })
  chatMessages!: boolean;
}

const EmailPreferenceSchema = SchemaFactory.createForClass(
  EmailNotificationPreference,
);
const PushPreferenceSchema = SchemaFactory.createForClass(
  PushNotificationPreference,
);

export type NotificationPreferenceDocument =
  HydratedDocument<NotificationPreference>;

@Schema({ timestamps: true, collection: "notification_preferences" })
export class NotificationPreference {
  @Prop({ required: true, type: String, unique: true })
  recipientId!: string;

  @Prop({ default: true })
  orderUpdates!: boolean;

  @Prop({ default: true })
  promotions!: boolean;

  @Prop({ default: true })
  newReviews!: boolean;

  @Prop({ default: true })
  chatMessages!: boolean;

  @Prop({ default: true })
  forumActivity!: boolean;

  @Prop({ type: EmailPreferenceSchema, default: () => ({}) })
  emailNotifications!: EmailNotificationPreference;

  @Prop({ type: PushPreferenceSchema, default: () => ({}) })
  pushNotifications!: PushNotificationPreference;

  createdAt!: Date;
  updatedAt!: Date;
}

export const NotificationPreferenceSchema = SchemaFactory.createForClass(
  NotificationPreference,
);
