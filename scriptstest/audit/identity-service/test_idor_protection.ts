// /**
//  * TEST 3: KIỂM TOÁN LỖ HỔNG IDOR / BOLA TRÊN THÔNG TIN TÀI KHOẢN & PHIÊN
//  * File: scriptstest/audit/identity-service/test_idor_protection.ts
//  * Target: identity-service on http://localhost:3001
//  */
//
// const { Client } = require('../../../platform/node_modules/pg');
// const bcrypt = require('../../../platform/node_modules/bcrypt');
//
// const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/huki_identity';
// const BASE_URL = process.env.IDENTITY_BASE_URL || 'http://localhost:3001';
//
// const USER_A_EMAIL = 'audit_idor_user_a@huki.vn';
// const USER_B_EMAIL = 'audit_idor_user_b@huki.vn';
// const TEST_PASS = 'TestPass123!';
//
// async function runTest() {
//   console.log('===============================================================');
//   console.log('🚀 [TEST 3] KIỂM TOÁN LỖ HỔNG IDOR / BOLA & TRUY CẬP TRÁI PHÉP GIỮA CÁC USER');
//   console.log(`🎯 Base URL: ${BASE_URL}`);
//   console.log(`👤 User A (Attacker): ${USER_A_EMAIL}`);
//   console.log(`👤 User B (Victim):   ${USER_B_EMAIL}`);
//   console.log('===============================================================\n');
//
//   const pgClient = new Client({ connectionString: DB_URL });
//   await pgClient.connect();
//
//   try {
//     // 1. SETUP: Khởi tạo User A và User B
//     console.log('--- BƯỚC 1: KHỞI TẠO USER A VÀ USER B TRONG DATABASE ---');
//     const passHash = await bcrypt.hash(TEST_PASS, 10);
//     const userARes = await pgClient.query(`
//       INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified_at, created_at, updated_at)
//       VALUES ('a0000000-0000-4000-8000-00000000000a', $1, $2, 'User A (Attacker)', 'USER', 'ACTIVE', NOW(), NOW(), NOW())
//       ON CONFLICT (email) DO UPDATE SET password_hash = $2, status = 'ACTIVE'
//       RETURNING id;
//     `, [USER_A_EMAIL, passHash]);
//     const userAId = userARes.rows[0].id;
//
//     const userBRes = await pgClient.query(`
//       INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified_at, created_at, updated_at)
//       VALUES ('a0000000-0000-4000-8000-00000000000b', $1, $2, 'User B (Victim)', 'USER', 'ACTIVE', NOW(), NOW(), NOW())
//       ON CONFLICT (email) DO UPDATE SET password_hash = $2, status = 'ACTIVE'
//       RETURNING id;
//     `, [USER_B_EMAIL, passHash]);
//     const userBId = userBRes.rows[0].id;
//
//     console.log(`✅ User A ID: ${userAId}`);
//     console.log(`✅ User B ID: ${userBId}\n`);
//
//     // 2. ĐĂNG NHẬP LẤY ACCESS TOKEN CỦA USER A & USER B
//     console.log('--- BƯỚC 2: ĐĂNG NHẬP ĐỂ LẤY TOKEN CỦA USER A VÀ PHIÊN CỦA USER B ---');
//     const loginARes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.0.10.1' },
//       body: JSON.stringify({ email: USER_A_EMAIL, password: TEST_PASS }),
//     });
//     const loginAData = await loginARes.json();
//     const tokenA = loginAData.data?.accessToken;
//
//     const loginBRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.0.10.2' },
//       body: JSON.stringify({ email: USER_B_EMAIL, password: TEST_PASS }),
//     });
//     const loginBData = await loginBRes.json();
//     const tokenB = loginBData.data?.accessToken;
//
//     // Lấy Session ID thực tế của User B
//     const sessionBRes = await pgClient.query(
//       `SELECT id, revoked_at FROM auth_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
//       [userBId]
//     );
//     const sessionBId = sessionBRes.rows[0]?.id;
//     console.log(`✅ User A Token acquired (len: ${tokenA?.length})`);
//     console.log(`✅ User B Session ID in DB: ${sessionBId}\n`);
//
//     // 3. KỊCH BẢN IDOR 1: User A cố tình gửi lệnh DELETE để thu hồi Session của User B
//     console.log('--- BƯỚC 3: TEST IDOR TRÊN SESSION - USER A GỌI DELETE SESSION CỦA USER B ---');
//     console.log(`🎯 Request: DELETE /api/v1/sessions/${sessionBId} với Bearer Token của User A`);
//     const idorSessionRes = await fetch(`${BASE_URL}/api/v1/sessions/${sessionBId}`, {
//       method: 'DELETE',
//       headers: {
//         'Authorization': `Bearer ${tokenA}`,
//         'X-Forwarded-For': '10.0.10.1',
//       },
//     });
//     const idorSessionData = await idorSessionRes.json();
//     console.log(`[Result] HTTP Status: ${idorSessionRes.status} | Code: ${idorSessionData.code || idorSessionData.error}`);
//     console.log(`         Message: "${idorSessionData.message}"`);
//
//     // Kiểm tra DB xem Session B có bị thu hồi trái phép không
//     const checkBRes = await pgClient.query(`SELECT id, revoked_at FROM auth_sessions WHERE id = $1`, [sessionBId]);
//     const isSessionBRevoked = checkBRes.rows[0]?.revoked_at !== null;
//     console.log(`         Session B DB state: revoked_at = ${checkBRes.rows[0]?.revoked_at || 'NULL (STILL ACTIVE)'}`);
//
//     if (isSessionBRevoked) {
//       throw new Error(`❌ LỖI AN NINH NGHIÊM TRỌNG (IDOR): User A đã xóa thành công session của User B!`);
//     } else {
//       console.log('✅ PASS: Cơ chế SessionController kiểm tra chặt chẽ userId, chặn thành công IDOR (404 Not Found).\n');
//     }
//
//     // 4. KỊCH BẢN BOLA / ADMIN ACCESS CONTROL: User A (Customer) cố tình gọi các endpoint Admin
//     console.log('--- BƯỚC 4: KIỂM TRA PHÂN QUYỀN ADMIN RBAC (NGĂN CHẶN BOLA / BROKEN ACCESS CONTROL) ---');
//     console.log('🎯 Thử nghiệm 4.1: User A (Role USER) gọi GET /api/v1/users/admin/all');
//     const adminAllRes = await fetch(`${BASE_URL}/api/v1/users/admin/all`, {
//       method: 'GET',
//       headers: {
//         'Authorization': `Bearer ${tokenA}`,
//         'X-Forwarded-For': '10.0.10.1',
//       },
//     });
//     const adminAllData = await adminAllRes.json();
//     console.log(`[Result 4.1] HTTP Status: ${adminAllRes.status} | Body: ${JSON.stringify(adminAllData)}`);
//
//     if (adminAllRes.status !== 403) {
//       throw new Error(`❌ LỖI BẢO MẬT: Endpoint Admin /users/admin/all không chặn Role USER (HTTP ${adminAllRes.status})!`);
//     }
//     console.log('✅ PASS [ID-SEC-003 FIXED]: User A (Role USER) bị chặn truy cập 403 Forbidden!');
//
//     console.log('\n🎯 Thử nghiệm 4.2: User A gọi POST /api/v1/users/admin/:id/toggle-lock để khóa User B');
//     const toggleLockRes = await fetch(`${BASE_URL}/api/v1/users/admin/${userBId}/toggle-lock`, {
//       method: 'POST',
//       headers: {
//         'Authorization': `Bearer ${tokenA}`,
//         'X-Forwarded-For': '10.0.10.1',
//       },
//     });
//     const toggleLockData = await toggleLockRes.json();
//     console.log(`[Result 4.2] HTTP Status: ${toggleLockRes.status} | Body: ${JSON.stringify(toggleLockData)}`);
//
//     if (toggleLockRes.status !== 403) {
//       throw new Error(`❌ LỖI BẢO MẬT: Endpoint toggle-lock không chặn Role USER (HTTP ${toggleLockRes.status})!`);
//     }
//     console.log('✅ PASS [ID-SEC-003 FIXED]: Thao tác khóa tài khoản trái phép bị chặn 403 Forbidden!');
//
//     // Kiểm tra DB xem User B có bị ảnh hưởng không
//     const userBCheck = await pgClient.query(`SELECT status FROM users WHERE id = $1`, [userBId]);
//     console.log(`             User B Status in DB sau khi chặn tấn công: ${userBCheck.rows[0]?.status}`);
//
//     if (userBCheck.rows[0]?.status !== 'ACTIVE') {
//       throw new Error(`❌ Lỗi dữ liệu: Trạng thái User B bị thay đổi bất thường (${userBCheck.rows[0]?.status})!`);
//     }
//     console.log('✅ PASS: Trạng thái User B được bảo toàn nguyên vẹn ACTIVE.');
//
//     console.log('\n===============================================================');
//     console.log('🎉 [KẾT QUẢ TEST 3]: PASS 100% - IDOR TRÊN SESSION VÀ BOLA TRÊN ADMIN ENDPOINTS ĐƯỢC BẢO VỆ TRIỆT ĐỂ');
//     console.log('===============================================================');
//   } catch (error) {
//     console.error('\n❌ [TEST 3 FAILED]:', error.message || error);
//     process.exitCode = 1;
//   } finally {
//     await pgClient.end();
//     console.log('🔌 Đã giải phóng kết nối Database.\n');
//   }
// }
//
// runTest().then(() => {
//   process.exit(process.exitCode || 0);
// });
//
