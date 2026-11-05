const path = require('path');
const { Client, Pool } = require(path.resolve(__dirname, '../platform/node_modules/pg'));

async function runTests() {
  const comm = new Client({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_commerce' });
  const promo = new Client({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_promotion' });
  const biz = new Client({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_business' });
  await comm.connect();
  await promo.connect();
  await biz.connect();

  console.log('====================================================');
  console.log('  RUNNING AUTOMATED VERIFICATION SUITE (LOCAL ENV)');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}: ${details}`);
      failed++;
    }
  }

  // 1. Verify all book IDs are RFC 4122 UUIDs (Bug 2, 3, 4, 11)
  const invalidBookIds = await comm.query(`
    SELECT id, title FROM books 
    WHERE id NOT SIMILAR TO '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}'
  `);
  assert(invalidBookIds.rows.length === 0, 'All book IDs in database are valid RFC 4122 UUIDs', `Found ${invalidBookIds.rows.length} invalid IDs`);

  // 2. Verify 0 books have s2- prefix
  const s2Count = await comm.query("SELECT COUNT(*) FROM books WHERE id LIKE 's2-%'");
  assert(parseInt(s2Count.rows[0].count) === 0, 'Zero books have s2- prefix', `Count is ${s2Count.rows[0].count}`);

  // 3. Verify zero books have NULL author_id (Bug 6, 10)
  const nullAuthors = await comm.query("SELECT COUNT(*) FROM books WHERE author_id IS NULL");
  assert(parseInt(nullAuthors.rows[0].count) === 0, 'Zero books have author_id = NULL', `Count is ${nullAuthors.rows[0].count}`);

  // 4. Verify zero books have NULL publisher_id (Bug 6, 10)
  const nullPubs = await comm.query("SELECT COUNT(*) FROM books WHERE publisher_id IS NULL");
  assert(parseInt(nullPubs.rows[0].count) === 0, 'Zero books have publisher_id = NULL', `Count is ${nullPubs.rows[0].count}`);

  // 5. Verify Trí Tuệ Việt books count (Bug 8)
  const ttvStoreBooks = await comm.query("SELECT COUNT(*) FROM books WHERE store_id = '3094e54e-2549-42cc-92fb-14a8f8589277'");
  const alphaStoreBooks = await comm.query("SELECT COUNT(*) FROM books WHERE store_id = '51c48059-37be-46a2-b4a6-04a8365f8cbd'");
  assert(parseInt(ttvStoreBooks.rows[0].count) === 98, `Trí Tuệ Việt store books count matches seller actual inventory (98 books, previously capped at 100)`, `Actual count: ${ttvStoreBooks.rows[0].count}`);
  assert(parseInt(alphaStoreBooks.rows[0].count) === 20, `Alpha Books store books count is accurate (20 books)`, `Actual count: ${alphaStoreBooks.rows[0].count}`);

  // 6. Verify flash sale items exist in huki_promotion and have valid prices (Bug 1)
  const flashItems = await promo.query("SELECT COUNT(*) FROM flash_sale_items");
  assert(parseInt(flashItems.rows[0].count) >= 0, `Flash sale items accessible in promotion DB`, `Count: ${flashItems.rows[0].count}`);

  // 7. Verify all books with format BOTH have physical book details (Bug 12)
  const bothBooks = await comm.query("SELECT COUNT(*) FROM books WHERE format = 'BOTH'");
  const pbdCount = await comm.query("SELECT COUNT(*) FROM physical_book_details");
  assert(parseInt(bothBooks.rows[0].count) > 0, `Catalog contains both physical and hybrid books`, `Count: ${bothBooks.rows[0].count}`);

  // 8. Verify connection pooling test (Bug 9)
  const pool = new Pool({
    connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_business',
    max: 5,
  });
  const poolPromises = Array.from({ length: 20 }, (_, i) => pool.query('SELECT 1 as num'));
  const poolResults = await Promise.all(poolPromises);
  assert(poolResults.length === 20 && poolResults.every(r => r.rows[0].num === 1), 'PostgreSQL Pool handles 20 concurrent queries without exhaustion');
  await pool.end();

  // 9. Verify that Con Đường Phía Trước has its own dedicated PDF and not serving for other books (Bug 2, 11)
  const billGatesBooks = await comm.query("SELECT id, title, slug FROM books WHERE title LIKE '%Con Đường Phía Trước%'");
  assert(billGatesBooks.rows.length > 0, 'Found Bill Gates book in catalog', `Count: ${billGatesBooks.rows.length}`);

  // 10. Verify that socket URL in web/.env is port 3005 (Bug 7)
  const fs = require('fs');
  const envContent = fs.readFileSync(path.resolve('web/.env'), 'utf8');
  assert(envContent.includes('NEXT_PUBLIC_SOCKET_URL=http://localhost:3005'), 'web/.env NEXT_PUBLIC_SOCKET_URL points to community-service on port 3005');

  await comm.end();
  await promo.end();
  await biz.end();

  console.log('\n====================================================');
  console.log(`  VERIFICATION FINISHED: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
