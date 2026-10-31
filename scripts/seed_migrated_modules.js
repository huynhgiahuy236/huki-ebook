const fs = require('fs');
const path = require('path');

// Parse platform/.env manually to avoid missing module errors
const envPath = path.resolve(__dirname, '../platform/.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.substring(0, eqIdx).trim();
      const val = trimmed.substring(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const { PrismaClient: BusinessPrismaClient } = require('../platform/apps/business-service/prisma/generated/client');
const { PrismaClient: IdentityPrismaClient } = require('../platform/apps/identity-service/prisma/generated/client');

const businessPrisma = new BusinessPrismaClient();
const identityPrisma = new IdentityPrismaClient();

function readJsonFile(primaryName, fallbackName) {
  const primaryPath = path.resolve(__dirname, '../web/.storage', primaryName);
  const fallbackPath = path.resolve(__dirname, '../web', fallbackName);

  if (fs.existsSync(primaryPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(primaryPath, 'utf-8'));
      if (data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)) {
        return data;
      }
    } catch (e) {
      console.warn(`Error reading ${primaryPath}:`, e.message);
    }
  }

  if (fs.existsSync(fallbackPath)) {
    try {
      return JSON.parse(fs.readFileSync(fallbackPath, 'utf-8'));
    } catch (e) {
      console.warn(`Error reading ${fallbackPath}:`, e.message);
    }
  }

  return null;
}

async function seedBroadcastNotifications() {
  console.log('--- Seeding Broadcast Notifications ---');
  const list = readJsonFile('broadcast_notifications.json', '.huki_broadcast_notifications.json');
  if (!list || !Array.isArray(list)) {
    console.log('No broadcast notifications data found to seed.');
    return;
  }

  const validCategories = new Set(['MAINTENANCE', 'POLICY', 'ORDER', 'FINANCE', 'MARKETING', 'SECURITY']);
  const validSeverities = new Set(['INFO', 'WARNING', 'CRITICAL']);
  const validTargetTypes = new Set(['ALL', 'SEGMENT', 'DIRECT']);
  const validStatuses = new Set(['ACTIVE', 'SCHEDULED', 'COMPLETED', 'CANCELLED']);

  for (const item of list) {
    const category = validCategories.has(item.category) ? item.category : 'POLICY';
    const severity = validSeverities.has(item.severity) ? item.severity : 'INFO';
    const targetType = validTargetTypes.has(item.targetType) ? item.targetType : 'ALL';
    const status = validStatuses.has(item.status) ? item.status : 'ACTIVE';

    const notif = await businessPrisma.broadcastNotification.upsert({
      where: { id: item.id },
      update: {
        title: item.title || 'Thông báo',
        summary: item.summary || '',
        content: item.content || '',
        category,
        severity,
        targetType,
        targetSegment: item.targetSegment || null,
        targetRoles: item.targetRoles || ['ALL'],
        targetBusinessIds: item.targetBusinessIds || [],
        channels: item.channels || ['BELL'],
        isPinnedTop: Boolean(item.isPinnedTop),
        isDismissible: item.isDismissible !== false,
        scheduleType: item.scheduleType || 'INSTANT',
        recurringRule: item.recurringRule || null,
        status,
        authorName: item.authorName || 'Ban Quản Trị HUKI',
        actionUrl: item.actionUrl || null,
        actionLabel: item.actionLabel || null,
        createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
        updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
      },
      create: {
        id: item.id,
        title: item.title || 'Thông báo',
        summary: item.summary || '',
        content: item.content || '',
        category,
        severity,
        targetType,
        targetSegment: item.targetSegment || null,
        targetRoles: item.targetRoles || ['ALL'],
        targetBusinessIds: item.targetBusinessIds || [],
        channels: item.channels || ['BELL'],
        isPinnedTop: Boolean(item.isPinnedTop),
        isDismissible: item.isDismissible !== false,
        scheduleType: item.scheduleType || 'INSTANT',
        recurringRule: item.recurringRule || null,
        status,
        authorName: item.authorName || 'Ban Quản Trị HUKI',
        actionUrl: item.actionUrl || null,
        actionLabel: item.actionLabel || null,
        createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
        updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
      },
    });

    const readIds = item.readByBusinessIds || [];
    const dismissedIds = item.dismissedByBusinessIds || [];
    const allBusinessIds = Array.from(new Set([...readIds, ...dismissedIds]));

    for (const bId of allBusinessIds) {
      await businessPrisma.broadcastReceipt.upsert({
        where: {
          notificationId_businessId: {
            notificationId: notif.id,
            businessId: bId,
          },
        },
        update: {
          isRead: readIds.includes(bId),
          readAt: readIds.includes(bId) ? new Date() : null,
          isDismissed: dismissedIds.includes(bId),
          dismissedAt: dismissedIds.includes(bId) ? new Date() : null,
        },
        create: {
          notificationId: notif.id,
          businessId: bId,
          isRead: readIds.includes(bId),
          readAt: readIds.includes(bId) ? new Date() : null,
          isDismissed: dismissedIds.includes(bId),
          dismissedAt: dismissedIds.includes(bId) ? new Date() : null,
        },
      });
    }
  }

  const count = await businessPrisma.broadcastNotification.count();
  console.log(`Seeded ${count} broadcast notifications successfully.`);
}

async function seedSellerFeatures() {
  console.log('--- Seeding Seller Feature Flags ---');
  const list = readJsonFile('seller_features.json', '.huki_seller_features.json');
  if (!list || !Array.isArray(list)) {
    console.log('No seller features data found to seed.');
    return;
  }

  const validCategories = new Set(['marketing', 'finance', 'inventory', 'customer', 'operations']);

  for (const item of list) {
    const rawCat = (item.category || 'marketing').toLowerCase();
    const category = validCategories.has(rawCat) ? rawCat : 'marketing';

    await businessPrisma.sellerFeature.upsert({
      where: { id: item.id },
      update: {
        name: item.name || item.id,
        category,
        description: item.description || '',
        isEnabledGlobally: item.isEnabledGlobally !== false,
        maintenanceReason: item.maintenanceReason || '',
        disabledBusinesses: item.disabledBusinesses || [],
        enabledBusinesses: item.enabledBusinesses || [],
        updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
        updatedBy: item.updatedBy || 'Admin System',
      },
      create: {
        id: item.id,
        name: item.name || item.id,
        category,
        description: item.description || '',
        isEnabledGlobally: item.isEnabledGlobally !== false,
        maintenanceReason: item.maintenanceReason || '',
        disabledBusinesses: item.disabledBusinesses || [],
        enabledBusinesses: item.enabledBusinesses || [],
        updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
        updatedBy: item.updatedBy || 'Admin System',
      },
    });
  }

  const count = await businessPrisma.sellerFeature.count();
  console.log(`Seeded ${count} seller features successfully.`);
}

async function seedSellerPenalties() {
  console.log('--- Seeding Seller Penalties ---');
  const profilesMap = readJsonFile('seller_penalties.json', '.huki_seller_penalties.json');
  if (!profilesMap || typeof profilesMap !== 'object') {
    console.log('No seller penalties data found to seed.');
    return;
  }

  const validTiers = new Set([
    'TIER_0_GOOD',
    'TIER_1_WARNING',
    'TIER_2_RESTRICTED',
    'TIER_3_CRITICAL',
    'TIER_4_SUSPENDED',
  ]);

  for (const [storeId, profile] of Object.entries(profilesMap)) {
    if (!profile) continue;
    const tier = validTiers.has(profile.tier) ? profile.tier : 'TIER_0_GOOD';
    const metrics = profile.metrics || {};

    const profileRecord = await businessPrisma.storePenaltyProfile.upsert({
      where: { storeId },
      update: {
        storeName: profile.storeName || storeId,
        totalPoints: profile.totalPoints || 0,
        penaltyPoints: profile.penaltyPoints || 0,
        tier,
        tierLabel: profile.tierLabel || '🟢 Hạng Tốt (Uy Tín)',
        tierDescription: profile.tierDescription || '',
        badgeColor: profile.badgeColor || 'emerald',
        canJoinPlatformFlashSale: profile.canJoinPlatformFlashSale !== false,
        maxBooksPerPlatformSlot: profile.maxBooksPerPlatformSlot || 20,
        activeSanctionMessage: profile.activeSanctionMessage || null,
        sanctionExpiresAt: profile.sanctionExpiresAt ? new Date(profile.sanctionExpiresAt) : null,
        quarterlyResetDate: profile.quarterlyResetDate ? new Date(profile.quarterlyResetDate) : null,
        quarterCycle: profile.quarterCycle || 'Q4-2026',
        nonFulfillmentRate: metrics.nonFulfillmentRate || 0.0,
        lateShipmentRate: metrics.lateShipmentRate || 0.0,
        responseRate: metrics.responseRate || 100.0,
        rating: metrics.rating || 5.0,
        checklist: profile.checklist || [],
        updatedAt: new Date(),
      },
      create: {
        storeId,
        storeName: profile.storeName || storeId,
        totalPoints: profile.totalPoints || 0,
        penaltyPoints: profile.penaltyPoints || 0,
        tier,
        tierLabel: profile.tierLabel || '🟢 Hạng Tốt (Uy Tín)',
        tierDescription: profile.tierDescription || '',
        badgeColor: profile.badgeColor || 'emerald',
        canJoinPlatformFlashSale: profile.canJoinPlatformFlashSale !== false,
        maxBooksPerPlatformSlot: profile.maxBooksPerPlatformSlot || 20,
        activeSanctionMessage: profile.activeSanctionMessage || null,
        sanctionExpiresAt: profile.sanctionExpiresAt ? new Date(profile.sanctionExpiresAt) : null,
        quarterlyResetDate: profile.quarterlyResetDate ? new Date(profile.quarterlyResetDate) : null,
        quarterCycle: profile.quarterCycle || 'Q4-2026',
        nonFulfillmentRate: metrics.nonFulfillmentRate || 0.0,
        lateShipmentRate: metrics.lateShipmentRate || 0.0,
        responseRate: metrics.responseRate || 100.0,
        rating: metrics.rating || 5.0,
        checklist: profile.checklist || [],
      },
    });

    const records = profile.history || profile.violationHistory || [];
    for (const rec of records) {
      if (!rec || !rec.id) continue;
      await businessPrisma.penaltyRecord.upsert({
        where: { id: rec.id },
        update: {
          profileId: profileRecord.id,
          storeId,
          violationType: rec.violationType || 'GENERIC',
          violationName: rec.violationName || 'Vi phạm',
          points: rec.points || 0,
          reason: rec.reason || '',
          relatedOrderId: rec.relatedOrderId || null,
          relatedBookTitle: rec.relatedBookTitle || null,
          expiresAt: rec.expiresAt ? new Date(rec.expiresAt) : new Date(Date.now() + 86400000 * 90),
          isAppealed: Boolean(rec.isAppealed),
          appealStatus: rec.appealStatus || 'NONE',
          appealReason: rec.appealReason || null,
          appealProof: rec.appealProof || null,
          appealAdminNote: rec.appealAdminNote || null,
          appealReviewedAt: rec.appealReviewedAt ? new Date(rec.appealReviewedAt) : null,
        },
        create: {
          id: rec.id,
          profileId: profileRecord.id,
          storeId,
          violationType: rec.violationType || 'GENERIC',
          violationName: rec.violationName || 'Vi phạm',
          points: rec.points || 0,
          reason: rec.reason || '',
          relatedOrderId: rec.relatedOrderId || null,
          relatedBookTitle: rec.relatedBookTitle || null,
          expiresAt: rec.expiresAt ? new Date(rec.expiresAt) : new Date(Date.now() + 86400000 * 90),
          createdAt: rec.createdAt ? new Date(rec.createdAt) : new Date(),
          isAppealed: Boolean(rec.isAppealed),
          appealStatus: rec.appealStatus || 'NONE',
          appealReason: rec.appealReason || null,
          appealProof: rec.appealProof || null,
          appealAdminNote: rec.appealAdminNote || null,
          appealReviewedAt: rec.appealReviewedAt ? new Date(rec.appealReviewedAt) : null,
        },
      });
    }
  }

  const profileCount = await businessPrisma.storePenaltyProfile.count();
  const recordCount = await businessPrisma.penaltyRecord.count();
  console.log(`Seeded ${profileCount} penalty profiles and ${recordCount} penalty records successfully.`);
}

async function seedSystemMaintenance() {
  console.log('--- Seeding System Maintenance ---');
  const data = readJsonFile('system_maintenance.json', '.huki_system_maintenance.json');
  if (!data) {
    console.log('No system maintenance data found to seed.');
    return;
  }

  const mode = data.mode === 'IMMEDIATE' ? 'IMMEDIATE' : 'GRACEFUL';

  await identityPrisma.systemMaintenanceConfig.upsert({
    where: { id: 'SYSTEM_DEFAULT' },
    update: {
      isActive: Boolean(data.isActive),
      mode,
      scheduledStartTime: data.scheduledStartTime ? new Date(data.scheduledStartTime) : null,
      scheduledEndTime: data.scheduledEndTime ? new Date(data.scheduledEndTime) : null,
      drainDurationMinutes: data.drainDurationMinutes || 5,
      drainStartedAt: data.drainStartedAt ? new Date(data.drainStartedAt) : null,
      reason: data.reason || 'Hệ thống bảo trì định kỳ',
      affectedRoles: data.affectedRoles || ['ALL'],
      allowOfflineDrm: data.allowOfflineDrm !== false,
      allowShipperOfflineCod: data.allowShipperOfflineCod !== false,
      supportHotline: data.supportHotline || '1900 6868',
      supportEmail: data.supportEmail || 'hotro@huki.vn',
      whitelistIps: data.whitelistIps || ['127.0.0.1', '::1'],
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
      updatedBy: data.updatedBy || 'Hệ Thống HuKi',
    },
    create: {
      id: 'SYSTEM_DEFAULT',
      isActive: Boolean(data.isActive),
      mode,
      scheduledStartTime: data.scheduledStartTime ? new Date(data.scheduledStartTime) : null,
      scheduledEndTime: data.scheduledEndTime ? new Date(data.scheduledEndTime) : null,
      drainDurationMinutes: data.drainDurationMinutes || 5,
      drainStartedAt: data.drainStartedAt ? new Date(data.drainStartedAt) : null,
      reason: data.reason || 'Hệ thống bảo trì định kỳ',
      affectedRoles: data.affectedRoles || ['ALL'],
      allowOfflineDrm: data.allowOfflineDrm !== false,
      allowShipperOfflineCod: data.allowShipperOfflineCod !== false,
      supportHotline: data.supportHotline || '1900 6868',
      supportEmail: data.supportEmail || 'hotro@huki.vn',
      whitelistIps: data.whitelistIps || ['127.0.0.1', '::1'],
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
      updatedBy: data.updatedBy || 'Hệ Thống HuKi',
    },
  });

  const record = await identityPrisma.systemMaintenanceConfig.findUnique({ where: { id: 'SYSTEM_DEFAULT' } });
  console.log(`Seeded System Maintenance Config: isActive=${record?.isActive}, mode=${record?.mode}`);
}

async function main() {
  try {
    await seedBroadcastNotifications();
    await seedSellerFeatures();
    await seedSellerPenalties();
    await seedSystemMaintenance();
    console.log('✅ ALL 4 MODULES SEEDED SUCCESSFULLY INTO POSTGRESQL!');
  } catch (err) {
    console.error('❌ Error during seeding:', err);
    process.exit(1);
  } finally {
    await businessPrisma.$disconnect();
    await identityPrisma.$disconnect();
  }
}

main();
