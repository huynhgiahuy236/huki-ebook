/**
 * TEST 2: AN TOÀN XOAY VÒNG REFRESH TOKEN VÀ PHÁT HIỆN REUSE (TOKEN ROTATION & REUSE ATTACK)
 * File: scriptstest/audit/identity-service/test_token_rotation_reuse.ts
 * Target: identity-service on http://localhost:3001
 */

const { Client } = require('../../../platform/node_modules/pg');
const bcrypt = require('../../../platform/node_modules/bcrypt');
const crypto = require('crypto');

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/huki_identity';
const BASE_URL = process.env.IDENTITY_BASE_URL || 'http://localhost:3001';

const TEST_EMAIL = 'audit_rtr_user@huki.vn';
const TEST_PASS = 'RtrPassword123!';

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function runTest() {
  console.log('===============================================================');
  console.log('🚀 [TEST 2] AN TOÀN XOAY VÒNG REFRESH TOKEN (RTR) & PHÁT HIỆN TÁI SỬ DỤNG (REUSE ATTACK)');
  console.log(`🎯 Endpoint: ${BASE_URL}/api/v1/auth/refresh`);
  console.log(`👤 Target User: ${TEST_EMAIL}`);
  console.log('===============================================================\n');

  const pgClient = new Client({ connectionString: DB_URL });
  await pgClient.connect();

  try {
    // 1. SETUP: Tạo người dùng test
    console.log('--- BƯỚC 1: KHỞI TẠO USER TEST TRONG DATABASE THẬT ---');
    const passHash = await bcrypt.hash(TEST_PASS, 10);
    const userRes = await pgClient.query(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified_at, failed_login_attempts, created_at, updated_at)
      VALUES (
        'a0000000-0000-4000-8000-000000000002',
        $1, $2, 'Audit Test RTR', 'USER', 'ACTIVE', NOW(), 0, NOW(), NOW()
      )
      ON CONFLICT (email) DO UPDATE SET
        password_hash = $2,
        status = 'ACTIVE',
        failed_login_attempts = 0,
        locked_until = NULL
      RETURNING id;
    `, [TEST_EMAIL, passHash]);

    const userId = userRes.rows[0].id;
    await pgClient.query('DELETE FROM auth_sessions WHERE user_id = $1', [userId]);
    console.log(`✅ User test sẵn sàng (ID: ${userId}). Đã dọn dẹp các session cũ.\n`);

    // 2. ĐĂNG NHẬP LẤY CẶP TOKEN BAN ĐẦU (Token_A)
    console.log('--- BƯỚC 2: ĐĂNG NHẬP BAN ĐẦU ĐỂ LẤY REFRESH TOKEN A ---');
    const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Forwarded-For': '10.0.99.1'
      },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASS }),
    });

    const loginData = await loginRes.json();
    if (loginRes.status !== 200) {
      throw new Error(`❌ Đăng nhập thất bại: ${JSON.stringify(loginData)}`);
    }

    const refreshTokenA = loginData.data?.refreshToken;
    const accessToken1 = loginData.data?.accessToken;
    console.log(`✅ Đăng nhập thành công!`);
    console.log(`   - AccessToken 1 (length): ${accessToken1?.length}`);
    console.log(`   - RefreshToken A: ${refreshTokenA}`);

    // Kiểm tra DB: auth_sessions vs refresh_tokens
    const sessionRes = await pgClient.query(
      `SELECT id, user_id, refresh_token_hash, revoked_at FROM auth_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    const sessionRow = sessionRes.rows[0];
    const tokenHashA = hashToken(refreshTokenA);
    console.log(`   - AuthSession created in DB: ID=${sessionRow?.id}, refreshTokenHash matched=${sessionRow?.refresh_token_hash === tokenHashA}`);

    const rtCountRes = await pgClient.query(
      `SELECT COUNT(*) FROM refresh_tokens WHERE session_id = $1`,
      [sessionRow?.id]
    );
    const initialRtCount = parseInt(rtCountRes.rows[0].count, 10);
    console.log(`   - Initial count in refresh_tokens table: ${initialRtCount}`);

    // 3. TÁI HIỆN BUG: Thử Refresh ngay sau khi đăng nhập
    console.log('\n--- BƯỚC 3: KIỂM CHỨNG LỖI TẠI RUNTIME: REFRESH NGAY SAU ĐĂNG NHẬP ---');
    const firstRefreshRes = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.0.99.1' },
      body: JSON.stringify({ refreshToken: refreshTokenA }),
    });
    const firstRefreshData = await firstRefreshRes.json();
    console.log(`[First Refresh Attempt] HTTP Status: ${firstRefreshRes.status}`);
    console.log(`                        Error Code: ${firstRefreshData.code}`);
    console.log(`                        Message: "${firstRefreshData.message}"`);

    if (firstRefreshRes.status === 401 && initialRtCount === 0) {
      console.log('🚨 PHÁT HIỆN LỖI RUNTIME [BUG-ID-12]: auth.service.ts createSession() không ghi bản ghi khởi tạo vào bảng refresh_tokens!');
      console.log('   Do đó, hàm refreshToken() không tìm thấy token trong refresh_tokens và ném lỗi 401 AUTH_TOKEN_EXPIRED.');
    }

    // 4. KÍCH HOẠT SEED BẢN GHI REFRESH TOKEN ĐỂ KIỂM TOÁN CƠ CHẾ RTR VÀ REUSE DETECTION
    console.log('\n--- BƯỚC 4: SEED BẢN GHI REFRESH TOKEN ĐỂ KIỂM TOÁN BẢO MẬT RTR & REUSE ATTACK ---');
    const familyId = crypto.randomUUID();
    const rtId = crypto.randomUUID();
    await pgClient.query(`
      INSERT INTO refresh_tokens (id, session_id, token_family, token_hash, token_type, expires_at, created_at, updated_at)
      VALUES ($1, $2, $3, $4, 'REFRESH', NOW() + INTERVAL '7 days', NOW(), NOW());
    `, [rtId, sessionRow.id, familyId, tokenHashA]);
    console.log(`✅ Đã seed bản ghi ban đầu vào refresh_tokens: family=${familyId}`);

    // Thử lại refresh hợp lệ: Token A -> Token B
    const validRefreshRes = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.0.99.1' },
      body: JSON.stringify({ refreshToken: refreshTokenA }),
    });
    const validRefreshData = await validRefreshRes.json();
    console.log(`[Valid Refresh Attempt] HTTP Status: ${validRefreshRes.status}`);
    if (validRefreshRes.status !== 200) {
      throw new Error(`❌ Refresh thất bại sau khi seed: ${JSON.stringify(validRefreshData)}`);
    }

    const refreshTokenB = validRefreshData.data?.refreshToken;
    console.log(`✅ Refresh thành công! Nhận được RefreshToken B: ${refreshTokenB?.substring(0, 16)}...`);

    // Kiểm tra DB: Token A đã bị revoked chưa?
    const checkTokenARes = await pgClient.query(`SELECT id, revoked_at, revoked_reason, replaced_by_token_id FROM refresh_tokens WHERE id = $1`, [rtId]);
    const tokenARow = checkTokenARes.rows[0];
    console.log(`   - Token A State: revoked_at=${tokenARow.revoked_at ? tokenARow.revoked_at.toISOString() : 'NULL'}, reason=${tokenARow.revoked_reason}`);
    if (!tokenARow.revoked_at) {
      throw new Error('❌ Lỗi: Token A không bị thu hồi sau khi cấp Token B!');
    }

    // 5. MÔ PHỎNG TẤN CÔNG REUSE ATTACK: Dùng lại Token A đã bị revoked
    console.log('\n--- BƯỚC 5: MÔ PHỎNG REUSE ATTACK: DÙNG LẠI TOKEN A ĐÃ BỊ THU HỒI ---');
    const reuseAttackRes = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.0.99.1' },
      body: JSON.stringify({ refreshToken: refreshTokenA }),
    });
    const reuseAttackData = await reuseAttackRes.json();
    console.log(`[Reuse Attack Attempt] HTTP Status: ${reuseAttackRes.status} | Code: ${reuseAttackData.code}`);
    console.log(`                       Message: "${reuseAttackData.message}"`);

    // 6. KIỂM TRA PHẢN ỨNG THU HỒI TOÀN BỘ TOKEN FAMILY (BREACH CONTAINMENT)
    console.log('\n--- BƯỚC 6: KIỂM TRA BREACH CONTAINMENT (XÁC THỰC THU HỒI CẢ FAMILY VÀ SESSION) ---');
    const tokensAfterBreach = await pgClient.query(
      `SELECT id, token_family, revoked_at, revoked_reason FROM refresh_tokens WHERE session_id = $1`,
      [sessionRow.id]
    );
    const sessionAfterBreach = await pgClient.query(
      `SELECT id, revoked_at FROM auth_sessions WHERE id = $1`,
      [sessionRow.id]
    );

    console.log(`   - Session status in DB: revoked_at = ${sessionAfterBreach.rows[0]?.revoked_at?.toISOString() || 'NULL'}`);
    let reuseCount = 0;
    for (const t of tokensAfterBreach.rows) {
      console.log(`   - Token ID ${t.id.substring(0, 8)}... | revoked_reason: ${t.revoked_reason} | revoked_at: ${t.revoked_at?.toISOString()}`);
      if (t.revoked_reason === 'reuse_detected') reuseCount++;
    }

    if (!sessionAfterBreach.rows[0]?.revoked_at) {
      throw new Error(`❌ LỖI AN NINH: Khi phát hiện reuse, Session người dùng KHÔNG bị thu hồi!`);
    }
    if (reuseCount === 0) {
      throw new Error(`❌ LỖI AN NINH: Token family không được gắn cờ reuse_detected!`);
    }
    console.log('✅ PASS: Cơ chế Reuse Detection hoạt động chuẩn xác: Thu hồi toàn bộ family và session!');

    // 7. THỬ DÙNG TOKEN B CỦA NẠN NHÂN
    console.log('\n--- BƯỚC 7: XÁC MINH TOKEN B CỦA NẠN NHÂN CŨNG ĐÃ BỊ VÔ HIỆU HÓA HOÀN TOÀN ---');
    const victimRes = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.0.99.1' },
      body: JSON.stringify({ refreshToken: refreshTokenB }),
    });
    const victimData = await victimRes.json();
    console.log(`[Victim Token B Attempt] HTTP Status: ${victimRes.status} | Code: ${victimData.code}`);
    console.log(`                         Message: "${victimData.message}"`);

    if (victimRes.status === 200) {
      throw new Error(`❌ LỖI AN NINH: Token B vẫn dùng được sau khi token family bị xâm nhập!`);
    }
    console.log('✅ PASS: Token B của nạn nhân đã bị từ chối thành công.');

    console.log('\n===============================================================');
    console.log('🎉 [KẾT QUẢ TEST 2]: PASS (PHÁT HIỆN THÊM BUG-ID-12 TRONG CREATE_SESSION)');
    console.log('===============================================================');
  } catch (error) {
    console.error('\n❌ [TEST 2 FAILED]:', error.message || error);
    process.exitCode = 1;
  } finally {
    await pgClient.end();
    console.log('🔌 Đã giải phóng kết nối Database.\n');
  }
}

runTest().then(() => {
  process.exit(process.exitCode || 0);
});
