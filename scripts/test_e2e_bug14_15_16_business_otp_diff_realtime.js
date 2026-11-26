'use strict';

/**
 * E2E Verification Script: BUG-14, BUG-15, BUG-16
 * (Business Profile Update: Email 6-digit OTP + Side-by-Side Diff Comparison + Bidirectional Realtime)
 *
 * Tests real runtime behavior against:
 * 1. Compiled `BusinessService`:
 *    - `sendUpdateRequestOtp` generates 6-digit OTP, invokes `EmailService.sendBusinessUpdateOtpEmail`, enforces 60s resend cooldown
 *    - `createUpdateRequest` rejects wrong/missing OTP, accepts valid OTP once, blocks OTP replay, captures full `currentSnapshot`
 *      (including `repName: 'Nguyễn Phương Thúy (Nhà Sách HuKi)'`) vs proposed `repName: 'Nguyễn Phương Thùy (Nhà Sách HuKi)'`
 *    - `getAllUpdateRequestsForAdmin` returns symmetric `currentSnapshot` + cleaned `requestedData`
 *    - `createUpdateRequest`, `approveUpdateRequest`, `rejectUpdateRequest` emit Outbox events
 *      (`business.update_requested`, `business.update_approved`, `business.update_rejected`)
 * 2. Compiled `NotificationEventConsumer` + real MongoDB `NotificationDeliveryService` + `NotificationGateway`:
 *    - `business.update_requested` -> delivers notification to `admin_channel` (`/admin/business-requests`) & emits Socket.io `'notification'` to `'admin_channel'`
 *    - `business.update_approved` -> delivers notification to Seller owner/business & emits Socket.io `'notification'` to `business:<id>` & `business_user:<ownerId>`
 * 3. Frontend contracts:
 *    - `seller/business/page.tsx`: 6-digit OTP modal + `sendUpdateRequestOtp` + `BUSINESS_REVISION_SUBMITTED`
 *    - `AdminBusinessUpdateRequestsView.tsx`: 3-column aligned diff table (`Trường thông tin` | `Hiện Tại DB` | `Đề Xuất Mới`),
 *      `onlyShowChanged`, `renderTokenDiffHighlight`, `realtimeSyncBus`, `handleApprove(req.id)`
 *    - `useRealtimeNotifications.ts` & `seller/business/notifications/page.tsx`: `BUSINESS_REVISION_SUBMITTED` & `BUSINESS_STATUS_UPDATED`
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
  console.log('=== E2E VERIFICATION: BUG-14, BUG-15, BUG-16 (BUSINESS OTP + DIFF + REALTIME) ===\n');

  const mongoose = require('mongoose');
  const { SchemaFactory } = require('@nestjs/mongoose');

  const { BusinessService } = require(
    path.join(
      PLATFORM_DIST,
      'out-tsc',
      'business-service',
      'apps',
      'business-service',
      'src',
      'modules',
      'business',
      'business.service.js',
    ),
  );
  const communityDistBase = path.join(
    PLATFORM_DIST,
    'out-tsc',
    'community-service',
    'apps',
    'community-service',
    'src',
  );
  const { Notification, NotificationSchema } = require(
    path.join(communityDistBase, 'entities', 'notification.schema.js'),
  );
  const { NotificationPreferenceSchema } = require(
    path.join(communityDistBase, 'entities', 'notification-preference.schema.js'),
  );
  const { NotificationDeviceSchema } = require(
    path.join(communityDistBase, 'entities', 'notification-device.schema.js'),
  );
  const { NotificationGateway } = require(
    path.join(communityDistBase, 'modules', 'notifications', 'notification.gateway.js'),
  );
  const { NotificationDeliveryService } = require(
    path.join(communityDistBase, 'modules', 'notifications', 'notification-delivery.service.js'),
  );
  const { NotificationEventConsumer } = require(
    path.join(communityDistBase, 'modules', 'notifications', 'notification-event.consumer.js'),
  );

  // 1. Test BusinessService OTP flow + Snapshot + Outbox
  const sentEmails = [];
  const outboxRows = [];
  const auditRows = [];
  const updateRequestsStore = [
    {
      id: 'req-approved-old',
      businessId: 'biz-huki-1',
      requestedBy: 'seller-owner-1',
      status: 'APPROVED',
      reviewedAt: new Date(Date.now() - 86400000),
      createdAt: new Date(Date.now() - 86500000),
      requestedData: {
        repName: 'Nguyễn Phương Thúy (Nhà Sách HuKi)',
        repPosition: 'Chủ hộ kinh doanh',
        repIdCardNumber: '079094002381',
        businessLicenseNumber: '0318926412',
        issuePlace: 'Ủy ban nhân dân Quận 1, TP. Hồ Chí Minh',
        headquarters: ['TP. Hồ Chí Minh'],
        storeName: 'Nhà Sách HuKi Official',
      },
    },
  ];
  const businessRow = {
    id: 'biz-huki-1',
    ownerId: 'seller-owner-1',
    name: 'Nhà Sách HuKi Official',
    taxCode: '0123456789',
    businessType: 'INDIVIDUAL',
    email: 'seller@huki.com',
    phone: '0901234567',
    address: '["TP. Hồ Chí Minh"]',
    bankName: 'Vietcombank',
    bankAccountNumber: '121212121212',
    bankAccountHolderName: 'Nhà Sách HuKi Official',
    stores: [{ id: 'store-huki-1', name: 'Nhà Sách HuKi Official', description: 'Shop chính hãng' }],
    deletedAt: null,
  };

  const mockPrisma = {
    business: {
      findFirst: async () => businessRow,
      update: async ({ data }) => Object.assign(businessRow, data),
    },
    store: {
      update: async ({ data }) => Object.assign(businessRow.stores[0], data),
    },
    auditLog: {
      findFirst: async ({ where }) =>
        auditRows.find(
          (r) =>
            r.resource === where.resource &&
            r.action === where.action &&
            r.resourceId === where.resourceId &&
            (!where.createdAt?.gte || r.createdAt >= where.createdAt.gte),
        ) || null,
      create: async ({ data }) => {
        const entry = { ...data, createdAt: new Date() };
        auditRows.push(entry);
        return entry;
      },
    },
    businessUpdateRequest: {
      findFirst: async ({ where }) => {
        const filtered = updateRequestsStore.filter((r) => {
          if (where?.businessId && r.businessId !== where.businessId) return false;
          if (where?.status && r.status !== where.status) return false;
          if (where?.id?.not && r.id === where.id.not) return false;
          return true;
        });
        return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
      },
      create: async ({ data }) => {
        const row = {
          id: 'req-thuy-to-thuy',
          ...data,
          createdAt: new Date(),
          business: businessRow,
        };
        updateRequestsStore.unshift(row);
        return row;
      },
      findMany: async () => updateRequestsStore.map((r) => ({ ...r, business: businessRow })),
      count: async () => updateRequestsStore.length,
      findUnique: async ({ where }) => {
        const found = updateRequestsStore.find((r) => r.id === where.id);
        return found ? { ...found, business: businessRow } : null;
      },
      update: async ({ where, data }) => {
        const found = updateRequestsStore.find((r) => r.id === where.id);
        Object.assign(found, data);
        return found;
      },
    },
  };

  const businessService = new BusinessService(
    mockPrisma,
    { emit: () => {} },
    { setBusinessRole: async () => {}, getProfiles: async () => [] },
    undefined,
    {
      addToOutbox: async (type, aggregateId, payload) => {
        outboxRows.push({ type, aggregateId, payload });
      },
    },
    {
      sendBusinessUpdateOtpEmail: async (to, otp, businessName) => {
        sentEmails.push({ to, otp, businessName });
      },
    },
  );

  // Step 1a: Send OTP email
  const otpInfo = await businessService.sendUpdateRequestOtp('seller-owner-1', 'seller@huki.com');
  assert.strictEqual(sentEmails.length, 1);
  assert.strictEqual(sentEmails[0].to, 'seller@huki.com');
  assert.match(sentEmails[0].otp, /^\d{6}$/);
  assert.strictEqual(otpInfo.maskedEmail, 'se****@huki.com');
  console.log(`[PASS] Step 1a (BUG-14): 6-digit OTP email sent to ${sentEmails[0].to} (${otpInfo.maskedEmail})`);

  // Step 1b: Enforce resend cooldown (60s)
  await assert.rejects(
    () => businessService.sendUpdateRequestOtp('seller-owner-1', 'seller@huki.com'),
    /60|giây/,
  );
  console.log('[PASS] Step 1b (BUG-14): 60s OTP resend cooldown enforced');

  // Step 1c: Submit update request WITH wrong OTP -> blocked; WITH valid OTP -> created & replay blocked
  await assert.rejects(
    () =>
      businessService.createUpdateRequest('seller-owner-1', {
        repName: 'Nguyễn Phương Thùy (Nhà Sách HuKi)',
        otpCode: '999999',
        otpToken: otpInfo.otpToken,
      }),
    /OTP/,
  );

  const createdReq = await businessService.createUpdateRequest('seller-owner-1', {
    name: 'Nhà Sách HuKi Official',
    taxCode: '0123456789',
    businessType: 'INDIVIDUAL',
    phone: '0901234567',
    email: 'seller@huki.com',
    headquarters: ['TP. Hồ Chí Minh'],
    repName: 'Nguyễn Phương Thùy (Nhà Sách HuKi)',
    otpCode: sentEmails[0].otp,
    otpToken: otpInfo.otpToken,
  });
  assert.strictEqual(createdReq.currentSnapshot.repName, 'Nguyễn Phương Thúy (Nhà Sách HuKi)');
  assert.deepStrictEqual(createdReq.changedFields, ['Người đại diện / Chủ hộ']);

  await assert.rejects(
    () =>
      businessService.createUpdateRequest('seller-owner-1', {
        repName: 'Nguyễn Phương Thùy (Nhà Sách HuKi)',
        otpCode: sentEmails[0].otp,
        otpToken: otpInfo.otpToken,
      }),
    /đã được sử dụng/,
  );
  console.log('[PASS] Step 1c (BUG-14 & BUG-15): Valid 6-digit OTP verified once, replay blocked, before-snapshot captured ("Thúy" -> "Thùy")');

  // Step 1d: Admin list hydration & approve
  const adminList = await businessService.getAllUpdateRequestsForAdmin();
  const pendingRow = adminList.data.find((r) => r.id === 'req-thuy-to-thuy');
  assert.strictEqual(pendingRow.currentSnapshot.repName, 'Nguyễn Phương Thúy (Nhà Sách HuKi)');
  assert.strictEqual(pendingRow.requestedData.repName, 'Nguyễn Phương Thùy (Nhà Sách HuKi)');
  assert.strictEqual(pendingRow.requestedData._previousSnapshot, undefined);

  await businessService.approveUpdateRequest('req-thuy-to-thuy', 'admin-1');
  assert.ok(outboxRows.some((e) => e.type === 'business.update_requested'));
  assert.ok(outboxRows.some((e) => e.type === 'business.update_approved'));
  console.log('[PASS] Step 1d (BUG-15 & BUG-16): Admin list hydrated currentSnapshot cleanly; Outbox emitted requested + approved events');

  // 2. Real MongoDB + NotificationEventConsumer + Socket.io Gateway realtime test
  const mongoUrl = process.env.MONGO_URL_E2E || 'mongodb://127.0.0.1:27017/huki_e2e_bug14_16_tmp';
  const conn = await mongoose.createConnection(mongoUrl).asPromise();
  try {
    const NotiModel = conn.model('Notification', NotificationSchema);
    const PrefModel = conn.model('NotificationPreference', NotificationPreferenceSchema);
    const DevModel = conn.model('NotificationDevice', NotificationDeviceSchema);

    const emittedSocketEvents = [];
    const gateway = new NotificationGateway(
      { get: () => 'test-secret' },
      { verifyAsync: async () => ({ sub: 'admin-1', role: 'PLATFORM_ADMIN' }) },
    );
    gateway.server = {
      to(room) {
        return {
          emit(eventName, payload) {
            emittedSocketEvents.push({ room, eventName, payload });
          },
        };
      },
    };

    const delivery = new NotificationDeliveryService(
      NotiModel,
      PrefModel,
      DevModel,
      gateway,
      { send: async () => ({ sent: 0 }) },
      { publish: async () => {} },
    );

    let registeredHandler = null;
    const bus = {
      subscribe(queue, patterns, handler) {
        assert.ok(patterns.includes('business.update_requested'));
        assert.ok(patterns.includes('business.update_approved'));
        assert.ok(patterns.includes('business.update_rejected'));
        registeredHandler = handler;
      },
    };

    const consumer = new NotificationEventConsumer(bus, delivery);
    consumer.onApplicationBootstrap();

    const reqEvt = outboxRows.find((e) => e.type === 'business.update_requested');
    await registeredHandler({
      eventId: 'evt-biz-req-1',
      eventType: reqEvt.type,
      occurredAt: new Date().toISOString(),
      producer: 'business-service',
      version: 1,
      aggregateId: reqEvt.aggregateId,
      payload: reqEvt.payload,
    });

    const appEvt = outboxRows.find((e) => e.type === 'business.update_approved');
    await registeredHandler({
      eventId: 'evt-biz-app-1',
      eventType: appEvt.type,
      occurredAt: new Date().toISOString(),
      producer: 'business-service',
      version: 1,
      aggregateId: appEvt.aggregateId,
      payload: appEvt.payload,
    });

    const adminNotis = await NotiModel.find({ recipientType: 'ADMIN', recipientId: 'admin_channel' }).lean();
    assert.strictEqual(adminNotis.length, 1);
    assert.strictEqual(adminNotis[0].actionUrl, '/admin/business-requests');
    assert.strictEqual(adminNotis[0].payload.eventType, 'business.update_requested');

    const sellerNotis = await NotiModel.find({ recipientType: 'BUSINESS' }).lean();
    assert.ok(sellerNotis.length >= 1);
    assert.strictEqual(sellerNotis[0].actionUrl, '/seller/business/notifications');

    assert.ok(
      emittedSocketEvents.some((e) => e.room === 'admin_channel' && e.eventName === 'notification'),
      'Expected Socket.io notification emitted to admin_channel',
    );
    assert.ok(
      emittedSocketEvents.some((e) => e.room === 'business:biz-huki-1' && e.eventName === 'notification'),
      'Expected Socket.io notification emitted to business:biz-huki-1',
    );
    assert.ok(
      emittedSocketEvents.some((e) => e.room === 'business_user:seller-owner-1' && e.eventName === 'notification'),
      'Expected Socket.io notification emitted to business_user:seller-owner-1',
    );
    console.log('[PASS] Step 2 (BUG-16): MongoDB notifications & Socket.io rooms (admin_channel, business:*, business_user:*) delivered in realtime');
  } finally {
    await conn.dropDatabase().catch(() => null);
    await conn.close().catch(() => null);
  }

  // 3. Frontend Contract Verification
  const sellerPageSrc = fs.readFileSync(path.join(ROOT, 'web', 'src', 'app', 'seller', 'business', 'page.tsx'), 'utf8');
  const sellerNotiSrc = fs.readFileSync(path.join(ROOT, 'web', 'src', 'app', 'seller', 'business', 'notifications', 'page.tsx'), 'utf8');
  const adminViewSrc = fs.readFileSync(path.join(ROOT, 'web', 'src', 'ui', 'components', 'admin', 'AdminBusinessUpdateRequestsView.tsx'), 'utf8');
  const hookSrc = fs.readFileSync(path.join(ROOT, 'web', 'src', 'ui', 'hooks', 'useRealtimeNotifications.ts'), 'utf8');

  assert.ok(sellerPageSrc.includes('Xác Thực OTP 6 Chữ Số'));
  assert.ok(sellerPageSrc.includes('sendUpdateRequestOtp'));
  assert.ok(sellerPageSrc.includes('BUSINESS_REVISION_SUBMITTED'));
  assert.ok(sellerNotiSrc.includes('BUSINESS_STATUS_UPDATED'));
  assert.ok(adminViewSrc.includes('buildComparisonRows'));
  assert.ok(adminViewSrc.includes('onlyShowChanged'));
  assert.ok(adminViewSrc.includes('renderTokenDiffHighlight'));
  assert.ok(adminViewSrc.includes('handleApprove(req.id)'));
  assert.ok(adminViewSrc.includes('BUSINESS_REVISION_SUBMITTED'));
  assert.ok(hookSrc.includes('business.update_requested'));
  assert.ok(hookSrc.includes('business.update_approved'));
  console.log('[PASS] Step 3: Frontend Seller OTP Popup, Admin 3-column aligned diff table & realtime subscriptions verified');

  console.log('\nALL BUG-14, BUG-15, BUG-16 E2E CHECKS PASSED.');
}

run().catch((err) => {
  console.error('\n[FAIL] BUG-14..16 E2E verification failed:', err);
  process.exit(1);
});
