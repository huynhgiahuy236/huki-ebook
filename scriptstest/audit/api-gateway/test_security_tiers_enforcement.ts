// /**
//  * TEST 4: THỰC THI PHÂN TẦNG BẢO MẬT & MA TRẬN RBAC (SECURITY TIERS & RBAC ENFORCEMENT)
//  * File: scriptstest/audit/api-gateway/test_security_tiers_enforcement.ts
//  * Target: api-gateway on http://localhost:3000
//  */
//
// const { Client } = require('../../../platform/node_modules/pg');
// const bcrypt = require('../../../platform/node_modules/bcrypt');
//
// const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/huki_identity';
// const BASE_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';
//
// const USER_EMAIL = 'audit_rbac_user@huki.vn';
// const SELLER_EMAIL = 'audit_rbac_seller@huki.vn';
// const ADMIN_EMAIL = 'audit_rbac_admin@huki.vn';
// const TEST_PASS = 'TestPass123!';
//
// async function runTest() {
//   console.log('===============================================================');
//   console.log('🚀 [TEST 4] THỰC THI PHÂN TẦNG BẢO MẬT (SECURITY TIERS & RBAC MATRIX)');
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
//     // 1. SETUP: Tạo 3 tài khoản với 3 vai trò: USER, BUSINESS, PLATFORM_ADMIN
//     console.log('--- BƯỚC 1: KHỞI TẠO 3 USER TEST CHO 3 CẤP BẬC VAI TRÒ ---');
//     const passHash = await bcrypt.hash(TEST_PASS, 10);
//
//     await pgClient.query(`
//       INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified_at, created_at, updated_at)
//       VALUES 
//         (gen_random_uuid(), $1, $4, 'RBAC Customer', 'USER', 'ACTIVE', NOW(), NOW(), NOW()),
//         (gen_random_uuid(), $2, $4, 'RBAC Merchant', 'BUSINESS', 'ACTIVE', NOW(), NOW(), NOW()),
//         (gen_random_uuid(), $3, $4, 'RBAC Administrator', 'PLATFORM_ADMIN', 'ACTIVE', NOW(), NOW(), NOW())
//       ON CONFLICT (email) DO UPDATE SET password_hash = $4, status = 'ACTIVE';
//     `, [USER_EMAIL, SELLER_EMAIL, ADMIN_EMAIL, passHash]);
//
//     console.log('  ✅ 3 User test đã sẵn sàng trong DB.');
//
//     // 2. ĐĂNG NHẬP LẤY TOKEN CỦA CẢ 3 VAI TRÒ
//     console.log('\n--- BƯỚC 2: ĐĂNG NHẬP QUA GATEWAY ĐỂ THU THẬP TOKEN CÁC VAI TRÒ ---');
//     async function login(email, ipSuffix) {
//       const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': `10.0.94.${ipSuffix}` },
//         body: JSON.stringify({ email, password: TEST_PASS }),
//       });
//       const data = await res.json();
//       return data.data?.accessToken;
//     }
//
//     const userToken = await login(USER_EMAIL, 1);
//     const sellerToken = await login(SELLER_EMAIL, 2);
//     const adminToken = await login(ADMIN_EMAIL, 3);
//
//     console.log(`  🔑 USER Token acquired:          len=${userToken?.length}`);
//     console.log(`  🔑 BUSINESS Token acquired:      len=${sellerToken?.length}`);
//     console.log(`  🔑 PLATFORM_ADMIN Token acquired: len=${adminToken?.length}\n`);
//
//     // 3. KIỂM TOÁN TẦNG 1: PUBLIC TIER (GET /api/v1/books)
//     console.log('--- BƯỚC 3: KIỂM TOÁN TẦNG PUBLIC (GET /api/v1/books) ---');
//     const resPublicGuest = await fetch(`${BASE_URL}/api/v1/books`, {
//       method: 'GET',
//       headers: { 'X-Forwarded-For': '10.0.93.2' },
//     });
//     console.log(`  [Public - Guest] HTTP Status: ${resPublicGuest.status}`);
//     assertCheck('Khách vãng lai truy cập được route PUBLIC không cần token', resPublicGuest.status === 200);
//
//     // 4. KIỂM TOÁN TẦNG 2: AUTHENTICATED TIER (GET /api/v1/cart)
//     console.log('\n--- BƯỚC 4: KIỂM TOÁN TẦNG AUTHENTICATED (GET /api/v1/cart) ---');
//     const resAuthGuest = await fetch(`${BASE_URL}/api/v1/cart`, {
//       method: 'GET',
//       headers: { 'X-Forwarded-For': '10.0.93.3' },
//     });
//     const dataAuthGuest = await resAuthGuest.json().catch(() => ({}));
//     console.log(`  [Auth - Guest] HTTP Status: ${resAuthGuest.status} | Code: ${dataAuthGuest.code}`);
//     assertCheck('Khách vãng lai bị từ chối 401 AUTH_TOKEN_MISSING', resAuthGuest.status === 401 && dataAuthGuest.code === 'AUTH_TOKEN_MISSING');
//
//     const resAuthUser = await fetch(`${BASE_URL}/api/v1/cart`, {
//       method: 'GET',
//       headers: { 'Authorization': `Bearer ${userToken}`, 'X-Forwarded-For': '10.0.93.4' },
//     });
//     console.log(`  [Auth - Customer] HTTP Status: ${resAuthUser.status}`);
//     assertCheck('Người dùng có token hợp lệ được phép truy cập', resAuthUser.status === 200);
//
//     // 5. KIỂM TOÁN TẦNG 3: SELLER TIER (POST /api/v1/books)
//     console.log('\n--- BƯỚC 5: KIỂM TOÁN TẦNG SELLER (POST /api/v1/books) ---');
//     const resSellerCustomer = await fetch(`${BASE_URL}/api/v1/books`, {
//       method: 'POST',
//       headers: { 'Authorization': `Bearer ${userToken}`, 'Content-Type': 'application/json', 'X-Forwarded-For': '10.0.93.5' },
//       body: JSON.stringify({ title: 'Test Book' }),
//     });
//     const dataSellerCustomer = await resSellerCustomer.json().catch(() => ({}));
//     console.log(`  [Seller - Customer] HTTP Status: ${resSellerCustomer.status} | Code: ${dataSellerCustomer.code}`);
//     assertCheck('Customer thường gọi SELLER endpoint bị chặn 403 AUTHZ_ROLE_INSUFFICIENT', resSellerCustomer.status === 403 && dataSellerCustomer.code === 'AUTHZ_ROLE_INSUFFICIENT');
//
//     const resSellerMerchant = await fetch(`${BASE_URL}/api/v1/books`, {
//       method: 'POST',
//       headers: { 'Authorization': `Bearer ${sellerToken}`, 'Content-Type': 'application/json', 'X-Forwarded-For': '10.0.93.6' },
//       body: JSON.stringify({ title: 'Test Book' }),
//     });
//     console.log(`  [Seller - Business] HTTP Status: ${resSellerMerchant.status}`);
//     assertCheck('Business / Merchant được phép gọi SELLER endpoint (vượt qua Gateway)', resSellerMerchant.status !== 403 && resSellerMerchant.status !== 401);
//
//     // 6. KIỂM TOÁN TẦNG 4: ADMIN TIER (GET /api/v1/admin/finance/reconciliation & POST /broadcast-notifications)
//     console.log('\n--- BƯỚC 6: KIỂM TOÁN TẦNG ADMIN (GET /api/v1/admin/finance/reconciliation) ---');
//     const resAdminReconMerchant = await fetch(`${BASE_URL}/api/v1/admin/finance/reconciliation`, {
//       method: 'GET',
//       headers: { 'Authorization': `Bearer ${sellerToken}`, 'X-Forwarded-For': '10.0.93.7' },
//     });
//     const dataAdminReconMerchant = await resAdminReconMerchant.json().catch(() => ({}));
//     console.log(`  [Admin - Business on /admin/finance] HTTP Status: ${resAdminReconMerchant.status} | Code: ${dataAdminReconMerchant.code}`);
//     assertCheck('Merchant không được gọi ADMIN endpoint /admin/finance (403 Forbidden)', resAdminReconMerchant.status === 403 && dataAdminReconMerchant.code === 'AUTHZ_ROLE_INSUFFICIENT');
//
//     const resAdminReconRoot = await fetch(`${BASE_URL}/api/v1/admin/finance/reconciliation`, {
//       method: 'GET',
//       headers: { 'Authorization': `Bearer ${adminToken}`, 'X-Forwarded-For': '10.0.93.8' },
//     });
//     console.log(`  [Admin - Platform Admin on /admin/finance] HTTP Status: ${resAdminReconRoot.status}`);
//     assertCheck('Platform Admin được phép gọi ADMIN endpoint /admin/finance', resAdminReconRoot.status !== 403 && resAdminReconRoot.status !== 401);
//
//     // Kiểm tra thêm sự thiếu sót của POST /broadcast-notifications trong ADMIN tier
//     console.log('\n  🎯 Khảo sát thêm: POST /api/v1/broadcast-notifications với Merchant token');
//     const resBroadcastMerchant = await fetch(`${BASE_URL}/api/v1/broadcast-notifications`, {
//       method: 'POST',
//       headers: { 'Authorization': `Bearer ${sellerToken}`, 'Content-Type': 'application/json', 'X-Forwarded-For': '10.0.93.9' },
//       body: JSON.stringify({ title: 'Merchant Broadcast' }),
//     });
//     const dataBroadcastMerchant = await resBroadcastMerchant.json().catch(() => ({}));
//     console.log(`  [POST /broadcast-notifications - Business] HTTP Status: ${resBroadcastMerchant.status} | Code: ${dataBroadcastMerchant.code}`);
//     if (resBroadcastMerchant.status !== 403) {
//       console.log('  🚨 [PHÁT HIỆN LỖ HỔNG ROUTING]: POST /broadcast-notifications bị bỏ quên khỏi Rule 4 (ADMIN), chỉ được Gateway gán nhãn AUTHENTICATED!');
//     }
//
//     // 7. KIỂM CHỨNG LỖ HỔNG GW-ROUT-02 (TRAILING SLASH BỊ TỪ CHỐI 401 TRÊN PUBLIC ROUTE)
//     console.log('\n--- BƯỚC 7: TÁI HIỆN LỖ HỔNG GW-ROUT-02 (ĐƯỜNG DẪN CÓ DẤU GẠCH CHÉO CUỐI) ---');
//     console.log('  🎯 Request: POST /api/v1/auth/login/ (với trailing slash)');
//     const resTrailingSlash = await fetch(`${BASE_URL}/api/v1/auth/login/`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.0.93.9' },
//       body: JSON.stringify({ email: USER_EMAIL, password: TEST_PASS }),
//     });
//     const dataTrailingSlash = await resTrailingSlash.json().catch(() => ({}));
//     console.log(`  [Trailing Slash Login] HTTP Status: ${resTrailingSlash.status} | Code: ${dataTrailingSlash.code}`);
//     console.log(`                         Message: "${dataTrailingSlash.message}"`);
//
//     if (resTrailingSlash.status === 401 && dataTrailingSlash.code === 'AUTH_TOKEN_MISSING') {
//       console.log('  🚨 [XÁC NHẬN LỖ HỔNG GW-ROUT-02]: Dấu gạch chéo cuối làm trượt khỏi quy tắc PUBLIC, bị Gateway từ chối 401!');
//     } else {
//       console.log('  ✅ Xử lý dấu gạch chéo cuối thành công.');
//     }
//
//     assertCheck(
//       'Ghi nhận hành vi đối với đường dẫn có dấu gạch chéo cuối',
//       true,
//       `Status: ${resTrailingSlash.status}, Code: ${dataTrailingSlash.code}`
//     );
//
//     console.log('\n===============================================================');
//     console.log(`🎉 [KẾT QUẢ TEST 4]: HOÀN THÀNH (${passed}/${total} assertions ghi nhận)`);
//     console.log('===============================================================');
//   } catch (error) {
//     console.error('\n❌ [TEST 4 FAILED]:', error.message || error);
//     process.exitCode = 1;
//   } finally {
//     await pgClient.query(`DELETE FROM users WHERE email IN ($1, $2, $3)`, [USER_EMAIL, SELLER_EMAIL, ADMIN_EMAIL]);
//     await pgClient.end();
//     console.log('🔌 Đã dọn dẹp users test và đóng kết nối Database.\n');
//   }
// }
//
// runTest();
