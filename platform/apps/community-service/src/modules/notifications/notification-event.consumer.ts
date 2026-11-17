import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import {
  DomainEvent,
  ORDER_EVENTS,
  PAYMENT_EVENTS,
  RabbitMqEventBus,
  SHIPPING_EVENTS,
} from '@huki/shared';
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
    "review.replied",
    "penalty.added",
    "penalty.appeal_reviewed",
    "flash_sale.early_ending_scheduled",
    "flash_sale.cancelled",
    "flash_sale.registered",
    "flash_sale.item_cancelled",
    "flash_sale.paused",
    "flash_sale.grace_started",
    "flash_sale.resumed",
    "flash_sale.status_changed",
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
        targets.push({
          recipientId: "DELIVERY",
          recipientType: "DELIVERY",
          type: "SHIPPING_UPDATE",
          title: "Đơn hàng mới sẵn sàng giao",
          message: `Shop vừa đóng gói xong đơn hàng ${code}. Vào nhận đơn ngay!`,
          actionUrl: `/shipper/orders`,
        });
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
            actionUrl: `/seller/reviews?reviewId=${payload.reviewId}`,
          });
        }
        if (payload.authorId) {
          targets.push({
            recipientId: payload.authorId,
            recipientType: "USER",
            type: "NEW_REVIEW",
            title: "Đánh giá của bạn đã được ghi nhận",
            message: `Cảm ơn bạn đã gửi đánh giá ${payload.rating} sao. Ý kiến của bạn giúp cộng đồng độc giả chọn sách tốt hơn!`,
            actionUrl: payload.targetType === 'BOOK' ? `/books/${payload.targetId}` : `/orders`,
          });
        }
        break;
      case "review.replied":
        if (payload.userId) {
          targets.push({
            recipientId: payload.userId,
            recipientType: "USER",
            type: "NEW_REVIEW",
            title: `${payload.storeName || 'Người bán'} đã phản hồi đánh giá của bạn`,
            message: this.preview(payload.content),
            actionUrl: payload.bookId ? `/books/${payload.bookId}` : `/orders`,
          });
        }
        break;
      case "penalty.added":
        if (payload.sellerOwnerUserId || payload.storeOwnerId) {
          targets.push({
            recipientId: payload.sellerOwnerUserId || payload.storeOwnerId,
            recipientType: "BUSINESS",
            type: "STORE_PENALTY" as any,
            title: `Cảnh báo: Bạn bị cộng ${payload.points} điểm phạt`,
            message: `Lý do: ${payload.reason || 'Vi phạm chính sách vận hành sàn'}. Vui lòng kiểm tra mục Sao quả tạ.`,
            actionUrl: `/seller/penalties`,
          });
        }
        break;
      case "penalty.appeal_reviewed":
        if (payload.sellerOwnerUserId || payload.storeOwnerId) {
          const isApproved = payload.decision === 'APPROVED';
          targets.push({
            recipientId: payload.sellerOwnerUserId || payload.storeOwnerId,
            recipientType: "BUSINESS",
            type: "STORE_PENALTY" as any,
            title: isApproved ? "Kháng nghị điểm phạt được chấp thuận" : "Kháng nghị điểm phạt bị từ chối",
            message: payload.adminNote || (isApproved ? "Điểm phạt đã được thu hồi." : "Quyết định xử phạt được giữ nguyên."),
            actionUrl: `/seller/penalties`,
          });
        }
        break;
      case "flash_sale.early_ending_scheduled": {
        const slotName = payload.flashSaleName || payload.name || "Khung Giờ Flash Sale";
        const title = `⚡ Flash Sale "${slotName}" sẽ kết thúc sớm sau 5 phút!`;
        const sellerMsg = `Sàn HUKI đã lên lịch kết thúc sớm khung giờ Flash Sale "${slotName}" sau 5 phút. Quý Shop có sản phẩm tham gia vui lòng theo dõi và xử lý các đơn hàng phát sinh trước khi giá ưu đãi đóng lại.`;
        const buyerMsg = `Khung giờ Flash Sale "${slotName}" sẽ kết thúc trong 5 phút nữa. Hãy nhanh tay hoàn tất thanh toán trước khi giá ưu đãi đóng lại!`;

        // 1. ONLY notify participating stores (do NOT broadcast to unrelated sellers)
        const storeIds: string[] = payload.participatingStoreIds || [];
        for (const storeId of storeIds) {
          targets.push({
            recipientId: storeId,
            recipientType: "BUSINESS",
            type: "PROMOTION" as any,
            title,
            message: sellerMsg,
            actionUrl: "/seller/promotions",
          });
        }

        // 2. Broadcast to Buyer/Public channel so all shoppers see the 5-minute countdown alert
        targets.push({
          recipientId: "public_broadcast",
          recipientType: "USER",
          type: "PROMOTION" as any,
          title,
          message: buyerMsg,
          actionUrl: "/flash-sale",
        });

        // 3. Notify admin channel
        targets.push({
          recipientId: "admin_channel",
          recipientType: "ADMIN",
          type: "PROMOTION" as any,
          title: `🛑 Flash Sale "${slotName}" đã kích hoạt kết thúc sớm (5 phút)`,
          message: `Quản trị viên đã kích hoạt kết thúc sớm khung giờ "${slotName}". Phiên sẽ tự động đóng vào lúc ${new Date(payload.endsAt).toLocaleTimeString("vi-VN")}.`,
          actionUrl: "/admin/flash-sales",
        });
        break;
      }
      case "flash_sale.cancelled": {
        const slotName = payload.flashSaleName || payload.name || "Khung Giờ Flash Sale";
        const title = `❌ Flash Sale "${slotName}" đã được hủy`;
        const message = `Khung giờ Flash Sale "${slotName}" đã được hủy bởi Ban quản trị sàn HUKI.`;

        // ONLY notify participating stores
        const storeIds: string[] = payload.participatingStoreIds || [];
        for (const storeId of storeIds) {
          targets.push({
            recipientId: storeId,
            recipientType: "BUSINESS",
            type: "PROMOTION" as any,
            title,
            message,
            actionUrl: "/seller/promotions",
          });
        }

        targets.push({
          recipientId: "admin_channel",
          recipientType: "ADMIN",
          type: "PROMOTION" as any,
          title,
          message,
          actionUrl: "/admin/flash-sales",
        });
        break;
      }
      case "flash_sale.registered": {
        const slotName = payload.flashSaleName || "Khung Giờ Flash Sale";
        const count = payload.registeredCount || 1;
        targets.push({
          recipientId: "admin_channel",
          recipientType: "ADMIN",
          type: "PROMOTION" as any,
          title: `⚡ Gian hàng vừa đăng ký ${count} sách vào Flash Sale`,
          message: `Gian hàng đã đăng ký tham gia thành công ${count} cuốn sách vào đợt Flash Sale "${slotName}".`,
          actionUrl: "/admin/flash-sales",
        });
        break;
      }
      case "flash_sale.item_cancelled": {
        const slotName = payload.flashSaleName || "Khung Giờ Flash Sale";
        targets.push({
          recipientId: "admin_channel",
          recipientType: "ADMIN",
          type: "PROMOTION" as any,
          title: `⚡ Sản phẩm đã được rút khỏi Flash Sale`,
          message: `Một sản phẩm đã được hủy đăng ký khỏi khung giờ "${slotName}".`,
          actionUrl: "/admin/flash-sales",
        });
        if (payload.storeId) {
          targets.push({
            recipientId: payload.storeId,
            recipientType: "BUSINESS",
            type: "PROMOTION" as any,
            title: `Đã hủy sách khỏi Flash Sale`,
            message: `Sách của bạn đã được rút khỏi khung giờ "${slotName}" và trở về trạng thái nguyên bản thành công.`,
            actionUrl: "/seller/promotions/flash-sale",
          });
        }
        break;
      }
      case "flash_sale.paused":
      case "flash_sale.grace_started":
      case "flash_sale.resumed":
      case "flash_sale.status_changed": {
        const slotName = payload.flashSaleName || payload.name || "Khung Giờ Flash Sale";
        const isGrace = event.eventType === "flash_sale.grace_started";
        const isPaused = event.eventType === "flash_sale.paused";
        const isResumed = event.eventType === "flash_sale.resumed";

        const title = isGrace
          ? `⚡ Flash Sale "${slotName}" sắp tạm dừng sau 2 phút`
          : isPaused
          ? `⏸️ Flash Sale "${slotName}" đã tạm dừng`
          : isResumed
          ? `⚡ Flash Sale "${slotName}" đã mở bán lại (Live)`
          : `⚡ Trạng thái Flash Sale "${slotName}" đã thay đổi`;

        const message = isGrace
          ? `Sàn HUKI đã lên lịch tạm dừng khung giờ Flash Sale "${slotName}" sau 2 phút. Khách hàng đang ở giỏ hàng có 2 phút để hoàn tất đơn hàng.`
          : isPaused
          ? `Sàn HUKI đã tạm dừng khung giờ Flash Sale "${slotName}". Các sản phẩm tham gia của Shop tạm thời quay về giá gốc niêm yết.`
          : isResumed
          ? `Sàn HUKI đã kích hoạt mở bán lại khung giờ Flash Sale "${slotName}". Sách tham gia của Shop đã áp dụng lại giá ưu đãi Flash Sale.`
          : `Khung giờ Flash Sale "${slotName}" đã chuyển sang trạng thái ${payload.status}.`;

        const actionUrl = `/seller/promotions`;

        const storeIds: string[] = payload.participatingStoreIds || [];
        if (storeIds.length > 0) {
          for (const storeId of storeIds) {
            targets.push({
              recipientId: storeId,
              recipientType: "BUSINESS",
              type: "PROMOTION" as any,
              title,
              message,
              actionUrl,
            });
          }
        }
        // Broadcast to seller_channel so all online sellers receive the realtime pop-up
        targets.push({
          recipientId: "seller_channel",
          recipientType: "BUSINESS",
          type: "PROMOTION" as any,
          title,
          message,
          actionUrl,
        });

        // Also notify admin_channel
        targets.push({
          recipientId: "admin_channel",
          recipientType: "ADMIN",
          type: "PROMOTION" as any,
          title,
          message,
          actionUrl: "/admin/flash-sales",
        });
        break;
      }
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
