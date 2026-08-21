import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventsModule } from '../../../../../libs/shared/src';
import {
  Notification,
  NotificationSchema,
} from '../../entities/notification.schema';
import { OrderNotificationConsumer } from './order-notification.consumer';

@Module({
  imports: [
    EventsModule,
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
    ]),
  ],
  providers: [OrderNotificationConsumer],
})
export class NotificationsModule {}
