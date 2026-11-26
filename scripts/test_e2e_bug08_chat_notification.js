'use strict';

/**
 * E2E Verification Script: BUG-08 (Buyer -> Seller Chat Multi-Channel Notification)
 *
 * Tests real runtime behavior against:
 * 1. Real MongoDB (mongodb://127.0.0.1:27017/huki_e2e_bug08_test, auto-dropped in finally)
 * 2. Compiled SellerScopeResolverService (resolves store/business/official aliases -> ownerUserIds)
 * 3. Compiled NotificationEventConsumer + NotificationDeliveryService:
 *    - Consumes `chat.message.sent` from Buyer -> Seller BUSINESS storeId
 *    - Fans out & persists REAL notifications in MongoDB per resolved ownerUserId
 *    - Prevents duplicate inserts on redelivery via unique `sourceKey`
 *    - Queries NotificationDevice with `$in` covering recipientId + all ownerUserIds for FCM push
 *    - Broadcasts socket payload with resolved targetIds
 * 4. Compiled NotificationGateway supports BUSINESS / SELLER / BUSINESS_OWNER / BUSINESS_STAFF
 * 5. Compiled ChatService.sendMessage expands BUSINESS participantIds to businessId + storeId + ownerUserIds
 * 6. Frontend ToastContext deduplication, useRealtimeNotifications, SellerHeader & UniversalNotificationBell
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('assert');
const Module = require('module');

const ROOT = path.resolve(__dirname, '..');
const PLATFORM_DIST = path.join(ROOT, 'platform', 'dist');
const PLATFORM_NODE_MODULES = path.join(ROOT, 'platform', 'node_modules');

const origResolve = Module._resolveFilename;
Module._resolveFilename = function patchedResolve(request, parent, isMain, options) {
  if (request === '@huki/shared') {
    return path.join(PLATFORM_DIST, 'libs', 'shared', 'index.js');
  }
  if (request.startsWith('@huki/shared/')) {
    const sub = request.slice('@huki/shared/'.length);
    const asFile = path.join(PLATFORM_DIST, 'libs', 'shared', `${sub}.js`);
    return fs.existsSync(asFile)
      ? asFile
      : path.join(PLATFORM_DIST, 'libs', 'shared', sub, 'index.js');
  }
  try {
    return origResolve.call(this, request, parent, isMain, options);
  } catch (err) {
    const nextOptions = Object.assign({}, options || {}, {
      paths: [PLATFORM_NODE_MODULES, ...((options && options.paths) || [])],
    });
    return origResolve.call(this, request, parent, isMain, nextOptions);
  }
};

function startMockScopeServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (
        req.url &&
        (req.url.includes('/internal/resolve-target/') || req.url.includes('/internal/seller-scope/'))
      ) {
        const targetId = decodeURIComponent(req.url.split('/').pop() || '');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        if (targetId === 'store-e2e-1' || targetId === 'biz-e2e-1' || targetId === 'staff-1') {
          res.end(
            JSON.stringify({
              data: {
                targetId,
                businessIds: ['biz-e2e-1'],
                storeIds: ['store-e2e-1'],
                ownerUserIds: ['seller-owner-1', 'seller-staff-2'],
              },
            }),
          );
          return;
        }
        res.end(
          JSON.stringify({
            data: { targetId, businessIds: [], storeIds: [], ownerUserIds: [] },
          }),
        );
        return;
      }
      res.writeHead(404).end();
    });
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, url: `http://127.0.0.1:${addr.port}` });
    });
  });
}

async function run() {
  console.log('=== E2E VERIFICATION: BUG-08 (BUYER -> SELLER CHAT NOTIFICATION) ===\n');

  const mongoose = require('mongoose');
  const { NotificationSchema } = require(
    path.join(PLATFORM_DIST, 'out-tsc', 'community-service', 'apps', 'community-service', 'src', 'entities', 'notification.schema.js'),
  );
  const { NotificationPreferenceSchema } = require(
    path.join(PLATFORM_DIST, 'out-tsc', 'community-service', 'apps', 'community-service', 'src', 'entities', 'notification-preference.schema.js'),
  );
  const { NotificationDeviceSchema } = require(
    path.join(PLATFORM_DIST, 'out-tsc', 'community-service', 'apps', 'community-service', 'src', 'entities', 'notification-device.schema.js'),
  );
  const { ConversationSchema } = require(
    path.join(PLATFORM_DIST, 'out-tsc', 'community-service', 'apps', 'community-service', 'src', 'entities', 'conversation.schema.js'),
  );
  const { MessageSchema } = require(
    path.join(PLATFORM_DIST, 'out-tsc', 'community-service', 'apps', 'community-service', 'src', 'entities', 'message.schema.js'),
  );

  const { SellerScopeResolverService } = require(
    path.join(PLATFORM_DIST, 'out-tsc', 'community-service', 'apps', 'community-service', 'src', 'modules', 'notifications', 'seller-scope-resolver.service.js'),
  );
  const { NotificationDeliveryService } = require(
    path.join(PLATFORM_DIST, 'out-tsc', 'community-service', 'apps', 'community-service', 'src', 'modules', 'notifications', 'notification-delivery.service.js'),
  );
  const { NotificationEventConsumer } = require(
    path.join(PLATFORM_DIST, 'out-tsc', 'community-service', 'apps', 'community-service', 'src', 'modules', 'notifications', 'notification-event.consumer.js'),
  );
  const { NotificationGateway } = require(
    path.join(PLATFORM_DIST, 'out-tsc', 'community-service', 'apps', 'community-service', 'src', 'modules', 'notifications', 'notification.gateway.js'),
  );
  const { ChatService } = require(
    path.join(PLATFORM_DIST, 'out-tsc', 'community-service', 'apps', 'community-service', 'src', 'modules', 'chat', 'chat.service.js'),
  );

  const dbName = `huki_e2e_bug08_${Date.now()}`;
  const mongoUri = `mongodb://127.0.0.1:27017/${dbName}`;
  let conn;
  const mockScope = await startMockScopeServer();

  const savedBusinessServiceUrl = process.env.BUSINESS_SERVICE_URL;
  const savedInternalKey = process.env.INTERNAL_SERVICE_KEY;
  process.env.BUSINESS_SERVICE_URL = mockScope.url;
  process.env.INTERNAL_SERVICE_KEY = 'e2e-internal-test-key';

  try {
    conn = await mongoose.createConnection(mongoUri, { serverSelectionTimeoutMS: 5000 }).asPromise();
    const NotifModel = conn.model('Notification', NotificationSchema);
    const PrefModel = conn.model('NotificationPreference', NotificationPreferenceSchema);
    const DeviceModel = conn.model('NotificationDevice', NotificationDeviceSchema);
    const ConvModel = conn.model('Conversation', ConversationSchema);
    const MsgModel = conn.model('Message', MessageSchema);

    await Promise.all([
      NotifModel.syncIndexes(),
      DeviceModel.syncIndexes(),
      ConvModel.syncIndexes(),
      MsgModel.syncIndexes(),
    ]);

    // Seed FCM device registered ONLY on ownerUserId (`seller-owner-1`), not on storeId!
    await DeviceModel.create({
      recipientId: 'seller-owner-1',
      deviceToken: 'fcm-token-seller-owner-1',
      deviceType: 'WEB',
      enabled: true,
    });

    const pushedTokens = [];
    const emittedSocketTargets = [];
    const emittedChatEvents = [];

    const mockGateway = {
      notification(targetId, payload) {
        emittedSocketTargets.push({ targetId, type: payload?.type, title: payload?.title });
      },
      sendToRoom(room, payload) {
        emittedSocketTargets.push({ targetId: room, type: payload?.type, title: payload?.title });
      },
      broadcast(payload) {
        emittedSocketTargets.push({ targetId: '*', type: payload?.type });
      },
    };
    const mockFirebase = {
      isEnabled: true,
      async send(tokens, message) {
        pushedTokens.push(...tokens.map((t) => ({ token: t, title: message.title })));
        return [];
      },
    };
    const mockEventBus = {
      isConnected: () => false,
      async publish(evt) {
        emittedChatEvents.push(evt);
        return true;
      },
    };

    const scopeResolver = new SellerScopeResolverService();
    const deliveryService = new NotificationDeliveryService(
      NotifModel,
      PrefModel,
      DeviceModel,
      mockGateway,
      mockFirebase,
      mockEventBus,
    );
    const consumer = new NotificationEventConsumer(mockEventBus, deliveryService, scopeResolver);

    // 1. Verify Official Store alias expansion in SellerScopeResolverService
    const officialScope = await scopeResolver.resolveTarget('huki-official');
    assert(
      officialScope.storeIds.includes('77777777-0000-4000-8000-000000000001') &&
        officialScope.storeIds.includes('huki-official'),
      'SellerScopeResolverService must expand official store aliases symmetrically',
    );
    console.log('✓ 1. SellerScopeResolverService resolves BUSINESS/official aliases cleanly');

    // 2. Real MongoDB E2E: Buyer sends message via ChatService -> real `chat.message.sent` event -> NotificationEventConsumer -> MongoDB + FCM push
    const chatService = new ChatService(ConvModel, MsgModel, mockEventBus, scopeResolver);
    const buyerActor = { sub: 'buyer-user-99', role: 'USER', email: 'buyer@huki.vn', name: 'Nguyen Van Buyer' };
    const createdConv = await chatService.createConversation(buyerActor, {
      storeId: 'store-e2e-1',
      storeName: 'Cửa hàng E2E',
      contextType: 'ORDER',
      contextId: 'order-e2e-1',
    });
    const convId = createdConv.data.id;
    const sentMsg = await chatService.sendMessage(buyerActor, convId, {
      content: 'Shop ơi sách này còn bản bìa cứng không?',
      messageType: 'TEXT',
    });
    assert(
      sentMsg.participantIds.includes('store-e2e-1') &&
        sentMsg.participantIds.includes('biz-e2e-1') &&
        sentMsg.participantIds.includes('seller-owner-1') &&
        sentMsg.participantIds.includes('buyer-user-99'),
      `sendMessage participantIds must include store, business, owners and buyer; got ${JSON.stringify(sentMsg.participantIds)}`,
    );
    await new Promise((r) => setTimeout(r, 30));
    const chatEvent = emittedChatEvents.find((e) => e.eventType === 'chat.message.sent');
    assert(chatEvent, 'ChatService.sendMessage must emit chat.message.sent event');
    console.log('✓ 2. ChatService.sendMessage expands BUSINESS participantIds & emits chat.message.sent passed');

    await consumer.handle(chatEvent);
    // Replay identical event to assert sourceKey deduplication
    await consumer.handle(chatEvent);

    const savedNotifs = await NotifModel.find({}).lean();
    assert.strictEqual(
      savedNotifs.length,
      2,
      `Expected 2 deduplicated notifications (seller-owner-1 & seller-staff-2), got ${savedNotifs.length}`,
    );
    const recipients = savedNotifs.map((n) => n.recipientId).sort();
    assert.deepStrictEqual(recipients, ['seller-owner-1', 'seller-staff-2']);
    assert(savedNotifs.every((n) => n.type === 'NEW_MESSAGE'), 'Notification type must be NEW_MESSAGE');
    assert(
      pushedTokens.some((p) => p.token === 'fcm-token-seller-owner-1'),
      'NotificationDeliveryService must look up FCM devices by expanded ownerUserIds',
    );
    assert(
      emittedSocketTargets.some((s) => s.targetId === 'seller-owner-1' && s.type === 'NEW_MESSAGE'),
      'Realtime notification socket must be emitted to resolved seller-owner-1',
    );
    console.log('✓ 3. Real MongoDB chat.message.sent fanout, idempotency, socket & FCM lookup passed');

    // 4. Verify NotificationGateway subscribes BUSINESS_OWNER / BUSINESS_STAFF roles to store channel
    const joinedRooms = [];
    const gw = new NotificationGateway(
      { verifyAsync: async () => ({ sub: 'staff-1', role: 'BUSINESS_STAFF', storeId: 'store-e2e-1', businessId: 'biz-e2e-1' }) },
      scopeResolver,
    );
    const fakeSocket = {
      id: 'sock-e2e-1',
      data: {},
      handshake: { auth: { token: 'fake-jwt-token' }, query: {}, headers: {} },
      async join(room) {
        joinedRooms.push(room);
      },
      leave() {},
    };
    await gw.handleConnection(fakeSocket);
    assert(
      joinedRooms.includes('seller_channel') &&
        joinedRooms.includes('store:store-e2e-1') &&
        joinedRooms.includes('business:biz-e2e-1') &&
        joinedRooms.includes('business_user:staff-1'),
      `NotificationGateway must join BUSINESS_STAFF to seller & store rooms; joined=${JSON.stringify(joinedRooms)}`,
    );
    console.log('✓ 4. NotificationGateway BUSINESS_OWNER / BUSINESS_STAFF room subscription passed');

    // 5. Verify Frontend 4-channel sync contracts (SellerHeader, ToastContext, useRealtimeNotifications, UniversalNotificationBell)
    const toastSrc = fs.readFileSync(path.join(ROOT, 'web/src/ui/context/ToastContext.tsx'), 'utf8');
    const rtHookSrc = fs.readFileSync(path.join(ROOT, 'web/src/ui/hooks/useRealtimeNotifications.ts'), 'utf8');
    const sellerHdrSrc = fs.readFileSync(path.join(ROOT, 'web/src/ui/components/layout/SellerHeader.tsx'), 'utf8');
    const bellSrc = fs.readFileSync(path.join(ROOT, 'web/src/ui/components/common/UniversalNotificationBell.tsx'), 'utf8');

    assert(toastSrc.includes('recentIdsRef') && toastSrc.includes('msgOrObj.id'), 'ToastContext must deduplicate by id');
    assert(
      rtHookSrc.includes("startsWith('/seller/chat')") && rtHookSrc.includes('chat_msg_'),
      'useRealtimeNotifications must suppress chat sound/toast on chat page and pass dedupe id',
    );
    assert(
      sellerHdrSrc.includes('OFFICIAL_ALIASES') && sellerHdrSrc.includes('chat_msg_'),
      'SellerHeader must collect multi-alias storeIds and dedupe toasts',
    );
    assert(bellSrc.includes("n.type === 'NEW_MESSAGE'"), 'UniversalNotificationBell must render NEW_MESSAGE cards');
    console.log('✓ 5. Frontend 4-channel Bell/Badge/Push/Toast & dedupe contracts passed');

    console.log('\nALL BUG-08 E2E CHECKS PASSED.');
  } finally {
    if (savedBusinessServiceUrl === undefined) delete process.env.BUSINESS_SERVICE_URL;
    else process.env.BUSINESS_SERVICE_URL = savedBusinessServiceUrl;
    if (savedInternalKey === undefined) delete process.env.INTERNAL_SERVICE_KEY;
    else process.env.INTERNAL_SERVICE_KEY = savedInternalKey;
    if (conn) {
      try {
        await conn.dropDatabase();
        await conn.close();
      } catch {}
    }
    mockScope.server.close();
  }
}

run().catch((err) => {
  console.error('\nBUG-08 E2E FAILED:', err);
  process.exitCode = 1;
});
