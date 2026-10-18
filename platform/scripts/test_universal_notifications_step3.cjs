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
  console.log('========================================================================');
  console.log('   STEP 3 E2E TEST: AUTO WATCHDOG ENGINE & REALTIME SYSTEM ANOMALIES');
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

  // 1. Setup Socket.io Connections for all 4 roles
  console.log('--- 1. Connecting 4 Actors to Realtime Socket.io (/notifications) ---');
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

  // Wait for sockets to connect
  await sleep(1500);
  for (const role of Object.keys(actors)) {
    assert(sockets[role].connected, `Socket for ${role.toUpperCase()} connected successfully`);
  }

  // 2. Authorization Security Check on POST /notifications/watchdog/scan
  console.log('\n--- 2. RBAC Security Check: Only ADMIN can trigger Watchdog scan ---');
  const userScan = await apiRequest('/notifications/watchdog/scan', 'POST', actors.user.token, {});
  assert(userScan.status === 403, 'Normal USER triggering scan is rejected with HTTP 403 Forbidden');

  const sellerScan = await apiRequest('/notifications/watchdog/scan', 'POST', actors.seller.token, {});
  assert(sellerScan.status === 403, 'SELLER triggering scan is rejected with HTTP 403 Forbidden');

  const shipperScan = await apiRequest('/notifications/watchdog/scan', 'POST', actors.shipper.token, {});
  assert(shipperScan.status === 403, 'SHIPPER triggering scan is rejected with HTTP 403 Forbidden');

  // 3. Test Rule 1: Order SLA Watchdog (>24h unconfirmed)
  console.log('\n--- 3. Testing Rule 1: Order SLA Watchdog (>24h Unconfirmed) ---');
  // Clear previous message queues
  for (const k of Object.keys(receivedMessages)) receivedMessages[k] = [];

  const now = Date.now();
  const testCycleId = `test-cycle-${now}`;
  const testOrderId = `order-sla-${now}`;
  const testOrderCode = `ORD-${String(now).slice(-6)}`;
  const orderSlaPayload = {
    cycleId: testCycleId,
    orders: [
      {
        orderId: testOrderId,
        orderCode: testOrderCode,
        storeId: actors.seller.storeId,
        storeName: 'Alpha Bookshop',
        createdAt: new Date(now - 30 * 60 * 60 * 1000).toISOString(), // 30 hours ago (>24h)
        status: 'PENDING',
      },
    ],
  };

  const slaScanRes = await apiRequest('/notifications/watchdog/scan', 'POST', actors.admin.token, orderSlaPayload);
  assert(slaScanRes.status === 200, 'Admin successfully triggered Order SLA Watchdog scan');
  assert(slaScanRes.data.data.orderSlaAlerts === 2, 'Watchdog generated 2 alerts for Order SLA violation (Seller + Admin)');

  await sleep(600);
  // Verify Seller received HIGH priority alert
  const sellerSlaMsg = receivedMessages.seller.find((m) => m.payload?.orderId === testOrderId);
  assert(!!sellerSlaMsg, 'Seller received realtime socket alert for SLA violation');
  if (sellerSlaMsg) {
    assert(sellerSlaMsg.priority === 'HIGH', 'Seller SLA alert has HIGH priority');
    assert(sellerSlaMsg.category === 'AUTO_WATCHDOG', 'Seller SLA alert category is AUTO_WATCHDOG');
    assert(sellerSlaMsg.senderType === 'SYSTEM', 'Seller SLA alert sender is SYSTEM');
    assert(sellerSlaMsg.actionUrl === '/seller/orders', 'Seller SLA alert links to /seller/orders');
  }

  // Verify Admin received NORMAL priority oversight alert
  const adminSlaMsg = receivedMessages.admin.find((m) => m.payload?.orderId === testOrderId);
  assert(!!adminSlaMsg, 'Admin received realtime socket oversight alert for SLA violation');
  if (adminSlaMsg) {
    assert(adminSlaMsg.priority === 'NORMAL', 'Admin SLA oversight alert has NORMAL priority');
    assert(adminSlaMsg.category === 'AUTO_WATCHDOG', 'Admin SLA oversight alert category is AUTO_WATCHDOG');
  }

  // 4. Test Rule 2: Shipping Delay Watchdog (>48h In Transit)
  console.log('\n--- 4. Testing Rule 2: Shipping Delay Watchdog (>48h In Transit) ---');
  for (const k of Object.keys(receivedMessages)) receivedMessages[k] = [];

  const testShipmentId = `ship-${now}`;
  const testTrackingCode = `TRK-${String(now).slice(-6)}`;
  const shippingDelayPayload = {
    cycleId: testCycleId,
    shipments: [
      {
        shipmentId: testShipmentId,
        trackingCode: testTrackingCode,
        orderCode: testOrderCode,
        shipperId: actors.shipper.sub,
        storeId: actors.seller.storeId,
        lastUpdateAt: new Date(now - 52 * 60 * 60 * 1000).toISOString(), // 52 hours ago (>48h)
      },
    ],
  };

  const shipScanRes = await apiRequest('/notifications/watchdog/scan', 'POST', actors.admin.token, shippingDelayPayload);
  assert(shipScanRes.status === 200, 'Admin successfully triggered Shipping Delay Watchdog scan');
  assert(shipScanRes.data.data.shippingDelayAlerts === 2, 'Watchdog generated 2 alerts for Shipping Delay (Shipper + Seller)');

  await sleep(600);
  const shipperDelayMsg = receivedMessages.shipper.find((m) => m.payload?.shipmentId === testShipmentId);
  assert(!!shipperDelayMsg, 'Shipper received realtime socket alert for Shipping Delay');
  if (shipperDelayMsg) {
    assert(shipperDelayMsg.priority === 'HIGH', 'Shipper Delay alert has HIGH priority');
    assert(shipperDelayMsg.category === 'AUTO_WATCHDOG', 'Shipper Delay alert category is AUTO_WATCHDOG');
    assert(shipperDelayMsg.actionUrl === '/shipper/orders', 'Shipper Delay alert links to /shipper/orders');
  }

  const sellerDelayMsg = receivedMessages.seller.find((m) => m.payload?.shipmentId === testShipmentId);
  assert(!!sellerDelayMsg, 'Seller received realtime socket notification about delayed shipment');

  // 5. Test Rule 3: Low Stock Watchdog (<5 units)
  console.log('\n--- 5. Testing Rule 3: Low Stock Watchdog (<5 units) ---');
  for (const k of Object.keys(receivedMessages)) receivedMessages[k] = [];

  const testBookId = `book-${now}`;
  const lowStockPayload = {
    cycleId: testCycleId,
    lowStocks: [
      {
        bookId: testBookId,
        bookTitle: 'Lập Trình Hướng Đối Tượng Nâng Cao',
        storeId: actors.seller.storeId,
        availableStock: 2, // < 5 units
      },
    ],
  };

  const stockScanRes = await apiRequest('/notifications/watchdog/scan', 'POST', actors.admin.token, lowStockPayload);
  assert(stockScanRes.status === 200, 'Admin successfully triggered Low Stock Watchdog scan');
  assert(stockScanRes.data.data.lowStockAlerts === 1, 'Watchdog generated 1 alert for Low Stock threshold violation');

  await sleep(600);
  const sellerStockMsg = receivedMessages.seller.find((m) => m.payload?.bookId === testBookId);
  assert(!!sellerStockMsg, 'Seller received realtime socket alert for Low Stock');
  if (sellerStockMsg) {
    assert(sellerStockMsg.priority === 'HIGH', 'Seller Low Stock alert has HIGH priority');
    assert(sellerStockMsg.title.includes('sắp hết'), 'Seller Low Stock alert title contains "sắp hết"');
  }

  // 6. Test Rule 4: Payment Security Watchdog (>=3 consecutive failures)
  console.log('\n--- 6. Testing Rule 4: Payment Security Watchdog (>=3 consecutive failures) ---');
  for (const k of Object.keys(receivedMessages)) receivedMessages[k] = [];

  const paymentPayload = {
    cycleId: testCycleId,
    paymentFailures: [
      {
        userId: actors.user.sub,
        failCount: 4, // >= 3
        lastAttemptAt: new Date().toISOString(),
      },
    ],
  };

  const payScanRes = await apiRequest('/notifications/watchdog/scan', 'POST', actors.admin.token, paymentPayload);
  assert(payScanRes.status === 200, 'Admin successfully triggered Payment Security Watchdog scan');
  assert(payScanRes.data.data.paymentFailureAlerts === 1, 'Watchdog generated 1 alert for Payment Security Risk');

  await sleep(600);
  const userPayMsg = receivedMessages.user.find((m) => m.payload?.failCount === 4);
  assert(!!userPayMsg, 'User (Buyer) received realtime socket security warning for multiple payment failures');
  if (userPayMsg) {
    assert(userPayMsg.priority === 'HIGH', 'Payment security warning has HIGH priority');
    assert(userPayMsg.title.includes('thanh toán'), 'Title contains "thanh toán"');
  }

  // 7. Test Rule 5: Microservice Health Probe (Downtime alert -> CRITICAL to Admin)
  console.log('\n--- 7. Testing Rule 5: Microservice Health Watchdog (Downtime Alert) ---');
  for (const k of Object.keys(receivedMessages)) receivedMessages[k] = [];

  const downtimePayload = {
    cycleId: testCycleId,
    serviceChecks: [
      {
        serviceName: 'promotion',
        port: 3007,
        isDown: true,
        errorMessage: 'ECONNREFUSED 127.0.0.1:3007 (Simulated Outage)',
      },
    ],
  };

  const downScanRes = await apiRequest('/notifications/watchdog/scan', 'POST', actors.admin.token, downtimePayload);
  assert(downScanRes.status === 200, 'Admin successfully triggered Microservice Health Watchdog scan');
  assert(downScanRes.data.data.serviceHealthAlerts === 1, 'Watchdog generated 1 alert for Microservice Downtime');

  await sleep(600);
  const adminDownMsg = receivedMessages.admin.find((m) => m.payload?.serviceName === 'promotion');
  assert(!!adminDownMsg, 'Admin received realtime socket alert for Microservice Downtime');
  if (adminDownMsg) {
    assert(adminDownMsg.priority === 'CRITICAL', 'Microservice Downtime alert has CRITICAL priority');
    assert(adminDownMsg.title.includes('Báo động đỏ'), 'Admin alert title contains "Báo động đỏ"');
    assert(adminDownMsg.category === 'AUTO_WATCHDOG', 'Category is AUTO_WATCHDOG');
  }

  // 8. Idempotency & Deduplication Check (No spam within same hour bucket)
  console.log('\n--- 8. Testing Idempotency & Deduplication (sourceKey deduplication) ---');
  for (const k of Object.keys(receivedMessages)) receivedMessages[k] = [];

  // Re-run the exact same downtime and low stock scan with the same testCycleId
  const duplicateScanRes = await apiRequest('/notifications/watchdog/scan', 'POST', actors.admin.token, {
    cycleId: testCycleId,
    ...lowStockPayload,
    ...downtimePayload,
  });
  assert(duplicateScanRes.status === 200, 'Duplicate scan executed successfully');
  assert(duplicateScanRes.data.data.alertsGenerated === 0, 'Deduplication works: 0 new alerts generated for same anomalies in same cycle');

  await sleep(400);
  assert(receivedMessages.seller.length === 0, 'No duplicate socket events sent to Seller');
  assert(receivedMessages.admin.length === 0, 'No duplicate socket events sent to Admin');

  // 9. REST API Filtering: Query Watchdog category and CRITICAL priority
  console.log('\n--- 9. Testing REST API Notification Filters (Category & Priority) ---');
  const adminWatchdogs = await apiRequest('/notifications?category=AUTO_WATCHDOG&limit=10', 'GET', actors.admin.token);
  assert(adminWatchdogs.status === 200, 'Admin successfully retrieved AUTO_WATCHDOG category notifications');
  const watchdogItems = Array.isArray(adminWatchdogs.data?.data) ? adminWatchdogs.data.data : [];
  assert(watchdogItems.length > 0, `Returned at least 1 AUTO_WATCHDOG item (found ${watchdogItems.length})`);
  assert(watchdogItems.every((it) => it.category === 'AUTO_WATCHDOG'), 'All retrieved items have category AUTO_WATCHDOG');

  const adminCriticals = await apiRequest('/notifications?priority=CRITICAL&limit=10', 'GET', actors.admin.token);
  assert(adminCriticals.status === 200, 'Admin successfully filtered by priority=CRITICAL');
  const criticalItems = Array.isArray(adminCriticals.data?.data) ? adminCriticals.data.data : [];
  assert(criticalItems.some((it) => it.priority === 'CRITICAL'), 'Contains CRITICAL priority notifications');

  // Disconnect sockets
  for (const s of Object.values(sockets)) {
    s.disconnect();
  }

  console.log('\n========================================================================');
  console.log(`   STEP 3 TEST SUMMARY: ${passedAssertions}/${totalAssertions} PASSED (${Math.round((passedAssertions/totalAssertions)*100)}%)`);
  console.log('========================================================================\n');

  if (passedAssertions === totalAssertions) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error in Step 3 E2E test:', err);
  process.exit(1);
});
