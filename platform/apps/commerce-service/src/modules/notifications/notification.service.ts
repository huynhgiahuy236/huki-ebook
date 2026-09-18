/**
 * Notification Service - Commerce Service
 * Handles notification creation and delivery for business events
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

export enum NotificationType {
  // KYC Notifications
  KYC_APPROVED = 'KYC_APPROVED',
  KYC_REJECTED = 'KYC_REJECTED',
  KYC_RESUBMITTED = 'KYC_RESUBMITTED',

  // Order Notifications
  NEW_ORDER = 'NEW_ORDER',
  ORDER_CONFIRMED = 'ORDER_CONFIRMED',
  ORDER_SHIPPED = 'ORDER_SHIPPED',
  ORDER_DELIVERED = 'ORDER_DELIVERED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  ORDER_RETURNED = 'ORDER_RETURNED',

  // Payment Notifications
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_REFUNDED = 'PAYMENT_REFUNDED',

  // Inventory Notifications
  STOCK_LOW = 'STOCK_LOW',
  STOCK_OUT = 'STOCK_OUT',

  // Review Notifications
  REVIEW_RECEIVED = 'REVIEW_RECEIVED',
  REVIEW_REPLIED = 'REVIEW_REPLIED',

  // Dispute Notifications
  DISPUTE_OPENED = 'DISPUTE_OPENED',
  DISPUTE_RESOLVED = 'DISPUTE_RESOLVED',

  // System Notifications
  SYSTEM = 'SYSTEM',
}

export interface CreateNotificationDto {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  data?: Record<string, any>;
}

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a new notification
   */
  async create(dto: CreateNotificationDto) {
    const notification = await (this.prisma as any).notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        data: dto.data ? JSON.parse(JSON.stringify(dto.data)) : undefined,
      },
    });

    // Emit event for real-time delivery (WebSocket)
    this.eventEmitter.emit('notification.created', notification);

    return notification;
  }

  /**
   * Create notifications for multiple users (batch)
   */
  async createBatch(userIds: string[], dto: Omit<CreateNotificationDto, 'userId'>) {
    const notifications = await (this.prisma as any).notification.createMany({
      data: userIds.map(userId => ({
        userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        data: dto.data ? JSON.parse(JSON.stringify(dto.data)) : undefined,
      })),
    });

    // Emit event for each notification
    for (const userId of userIds) {
      this.eventEmitter.emit('notification.created', { userId });
    }

    return notifications;
  }

  /**
   * Get notifications for a user
   */
  async getForUser(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
    } = {},
  ) {
    const { limit = 20, offset = 0, unreadOnly = false } = options;

    const where: any = { userId };
    if (unreadOnly) {
      where.isRead = false;
    }

    const [items, total] = await Promise.all([
      (this.prisma as any).notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      (this.prisma as any).notification.count({ where }),
    ]);

    return {
      items,
      total,
      limit,
      offset,
      hasMore: offset + items.length < total,
    };
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return (this.prisma as any).notification.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(userId: string, notificationId: string) {
    return (this.prisma as any).notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string) {
    return (this.prisma as any).notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Delete a notification
   */
  async delete(userId: string, notificationId: string) {
    return (this.prisma as any).notification.deleteMany({
      where: { id: notificationId, userId },
    });
  }

  /**
   * Delete all notifications for a user
   */
  async deleteAll(userId: string) {
    return (this.prisma as any).notification.deleteMany({
      where: { userId },
    });
  }

  // ============================================
  // Notification Templates
  // ============================================

  /**
   * Notify seller when KYC is approved
   */
  async notifyKYCApproved(userId: string, businessName: string) {
    return this.create({
      userId,
      type: NotificationType.KYC_APPROVED,
      title: 'Hồ sơ doanh nghiệp đã được phê duyệt! 🎉',
      message: `Chúc mừng! Hồ sơ "${businessName}" đã được phê duyệt. Bây giờ bạn có thể bắt đầu đăng sách và nhận đơn hàng.`,
      data: { businessName },
    });
  }

  /**
   * Notify seller when KYC is rejected
   */
  async notifyKYCRejected(userId: string, businessName: string, reason: string) {
    return this.create({
      userId,
      type: NotificationType.KYC_REJECTED,
      title: 'Hồ sơ doanh nghiệp cần chỉnh sửa',
      message: `Hồ sơ "${businessName}" bị từ chối. Lý do: ${reason}`,
      data: { businessName, reason },
    });
  }

  /**
   * Notify seller of new order
   */
  async notifyNewOrder(userId: string, orderId: string, totalAmount: number) {
    return this.create({
      userId,
      type: NotificationType.NEW_ORDER,
      title: 'Bạn có đơn hàng mới! 🛒',
      message: `Đơn hàng #${orderId.slice(0, 8)} với giá trị ${totalAmount.toLocaleString('vi-VN')}₫ đang chờ xác nhận.`,
      data: { orderId, totalAmount },
    });
  }

  /**
   * Notify seller when order is shipped
   */
  async notifyOrderShipped(userId: string, orderId: string, trackingNumber: string) {
    return this.create({
      userId,
      type: NotificationType.ORDER_SHIPPED,
      title: 'Đơn hàng đã được giao cho đơn vị vận chuyển 📦',
      message: `Đơn hàng #${orderId.slice(0, 8)} đang được giao. Mã vận đơn: ${trackingNumber}`,
      data: { orderId, trackingNumber },
    });
  }

  /**
   * Notify when payment is received
   */
  async notifyPaymentReceived(userId: string, orderId: string, amount: number) {
    return this.create({
      userId,
      type: NotificationType.PAYMENT_RECEIVED,
      title: 'Thanh toán thành công! 💰',
      message: `Đã nhận thanh toán ${amount.toLocaleString('vi-VN')}₫ cho đơn hàng #${orderId.slice(0, 8)}`,
      data: { orderId, amount },
    });
  }

  /**
   * Notify when stock is low
   */
  async notifyStockLow(userId: string, productName: string, currentStock: number) {
    return this.create({
      userId,
      type: NotificationType.STOCK_LOW,
      title: 'Cảnh báo: Sắp hết hàng ⚠️',
      message: `Sản phẩm "${productName}" chỉ còn ${currentStock} cuốn trong kho.`,
      data: { productName, currentStock },
    });
  }
}
