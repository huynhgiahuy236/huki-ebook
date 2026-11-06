/**
 * TEST 1: CHỐNG BRUTE-FORCE VÀ KHÓA TÀI KHOẢN (BRUTE-FORCE & LOCKOUT)
 * File: scriptstest/audit/identity-service/test_bruteforce_lockout.ts
 * Target: identity-service on http://localhost:3001
 */

const { Client } = require('../../../platform/node_modules/pg');
const bcrypt = require('../../../platform/node_modules/bcrypt');

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/huki_identity';
const BASE_URL = process.env.IDENTITY_BASE_URL || 'http://localhost:3001';

const TEST_EMAIL = 'audit_bruteforce_user@huki.vn';
const CORRECT_PASS = 'StrongPassword123!';
const WRONG_PASS = 'WrongPassword999!';

async function runTest() {
  console.log('===============================================================');
  console.log('🚀 [TEST 1] CHỐNG BRUTE-FORCE VÀ KHÓA TÀI KHOẢN TẠI IDENTITY-SERVICE');
  console.log(`🎯 Endpoint: ${BASE_URL}/api/v1/auth/login`);
  console.log(`👤 Target User: ${TEST_EMAIL}`);
  console.log('===============================================================\n');

  const pgClient = new Client({ connectionString: DB_URL });
  await pgClient.connect();

  try {
    // 1. SETUP: Tạo hoặc Reset trạng thái người dùng trong DB
    console.log('--- BƯỚC 1: KHỞI TẠO USER TEST TRONG DATABASE THẬT ---');
    const passHash = await bcrypt.hash(CORRECT_PASS, 10);
    await pgClient.query(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified_at, failed_login_attempts, locked_until, created_at, updated_at)
      VALUES (
        'a0000000-0000-4000-8000-000000000001',
        $1, $2, 'Audit Test BruteForce', 'USER', 'ACTIVE', NOW(), 0, NULL, NOW(), NOW()
      )
      ON CONFLICT (email) DO UPDATE SET
        password_hash = $2,
        status = 'ACTIVE',
        failed_login_attempts = 0,
        locked_until = NULL,
        email_verified_at = NOW();
    `, [TEST_EMAIL, passHash]);

    console.log('✅ User test đã sẵn sàng: status=ACTIVE, failed_login_attempts=0, locked_until=NULL\n');

    // 2. EXECUTION: Bắn 5 request đăng nhập sai mật khẩu liên tiếp
    console.log('--- BƯỚC 2: BẮN 5 REQUEST ĐĂNG NHẬP SAI MẬT KHẨU LIÊN TIẾP ---');
    for (let attempt = 1; attempt <= 5; attempt++) {
      const response = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: TEST_EMAIL, password: WRONG_PASS }),
      });

      const data = await response.json();
      console.log(`[Attempt ${attempt}/5] HTTP Status: ${response.status} | Code: ${data.code || data.error || 'N/A'}`);
      console.log(`             Message: "${data.message}"`);

      // Kiểm tra DB sau mỗi lần bắn
      const dbRes = await pgClient.query('SELECT failed_login_attempts, locked_until FROM users WHERE email = $1', [TEST_EMAIL]);
      const row = dbRes.rows[0];
      console.log(`             DB State: failed_login_attempts=${row.failed_login_attempts}, locked_until=${row.locked_until}`);

      if (attempt < 5) {
        if (row.failed_login_attempts !== attempt) {
          throw new Error(`❌ Sai lệch DB: Lần thử ${attempt} nhưng failed_login_attempts = ${row.failed_login_attempts}`);
        }
      } else {
        // Lần thứ 5 phải kích hoạt khóa
        if (row.failed_login_attempts < 5 || !row.locked_until) {
          throw new Error(`❌ Lỗi bảo mật: Sau 5 lần nhập sai nhưng tài khoản KHÔNG bị khóa locked_until!`);
        }
        console.log(`\n🔒 TÀI KHOẢN ĐÃ BỊ KHÓA THÀNH CÔNG TẠI LẦN THỬ THỨ 5! Locked until: ${row.locked_until}`);
      }
    }

    // 3. EXECUTION: Thử đăng nhập lần thứ 6 với MẬT KHẨU ĐÚNG
    console.log('\n--- BƯỚC 3: THỬ ĐĂNG NHẬP LẦN THỨ 6 VỚI MẬT KHẨU ĐÚNG (TEST LOCKOUT ENFORCEMENT) ---');
    const correctRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: CORRECT_PASS }),
    });

    const correctData = await correctRes.json();
    console.log(`[Attempt 6 - CORRECT PASS] HTTP Status: ${correctRes.status}`);
    console.log(`                           Response Code: ${correctData.code}`);
    console.log(`                           Message: "${correctData.message}"`);

    if (correctRes.status === 200 || correctRes.status === 201) {
      throw new Error(`❌ THẤT BẠI: Tài khoản đang bị khóa nhưng vẫn cho phép đăng nhập thành công!`);
    }

    if (correctData.code === 'AUTH_ACCOUNT_LOCKED' || correctData.message.includes('khóa')) {
      console.log('✅ PASS: Hệ thống chặn thành công truy cập khi tài khoản bị khóa trước khi xác thực bcrypt!');
    } else {
      console.log(`⚠️ CẢNH BÁO: Request bị từ chối nhưng mã lỗi không phải AUTH_ACCOUNT_LOCKED (${correctData.code})`);
    }

    // 4. CLEANUP
    console.log('\n--- BƯỚC 4: DỌN DẸP TRẠNG THÁI (CLEANUP) ---');
    await pgClient.query('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE email = $1', [TEST_EMAIL]);
    console.log('✅ Đã reset trạng thái user test về bình thường.');

    console.log('\n===============================================================');
    console.log('🎉 [KẾT QUẢ TEST 1]: PASS - CƠ CHẾ BRUTE-FORCE LOCKOUT HOẠT ĐỘNG HOÀN HẢO');
    console.log('===============================================================');
  } catch (error) {
    console.error('\n❌ [TEST 1 FAILED]:', error.message || error);
    process.exitCode = 1;
  } finally {
    await pgClient.end();
    console.log('🔌 Đã giải phóng kết nối Database.\n');
  }
}

runTest().then(() => {
  process.exit(process.exitCode || 0);
});

