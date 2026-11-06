import { Client } from 'pg';
import Redis from 'ioredis';

const PROMOTION_URL = process.env.PROMOTION_SERVICE_URL || 'http://localhost:3007';
const INTERNAL_KEY = process.env.INTERNAL_SERVICE_KEY || 'huki-production-internal-key-2026-very-secure';
const DB_URL = process.env.PROMOTION_DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/huki_promotion';
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;

async function main() {
  console.log('================================================================');
  console.log('🧪 TEST 2: FLASH SALE REDIS ATOMIC SYNC & QUOTA ROLLBACK');
  console.log(`🎯 Service Target: ${PROMOTION_URL}`);
  console.log('================================================================\n');

  const pg = new Client({ connectionString: DB_URL });
  await pg.connect();
  const redis = new Redis({ host: REDIS_HOST, port: REDIS_PORT });

  const activeFlashSaleId = 'flash-sale-active-2026';
  const testItemId = `fsi-test-${Date.now()}`;
  const testBookId = `book-fs-${Date.now()}`;
  const initialStock = 3;

  let passedAssertions = 0;
  const totalAssertions = 5;

  try {
    // 1. Setup test flash sale item inside active campaign in huki_promotion
    await pg.query(
      `INSERT INTO flash_sale_items (id, flash_sale_id, book_id, original_price, sale_price, stock, sold, max_per_user, created_at)
       VALUES ($1, $2, $3, 100000, 50000, $4, 0, 1, NOW())`,
      [testItemId, activeFlashSaleId, testBookId, initialStock]
    );

    // Synchronize initial stock into Redis key `flash:stock:${testItemId}`
    const stockKey = `flash:stock:${testItemId}`;
    await redis.set(stockKey, initialStock);
    console.log(`[SETUP] Seeded Item ${testItemId} (Book: ${testBookId}) with Stock = ${initialStock} in DB and Redis.`);

    // -------------------------------------------------------------
    // ASSERTION 1 & 2: 3 Concurrent Reserves Succeed, Stock reaches 0
    // -------------------------------------------------------------
    console.log('\n--- KỊCH BẢN 1: Bắn 3 request đặt hàng đồng thời cho 3 người mua khác nhau ---');
    const buyers = [
      { userId: `buyer-001-${Date.now()}`, orderId: `order-001-${Date.now()}` },
      { userId: `buyer-002-${Date.now()}`, orderId: `order-002-${Date.now()}` },
      { userId: `buyer-003-${Date.now()}`, orderId: `order-003-${Date.now()}` },
    ];

    const reservePromises = buyers.map((b) =>
      fetch(`${PROMOTION_URL}/api/v1/flash-sales/reserve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-service-key': INTERNAL_KEY,
        },
        body: JSON.stringify({
          bookId: testBookId,
          flashSaleId: activeFlashSaleId,
          quantity: 1,
          userId: b.userId,
          orderId: b.orderId,
        }),
      })
    );

    const responses = await Promise.all(reservePromises);
    const statuses = responses.map((r) => r.status);
    console.log(`Buyer reservation HTTP statuses:`, statuses);

    const allThreeSucceeded = statuses.every((s) => s === 200 || s === 201);
    if (allThreeSucceeded) {
      console.log('✅ PASS [1/5]: Cả 3 lượt mua hợp lệ đều thành công giữ chỗ.');
      passedAssertions++;
    } else {
      console.error('❌ FAIL [1/5]: Có lượt mua hợp lệ bị thất bại!', statuses);
    }

    // Check Redis & Postgres stock after 3 reserves
    const redisStockAfter3 = Number(await redis.get(stockKey));
    const dbItemAfter3 = await pg.query(`SELECT stock, sold FROM flash_sale_items WHERE id = $1`, [testItemId]);
    const { stock: dbStockAfter3, sold: dbSoldAfter3 } = dbItemAfter3.rows[0];

    console.log(`State after 3 reserves -> Redis Stock: ${redisStockAfter3}, DB Stock: ${dbStockAfter3}, DB Sold: ${dbSoldAfter3}`);
    if (redisStockAfter3 === 0 && Number(dbStockAfter3) === 0 && Number(dbSoldAfter3) === 3) {
      console.log('✅ PASS [2/5]: Đồng bộ hoàn hảo: Redis = 0 và DB Stock = 0, Sold = 3.');
      passedAssertions++;
    } else {
      console.error('❌ FAIL [2/5]: Bất đồng bộ giữa Redis và DB sau khi trừ quota!', {
        redisStock: redisStockAfter3,
        dbStock: dbStockAfter3,
        dbSold: dbSoldAfter3,
      });
    }

    // -------------------------------------------------------------
    // ASSERTION 3: 4th buyer attempts reservation when stock = 0 -> Blocked
    // -------------------------------------------------------------
    console.log('\n--- KỊCH BẢN 2: Người mua thứ 4 cố gắng mua khi tồn kho đã về 0 ---');
    const res4 = await fetch(`${PROMOTION_URL}/api/v1/flash-sales/reserve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-service-key': INTERNAL_KEY,
      },
      body: JSON.stringify({
        bookId: testBookId,
        flashSaleId: activeFlashSaleId,
        quantity: 1,
        userId: `buyer-004-${Date.now()}`,
        orderId: `order-004-${Date.now()}`,
      }),
    });
    const data4 = await res4.json();
    console.log(`4th buyer HTTP status: ${res4.status}`, data4?.code || data4?.message);
    if (res4.status === 400) {
      console.log('✅ PASS [3/5]: Chặn đứng người mua thứ 4, không bị bán âm tồn kho.');
      passedAssertions++;
    } else {
      console.error('❌ FAIL [3/5]: Tồn kho đã hết nhưng vẫn cho phép mua!');
    }

    // -------------------------------------------------------------
    // ASSERTION 4: Release order quota and stock restoration
    // -------------------------------------------------------------
    console.log('\n--- KỊCH BẢN 3: Hủy đơn hàng của Buyer 1 -> Hoàn trả tồn kho (Release Order) ---');
    const resRelease = await fetch(`${PROMOTION_URL}/api/v1/flash-sales/release-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-service-key': INTERNAL_KEY,
      },
      body: JSON.stringify({
        orderId: buyers[0].orderId,
      }),
    });
    console.log(`Release HTTP status: ${resRelease.status}`);

    const redisStockAfterRelease = Number(await redis.get(stockKey));
    const dbItemAfterRelease = await pg.query(`SELECT stock, sold FROM flash_sale_items WHERE id = $1`, [testItemId]);
    const { stock: dbStockAfterRelease, sold: dbSoldAfterRelease } = dbItemAfterRelease.rows[0];

    console.log(`State after release -> Redis Stock: ${redisStockAfterRelease}, DB Stock: ${dbStockAfterRelease}, DB Sold: ${dbSoldAfterRelease}`);
    if (redisStockAfterRelease === 1 && Number(dbStockAfterRelease) === 1 && Number(dbSoldAfterRelease) === 2) {
      console.log('✅ PASS [4/5]: Hoàn trả tồn kho thành công trên cả Redis (+1) và Postgres (+1 stock, -1 sold).');
      passedAssertions++;
    } else {
      console.error('❌ FAIL [4/5]: Phục hồi tồn kho không chính xác sau khi release!', {
        redisStock: redisStockAfterRelease,
        dbStock: dbStockAfterRelease,
        dbSold: dbSoldAfterRelease,
      });
    }

    // -------------------------------------------------------------
    // ASSERTION 5: Buyer 4 can now successfully purchase the released stock
    // -------------------------------------------------------------
    console.log('\n--- KỊCH BẢN 4: Buyer 4 mua lại đúng 1 suất vừa được nhả ra ---');
    const res4Retry = await fetch(`${PROMOTION_URL}/api/v1/flash-sales/reserve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-service-key': INTERNAL_KEY,
      },
      body: JSON.stringify({
        bookId: testBookId,
        flashSaleId: activeFlashSaleId,
        quantity: 1,
        userId: `buyer-004-${Date.now()}`,
        orderId: `order-004-retry-${Date.now()}`,
      }),
    });
    console.log(`Buyer 4 retry status: ${res4Retry.status}`);
    if (res4Retry.status === 200 || res4Retry.status === 201) {
      console.log('✅ PASS [5/5]: Suất vừa nhả ra được phục vụ ngay cho khách hàng tiếp theo.');
      passedAssertions++;
    } else {
      console.error('❌ FAIL [5/5]: Không thể mua suất tồn kho vừa được phục hồi!');
    }

    // Teardown
    await redis.del(stockKey);
    const allReservationKeys = await redis.keys(`*${testItemId}*`);
    if (allReservationKeys.length > 0) {
      await redis.del(...allReservationKeys);
    }
    await pg.query(`DELETE FROM flash_sale_items WHERE id = $1`, [testItemId]);
    console.log('\n[TEARDOWN] Cleaned up temporary flash sale test data.');

  } finally {
    await pg.end();
    await redis.quit();
  }

  console.log('\n================================================================');
  console.log(`📊 KẾT QUẢ TEST 2: ${passedAssertions}/${totalAssertions} ASSERTIONS PASS`);
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
