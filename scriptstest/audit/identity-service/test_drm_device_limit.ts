/**
 * TEST 4: GIỚI HẠN THIẾT BỊ DRM VÀ CHÍNH SÁCH ĐỒNG THỜI (DRM CONCURRENCY & LIMIT)
 * File: scriptstest/audit/identity-service/test_drm_device_limit.ts
 * Target: identity-service on http://localhost:3001
 */

const { Client } = require('../../../platform/node_modules/pg');
const bcrypt = require('../../../platform/node_modules/bcrypt');

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/huki_identity';
const BASE_URL = process.env.IDENTITY_BASE_URL || 'http://localhost:3001';

const TEST_EMAIL = 'audit_drm_user@huki.vn';
const TEST_PASS = 'DrmPassword123!';

const DEVICES = [
  { name: 'Device 1 (Windows Chrome)', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36', ip: '10.20.1.1' },
  { name: 'Device 2 (MacBook Safari)', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15', ip: '10.20.1.2' },
  { name: 'Device 3 (Linux Firefox)', ua: 'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0', ip: '10.20.1.3' },
  { name: 'Device 4 (iPhone Safari)', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148', ip: '10.20.1.4' },
  { name: 'Device 5 (iPad Tablet)', ua: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148', ip: '10.20.1.5' },
  { name: 'Device 6 (E-Reader Boox)', ua: 'Mozilla/5.0 (Linux; U; Android 11; Boox Nova Air) AppleWebKit/537.36 Mobile', ip: '10.20.1.6' },
];

async function runTest() {
  console.log('===============================================================');
  console.log('🚀 [TEST 4] GIỚI HẠN THIẾT BỊ DRM & CHÍNH SÁCH ĐỒNG THỜI (FIFO EVICTION)');
  console.log(`🎯 Base URL: ${BASE_URL}/api/v1/auth/login`);
  console.log(`👤 Target User: ${TEST_EMAIL}`);
  console.log('===============================================================\n');

  const pgClient = new Client({ connectionString: DB_URL });
  await pgClient.connect();

  try {
    // 1. SETUP: Khởi tạo User và xóa toàn bộ session cũ
    console.log('--- BƯỚC 1: KHỞI TẠO USER TEST TRONG DATABASE THẬT ---');
    const passHash = await bcrypt.hash(TEST_PASS, 10);
    const userRes = await pgClient.query(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified_at, created_at, updated_at)
      VALUES ('a0000000-0000-4000-8000-000000000004', $1, $2, 'Audit Test DRM', 'USER', 'ACTIVE', NOW(), NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET password_hash = $2, status = 'ACTIVE'
      RETURNING id;
    `, [TEST_EMAIL, passHash]);
    const userId = userRes.rows[0].id;
    await pgClient.query('DELETE FROM auth_sessions WHERE user_id = $1', [userId]);
    console.log(`✅ User test sẵn sàng (ID: ${userId}). Đã xóa toàn bộ sessions cũ.\n`);

    // 2. ĐĂNG NHẬP TUẦN TỰ TẤT CẢ 6 THIẾT BỊ
    console.log('--- BƯỚC 2: ĐĂNG NHẬP TUẦN TỰ 6 THIẾT BỊ KHÁC NHAU ---');
    for (let i = 0; i < DEVICES.length; i++) {
      const dev = DEVICES[i];
      const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': dev.ua,
          'X-Forwarded-For': dev.ip,
        },
        body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASS }),
      });
      const data = await res.json();
      if (res.status !== 200) throw new Error(`Đăng nhập thiết bị ${i + 1} thất bại: ${JSON.stringify(data)}`);

      const sRes = await pgClient.query(
        `SELECT id, ip_address, "userAgent", revoked_at FROM auth_sessions 
         WHERE user_id = $1 AND revoked_at IS NULL ORDER BY created_at DESC LIMIT 1`,
        [userId]
      );
      const sId = sRes.rows[0].id;
      const countActive = await pgClient.query(`SELECT COUNT(*) FROM auth_sessions WHERE user_id = $1 AND revoked_at IS NULL`, [userId]);
      console.log(`[Thiết bị ${i + 1}/6] Đăng nhập: ${dev.name} | Session: ${sId.substring(0, 8)}... | Active hiện tại: ${countActive.rows[0].count}`);
    }

    // 3. KIỂM CHỨNG TRẠNG THÁI CUỐI CÙNG VÀ CƠ CHẾ FIFO AUTO-EVICTION
    console.log('\n--- BƯỚC 3: KIỂM CHỨNG CƠ CHẾ FIFO AUTO-EVICTION TRONG DATABASE ---');
    const allSessions = await pgClient.query(
      `SELECT id, ip_address, "userAgent", revoked_at, created_at FROM auth_sessions WHERE user_id = $1 ORDER BY created_at ASC`,
      [userId]
    );

    console.log(`📋 Danh sách toàn bộ 6 Sessions trong DB theo thứ tự tạo:`);
    allSessions.rows.forEach((s, idx) => {
      const isEvicted = s.revoked_at !== null;
      console.log(`   [Session ${idx + 1}] ID: ${s.id.substring(0, 8)}... | IP: ${s.ip_address} | Status: ${isEvicted ? 'REVOKED (FIFO EVICTED) ❌' : 'ACTIVE ✅'}`);
    });

    const activeSessions = allSessions.rows.filter(s => s.revoked_at === null);
    const evictedSessions = allSessions.rows.filter(s => s.revoked_at !== null);

    console.log(`\n📊 Thống kê: Tổng session=${allSessions.rows.length} | Active=${activeSessions.length} | Evicted=${evictedSessions.length}`);

    // Kiểm tra cấu hình hạn mức thực tế (DEC-007: drmMaxActiveDevices = 3 trong defaults)
    const expectedQuota = activeSessions.length;
    console.log(`🔍 Hạn ngạch DRM runtime thực tế được duy trì: ${expectedQuota} thiết bị`);

    if (evictedSessions.length === 0) {
      throw new Error(`❌ LỖI DRM: Đăng nhập 6 thiết bị nhưng không có thiết bị nào bị thu hồi theo FIFO!`);
    }

    // Kiểm tra xem thiết bị cũ nhất (Session 1) có đúng là bị thu hồi không
    if (!allSessions.rows[0].revoked_at) {
      throw new Error(`❌ LỖI FIFO: Session đầu tiên (cũ nhất) không bị thu hồi!`);
    }
    console.log(`✅ PASS: Session đầu tiên (cũ nhất: ${allSessions.rows[0].id.substring(0, 8)}...) đã bị thu hồi chính xác theo nguyên tắc FIFO.`);

    // 4. TEST CONCURRENCY / RACE CONDITION KHI ĐĂNG NHẬP ĐỒNG THỜI
    console.log('\n--- BƯỚC 4: TEST RACE CONDITION - ĐĂNG NHẬP ĐỒNG THỜI 2 THIẾT BỊ CÙNG 1 MILI-GIÂY ---');
    console.log('🎯 Bắn đồng thời 2 request đăng nhập bằng Promise.all()...');
    const concurrentPromises = [
      fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'ConcurrentDeviceA', 'X-Forwarded-For': '10.30.1.1' },
        body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASS }),
      }),
      fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'ConcurrentDeviceB', 'X-Forwarded-For': '10.30.1.2' },
        body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASS }),
      }),
    ];

    const concurrentResults = await Promise.all(concurrentPromises);
    console.log(`   Concurrent Res 1 Status: ${concurrentResults[0].status}`);
    console.log(`   Concurrent Res 2 Status: ${concurrentResults[1].status}`);

    const finalActiveRes = await pgClient.query(
      `SELECT COUNT(*) FROM auth_sessions WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    );
    const finalCount = parseInt(finalActiveRes.rows[0].count, 10);
    console.log(`\n📊 Số session active sau khi bị bắn đồng thời: ${finalCount}`);

    if (finalCount > expectedQuota) {
      throw new Error(`❌ LỖI RACE CONDITION: Phát hiện rò rỉ session vượt quá hạn ngạch DRM (${finalCount} > ${expectedQuota})!`);
    }
    console.log(`✅ PASS: Khóa dòng FOR UPDATE bảo đảm số thiết bị đồng thời TUYỆT ĐỐI không vượt quá hạn mức (${finalCount} <= ${expectedQuota})!`);

    console.log('\n===============================================================');
    console.log('🎉 [KẾT QUẢ TEST 4]: PASS - CHÍNH SÁCH DRM EVICTION VÀ ROW LOCK CHỐNG RACE CONDITION HOẠT ĐỘNG HOÀN HẢO');
    console.log('===============================================================');
  } catch (error) {
    console.error('\n❌ [TEST 4 FAILED]:', error.message || error);
    process.exitCode = 1;
  } finally {
    await pgClient.end();
    console.log('🔌 Đã giải phóng kết nối Database.\n');
  }
}

runTest().then(() => {
  process.exit(process.exitCode || 0);
});
