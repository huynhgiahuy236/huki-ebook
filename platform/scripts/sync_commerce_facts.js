const { Client } = require('pg');

async function syncRealCommerceOrdersToAnalytics() {
  const commerceClient = new Client({
    connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_commerce',
  });
  const analyticsClient = new Client({
    connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_analytics',
  });

  await commerceClient.connect();
  await analyticsClient.connect();

  console.log('Connected to databases. Syncing real COMPLETED & DELIVERED seller orders...');

  // 1. Fetch completed or delivered seller orders
  const sellerOrdersRes = await commerceClient.query(`
    SELECT so.id as seller_order_id, so.order_id, so.store_id, so.status, so.grand_total, so.created_at
    FROM seller_orders so
    WHERE so.status IN ('COMPLETED', 'DELIVERED')
    ORDER BY so.created_at ASC
  `);

  console.log(`Found ${sellerOrdersRes.rows.length} completed/delivered seller orders in commerce.`);

  for (const so of sellerOrdersRes.rows) {
    const occurredAt = new Date(so.created_at);
    const amount = Number(so.grand_total || 0);

    // 1. PLATFORM_GMV fact
    const platformFactId = `ORDER_COMPLETED:PLATFORM_GMV:${so.seller_order_id}`;
    await analyticsClient.query(`
      INSERT INTO domain_fact_snapshots (id, fact_id, event_id, event_type, fact_type, order_id, seller_order_id, store_id, amount, quantity, occurred_at, created_at)
      VALUES (gen_random_uuid()::text, $1, $2, 'ORDER_COMPLETED', 'PLATFORM_GMV', $3, $4, $5, $6, 1, $7, NOW())
      ON CONFLICT (fact_id) DO UPDATE SET amount = $6, occurred_at = $7
    `, [platformFactId, `evt-${so.seller_order_id}`, so.order_id, so.seller_order_id, so.store_id, amount, occurredAt]);

    // 2. COMPLETED_ORDER_COUNT fact
    const countFactId = `ORDER_COMPLETED:COMPLETED_ORDER_COUNT:${so.seller_order_id}`;
    await analyticsClient.query(`
      INSERT INTO domain_fact_snapshots (id, fact_id, event_id, event_type, fact_type, order_id, seller_order_id, store_id, amount, quantity, occurred_at, created_at)
      VALUES (gen_random_uuid()::text, $1, $2, 'ORDER_COMPLETED', 'COMPLETED_ORDER_COUNT', $3, $4, $5, $6, 1, $7, NOW())
      ON CONFLICT (fact_id) DO UPDATE SET amount = $6, occurred_at = $7
    `, [countFactId, `evt-${so.seller_order_id}`, so.order_id, so.seller_order_id, so.store_id, amount, occurredAt]);

    // 3. STORE_GMV fact
    const storeFactId = `ORDER_COMPLETED:STORE_GMV:${so.seller_order_id}`;
    await analyticsClient.query(`
      INSERT INTO domain_fact_snapshots (id, fact_id, event_id, event_type, fact_type, order_id, seller_order_id, store_id, amount, quantity, occurred_at, created_at)
      VALUES (gen_random_uuid()::text, $1, $2, 'ORDER_COMPLETED', 'STORE_GMV', $3, $4, $5, $6, 1, $7, NOW())
      ON CONFLICT (fact_id) DO UPDATE SET amount = $6, occurred_at = $7
    `, [storeFactId, `evt-${so.seller_order_id}`, so.order_id, so.seller_order_id, so.store_id, amount, occurredAt]);

    // Items
    const itemsRes = await commerceClient.query(`
      SELECT id, book_id, book_title, quantity, subtotal
      FROM order_items
      WHERE seller_order_id = $1
    `, [so.seller_order_id]);

    for (const item of itemsRes.rows) {
      const itemGmv = Number(item.subtotal || 0);
      const units = Number(item.quantity || 1);

      // STORE_BOOK_GMV
      const bookFactId = `ORDER_COMPLETED:STORE_BOOK_GMV:${so.seller_order_id}:${item.id}`;
      await analyticsClient.query(`
        INSERT INTO domain_fact_snapshots (id, fact_id, event_id, event_type, fact_type, order_id, seller_order_id, store_id, book_id, amount, quantity, occurred_at, created_at)
        VALUES (gen_random_uuid()::text, $1, $2, 'ORDER_COMPLETED', 'STORE_BOOK_GMV', $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (fact_id) DO UPDATE SET amount = $7, quantity = $8
      `, [bookFactId, `evt-${so.seller_order_id}`, so.order_id, so.seller_order_id, so.store_id, item.book_id, itemGmv, units, occurredAt]);

      // UNITS_SOLD
      const unitsFactId = `ORDER_COMPLETED:UNITS_SOLD:${so.seller_order_id}:${item.id}`;
      await analyticsClient.query(`
        INSERT INTO domain_fact_snapshots (id, fact_id, event_id, event_type, fact_type, order_id, seller_order_id, store_id, book_id, amount, quantity, occurred_at, created_at)
        VALUES (gen_random_uuid()::text, $1, $2, 'ORDER_COMPLETED', 'UNITS_SOLD', $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (fact_id) DO UPDATE SET amount = $7, quantity = $8
      `, [unitsFactId, `evt-${so.seller_order_id}`, so.order_id, so.seller_order_id, so.store_id, item.book_id, itemGmv, units, occurredAt]);
    }
  }

  // Aggregate into daily_aggregates
  // 1. PLATFORM_GMV by date
  await analyticsClient.query(`
    INSERT INTO daily_aggregates (id, business_date, metric_name, scope, dimension_key, metric_value, created_at, updated_at)
    SELECT
      gen_random_uuid()::text,
      occurred_at::date as bdate,
      'PLATFORM_GMV',
      'PLATFORM',
      'PLATFORM',
      SUM(amount),
      NOW(),
      NOW()
    FROM domain_fact_snapshots
    WHERE fact_type = 'PLATFORM_GMV'
    GROUP BY bdate
    ON CONFLICT (business_date, metric_name, scope, dimension_key)
    DO UPDATE SET metric_value = EXCLUDED.metric_value, updated_at = NOW()
  `);

  // 2. COMPLETED_ORDER_COUNT by date
  await analyticsClient.query(`
    INSERT INTO daily_aggregates (id, business_date, metric_name, scope, dimension_key, metric_value, created_at, updated_at)
    SELECT
      gen_random_uuid()::text,
      occurred_at::date as bdate,
      'COMPLETED_ORDER_COUNT',
      'PLATFORM',
      'PLATFORM',
      COUNT(*),
      NOW(),
      NOW()
    FROM domain_fact_snapshots
    WHERE fact_type = 'COMPLETED_ORDER_COUNT'
    GROUP BY bdate
    ON CONFLICT (business_date, metric_name, scope, dimension_key)
    DO UPDATE SET metric_value = EXCLUDED.metric_value, updated_at = NOW()
  `);

  // 3. STORE_GMV by date and store
  await analyticsClient.query(`
    INSERT INTO daily_aggregates (id, business_date, metric_name, scope, dimension_key, store_id, metric_value, created_at, updated_at)
    SELECT
      gen_random_uuid()::text,
      occurred_at::date as bdate,
      'STORE_GMV',
      'STORE',
      store_id,
      store_id,
      SUM(amount),
      NOW(),
      NOW()
    FROM domain_fact_snapshots
    WHERE fact_type = 'STORE_GMV' AND store_id IS NOT NULL
    GROUP BY bdate, store_id
    ON CONFLICT (business_date, metric_name, scope, dimension_key)
    DO UPDATE SET metric_value = EXCLUDED.metric_value, updated_at = NOW()
  `);

  // 3b. STORE_ORDER_COUNT by date and store
  await analyticsClient.query(`
    INSERT INTO daily_aggregates (id, business_date, metric_name, scope, dimension_key, store_id, metric_value, created_at, updated_at)
    SELECT
      gen_random_uuid()::text,
      occurred_at::date as bdate,
      'STORE_ORDER_COUNT',
      'STORE',
      'STORE_ORDER_COUNT:' || store_id,
      store_id,
      COUNT(*),
      NOW(),
      NOW()
    FROM domain_fact_snapshots
    WHERE fact_type = 'STORE_GMV' AND store_id IS NOT NULL
    GROUP BY bdate, store_id
    ON CONFLICT (business_date, metric_name, scope, dimension_key)
    DO UPDATE SET metric_value = EXCLUDED.metric_value, updated_at = NOW()
  `);

  // 4. UNITS_SOLD platform bestsellers
  await analyticsClient.query(`
    INSERT INTO daily_aggregates (id, business_date, metric_name, scope, dimension_key, book_id, metric_value, created_at, updated_at)
    SELECT
      gen_random_uuid()::text,
      occurred_at::date as bdate,
      'UNITS_SOLD',
      'BOOK',
      'BOOK:PLATFORM:' || book_id,
      book_id,
      SUM(quantity),
      NOW(),
      NOW()
    FROM domain_fact_snapshots
    WHERE fact_type = 'UNITS_SOLD' AND book_id IS NOT NULL
    GROUP BY bdate, book_id
    ON CONFLICT (business_date, metric_name, scope, dimension_key)
    DO UPDATE SET metric_value = EXCLUDED.metric_value, updated_at = NOW()
  `);

  // 5. BOOK_GMV platform bestsellers
  await analyticsClient.query(`
    INSERT INTO daily_aggregates (id, business_date, metric_name, scope, dimension_key, book_id, metric_value, created_at, updated_at)
    SELECT
      gen_random_uuid()::text,
      occurred_at::date as bdate,
      'BOOK_GMV',
      'BOOK',
      'BOOK:PLATFORM:' || book_id,
      book_id,
      SUM(amount),
      NOW(),
      NOW()
    FROM domain_fact_snapshots
    WHERE fact_type = 'STORE_BOOK_GMV' AND book_id IS NOT NULL
    GROUP BY bdate, book_id
    ON CONFLICT (business_date, metric_name, scope, dimension_key)
    DO UPDATE SET metric_value = EXCLUDED.metric_value, updated_at = NOW()
  `);

  console.log('Daily aggregates successfully calculated from real commerce orders.');

  const aggCount = await analyticsClient.query('SELECT count(*) FROM daily_aggregates');
  console.log(`Current daily_aggregates count: ${aggCount.rows[0].count}`);

  await commerceClient.end();
  await analyticsClient.end();
}

syncRealCommerceOrdersToAnalytics().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
