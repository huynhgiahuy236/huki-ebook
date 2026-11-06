import { Client } from 'pg';
import amqp from 'amqplib';
import { randomUUID } from 'crypto';

const PROMOTION_URL = process.env.PROMOTION_SERVICE_URL || 'http://localhost:3007';
const SHIPPING_URL = process.env.SHIPPING_SERVICE_URL || 'http://localhost:3004';
const INTERNAL_KEY = process.env.INTERNAL_SERVICE_KEY || 'huki-production-internal-key-2026-very-secure';
const SHIPPING_DB_URL = process.env.SHIPPING_DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/huki_shipping';
const PROMOTION_DB_URL = process.env.PROMOTION_DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/huki_promotion';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest123@localhost:5672';

async function main() {
  console.log('================================================================');
  console.log('🛡️ TEST 5: NEGATIVE, EDGE CASE & SECURITY PERIMETER VERIFICATION');
  console.log(`🎯 Targets: Promotion (${PROMOTION_URL}) & Shipping (${SHIPPING_URL})`);
  console.log('================================================================\n');

  const pgPromotion = new Client({ connectionString: PROMOTION_DB_URL });
  const pgShipping = new Client({ connectionString: SHIPPING_DB_URL });
  await pgPromotion.connect();
  await pgShipping.connect();

  let passedAssertions = 0;
  const totalAssertions = 7;

  try {
    // -------------------------------------------------------------
    // NEGATIVE 1: Validate voucher with non-existent promo code
    // -------------------------------------------------------------
    console.log('--- KỊCH BẢN 1: Áp dụng mã voucher hoàn toàn không tồn tại ---');
    const resFakeVoucher = await fetch(`${PROMOTION_URL}/api/v1/vouchers/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': 'test-user-001' },
      body: JSON.stringify({ code: 'NONEXISTENT_CODE_99999', orderSubtotal: 200000 }),
    });
    const dataFake = await resFakeVoucher.json();
    console.log(`Status: ${resFakeVoucher.status}, Response:`, dataFake?.data?.valid ?? dataFake?.valid);
    if (dataFake?.data?.valid === false || dataFake?.valid === false) {
      console.log('✅ PASS [1/7]: Mã không tồn tại bị từ chối thành công.');
      passedAssertions++;
    } else {
      console.error('❌ FAIL [1/7]: Mã không tồn tại nhưng không bị từ chối!');
    }

    // -------------------------------------------------------------
    // NEGATIVE 2: Discount capping check (voucher cannot make order negative)
    // -------------------------------------------------------------
    console.log('\n--- KỊCH BẢN 2: Thử nghiệm chiết khấu voucher lớn hơn giá trị đơn hàng ---');
    // Seed a 50k voucher
    const testCode = `NEG_CAP_${Date.now().toString().slice(-6)}`;
    const vRes = await pgPromotion.query(
      `INSERT INTO vouchers (id, code, name, type, value, min_order_amount, scope, total_usage, current_usage, starts_at, expires_at, status, target_audience, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, 'Cap Test', 'FIXED_AMOUNT', 50000, 0, 'PLATFORM', 10, 0, NOW() - INTERVAL '1 day', NOW() + INTERVAL '1 day', 'ACTIVE', 'ALL', NOW(), NOW())
       RETURNING id, code`,
      [testCode]
    );
    const voucherId = vRes.rows[0].id;

    // Validate with orderSubtotal 30,000đ (< 50,000đ voucher value)
    const resCap = await fetch(`${PROMOTION_URL}/api/v1/vouchers/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: testCode, orderSubtotal: 30000 }),
    });
    const dataCap = await resCap.json();
    const capObj = dataCap?.data ?? dataCap;
    console.log(`Subtotal: 30,000đ, Voucher Value: 50,000đ -> Discount given: ${capObj?.discount}`);
    if (capObj?.discount <= 30000 && capObj?.discount >= 0) {
      console.log('✅ PASS [2/7]: Chiết khấu bị chặn trần ở 30.000đ, bảo toàn đơn không âm tiền.');
      passedAssertions++;
    } else {
      console.error('❌ FAIL [2/7]: Chiết khấu vượt subtotal làm đơn âm tiền!', capObj);
    }

    // -------------------------------------------------------------
    // NEGATIVE 3: External call to internal addresses without key -> 403 Forbidden
    // -------------------------------------------------------------
    console.log('\n--- KỊCH BẢN 3: Bắn request vào internal addresses không có key ---');
    const resNoKey = await fetch(`${SHIPPING_URL}/api/v1/internal/addresses`, {
      headers: { 'x-user-id': 'test-user-001' },
    });
    console.log(`Status without internal key: ${resNoKey.status}`);
    if (resNoKey.status === 403) {
      console.log('✅ PASS [3/7]: Hàng rào an ninh trả về HTTP 403 Forbidden chính xác.');
      passedAssertions++;
    } else {
      console.error(`❌ FAIL [3/7]: Không trả về HTTP 403 Forbidden! (Status: ${resNoKey.status})`);
    }

    // -------------------------------------------------------------
    // NEGATIVE 4: External call with fake/tampered internal key -> 403 Forbidden
    // -------------------------------------------------------------
    console.log('\n--- KỊCH BẢN 4: Bắn request vào internal addresses/:id với key giả mạo ---');
    const resFakeKey = await fetch(`${SHIPPING_URL}/api/v1/internal/addresses/${randomUUID()}`, {
      headers: {
        'x-internal-service-key': 'attacker-tampered-service-key',
        'x-user-id': 'test-user-001',
      },
    });
    console.log(`Status with tampered internal key: ${resFakeKey.status}`);
    if (resFakeKey.status === 403) {
      console.log('✅ PASS [4/7]: Khóa giả mạo bị chặn với HTTP 403 Forbidden.');
      passedAssertions++;
    } else {
      console.error(`❌ FAIL [4/7]: Khóa giả mạo không trả về 403! (Status: ${resFakeKey.status})`);
    }

    // -------------------------------------------------------------
    // NEGATIVE 5: Flash sale reservation with invalid internal service key -> 403 Forbidden
    // -------------------------------------------------------------
    console.log('\n--- KỊCH BẢN 5: Gọi endpoint reserve Flash Sale mà không có internal key hợp lệ ---');
    const resFsNoKey = await fetch(`${PROMOTION_URL}/api/v1/flash-sales/reserve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookId: 'book-fake',
        flashSaleId: 'fs-fake',
        quantity: 1,
        userId: 'attacker-001',
        orderId: 'order-fake',
      }),
    });
    console.log(`Status without key on flash-sales reserve: ${resFsNoKey.status}`);
    if (resFsNoKey.status === 403) {
      console.log('✅ PASS [5/7]: Flash sale reserve chặn đứng request thiếu credentials nội bộ (HTTP 403).');
      passedAssertions++;
    } else {
      console.error(`❌ FAIL [5/7]: Flash sale reserve không trả về 403! (Status: ${resFsNoKey.status})`);
    }

    // -------------------------------------------------------------
    // NEGATIVE 6: Idempotent applyByCode (duplicate call does not increment usage)
    // -------------------------------------------------------------
    console.log('\n--- KỊCH BẢN 6: Gửi lặp lại request applyByCode cho cùng một đơn hàng ---');
    const testOrderId = `order-dedup-${Date.now()}`;
    const resApply1 = await fetch(`${PROMOTION_URL}/api/v1/vouchers/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': 'test-user-001' },
      body: JSON.stringify({ code: testCode, orderId: testOrderId, discountAmount: 30000 }),
    });

    const resApply2 = await fetch(`${PROMOTION_URL}/api/v1/vouchers/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': 'test-user-001' },
      body: JSON.stringify({ code: testCode, orderId: testOrderId, discountAmount: 30000 }),
    });

    const vCheck = await pgPromotion.query(`SELECT current_usage FROM vouchers WHERE id = $1`, [voucherId]);
    const currentUsage = vCheck.rows[0]?.current_usage;
    console.log(`Voucher current_usage after 2 apply calls: ${currentUsage} (Expected: 1)`);
    if (currentUsage === 1) {
      console.log('✅ PASS [6/7]: Idempotent thành công, lượt dùng không bị nhân đôi.');
      passedAssertions++;
    } else {
      console.error(`❌ FAIL [6/7]: Lượt dùng bị nhân đôi (${currentUsage})!`);
    }

    // -------------------------------------------------------------
    // NEGATIVE 7: RabbitMQ ORDER_PAID duplicate event deduplication
    // -------------------------------------------------------------
    console.log('\n--- KỊCH BẢN 7: Bắn trùng lặp sự kiện ORDER_PAID qua RabbitMQ ---');
    const conn = await amqp.connect(RABBITMQ_URL);
    const ch = await conn.createChannel();
    await ch.assertExchange('huki.events', 'topic', { durable: true });

    const paidEventId = `evt-paid-${randomUUID()}`;
    const paidOrderId = randomUUID();
    const paidSellerOrderId = randomUUID();

    const paidEvent = {
      eventId: paidEventId,
      eventType: 'ORDER_PAID',
      occurredAt: new Date().toISOString(),
      producer: 'commerce-service',
      version: 1,
      aggregateId: paidOrderId,
      payload: {
        orderId: paidOrderId,
        userId: '04609db5-d34d-4f54-a640-c6e7d820777b',
        paymentMethod: 'ONLINE_PAYMENT',
        paymentStatus: 'SUCCEEDED',
        shippingAddress: {
          receiverName: 'Auditor Paid Receiver',
          receiverPhone: '0987654321',
          address: '456 Tran Hung Dao',
          province: 'Thành phố Hồ Chí Minh',
          district: 'Quận 5',
          ward: 'Phường 1',
        },
        sellerOrders: [
          {
            sellerOrderId: paidSellerOrderId,
            storeId: randomUUID(),
            ownerUserId: '04609db5-d34d-4f54-a640-c6e7d820777b',
            requiresShipping: true,
            weight: 350,
            codAmount: 0,
          },
        ],
      },
    };

    const msgBuffer = Buffer.from(JSON.stringify(paidEvent));
    ch.publish('huki.events', 'ORDER_PAID', msgBuffer, { persistent: true });
    ch.publish('huki.events', 'ORDER_PAID', msgBuffer, { persistent: true });

    // Wait 3s
    await new Promise((r) => setTimeout(r, 3000));
    await ch.close();
    await conn.close();

    const paidShipmentCount = await pgShipping.query(
      `SELECT count(*) FROM shipments WHERE seller_order_id = $1`,
      [paidSellerOrderId]
    );
    const count = Number(paidShipmentCount.rows[0].count);
    console.log(`Shipments created for duplicate ORDER_PAID: ${count} (Expected: 1)`);
    if (count === 1) {
      console.log('✅ PASS [7/7]: Sự kiện ORDER_PAID trùng lặp được khử triệt để, tạo đúng 1 vận đơn.');
      passedAssertions++;
    } else {
      console.error(`❌ FAIL [7/7]: Tạo sai số lượng vận đơn cho ORDER_PAID (${count})!`);
    }

    // Teardown
    await pgPromotion.query(`DELETE FROM voucher_usages WHERE voucher_id = $1`, [voucherId]);
    await pgPromotion.query(`DELETE FROM vouchers WHERE id = $1`, [voucherId]);
    await pgShipping.query(`DELETE FROM delivery_logs WHERE shipment_id IN (SELECT id FROM shipments WHERE seller_order_id = $1)`, [paidSellerOrderId]);
    await pgShipping.query(`DELETE FROM shipments WHERE seller_order_id = $1`, [paidSellerOrderId]);
    await pgShipping.query(`DELETE FROM inbox_events WHERE event_id = $1`, [paidEventId]);

  } finally {
    await pgPromotion.end();
    await pgShipping.end();
  }

  console.log('\n================================================================');
  console.log(`📊 KẾT QUẢ TEST 5 (NEGATIVE & RESILIENCE): ${passedAssertions}/${totalAssertions} ASSERTIONS PASS`);
  console.log('================================================================\n');

  await new Promise((resolve) => setTimeout(resolve, 200));
  if (passedAssertions === totalAssertions) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unhandled test error:', err);
  process.exit(1);
});
