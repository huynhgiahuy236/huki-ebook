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
import { randomUUID } from "crypto";
import {
  DispatchNotificationDto,
  NotificationListQueryDto,
  RegisterNotificationDeviceDto,
  UpdateNotificationPreferenceDto,
} from "./dto/notification.dto";
import { NotificationGateway } from "./notification.gateway";
import { NotificationDeliveryService } from "./notification-delivery.service";
import {
  NotificationRecipientType,
  NotificationSenderType,
} from "../../entities/notification.schema";
import { throwNotFound, throwForbidden } from '@huki/shared/errors';
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
    private readonly delivery: NotificationDeliveryService,
  ) {}

  private getRoleConditions(actor: CommunityActor, targetRecipientType?: string): Array<Record<string, unknown>> {
    const conditions: Array<Record<string, unknown>> = [
      { recipientType: "ALL" },
    ];
    const extra = actor as unknown as Record<string, unknown>;

    // 1. Phân lập theo recipientType rõ ràng nếu Client gửi lên (ví dụ: chuông ở Portal Seller -> BUSINESS)
    if (targetRecipientType) {
      const type = targetRecipientType.toUpperCase();
      if (type === "BUSINESS" || type === "SELLER") {
        conditions.push({ recipientType: "BUSINESS", recipientId: actor.sub });
        conditions.push({ recipientType: "BUSINESS", recipientId: "*" });
        if (extra.storeId) {
          conditions.push({ recipientType: "BUSINESS", recipientId: String(extra.storeId) });
          conditions.push({ recipientId: String(extra.storeId) });
        }
        if (extra.businessId) {
          conditions.push({ recipientType: "BUSINESS", recipientId: String(extra.businessId) });
          conditions.push({ recipientId: String(extra.businessId) });
        }
        return conditions;
      }
      if (type === "DELIVERY" || type === "SHIPPER") {
        conditions.push({ recipientType: "DELIVERY", recipientId: actor.sub });
        conditions.push({ recipientType: "DELIVERY", recipientId: "*" });
        return conditions;
      }
      if (type === "ADMIN") {
        conditions.push({ recipientType: "ADMIN" });
        conditions.push({ recipientType: "ADMIN", recipientId: actor.sub });
        conditions.push({ recipientId: "admin_channel" });
        return conditions;
      }
      if (type === "USER") {
        conditions.push({ recipientType: "USER", recipientId: actor.sub });
        conditions.push({ recipientType: "USER", recipientId: "*" });
        return conditions;
      }
    }

    // 2. Fallback theo role của tài khoản hiện tại
    const actorRole = (actor.role ?? "").toUpperCase();
    if (actorRole === "PLATFORM_ADMIN" || actorRole === "ADMIN") {
      conditions.push({ recipientType: "ADMIN" });
      conditions.push({ recipientId: "admin_channel" });
      conditions.push({ recipientId: actor.sub });
    } else if (actorRole === "BUSINESS" || actorRole === "SELLER") {
      conditions.push({ recipientType: "BUSINESS", recipientId: "*" });
      conditions.push({ recipientType: "BUSINESS", recipientId: actor.sub });
      if (extra.storeId) {
        conditions.push({ recipientId: String(extra.storeId) });
        conditions.push({ recipientType: "BUSINESS", recipientId: String(extra.storeId) });
      }
      if (extra.businessId) {
        conditions.push({ recipientId: String(extra.businessId) });
        conditions.push({ recipientType: "BUSINESS", recipientId: String(extra.businessId) });
      }
    } else if (actorRole === "DELIVERY_STAFF" || actorRole === "DELIVERY") {
      conditions.push({ recipientType: "DELIVERY", recipientId: "*" });
      conditions.push({ recipientType: "DELIVERY", recipientId: actor.sub });
    } else {
      // Default to USER
      conditions.push({ recipientType: "USER", recipientId: actor.sub });
      conditions.push({ recipientType: "USER", recipientId: "*" });
      conditions.push({ recipientId: actor.sub });
    }
    return conditions;
  }

  async list(actor: CommunityActor, query: NotificationListQueryDto) {
    const roleConditions = this.getRoleConditions(actor, query.recipientType);
    const filter: Record<string, unknown> = {
      $or: roleConditions,
    };

    if (query.isRead !== undefined) {
      if (query.isRead) {
        filter.$and = [
          { $or: [{ isRead: true }, { readBy: actor.sub }] },
        ];
      } else {
        filter.isRead = false;
        filter.readBy = { $ne: actor.sub };
      }
    }
    if (query.type) filter.type = query.type;
    if (query.category) filter.category = query.category;
    if (query.priority) filter.priority = query.priority;

    const [rows, total, unreadCount] = await Promise.all([
      this.notifications
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .exec(),
      this.notifications.countDocuments(filter),
      this.notifications.countDocuments({
        $or: roleConditions,
        isRead: false,
        readBy: { $ne: actor.sub },
      }),
    ]);

    return {
      data: rows.map((row) => this.view(row, actor.sub)),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
      summary: { unreadCount },
      unreadCount,
    };
  }

  async unreadCount(actor: CommunityActor, recipientType?: string) {
    const roleConditions = this.getRoleConditions(actor, recipientType);
    const count = await this.notifications.countDocuments({
      $or: roleConditions,
      isRead: false,
      readBy: { $ne: actor.sub },
    });
    return { count };
  }

  async detail(actor: CommunityActor, id: string) {
    const notification = await this.accessible(actor, id);
    return { data: this.view(notification, actor.sub) };
  }

  async markRead(actor: CommunityActor, id: string) {
    const objectId = new Types.ObjectId(id);
    let notification = await this.accessible(actor, id);
    const extra = actor as unknown as Record<string, unknown>;
    const isDirectRecipient =
      notification.recipientId === actor.sub ||
      (extra.storeId && notification.recipientId === extra.storeId) ||
      (extra.businessId && notification.recipientId === extra.businessId);

    if (isDirectRecipient) {
      notification = (await this.notifications.findByIdAndUpdate(
        objectId,
        {
          $set: { isRead: true, readAt: new Date() },
          $addToSet: { readBy: actor.sub },
        },
        { new: true },
      ))!;
    } else {
      notification = (await this.notifications.findByIdAndUpdate(
        objectId,
        { $addToSet: { readBy: actor.sub }, $set: { readAt: new Date() } },
        { new: true },
      ))!;
    }

    this.gateway.read(actor.sub, notification.id);
    return { data: this.view(notification, actor.sub) };
  }

  async markAllRead(actor: CommunityActor, recipientType?: string) {
    const roleConditions = this.getRoleConditions(actor, recipientType);
    const extra = actor as unknown as Record<string, unknown>;
    const targetIds = [actor.sub];
    if (extra.storeId) targetIds.push(String(extra.storeId));
    if (extra.businessId) targetIds.push(String(extra.businessId));

    const directFilter: Record<string, unknown> = {
      recipientId: { $in: targetIds },
      isRead: false,
    };
    if (recipientType) {
      directFilter.recipientType = recipientType;
    }

    await Promise.all([
      this.notifications.updateMany(
        directFilter,
        { $set: { isRead: true, readAt: new Date() }, $addToSet: { readBy: actor.sub } },
      ),
      this.notifications.updateMany(
        { $or: roleConditions, readBy: { $ne: actor.sub } },
        { $addToSet: { readBy: actor.sub } },
      ),
    ]);

    this.gateway.readAll(actor.sub);
    return {
      message: "All notifications marked as read",
      data: { unreadCount: 0 },
    };
  }

  async dispatch(actor: CommunityActor, dto: DispatchNotificationDto) {
    const role = (actor.role ?? "").toUpperCase();
    const isAdmin = role === "PLATFORM_ADMIN" || role === "ADMIN";
    const isSeller = role === "BUSINESS" || role === "SELLER";
    const isShipper = role === "DELIVERY_STAFF" || role === "DELIVERY";
    const isUser = !isAdmin && !isSeller && !isShipper;

    let senderType: NotificationSenderType = "USER";
    if (isAdmin) senderType = "ADMIN";
    else if (isSeller) senderType = "SELLER";
    else if (isShipper) senderType = "SHIPPER";

    if ((dto.recipientType === "ALL" || dto.recipientId === "*") && !isAdmin) {
      throwForbidden(
        ErrorCode.AUTHZ_ROLE_INSUFFICIENT,
        "Only platform administrators can dispatch broadcast notifications",
      );
    }

    if (dto.priority === "CRITICAL" && !isAdmin) {
      throwForbidden(
        ErrorCode.AUTHZ_ROLE_INSUFFICIENT,
        "Only platform administrators can dispatch critical priority notifications",
      );
    }

    if (isSeller && !["USER", "DELIVERY", "ADMIN"].includes(dto.recipientType)) {
      throwForbidden(ErrorCode.AUTHZ_FORBIDDEN, "Sellers cannot dispatch to this recipient type");
    }
    if (isShipper && !["USER", "BUSINESS", "ADMIN"].includes(dto.recipientType)) {
      throwForbidden(ErrorCode.AUTHZ_FORBIDDEN, "Shippers cannot dispatch to this recipient type");
    }
    if (isUser && !["BUSINESS", "DELIVERY", "ADMIN"].includes(dto.recipientType)) {
      throwForbidden(ErrorCode.AUTHZ_FORBIDDEN, "Users cannot dispatch to this recipient type");
    }

    const sourceKey = `dispatch-${randomUUID()}`;
    const result = await this.delivery.deliver({
      sourceKey,
      recipientId: dto.recipientId,
      recipientType: dto.recipientType,
      type: dto.type,
      category: dto.category ?? "MANUAL_DIRECT",
      priority: dto.priority ?? "NORMAL",
      title: dto.title,
      message: dto.message,
      imageUrl: dto.imageUrl,
      actionUrl: dto.actionUrl,
      payload: dto.payload ?? {},
      senderType,
      senderId: actor.sub,
      senderName: actor.fullName ?? actor.email ?? "Huki Member",
      senderAvatar: actor.avatar,
    });

    return {
      message: "Notification dispatched successfully",
      data: result ? this.view(result, actor.sub) : null,
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

  private async accessible(actor: CommunityActor, id: string) {
    const objectId = new Types.ObjectId(id);
    const notification = await this.notifications.findById(objectId);
    if (!notification) throwNotFound(ErrorCode.NOTIFICATION_NOT_FOUND);

    const roleConditions = this.getRoleConditions(actor);
    const hasAccess = roleConditions.some((cond) => {
      const typeMatches =
        !cond.recipientType ||
        cond.recipientType === "ALL" ||
        cond.recipientType === notification.recipientType;
      const idMatches =
        !cond.recipientId ||
        cond.recipientId === "*" ||
        cond.recipientId === notification.recipientId;
      return typeMatches && idMatches;
    });

    if (!hasAccess) {
      throwNotFound(ErrorCode.NOTIFICATION_NOT_FOUND);
    }
    return notification;
  }

  private view(notification: NotificationDocument, actorSub?: string) {
    const isRead = actorSub && notification.readBy?.includes(actorSub)
      ? true
      : notification.isRead;
    return {
      id: notification.id,
      recipientId: notification.recipientId,
      recipientType: notification.recipientType,
      senderType: notification.senderType,
      senderId: notification.senderId,
      senderName: notification.senderName,
      senderAvatar: notification.senderAvatar,
      category: notification.category,
      priority: notification.priority,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      payload: notification.payload,
      imageUrl: notification.imageUrl,
      actionUrl: notification.actionUrl,
      isRead,
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
      if (dto[key] !== undefined) update[key] = dto[key] as boolean;
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
