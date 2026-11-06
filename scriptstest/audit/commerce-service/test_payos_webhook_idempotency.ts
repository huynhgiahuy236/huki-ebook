// /**
//  * TEST 1: PAYOS WEBHOOK VERIFICATION, IDEMPOTENCY & AMOUNT TAMPERING
//  * File: scriptstest/audit/commerce-service/test_payos_webhook_idempotency.ts
//  * Target: commerce-service (Port 3003) & api-gateway (Port 3000)
//  * Database: PostgreSQL huki_commerce
//  */
//
// import { createHmac } from 'crypto';
// import { Client } from 'pg';
// import * as jwt from 'jsonwebtoken';
//
// const COMMERCE_URL = process.env.COMMERCE_SERVICE_URL || 'http://localhost:3003';
// const GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';
// const COMMERCE_DB_URL = process.env.COMMERCE_DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/huki_commerce';
// const PAYOS_CHECKSUM_KEY = process.env.PAYOS_CHECKSUM_KEY || '5f651706f17b598ba726b39e3dd06dd4606edc1e46b790c5b8fad2e01931c704';
// const JWT_SECRET = process.env.JWT_SECRET || '0521ab048d035a99b2c967bcadd4fb2bea5c6ed05b4dc7fe5cc129fe50051890d79a031d1a8c036b29e5b74dc82ab6b1e67cd5be3fb6a0838cb6bb9080f818c0';
//
// function stringify(value: unknown): string {
//   if (value === null || value === undefined) return '';
//   if (Array.isArray(value)) return JSON.stringify(value);
//   if (typeof value === 'object') {
//     const ordered = Object.keys(value as object)
//       .sort()
//       .reduce<Record<string, unknown>>((result, key) => {
//         result[key] = (value as Record<string, unknown>)[key];
//         return result;
//       }, {});
//     return JSON.stringify(ordered);
//   }
//   return String(value);
// }
//
// function signPayOSData(data: Record<string, unknown>, checksumKey: string): string {
//   const query = Object.keys(data)
//     .sort()
//     .map((key) => `${key}=${stringify(data[key])}`)
//     .join('&');
//   return createHmac('sha256', checksumKey).update(query).digest('hex');
// }
//
// async function runTest() {
//   console.log('===============================================================');
//   console.log('🚀 [TEST 1] KIỂM CHỨNG WEBHOOK THANH TOÁN PAYOS, IDEMPOTENCY & CHỐNG SỬA TIỀN');
//   console.log(`🎯 Target Commerce URL: ${COMMERCE_URL}`);
//   console.log(`🎯 Target Gateway URL:  ${GATEWAY_URL}`);
//   console.log(`🗄️ Database:             ${COMMERCE_DB_URL}`);
//   console.log('===============================================================\n');
//
//   let passed = 0;
//   let total = 0;
//
//   function assertCheck(desc: string, condition: boolean, details: string = '') {
//     total++;
//     if (condition) {
//       passed++;
//       console.log(`  ✅ [PASS] ${desc} ${details ? '(' + details + ')' : ''}`);
//     } else {
//       console.log(`  🚨 [FAIL / OBSERVATION] ${desc} ${details ? '(' + details + ')' : ''}`);
//     }
//   }
//
//   const db = new Client({ connectionString: COMMERCE_DB_URL });
//   await db.connect();
//
//   const testOrderId = '11111111-2222-3333-4444-555555555551';
//   const testSellerOrderId = '11111111-2222-3333-4444-555555555552';
//   const testPaymentId = '11111111-2222-3333-4444-555555555553';
//   const testPayosOrderCode = 8991001;
//   const testAmount = 150000;
//   const testUserId = '00000000-0000-0000-0000-000000000001';
//
//   try {
//     // 0. Cleanup any previous test data
//     await db.query('DELETE FROM payments WHERE id = $1 OR payos_order_id = $2', [testPaymentId, String(testPayosOrderCode)]);
//     await db.query('DELETE FROM seller_orders WHERE id = $1', [testSellerOrderId]);
//     await db.query('DELETE FROM orders WHERE id = $1', [testOrderId]);
//
//     // Seed test order, seller_order, and payment
//     console.log('--- BƯỚC 0: SEED DỮ LIỆU ĐƠN HÀNG VÀ THANH TOÁN TEST VÀO CƠ SỞ DỮ LIỆU ---');
//     await db.query(`
//       INSERT INTO orders (id, code, user_id, idempotency_key, item_subtotal, shipping_total, discount_total, grand_total, payment_method, payment_status, status, created_at, updated_at)
//       VALUES ($1, 'ORD-AUDIT-TEST-01', $2, 'idemp-01', $3, 0, 0, $3, 'ONLINE_PAYMENT', 'PENDING', 'PENDING_PAYMENT', NOW(), NOW())
//     `, [testOrderId, testUserId, testAmount]);
//
//     await db.query(`
//       INSERT INTO seller_orders (id, order_id, code, store_id, owner_user_id, item_subtotal, shipping_fee, grand_total, status, created_at, updated_at)
//       VALUES ($1, $2, 'SO-AUDIT-TEST-01', 'store-audit-01', $3, $4, 0, $4, 'PENDING_PAYMENT', NOW(), NOW())
//     `, [testSellerOrderId, testOrderId, testUserId, testAmount]);
//
//     await db.query(`
//       INSERT INTO payments (id, order_id, amount, method, status, provider, payos_order_id, payos_payment_link_id, created_at, updated_at)
//       VALUES ($1, $2, $3, 'ONLINE_PAYMENT', 'PENDING', 'PAYOS', $4, 'plink_test_audit_01', NOW(), NOW())
//     `, [testPaymentId, testOrderId, testAmount, String(testPayosOrderCode)]);
//
//     console.log(`  Created Order: ${testOrderId}, Payment: ${testPaymentId}, PayOS OrderCode: ${testPayosOrderCode}, Amount: ${testAmount}\n`);
//
//     // 1. KỊCH BẢN 1: Bắn webhook chuẩn với chữ ký HMAC-SHA256 hợp lệ
//     console.log('--- BƯỚC 1: BẮN WEBHOOK THANH TOÁN HỢP LỆ (VALID SIGNATURE + MATCHING AMOUNT) ---');
//     const validData: Record<string, unknown> = {
//       orderCode: testPayosOrderCode,
//       amount: testAmount,
//       description: 'Thanh toan don hang test audit',
//       accountNumber: '1029384756',
//       reference: 'FT261106_AUDIT_01',
//       transactionDateTime: '2026-11-06 14:00:00',
//       currency: 'VND',
//       paymentLinkId: 'plink_test_audit_01',
//       counterAccountBankId: 'MB',
//       counterAccountName: 'NGUYEN VAN AUDIT',
//       counterAccountNumber: '999888777',
//       virtualAccountName: 'HUKI EBOOK',
//       virtualAccountNumber: 'VA8991001',
//     };
//     const validSignature = signPayOSData(validData, PAYOS_CHECKSUM_KEY);
//
//     const payload1 = {
//       code: '00',
//       desc: 'success',
//       success: true,
//       data: validData,
//       signature: validSignature,
//     };
//
//     const res1 = await fetch(`${COMMERCE_URL}/api/v1/payments/webhooks/payos`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify(payload1),
//     });
//     const body1 = await res1.json().catch(() => ({}));
//     console.log(`  [Response 1] Status: ${res1.status} | Body: ${JSON.stringify(body1)}`);
//
//     assertCheck('Commerce Service trả về HTTP 200 cho webhook PayOS hợp lệ', res1.status === 200, `Status: ${res1.status}`);
//
//     // Verify DB state after 1st webhook
//     const paymentRow1 = (await db.query('SELECT status, transaction_id, paid_at FROM payments WHERE id = $1', [testPaymentId])).rows[0];
//     const orderRow1 = (await db.query('SELECT status, payment_status FROM orders WHERE id = $1', [testOrderId])).rows[0];
//     console.log(`  [DB State 1] Payment status: ${paymentRow1?.status}, Order status: ${orderRow1?.status}`);
//
//     assertCheck('Trạng thái Payment được cập nhật thành SUCCEEDED', paymentRow1?.status === 'SUCCEEDED', `Status: ${paymentRow1?.status}`);
//     assertCheck('Trạng thái Order được cập nhật thành PROCESSING', orderRow1?.status === 'PROCESSING', `Status: ${orderRow1?.status}`);
//
//     // 2. KỊCH BẢN 2: Bắn lại webhook trùng lặp (Duplicate Callback Idempotency)
//     console.log('\n--- BƯỚC 2: BẮN WEBHOOK TRÙNG LẶP (IDEMPOTENCY / REPLAY CALLBACK) ---');
//     const res2 = await fetch(`${COMMERCE_URL}/api/v1/payments/webhooks/payos`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify(payload1),
//     });
//     const body2 = await res2.json().catch(() => ({}));
//     console.log(`  [Response 2] Status: ${res2.status} | Body: ${JSON.stringify(body2)}`);
//
//     assertCheck('Commerce Service trả về HTTP 200 idempotent cho webhook trùng lặp', res2.status === 200, `Status: ${res2.status}`);
//
//     const paymentRow2 = (await db.query('SELECT status FROM payments WHERE id = $1', [testPaymentId])).rows[0];
//     const orderRow2 = (await db.query('SELECT status FROM orders WHERE id = $1', [testOrderId])).rows[0];
//     assertCheck('Dữ liệu DB bảo toàn tính nhất quán (Payment vẫn SUCCEEDED, Order vẫn PROCESSING)', paymentRow2?.status === 'SUCCEEDED' && orderRow2?.status === 'PROCESSING');
//
//     // 3. KỊCH BẢN 3: Bắn webhook với số tiền bị can thiệp (Amount Tampering)
//     console.log('\n--- BƯỚC 3: BẮN WEBHOOK VỚI SỐ TIỀN SAI LỆCH (AMOUNT TAMPERING) ---');
//     // Setup another order to test amount mismatch
//     const testOrderId3 = '11111111-2222-3333-4444-555555555554';
//     const testPaymentId3 = '11111111-2222-3333-4444-555555555555';
//     const testPayosOrderCode3 = 8991003;
//     await db.query(`
//       INSERT INTO orders (id, code, user_id, idempotency_key, item_subtotal, shipping_total, discount_total, grand_total, payment_method, payment_status, status, created_at, updated_at)
//       VALUES ($1, 'ORD-AUDIT-TEST-03', $2, 'idemp-03', 200000, 0, 0, 200000, 'ONLINE_PAYMENT', 'PENDING', 'PENDING_PAYMENT', NOW(), NOW())
//     `, [testOrderId3, testUserId]);
//     await db.query(`
//       INSERT INTO payments (id, order_id, amount, method, status, provider, payos_order_id, payos_payment_link_id, created_at, updated_at)
//       VALUES ($1, $2, 200000, 'ONLINE_PAYMENT', 'PENDING', 'PAYOS', $3, 'plink_test_audit_03', NOW(), NOW())
//     `, [testPaymentId3, testOrderId3, String(testPayosOrderCode3)]);
//
//     // Tampered payload: claims amount is 50000 instead of 200000
//     const tamperedData: Record<string, unknown> = {
//       ...validData,
//       orderCode: testPayosOrderCode3,
//       amount: 50000,
//     };
//     const tamperedSignature = signPayOSData(tamperedData, PAYOS_CHECKSUM_KEY);
//     const payload3 = {
//       code: '00',
//       desc: 'success',
//       success: true,
//       data: tamperedData,
//       signature: tamperedSignature,
//     };
//
//     const res3 = await fetch(`${COMMERCE_URL}/api/v1/payments/webhooks/payos`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify(payload3),
//     });
//     const body3 = await res3.json().catch(() => ({}));
//     console.log(`  [Response 3] Status: ${res3.status} | Body: ${JSON.stringify(body3)}`);
//
//     assertCheck('Hệ thống chặn và trả về HTTP 400 khi số tiền webhook không khớp với DB', res3.status === 400, `Status: ${res3.status}`);
//
//     // 4. KỊCH BẢN 4: Bắn webhook với chữ ký bị giả mạo (Invalid Signature)
//     console.log('\n--- BƯỚC 4: BẮN WEBHOOK VỚI CHỮ KÝ GIẢ MẠO / SAI LỆCH (INVALID SIGNATURE) ---');
//     const payload4 = {
//       code: '00',
//       desc: 'success',
//       success: true,
//       data: validData,
//       signature: 'deadbeef_invalid_forged_signature_00000000000000000000000000000000',
//     };
//
//     const res4 = await fetch(`${COMMERCE_URL}/api/v1/payments/webhooks/payos`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify(payload4),
//     });
//     const body4 = await res4.json().catch(() => ({}));
//     console.log(`  [Response 4] Status: ${res4.status} | Body: ${JSON.stringify(body4)}`);
//
//     assertCheck('Hệ thống chặn và trả về HTTP 400 khi chữ ký Webhook không hợp lệ', res4.status === 400, `Status: ${res4.status}`);
//
//     // 5. KỊCH BẢN 5: KIỂM CHỨNG LỖ HỔNG P0: simulate-success BYPASS THANH TOÁN
//     console.log('\n--- BƯỚC 5: KIỂM CHỨNG LỖ HỔNG P0 (PAY-VULN-001): SIMULATE-SUCCESS BYPASS ---');
//     const testOrderId5 = '11111111-2222-3333-4444-555555555556';
//     const testPaymentId5 = '11111111-2222-3333-4444-555555555557';
//     await db.query(`
//       INSERT INTO orders (id, code, user_id, idempotency_key, item_subtotal, shipping_total, discount_total, grand_total, payment_method, payment_status, status, created_at, updated_at)
//       VALUES ($1, 'ORD-AUDIT-TEST-05', $2, 'idemp-05', 300000, 0, 0, 300000, 'ONLINE_PAYMENT', 'PENDING', 'PENDING_PAYMENT', NOW(), NOW())
//     `, [testOrderId5, testUserId]);
//     await db.query(`
//       INSERT INTO payments (id, order_id, amount, method, status, provider, payos_order_id, payos_payment_link_id, created_at, updated_at)
//       VALUES ($1, $2, 300000, 'ONLINE_PAYMENT', 'PENDING', 'PAYOS', '8991005', 'plink_test_audit_05', NOW(), NOW())
//     `, [testPaymentId5, testOrderId5]);
//
//     // Regular buyer token (not admin)
//     const buyerToken = jwt.sign({ sub: testUserId, role: 'BUYER' }, JWT_SECRET, { expiresIn: '1h' });
//
//     const res5 = await fetch(`${COMMERCE_URL}/api/v1/payments/orders/${testOrderId5}/simulate-success`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'Authorization': `Bearer ${buyerToken}`,
//       },
//     });
//     const body5 = await res5.json().catch(() => ({}));
//     console.log(`  [Response 5] Status: ${res5.status} | Body: ${JSON.stringify(body5)}`);
//
//     const orderRow5 = (await db.query('SELECT status, payment_status FROM orders WHERE id = $1', [testOrderId5])).rows[0];
//     const isVulnerable = res5.status === 201 || res5.status === 200 || orderRow5?.status === 'PROCESSING';
//
//     if (isVulnerable) {
//       console.log(`  🚨 [LỖ HỔNG P0 XÁC NHẬN - PAY-VULN-001]: Endpoint simulate-success mở công khai cho Buyer! Đơn hàng đã tự động chuyển sang PROCESSING (${orderRow5?.status}) mà KHÔNG qua PayOS!`);
//     } else {
//       console.log(`  ✅ Endpoint simulate-success đã bị chặn hoặc bảo vệ.`);
//     }
//
//     assertCheck('Phát hiện & ghi nhận lỗ hổng PAY-VULN-001 (simulate-success bypass rủi ro)', isVulnerable);
//
//     // 6. Cleanup
//     console.log('\n--- BƯỚC 6: DỌN DẸP DỮ LIỆU TEST ---');
//     await db.query('DELETE FROM payments WHERE id IN ($1, $2, $3)', [testPaymentId, testPaymentId3, testPaymentId5]);
//     await db.query('DELETE FROM seller_orders WHERE id = $1', [testSellerOrderId]);
//     await db.query('DELETE FROM orders WHERE id IN ($1, $2, $3)', [testOrderId, testOrderId3, testOrderId5]);
//     console.log('  Cleaned up all test orders and payments.');
//
//   } catch (error: any) {
//     console.error('❌ Lỗi ngoại lệ trong quá trình chạy test:', error);
//   } finally {
//     await db.end();
//   }
//
//   console.log('\n===============================================================');
//   console.log(`📊 KẾT QUẢ TEST 1: Passed ${passed}/${total} assertions.`);
//   console.log('===============================================================');
//   process.exitCode = (passed === total ? 0 : 1);
// }
//
// runTest();