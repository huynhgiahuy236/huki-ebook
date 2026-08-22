import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Model } from "mongoose";
import { RabbitMqEventBus } from "../../../../../libs/shared/src";
import {
  NotificationDevice,
  NotificationDeviceDocument,
} from "../../entities/notification-device.schema";
import {
  NotificationPreference,
  NotificationPreferenceDocument,
} from "../../entities/notification-preference.schema";
import {
  Notification,
  NotificationDocument,
  NotificationRecipientType,
  NotificationType,
} from "../../entities/notification.schema";
import { FirebaseMessagingService } from "./firebase-messaging.service";
import { NotificationGateway } from "./notification.gateway";

export interface NotificationInput {
  sourceKey: string;
  recipientId: string;
  recipientType: NotificationRecipientType;
  type: NotificationType;
  title: string;
  message: string;
  payload: Record<string, unknown>;
  imageUrl?: string;
  actionUrl?: string;
}

@Injectable()
export class NotificationDeliveryService {
  private readonly logger = new Logger(NotificationDeliveryService.name);

  constructor(
    @InjectModel(Notification.name)
    private readonly notifications: Model<NotificationDocument>,
    @InjectModel(NotificationPreference.name)
    private readonly preferences: Model<NotificationPreferenceDocument>,
    @InjectModel(NotificationDevice.name)
    private readonly devices: Model<NotificationDeviceDocument>,
    private readonly gateway: NotificationGateway,
    private readonly firebase: FirebaseMessagingService,
    private readonly eventBus: RabbitMqEventBus,
  ) {}

  async deliver(
    input: NotificationInput,
  ): Promise<NotificationDocument | null> {
    const preference = await this.preferences.findOne({
      recipientId: input.recipientId,
    });
    if (!this.inAppEnabled(input.type, preference)) return null;

    let created: NotificationDocument | null = null;
    try {
      const result = await this.notifications.updateOne(
        { sourceKey: input.sourceKey },
        { $setOnInsert: { ...input, isRead: false } },
        { upsert: true },
      );
      if (!result.upsertedCount) return null;
      created = await this.notifications.findOne({
        sourceKey: input.sourceKey,
      });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) return null;
      throw error;
    }
    if (!created) return null;

    const view = this.view(created);
    this.gateway.notification(input.recipientId, view);
    await this.push(created, preference);
    void this.publishCreated(created);
    return created;
  }

  private async push(
    notification: NotificationDocument,
    preference: NotificationPreferenceDocument | null,
  ) {
    if (!this.pushEnabled(notification.type, preference)) return;
    const devices = await this.devices
      .find({ recipientId: notification.recipientId, enabled: true })
      .select("deviceToken")
      .lean();
    const tokens = devices.map((device) => device.deviceToken);
    const invalid = await this.firebase.send(tokens, {
      title: notification.title,
      body: notification.message,
      data: {
        notificationId: notification.id,
        type: notification.type,
        actionUrl: notification.actionUrl ?? "",
        ...notification.payload,
      },
    });
    if (invalid.length) {
      await this.devices.updateMany(
        { deviceToken: { $in: invalid } },
        { $set: { enabled: false } },
      );
    }
  }

  private inAppEnabled(
    type: NotificationType,
    preference: NotificationPreferenceDocument | null,
  ) {
    if (!preference) return true;
    if (
      [
        "ORDER_STATUS",
        "ORDER_MESSAGE",
        "PAYMENT_SUCCESS",
        "PAYMENT_FAILED",
        "SHIPPING_UPDATE",
        "BOOK_ACCESS",
      ].includes(type)
    )
      return preference.orderUpdates;
    if (type === "NEW_MESSAGE") return preference.chatMessages;
    if (type === "NEW_REVIEW" || type === "NEW_REPLY")
      return preference.newReviews;
    if (type === "FORUM_MENTION") return preference.forumActivity;
    if (type === "VOUCHER_EXPIRING" || type === "VOUCHER_NEW")
      return preference.promotions;
    return true;
  }

  private pushEnabled(
    type: NotificationType,
    preference: NotificationPreferenceDocument | null,
  ) {
    if (!preference) return true;
    if (!preference.pushNotifications?.enabled) return false;
    if (type === "NEW_MESSAGE")
      return preference.pushNotifications.chatMessages;
    if (
      [
        "ORDER_STATUS",
        "ORDER_MESSAGE",
        "PAYMENT_SUCCESS",
        "PAYMENT_FAILED",
        "SHIPPING_UPDATE",
        "BOOK_ACCESS",
      ].includes(type)
    )
      return preference.pushNotifications.orderUpdates;
    return true;
  }

  private view(notification: NotificationDocument): Record<string, unknown> {
    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      payload: notification.payload,
      imageUrl: notification.imageUrl,
      actionUrl: notification.actionUrl,
      isRead: notification.isRead,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };
  }

  private async publishCreated(notification: NotificationDocument) {
    try {
      await this.eventBus.publish({
        eventId: randomUUID(),
        eventType: "notification.created",
        occurredAt: new Date().toISOString(),
        producer: "community-service",
        version: 1,
        aggregateId: notification.id,
        payload: {
          notificationId: notification.id,
          recipientId: notification.recipientId,
          type: notification.type,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Could not publish notification.created: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
