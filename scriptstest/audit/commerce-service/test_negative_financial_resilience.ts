// /**
//  * NEGATIVE & FAULT-TOLERANCE TEST SUITE - TIER 1 FINANCIAL SERVICES
//  * File: scriptstest/audit/commerce-service/test_negative_financial_resilience.ts
//  * Target: commerce-service (Port 3003) & business-service (Port 3002)
//  * Databases: PostgreSQL huki_commerce & huki_business
//  */
//
// import { Client } from 'pg';
// import { createHmac } from 'crypto';
// import * as jwt from 'jsonwebtoken';
//
// const COMMERCE_URL = process.env.COMMERCE_SERVICE_URL || 'http://localhost:3003';
// const BUSINESS_URL = process.env.BUSINESS_SERVICE_URL || 'http://localhost:3002';
// const COMMERCE_DB_URL = process.env.COMMERCE_DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/huki_commerce';
// const PAYOS_CHECKSUM_KEY = process.env.PAYOS_CHECKSUM_KEY || '5f651706f17b598ba726b39e3dd06dd4606edc1e46b790c5b8fad2e01931c704';
// const JWT_SECRET = process.env.JWT_SECRET || '0521ab048d035a99b2c967bcadd4fb2bea5c6ed05b4dc7fe5cc129fe50051890d79a031d1a8c036b29e5b74dc82ab6b1e67cd5be3fb6a0838cb6bb9080f818c0';
// const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || 'huki-production-internal-key-2026-very-secure';
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
// async function runNegativeTests() {
//   console.log('===============================================================');
//   console.log('🛡️ [NEGATIVE & RESILIENCE] KIỂM THỬ PHỦ ĐỊNH & KHẢ NĂNG PHỤC HỒI TÀI CHÍNH');
//   console.log(`🎯 Target Commerce URL: ${COMMERCE_URL}`);
//   console.log(`🎯 Target Business URL: ${BUSINESS_URL}`);
//   console.log(`🗄️ Commerce DB URL:     ${COMMERCE_DB_URL}`);
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
//       console.log(`  ❌ [FAIL] ${desc} ${details ? '(' + details + ')' : ''}`);
//     }
//   }
//
//   const db = new Client({ connectionString: COMMERCE_DB_URL });
//   await db.connect();
//
//   const testUserId = '00000000-0000-4000-a000-000000000099';
//   const testOrderId1 = '99999999-1111-4000-a000-000000000001';
//   const testSellerOrderId1 = '99999999-1111-4000-a000-000000000002';
//   const testPaymentId1 = '99999999-1111-4000-a000-000000000003';
//   const testPayosCode1 = 9882001;
//   const testAmount1 = 250000;
//
//   try {
//     // 0. Pre-clean
//     console.log('--- BƯỚC 0: DỌN DẸP DỮ LIỆU CŨ ---');
//     await db.query("DELETE FROM outbox_events WHERE event_id LIKE '%988200%' OR aggregate_id LIKE '99999999%'");
//     await db.query("DELETE FROM order_status_history WHERE order_id LIKE '99999999%'");
//     await db.query("DELETE FROM payments WHERE id LIKE '99999999%' OR payos_order_id LIKE '988200%'");
//     await db.query("DELETE FROM seller_orders WHERE id LIKE '99999999%'");
//     await db.query("DELETE FROM orders WHERE id LIKE '99999999%'");
//
//     // 1. SCENARIO 1: FAKE CHECKSUM & TAMPERED AMOUNT ATTACKS
//     console.log('\n--- KỊCH BẢN 1: TẤN CÔNG WEBHOOK VỚI SỐ TIỀN SAI LỆCH & CHỮ KÝ GIẢ MẠO ---');
//     await db.query(`
//       INSERT INTO orders (id, code, user_id, idempotency_key, item_subtotal, shipping_total, discount_total, grand_total, payment_method, payment_status, status, created_at, updated_at)
//       VALUES ($1, 'ORD-NEG-01', $2, 'idemp-neg-01', $3, 0, 0, $3, 'ONLINE_PAYMENT', 'PENDING', 'PENDING_PAYMENT', NOW(), NOW())
//     `, [testOrderId1, testUserId, testAmount1]);
//
//     await db.query(`
//       INSERT INTO seller_orders (id, order_id, code, store_id, owner_user_id, item_subtotal, shipping_fee, grand_total, status, created_at, updated_at)
//       VALUES ($1, $2, 'SO-NEG-01', 'store-neg-01', $3, $4, 0, $4, 'PENDING_PAYMENT', NOW(), NOW())
//     `, [testSellerOrderId1, testOrderId1, testUserId, testAmount1]);
//
//     await db.query(`
//       INSERT INTO payments (id, order_id, amount, method, status, provider, payos_order_id, payos_payment_link_id, created_at, updated_at)
//       VALUES ($1, $2, $3, 'ONLINE_PAYMENT', 'PENDING', 'PAYOS', $4, 'plink_neg_01', NOW(), NOW())
//     `, [testPaymentId1, testOrderId1, testAmount1, String(testPayosCode1)]);
//
//     // 1A. Tampered Amount Attack: Order is 250,000 VND, Webhook claims 50,000 VND
//     console.log('  1A. Gửi Webhook với số tiền bị sửa đổi (amount = 50,000 thay vì 250,000)...');
//     const tamperedData = {
//       orderCode: testPayosCode1,
//       amount: 50000,
//       description: 'Nap tien don hang',
//       accountNumber: '1029384756',
//       reference: 'FT261106_NEG_TAMPER',
//       transactionDateTime: '2026-11-06 14:00:00',
//       currency: 'VND',
//       paymentLinkId: 'plink_neg_01',
//       code: '00',
//       desc: 'success',
//     };
//     const tamperedSignature = signPayOSData(tamperedData, PAYOS_CHECKSUM_KEY);
//     const res1A = await fetch(`${COMMERCE_URL}/api/v1/payments/webhooks/payos`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ code: '00', desc: 'success', success: true, data: tamperedData, signature: tamperedSignature }),
//     });
//     const body1A = await res1A.json().catch(() => ({}));
//     console.log(`    Status: ${res1A.status} | Code: ${body1A.code}`);
//
//     const dbOrder1A = (await db.query('SELECT status, payment_status FROM orders WHERE id = $1', [testOrderId1])).rows[0];
//     const dbPayment1A = (await db.query('SELECT status FROM payments WHERE id = $1', [testPaymentId1])).rows[0];
//
//     assertCheck(
//       'Hệ thống từ chối HTTP 400 PAYMENT_AMOUNT_MISMATCH khi số tiền bị gian lận',
//       res1A.status === 400 && body1A.code === 'PAYMENT_AMOUNT_MISMATCH',
//       `Status: ${res1A.status}, Code: ${body1A.code}`
//     );
//     assertCheck(
//       'Trạng thái đơn hàng và thanh toán giữ nguyên PENDING_PAYMENT / PENDING sau khi bị tấn công',
//       dbOrder1A?.status === 'PENDING_PAYMENT' && dbPayment1A?.status === 'PENDING',
//       `Order: ${dbOrder1A?.status}, Payment: ${dbPayment1A?.status}`
//     );
//
//     // 1B. Fake Checksum Attack: Valid amount, but forged signature
//     console.log('\n  1B. Gửi Webhook với chữ ký giả mạo (Fake HMAC-SHA256)...');
//     const fakeSigData = {
//       orderCode: testPayosCode1,
//       amount: testAmount1,
//       description: 'Thanh toan don hang',
//       reference: 'FT261106_NEG_FAKESIG',
//       transactionDateTime: '2026-11-06 14:00:00',
//       code: '00',
//     };
//     const res1B = await fetch(`${COMMERCE_URL}/api/v1/payments/webhooks/payos`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ code: '00', desc: 'success', success: true, data: fakeSigData, signature: 'deadbeefcafebabe0123456789abcdef0123456789abcdef0123456789abcdef' }),
//     });
//     const body1B = await res1B.json().catch(() => ({}));
//     console.log(`    Status: ${res1B.status} | Code: ${body1B.code}`);
//
//     assertCheck(
//       'Hệ thống từ chối HTTP 400 PAYMENT_SIGNATURE_INVALID khi chữ ký giả mạo',
//       res1B.status === 400 && body1B.code === 'PAYMENT_SIGNATURE_INVALID',
//       `Status: ${res1B.status}, Code: ${body1B.code}`
//     );
//
//     // 2. SCENARIO 2: WEBHOOK & EXPIRATION CONCURRENCY / RACE RESILIENCE
//     console.log('\n--- KỊCH BẢN 2: TRANH CHẤP ĐỒNG THỜI GIỮA WEBHOOK THANH TOÁN VÀ HỦY ĐƠN (ACID RESILIENCE) ---');
//     const testOrderId2 = '99999999-2222-4000-a000-000000000001';
//     const testSellerOrderId2 = '99999999-2222-4000-a000-000000000002';
//     const testPaymentId2 = '99999999-2222-4000-a000-000000000003';
//     const testPayosCode2 = 9882002;
//     const testAmount2 = 180000;
//
//     await db.query(`
//       INSERT INTO orders (id, code, user_id, idempotency_key, item_subtotal, shipping_total, discount_total, grand_total, payment_method, payment_status, status, created_at, updated_at)
//       VALUES ($1, 'ORD-NEG-02', $2, 'idemp-neg-02', $3, 0, 0, $3, 'ONLINE_PAYMENT', 'PENDING', 'PENDING_PAYMENT', NOW(), NOW())
//     `, [testOrderId2, testUserId, testAmount2]);
//
//     await db.query(`
//       INSERT INTO seller_orders (id, order_id, code, store_id, owner_user_id, item_subtotal, shipping_fee, grand_total, status, created_at, updated_at)
//       VALUES ($1, $2, 'SO-NEG-02', 'store-neg-02', $3, $4, 0, $4, 'PENDING_PAYMENT', NOW(), NOW())
//     `, [testSellerOrderId2, testOrderId2, testUserId, testAmount2]);
//
//     await db.query(`
//       INSERT INTO payments (id, order_id, amount, method, status, provider, payos_order_id, payos_payment_link_id, created_at, updated_at)
//       VALUES ($1, $2, $3, 'ONLINE_PAYMENT', 'PENDING', 'PAYOS', $4, 'plink_neg_02', NOW(), NOW())
//     `, [testPaymentId2, testOrderId2, testAmount2, String(testPayosCode2)]);
//
//     // Prepare legitimate webhook payload
//     const validData2 = {
//       orderCode: testPayosCode2,
//       amount: testAmount2,
//       description: 'Thanh toan don hang hop le',
//       reference: 'FT261106_RACE_TEST',
//       transactionDateTime: '2026-11-06 14:00:00',
//       code: '00',
//     };
//     const validSignature2 = signPayOSData(validData2, PAYOS_CHECKSUM_KEY);
//
//     // Concurrently trigger webhook and buyer cancel attempt
//     const buyerToken2 = jwt.sign({ sub: testUserId, role: 'BUYER' }, JWT_SECRET, { expiresIn: '1h' });
//
//     console.log('  Bắn đồng thời: Webhook thanh toán thành công VS Yêu cầu hủy đơn...');
//     const [webhookRes, cancelRes] = await Promise.all([
//       fetch(`${COMMERCE_URL}/api/v1/payments/webhooks/payos`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ code: '00', desc: 'success', success: true, data: validData2, signature: validSignature2 }),
//       }),
//       fetch(`${COMMERCE_URL}/api/v1/seller/orders/${testSellerOrderId2}/cancel`, {
//         method: 'PATCH',
//         headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${buyerToken2}` },
//         body: JSON.stringify({ reason: 'Huy don dong thoi' }),
//       }),
//     ]);
//
//     const orderRow2 = (await db.query('SELECT status, payment_status FROM orders WHERE id = $1', [testOrderId2])).rows[0];
//     const paymentRow2 = (await db.query('SELECT status FROM payments WHERE id = $1', [testPaymentId2])).rows[0];
//     console.log(`  Webhook Status: ${webhookRes.status} | Cancel Status: ${cancelRes.status}`);
//     console.log(`  DB Final State -> Order: ${orderRow2?.status}, Payment: ${paymentRow2?.status}`);
//
//     const isDeterministicState =
//       (orderRow2?.status === 'PROCESSING' && paymentRow2?.status === 'SUCCEEDED') ||
//       (orderRow2?.status === 'CANCELLED' && (paymentRow2?.status === 'EXPIRED' || paymentRow2?.status === 'REFUND_PENDING'));
//
//     assertCheck(
//       'Hệ thống bảo đảm tính nhất quán ACID tuyệt đối khi có race condition thanh toán (không xung đột dữ liệu)',
//       isDeterministicState,
//       `Order: ${orderRow2?.status}, Payment: ${paymentRow2?.status}`
//     );
//
//     // 3. SCENARIO 3: MISSING / INVALID INTERNAL SERVICE KEY
//     console.log('\n--- KỊCH BẢN 3: BẢO VỆ PHÂN TẦNG AN NINH API NỘI BỘ (INTERNAL API AUTH GUARD) ---');
//
//     // 3A. Missing header entirely
//     const res3A = await fetch(`${BUSINESS_URL}/api/v1/internal/seller-scope/${testUserId}`);
//     const body3A = await res3A.json().catch(() => ({}));
//     console.log(`  3A. Không truyền x-internal-service-key -> Status: ${res3A.status} | Code: ${body3A.code}`);
//     assertCheck(
//       'Hệ thống từ chối HTTP 403 Forbidden khi thiếu Header x-internal-service-key',
//       res3A.status === 403 && body3A.code === 'AUTHZ_FORBIDDEN',
//       `Status: ${res3A.status}`
//     );
//
//     // 3B. Invalid internal key
//     const res3B = await fetch(`${BUSINESS_URL}/api/v1/internal/seller-scope/${testUserId}`, {
//       headers: { 'x-internal-service-key': 'attacker-fake-key-12345' },
//     });
//     const body3B = await res3B.json().catch(() => ({}));
//     console.log(`  3B. Truyền sai x-internal-service-key -> Status: ${res3B.status} | Code: ${body3B.code}`);
//     assertCheck(
//       'Hệ thống từ chối HTTP 403 Forbidden khi truyền sai Header x-internal-service-key',
//       res3B.status === 403 && body3B.code === 'AUTHZ_FORBIDDEN',
//       `Status: ${res3B.status}`
//     );
//
//     // 3C. Valid internal key
//     const res3C = await fetch(`${BUSINESS_URL}/api/v1/internal/seller-scope/${testUserId}`, {
//       headers: { 'x-internal-service-key': INTERNAL_SERVICE_KEY },
//     });
//     console.log(`  3C. Truyền đúng x-internal-service-key -> Status: ${res3C.status}`);
//     assertCheck(
//       'Hệ thống chấp nhận HTTP 200 OK khi truyền đúng x-internal-service-key',
//       res3C.status === 200,
//       `Status: ${res3C.status}`
//     );
//
//     // 4. SCENARIO 4: UNAUTHORIZED SIMULATION PROTECTION (SIMULATE-SUCCESS)
//     console.log('\n--- KỊCH BẢN 4: NGĂN CHẶN GIAN LẬN SIMULATE-SUCCESS TỪ PHÍA BUYER/SELLER ---');
//     const regularBuyerToken = jwt.sign({ sub: testUserId, role: 'BUYER' }, JWT_SECRET, { expiresIn: '1h' });
//     const sellerToken = jwt.sign({ sub: testUserId, role: 'SELLER' }, JWT_SECRET, { expiresIn: '1h' });
//
//     const res4A = await fetch(`${COMMERCE_URL}/api/v1/payments/orders/${testOrderId1}/simulate-success`, {
//       method: 'POST',
//       headers: { 'Authorization': `Bearer ${regularBuyerToken}` },
//     });
//     const body4A = await res4A.json().catch(() => ({}));
//     console.log(`  4A. Buyer gọi simulate-success -> Status: ${res4A.status} | Code: ${body4A.code}`);
//     assertCheck(
//       'Chặn đứng Buyer gọi simulate-success (HTTP 403 AUTHZ_ROLE_INSUFFICIENT)',
//       res4A.status === 403 && body4A.code === 'AUTHZ_ROLE_INSUFFICIENT',
//       `Status: ${res4A.status}`
//     );
//
//     const res4B = await fetch(`${COMMERCE_URL}/api/v1/payments/orders/${testOrderId1}/simulate-success`, {
//       method: 'POST',
//       headers: { 'Authorization': `Bearer ${sellerToken}` },
//     });
//     const body4B = await res4B.json().catch(() => ({}));
//     console.log(`  4B. Seller gọi simulate-success -> Status: ${res4B.status} | Code: ${body4B.code}`);
//     assertCheck(
//       'Chặn đứng Seller gọi simulate-success (HTTP 403 AUTHZ_ROLE_INSUFFICIENT)',
//       res4B.status === 403 && body4B.code === 'AUTHZ_ROLE_INSUFFICIENT',
//       `Status: ${res4B.status}`
//     );
//
//     // 5. Cleanup
//     console.log('\n--- BƯỚC 5: DỌN DẸP DỮ LIỆU TEST ---');
//     await db.query("DELETE FROM outbox_events WHERE event_id LIKE '%988200%' OR aggregate_id LIKE '99999999%'");
//     await db.query("DELETE FROM order_status_history WHERE order_id LIKE '99999999%'");
//     await db.query("DELETE FROM payments WHERE id LIKE '99999999%' OR payos_order_id LIKE '988200%'");
//     await db.query("DELETE FROM seller_orders WHERE id LIKE '99999999%'");
//     await db.query("DELETE FROM orders WHERE id LIKE '99999999%'");
//     console.log('  Cleaned up all negative test records.');
//
//   } catch (err: any) {
//     console.error('❌ Lỗi ngoại lệ trong kịch bản Negative Test:', err);
//   } finally {
//     await db.end();
//   }
//
//   console.log('\n===============================================================');
//   console.log(`📊 KẾT QUẢ NEGATIVE TEST: Passed ${passed}/${total} assertions.`);
//   console.log('===============================================================');
//   process.exitCode = (passed === total ? 0 : 1);
// }
//
// runNegativeTests();
