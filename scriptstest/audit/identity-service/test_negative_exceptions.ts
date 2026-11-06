/**
 * TEST PHỦ ĐỊNH & KIỂM TRA ĐỘ BỀN LỖI (NEGATIVE & FAULT-TOLERANCE SUITE)
 * File: scriptstest/audit/identity-service/test_negative_exceptions.ts
 * Target: identity-service on http://localhost:3001
 */

const { Client } = require('../../../platform/node_modules/pg');
const bcrypt = require('../../../platform/node_modules/bcrypt');

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/huki_identity';
const BASE_URL = process.env.IDENTITY_BASE_URL || 'http://localhost:3001';

const TEST_EMAIL = 'audit_negative_user@huki.vn';
const TEST_PASS = 'SecurePass123!';

async function runNegativeTests() {
  console.log('===============================================================');
  console.log('🧪 [TEST 6 - NEGATIVE SUITE] KIỂM THỬ PHỦ ĐỊNH & ĐỘ BỀN LỖI (FAULT-TOLERANCE)');
  console.log(`🎯 Base URL: ${BASE_URL}`);
  console.log('===============================================================\n');

  const pgClient = new Client({ connectionString: DB_URL });
  await pgClient.connect();

  let totalTests = 0;
  let passedTests = 0;

  function assertCheck(desc, condition, details = '') {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS] ${desc} ${details ? '(' + details + ')' : ''}`);
    } else {
      console.error(`  ❌ [FAIL] ${desc} ${details ? '(' + details + ')' : ''}`);
      throw new Error(`Negative test assertion failed: ${desc}`);
    }
  }

  try {
    // -------------------------------------------------------------
    // NHÓM 1: MALFORMED PAYLOADS, VALIDATION & BACKDOOR ELIMINATION
    // -------------------------------------------------------------
    console.log('--- PHẦN 1: MALFORMED PAYLOADS, DTO VALIDATION & BACKDOOR ELIMINATION ---');

    // 1.1 Body rỗng {}
    const resEmpty = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.0.88.1' },
      body: JSON.stringify({}),
    });
    const dataEmpty = await resEmpty.json();
    assertCheck(
      'Payload rỗng gửi tới /auth/login phải trả về HTTP 400',
      resEmpty.status === 400,
      `Status: ${resEmpty.status}, Code: ${dataEmpty.code}`
    );

    // 1.2 Email sai format
    const resInvalidEmail = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.0.88.2' },
      body: JSON.stringify({ email: 'not-an-email', password: 'ValidPassword123!' }),
    });
    assertCheck(
      'Email sai định dạng phải trả về HTTP 400',
      resInvalidEmail.status === 400,
      `Status: ${resInvalidEmail.status}`
    );

    // 1.3 Mật khẩu quá ngắn (< 8 ký tự) khi đăng ký
    const resShortPass = await fetch(`${BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.0.88.3' },
      body: JSON.stringify({ email: 'valid_email_test@huki.vn', password: '123' }),
    });
    assertCheck(
      'Mật khẩu yếu khi đăng ký phải trả về HTTP 400',
      resShortPass.status === 400,
      `Status: ${resShortPass.status}`
    );

    // 1.4 SQL Injection & XSS Strings trong Payload
    const resSqlInjection = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.0.88.4' },
      body: JSON.stringify({
        email: "' OR 1=1 --",
        password: "<script>alert('xss')</script>' OR '1'='1",
      }),
    });
    assertCheck(
      'Payload SQL Injection / XSS không gây 500, bị chặn an toàn',
      resSqlInjection.status === 400 || resSqlInjection.status === 401 || resSqlInjection.status === 429,
      `Status: ${resSqlInjection.status}`
    );

    // 1.5 Xác minh loại bỏ hoàn toàn Google Login Bypass (ID-SEC-001)
    const resGoogleBypass = await fetch(`${BASE_URL}/api/v1/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.0.88.5' },
      body: JSON.stringify({ email: 'admin@huki.com' }), // Không có googleToken
    });
    const dataGoogleBypass = await resGoogleBypass.json();
    assertCheck(
      'Google Login thiếu token phải bị chặn HTTP 400 (Không cho phép bypass email)',
      resGoogleBypass.status === 400,
      `Status: ${resGoogleBypass.status}, Message: "${dataGoogleBypass.message}"`
    );

    // 1.6 Xác minh loại bỏ hoàn toàn Password Reset Backdoor 123456 (ID-SEC-002)
    const resBackdoor = await fetch(`${BASE_URL}/api/v1/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.0.88.6' },
      body: JSON.stringify({
        token: '123456',
        newPassword: 'NewSecurePassword123!',
      }),
    });
    const dataBackdoor = await resBackdoor.json();
    assertCheck(
      'Reset password bằng mã backdoor 123456 phải bị từ chối 400',
      resBackdoor.status === 400,
      `Status: ${resBackdoor.status}, Code: ${dataBackdoor.code}`
    );

    console.log('');

    // -------------------------------------------------------------
    // NHÓM 2: REJECTION OF INVALID & EXPIRED AUTH TOKENS
    // -------------------------------------------------------------
    console.log('--- PHẦN 2: TỪ CHỐI ACCESS TOKEN RÁC, HỎNG VÀ THIẾU AUTH HEADER ---');

    // 2.1 Missing Authorization Header
    const resNoAuth = await fetch(`${BASE_URL}/api/v1/users/profile`, {
      method: 'GET',
      headers: { 'X-Forwarded-For': '10.0.88.7' },
    });
    assertCheck(
      'Gọi /users/profile không có Authorization Header phải trả về HTTP 401',
      resNoAuth.status === 401,
      `Status: ${resNoAuth.status}`
    );

    // 2.2 Invalid JWT Token (Garbage string)
    const resGarbageToken = await fetch(`${BASE_URL}/api/v1/users/profile`, {
      method: 'GET',
      headers: { Authorization: 'Bearer this_is_a_garbage_token_not_jwt', 'X-Forwarded-For': '10.0.88.8' },
    });
    assertCheck(
      'Token rác gửi tới /users/profile phải trả về HTTP 401',
      resGarbageToken.status === 401,
      `Status: ${resGarbageToken.status}`
    );

    // 2.3 Malformed Base64 Token
    const resMalformedToken = await fetch(`${BASE_URL}/api/v1/sessions`, {
      method: 'GET',
      headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.badpayload.badsig', 'X-Forwarded-For': '10.0.88.9' },
    });
    assertCheck(
      'Token sai cấu trúc chữ ký gửi tới /sessions phải trả về HTTP 401',
      resMalformedToken.status === 401,
      `Status: ${resMalformedToken.status}`
    );

    console.log('');

    // -------------------------------------------------------------
    // NHÓM 3: CONCURRENT REFRESH TOKEN RACE CONDITION STRESS TEST
    // -------------------------------------------------------------
    console.log('--- PHẦN 3: BẮN ĐỒNG THỜI 5 REQUEST REFRESH VỚI CÙNG 1 REFRESH TOKEN ---');

    // 3.1 Chuẩn bị user & lấy 1 Refresh Token hợp lệ duy nhất
    const passHash = await bcrypt.hash(TEST_PASS, 10);
    const userRes = await pgClient.query(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified_at, created_at, updated_at)
      VALUES ('a0000000-0000-4000-8000-000000000009', $1, $2, 'Negative Audit User', 'USER', 'ACTIVE', NOW(), NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET password_hash = $2, status = 'ACTIVE'
      RETURNING id;
    `, [TEST_EMAIL, passHash]);
    const userId = userRes.rows[0].id;

    // Xóa session cũ
    await pgClient.query(`DELETE FROM auth_sessions WHERE user_id = $1`, [userId]);

    // Đăng nhập lấy Refresh Token ban đầu
    const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.0.9.1' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASS }),
    });
    const loginData = await loginRes.json();
    const targetRefreshToken = loginData.data?.refreshToken;
    console.log(`  🔑 Initial Refresh Token acquired: ${targetRefreshToken?.substring(0, 16)}...`);

    // 3.2 Bắn 5 request refresh đồng thời qua Promise.all()
    console.log('  ⚡ Bắn đồng thời 5 request POST /api/v1/auth/refresh...');
    const refreshRequests = Array.from({ length: 5 }, (_, i) =>
      fetch(`${BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': `10.0.9.${10 + i}`,
        },
        body: JSON.stringify({ refreshToken: targetRefreshToken }),
      }).then(async (res) => ({
        index: i + 1,
        status: res.status,
        body: await res.json(),
      }))
    );

    const results = await Promise.all(refreshRequests);

    const successCount = results.filter((r) => r.status === 200).length;
    const rejectedCount = results.filter((r) => r.status === 401 || r.status === 400).length;
    const serverErrorCount = results.filter((r) => r.status >= 500).length;

    console.log('  📊 Kết quả phân bổ trạng thái phản hồi:');
    results.forEach((r) => {
      console.log(`     - Request #${r.index}: HTTP ${r.status} | Code: ${r.body.code || 'OK'}`);
    });

    console.log(`  📈 Tổng kết: 200 OK=${successCount} | 4xx Rejected=${rejectedCount} | 5xx Errors=${serverErrorCount}`);

    assertCheck(
      'Không có bất kỳ request nào sinh lỗi 500 Internal Server Error',
      serverErrorCount === 0,
      `5xx count: ${serverErrorCount}`
    );

    assertCheck(
      'Tối đa chỉ 1 request xoay vòng token thành công (hoặc 0 nếu reuse trigger tức thì)',
      successCount <= 1,
      `Success count: ${successCount}`
    );

    assertCheck(
      'Các request đồng thời còn lại bị từ chối có kiểm soát với mã 4xx',
      rejectedCount >= 4,
      `Rejected count: ${rejectedCount}`
    );

    // 3.3 Kiểm tra tình trạng service sau stress test
    const pingRes = await fetch(`${BASE_URL}/api/v1/health`);
    const pingData = await pingRes.json();
    assertCheck(
      'Dịch vụ identity-service vẫn duy trì trạng thái HEALTHY sau stress test',
      pingRes.status === 200 && pingData.data?.status === 'ok',
      `Health status: ${pingRes.status}, data.status: ${pingData.data?.status}`
    );

    console.log('\n===============================================================');
    console.log(`🎉 [KẾT QUẢ TOÀN BỘ NEGATIVE SUITE]: PASS 100% (${passedTests}/${totalTests} TESTS)`);
    console.log('===============================================================');
  } catch (error) {
    console.error('\n❌ [NEGATIVE SUITE FAILED]:', error.message || error);
    process.exitCode = 1;
  } finally {
    // Dọn dẹp user test
    await pgClient.query(`DELETE FROM users WHERE email = $1`, [TEST_EMAIL]);
    await pgClient.end();
    console.log('🔌 Đã dọn dẹp dữ liệu và giải phóng kết nối Database.\n');
  }
}

runNegativeTests().then(() => {
  process.exit(process.exitCode || 0);
});
