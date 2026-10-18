const jwt = require('../node_modules/jsonwebtoken');
const { io } = require('../../web/node_modules/socket.io-client');
const http = require('http');

const JWT_SECRET = '0521ab048d035a99b2c967bcadd4fb2bea5c6ed05b4dc7fe5cc129fe50051890d79a031d1a8c036b29e5b74dc82ab6b1e67cd5be3fb6a0838cb6bb9080f818c0';
const COMMUNITY_URL = 'http://localhost:3005/api/v1';
const SOCKET_URL = 'http://localhost:3005/notifications';

// 1. Create Actor Tokens for all 4 roles
const actors = {
  admin: {
    sub: 'admin-test-uuid',
    email: 'admin@huki.com',
    fullName: 'System Platform Admin',
    role: 'PLATFORM_ADMIN',
  },
  seller: {
    sub: 'seller-test-uuid',
    email: 'seller@huki.com',
    fullName: 'Alpha Bookshop',
    role: 'BUSINESS',
    storeId: 'store-alpha-001',
    businessId: 'biz-alpha-001',
  },
  shipper: {
    sub: 'shipper-test-uuid',
    email: 'shipper@huki.com',
    fullName: 'Nguyễn Văn Giao (Shipper)',
    role: 'DELIVERY_STAFF',
  },
  user: {
    sub: 'user-test-uuid',
    email: 'buyer@huki.com',
    fullName: 'Trần Thị Mua (Buyer)',
    role: 'USER',
  },
};

for (const key of Object.keys(actors)) {
  actors[key].token = jwt.sign(actors[key], JWT_SECRET, { expiresIn: '1h' });
}

function apiRequest(path, method = 'GET', token, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(COMMUNITY_URL + (path.startsWith('/') ? path : '/' + path));
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = data;
          }
          resolve({ status: res.statusCode, data: parsed });
        });
      }
    );
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runTests() {
  console.log('========================================================================');
  console.log('   STEP 4 E2E TEST: ACTIVE CROSS-ROLE NOTIFICATIONS & BROADCAST CENTER');
  console.log('========================================================================\n');

  const sockets = {};
  const receivedMessages = {
    admin: [],
    seller: [],
    shipper: [],
    user: [],
  };

  let totalAssertions = 0;
  let passedAssertions = 0;

  function assert(condition, message) {
    totalAssertions++;
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passedAssertions++;
    } else {
      console.error(`  [FAIL] ${message}`);
    }
  }

  // 1. Connect All 4 Sockets
  console.log('--- 1. Connecting 4 Actors to Socket.io (/notifications) ---');
  for (const [role, actor] of Object.entries(actors)) {
    const s = io(SOCKET_URL, {
      auth: { token: actor.token },
      transports: ['websocket'],
    });

    s.on('notification', (notif) => {
      receivedMessages[role].push(notif);
    });

    sockets[role] = s;
  }

  await sleep(1500);
  for (const role of Object.keys(actors)) {
    assert(sockets[role].connected, `Socket for ${role.toUpperCase()} connected successfully`);
  }

  const now = Date.now();
  const testOrderCode = `ORD-${String(now).slice(-6)}`;
  const testOrderId = `order-${now}`;

  // 2. Test Case 1: Seller -> Shipper (Active Dispatch)
  console.log('\n--- 2. Active Interaction: Seller -> Shipper ---');
  for (const k of Object.keys(receivedMessages)) receivedMessages[k] = [];

  const sellerToShipperPayload = {
    recipientId: actors.shipper.sub,
    recipientType: 'DELIVERY',
    title: `📦 Lưu ý kiện hàng #${testOrderCode}: Sách quý / Bìa cứng`,
    message: `Đơn #${testOrderCode} có chứa sách bìa cứng dễ cấn móp góc. Nhờ bưu tá xếp cẩn thận giúp shop nhé!`,
    priority: 'HIGH',
    category: 'MANUAL_DIRECT',
    type: 'ORDER_MESSAGE',
    actionUrl: `/shipper/orders`,
    payload: { orderCode: testOrderCode, orderId: testOrderId, specialPackaging: true },
  };

  const s2shipRes = await apiRequest('/notifications/dispatch', 'POST', actors.seller.token, sellerToShipperPayload);
  assert(s2shipRes.status === 201, 'Seller dispatched active note to Shipper successfully (HTTP 201)');
  await sleep(600);

  const shipperReceived = receivedMessages.shipper.find((m) => m.payload?.orderCode === testOrderCode);
  assert(!!shipperReceived, 'Shipper received realtime socket notification from Seller');
  if (shipperReceived) {
    assert(shipperReceived.priority === 'HIGH', 'Notification priority is HIGH');
    assert(shipperReceived.senderType === 'SELLER', 'Sender type is SELLER');
    assert(shipperReceived.category === 'MANUAL_DIRECT', 'Category is MANUAL_DIRECT');
  }

  // 3. Test Case 2: Seller -> Buyer (Active Dispatch)
  console.log('\n--- 3. Active Interaction: Seller -> User (Buyer) ---');
  for (const k of Object.keys(receivedMessages)) receivedMessages[k] = [];

  const sellerToBuyerPayload = {
    recipientId: actors.user.sub,
    recipientType: 'USER',
    title: `✨ Đơn hàng #${testOrderCode} đã được shop kiểm tra & đóng gói kỹ`,
    message: `Sách của bạn đã được bọc xốp bóng khí 2 lớp kèm thẻ bookmark độc quyền từ shop. Sắp tới tay bạn nhé!`,
    priority: 'NORMAL',
    category: 'MANUAL_DIRECT',
    type: 'ORDER_MESSAGE',
    actionUrl: `/orders/${testOrderId}`,
    payload: { orderCode: testOrderCode, orderId: testOrderId },
  };

  const s2bRes = await apiRequest('/notifications/dispatch', 'POST', actors.seller.token, sellerToBuyerPayload);
  assert(s2bRes.status === 201, 'Seller dispatched active note to Buyer successfully (HTTP 201)');
  await sleep(600);

  const buyerFromSeller = receivedMessages.user.find((m) => m.payload?.orderCode === testOrderCode);
  assert(!!buyerFromSeller, 'Buyer received realtime socket notification from Seller');
  if (buyerFromSeller) {
    assert(buyerFromSeller.priority === 'NORMAL', 'Notification priority is NORMAL');
    assert(buyerFromSeller.senderType === 'SELLER', 'Sender type is SELLER');
  }

  // 4. Test Case 3: Shipper -> User (Buyer) (Active Dispatch)
  console.log('\n--- 4. Active Interaction: Shipper -> User (Buyer) ---');
  for (const k of Object.keys(receivedMessages)) receivedMessages[k] = [];

  const shipperToBuyerPayload = {
    recipientId: actors.user.sub,
    recipientType: 'USER',
    title: `🛵 Shipper đang trên đường tới giao đơn #${testOrderCode}`,
    message: `Bưu tá đang di chuyển tới địa chỉ nhận của bạn và sẽ có mặt sau khoảng 10 - 15 phút nữa.`,
    priority: 'HIGH',
    category: 'MANUAL_DIRECT',
    type: 'SHIPPING_UPDATE',
    actionUrl: `/orders/${testOrderId}`,
    payload: { orderCode: testOrderCode, orderId: testOrderId, etaMinutes: 15 },
  };

  const ship2bRes = await apiRequest('/notifications/dispatch', 'POST', actors.shipper.token, shipperToBuyerPayload);
  assert(ship2bRes.status === 201, 'Shipper dispatched active note to Buyer successfully (HTTP 201)');
  await sleep(600);

  const buyerFromShipper = receivedMessages.user.find((m) => m.payload?.etaMinutes === 15);
  assert(!!buyerFromShipper, 'Buyer received realtime socket alert from Shipper (ETA: 15 mins)');
  if (buyerFromShipper) {
    assert(buyerFromShipper.senderType === 'SHIPPER', 'Sender type is SHIPPER');
    assert(buyerFromShipper.priority === 'HIGH', 'Priority is HIGH');
  }

  // 5. Test Case 4: Shipper -> Seller (Active Anomaly Report)
  console.log('\n--- 5. Active Interaction: Shipper -> Seller (Anomaly Report) ---');
  for (const k of Object.keys(receivedMessages)) receivedMessages[k] = [];

  const shipperToSellerPayload = {
    recipientId: actors.seller.storeId,
    recipientType: 'BUSINESS',
    title: `📅 Khách hẹn lùi lịch nhận đơn #${testOrderCode}`,
    message: `Khách hàng bận việc đột xuất nên hẹn dời thời gian giao hàng sang ca sáng mai. Bưu tá sẽ tiếp tục lưu kho phát lại.`,
    priority: 'NORMAL',
    category: 'MANUAL_DIRECT',
    type: 'SHIPPING_UPDATE',
    actionUrl: `/seller/orders`,
    payload: { orderCode: testOrderCode, orderId: testOrderId, rescheduleDate: 'tomorrow' },
  };

  const ship2sRes = await apiRequest('/notifications/dispatch', 'POST', actors.shipper.token, shipperToSellerPayload);
  assert(ship2sRes.status === 201, 'Shipper reported anomaly to Seller successfully (HTTP 201)');
  await sleep(600);

  const sellerFromShipper = receivedMessages.seller.find((m) => m.payload?.rescheduleDate === 'tomorrow');
  assert(!!sellerFromShipper, 'Seller received realtime socket anomaly report from Shipper in store channel');
  if (sellerFromShipper) {
    assert(sellerFromShipper.senderType === 'SHIPPER', 'Sender type is SHIPPER');
  }

  // 6. Test Case 5: Buyer -> Seller (Active Packaging Note)
  console.log('\n--- 6. Active Interaction: Buyer -> Seller (Special Request) ---');
  for (const k of Object.keys(receivedMessages)) receivedMessages[k] = [];

  const buyerToSellerPayload = {
    recipientId: actors.seller.storeId,
    recipientType: 'BUSINESS',
    title: `🎁 Dặn dò đóng gói đơn #${testOrderCode}: Sách làm quà tặng`,
    message: `Shop đóng gói cẩn thận chống gãy mép bìa giúp mình nhé, mình mua làm quà tặng sinh nhật bạn!`,
    priority: 'NORMAL',
    category: 'MANUAL_DIRECT',
    type: 'ORDER_MESSAGE',
    actionUrl: `/seller/orders`,
    payload: { orderCode: testOrderCode, isGift: true },
  };

  const b2sRes = await apiRequest('/notifications/dispatch', 'POST', actors.user.token, buyerToSellerPayload);
  assert(b2sRes.status === 201, 'Buyer dispatched gift packaging note to Seller successfully (HTTP 201)');
  await sleep(600);

  const sellerFromBuyer = receivedMessages.seller.find((m) => m.payload?.isGift === true);
  assert(!!sellerFromBuyer, 'Seller received realtime socket gift request from Buyer');
  if (sellerFromBuyer) {
    assert(sellerFromBuyer.senderType === 'USER', 'Sender type is USER');
  }

  // 7. Test Case 6: Admin Broadcast Center (All 4 roles receive simultaneously)
  console.log('\n--- 7. Admin Broadcast Center: Multi-Role Systemwide Broadcast ---');
  for (const k of Object.keys(receivedMessages)) receivedMessages[k] = [];

  const broadcastPayload = {
    recipientId: '*',
    recipientType: 'ALL',
    title: `📢 Thông báo bảo trì nâng cấp cụm máy chủ DRMVault & Thanh toán #${now}`,
    message: `Ban Quản Trị HUKI xin thông báo bảo trì nâng cấp hạ tầng DRM từ 01:00 đến 03:00 sáng mai.`,
    priority: 'HIGH',
    category: 'MANUAL_BROADCAST',
    type: 'BROADCAST',
    actionUrl: `/notifications`,
    payload: { maintenanceTime: '01:00-03:00', broadcastId: `bc-${now}` },
  };

  const bcRes = await apiRequest('/notifications/dispatch', 'POST', actors.admin.token, broadcastPayload);
  assert(bcRes.status === 201, 'Admin dispatched systemwide broadcast successfully (HTTP 201)');
  const broadcastNotificationId = bcRes.data?.data?.id;

  await sleep(800);
  const adminBc = receivedMessages.admin.find((m) => m.payload?.broadcastId === `bc-${now}`);
  const sellerBc = receivedMessages.seller.find((m) => m.payload?.broadcastId === `bc-${now}`);
  const shipperBc = receivedMessages.shipper.find((m) => m.payload?.broadcastId === `bc-${now}`);
  const userBc = receivedMessages.user.find((m) => m.payload?.broadcastId === `bc-${now}`);

  assert(!!adminBc, 'Admin socket received systemwide broadcast');
  assert(!!sellerBc, 'Seller socket received systemwide broadcast');
  assert(!!shipperBc, 'Shipper socket received systemwide broadcast');
  assert(!!userBc, 'Buyer (User) socket received systemwide broadcast');

  // 8. Test Case 7: Independent Read State Verification on Broadcast
  console.log('\n--- 8. Independent Multi-Actor Read State Synchronization ---');
  if (broadcastNotificationId) {
    // User marks broadcast as read
    const userReadRes = await apiRequest(`/notifications/${broadcastNotificationId}/read`, 'PATCH', actors.user.token);
    assert(userReadRes.status === 200 && userReadRes.data.data.isRead === true, 'User marked broadcast notification as read');

    // Seller still has it as unread
    const sellerList = await apiRequest('/notifications?limit=10', 'GET', actors.seller.token);
    const sellerNotif = (sellerList.data?.data || []).find((n) => n.id === broadcastNotificationId);
    assert(sellerNotif && sellerNotif.isRead === false, 'Broadcast notification remains UNREAD for Seller (independent read isolation)');

    // Seller marks all read
    const sellerMarkAll = await apiRequest('/notifications/read-all', 'POST', actors.seller.token);
    assert(sellerMarkAll.status === 200, 'Seller marked all notifications as read');

    const sellerUnreadCheck = await apiRequest('/notifications/unread-count', 'GET', actors.seller.token);
    assert(sellerUnreadCheck.data?.data?.count === 0, 'Seller unread count verified as 0');
  }

  // Disconnect sockets
  for (const s of Object.values(sockets)) {
    s.disconnect();
  }

  console.log('\n========================================================================');
  console.log(`   STEP 4 TEST SUMMARY: ${passedAssertions}/${totalAssertions} PASSED (${Math.round((passedAssertions/totalAssertions)*100)}%)`);
  console.log('========================================================================\n');

  if (passedAssertions === totalAssertions) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error in Step 4 E2E test:', err);
  process.exit(1);
});
