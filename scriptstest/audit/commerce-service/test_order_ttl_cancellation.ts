/**
 * TEST 2: ORDER PAYMENT TTL EXPIRATION, WORKER EXECUTION & ACID INVENTORY RELEASE
 * File: scriptstest/audit/commerce-service/test_order_ttl_cancellation.ts
 * Target: commerce-service (Port 3003) & Worker expirePendingPayments
 * Database: PostgreSQL huki_commerce & Redis
 */

import { createHmac } from 'crypto';
import { Client } from 'pg';
import Redis from 'ioredis';

const COMMERCE_URL = process.env.COMMERCE_SERVICE_URL || 'http://localhost:3003';
const COMMERCE_DB_URL = process.env.COMMERCE_DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/huki_commerce';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const PAYOS_CHECKSUM_KEY = process.env.PAYOS_CHECKSUM_KEY || '5f651706f17b598ba726b39e3dd06dd4606edc1e46b790c5b8fad2e01931c704';

function stringify(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === 'object') {
    const ordered = Object.keys(value as object)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = (value as Record<string, unknown>)[key];
        return result;
      }, {});
    return JSON.stringify(ordered);
  }
  return String(value);
}

function signPayOSData(data: Record<string, unknown>, checksumKey: string): string {
  const query = Object.keys(data)
    .sort()
    .map((key) => `${key}=${stringify(data[key])}`)
    .join('&');
  return createHmac('sha256', checksumKey).update(query).digest('hex');
}

async function runTest() {
  console.log('===============================================================');
  console.log('🚀 [TEST 2] KIỂM CHỨNG ORDER TTL (15 PHÚT), CƠ CHẾ WORKER & GIẢI PHÓNG TỒN KHO');
  console.log(`🎯 Target Commerce URL: ${COMMERCE_URL}`);
  console.log(`🗄️ Database:             ${COMMERCE_DB_URL}`);
  console.log(`⚡ Redis:                ${REDIS_URL}`);
  console.log('===============================================================\n');

  let passed = 0;
  let total = 0;

  function assertCheck(desc: string, condition: boolean, details: string = '') {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✅ [PASS] ${desc} ${details ? '(' + details + ')' : ''}`);
    } else {
      console.log(`  🚨 [FAIL / OBSERVATION] ${desc} ${details ? '(' + details + ')' : ''}`);
    }
  }

  const db = new Client({ connectionString: COMMERCE_DB_URL });
  const redis = new Redis(REDIS_URL);

  await db.connect();

  const testBookId = '22222222-0000-0000-0000-000000000001';
  const testOrderId = '22222222-1111-0000-0000-000000000001';
  const testSellerOrderId = '22222222-1111-0000-0000-000000000002';
  const testOrderItemId = '22222222-1111-0000-0000-000000000003';
  const testPaymentId = '22222222-1111-0000-0000-000000000004';
  const testReservationId = '22222222-1111-0000-0000-000000000005';
  const testPayosOrderCode = 8992002;
  const initialStock = 10;
  const reservedQuantity = 2;

  try {
    // 0. Cleanup
    await db.query('DELETE FROM inventory_reservations WHERE order_id = $1 OR book_id = $2', [testOrderId, testBookId]);
    await db.query('DELETE FROM inventory_logs WHERE order_id = $1', [testOrderId]);
    await db.query('DELETE FROM order_status_history WHERE order_id = $1', [testOrderId]);
    await db.query('DELETE FROM payments WHERE id = $1', [testPaymentId]);
    await db.query('DELETE FROM order_items WHERE id = $1', [testOrderItemId]);
    await db.query('DELETE FROM seller_orders WHERE id = $1', [testSellerOrderId]);
    await db.query('DELETE FROM orders WHERE id = $1', [testOrderId]);
    await db.query('DELETE FROM physical_book_details WHERE book_id = $1', [testBookId]);
    await db.query('DELETE FROM books WHERE id = $1', [testBookId]);

    console.log('--- BƯỚC 1: SEED SÁCH VẬT LÝ VỚI TỒN KHO BAN ĐẦU ---');
    await db.query(`
      INSERT INTO books (id, store_id, owner_user_id, title, normalized_title, slug, description, format, price, status, created_at, updated_at)
      VALUES ($1, 'store-audit-02', 'user-seller-02', 'Sách Kiến Trúc Microservices Audit', 'sach kien truc microservices audit', 'sach-kien-truc-audit', 'Mo ta sach audit', 'PHYSICAL', 100000, 'PUBLISHED', NOW(), NOW())
    `, [testBookId]);

    await db.query(`
      INSERT INTO physical_book_details (id, book_id, stock, reserved, physical_enabled, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, true, NOW(), NOW())
    `, [testBookId, initialStock, reservedQuantity]);

    // Initialize Redis counter: available = 8
    await redis.set(`inventory:stock:${testBookId}`, (initialStock - reservedQuantity).toString());
    console.log(`  Sách test: ${testBookId} | Tổng tồn: ${initialStock} | Đang giữ chỗ: ${reservedQuantity} | Khả dụng: ${initialStock - reservedQuantity}`);

    console.log('\n--- BƯỚC 2: SEED ĐƠN HÀNG Ở TRẠNG THÁI QUÁ HẠN THANH TOÁN (EXPIRED TTL) ---');
    await db.query(`
      INSERT INTO orders (id, code, user_id, idempotency_key, item_subtotal, shipping_total, discount_total, grand_total, payment_method, payment_status, status, created_at, updated_at)
      VALUES ($1, 'ORD-AUDIT-TTL-02', 'user-buyer-02', 'idemp-ttl-02', 200000, 0, 0, 200000, 'ONLINE_PAYMENT', 'PENDING', 'PENDING_PAYMENT', NOW() - INTERVAL '25 minutes', NOW() - INTERVAL '25 minutes')
    `, [testOrderId]);

    await db.query(`
      INSERT INTO seller_orders (id, order_id, code, store_id, owner_user_id, item_subtotal, shipping_fee, grand_total, status, created_at, updated_at)
      VALUES ($1, $2, 'SO-AUDIT-TTL-02', 'store-audit-02', 'user-seller-02', 200000, 0, 200000, 'PENDING_PAYMENT', NOW() - INTERVAL '25 minutes', NOW() - INTERVAL '25 minutes')
    `, [testSellerOrderId, testOrderId]);

    await db.query(`
      INSERT INTO order_items (id, seller_order_id, book_id, format, quantity, "unitPrice", subtotal, book_title, created_at)
      VALUES ($1, $2, $3, 'PHYSICAL', $4, 100000, 200000, 'Sách Kiến Trúc Microservices Audit', NOW() - INTERVAL '25 minutes')
    `, [testOrderItemId, testSellerOrderId, testBookId, reservedQuantity]);

    await db.query(`
      INSERT INTO payments (id, order_id, amount, method, status, provider, payos_order_id, expires_at, created_at, updated_at)
      VALUES ($1, $2, 200000, 'ONLINE_PAYMENT', 'PENDING', 'PAYOS', $3, NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '25 minutes', NOW() - INTERVAL '25 minutes')
    `, [testPaymentId, testOrderId, String(testPayosOrderCode)]);

    await db.query(`
      INSERT INTO inventory_reservations (id, order_id, order_item_id, book_id, quantity, status, created_at)
      VALUES ($1, $2, $3, $4, $5, 'ACTIVE', NOW() - INTERVAL '25 minutes')
    `, [testReservationId, testOrderId, testOrderItemId, testBookId, reservedQuantity]);

    console.log(`  Đã tạo đơn hàng ${testOrderId} với payment.expires_at = NOW() - 10 minutes`);
    console.log(`  Trạng thái ban đầu: Order = PENDING_PAYMENT, Payment = PENDING, Reservation = ACTIVE`);

    console.log('\n--- BƯỚC 3: ĐỢI WORKER expirePendingPayments() QUÉT & KÍCH HOẠT HỦY ĐƠN (12 GIÂY) ---');
    console.log('  Đang chờ worker cycle (quét mỗi 5000ms)...');
    await new Promise((resolve) => setTimeout(resolve, 12000));

    console.log('\n--- BƯỚC 4: KIỂM CHỨNG TRẠNG THÁI SAU KHI WORKER XỬ LÝ ---');
    const orderAfter = (await db.query('SELECT status, payment_status, cancel_reason, cancelled_at FROM orders WHERE id = $1', [testOrderId])).rows[0];
    const sellerOrderAfter = (await db.query('SELECT status, cancel_reason FROM seller_orders WHERE id = $1', [testSellerOrderId])).rows[0];
    const paymentAfter = (await db.query('SELECT status, failure_reason FROM payments WHERE id = $1', [testPaymentId])).rows[0];
    const reservationAfter = (await db.query('SELECT status, released_at FROM inventory_reservations WHERE id = $1', [testReservationId])).rows[0];
    const stockAfter = (await db.query('SELECT stock, reserved FROM physical_book_details WHERE book_id = $1', [testBookId])).rows[0];
    const redisStock = await redis.get(`inventory:stock:${testBookId}`);

    console.log(`  [DB Result] Order Status:        ${orderAfter?.status} (Reason: ${orderAfter?.cancel_reason})`);
    console.log(`  [DB Result] Seller Order Status: ${sellerOrderAfter?.status}`);
    console.log(`  [DB Result] Payment Status:      ${paymentAfter?.status} (Reason: ${paymentAfter?.failure_reason})`);
    console.log(`  [DB Result] Reservation Status:  ${reservationAfter?.status}`);
    console.log(`  [DB Result] Book Reserved Stock: ${stockAfter?.reserved} (Total: ${stockAfter?.stock})`);
    console.log(`  [Redis] Available Stock:         ${redisStock}`);

    assertCheck('Worker tự động phát hiện và chuyển Order sang CANCELLED', orderAfter?.status === 'CANCELLED', `Status: ${orderAfter?.status}`);
    assertCheck('Worker tự động chuyển SellerOrder sang CANCELLED', sellerOrderAfter?.status === 'CANCELLED', `Status: ${sellerOrderAfter?.status}`);
    assertCheck('Worker tự động chuyển Payment sang EXPIRED', paymentAfter?.status === 'EXPIRED', `Status: ${paymentAfter?.status}`);
    assertCheck('Worker giải phóng bản ghi tạm giữ: inventory_reservations -> RELEASED', reservationAfter?.status === 'RELEASED', `Status: ${reservationAfter?.status}`);
    assertCheck('Tồn kho vật lý (reserved) được hoàn trả 100% về 0', stockAfter?.reserved === 0, `Reserved: ${stockAfter?.reserved}`);

    // 5. KỊCH BẢN 5: KIỂM CHỨNG LATE WEBHOOK KHI ĐƠN ĐÃ BỊ HỦY (ORDER-RACE-001)
    console.log('\n--- BƯỚC 5: THỬ NGHIỆM LATE WEBHOOK TRÊN ĐƠN ĐÃ CANCELLED (GIÂY THỨ 901) ---');
    const lateData: Record<string, unknown> = {
      orderCode: testPayosOrderCode,
      amount: 200000,
      description: 'Thanh toan trễ sau khi đơn hủy',
      accountNumber: '1029384756',
      reference: 'FT_LATE_AUDIT_02',
      transactionDateTime: '2026-11-06 14:16:00',
      currency: 'VND',
      paymentLinkId: 'plink_test_audit_02',
      counterAccountBankId: 'MB',
      counterAccountName: 'NGUYEN VAN AUDIT',
      counterAccountNumber: '999888777',
      virtualAccountName: 'HUKI EBOOK',
      virtualAccountNumber: 'VA8992002',
    };
    const lateSignature = signPayOSData(lateData, PAYOS_CHECKSUM_KEY);
    const latePayload = {
      code: '00',
      desc: 'success',
      success: true,
      data: lateData,
      signature: lateSignature,
    };

    const resLate = await fetch(`${COMMERCE_URL}/api/v1/payments/webhooks/payos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(latePayload),
    });
    const bodyLate = await resLate.json().catch(() => ({}));
    console.log(`  [Late Webhook Response] Status: ${resLate.status} | Body: ${JSON.stringify(bodyLate)}`);

    const orderAfterLate = (await db.query('SELECT status, payment_status FROM orders WHERE id = $1', [testOrderId])).rows[0];
    const paymentAfterLate = (await db.query('SELECT status, transaction_id FROM payments WHERE id = $1', [testPaymentId])).rows[0];
    console.log(`  [DB State sau Late Webhook] Order: ${orderAfterLate?.status}, Payment: ${paymentAfterLate?.status}`);

    // Since reservations was released but order_item_id is UNIQUE in inventory_reservations table,
    // handleLateWebhook calls reservations.reserve() which tries to INSERT a duplicate order_item_id!
    // This triggers PostgreSQL unique constraint violation 409 Conflict: "Dữ liệu (order_item_id) đã tồn tại trên hệ thống."
    const isLateWebhookBugObserved = resLate.status === 409 && bodyLate.code === 'SYSTEM_ERROR';
    if (isLateWebhookBugObserved) {
      console.log('  🚨 [PHÁT HIỆN LỖI LOGIC NGHIÊM TRỌNG - LATE-WEBHOOK-UNIQUE-001]:');
      console.log('     handleLateWebhook() gọi reservations.reserve() để tạo bản ghi inventory_reservations mới,');
      console.log('     nhưng bảng inventory_reservations có ràng buộc @unique trên order_item_id!');
      console.log('     Do bản ghi cũ ở trạng thái RELEASED vẫn tồn tại, lệnh INSERT bị dội lỗi 409 Unique Constraint!');
      console.log('     Hệ thống gãy hoàn toàn luồng khôi phục đơn khi khách thanh toán trễ!');
    }

    assertCheck(
      'Xác nhận lỗi 409 đã được khắc phục: handleLateWebhook khôi phục đơn thành công (Status 200, Order PROCESSING)',
      resLate.status === 200 && orderAfterLate?.status === 'PROCESSING',
      `Status: ${resLate.status}, Restored: ${bodyLate.data?.restored}`
    );

    // 6. Cleanup
    console.log('\n--- BƯỚC 6: DỌN DẸP DỮ LIỆU TEST ---');
    await db.query('DELETE FROM inventory_reservations WHERE order_id = $1 OR book_id = $2', [testOrderId, testBookId]);
    await db.query('DELETE FROM inventory_logs WHERE order_id = $1', [testOrderId]);
    await db.query('DELETE FROM order_status_history WHERE order_id = $1', [testOrderId]);
    await db.query('DELETE FROM payments WHERE id = $1', [testPaymentId]);
    await db.query('DELETE FROM order_items WHERE id = $1', [testOrderItemId]);
    await db.query('DELETE FROM seller_orders WHERE id = $1', [testSellerOrderId]);
    await db.query('DELETE FROM orders WHERE id = $1', [testOrderId]);
    await db.query('DELETE FROM physical_book_details WHERE book_id = $1', [testBookId]);
    await db.query('DELETE FROM books WHERE id = $1', [testBookId]);
    await redis.del(`inventory:stock:${testBookId}`);
    console.log('  Cleaned up all test records and Redis keys.');

  } catch (error: any) {
    console.error('❌ Lỗi ngoại lệ trong quá trình chạy test:', error);
  } finally {
    await db.end();
    await redis.quit();
  }

  console.log('\n===============================================================');
  console.log(`📊 KẾT QUẢ TEST 2: Passed ${passed}/${total} assertions.`);
  console.log('===============================================================');
  process.exitCode = (passed === total ? 0 : 1);
}

runTest();
