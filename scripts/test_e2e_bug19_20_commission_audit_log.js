'use strict';

/**
 * E2E Verification Script: BUG-19 & BUG-20
 * - BUG-19: Unified 95% Partner / 5% Platform revenue split matching DEFAULT_POLICY_CONFIG.platformCommissionPercent === 5
 * - BUG-20: Full Business lifecycle AuditLog recording (registerBusiness, approveBusiness, updateBusiness,
 *           OTP send/use, createUpdateRequest, approveUpdateRequest) + GET /businesses/my/audit-logs +
 *           synthetic lifecycle milestones for pre-existing businesses + notifications page Audit Log rendering
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

function matchesWhere(row, where) {
  if (!where) return true;
  if (Array.isArray(where.OR)) {
    const okOr = where.OR.some((clause) => matchesWhere(row, clause));
    if (!okOr) return false;
  }
  for (const [k, v] of Object.entries(where)) {
    if (k === 'OR' || v === undefined) continue;
    if (row[k] !== v) return false;
  }
  return true;
}

async function run() {
  console.log('=== E2E VERIFICATION: BUG-19 (95%/5% SPLIT) & BUG-20 (BUSINESS AUDIT LOG) ===\n');

  // 1. Verify shared platform commission policy default === 5%
  const { DEFAULT_POLICY_CONFIG } = require(
    path.join(PLATFORM_DIST, 'libs', 'shared', 'config', 'policy-config.defaults.js'),
  );
  assert.strictEqual(
    DEFAULT_POLICY_CONFIG.platformCommissionPercent,
    5,
    'DEFAULT_POLICY_CONFIG.platformCommissionPercent must equal 5',
  );
  console.log('[OK] DEFAULT_POLICY_CONFIG.platformCommissionPercent === 5');

  // 2. Verify compiled AuditService + BusinessService + BusinessController
  const { AuditService } = require(
    path.join(PLATFORM_DIST, 'out-tsc', 'business-service', 'apps', 'business-service', 'src', 'modules', 'audit', 'audit.service.js'),
  );
  const { BusinessService } = require(
    path.join(PLATFORM_DIST, 'out-tsc', 'business-service', 'apps', 'business-service', 'src', 'modules', 'business', 'business.service.js'),
  );
  const { BusinessController } = require(
    path.join(PLATFORM_DIST, 'out-tsc', 'business-service', 'apps', 'business-service', 'src', 'modules', 'business', 'business.controller.js'),
  );

  const auditStore = [];
  const businessStore = new Map();
  const storeStore = new Map();
  const updateRequestStore = new Map();

  const prisma = {
    auditLog: {
      create: async ({ data }) => {
        const entry = {
          id: `audit-${auditStore.length + 1}`,
          createdAt: new Date(Date.now() + auditStore.length * 100),
          ...data,
        };
        auditStore.push(entry);
        return entry;
      },
      findFirst: async ({ where }) => {
        const found = auditStore
          .slice()
          .reverse()
          .find((r) => matchesWhere(r, where));
        return found || null;
      },
      findMany: async ({ where, orderBy, skip = 0, take = 20 }) => {
        let rows = auditStore.filter((r) => matchesWhere(r, where));
        if (orderBy?.createdAt === 'desc') {
          rows = rows.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
        return rows.slice(skip, skip + take);
      },
      count: async ({ where }) => auditStore.filter((r) => matchesWhere(r, where)).length,
    },
    business: {
      findFirst: async ({ where }) => {
        for (const b of businessStore.values()) {
          if (where?.ownerId && b.ownerId !== where.ownerId) continue;
          if (where?.id && b.id !== where.id) continue;
          if (where?.deletedAt === null && b.deletedAt) continue;
          return b;
        }
        return null;
      },
      findUnique: async ({ where }) => businessStore.get(where.id) || null,
      create: async ({ data }) => {
        const created = {
          id: `biz-${businessStore.size + 1}`,
          deletedAt: null,
          createdAt: new Date(),
          stores: [],
          members: [],
          ...data,
        };
        businessStore.set(created.id, created);
        return created;
      },
      update: async ({ where, data }) => {
        const existing = businessStore.get(where.id);
        const updated = { ...existing, ...data };
        businessStore.set(where.id, updated);
        return updated;
      },
    },
    store: {
      findUnique: async ({ where }) => {
        for (const s of storeStore.values()) {
          if (where?.slug && s.slug === where.slug) return s;
        }
        return null;
      },
      create: async ({ data }) => {
        const s = { id: `store-${storeStore.size + 1}`, ...data };
        storeStore.set(s.id, s);
        const biz = businessStore.get(data.businessId);
        if (biz) biz.stores = [s];
        return s;
      },
      updateMany: async ({ where, data }) => {
        let count = 0;
        for (const [k, s] of storeStore.entries()) {
          if (s.businessId === where.businessId) {
            storeStore.set(k, { ...s, ...data });
            count++;
          }
        }
        return { count };
      },
      update: async ({ where, data }) => {
        const s = storeStore.get(where.id) || {};
        const updated = { ...s, ...data };
        if (where?.id) storeStore.set(where.id, updated);
        return updated;
      },
    },
    member: {
      create: async ({ data }) => ({ id: 'member-1', ...data }),
      findFirst: async () => null,
    },
    businessUpdateRequest: {
      findUnique: async ({ where }) => {
        const found = updateRequestStore.get(where.id);
        if (!found) return null;
        return {
          ...found,
          business: businessStore.get(found.businessId) || null,
        };
      },
      findFirst: async ({ where }) => {
        const all = Array.from(updateRequestStore.values()).filter(
          (r) =>
            (!where?.businessId || r.businessId === where.businessId) &&
            (!where?.status || r.status === where.status),
        );
        return all[all.length - 1] || null;
      },
      create: async ({ data }) => {
        const created = {
          id: `req-${updateRequestStore.size + 1}`,
          createdAt: new Date(),
          ...data,
        };
        updateRequestStore.set(created.id, created);
        return created;
      },
      update: async ({ where, data }) => {
        const existing = updateRequestStore.get(where.id);
        const updated = { ...existing, ...data };
        updateRequestStore.set(where.id, updated);
        return updated;
      },
    },
  };
  prisma.$transaction = async (fnOrArray) =>
    typeof fnOrArray === 'function' ? fnOrArray(prisma) : Promise.all(fnOrArray);

  const eventEmitter = { emit: () => true };
  const identity = {
    setBusinessRole: async () => true,
    getProfiles: async () => [{ id: 'owner-1', fullName: 'Nguyễn Văn A' }],
  };
  let capturedOtp = null;
  const emailService = {
    sendBusinessUpdateOtpEmail: async (_email, code) => {
      capturedOtp = code;
    },
  };
  const outboxService = { addToOutbox: async () => true };

  const auditService = new AuditService(prisma);
  const businessService = new BusinessService(
    prisma,
    eventEmitter,
    identity,
    auditService,
    outboxService,
    emailService,
  );
  const businessController = new BusinessController(businessService);

  // Flow A: Full lifecycle audit logging for a newly registered business
  const regBiz = await businessService.registerBusiness('owner-1', {
    name: 'Tiệm Sách Phố Cổ',
    taxCode: '0319998881',
    email: 'phoco@huki.com',
    phone: '0909888777',
    address: 'Hà Nội',
    businessType: 'INDIVIDUAL',
  });

  await businessService.approveBusiness(regBiz.id, 'admin-1');
  await businessService.updateBusiness(regBiz.id, 'owner-1', { address: 'Quận Hoàn Kiếm, Hà Nội' });

  const otpRes = await businessService.sendUpdateRequestOtp('owner-1', 'phoco@huki.com');
  assert(capturedOtp && /^\d{6}$/.test(capturedOtp), '6-digit OTP must be generated');

  const updateReq = await businessService.createUpdateRequest('owner-1', {
    name: 'Hộ Kinh Doanh Tiệm Sách Phố Cổ',
    otpCode: capturedOtp,
    otpToken: otpRes.otpToken,
  });

  await businessService.approveUpdateRequest(updateReq.id, 'admin-1');

  const controllerLogsRes = await businessController.getMyAuditLogs('owner-1', '1', '50');
  assert.strictEqual(controllerLogsRes.success, true);
  const actions = controllerLogsRes.data.items.map((x) => `${x.resource}:${x.action}`);
  console.log('[OK] Recorded Seller AuditLog events:', actions.join(', '));

  for (const expected of [
    'Business:CREATE',
    'Business:APPROVE',
    'Business:UPDATE',
    'BusinessUpdateOtp:UPDATE_REQUEST_OTP_SENT',
    'BusinessUpdateOtp:UPDATE_REQUEST_OTP_USED',
    'BusinessUpdateRequest:CREATE',
    'BusinessUpdateRequest:APPROVE',
  ]) {
    assert(actions.includes(expected), `Missing AuditLog entry for ${expected}`);
  }

  // Flow B: Pre-existing approved business with 0 rows in audit_logs (like UAT TIỆM SÁCH PHỐ CỔ)
  const legacyBizId = '08c6e3cf-210b-4c5c-ac96-8ec4fa9907be';
  businessStore.set(legacyBizId, {
    id: legacyBizId,
    ownerId: 'legacy-owner-1',
    name: 'HỘ KINH DOANH TIỆM SÁCH PHỐ CỔ',
    taxCode: '0318887771',
    status: 'APPROVED',
    createdAt: new Date('2026-11-26T07:00:00.000Z'),
    approvedAt: new Date('2026-11-26T07:25:15.177Z'),
    approvedBy: 'admin-legacy',
    deletedAt: null,
    stores: [{ id: 'legacy-store-1', name: 'Tiệm Sách Phố Cổ' }],
  });

  const legacyLogs = await businessController.getMyAuditLogs('legacy-owner-1', '1', '20');
  assert(legacyLogs.data.items.length >= 2, 'Pre-existing approved business must synthesize CREATE and APPROVE milestones');
  const legacyActions = legacyLogs.data.items.map((x) => x.action);
  assert(legacyActions.includes('APPROVE') && legacyActions.includes('CREATE'), 'Legacy milestones must include APPROVE and CREATE');
  console.log('[OK] Pre-existing business fallback milestones:', legacyActions.join(', '));

  // 3. Verify Frontend files (BUG-19 & BUG-20)
  const filesToCheck = [
    'web/src/app/seller/business/page.tsx',
    'web/src/app/auth/status/page.tsx',
    'web/src/ui/data/policiesData.ts',
    'web/src/ui/components/admin/AdminSettingsView.tsx',
    'web/src/ui/components/admin/AdminFinanceView.tsx',
    'web/src/ui/components/admin/AdminPublishersView.tsx',
    'web/src/ui/components/admin/AdminPublisherLeadsView.tsx',
  ];

  for (const rel of filesToCheck) {
    const content = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    assert(!/85%\s*(Đối tác|NXB|cho NXB)/i.test(content), `Found legacy 85% revenue text in ${rel}`);
    assert(!/15%\s*(Sàn|HUKI|phí nền tảng)/i.test(content), `Found legacy 15% platform fee text in ${rel}`);
  }
  const sellerBusinessContent = fs.readFileSync(path.join(ROOT, 'web/src/app/seller/business/page.tsx'), 'utf8');
  assert(sellerBusinessContent.includes('95% Đối tác &bull; 5% Sàn'), 'seller/business/page.tsx must show 95% Đối tác • 5% Sàn');

  const businessApiContent = fs.readFileSync(path.join(ROOT, 'web/src/ui/api/businessApi.ts'), 'utf8');
  assert(businessApiContent.includes('/businesses/my/audit-logs'), 'businessApi.ts must call /businesses/my/audit-logs');

  const notificationsContent = fs.readFileSync(path.join(ROOT, 'web/src/app/seller/business/notifications/page.tsx'), 'utf8');
  assert(notificationsContent.includes('getMyAuditLogs'), 'notifications/page.tsx must load getMyAuditLogs');
  assert(notificationsContent.includes('Nhật ký hệ thống'), 'notifications/page.tsx must provide Audit Log tab');
  assert(notificationsContent.includes('describeBusinessAuditLog'), 'notifications/page.tsx must format Audit Log entries');

  console.log('[OK] All frontend BUG-19 (95%/5%) and BUG-20 (Audit Log) contracts verified');
  console.log('\nPASS: BUG-19 & BUG-20 E2E VERIFICATION SUCCEEDED.');
}

run().catch((err) => {
  console.error('\nFAIL:', err);
  process.exit(1);
});
