const jwt = require('../node_modules/jsonwebtoken');
const { io } = require('../../web/node_modules/socket.io-client');
const http = require('http');

const JWT_SECRET = '0521ab048d035a99b2c967bcadd4fb2bea5c6ed05b4dc7fe5cc129fe50051890d79a031d1a8c036b29e5b74dc82ab6b1e67cd5be3fb6a0838cb6bb9080f818c0';
const COMMUNITY_URL = 'http://localhost:3005/api/v1';
const SOCKET_URL = 'http://localhost:3005/notifications';

// 1. Create Actor Tokens
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
  console.log('===============================================================');
  console.log('   STEP 1 E2E TEST: UNIVERSAL NOTIFICATION DISPATCHER & SOCKET');
  console.log('===============================================================');

  const sockets = {};
  const receivedMessages = {
    admin: [],
    seller: [],
    shipper: [],
    user: [],
  };

  // Connect sockets for all 4 roles
  console.log('\n[1/5] Connecting 4 role sockets to /notifications...');
  for (const role of ['admin', 'seller', 'shipper', 'user']) {
    const socket = io(SOCKET_URL, {
      auth: { token: actors[role].token },
      transports: ['websocket'],
    });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Socket connection timed out for ${role}`)), 5000);
      socket.on('connect', () => {
        clearTimeout(timeout);
        console.log(`  ✓ ${role.toUpperCase()} socket connected (id: ${socket.id})`);
        resolve();
      });
      socket.on('connect_error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    socket.on('notification', (msg) => {
      receivedMessages[role].push(msg);
    });

    sockets[role] = socket;
  }

  await sleep(500);

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passedTests++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
    }
  }

  // TEST 1: Admin -> Broadcast to ALL
  console.log('\n[2/5] Test Case: Admin -> Broadcast to ALL (category: MANUAL_BROADCAST, priority: HIGH)...');
  receivedMessages.admin = [];
  receivedMessages.seller = [];
  receivedMessages.shipper = [];
  receivedMessages.user = [];

  const broadcastRes = await apiRequest('/notifications/dispatch', 'POST', actors.admin.token, {
    recipientId: '*',
    recipientType: 'ALL',
    type: 'BROADCAST',
    category: 'MANUAL_BROADCAST',
    priority: 'HIGH',
    title: 'Hệ thống bảo trì khẩn cấp',
    message: 'Toàn bộ hệ thống sẽ bảo trì nâng cấp trong 15 phút tới.',
  });

  assert(broadcastRes.status === 201, `Admin broadcast dispatch returns 201 (got ${broadcastRes.status})`);
  assert(broadcastRes.data?.data?.senderType === 'ADMIN', `SenderType is ADMIN`);
  assert(broadcastRes.data?.data?.category === 'MANUAL_BROADCAST', `Category is MANUAL_BROADCAST`);
  assert(broadcastRes.data?.data?.priority === 'HIGH', `Priority is HIGH`);

  await sleep(1000);

  assert(receivedMessages.admin.length >= 1, `Admin socket received broadcast`);
  assert(receivedMessages.seller.length >= 1, `Seller socket received broadcast`);
  assert(receivedMessages.shipper.length >= 1, `Shipper socket received broadcast`);
  assert(receivedMessages.user.length >= 1, `User socket received broadcast`);
  const broadcastNotificationId = broadcastRes.data?.data?.id;

  // TEST 2: Targeted Cross-Role Dispatches
  console.log('\n[3/5] Test Case: Cross-Role Targeted Dispatches...');

  // 2.1 Seller -> Shipper
  receivedMessages.shipper = [];
  receivedMessages.user = [];
  const sellerToShipperRes = await apiRequest('/notifications/dispatch', 'POST', actors.seller.token, {
    recipientId: actors.shipper.sub,
    recipientType: 'DELIVERY',
    type: 'ORDER_MESSAGE',
    category: 'MANUAL_DIRECT',
    priority: 'NORMAL',
    title: 'Đơn hàng #HK-8899 đã sẵn sàng',
    message: 'Shop đã đóng gói xong, mời anh shipper qua nhận kiện hàng nhé.',
  });

  assert(sellerToShipperRes.status === 201, `Seller -> Shipper dispatch returns 201`);
  assert(sellerToShipperRes.data?.data?.senderType === 'SELLER', `SenderType is SELLER`);
  await sleep(600);
  assert(receivedMessages.shipper.length >= 1, `Shipper received notification from Seller`);
  assert(receivedMessages.user.length === 0, `User did NOT receive Seller->Shipper message (isolation verified)`);

  // 2.2 Shipper -> User
  receivedMessages.user = [];
  receivedMessages.seller = [];
  const shipperToUserRes = await apiRequest('/notifications/dispatch', 'POST', actors.shipper.token, {
    recipientId: actors.user.sub,
    recipientType: 'USER',
    type: 'SHIPPING_UPDATE',
    category: 'MANUAL_DIRECT',
    priority: 'NORMAL',
    title: 'Shipper đang trên đường tới bạn',
    message: 'Tôi đang cách bạn khoảng 1km, bạn để ý điện thoại nhé.',
  });

  assert(shipperToUserRes.status === 201, `Shipper -> User dispatch returns 201`);
  assert(shipperToUserRes.data?.data?.senderType === 'SHIPPER', `SenderType is SHIPPER`);
  await sleep(600);
  assert(receivedMessages.user.length >= 1, `User received notification from Shipper`);
  assert(receivedMessages.seller.length === 0, `Seller did NOT receive Shipper->User message`);
  const userNotificationId = shipperToUserRes.data?.data?.id;

  // 2.3 User -> Admin
  receivedMessages.admin = [];
  const userToAdminRes = await apiRequest('/notifications/dispatch', 'POST', actors.user.token, {
    recipientId: 'admin_channel',
    recipientType: 'ADMIN',
    type: 'SYSTEM',
    category: 'MANUAL_DIRECT',
    priority: 'NORMAL',
    title: 'Yêu cầu hỗ trợ tài khoản',
    message: 'Em không nhận được mã OTP xác thực email, nhờ admin kiểm tra giùm.',
  });

  assert(userToAdminRes.status === 201, `User -> Admin dispatch returns 201`);
  assert(userToAdminRes.data?.data?.senderType === 'USER', `SenderType is USER`);
  await sleep(600);
  assert(receivedMessages.admin.length >= 1, `Admin received notification from User`);

  // TEST 3: Role & Security Constraints
  console.log('\n[4/5] Test Case: Role-Based Authorization & Security Guards...');

  // User attempts broadcast
  const userBroadcastAttempt = await apiRequest('/notifications/dispatch', 'POST', actors.user.token, {
    recipientId: '*',
    recipientType: 'ALL',
    type: 'BROADCAST',
    title: 'Spam broadcast',
    message: 'Should be rejected',
  });
  assert(userBroadcastAttempt.status === 403, `User broadcast attempt rejected with 403 Forbidden (got ${userBroadcastAttempt.status})`);

  // Seller attempts CRITICAL priority
  const sellerCriticalAttempt = await apiRequest('/notifications/dispatch', 'POST', actors.seller.token, {
    recipientId: actors.user.sub,
    recipientType: 'USER',
    type: 'SYSTEM',
    priority: 'CRITICAL',
    title: 'Critical priority fake',
    message: 'Should be rejected',
  });
  assert(sellerCriticalAttempt.status === 403, `Non-admin CRITICAL priority rejected with 403 Forbidden`);

  // User attempts to dispatch to illegal recipient
  const userIllegalAttempt = await apiRequest('/notifications/dispatch', 'POST', actors.user.token, {
    recipientId: 'some-other-user',
    recipientType: 'USER',
    type: 'SYSTEM',
    title: 'Direct User-to-User',
    message: 'Users cannot directly spam other users via notification dispatcher',
  });
  assert(userIllegalAttempt.status === 403, `User cannot send to arbitrary USER via notification dispatcher`);

  // TEST 4: Listing, Independent Read Status & Mark as Read
  console.log('\n[5/5] Test Case: Notifications List, Filters & Independent Read States...');

  // User list check
  const userListRes = await apiRequest('/notifications?limit=20', 'GET', actors.user.token);
  assert(userListRes.status === 200, `User notification list returns 200`);
  const initialUnreadRes = await apiRequest('/notifications/unread-count', 'GET', actors.user.token);
  const userUnread = initialUnreadRes.data?.data?.count ?? userListRes.data?.summary?.unreadCount ?? 0;
  assert(userUnread >= 2, `User unreadCount includes direct and broadcast (got ${userUnread})`);

  // Category filter
  const userBroadcastFilter = await apiRequest('/notifications?category=MANUAL_BROADCAST', 'GET', actors.user.token);
  assert(userBroadcastFilter.data?.data?.length >= 1, `Category filtering works (found ${userBroadcastFilter.data?.data?.length} MANUAL_BROADCAST)`);

  // Mark direct notification as read
  if (userNotificationId) {
    const markDirectRes = await apiRequest(`/notifications/${userNotificationId}/read`, 'PATCH', actors.user.token);
    assert(markDirectRes.status === 200 && markDirectRes.data?.data?.isRead === true, `Mark direct notification as read succeeded`);
  }

  // Mark broadcast notification as read for USER only
  if (broadcastNotificationId) {
    const markBroadcastRes = await apiRequest(`/notifications/${broadcastNotificationId}/read`, 'PATCH', actors.user.token);
    assert(markBroadcastRes.status === 200 && markBroadcastRes.data?.data?.isRead === true, `User marked broadcast notification as read`);

    // Verify Seller STILL sees broadcast notification as UNREAD (independent read state per user!)
    const sellerListRes = await apiRequest('/notifications?limit=10', 'GET', actors.seller.token);
    const sellerBroadcastItem = sellerListRes.data?.data?.find((n) => n.id === broadcastNotificationId);
    assert(sellerBroadcastItem && sellerBroadcastItem.isRead === false, `Broadcast notification remains unread for Seller (multi-user readBy isolated)`);
  }

  // Mark all read for User
  const markAllRes = await apiRequest('/notifications/read-all', 'POST', actors.user.token);
  assert(markAllRes.status === 200, `User mark-all-read succeeded (status ${markAllRes.status})`);
  const finalUnreadRes = await apiRequest('/notifications/unread-count', 'GET', actors.user.token);
  const finalCount = finalUnreadRes.data?.data?.count ?? 0;
  assert(finalCount === 0, `User final unreadCount is 0 (got ${finalCount})`);

  // Close sockets
  for (const role of Object.keys(sockets)) {
    sockets[role].disconnect();
  }

  console.log('\n===============================================================');
  console.log(`   E2E TEST RESULT: ${passedTests}/${totalTests} TESTS PASSED`);
  if (passedTests === totalTests) {
    console.log('   >>> ALL STEP 1 UNIVERSAL NOTIFICATION CHECKS PASSED 100% <<<');
  } else {
    console.log('   >>> SOME CHECKS FAILED - REVIEW LOGS <<<');
  }
  console.log('===============================================================\n');

  process.exit(passedTests === totalTests ? 0 : 1);
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
