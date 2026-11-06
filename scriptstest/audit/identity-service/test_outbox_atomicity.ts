// /**
//  * TEST 5: TÍNH NHẤT QUÁN CỦA TRANSACTIONAL OUTBOX KHI CÓ TRANSACTION NGHIỆP VỤ
//  * File: scriptstest/audit/identity-service/test_outbox_atomicity.ts
//  * Target: identity-service on http://localhost:3001
//  */
//
// const { Client } = require('../../../platform/node_modules/pg');
//
// const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/huki_identity';
// const BASE_URL = process.env.IDENTITY_BASE_URL || 'http://localhost:3001';
//
// const UNIQUE_ID = Date.now();
// const NEW_EMAIL = `audit_outbox_${UNIQUE_ID}@huki.vn`;
// const USER_PASS = 'StrongPass123!';
//
// async function runTest() {
//   console.log('===============================================================');
//   console.log('🚀 [TEST 5] KIỂM CHỨNG TÍNH NHẤT QUÁN CỦA TRANSACTIONAL OUTBOX (OUTBOX PIPELINE)');
//   console.log(`🎯 Endpoint: ${BASE_URL}/api/v1/auth/register`);
//   console.log(`👤 New User to Register: ${NEW_EMAIL}`);
//   console.log('===============================================================\n');
//
//   const pgClient = new Client({ connectionString: DB_URL });
//   await pgClient.connect();
//
//   try {
//     // 1. KIỂM TRA TRẠNG THÁI OUTBOX TRƯỚC KHI GỌI NGHIỆP VỤ
//     console.log('--- BƯỚC 1: ĐO ĐẠC TRẠNG THÁI BẢNG OUTBOX_EVENTS BAN ĐẦU ---');
//     const initialOutboxRes = await pgClient.query('SELECT COUNT(*) FROM outbox_events');
//     const initialOutboxCount = parseInt(initialOutboxRes.rows[0].count, 10);
//     console.log(`📊 Số lượng sự kiện trong bảng outbox_events ban đầu: ${initialOutboxCount}\n`);
//
//     // 2. KÍCH HOẠT SỰ KIỆN NGHIỆP VỤ: ĐĂNG KÝ USER MỚI
//     console.log('--- BƯỚC 2: GỌI API ĐĂNG KÝ USER MỚI (POST /api/v1/auth/register) ---');
//     const regRes = await fetch(`${BASE_URL}/api/v1/auth/register`, {
//       method: 'POST',
//       headers: { 
//         'Content-Type': 'application/json',
//         'X-Forwarded-For': '10.50.1.1'
//       },
//       body: JSON.stringify({
//         email: NEW_EMAIL,
//         password: USER_PASS,
//         fullName: 'Audit Outbox User',
//         phone: '0988776655',
//       }),
//     });
//
//     const regData = await regRes.json();
//     console.log(`[Register Response] HTTP Status: ${regRes.status}`);
//     console.log(`                    Message: "${regData.message || JSON.stringify(regData)}"`);
//
//     if (regRes.status !== 201 && regRes.status !== 200) {
//       throw new Error(`❌ Đăng ký thất bại: ${JSON.stringify(regData)}`);
//     }
//
//     // Kiểm tra DB xem User đã được ghi vào bảng users chưa
//     const userInDb = await pgClient.query('SELECT id, email, status, created_at FROM users WHERE email = $1', [NEW_EMAIL]);
//     if (userInDb.rows.length === 0) {
//       throw new Error(`❌ Lỗi: User không được ghi vào DB!`);
//     }
//     const createdUser = userInDb.rows[0];
//     console.log(`✅ User đã được ghi nhận vào PostgreSQL (users): ID=${createdUser.id}, status=${createdUser.status}\n`);
//
//     // 3. ĐỢI 2 GIÂY VÀ ĐO ĐẠC LẠI BẢNG OUTBOX_EVENTS
//     console.log('--- BƯỚC 3: KIỂM CHỨNG BẢNG OUTBOX_EVENTS SAU KHI USER ĐƯỢC TẠO THÀNH CÔNG ---');
//     console.log('⏳ Đợi 2 giây để publisher và event bus xử lý...');
//     await new Promise((r) => setTimeout(r, 2000));
//
//     const afterOutboxRes = await pgClient.query('SELECT COUNT(*) FROM outbox_events');
//     const afterOutboxCount = parseInt(afterOutboxRes.rows[0].count, 10);
//     console.log(`📊 Số lượng sự kiện trong bảng outbox_events sau khi đăng ký: ${afterOutboxCount}`);
//
//     const newEventsInDb = await pgClient.query(
//       `SELECT id, event_id, type, aggregate_id, status, attempts, published_at, created_at 
//        FROM outbox_events WHERE aggregate_id = $1`,
//       [createdUser.id]
//     );
//
//     console.log(`🔍 Tìm kiếm sự kiện của User ${createdUser.id} trong outbox_events: ${newEventsInDb.rows.length} bản ghi`);
//
//     if (newEventsInDb.rows.length === 0) {
//       throw new Error('❌ Lỗi: Thao tác đăng ký user thành công nhưng không có sự kiện outbox nào được ghi vào bảng outbox_events!');
//     } else {
//       console.log('✅ PASS [ID-DATA-001 FIXED]: Sự kiện outbox được ghi nhận thành công và tự động xuất bản:', newEventsInDb.rows[0]);
//     }
//
//     // 4. CLEANUP USER TEST
//     console.log('\n--- BƯỚC 4: DỌN DẸP DỮ LIỆU USER TEST ---');
//     await pgClient.query('DELETE FROM users WHERE email = $1', [NEW_EMAIL]);
//     console.log(`✅ Đã xóa user test ${NEW_EMAIL} khỏi DB.`);
//
//     console.log('\n===============================================================');
//     console.log('🎉 [KẾT QUẢ TEST 5]: PASS 100% - TRANSACTIONAL OUTBOX PIPELINE HOẠT ĐỘNG CHUẨN XÁC');
//     console.log('===============================================================');
//   } catch (error) {
//     console.error('\n❌ [TEST 5 FAILED]:', error.message || error);
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
