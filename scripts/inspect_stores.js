const { Client } = require('../platform/node_modules/pg');

async function inspectStores() {
  const cBiz = new Client({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_business' });
  const cCom = new Client({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_commerce' });
  await cBiz.connect();
  await cCom.connect();

  const stores = await cBiz.query('SELECT id, name, slug, business_id, is_active FROM stores');
  console.log('--- ALL STORES IN huki_business.stores ---');
  for (const s of stores.rows) {
    const bookCount = await cCom.query('SELECT COUNT(*) FROM books WHERE store_id = $1 AND status = \'PUBLISHED\'', [s.id]);
    console.log(`Store: "${s.name}" (id: ${s.id}, slug: ${s.slug}, bizId: ${s.business_id}) -> ${bookCount.rows[0].count} books`);
  }

  const allStoreIdsInBooks = await cCom.query('SELECT DISTINCT store_id FROM books');
  console.log('\n--- DISTINCT STORE_IDs IN huki_commerce.books ---');
  for (const row of allStoreIdsInBooks.rows) {
    const cnt = await cCom.query('SELECT COUNT(*) FROM books WHERE store_id = $1', [row.store_id]);
    console.log(`Store ID in books: ${row.store_id} -> ${cnt.rows[0].count} books`);
  }

  await cBiz.end();
  await cCom.end();
}

inspectStores().catch(console.error);

