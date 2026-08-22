import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { EventsModule } from "../../../../../libs/shared/src";
import { AuthenticatedCommunityGuard } from "../../common/community-auth.guard";
import {
  NotificationDevice,
  NotificationDeviceSchema,
} from "../../entities/notification-device.schema";
import {
  NotificationPreference,
  NotificationPreferenceSchema,
} from "../../entities/notification-preference.schema";
import {
  Notification,
  NotificationSchema,
} from "../../entities/notification.schema";
import { FirebaseMessagingService } from "./firebase-messaging.service";
import { NotificationDeliveryService } from "./notification-delivery.service";
import { NotificationEventConsumer } from "./notification-event.consumer";
import { NotificationGateway } from "./notification.gateway";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";

@Module({
  imports: [
    EventsModule,
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      {
        name: NotificationPreference.name,
        schema: NotificationPreferenceSchema,
      },
      { name: NotificationDevice.name, schema: NotificationDeviceSchema },
    ]),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationDeliveryService,
    NotificationEventConsumer,
    NotificationGateway,
    FirebaseMessagingService,
    AuthenticatedCommunityGuard,
  ],
})
export class NotificationsModule {}
