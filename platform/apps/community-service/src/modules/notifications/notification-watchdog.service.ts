import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import * as http from "http";
import { NotificationDeliveryService } from "./notification-delivery.service";

export interface WatchdogOrderInput {
  orderId: string;
  orderCode: string;
  storeId: string;
  storeName?: string;
  createdAt: string | Date;
  status?: string;
}

export interface WatchdogShipmentInput {
  shipmentId: string;
  trackingCode: string;
  orderCode: string;
  shipperId: string;
  storeId: string;
  lastUpdateAt: string | Date;
}

export interface WatchdogLowStockInput {
  bookId: string;
  bookTitle: string;
  storeId: string;
  availableStock: number;
}

export interface WatchdogPaymentInput {
  userId: string;
  failCount: number;
  lastAttemptAt?: string | Date;
}

export interface WatchdogServiceCheckInput {
  serviceName: string;
  port: number;
  isDown?: boolean;
  errorMessage?: string;
}

export interface WatchdogScanInput {
  orders?: WatchdogOrderInput[];
  shipments?: WatchdogShipmentInput[];
  lowStocks?: WatchdogLowStockInput[];
  paymentFailures?: WatchdogPaymentInput[];
  serviceChecks?: WatchdogServiceCheckInput[];
  cycleId?: string;
}

export interface WatchdogScanResult {
  scannedAt: Date;
  alertsGenerated: number;
  orderSlaAlerts: number;
  shippingDelayAlerts: number;
  lowStockAlerts: number;
  paymentFailureAlerts: number;
  serviceHealthAlerts: number;
  details: Array<{ rule: string; targetId: string; recipientType: string; priority: string; title: string }>;
}

@Injectable()
export class NotificationWatchdogService {
  private readonly logger = new Logger(NotificationWatchdogService.name);

  constructor(
    private readonly delivery: NotificationDeliveryService,
    private readonly config: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleCron() {
    this.logger.log("Running scheduled Auto Watchdog scan...");
    try {
      const result = await this.scanAll();
      this.logger.log(`Watchdog scan completed: ${result.alertsGenerated} alerts generated.`);
    } catch (error) {
      this.logger.error(`Watchdog scan error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async scanAll(input?: WatchdogScanInput): Promise<WatchdogScanResult> {
    const hourBucket = input?.cycleId || new Date().toISOString().slice(0, 13); // e.g. "2026-10-18T23"
    const details: WatchdogScanResult["details"] = [];

    // 1. Order SLA Watchdog
    const orderAlerts = await this.checkOrderSla(input?.orders, hourBucket, details);

    // 2. Shipping Delay Watchdog
    const shippingAlerts = await this.checkShippingDelay(input?.shipments, hourBucket, details);

    // 3. Low Stock Watchdog
    const stockAlerts = await this.checkLowStock(input?.lowStocks, hourBucket, details);

    // 4. Payment Failure Watchdog
    const paymentAlerts = await this.checkPaymentSecurity(input?.paymentFailures, hourBucket, details);

    // 5. Service Health Watchdog
    const healthAlerts = await this.checkServiceHealth(input?.serviceChecks, hourBucket, details);

    const total = orderAlerts + shippingAlerts + stockAlerts + paymentAlerts + healthAlerts;

    return {
      scannedAt: new Date(),
      alertsGenerated: total,
      orderSlaAlerts: orderAlerts,
      shippingDelayAlerts: shippingAlerts,
      lowStockAlerts: stockAlerts,
      paymentFailureAlerts: paymentAlerts,
      serviceHealthAlerts: healthAlerts,
      details,
    };
  }

  async checkOrderSla(
    orders?: WatchdogOrderInput[],
    hourBucket: string = new Date().toISOString().slice(0, 13),
    details: WatchdogScanResult["details"] = [],
  ): Promise<number> {
    if (!orders || orders.length === 0) return 0;
    let count = 0;

    for (const order of orders) {
      const orderDate = new Date(order.createdAt);
      const diffHours = (Date.now() - orderDate.getTime()) / (1000 * 60 * 60);

      // Trigger if pending > 24h
      if (diffHours >= 24) {
        // Alert to Seller
        const sellerSourceKey = `watchdog-order-sla-seller-${order.orderId}-${hourBucket}`;
        const sellerAlert = await this.delivery.deliver({
          sourceKey: sellerSourceKey,
          recipientId: order.storeId,
          recipientType: "BUSINESS",
          senderType: "SYSTEM",
          senderName: "Hệ thống Bắt lỗi SLA",
          category: "AUTO_WATCHDOG",
          priority: "HIGH",
          type: "WATCHDOG_ALERT",
          title: `⚠️ Cảnh báo SLA: Đơn hàng #${order.orderCode} quá 24h chưa xử lý`,
          message: `Đơn hàng #${order.orderCode} được đặt từ ${orderDate.toLocaleString("vi-VN")} nhưng chưa được xác nhận/đóng gói. Vui lòng xử lý ngay để tránh bị phạt hủy đơn!`,
          actionUrl: `/seller/orders`,
          payload: { orderId: order.orderId, orderCode: order.orderCode, diffHours },
        });

        if (sellerAlert) {
          count++;
          details.push({
            rule: "ORDER_SLA",
            targetId: order.storeId,
            recipientType: "BUSINESS",
            priority: "HIGH",
            title: `⚠️ Cảnh báo SLA: Đơn hàng #${order.orderCode}`,
          });
        }

        // Alert to Admin
        const adminSourceKey = `watchdog-order-sla-admin-${order.orderId}-${hourBucket}`;
        const adminAlert = await this.delivery.deliver({
          sourceKey: adminSourceKey,
          recipientId: "admin_channel",
          recipientType: "ADMIN",
          senderType: "SYSTEM",
          senderName: "Hệ thống Bắt lỗi SLA",
          category: "AUTO_WATCHDOG",
          priority: "NORMAL",
          type: "WATCHDOG_ALERT",
          title: `📋 Giám sát SLA: Đơn hàng #${order.orderCode} chậm tiến độ`,
          message: `Gian hàng ${order.storeName || order.storeId} chưa xử lý đơn #${order.orderCode} sau 24h.`,
          actionUrl: `/admin/orders`,
          payload: { orderId: order.orderId, orderCode: order.orderCode, storeId: order.storeId },
        });

        if (adminAlert) count++;
      }
    }

    return count;
  }

  async checkShippingDelay(
    shipments?: WatchdogShipmentInput[],
    hourBucket: string = new Date().toISOString().slice(0, 13),
    details: WatchdogScanResult["details"] = [],
  ): Promise<number> {
    if (!shipments || shipments.length === 0) return 0;
    let count = 0;

    for (const shipment of shipments) {
      const updateDate = new Date(shipment.lastUpdateAt);
      const diffHours = (Date.now() - updateDate.getTime()) / (1000 * 60 * 60);

      if (diffHours >= 48) {
        // Alert to Shipper
        const shipperSourceKey = `watchdog-shipping-delay-shipper-${shipment.shipmentId}-${hourBucket}`;
        const shipperAlert = await this.delivery.deliver({
          sourceKey: shipperSourceKey,
          recipientId: shipment.shipperId,
          recipientType: "DELIVERY",
          senderType: "SYSTEM",
          senderName: "Giám sát Giao vận",
          category: "AUTO_WATCHDOG",
          priority: "HIGH",
          type: "WATCHDOG_ALERT",
          title: `⚠️ Cảnh báo giao vận: Kiện hàng #${shipment.trackingCode} trễ hạn (>48h)`,
          message: `Kiện hàng đã ở trạng thái giao hơn 48h chưa có xác nhận hoàn tất. Vui lòng liên hệ khách hoặc cập nhật trạng thái bưu tá!`,
          actionUrl: `/shipper/orders`,
          payload: { shipmentId: shipment.shipmentId, trackingCode: shipment.trackingCode },
        });

        if (shipperAlert) {
          count++;
          details.push({
            rule: "SHIPPING_DELAY",
            targetId: shipment.shipperId,
            recipientType: "DELIVERY",
            priority: "HIGH",
            title: `⚠️ Cảnh báo giao vận: Kiện hàng #${shipment.trackingCode}`,
          });
        }

        // Inform Seller
        const sellerSourceKey = `watchdog-shipping-delay-seller-${shipment.shipmentId}-${hourBucket}`;
        const sellerAlert = await this.delivery.deliver({
          sourceKey: sellerSourceKey,
          recipientId: shipment.storeId,
          recipientType: "BUSINESS",
          senderType: "SYSTEM",
          senderName: "Giám sát Giao vận",
          category: "AUTO_WATCHDOG",
          priority: "NORMAL",
          type: "WATCHDOG_ALERT",
          title: `📦 Thông báo giao vận: Kiện hàng #${shipment.trackingCode} giao trễ`,
          message: `Kiện hàng #${shipment.trackingCode} của đơn hàng #${shipment.orderCode} đang giao bị chậm hơn 48h.`,
          actionUrl: `/seller/orders`,
          payload: { shipmentId: shipment.shipmentId, orderCode: shipment.orderCode },
        });

        if (sellerAlert) count++;
      }
    }

    return count;
  }

  async checkLowStock(
    lowStocks?: WatchdogLowStockInput[],
    hourBucket: string = new Date().toISOString().slice(0, 13),
    details: WatchdogScanResult["details"] = [],
  ): Promise<number> {
    if (!lowStocks || lowStocks.length === 0) return 0;
    let count = 0;

    for (const item of lowStocks) {
      if (item.availableStock < 5) {
        const sourceKey = `watchdog-low-stock-${item.bookId}-${hourBucket}`;
        const alert = await this.delivery.deliver({
          sourceKey,
          recipientId: item.storeId,
          recipientType: "BUSINESS",
          senderType: "SYSTEM",
          senderName: "Cảnh báo Kho hàng",
          category: "AUTO_WATCHDOG",
          priority: "HIGH",
          type: "WATCHDOG_ALERT",
          title: `⚠️ Cảnh báo kho hàng: Tựa sách "${item.bookTitle}" sắp hết (< 5 cuốn)`,
          message: `Tựa sách "${item.bookTitle}" hiện chỉ còn ${item.availableStock} cuốn trong kho. Vui lòng nhập thêm hàng để không làm gián đoạn đơn sỉ/lẻ!`,
          actionUrl: `/seller/product`,
          payload: { bookId: item.bookId, availableStock: item.availableStock },
        });

        if (alert) {
          count++;
          details.push({
            rule: "LOW_STOCK",
            targetId: item.storeId,
            recipientType: "BUSINESS",
            priority: "HIGH",
            title: `⚠️ Cảnh báo kho: ${item.bookTitle}`,
          });
        }
      }
    }

    return count;
  }

  async checkPaymentSecurity(
    paymentFailures?: WatchdogPaymentInput[],
    hourBucket: string = new Date().toISOString().slice(0, 13),
    details: WatchdogScanResult["details"] = [],
  ): Promise<number> {
    if (!paymentFailures || paymentFailures.length === 0) return 0;
    let count = 0;

    for (const item of paymentFailures) {
      if (item.failCount >= 3) {
        const sourceKey = `watchdog-payment-fail-${item.userId}-${hourBucket}`;
        const alert = await this.delivery.deliver({
          sourceKey,
          recipientId: item.userId,
          recipientType: "USER",
          senderType: "SYSTEM",
          senderName: "An ninh Thanh toán",
          category: "AUTO_WATCHDOG",
          priority: "HIGH",
          type: "WATCHDOG_ALERT",
          title: `🔒 Cảnh báo thanh toán: Phát hiện nhiều giao dịch thất bại liên tiếp`,
          message: `Tài khoản của bạn ghi nhận ${item.failCount} giao dịch thanh toán không thành công. Vui lòng kiểm tra phương thức thanh toán hoặc liên hệ hỗ trợ nếu cần!`,
          actionUrl: `/account/orders`,
          payload: { failCount: item.failCount },
        });

        if (alert) {
          count++;
          details.push({
            rule: "PAYMENT_SECURITY",
            targetId: item.userId,
            recipientType: "USER",
            priority: "HIGH",
            title: `🔒 Cảnh báo thanh toán: ${item.failCount} lần thất bại`,
          });
        }
      }
    }

    return count;
  }

  async checkServiceHealth(
    serviceChecks?: WatchdogServiceCheckInput[],
    hourBucket: string = new Date().toISOString().slice(0, 13),
    details: WatchdogScanResult["details"] = [],
  ): Promise<number> {
    let count = 0;

    // Default microservices list to check
    const services = serviceChecks || [
      { serviceName: "identity", port: 3001 },
      { serviceName: "business", port: 3002 },
      { serviceName: "commerce", port: 3003 },
      { serviceName: "shipping", port: 3004 },
      { serviceName: "promotion", port: 3007 },
    ];

    for (const s of services) {
      let isDown = s.isDown ?? false;
      let errorMsg = s.errorMessage || "Service unavailable";

      if (s.isDown === undefined) {
        // Ping actual health endpoint
        isDown = await new Promise((resolve) => {
          const req = http.get(
            `http://localhost:${s.port}/api/v1/health`,
            { timeout: 2000 },
            (res) => {
              resolve(res.statusCode !== 200);
            },
          );
          req.on("error", (err) => {
            errorMsg = err.message;
            resolve(true);
          });
          req.on("timeout", () => {
            req.destroy();
            errorMsg = "Connection timeout (2000ms)";
            resolve(true);
          });
        });
      }

      if (isDown) {
        const sourceKey = `watchdog-downtime-${s.serviceName}-${hourBucket}`;
        const alert = await this.delivery.deliver({
          sourceKey,
          recipientId: "admin_channel",
          recipientType: "ADMIN",
          senderType: "SYSTEM",
          senderName: "Giám sát Hạ tầng Hệ thống",
          category: "AUTO_WATCHDOG",
          priority: "CRITICAL",
          type: "WATCHDOG_ALERT",
          title: `🚨 Báo động đỏ: Microservice ${s.serviceName.toUpperCase()} không phản hồi (Downtime)`,
          message: `Phát hiện gián đoạn kết nối tới dịch vụ ${s.serviceName} (Port ${s.port}). Chi tiết lỗi: ${errorMsg}. Quản trị viên vui lòng can thiệp khẩn cấp!`,
          actionUrl: `/admin/health`,
          payload: { serviceName: s.serviceName, port: s.port, errorMsg },
        });

        if (alert) {
          count++;
          details.push({
            rule: "SERVICE_DOWNTIME",
            targetId: "admin_channel",
            recipientType: "ADMIN",
            priority: "CRITICAL",
            title: `🚨 Báo động đỏ: ${s.serviceName.toUpperCase()} Downtime`,
          });
        }
      }
    }

    return count;
  }
}
