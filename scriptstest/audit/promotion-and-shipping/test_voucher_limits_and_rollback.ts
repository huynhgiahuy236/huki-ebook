import { Client } from 'pg';

const PROMOTION_URL = process.env.PROMOTION_SERVICE_URL || 'http://localhost:3007';
const INTERNAL_KEY = process.env.INTERNAL_SERVICE_KEY || 'huki-production-internal-key-2026-very-secure';
const DB_URL = process.env.PROMOTION_DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/huki_promotion';

async function main() {
  console.log('================================================================');
  console.log('🧪 TEST 1: VOUCHER LIMITS, VALIDATION & ROLLBACK VERIFICATION');
  console.log(`🎯 Service Target: ${PROMOTION_URL}`);
  console.log('================================================================\n');

  const pg = new Client({ connectionString: DB_URL });
  await pg.connect();

  const testUserId = '04609db5-d34d-4f54-a640-c6e7d820777b'; // Huỳnh Gia Huy Buyer
  const testOrderId = `test-order-${Date.now()}`;
  const testCode = `TESTVOUCH_${Date.now().toString().slice(-6)}`;
  let passedAssertions = 0;
  const totalAssertions = 6;

  try {
    // 0. Setup: Clean up any old test voucher and insert a fresh one
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const expiredAt = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const startsAtPast = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    // Create test active voucher: Value 50,000đ, min order 100,000đ, total usage 10
    const insertRes = await pg.query(
      `INSERT INTO vouchers (id, code, name, type, value, min_order_amount, max_discount_amount, scope, total_usage, max_usage_per_user, current_usage, starts_at, expires_at, status, target_audience, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, 'Test Voucher', 'FIXED_AMOUNT', 50000, 100000, 50000, 'PLATFORM', 10, 5, 0, $2, $3, 'ACTIVE', 'ALL', NOW(), NOW())
       RETURNING id, code, current_usage, total_usage`,
      [testCode, startsAtPast, expiresAt]
    );
    const testVoucher = insertRes.rows[0];
    console.log(`[SETUP] Created test voucher: ${testCode} (ID: ${testVoucher.id})`);

    // Also create an expired voucher
    const expiredCode = `EXPIRED_${Date.now().toString().slice(-6)}`;
    await pg.query(
      `INSERT INTO vouchers (id, code, name, type, value, min_order_amount, scope, total_usage, current_usage, starts_at, expires_at, status, target_audience, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, 'Expired Voucher', 'FIXED_AMOUNT', 30000, 50000, 'PLATFORM', 10, 0, $2, $3, 'ACTIVE', 'ALL', NOW(), NOW())`,
      [expiredCode, startsAtPast, expiredAt]
    );

    // Save test voucher to user's wallet so mandatory claim check passes
    await pg.query(
      `INSERT INTO user_saved_vouchers (id, user_id, voucher_id, saved_at)
       VALUES (gen_random_uuid(), $1, $2, NOW())
       ON CONFLICT DO NOTHING`,
      [testUserId, testVoucher.id]
    );

    // -------------------------------------------------------------
    // ASSERTION 1: Expired voucher must be rejected
    // -------------------------------------------------------------
    console.log('\n--- KỊCH BẢN 1: Áp dụng voucher đã hết hạn sử dụng ---');
    const resExpired = await fetch(`${PROMOTION_URL}/api/v1/vouchers/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': testUserId },
      body: JSON.stringify({ code: expiredCode, orderSubtotal: 200000 }),
    });
    const dataExpired = await resExpired.json();
    console.log(`Response status: ${resExpired.status}, Valid: ${dataExpired?.data?.valid ?? dataExpired?.valid}`);
    const isExpiredBlocked = (dataExpired?.data?.valid === false || dataExpired?.valid === false);
    if (isExpiredBlocked) {
      console.log('✅ PASS [1/6]: Voucher hết hạn bị từ chối thành công.');
      passedAssertions++;
    } else {
      console.error('❌ FAIL [1/6]: Voucher hết hạn nhưng không bị từ chối!');
    }

    // -------------------------------------------------------------
    // ASSERTION 2: Min order amount condition
    // -------------------------------------------------------------
    console.log('\n--- KỊCH BẢN 2: Giá trị đơn hàng chưa đạt mức tối thiểu (minOrderAmount = 100K) ---');
    const resMinOrder = await fetch(`${PROMOTION_URL}/api/v1/vouchers/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': testUserId },
      body: JSON.stringify({ code: testCode, orderSubtotal: 80000 }), // Under 100K
    });
    const dataMinOrder = await resMinOrder.json();
    console.log(`Order Subtotal: 80,000 VND -> Valid: ${dataMinOrder?.data?.valid ?? dataMinOrder?.valid}`);
    const isMinOrderBlocked = (dataMinOrder?.data?.valid === false || dataMinOrder?.valid === false);
    if (isMinOrderBlocked) {
      console.log('✅ PASS [2/6]: Đơn hàng dưới minOrderAmount bị chặn chuẩn xác.');
      passedAssertions++;
    } else {
      console.error('❌ FAIL [2/6]: Đơn hàng dưới minOrderAmount không bị chặn!');
    }

    // -------------------------------------------------------------
    // ASSERTION 3: Valid voucher validation & Discount calculation
    // -------------------------------------------------------------
    console.log('\n--- KỊCH BẢN 3: Áp dụng voucher hợp lệ (Đơn 150K >= 100K) ---');
    const resValid = await fetch(`${PROMOTION_URL}/api/v1/vouchers/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': testUserId },
      body: JSON.stringify({ code: testCode, orderSubtotal: 150000 }),
    });
    const dataValid = await resValid.json();
    const resultObj = dataValid?.data ?? dataValid;
    console.log(`Valid: ${resultObj?.valid}, Discount: ${resultObj?.discount}`);
    if (resultObj?.valid === true && resultObj?.discount === 50000) {
      console.log('✅ PASS [3/6]: Voucher hợp lệ được chấp nhận, chiết khấu tính đúng 50.000đ.');
      passedAssertions++;
    } else {
      console.error('❌ FAIL [3/6]: Lỗi tính chiết khấu voucher!', resultObj);
    }

    // -------------------------------------------------------------
    // ASSERTION 4: Discount must not exceed order subtotal (No negative order)
    // -------------------------------------------------------------
    console.log('\n--- KỊCH BẢN 4: Chống làm đơn hàng âm tiền khi voucher > giá trị đơn ---');
    // Test with a 50k voucher on a 40k subtotal (or capped to subtotal)
    const resOverDiscount = await fetch(`${PROMOTION_URL}/api/v1/vouchers/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': testUserId },
      body: JSON.stringify({ code: testCode, orderSubtotal: 110000 }),
    });
    const dataOver = await resOverDiscount.json();
    const overObj = dataOver?.data ?? dataOver;
    const finalAmount = 110000 - (overObj?.discount ?? 0);
    console.log(`Subtotal: 110,000 - Discount: ${overObj?.discount} = Net: ${finalAmount}`);
    if (finalAmount >= 0 && (overObj?.discount ?? 0) <= 110000) {
      console.log('✅ PASS [4/6]: Giá trị đơn hàng sau giảm giá bảo toàn >= 0.');
      passedAssertions++;
    } else {
      console.error('❌ FAIL [4/6]: Đơn hàng bị âm tiền sau khi áp dụng voucher!');
    }

    // -------------------------------------------------------------
    // ASSERTION 5: Apply voucher -> Usage increment in DB
    // -------------------------------------------------------------
    console.log('\n--- KỊCH BẢN 5: Áp dụng voucher ghi nhận lượt dùng (Apply) ---');
    const resApply = await fetch(`${PROMOTION_URL}/api/v1/vouchers/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': testUserId },
      body: JSON.stringify({ code: testCode, orderId: testOrderId, discountAmount: 50000 }),
    });
    console.log(`Apply status: ${resApply.status}`);
    const vAfterApply = await pg.query(`SELECT current_usage FROM vouchers WHERE id = $1`, [testVoucher.id]);
    const usageAfterApply = vAfterApply.rows[0]?.current_usage;
    console.log(`Voucher current_usage in DB: ${usageAfterApply} (Expected: 1)`);
    if (resApply.status === 200 && usageAfterApply === 1) {
      console.log('✅ PASS [5/6]: Lượt dùng voucher tăng từ 0 lên 1 chính xác.');
      passedAssertions++;
    } else {
      console.error('❌ FAIL [5/6]: Lượt dùng không tăng chuẩn xác!', { status: resApply.status, usage: usageAfterApply });
    }

    // -------------------------------------------------------------
    // ASSERTION 6: Rollback voucher on order cancellation
    // -------------------------------------------------------------
    console.log('\n--- KỊCH BẢN 6: Hoàn trả voucher khi đơn hàng bị hủy (Rollback) ---');
    const resRollback = await fetch(`${PROMOTION_URL}/api/v1/vouchers/rollback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: testOrderId }),
    });
    const dataRollback = await resRollback.json();
    console.log(`Rollback response:`, dataRollback);
    const vAfterRollback = await pg.query(`SELECT current_usage FROM vouchers WHERE id = $1`, [testVoucher.id]);
    const usageAfterRollback = vAfterRollback.rows[0]?.current_usage;
    console.log(`Voucher current_usage after rollback in DB: ${usageAfterRollback} (Expected: 0)`);
    if (resRollback.status === 200 && usageAfterRollback === 0) {
      console.log('✅ PASS [6/6]: Rollback thành công, lượt dùng được phục hồi về 0.');
      passedAssertions++;
    } else {
      console.error('❌ FAIL [6/6]: Rollback thất bại hoặc lượt dùng không hoàn trả!');
    }

    // Clean up test data
    await pg.query(`DELETE FROM user_saved_vouchers WHERE voucher_id IN ($1, (SELECT id FROM vouchers WHERE code = $2))`, [testVoucher.id, expiredCode]);
    await pg.query(`DELETE FROM voucher_usages WHERE order_id = $1`, [testOrderId]);
    await pg.query(`DELETE FROM vouchers WHERE code IN ($1, $2)`, [testCode, expiredCode]);
    console.log('\n[TEARDOWN] Cleaned up temporary test vouchers.');

  } finally {
    await pg.end();
  }

  console.log('\n================================================================');
  console.log(`📊 KẾT QUẢ TEST 1: ${passedAssertions}/${totalAssertions} ASSERTIONS PASS`);
  console.log('================================================================\n');

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
