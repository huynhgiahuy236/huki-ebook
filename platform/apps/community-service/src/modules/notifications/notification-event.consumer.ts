import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import {
  DomainEvent,
  ORDER_EVENTS,
  PAYMENT_EVENTS,
  RabbitMqEventBus,
  SHIPPING_EVENTS,
} from "../../../../../libs/shared/src";
import {
  NotificationInput,
  NotificationDeliveryService,
} from "./notification-delivery.service";

type Target = Omit<NotificationInput, "sourceKey" | "payload">;

@Injectable()
export class NotificationEventConsumer implements OnApplicationBootstrap {
  private readonly patterns = [
    ORDER_EVENTS.CREATED,
    ORDER_EVENTS.PAID,
    ORDER_EVENTS.CANCELLED,
    ORDER_EVENTS.COMPLETED,
    ORDER_EVENTS.SELLER_CONFIRMED,
    ORDER_EVENTS.SELLER_SHIPPED,
    ORDER_EVENTS.SELLER_CANCELLED,
    PAYMENT_EVENTS.FAILED,
    SHIPPING_EVENTS.CREATED,
    SHIPPING_EVENTS.OUT_FOR_DELIVERY,
    SHIPPING_EVENTS.DELIVERED,
    SHIPPING_EVENTS.FAILED,
    SHIPPING_EVENTS.STAFF_ASSIGNED,
    "chat.message.sent",
    "review.created",
    "forum.comment.created",
  ];

  constructor(
    private readonly bus: RabbitMqEventBus,
    private readonly delivery: NotificationDeliveryService,
  ) {}

  onApplicationBootstrap(): void {
    this.bus.subscribe(
      "community-service.order-confirmations",
      this.patterns,
      (event) => this.handle(event),
    );
  }

  private async handle(event: DomainEvent): Promise<void> {
    const targets = this.targets(event);
    await Promise.all(
      targets.map((target) =>
        this.delivery.deliver({
          ...target,
          sourceKey: `${event.eventId}:${target.recipientId}:${target.type}`,
          payload: event.payload,
        }),
      ),
    );
  }

  private targets(event: DomainEvent): Target[] {
    const payload = event.payload as Record<string, any>;
    const code = payload.orderCode ?? payload.orderId;
    const orderUrl = payload.orderId ? `/orders/${payload.orderId}` : undefined;
    const targets: Target[] = [];
    const buyer = (
      type: Target["type"],
      title: string,
      message: string,
      actionUrl = orderUrl,
    ) => {
      if (payload.userId)
        targets.push({
          recipientId: payload.userId,
          recipientType: "USER",
          type,
          title,
          message,
          actionUrl,
        });
    };

    switch (event.eventType) {
      case ORDER_EVENTS.CREATED:
        buyer(
          "ORDER_STATUS",
          "Đặt hàng thành công",
          `Đơn hàng ${code} đã được tạo.`,
        );
        for (const seller of payload.sellerOrders ?? []) {
          if (seller.ownerUserId)
            targets.push({
              recipientId: seller.ownerUserId,
              recipientType: "BUSINESS",
              type: "ORDER_STATUS",
              title: "Có đơn hàng mới",
              message: `Bạn vừa nhận đơn hàng ${code}.`,
              actionUrl: `/seller/orders/${seller.sellerOrderId}`,
            });
        }
        break;
      case ORDER_EVENTS.PAID:
        buyer(
          "PAYMENT_SUCCESS",
          "Thanh toán thành công",
          `Đơn hàng ${code} đã được thanh toán.`,
        );
        break;
      case ORDER_EVENTS.CANCELLED:
        buyer(
          "ORDER_STATUS",
          "Đơn hàng đã hủy",
          `Đơn hàng ${code} đã được hủy.`,
        );
        this.sellers(targets, payload, "Đơn hàng đã hủy");
        break;
      case ORDER_EVENTS.SELLER_CANCELLED:
        buyer(
          "ORDER_STATUS",
          "Người bán đã hủy đơn",
          `Một phần của đơn hàng ${code} đã bị người bán hủy.`,
        );
        break;
      case ORDER_EVENTS.COMPLETED:
        buyer(
          "ORDER_STATUS",
          "Đơn hàng hoàn tất",
          `Đơn hàng ${code} đã giao thành công. Bạn có thể gửi đánh giá.`,
        );
        break;
      case ORDER_EVENTS.SELLER_CONFIRMED:
        buyer(
          "ORDER_STATUS",
          "Người bán đã xác nhận",
          `Đơn hàng ${code} đã được người bán xác nhận.`,
        );
        break;
      case ORDER_EVENTS.SELLER_SHIPPED:
        buyer(
          "ORDER_STATUS",
          "Đơn hàng đã được gửi",
          `Đơn hàng ${code} đang được vận chuyển.`,
        );
        break;
      case PAYMENT_EVENTS.FAILED:
        buyer(
          "PAYMENT_FAILED",
          "Thanh toán thất bại",
          `Thanh toán đơn hàng ${code} không thành công.`,
        );
        break;
      case SHIPPING_EVENTS.CREATED:
      case SHIPPING_EVENTS.OUT_FOR_DELIVERY:
      case SHIPPING_EVENTS.DELIVERED:
      case SHIPPING_EVENTS.FAILED:
        buyer(
          "SHIPPING_UPDATE",
          this.shippingTitle(event.eventType),
          `Vận chuyển đơn hàng ${code} vừa được cập nhật.`,
          payload.orderId ? `/orders/${payload.orderId}/tracking` : undefined,
        );
        break;
      case SHIPPING_EVENTS.STAFF_ASSIGNED:
        if (payload.staffUserId) {
          targets.push({
            recipientId: payload.staffUserId,
            recipientType: "DELIVERY",
            type: "SHIPPING_UPDATE",
            title: "Bạn có đơn giao hàng mới",
            message: "Một đơn hàng mới vừa được phân công cho bạn.",
            actionUrl: `/delivery/shipments/${payload.shipmentId}`,
          });
        }
        break;
      case "chat.message.sent":
        for (const recipient of payload.recipients ??
          (payload.recipientIds ?? []).map((id: string) => ({
            id,
            type: "USER",
          }))) {
          targets.push({
            recipientId: recipient.id,
            recipientType: recipient.type === "BUSINESS" ? "BUSINESS" : "USER",
            type: "NEW_MESSAGE",
            title: `Tin nhắn mới từ ${payload.message?.senderName ?? "HUKI"}`,
            message: this.preview(payload.message?.content),
            actionUrl: `/chat/${payload.conversationId}`,
          });
        }
        break;
      case "review.created":
        if (payload.storeOwnerId) {
          targets.push({
            recipientId: payload.storeOwnerId,
            recipientType: "BUSINESS",
            type: "NEW_REVIEW",
            title: "Có đánh giá mới",
            message: `Khách hàng vừa gửi đánh giá ${payload.rating} sao.`,
            actionUrl: `/reviews/${payload.reviewId}`,
          });
        }
        break;
      case "forum.comment.created":
        if (payload.recipientId && payload.recipientId !== payload.authorId) {
          targets.push({
            recipientId: payload.recipientId,
            recipientType: "USER",
            type: "FORUM_MENTION",
            title: "Có phản hồi mới",
            message: `${payload.authorName ?? "Một thành viên"} vừa phản hồi nội dung của bạn.`,
            actionUrl: `/forum/posts/${payload.postId}`,
          });
        }
        break;
    }
    return targets.filter(
      (target, index, all) =>
        all.findIndex(
          (item) =>
            item.recipientId === target.recipientId &&
            item.type === target.type,
        ) === index,
    );
  }

  private sellers(
    targets: Target[],
    payload: Record<string, any>,
    title: string,
  ) {
    for (const seller of payload.sellerOrders ?? []) {
      if (seller.ownerUserId)
        targets.push({
          recipientId: seller.ownerUserId,
          recipientType: "BUSINESS",
          type: "ORDER_STATUS",
          title,
          message: `Đơn hàng ${payload.orderCode ?? payload.orderId} đã được hủy.`,
          actionUrl: `/seller/orders/${seller.sellerOrderId}`,
        });
    }
  }

  private shippingTitle(eventType: string) {
    if (eventType === SHIPPING_EVENTS.CREATED) return "Đã tạo vận đơn";
    if (eventType === SHIPPING_EVENTS.DELIVERED) return "Giao hàng thành công";
    if (eventType === SHIPPING_EVENTS.FAILED)
      return "Giao hàng chưa thành công";
    return "Đơn hàng đang được giao";
  }

  private preview(content: unknown) {
    const text = typeof content === "string" ? content.trim() : "";
    return text ? text.slice(0, 160) : "Bạn có một tin nhắn mới.";
  }
}
