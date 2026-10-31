/**
 * Order SLA Watchdog & Background Penalty Service (Frontend / Client Engine)
 * Implements POL-07 (Section 12: 24h confirmation SLA & 48h auto-cancellation)
 * and POL-16 (Platform Moderation & Progressive Penalty System).
 */

import { sellerPenaltyService } from './sellerPenaltyService';
import { realtimeSyncBus } from './realtimeSyncBus';

export interface SlaMonitoredOrder {
  id: string;
  code: string;
  storeId: string;
  storeName?: string;
  createdAt: string | Date;
  status: string;
  grandTotal?: number;
}

const PENALIZED_ORDERS_STORAGE_KEY = 'huki_sla_penalized_orders_v1';

class OrderSlaWatchdogService {
  private penalizedOrders: Map<string, { lateShipment?: boolean; nonFulfillment?: boolean }> = new Map();
  private isScanning = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.loadPenalizedFromStorage();
    if (typeof window !== 'undefined') {
      // Run background scan every 30 seconds
      this.intervalId = setInterval(() => {
        this.runScan();
      }, 30000);

      // Listen to Realtime Events
      realtimeSyncBus.subscribe((msg) => {
        if (msg.type === 'TRIGGER_ORDER_SLA_SCAN') {
          this.runScan();
        }
      });
    }
  }

  private loadPenalizedFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(PENALIZED_ORDERS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.penalizedOrders = new Map(Object.entries(parsed));
      }
    } catch {}
  }

  private savePenalizedToStorage() {
    if (typeof window === 'undefined') return;
    try {
      const obj = Object.fromEntries(this.penalizedOrders);
      localStorage.setItem(PENALIZED_ORDERS_STORAGE_KEY, JSON.stringify(obj));
    } catch {}
  }

  /**
   * Check a list of orders against 24h & 48h SLA rules
   */
  public async evaluateOrders(orders: SlaMonitoredOrder[]): Promise<{
    lateShipmentPenalties: number;
    cancelledOrders: number;
  }> {
    if (this.isScanning) return { lateShipmentPenalties: 0, cancelledOrders: 0 };
    this.isScanning = true;

    let lateShipmentPenalties = 0;
    let cancelledOrders = 0;

    try {
      const now = Date.now();

      for (const order of orders) {
        // Only evaluate unconfirmed orders
        if (order.status !== 'PENDING_CONFIRMATION' && order.status !== 'PENDING_PAYMENT') {
          continue;
        }

        const createdAtTime = new Date(order.createdAt).getTime();
        const diffHours = (now - createdAtTime) / (1000 * 60 * 60);
        const orderKey = order.code || order.id;
        const currentPenalties = this.penalizedOrders.get(orderKey) || {};

        // -------------------------------------------------------------
        // 1. 24-HOUR SLA RULE (POL-07 Section 12 & POL-16)
        // -------------------------------------------------------------
        if (diffHours >= 24 && !currentPenalties.lateShipment) {
          // Record 1 penalty point (LATE_SHIPMENT) in sellerPenaltyService
          sellerPenaltyService.recordViolation(
            order.storeId,
            'LATE_SHIPMENT',
            1,
            `Đơn hàng #${order.code || order.id} quá 24h chưa được gian hàng xác nhận đóng gói theo chính sách POL-07`,
            { orderId: order.code || order.id }
          );

          currentPenalties.lateShipment = true;
          this.penalizedOrders.set(orderKey, currentPenalties);
          lateShipmentPenalties++;

          // Send warning notification to SELLER
          realtimeSyncBus.publish('ORDER_SLA_WATCHDOG_ALERT', {
            id: `sla-seller-24h-${order.id}-${Date.now()}`,
            recipientType: 'BUSINESS',
            recipientId: order.storeId,
            title: `⚠️ Cảnh báo Sao Quả Tạ: Đơn hàng #${order.code || order.id} quá hạn 24h`,
            message: `Gian hàng chưa xác nhận đơn #${order.code || order.id} sau 24h kể từ khi thanh toán. Hệ thống đã tự động ghi nhận +1 điểm Sao Quả Tạ theo chính sách POL-07 & POL-16. Vui lòng xác nhận và đóng gói ngay để tránh bị hủy đơn tự động sau 48h!`,
            category: 'AUTO_WATCHDOG',
            type: 'WATCHDOG_ALERT',
            actionUrl: `/seller/orders?tab=PENDING_CONFIRMATION&highlight=${order.code || order.id}`,
            actionLabel: 'Xác nhận & đóng gói ngay',
            createdAt: new Date().toISOString(),
            isRead: false,
            payload: {
              orderId: order.id,
              orderCode: order.code,
              storeId: order.storeId,
              diffHours,
              penaltyPoints: 1,
              violationType: 'LATE_SHIPMENT',
            },
          });

          // Send supervision audit notification to ADMIN
          realtimeSyncBus.publish('ORDER_SLA_WATCHDOG_ALERT', {
            id: `sla-admin-24h-${order.id}-${Date.now()}`,
            recipientType: 'ADMIN',
            recipientId: 'admin_channel',
            title: `[Giám sát SLA] Gian hàng ${order.storeName || order.storeId} trễ hạn đơn #${order.code || order.id} (> 24h)`,
            message: `Gian hàng ${order.storeName || order.storeId} chưa xử lý đơn #${order.code || order.id} sau 24h. Hệ thống đã tự động ghi nhận +1 điểm Sao Quả Tạ.`,
            category: 'AUTO_WATCHDOG',
            type: 'WATCHDOG_ALERT',
            actionUrl: `/admin/penalty-arbitration?storeId=${order.storeId}`,
            actionLabel: 'Xem Trọng Tài Sao Quả Tạ',
            createdAt: new Date().toISOString(),
            isRead: false,
            payload: {
              orderId: order.id,
              orderCode: order.code,
              storeId: order.storeId,
              isSlaViolation: true,
              penaltyPoints: 1,
            },
          });
        }

        // -------------------------------------------------------------
        // 2. 48-HOUR SLA RULE (POL-07 Section 12 Auto-Cancellation)
        // -------------------------------------------------------------
        if (diffHours >= 48 && !currentPenalties.nonFulfillment) {
          // Record 2 penalty points (NON_FULFILLMENT)
          sellerPenaltyService.recordViolation(
            order.storeId,
            'NON_FULFILLMENT',
            2,
            `Hệ thống tự động hủy đơn #${order.code || order.id} do người bán không xác nhận sau 48h theo chính sách POL-07`,
            { orderId: order.code || order.id }
          );

          currentPenalties.nonFulfillment = true;
          this.penalizedOrders.set(orderKey, currentPenalties);
          cancelledOrders++;

          // Auto-cancel notification to SELLER
          realtimeSyncBus.publish('ORDER_SLA_WATCHDOG_ALERT', {
            id: `sla-seller-48h-${order.id}-${Date.now()}`,
            recipientType: 'BUSINESS',
            recipientId: order.storeId,
            title: `🚫 Tự động hủy đơn #${order.code || order.id}: Quá hạn 48h`,
            message: `Đơn hàng #${order.code || order.id} đã bị hủy do không xác nhận đóng gói sau 48h. Hệ thống đã phạt gian hàng +2 điểm Sao Quả Tạ (Tỷ lệ đơn hàng không hoàn tất NFR) theo POL-07.`,
            category: 'AUTO_WATCHDOG',
            type: 'WATCHDOG_ALERT',
            actionUrl: `/seller/orders?tab=CANCELLED`,
            actionLabel: 'Xem đơn đã hủy',
            createdAt: new Date().toISOString(),
            isRead: false,
            payload: {
              orderId: order.id,
              orderCode: order.code,
              storeId: order.storeId,
              status: 'CANCELLED_BY_SELLER_TIMEOUT',
              penaltyPoints: 2,
              violationType: 'NON_FULFILLMENT',
            },
          });

          // Notification to ADMIN
          realtimeSyncBus.publish('ORDER_SLA_WATCHDOG_ALERT', {
            id: `sla-admin-48h-${order.id}-${Date.now()}`,
            recipientType: 'ADMIN',
            recipientId: 'admin_channel',
            title: `[Tự Động Hủy Đơn] Hủy đơn #${order.code || order.id} của gian hàng ${order.storeName || order.storeId}`,
            message: `Hệ thống đã tự động hủy đơn #${order.code || order.id} do quá hạn 48h không xác nhận và hoàn tiền cho người mua (+2 điểm Sao Quả Tạ).`,
            category: 'AUTO_WATCHDOG',
            type: 'WATCHDOG_ALERT',
            actionUrl: `/admin/penalty-arbitration?storeId=${order.storeId}`,
            actionLabel: 'Xem Trọng Tài Sao Quả Tạ',
            createdAt: new Date().toISOString(),
            isRead: false,
            payload: {
              orderId: order.id,
              orderCode: order.code,
              storeId: order.storeId,
              isSlaViolation: true,
              penaltyPoints: 2,
            },
          });
        }
      }

      this.savePenalizedToStorage();
    } finally {
      this.isScanning = false;
    }

    return { lateShipmentPenalties, cancelledOrders };
  }

  /**
   * Run background scan against local cache / known orders
   */
  public async runScan(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      // Check stored orders
      const stored = localStorage.getItem('huki_seller_orders_cache');
      if (stored) {
        const orders = JSON.parse(stored);
        if (Array.isArray(orders)) {
          await this.evaluateOrders(orders);
        }
      }
    } catch {}
  }
}

export const orderSlaWatchdogService = new OrderSlaWatchdogService();
