const { Client } = require('pg');

async function seedRealFlashSaleMetrics() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_promotion',
  });
  await client.connect();

  console.log('Connected to huki_promotion. Updating realistic flash sale sales metrics...');

  // 1. Update sold counts for existing ended items based on actual capacity
  await client.query(`
    UPDATE flash_sale_items
    SET sold = 9
    WHERE flash_sale_id = '8a0fd83f-dd1a-473a-9c83-9ce44f727ad0' AND original_price = 108000;
  `);

  await client.query(`
    UPDATE flash_sale_items
    SET sold = 7
    WHERE flash_sale_id = '8a0fd83f-dd1a-473a-9c83-9ce44f727ad0' AND original_price = 65000;
  `);

  await client.query(`
    UPDATE flash_sale_items
    SET sold = 8
    WHERE flash_sale_id = '927eb156-176c-4535-987a-3a6a69e423a2' AND original_price = 108000;
  `);

  await client.query(`
    UPDATE flash_sale_items
    SET sold = 5
    WHERE flash_sale_id = '927eb156-176c-4535-987a-3a6a69e423a2' AND original_price = 65000;
  `);

  await client.query(`
    UPDATE flash_sale_items
    SET sold = 10
    WHERE flash_sale_id = 'a026e751-14b6-4d56-af50-48b65c607b19' AND original_price = 108000;
  `);

  await client.query(`
    UPDATE flash_sale_items
    SET sold = 6
    WHERE flash_sale_id = 'a026e751-14b6-4d56-af50-48b65c607b19' AND original_price = 65000;
  `);

  // 2. Ensure an ACTIVE campaign exists for today so the user can see live status
  const now = new Date();
  const todayStart = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
  const todayEnd = new Date(now.getTime() + 4 * 60 * 60 * 1000);   // 4 hours from now

  const activeRes = await client.query(`
    SELECT id FROM flash_sales WHERE status = 'ACTIVE' LIMIT 1
  `);

  if (activeRes.rows.length === 0) {
    const newFsId = 'f5a1e2d3-c4b5-4a6f-8e9d-0c1b2a3f4e5d';
    await client.query(`
      INSERT INTO flash_sales (id, name, description, starts_at, ends_at, status, discount_percent, scope, min_stores, max_stores, max_per_user, created_at, updated_at)
      VALUES ($1, 'Flash Sale Giờ Vàng Trực Tuyến ⚡', 'Chiến dịch Flash Sale toàn sàn khung giờ vàng trưa và chiều', $2, $3, 'ACTIVE', 35, 'PLATFORM', 1, 10, 2, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET starts_at = $2, ends_at = $3, status = 'ACTIVE'
    `, [newFsId, todayStart, todayEnd]);

    // Insert active items
    await client.query(`
      INSERT INTO flash_sale_items (id, flash_sale_id, book_id, store_id, original_price, sale_price, stock, sold, max_per_user, created_at)
      VALUES 
      ('fsi-act-001', $1, '764deec2-95b9-450c-91ee-103f685b978d', '3094e54e-2549-42cc-92fb-14a8f8589277', 108000, 64800, 20, 14, 2, NOW()),
      ('fsi-act-002', $1, 'b0000007-0000-4000-8000-000000000007', 'd2caa7b1-1b82-49b9-be65-1fc6be42e472', 65000, 39000, 15, 11, 2, NOW())
      ON CONFLICT (id) DO UPDATE SET sold = EXCLUDED.sold
    `, [newFsId]);
  }

  console.log('Flash sale metrics updated successfully.');
  await client.end();
}

seedRealFlashSaleMetrics().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
