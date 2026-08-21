import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  DomainEvent,
  ORDER_EVENTS,
  PAYMENT_EVENTS,
  RabbitMqEventBus,
} from '../../../../../libs/shared/src';
import { Model } from 'mongoose';
import {
  Notification,
  NotificationDocument,
} from '../../entities/notification.schema';

interface NotificationTarget {
  recipientId: string;
  recipientType: 'USER' | 'BUSINESS';
  type: string;
  title: string;
  message: string;
}

@Injectable()
export class OrderNotificationConsumer implements OnApplicationBootstrap {
  constructor(
    private readonly bus: RabbitMqEventBus,
    @InjectModel(Notification.name)
    private readonly notifications: Model<NotificationDocument>,
  ) {}

  onApplicationBootstrap(): void {
    this.bus.subscribe(
      'community-service.order-confirmations',
      [
        ORDER_EVENTS.CREATED,
        ORDER_EVENTS.PAID,
        ORDER_EVENTS.CANCELLED,
        ORDER_EVENTS.COMPLETED,
        ORDER_EVENTS.SELLER_CONFIRMED,
        ORDER_EVENTS.SELLER_CANCELLED,
        PAYMENT_EVENTS.FAILED,
      ],
      (event) => this.handle(event),
    );
  }

  private async handle(event: DomainEvent): Promise<void> {
    const targets = this.targets(event);
    for (const target of targets) {
      const sourceKey = `${event.eventId}:${target.recipientId}:${target.type}`;
      await this.notifications.updateOne(
        { sourceKey },
        {
          $setOnInsert: {
            ...target,
            sourceKey,
            payload: event.payload,
            isRead: false,
          },
        },
        { upsert: true },
      );
    }
  }

  private targets(event: DomainEvent): NotificationTarget[] {
    const payload = event.payload as Record<string, any>;
    const code = payload.orderCode ?? payload.orderId;
    const result: NotificationTarget[] = [];
    const buyer = (type: string, title: string, message: string) => {
      if (payload.userId)
        result.push({
          recipientId: payload.userId,
          recipientType: 'USER',
          type,
          title,
          message,
        });
    };
    if (event.eventType === ORDER_EVENTS.CREATED) {
      buyer(
        'ORDER_STATUS',
        'Đặt hàng thành công',
        `Đơn hàng ${code} đã được tạo.`,
      );
      for (const seller of payload.sellerOrders ?? []) {
        result.push({
          recipientId: seller.ownerUserId,
          recipientType: 'BUSINESS',
          type: 'ORDER_STATUS',
          title: 'Có đơn hàng mới',
          message: `Bạn vừa nhận đơn hàng ${code}.`,
        });
      }
    } else if (event.eventType === ORDER_EVENTS.PAID) {
      buyer(
        'PAYMENT_SUCCESS',
        'Thanh toán thành công',
        `Đơn hàng ${code} đã được thanh toán.`,
      );
    } else if (event.eventType === ORDER_EVENTS.CANCELLED) {
      buyer('ORDER_STATUS', 'Đơn hàng đã hủy', `Đơn hàng ${code} đã được hủy.`);
      for (const seller of payload.sellerOrders ?? []) {
        result.push({
          recipientId: seller.ownerUserId,
          recipientType: 'BUSINESS',
          type: 'ORDER_STATUS',
          title: 'Đơn hàng đã hủy',
          message: `Đơn hàng ${code} đã được hủy.`,
        });
      }
    } else if (event.eventType === ORDER_EVENTS.SELLER_CANCELLED) {
      buyer(
        'ORDER_STATUS',
        'Người bán đã hủy đơn',
        `Một phần của đơn hàng ${code} đã bị người bán hủy.`,
      );
    } else if (event.eventType === ORDER_EVENTS.COMPLETED) {
      buyer(
        'ORDER_STATUS',
        'Đơn hàng hoàn tất',
        `Đơn hàng ${code} đã giao thành công.`,
      );
    } else if (event.eventType === ORDER_EVENTS.SELLER_CONFIRMED) {
      buyer(
        'ORDER_STATUS',
        'Người bán đã xác nhận',
        `Đơn hàng ${code} đã được người bán xác nhận.`,
      );
    } else if (event.eventType === PAYMENT_EVENTS.FAILED) {
      buyer(
        'PAYMENT_FAILED',
        'Thanh toán thất bại',
        `Thanh toán đơn hàng ${code} không thành công: ${payload.reason ?? 'Không xác định'}.`,
      );
    }
    return result.filter(
      (target, index, all) =>
        all.findIndex(
          (item) =>
            item.recipientId === target.recipientId &&
            item.type === target.type,
        ) === index,
    );
  }
}
