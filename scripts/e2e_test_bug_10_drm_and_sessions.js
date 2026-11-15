const { SessionService } = require('../platform/dist/out-tsc/identity-service/apps/identity-service/src/modules/session/session.service.js');
const { PrismaClient } = require('../platform/apps/commerce-service/prisma/generated/client');

async function testSessionService() {
  console.log('1. Testing SessionService location parsing...');
  const sService = new SessionService({});
  
  const localRes = sService.parseDeviceInfo('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0', '127.0.0.1');
  console.log('   Localhost device info:', localRes);
  if (localRes.location !== 'Thiết bị nội bộ (Localhost)') {
    throw new Error(`Expected 'Thiết bị nội bộ (Localhost)', got: ${localRes.location}`);
  }

  const remoteRes = sService.parseDeviceInfo('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)', '14.161.45.12');
  console.log('   Remote IP device info:', remoteRes);
  if (remoteRes.location.includes('Hà Nội')) {
    throw new Error(`Remote IP should not be hardcoded to Hà Nội! Got: ${remoteRes.location}`);
  }
  console.log('   -> Location parsing verified clean and accurate!');
}

async function testDrm5DeviceLimit() {
  console.log('\n2. Testing DRM Vault 5-Device Strict Limit...');
  process.env.COMMERCE_DATABASE_URL = process.env.COMMERCE_DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/huki_commerce';
  const prisma = new PrismaClient();
  await prisma.$connect();

  const testUserId = `test_drm_user_${Date.now()}`;
  const testLicense = await prisma.drmLicense.findFirst();
  if (!testLicense) {
    throw new Error('No DRM license found in database to test');
  }

  // Clear any existing test devices for this user
  await prisma.drmDevice.deleteMany({ where: { userId: testUserId } });

  // Dynamically import DrmVaultService logic test
  const { DrmVaultService } = require('../platform/dist/out-tsc/commerce-service/apps/commerce-service/src/modules/books/drm-vault.service.js');
  const drmService = new DrmVaultService(prisma);

  console.log(`   Registering 5 devices for user ${testUserId}...`);
  for (let i = 1; i <= 5; i++) {
    const res = await drmService.startSession(testLicense.id, {
      userId: testUserId,
      deviceId: `device_${i}`,
      deviceName: `Test Device ${i}`,
      ipAddress: `192.168.1.${i}`,
    });
    if (!res.success) {
      throw new Error(`Device ${i} registration should have succeeded, but failed: ${JSON.stringify(res)}`);
    }
  }
  console.log('   -> Successfully registered 5 devices.');

  console.log('   Attempting to register 6th device (exceeding limit)...');
  const exceedRes = await drmService.startSession(testLicense.id, {
    userId: testUserId,
    deviceId: 'device_6',
    deviceName: 'Test Device 6',
    ipAddress: '192.168.1.6',
  });

  console.log('   6th device response:', exceedRes);
  if (exceedRes.success === false && exceedRes.code === 'DRM_DEVICE_LIMIT_EXCEEDED') {
    console.log('   -> Correctly BLOCKED 6th device with DRM_DEVICE_LIMIT_EXCEEDED!');
  } else {
    throw new Error(`Expected DRM_DEVICE_LIMIT_EXCEEDED, got: ${JSON.stringify(exceedRes)}`);
  }

  // Revoke device 1
  console.log('   Revoking device 1...');
  await drmService.revokeUserDevice(testUserId, 'device_1');

  // Now device 6 should be allowed
  console.log('   Re-attempting device 6 after revocation...');
  const retryRes = await drmService.startSession(testLicense.id, {
    userId: testUserId,
    deviceId: 'device_6',
    deviceName: 'Test Device 6',
    ipAddress: '192.168.1.6',
  });

  if (retryRes.success) {
    console.log('   -> Device 6 successfully registered after freeing device slot!');
  } else {
    throw new Error(`Device 6 should have succeeded after revocation! Got: ${JSON.stringify(retryRes)}`);
  }

  // Clean up test data
  await prisma.drmDevice.deleteMany({ where: { userId: testUserId } });
  await prisma.$disconnect();
  console.log('   -> DRM Vault 5-device limit verified 100%!');
}

async function run() {
  console.log('=== E2E TEST: BUG 10 (Session Location & DRM 5-Device Limit) ===\n');
  await testSessionService();
  await testDrm5DeviceLimit();
  console.log('\n>>> SUCCESS: BUG 10 TEST PASSED! <<<');
}

run().catch((err) => {
  console.error('\nFAILED:', err);
  process.exitCode = 1;
});
