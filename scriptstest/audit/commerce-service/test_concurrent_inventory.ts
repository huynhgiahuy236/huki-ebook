/**
 * TEST 3: CONCURRENT INVENTORY CHECKOUT & OVERSELLING RACE CONDITION
 * File: scriptstest/audit/commerce-service/test_concurrent_inventory.ts
 * Target: commerce-service (Port 3003) Checkout API (/cart/checkout/preview & /cart/checkout/confirm)
 * Database: PostgreSQL huki_commerce & Redis
 */

import { Client } from 'pg';
import Redis from 'ioredis';
import * as jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

const COMMERCE_URL = process.env.COMMERCE_SERVICE_URL || 'http://localhost:3003';
const COMMERCE_DB_URL = process.env.COMMERCE_DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/huki_commerce';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const JWT_SECRET = process.env.JWT_SECRET || '0521ab048d035a99b2c967bcadd4fb2bea5c6ed05b4dc7fe5cc129fe50051890d79a031d1a8c036b29e5b74dc82ab6b1e67cd5be3fb6a0838cb6bb9080f818c0';

async function runTest() {
  console.log('===============================================================');
  console.log('🚀 [TEST 3] KIỂM CHỨNG TRANH MUA ĐỒNG THỜI & RỦI RO BÁN VƯỢT TỒN KHO (OVERSELLING)');
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
      console.log(`  🚨 [FAIL / RACE CONDITION DETECTED] ${desc} ${details ? '(' + details + ')' : ''}`);
    }
  }

  const db = new Client({ connectionString: COMMERCE_DB_URL });
  const redis = new Redis(REDIS_URL);

  await db.connect();

  const testBookId = '33333333-0000-4000-a000-000000000001';
  const testStoreId = 'store-audit-03';
  const testOwnerId = 'user-seller-03';
  const initialStock = 1; // ONLY 1 ITEM IN STOCK!

  try {
    // 0. Cleanup old records
    console.log('--- BƯỚC 0: DỌN DẸP DỮ LIỆU CŨ & REDIS CACHE ---');
    await db.query('DELETE FROM inventory_reservations WHERE book_id = $1', [testBookId]);
    await db.query('DELETE FROM inventory_logs WHERE book_id IN (SELECT id FROM physical_book_details WHERE book_id = $1)', [testBookId]);
    await db.query('DELETE FROM order_items WHERE book_id = $1', [testBookId]);
    await db.query('DELETE FROM physical_book_details WHERE book_id = $1', [testBookId]);
    await db.query('DELETE FROM books WHERE id = $1', [testBookId]);
    await redis.del(`inventory:stock:${testBookId}`, `stock:book:${testBookId}`);

    // 1. Seed book with stock = 1, reserved = 0
    console.log('\n--- BƯỚC 1: SEED SÁCH DUY NHẤT 1 CUỐN TRONG KHO (STOCK = 1, RESERVED = 0) ---');
    await db.query(`
      INSERT INTO books (id, store_id, owner_user_id, title, normalized_title, slug, description, format, price, status, created_at, updated_at)
      VALUES ($1, $2, $3, 'Sách Hiếm Flash Sale Duy Nhất 1 Cuốn', 'sach hiem flash sale duy nhat 1 cuon', 'sach-hiem-flash-sale', 'Sách thử nghiệm overselling', 'PHYSICAL', 99000, 'PUBLISHED', NOW(), NOW())
    `, [testBookId, testStoreId, testOwnerId]);

    await db.query(`
      INSERT INTO physical_book_details (id, book_id, stock, reserved, physical_enabled, weight, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, 0, true, 200, NOW(), NOW())
    `, [testBookId, initialStock]);

    console.log(`  Sách: ${testBookId} | Tồn kho vật lý: ${initialStock} cuốn | Tạm giữ: 0 cuốn | Khả dụng: 1 cuốn`);
    console.log(`  Redis key inventory:stock:${testBookId} đã được xóa (Cold Start / Cache Miss)`);

    // 2. Prepare 5 distinct buyers
    console.log('\n--- BƯỚC 2: KHỞI TẠO 5 NGƯỜI MUA KHÁC NHAU VÀ GỌI CHECKOUT PREVIEW ---');
    const buyers = [
      { id: '00000000-0000-0000-0000-000000000011', name: 'Buyer 1' },
      { id: '00000000-0000-0000-0000-000000000012', name: 'Buyer 2' },
      { id: '00000000-0000-0000-0000-000000000013', name: 'Buyer 3' },
      { id: '00000000-0000-0000-0000-000000000014', name: 'Buyer 4' },
      { id: '00000000-0000-0000-0000-000000000015', name: 'Buyer 5' },
    ];

    const previewSessions: Array<{ buyerId: string; token: string; sessionId: string }> = [];

    for (const buyer of buyers) {
      const token = jwt.sign({ sub: buyer.id, role: 'BUYER' }, JWT_SECRET, { expiresIn: '1h' });
      const res = await fetch(`${COMMERCE_URL}/api/v1/cart/checkout/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          directItem: {
            bookId: testBookId,
            format: 'PHYSICAL',
            quantity: 1,
          },
          shippingAddress: {
            recipientName: buyer.name,
            phone: '0901234567',
            line1: '123 Đường Test Audit',
            ward: 'Phường 1',
            district: 'Quận 1',
            province: 'TP Hồ Chí Minh',
          },
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (res.status === 200 && body.data?.sessionId) {
        previewSessions.push({
          buyerId: buyer.id,
          token,
          sessionId: body.data.sessionId,
        });
        console.log(`  ${buyer.name}: Preview thành công -> SessionId: ${body.data.sessionId}`);
      } else {
        console.log(`  ${buyer.name}: Preview thất bại (${res.status}):`, body.message);
      }
    }

    assertCheck('Cả 5 người mua đều lấy được Checkout Session do kho chưa bị khóa tại Preview', previewSessions.length === 5, `Sessions: ${previewSessions.length}/5`);

    // 3. Fire 5 parallel Checkout Confirm requests AT THE EXACT SAME MILLISECOND
    console.log('\n--- BƯỚC 3: BẮN ĐỒNG THỜI 5 REQUEST CONFIRM CHECKOUT (PROMISE.ALL) ---');
    console.log('  Đang gửi 5 yêu cầu đặt mua đồng thời để kích hoạt Race Condition...');

    const confirmPromises = previewSessions.map(async (s, index) => {
      const idempotencyKey = randomUUID();
      const startTime = Date.now();
      try {
        const res = await fetch(`${COMMERCE_URL}/api/v1/cart/checkout/confirm`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${s.token}`,
            'Idempotency-Key': idempotencyKey,
          },
          body: JSON.stringify({
            sessionId: s.sessionId,
            paymentMethod: 'COD',
          }),
        });
        const duration = Date.now() - startTime;
        const body = await res.json().catch(() => ({}));
        return {
          buyerIndex: index + 1,
          buyerId: s.buyerId,
          status: res.status,
          success: res.status === 200,
          code: body.code || 'SUCCESS',
          message: body.message || 'Order created',
          orderId: body.data?.order?.id || body.data?.id,
          duration,
        };
      } catch (err: any) {
        return {
          buyerIndex: index + 1,
          buyerId: s.buyerId,
          status: 500,
          success: false,
          code: 'NETWORK_ERROR',
          message: err.message,
          orderId: null,
          duration: Date.now() - startTime,
        };
      }
    });

    const confirmResults = await Promise.all(confirmPromises);

    console.log('\n--- BƯỚC 4: KẾT QUẢ PHẢN HỒI CỦA 5 REQUEST TRANH MUA ---');
    let successCount = 0;
    let conflictCount = 0;

    for (const r of confirmResults) {
      if (r.success) {
        successCount++;
        console.log(`  Buyer ${r.buyerIndex}: ✅ THÀNH CÔNG (Status 200) -> OrderId: ${r.orderId} (${r.duration}ms)`);
      } else {
        conflictCount++;
        console.log(`  Buyer ${r.buyerIndex}: 🛑 BỊ CHẶN (Status ${r.status}) [${r.code}]: ${r.message} (${r.duration}ms)`);
      }
    }

    // 4. Query PostgreSQL and Redis for inventory state
    console.log('\n--- BƯỚC 5: KIỂM TOÁN TỒN KHO THỰC TẾ TRONG DATABASE & REDIS ---');
    const stockRow = (await db.query('SELECT stock, reserved FROM physical_book_details WHERE book_id = $1', [testBookId])).rows[0];
    const reservations = (await db.query('SELECT id, order_id, quantity, status FROM inventory_reservations WHERE book_id = $1', [testBookId])).rows;
    const redisStockFinal = await redis.get(`inventory:stock:${testBookId}`);

    console.log(`  [PostgreSQL] stock: ${stockRow?.stock} | reserved: ${stockRow?.reserved}`);
    console.log(`  [PostgreSQL] Số bản ghi inventory_reservations: ${reservations.length}`);
    console.log(`  [Redis] inventory:stock:${testBookId} = ${redisStockFinal}`);

    const isOversold = successCount > 1 || Number(stockRow?.reserved) > 1 || reservations.length > 1;

    if (isOversold) {
      console.log(`\n  🚨 [LỖ HỔNG CRITICAL P0 XÁC NHẬN - INV-RACE-001]: BÁN VƯỢT TỒN KHO!`);
      console.log(`     Tồn kho ban đầu: 1 cuốn.`);
      console.log(`     Số đơn đặt thành công: ${successCount} đơn!`);
      console.log(`     Số lượng tạm giữ (reserved): ${stockRow?.reserved} cuốn!`);
      console.log(`     Cơ chế: Không có 'SELECT ... FOR UPDATE' và update thiếu điều kiện WHERE (stock - reserved >= qty)!`);
    } else {
      console.log(`\n  🛡️ Tồn kho được bảo vệ: Chỉ có 1 người mua thành công, ${conflictCount} người bị từ chối an toàn.`);
    }

    assertCheck(
      'Xác nhận không bán vượt tồn kho (Overselling = false, đúng 1 đơn thành công và 4 đơn bị từ chối)',
      !isOversold && successCount === 1 && conflictCount === 4,
      `Thành công: ${successCount}/5, Bị chặn: ${conflictCount}/5, Tạm giữ DB: ${stockRow?.reserved}/${stockRow?.stock}`
    );

    // 5. Cleanup
    console.log('\n--- BƯỚC 6: DỌN DẸP DỮ LIỆU TEST ---');
    await db.query(`
      DELETE FROM payments WHERE order_id IN (
        SELECT order_id FROM seller_orders WHERE store_id = $1
      )
    `, [testStoreId]);
    await db.query('DELETE FROM order_status_history WHERE order_id IN (SELECT id FROM orders WHERE user_id LIKE \'00000000-0000-0000-0000-00000000001%\')');
    await db.query('DELETE FROM outbox_events WHERE aggregate_id IN (SELECT id FROM orders WHERE user_id LIKE \'00000000-0000-0000-0000-00000000001%\')');
    await db.query('DELETE FROM inventory_reservations WHERE book_id = $1', [testBookId]);
    await db.query('DELETE FROM order_items WHERE book_id = $1', [testBookId]);
    await db.query('DELETE FROM seller_orders WHERE store_id = $1', [testStoreId]);
    await db.query('DELETE FROM orders WHERE user_id LIKE \'00000000-0000-0000-0000-00000000001%\'');
    await db.query('DELETE FROM inventory_logs WHERE book_id IN (SELECT id FROM physical_book_details WHERE book_id = $1)', [testBookId]);
    await db.query('DELETE FROM physical_book_details WHERE book_id = $1', [testBookId]);
    await db.query('DELETE FROM books WHERE id = $1', [testBookId]);
    await redis.del(`inventory:stock:${testBookId}`, `stock:book:${testBookId}`);
    console.log('  Cleaned up all concurrent test records.');

  } catch (error: any) {
    console.error('❌ Lỗi ngoại lệ trong quá trình chạy test:', error);
  } finally {
    await db.end();
    await redis.quit();
  }

  console.log('\n===============================================================');
  console.log(`📊 KẾT QUẢ TEST 3: Passed ${passed}/${total} assertions.`);
  console.log('===============================================================');
  process.exitCode = (passed === total ? 0 : 1);
}

runTest();
