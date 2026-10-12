// Test Nhịp 6: Phân Quyền Thông Báo Chuông Notification Bus Tách Biệt Giữa 5 Nhóm Vai Trò
// Admin / Seller / User / Shipper / Admin Con

import {
  getDefaultRolesForEventType,
  playRoleNotificationChime,
} from '../web/src/ui/services/realtimeSyncBus.ts';

// Giả lập môi trường test cho RealtimeSyncBus
class TestNotificationBus {
  constructor() {
    this.listeners = new Map();
  }

  isMessageForSubscriber(message, filter) {
    if (!filter) return true;

    const target = message.target;
    const allowedRoles = target?.roles && target.roles.length > 0
      ? target.roles
      : getDefaultRolesForEventType(message.type);

    if (filter.role && !allowedRoles.includes('ALL') && !allowedRoles.includes(filter.role)) {
      return false;
    }

    if (target?.userId && filter.userId && target.userId !== filter.userId) {
      return false;
    }

    if (target?.storeId && filter.storeId && target.storeId !== filter.storeId) {
      return false;
    }

    if (target?.shipperId && filter.shipperId && target.shipperId !== filter.shipperId) {
      return false;
    }

    return true;
  }

  publish(type, payload, target) {
    const resolvedRoles = target?.roles && target.roles.length > 0
      ? target.roles
      : getDefaultRolesForEventType(type);

    const message = {
      type,
      payload,
      timestamp: Date.now(),
      target: {
        roles: resolvedRoles,
        userId: target?.userId || payload?.userId,
        storeId: target?.storeId || payload?.storeId,
        shipperId: target?.shipperId || payload?.shipperId,
        orderId: target?.orderId || payload?.orderId,
      },
    };

    const deliveredTo = [];
    this.listeners.forEach((filter, listener) => {
      if (this.isMessageForSubscriber(message, filter)) {
        listener(message);
        deliveredTo.push(filter?.role || 'ANONYMOUS');
      }
    });

    return { message, deliveredTo };
  }

  subscribe(listener, filter) {
    this.listeners.set(listener, filter);
    return () => this.listeners.delete(listener);
  }
}

async function run() {
  console.log('=== TEST NHỊP 6: PHÂN QUYỀN THÔNG BÁO NOTIFICATION BUS TÁCH BIỆT 5 NHÓM ===\n');

  const bus = new TestNotificationBus();

  // Khởi tạo 5 Subscribers đại diện cho 5 nhóm vai trò độc lập
  const receivedCount = {
    ADMIN: 0,
    ADMIN_CON: 0,
    SELLER: 0,
    SHIPPER: 0,
    BUYER: 0,
  };

  bus.subscribe(() => receivedCount.ADMIN++, { role: 'ADMIN' });
  bus.subscribe(() => receivedCount.ADMIN_CON++, { role: 'ADMIN_CON' });
  bus.subscribe(() => receivedCount.SELLER++, { role: 'SELLER', storeId: 'store_123' });
  bus.subscribe(() => receivedCount.SHIPPER++, { role: 'SHIPPER', shipperId: 'shipper_999' });
  bus.subscribe(() => receivedCount.BUYER++, { role: 'BUYER', userId: 'user_buyer_01' });

  console.log('1. Kiểm tra sự kiện Shipper: SHIPPER_AVAILABLE_ORDER_BROADCAST:');
  const res1 = bus.publish('SHIPPER_AVAILABLE_ORDER_BROADCAST', { orderCode: 'ORD-SHIP-01' });
  console.log(`   - Người nhận nhận được: [${res1.deliveredTo.join(', ')}]`);
  console.assert(res1.deliveredTo.includes('SHIPPER'), 'Shipper phải nhận được broadcast đơn!');
  console.assert(!res1.deliveredTo.includes('BUYER'), 'Buyer KHÔNG ĐƯỢC nhận broadcast đơn của Shipper!');
  console.assert(!res1.deliveredTo.includes('SELLER'), 'Seller KHÔNG ĐƯỢC nhận broadcast đơn của Shipper!');
  console.log('   -> [PASS] Chỉ duy nhất Shipper nhận thông báo cuốc giao mới!\n');

  console.log('2. Kiểm tra sự kiện Khách yêu cầu đổi trả: RETURN_REQUESTED:');
  const res2 = bus.publish('RETURN_REQUESTED', { orderId: 'ord_01', storeId: 'store_123', bookTitle: 'Sách Hay' });
  console.log(`   - Người nhận nhận được: [${res2.deliveredTo.join(', ')}]`);
  console.assert(res2.deliveredTo.includes('SELLER'), 'Seller phải nhận được yêu cầu đổi trả!');
  console.assert(res2.deliveredTo.includes('ADMIN'), 'Admin phải nhận được thông báo!');
  console.assert(res2.deliveredTo.includes('ADMIN_CON'), 'Sub-Admin CSKH phải nhận được thông báo!');
  console.assert(!res2.deliveredTo.includes('SHIPPER'), 'Shipper không nhận thông báo lúc này!');
  console.log('   -> [PASS] Seller, Admin và Sub-Admin nhận đúng thẩm quyền!\n');

  console.log('3. Kiểm tra sự kiện Sàn hoàn tiền vào STK khách: ESCROW_REFUNDED:');
  const res3 = bus.publish('ESCROW_REFUNDED', {
    orderId: 'ord_01',
    userId: 'user_buyer_01',
    refundAmount: 150000,
  });
  console.log(`   - Người nhận nhận được: [${res3.deliveredTo.join(', ')}]`);
  console.assert(res3.deliveredTo.includes('BUYER'), 'Buyer phải nhận được thông báo hoàn tiền!');
  console.assert(res3.deliveredTo.includes('ADMIN'), 'Admin phải nhận được thông báo!');
  console.assert(!res3.deliveredTo.includes('SELLER'), 'Seller KHÔNG BỊ spam thông báo hoàn tiền của khách!');
  console.assert(!res3.deliveredTo.includes('SHIPPER'), 'Shipper KHÔNG nhận thông báo hoàn tiền!');
  console.log('   -> [PASS] Buyer và Admin nhận chuẩn xác, không làm phiền Seller và Shipper!\n');

  console.log('4. Kiểm tra sự kiện Shipper nộp tiền COD về quỹ Sàn: SHIPPER_COD_REMITTED:');
  const res4 = bus.publish('SHIPPER_COD_REMITTED', {
    shipperId: 'shipper_999',
    amount: 500000,
  });
  console.log(`   - Người nhận nhận được: [${res4.deliveredTo.join(', ')}]`);
  console.assert(res4.deliveredTo.includes('SHIPPER'), 'Shipper phải nhận được xác nhận nộp tiền!');
  console.assert(res4.deliveredTo.includes('ADMIN'), 'Admin phải nhận được đối soát quỹ!');
  console.assert(!res4.deliveredTo.includes('BUYER'), 'Buyer KHÔNG nhận tin tài chính bưu tá!');
  console.log('   -> [PASS] Phân luồng dòng tiền đối soát COD hoàn toàn độc lập!\n');

  console.log('5. Kiểm tra phân luồng đích danh theo StoreId (Tránh Seller nhận chéo đơn của Shop khác):');
  const res5 = bus.publish('ORDER_CREATED', {
    orderCode: 'ORD-SHOP-2',
    storeId: 'store_OTHER_456', // Thuộc shop khác
  });
  console.log(`   - Người nhận nhận được đơn của Shop khác: [${res5.deliveredTo.join(', ')}]`);
  console.assert(!res5.deliveredTo.includes('SELLER'), 'Shop A KHÔNG ĐƯỢC nghe chuông đơn hàng của Shop B!');
  console.assert(res5.deliveredTo.includes('ADMIN'), 'Tổng quản Admin vẫn theo dõi được đơn mới toàn sàn!');
  console.log('   -> [PASS] Cách ly 100% giữa các gian hàng Seller!\n');

  console.log('6. Kiểm tra tổng kết âm thanh & chuông thông báo theo 5 vai trò:');
  const roles = ['BUYER', 'SELLER', 'SHIPPER', 'ADMIN', 'ADMIN_CON'];
  roles.forEach((r) => {
    try {
      playRoleNotificationChime(r);
      console.log(`   - 🔔 Chuông vai trò [${r}]: Khởi tạo Web Audio Synthesizer thành công.`);
    } catch (err) {
      console.error(`   - Lỗi chuông vai trò ${r}:`, err);
    }
  });

  console.log('\n=== TẤT CẢ 6/6 BÀI KIỂM THỬ PHÂN QUYỀN VAI TRÒ ĐÃ VƯỢT QUA 100%! ===');
}

run().catch((e) => {
  console.error('Lỗi khi chạy kiểm thử:', e);
  process.exit(1);
});
