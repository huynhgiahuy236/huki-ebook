import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { CommunityActor } from "../../common/community-auth.guard";
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
} from "../../entities/notification.schema";
import {
  NotificationListQueryDto,
  RegisterNotificationDeviceDto,
  UpdateNotificationPreferenceDto,
} from "./dto/notification.dto";
import { NotificationGateway } from "./notification.gateway";
import { throwNotFound } from '@huki/shared/errors';
import { ErrorCode } from '@huki/shared/errors';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notifications: Model<NotificationDocument>,
    @InjectModel(NotificationPreference.name)
    private readonly preferences: Model<NotificationPreferenceDocument>,
    @InjectModel(NotificationDevice.name)
    private readonly devices: Model<NotificationDeviceDocument>,
    private readonly gateway: NotificationGateway,
  ) {}

  async list(actor: CommunityActor, query: NotificationListQueryDto) {
    const filter: Record<string, unknown> = { recipientId: actor.sub };
    if (query.isRead !== undefined) filter.isRead = query.isRead;
    if (query.type) filter.type = query.type;
    const [rows, total, unreadCount] = await Promise.all([
      this.notifications
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .exec(),
      this.notifications.countDocuments(filter),
      this.notifications.countDocuments({
        recipientId: actor.sub,
        isRead: false,
      }),
    ]);
    return {
      data: rows.map((row) => this.view(row)),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
      unreadCount,
    };
  }

  async detail(actor: CommunityActor, id: string) {
    const notification = await this.owned(actor.sub, id);
    return { data: this.view(notification!) };
  }

  async markRead(actor: CommunityActor, id: string) {
    const objectId = new Types.ObjectId(id);
    let notification = await this.notifications.findOneAndUpdate(
      { _id: objectId, recipientId: actor.sub, isRead: false },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true },
    );
    notification ??= await this.notifications.findOne({
      _id: objectId,
      recipientId: actor.sub,
    });
    if (!notification) throwNotFound(ErrorCode.NOTIFICATION_NOT_FOUND);
    this.gateway.read(actor.sub, notification!.id);
    return { data: this.view(notification!) };
  }

  async markAllRead(actor: CommunityActor) {
    await this.notifications.updateMany(
      { recipientId: actor.sub, isRead: false },
      { $set: { isRead: true, readAt: new Date() } },
    );
    this.gateway.readAll(actor.sub);
    return {
      message: "All notifications marked as read",
      data: { unreadCount: 0 },
    };
  }

  async remove(actor: CommunityActor, id: string) {
    const result = await this.notifications.deleteOne({
      _id: new Types.ObjectId(id),
      recipientId: actor.sub,
    });
    if (!result.deletedCount)
      throwNotFound(ErrorCode.NOTIFICATION_NOT_FOUND);
    return { message: "Notification deleted" };
  }

  async clear(actor: CommunityActor) {
    const result = await this.notifications.deleteMany({
      recipientId: actor.sub,
    });
    return {
      message: "All notifications cleared",
      data: { deletedCount: result.deletedCount },
    };
  }

  async settings(actor: CommunityActor) {
    const preference = await this.preferences.findOneAndUpdate(
      { recipientId: actor.sub },
      { $setOnInsert: { recipientId: actor.sub } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return { data: this.preferenceView(preference!) };
  }

  async updateSettings(
    actor: CommunityActor,
    dto: UpdateNotificationPreferenceDto,
  ) {
    const update = this.preferenceUpdate(dto);
    const preference = await this.preferences.findOneAndUpdate(
      { recipientId: actor.sub },
      {
        $setOnInsert: { recipientId: actor.sub },
        ...(Object.keys(update).length ? { $set: update } : {}),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return {
      message: "Notification settings updated",
      data: this.preferenceView(preference!),
    };
  }

  async registerDevice(
    actor: CommunityActor,
    dto: RegisterNotificationDeviceDto,
  ) {
    await this.devices.updateOne(
      { deviceToken: dto.deviceToken },
      {
        $set: {
          recipientId: actor.sub,
          deviceType: dto.deviceType,
          appVersion: dto.appVersion,
          enabled: true,
          lastSeenAt: new Date(),
        },
        $setOnInsert: { deviceToken: dto.deviceToken },
      },
      { upsert: true },
    );
    return { message: "Device registered" };
  }

  async unregisterDevice(actor: CommunityActor, token: string) {
    await this.devices.deleteOne({
      recipientId: actor.sub,
      deviceToken: token,
    });
    return { message: "Device unregistered" };
  }

  private async owned(recipientId: string, id: string) {
    const notification = await this.notifications.findOne({
      _id: new Types.ObjectId(id),
      recipientId,
    });
    if (!notification) throwNotFound(ErrorCode.NOTIFICATION_NOT_FOUND);
    return notification;
  }

  private view(notification: NotificationDocument) {
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

  private preferenceView(preference: NotificationPreferenceDocument) {
    return {
      orderUpdates: preference.orderUpdates,
      promotions: preference.promotions,
      newReviews: preference.newReviews,
      chatMessages: preference.chatMessages,
      forumActivity: preference.forumActivity,
      emailNotifications: preference.emailNotifications,
      pushNotifications: preference.pushNotifications,
    };
  }

  private preferenceUpdate(dto: UpdateNotificationPreferenceDto) {
    const update: Record<string, boolean> = {};
    for (const key of [
      "orderUpdates",
      "promotions",
      "newReviews",
      "chatMessages",
      "forumActivity",
    ] as const) {
      if (dto[key] !== undefined) update[key] = dto[key];
    }
    for (const [key, value] of Object.entries(dto.emailNotifications ?? {})) {
      if (value !== undefined)
        update[`emailNotifications.${key}`] = value as boolean;
    }
    for (const [key, value] of Object.entries(dto.pushNotifications ?? {})) {
      if (value !== undefined)
        update[`pushNotifications.${key}`] = value as boolean;
    }
    return update;
  }
}
