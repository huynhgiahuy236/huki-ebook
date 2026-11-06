/**
 * TEST 3: PHÒNG VỆ ENDPOINT NỘI BỘ (INTERNAL ROUTE SHIELDING)
 * File: scriptstest/audit/api-gateway/test_internal_route_shielding.ts
 * Target: api-gateway on http://localhost:3000
 */

const { Client } = require('../../../platform/node_modules/pg');
const bcrypt = require('../../../platform/node_modules/bcrypt');

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/huki_identity';
const BASE_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';

const USER_EMAIL = 'audit_gw_shield_user@huki.vn';
const TEST_PASS = 'TestPass123!';

async function runTest() {
  console.log('===============================================================');
  console.log('🚀 [TEST 3] PHÒNG VỆ ENDPOINT NỘI BỘ (INTERNAL ROUTE SHIELDING AUDIT)');
  console.log(`🎯 Target Gateway: ${BASE_URL}`);
  console.log('===============================================================\n');

  const pgClient = new Client({ connectionString: DB_URL });
  await pgClient.connect();

  let passed = 0;
  let total = 0;

  function assertCheck(desc, condition, details = '') {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✅ [PASS] ${desc} ${details ? '(' + details + ')' : ''}`);
    } else {
      console.log(`  🚨 [VULNERABILITY DETECTED] ${desc} ${details ? '(' + details + ')' : ''}`);
    }
  }

  try {
    // 1. SETUP: Lấy token người dùng thường hợp lệ
    console.log('--- BƯỚC 1: ĐĂNG NHẬP LẤY TOKEN CỦA USER THƯỜNG ---');
    const passHash = await bcrypt.hash(TEST_PASS, 10);
    await pgClient.query(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified_at, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, 'GW Shield User', 'USER', 'ACTIVE', NOW(), NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET password_hash = $2, role = 'USER', status = 'ACTIVE';
    `, [USER_EMAIL, passHash]);

    const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.0.92.1' },
      body: JSON.stringify({ email: USER_EMAIL, password: TEST_PASS }),
    });
    const loginData = await loginRes.json();
    const token = loginData.data?.accessToken;
    console.log(`  ✅ User Token acquired (length: ${token?.length})\n`);

    // 2. KỊCH BẢN 1: Truy cập /api/v1/internal/addresses (prefix /internal/)
    console.log('--- BƯỚC 2: GỌI GET /api/v1/internal/addresses TỪ CLIENT NGOÀI INTERNET ---');
    const resPrefixInternal = await fetch(`${BASE_URL}/api/v1/internal/addresses`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Forwarded-For': '10.0.92.2',
      },
    });
    const dataPrefixInternal = await resPrefixInternal.json().catch(() => ({}));
    console.log(`  [Response /internal/addresses] HTTP Status: ${resPrefixInternal.status}`);
    console.log(`                                 Body: ${JSON.stringify(dataPrefixInternal)}`);

    assertCheck(
      'Route bắt đầu bằng /internal/ bị từ chối 404 Not Found do không có service route mapping',
      resPrefixInternal.status === 404,
      `Status: ${resPrefixInternal.status}`
    );

    // 3. KỊCH BẢN 2: Truy cập /api/v1/internal/vouchers/apply
    console.log('\n--- BƯỚC 3: GỌI POST /api/v1/internal/vouchers/apply TỪ CLIENT NGOÀI INTERNET ---');
    const resVoucherInternal = await fetch(`${BASE_URL}/api/v1/internal/vouchers/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Forwarded-For': '10.0.92.3',
      },
      body: JSON.stringify({ code: 'DISCOUNT50', orderTotal: 200000 }),
    });
    const dataVoucherInternal = await resVoucherInternal.json().catch(() => ({}));
    console.log(`  [Response /internal/vouchers/apply] HTTP Status: ${resVoucherInternal.status}`);
    console.log(`                                       Body: ${JSON.stringify(dataVoucherInternal)}`);

    assertCheck(
      'Route /internal/vouchers/apply bị từ chối 404 Not Found',
      resVoucherInternal.status === 404,
      `Status: ${resVoucherInternal.status}`
    );

    // 4. KỊCH BẢN 3: TÁI HIỆN LỖ HỔNG GW-SEC-02 - ROUTE NỘI BỘ NẰM TRONG SERVICE PREFIX
    console.log('\n--- BƯỚC 4: TÁI HIỆN LỖ HỔNG GW-SEC-02: GỌI ROUTE NỘI BỘ /api/v1/shipping/fee/internal ---');
    console.log('  🎯 Path này có phân đoạn đầu là "shipping", Gateway chuyển tiếp thẳng vào shipping-service!');
    const resNestedInternal = await fetch(`${BASE_URL}/api/v1/shipping/fee/internal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Forwarded-For': '10.0.92.4',
      },
      body: JSON.stringify({ weightGrams: 100 }),
    });
    const dataNestedInternal = await resNestedInternal.json().catch(() => ({}));
    console.log(`  [Response /shipping/fee/internal] HTTP Status: ${resNestedInternal.status}`);
    console.log(`                                     Body: ${JSON.stringify(dataNestedInternal)}`);

    if (resNestedInternal.status !== 404 && resNestedInternal.status !== 403) {
      console.log('  🚨 [XÁC NHẬN LỖ HỔNG GW-SEC-02]: Gateway KHÔNG CHẶN route nội bộ lồng ghép!');
      console.log('     Request từ Internet đã lọt qua Gateway vào tận controller nội bộ của downstream service.');
    } else {
      console.log('  ✅ Gateway đã chặn thành công route nội bộ.');
    }

    assertCheck(
      'Kiểm tra Gateway có lá chắn chặn cứng (Shielding) mọi URL chứa phân đoạn /internal hay không',
      resNestedInternal.status === 404 || resNestedInternal.status === 403,
      `Status thực tế: ${resNestedInternal.status} (Cần chặn 403/404)`
    );

    console.log('\n===============================================================');
    console.log(`🎉 [KẾT QUẢ TEST 3]: HOÀN THÀNH (${passed}/${total} assertions ghi nhận)`);
    console.log('===============================================================');
  } catch (error) {
    console.error('\n❌ [TEST 3 FAILED]:', error.message || error);
    process.exitCode = 1;
  } finally {
    await pgClient.query(`DELETE FROM users WHERE email = $1`, [USER_EMAIL]);
    await pgClient.end();
    console.log('🔌 Đã dọn dẹp user test và đóng kết nối Database.\n');
  }
}

runTest();
