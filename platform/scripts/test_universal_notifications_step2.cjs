const jwt = require('../node_modules/jsonwebtoken');
const { io } = require('../../web/node_modules/socket.io-client');
const http = require('http');

const JWT_SECRET = '0521ab048d035a99b2c967bcadd4fb2bea5c6ed05b4dc7fe5cc129fe50051890d79a031d1a8c036b29e5b74dc82ab6b1e67cd5be3fb6a0838cb6bb9080f818c0';
const COMMUNITY_URL = 'http://localhost:3005/api/v1';
const SOCKET_URL = 'http://localhost:3005/notifications';

// 1. Create Actor Tokens for all 4 roles
const actors = {
  admin: {
    sub: 'admin-header-test-id',
    email: 'admin_header@huki.com',
    fullName: 'Admin Quản Trị Sàn',
    role: 'PLATFORM_ADMIN',
  },
  seller: {
    sub: 'seller-header-test-id',
    email: 'seller_header@huki.com',
    fullName: 'Alpha Books Store',
    role: 'BUSINESS',
    storeId: 'store-header-test-01',
  },
  shipper: {
    sub: 'shipper-header-test-id',
    email: 'shipper_header@huki.com',
    fullName: 'Nguyễn Văn Giao (Bưu tá)',
    role: 'DELIVERY_STAFF',
  },
  user: {
    sub: 'user-header-test-id',
    email: 'buyer_header@huki.com',
    fullName: 'Lê Thu Trang (Người mua)',
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
      { method, headers },
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

async function runStep2Tests() {
  console.log('===============================================================');
  console.log('   STEP 2 E2E TEST: REALTIME HEADER BELL & MULTI-ROLE HUB');
  console.log('===============================================================');

  const sockets = {};
  const receivedEvents = {
    admin: [],
    seller: [],
    shipper: [],
    user: [],
  };

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

  // 1. Establish simultaneous Socket connections for all 4 role headers
  console.log('\n[1/4] Establishing Realtime Sockets for 4 Header variants (Buyer, Seller, Shipper, Admin)...');
  for (const role of ['admin', 'seller', 'shipper', 'user']) {
    const socket = io(SOCKET_URL, {
      auth: { token: actors[role].token },
      transports: ['websocket'],
    });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Timeout connecting ${role}`)), 5000);
      socket.on('connect', () => {
        clearTimeout(timeout);
        console.log(`  ✓ ${role.toUpperCase()} Header socket connected (socketId: ${socket.id})`);
        resolve();
      });
      socket.on('connect_error', reject);
    });

    socket.on('notification', (data) => {
      receivedEvents[role].push(data);
    });

    sockets[role] = socket;
  }

  await sleep(400);

  // Clear previous notifications for clean test baseline
  for (const role of ['admin', 'seller', 'shipper', 'user']) {
    await apiRequest('/notifications/read-all', 'POST', actors[role].token);
  }

  // Check initial unread counts
  console.log('\n[2/4] Verifying Initial Header Badge Counters...');
  for (const role of ['admin', 'seller', 'shipper', 'user']) {
    const res = await apiRequest('/notifications/unread-count', 'GET', actors[role].token);
    const count = res.data?.data?.count ?? 0;
    assert(res.status === 200 && count === 0, `${role.toUpperCase()} initial unread badge is 0`);
  }

  // 2. Realtime Dispatch: Cross-Header Push & Badge Invalidation
  console.log('\n[3/4] Testing Realtime Cross-Header Notifications & Badges...');

  // Test 2.1: Seller sends to Shipper
  receivedEvents.shipper = [];
  receivedEvents.user = [];
  const sellerToShipperRes = await apiRequest('/notifications/dispatch', 'POST', actors.seller.token, {
    recipientId: actors.shipper.sub,
    recipientType: 'DELIVERY',
    type: 'ORDER_STATUS',
    category: 'MANUAL_DIRECT',
    priority: 'HIGH',
    title: 'Đơn hàng #HK-9921 cần lấy gấp',
    message: 'Khách yêu cầu giao trước 17h chiều nay, nhờ shipper hỗ trợ ưu tiên.',
    actionUrl: '/shipper/orders/HK-9921',
  });

  assert(sellerToShipperRes.status === 201, `Seller dispatched delivery notification to Shipper Header`);
  await sleep(600);

  assert(receivedEvents.shipper.length === 1, `Shipper Header socket received notification in realtime`);
  assert(receivedEvents.shipper[0]?.actionUrl === '/shipper/orders/HK-9921', `Notification contains correct actionUrl for quick navigation`);
  assert(receivedEvents.user.length === 0, `User Header did NOT receive notification (isolation intact)`);

  const shipperUnreadRes = await apiRequest('/notifications/unread-count', 'GET', actors.shipper.token);
  assert(shipperUnreadRes.data?.data?.count === 1, `Shipper Header unread badge incremented to 1`);

  const userUnreadRes = await apiRequest('/notifications/unread-count', 'GET', actors.user.token);
  assert(userUnreadRes.data?.data?.count === 0, `User Header badge remained 0`);

  // Test 2.2: Shipper sends to Buyer
  receivedEvents.user = [];
  const shipperToBuyerRes = await apiRequest('/notifications/dispatch', 'POST', actors.shipper.token, {
    recipientId: actors.user.sub,
    recipientType: 'USER',
    type: 'SHIPPING_UPDATE',
    category: 'MANUAL_DIRECT',
    priority: 'NORMAL',
    title: 'Shipper đã đến cổng chung cư',
    message: 'Chào bạn, mình đang đứng ở sảnh A chung cư, bạn xuống nhận sách nhé.',
    actionUrl: '/account/orders',
  });

  assert(shipperToBuyerRes.status === 201, `Shipper dispatched arrival notification to Buyer Header`);
  await sleep(600);

  assert(receivedEvents.user.length === 1, `Buyer Header socket received arrival notification in realtime`);
  const buyerUnreadRes = await apiRequest('/notifications/unread-count', 'GET', actors.user.token);
  assert(buyerUnreadRes.data?.data?.count === 1, `Buyer Header unread badge incremented to 1`);

  // Test 2.3: Admin sends Broadcast with CRITICAL Priority to ALL
  receivedEvents.admin = [];
  receivedEvents.seller = [];
  receivedEvents.shipper = [];
  receivedEvents.user = [];

  const adminBroadcastRes = await apiRequest('/notifications/dispatch', 'POST', actors.admin.token, {
    recipientId: '*',
    recipientType: 'ALL',
    type: 'BROADCAST',
    category: 'MANUAL_BROADCAST',
    priority: 'CRITICAL',
    title: 'Bảo trì hệ thống thanh toán khẩn cấp',
    message: 'Cổng thanh toán tạm dừng 10 phút để nâng cấp băng thông.',
    actionUrl: '/announcements/maintenance',
  });

  assert(adminBroadcastRes.status === 201, `Admin broadcast dispatched successfully`);
  await sleep(700);

  assert(receivedEvents.admin.length >= 1, `Admin Header received broadcast`);
  assert(receivedEvents.seller.length >= 1, `Seller Header received broadcast`);
  assert(receivedEvents.shipper.length >= 1, `Shipper Header received broadcast`);
  assert(receivedEvents.user.length >= 1, `Buyer Header received broadcast`);
  assert(receivedEvents.user[0]?.priority === 'CRITICAL', `Received broadcast carries CRITICAL priority (triggers siren sound & persistent toast)`);

  // 3. Mark as Read & Badge Reset Testing
  console.log('\n[4/4] Testing Header Dropdown Mark-as-Read & Counter Resets...');

  const buyerDirectNotiId = shipperToBuyerRes.data?.data?.id;
  if (buyerDirectNotiId) {
    const markRes = await apiRequest(`/notifications/${buyerDirectNotiId}/read`, 'PATCH', actors.user.token);
    assert(markRes.status === 200, `Buyer marked single notification as read`);

    const updatedBuyerUnread = await apiRequest('/notifications/unread-count', 'GET', actors.user.token);
    assert(updatedBuyerUnread.data?.data?.count === 1, `Buyer unread badge decreased by 1 (only broadcast remains)`);
  }

  // Buyer calls read-all
  const buyerReadAllRes = await apiRequest('/notifications/read-all', 'POST', actors.user.token);
  assert(buyerReadAllRes.status === 200, `Buyer Header executed Mark All As Read`);
  const finalBuyerUnread = await apiRequest('/notifications/unread-count', 'GET', actors.user.token);
  assert(finalBuyerUnread.data?.data?.count === 0, `Buyer Header unread badge completely reset to 0`);

  // Verify Seller still has unread broadcast (isolated read state)
  const sellerUnread = await apiRequest('/notifications/unread-count', 'GET', actors.seller.token);
  assert(sellerUnread.data?.data?.count >= 1, `Seller Header still has unread broadcast (readBy isolation verified)`);

  // Shipper calls read-all
  const shipperReadAllRes = await apiRequest('/notifications/read-all', 'POST', actors.shipper.token);
  assert(shipperReadAllRes.status === 200, `Shipper Header executed Mark All As Read`);
  const finalShipperUnread = await apiRequest('/notifications/unread-count', 'GET', actors.shipper.token);
  assert(finalShipperUnread.data?.data?.count === 0, `Shipper Header unread badge reset to 0`);

  // Close all sockets
  for (const role of Object.keys(sockets)) {
    sockets[role].disconnect();
  }

  console.log('\n===============================================================');
  console.log(`   E2E STEP 2 RESULT: ${passedTests}/${totalTests} TESTS PASSED`);
  if (passedTests === totalTests) {
    console.log('   >>> ALL STEP 2 REALTIME HEADER BELL CHECKS PASSED 100% <<<');
  } else {
    console.log('   >>> SOME CHECKS FAILED - REVIEW LOGS <<<');
  }
  console.log('===============================================================\n');

  process.exit(passedTests === totalTests ? 0 : 1);
}

runStep2Tests().catch((err) => {
  console.error('Fatal Step 2 test runner error:', err);
  process.exit(1);
});
