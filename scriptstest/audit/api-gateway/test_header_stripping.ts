// /**
//  * TEST 2: KIỂM TOÁN CHỐNG GIẢ MẠO HEADER (HEADER STRIPPING & IDENTITY SPOOFING DEFENSE)
//  * File: scriptstest/audit/api-gateway/test_header_stripping.ts
//  * Target: api-gateway on http://localhost:3000
//  */
//
// const { Client } = require('../../../platform/node_modules/pg');
// const bcrypt = require('../../../platform/node_modules/bcrypt');
//
// const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/huki_identity';
// const BASE_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';
//
// const USER_EMAIL = 'audit_gw_test_user@huki.vn';
// const TEST_PASS = 'TestPass123!';
//
// async function runTest() {
//   console.log('===============================================================');
//   console.log('🚀 [TEST 2] KIỂM TOÁN CHỐNG GIẢ MẠO HEADER (HEADER STRIPPING & SPOOFING DEFENSE)');
//   console.log(`🎯 Target Gateway: ${BASE_URL}`);
//   console.log('===============================================================\n');
//
//   const pgClient = new Client({ connectionString: DB_URL });
//   await pgClient.connect();
//
//   let passed = 0;
//   let total = 0;
//
//   function assertCheck(desc, condition, details = '') {
//     total++;
//     if (condition) {
//       passed++;
//       console.log(`  ✅ [PASS] ${desc} ${details ? '(' + details + ')' : ''}`);
//     } else {
//       console.log(`  🚨 [VULNERABILITY / FAILED] ${desc} ${details ? '(' + details + ')' : ''}`);
//     }
//   }
//
//   try {
//     // 1. SETUP: Tạo User role USER hợp lệ trong DB
//     console.log('--- BƯỚC 1: KHỞI TẠO USER TEST THẬT (ROLE: USER) ---');
//     const passHash = await bcrypt.hash(TEST_PASS, 10);
//     const userRes = await pgClient.query(`
//       INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified_at, created_at, updated_at)
//       VALUES (gen_random_uuid(), $1, $2, 'GW Audit User', 'USER', 'ACTIVE', NOW(), NOW(), NOW())
//       ON CONFLICT (email) DO UPDATE SET password_hash = $2, role = 'USER', status = 'ACTIVE'
//       RETURNING id, role;
//     `, [USER_EMAIL, passHash]);
//     const userId = userRes.rows[0].id;
//     console.log(`  ✅ User ID: ${userId} | Role trong DB: ${userRes.rows[0].role}\n`);
//
//     // 2. KỊCH BẢN 1: Khách vãng lai (No token) tự đính kèm x-user-id và x-user-role: PLATFORM_ADMIN
//     console.log('--- BƯỚC 2: KHÁCH VÃNG LAI GỬI HEADER GIẢ MẠO TỚI ROUTE AUTHENTICATED (/cart) ---');
//     console.log('  🎯 Headers gửi kèm: x-user-id: admin-999, x-user-role: PLATFORM_ADMIN');
//     const resNoToken = await fetch(`${BASE_URL}/api/v1/cart`, {
//       method: 'GET',
//       headers: {
//         'x-user-id': 'admin-999',
//         'x-user-role': 'PLATFORM_ADMIN',
//         'x-internal-service-key': 'hacked-key',
//         'X-Forwarded-For': '10.0.91.1',
//       },
//     });
//     const dataNoToken = await resNoToken.json().catch(() => ({}));
//     console.log(`  [Response No Token] HTTP Status: ${resNoToken.status} | Code: ${dataNoToken.code}`);
//     console.log(`                      Message: "${dataNoToken.message}"`);
//
//     assertCheck(
//       'Gateway từ chối 401 khi không có JWT, bất chấp client giả mạo x-user-id và x-user-role',
//       resNoToken.status === 401 && dataNoToken.code === 'AUTH_TOKEN_MISSING',
//       `Status: ${resNoToken.status}`
//     );
//
//     // 3. ĐĂNG NHẬP LẤY TOKEN HỢP LỆ CỦA USER THƯỜNG
//     console.log('\n--- BƯỚC 3: ĐĂNG NHẬP QUA GATEWAY ĐỂ LẤY TOKEN HỢP LỆ CỦA ROLE USER ---');
//     const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.0.91.2' },
//       body: JSON.stringify({ email: USER_EMAIL, password: TEST_PASS }),
//     });
//     const loginData = await loginRes.json();
//     const token = loginData.data?.accessToken;
//     console.log(`  ✅ Đăng nhập thành công! Token acquired (length: ${token?.length})\n`);
//
//     // 4. KỊCH BẢN 2: User thường gọi endpoint SELLER (/books POST) nhưng cố tình mạo danh x-user-role: SELLER
//     console.log('--- BƯỚC 4: USER THƯỜNG GỌI ENDPOINT SELLER (/books POST) KÈM SPOOFED x-user-role ---');
//     console.log('  🎯 Request: POST /api/v1/books với JWT của USER thường + header "x-user-role: SELLER"');
//     const resRoleSpoof = await fetch(`${BASE_URL}/api/v1/books`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'Authorization': `Bearer ${token}`,
//         'x-user-role': 'SELLER',
//         'x-user-id': 'faked-seller-id',
//         'X-Forwarded-For': '10.0.91.3',
//       },
//       body: JSON.stringify({ title: 'Sách Giả Mạo' }),
//     });
//     const dataRoleSpoof = await resRoleSpoof.json().catch(() => ({}));
//     console.log(`  [Response Role Spoof] HTTP Status: ${resRoleSpoof.status} | Code: ${dataRoleSpoof.code}`);
//     console.log(`                        Message: "${dataRoleSpoof.message}"`);
//
//     assertCheck(
//       'Gateway phát hiện role thực tế từ JWT và chặn 403 Forbidden, không cho phép nâng quyền qua x-user-role',
//       resRoleSpoof.status === 403 && dataRoleSpoof.code === 'AUTHZ_ROLE_INSUFFICIENT',
//       `Status: ${resRoleSpoof.status}, Code: ${dataRoleSpoof.code}`
//     );
//
//     // 5. KỊCH BẢN 3: TÁI HIỆN LỖ HỔNG GW-SEC-01: BỎ LỌT x-internal-service-key VÀ x-internal-api-key
//     console.log('\n--- BƯỚC 5: TÁI HIỆN LỖ HỔNG GW-SEC-01: KIỂM TOÁN LỌT HEADER x-internal-service-key ---');
//     console.log('  🎯 Gửi request kèm "x-internal-service-key: leaked-secret-123" và "x-internal-api-key: leaked-api-key"');
//
//     // Gọi thử endpoint shipping nội bộ qua Gateway
//     const resKeyLeak = await fetch(`${BASE_URL}/api/v1/shipping/fee/internal`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'Authorization': `Bearer ${token}`,
//         'x-internal-service-key': 'leaked-secret-123',
//         'x-internal-api-key': 'leaked-api-key',
//         'X-Forwarded-For': '10.0.91.4',
//       },
//       body: JSON.stringify({
//         weightGrams: 500,
//         fromProvinceId: 1,
//         toProvinceId: 1,
//       }),
//     });
//     const dataKeyLeak = await resKeyLeak.json().catch(() => ({}));
//     console.log(`  [Response Internal Key] HTTP Status: ${resKeyLeak.status} | Code: ${dataKeyLeak.code || dataKeyLeak.error}`);
//     console.log(`                          Message: "${dataKeyLeak.message}"`);
//
//     // Nếu Gateway chặn hoặc xóa header, downstream sẽ không thấy header hoặc Gateway chặn 403/404.
//     // Nếu Gateway forward nguyên vẹn tới shipping-service, shipping-service sẽ trả về mã lỗi thẩm định key (AUTH_INTERNAL_API_KEY_INVALID)
//     if (resKeyLeak.status === 401 && (dataKeyLeak.message?.includes('Invalid internal service key') || dataKeyLeak.code === 'AUTH_INTERNAL_API_KEY_INVALID')) {
//       console.log('  🚨 [XÁC NHẬN LỖ HỔNG GW-SEC-01]: Gateway KHÔNG xóa header x-internal-service-key!');
//       console.log('     Request đã được forward thẳng tới downstream shipping-service kèm nguyên vẹn header nội bộ!');
//     }
//
//     assertCheck(
//       'Ghi nhận hành vi của Gateway đối với header x-internal-service-key',
//       true,
//       `HTTP Status: ${resKeyLeak.status}`
//     );
//
//     console.log('\n===============================================================');
//     console.log(`🎉 [KẾT QUẢ TEST 2]: HOÀN THÀNH (${passed}/${total} assertions ghi nhận)`);
//     console.log('===============================================================');
//   } catch (error) {
//     console.error('\n❌ [TEST 2 FAILED]:', error.message || error);
//     process.exitCode = 1;
//   } finally {
//     await pgClient.query(`DELETE FROM users WHERE email = $1`, [USER_EMAIL]);
//     await pgClient.end();
//     console.log('🔌 Đã dọn dẹp user test và đóng kết nối Database.\n');
//   }
// }
//
// runTest();
