'use strict';

/**
 * E2E Verification Script: BUG-11 (Auto-Moderation "Vi phạm ngôn từ" + Admin Realtime Delivery)
 *
 * Tests real runtime behavior against:
 * 1. Real local MongoDB database (`huki_e2e_bug11_tmp`, cleaned up in finally)
 * 2. Compiled `AutoModerationService.inspect` -> `PROFANITY`, `matchedKeywords`, `violationCategory: 'LANGUAGE_VIOLATION'`
 * 3. Compiled `ReviewsService.createBook` -> triggers `ModerationService.createAutoFlagReport`
 * 4. Compiled `ModerationService` -> persists `Report` (`reason: 'LANGUAGE_VIOLATION'`, `detectionSource: 'AUTO_MODERATION'`),
 *    notifies `admin_channel` (`NotificationDeliveryService` spy), emits Socket.io `'moderation:created'` / `'moderation:resolved'`
 * 5. Compiled `ModerationService.listReports({ reason: 'LANGUAGE_VIOLATION', detectionSource: 'AUTO_MODERATION' })` & `resolve()`
 * 6. Frontend contracts in `moderationApi.ts`, `useRealtimeNotifications.ts`, and `AdminModerationView.tsx`
 */

const fs = require('fs');
const path = require('path');
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

async function run() {
  console.log('=== E2E VERIFICATION: BUG-11 (AUTO-MODERATION & ADMIN REALTIME) ===\n');

  const mongoose = require('mongoose');
  const { SchemaFactory } = require('@nestjs/mongoose');

  const communityDistBase = path.join(
    PLATFORM_DIST,
    'out-tsc',
    'community-service',
    'apps',
    'community-service',
    'src',
  );

  const { Review } = require(path.join(communityDistBase, 'entities', 'review.schema.js'));
  const { Report } = require(path.join(communityDistBase, 'entities', 'report.schema.js'));
  const { AutoModerationService } = require(
    path.join(communityDistBase, 'modules', 'moderation', 'auto-moderation.service.js'),
  );
  const { ModerationService } = require(
    path.join(communityDistBase, 'modules', 'moderation', 'moderation.service.js'),
  );
  const { ReviewsService } = require(
    path.join(communityDistBase, 'modules', 'reviews', 'reviews.service.js'),
  );
  const { NotificationGateway } = require(
    path.join(communityDistBase, 'modules', 'notifications', 'notification.gateway.js'),
  );

  const mongoUrl = process.env.MONGO_URL_E2E || 'mongodb://127.0.0.1:27017/huki_e2e_bug11_tmp';
  const conn = await mongoose.createConnection(mongoUrl).asPromise();
  console.log(`Connected to MongoDB: ${mongoUrl}`);

  try {
    const ReviewSchema = SchemaFactory.createForClass(Review);
    const ReportSchema = SchemaFactory.createForClass(Report);
    const ReviewModel = conn.model('Review', ReviewSchema);
    const ReportModel = conn.model('Report', ReportSchema);
    const ReplyModel = { create: async () => null, find: () => ({ sort: () => ({ exec: async () => [] }) }) };

    await ReviewModel.deleteMany({});
    await ReportModel.deleteMany({});

    // 1. Test AutoModerationService keyword extraction & categorization
    const autoMod = new AutoModerationService();
    const inspected = autoMod.inspect('Sách quá lừa đảo và ngu ngốc, đừng mua!');
    assert.strictEqual(inspected.flagged, true, 'Profanity must be flagged');
    assert.strictEqual(inspected.violationCategory, 'LANGUAGE_VIOLATION');
    assert.ok(inspected.matchedKeywords.includes('lừa đảo'));
    assert.ok(inspected.matchedKeywords.includes('ngu ngốc'));
    console.log('[PASS] Step 1: AutoModerationService extracted matchedKeywords =', inspected.matchedKeywords);

    // 2. Test real NotificationGateway.emitAdminModerationEvent room targeting
    const emittedRooms = [];
    const gateway = new NotificationGateway(
      { get: () => 'test-secret' },
      { verify: () => ({ sub: 'admin-1', role: 'PLATFORM_ADMIN' }) },
    );
    gateway.server = {
      to(room) {
        return {
          emit(eventName, payload) {
            emittedRooms.push({ room, eventName, payload });
          },
        };
      },
    };

    const deliveredNotifications = [];
    const notificationDelivery = {
      async deliver(input) {
        deliveredNotifications.push(input);
        return input;
      },
    };
    const eventBus = { publish: async () => {} };

    // 3. Instantiate real ModerationService + ReviewsService backed by MongoDB
    const moderationService = new ModerationService(
      ReportModel,
      ReviewModel,
      eventBus,
      gateway,
      notificationDelivery,
    );

    const verificationStub = {
      async bookPurchase() {
        return {
          orderId: 'order-e2e-11',
          sellerOrderId: 'so-e2e-11',
          storeId: 'store-e2e-11',
          storeOwnerId: 'owner-e2e-11',
          format: 'DIGITAL',
        };
      },
    };

    const reviewsService = new ReviewsService(
      ReviewModel,
      ReplyModel,
      verificationStub,
      eventBus,
      autoMod,
      gateway,
      undefined,
      notificationDelivery,
      moderationService,
    );

    const buyerActor = {
      sub: 'buyer-e2e-11',
      email: 'buyer11@huki.test',
      fullName: 'Buyer Test 11',
      role: 'USER',
    };

    const createdRes = await reviewsService.createBook(
      buyerActor,
      'book-e2e-11',
      {
        rating: 1,
        title: 'Review vi phạm ngôn từ',
        content: 'Sách lừa đảo ngu ngốc rác rưởi!',
      },
      'Bearer test-token',
    );
    const createdReviewId = createdRes.data.id;

    // Wait briefly for fire-and-forget async notification/report promises to settle
    await new Promise((r) => setTimeout(r, 150));

    // Verify Review document in MongoDB has isReported=true and lastReportReason='LANGUAGE_VIOLATION'
    const persistedReview = await ReviewModel.findById(createdReviewId).lean();
    assert.strictEqual(persistedReview.isReported, true, 'Review in MongoDB should be marked isReported=true');
    assert.strictEqual(persistedReview.lastReportReason, 'LANGUAGE_VIOLATION');

    // Verify Report persisted in real MongoDB
    const persistedReports = await ReportModel.find({ targetId: createdReviewId }).lean();
    assert.strictEqual(persistedReports.length, 1, 'Expected 1 auto-moderation Report in MongoDB');
    assert.strictEqual(persistedReports[0].reason, 'LANGUAGE_VIOLATION');
    assert.strictEqual(persistedReports[0].detectionSource, 'AUTO_MODERATION');
    assert.strictEqual(persistedReports[0].violationCategory, 'LANGUAGE_VIOLATION');
    assert.ok(persistedReports[0].matchedKeywords.includes('lừa đảo'));
    console.log('[PASS] Step 2: ReviewsService -> MongoDB persisted LANGUAGE_VIOLATION report:', persistedReports[0]._id.toString());

    // Verify Admin notification + Socket.io admin_channel event
    const adminNoti = deliveredNotifications.find(
      (n) => n.recipientType === 'ADMIN' && n.recipientId === 'admin_channel' && n.payload?.reason === 'LANGUAGE_VIOLATION',
    );
    assert.ok(adminNoti, 'Expected ADMIN notification delivered to admin_channel');
    assert.strictEqual(adminNoti.actionUrl, '/admin/moderation?reason=LANGUAGE_VIOLATION');

    const createdSocketEvt = emittedRooms.find(
      (e) => e.room === 'admin_channel' && e.eventName === 'moderation:created',
    );
    assert.ok(createdSocketEvt, 'Expected socket moderation:created emitted to admin_channel');
    assert.strictEqual(createdSocketEvt.payload.report.reason, 'LANGUAGE_VIOLATION');
    console.log('[PASS] Step 3: Admin notification + Socket.io moderation:created emitted to admin_channel');

    // 4. Test Admin listReports filter & resolve -> moderation:resolved
    const listed = await moderationService.listReports({
      page: 1,
      limit: 20,
      reason: 'LANGUAGE_VIOLATION',
      detectionSource: 'AUTO_MODERATION',
    });
    assert.strictEqual(listed.data.length, 1, 'Admin LANGUAGE_VIOLATION filter should return 1 report');
    assert.strictEqual(listed.data[0].detectionSource, 'AUTO_MODERATION');
    assert.ok(listed.data[0].content && listed.data[0].content.content.includes('lừa đảo'));

    await moderationService.resolve(
      { sub: 'admin-e2e-11', role: 'PLATFORM_ADMIN' },
      persistedReports[0]._id.toString(),
      { outcome: 'RESOLVED', action: 'HIDE', note: 'Ẩn do vi phạm ngôn từ' },
    );
    const resolvedSocketEvt = emittedRooms.find(
      (e) => e.room === 'admin_channel' && e.eventName === 'moderation:resolved',
    );
    assert.ok(resolvedSocketEvt, 'Expected socket moderation:resolved emitted to admin_channel');
    const updatedReview = await ReviewModel.findById(createdReviewId).lean();
    assert.strictEqual(updatedReview.status, 'HIDDEN', 'Review should be HIDDEN after Admin HIDE action');
    console.log('[PASS] Step 4: Admin listReports filter + resolve HIDE + moderation:resolved verified in MongoDB');

    // 5. Verify Frontend contracts
    const moderationApiSrc = fs.readFileSync(
      path.join(ROOT, 'web', 'src', 'ui', 'api', 'moderationApi.ts'),
      'utf8',
    );
    const realtimeHookSrc = fs.readFileSync(
      path.join(ROOT, 'web', 'src', 'ui', 'hooks', 'useRealtimeNotifications.ts'),
      'utf8',
    );
    const adminModViewSrc = fs.readFileSync(
      path.join(ROOT, 'web', 'src', 'ui', 'components', 'admin', 'AdminModerationView.tsx'),
      'utf8',
    );

    assert.ok(moderationApiSrc.includes('LANGUAGE_VIOLATION'));
    assert.ok(moderationApiSrc.includes('AUTO_MODERATION'));
    assert.ok(realtimeHookSrc.includes('moderation:created'));
    assert.ok(realtimeHookSrc.includes('MODERATION_UPDATED'));
    assert.ok(adminModViewSrc.includes('Vi Phạm Ngôn Từ'));
    assert.ok(adminModViewSrc.includes('MODERATION_UPDATED'));
    console.log('[PASS] Step 5: Frontend moderationApi, useRealtimeNotifications & AdminModerationView contracts verified');

    console.log('\nALL BUG-11 E2E CHECKS PASSED.');
  } finally {
    await conn.dropDatabase().catch(() => null);
    await conn.close().catch(() => null);
  }
}

run().catch((err) => {
  console.error('\n[FAIL] BUG-11 E2E verification failed:', err);
  process.exit(1);
});
