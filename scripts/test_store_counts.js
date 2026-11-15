const { Client } = require('pg');

async function main() {
  const c1 = new Client({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_business' });
  await c1.connect();
  const stores = await c1.query('SELECT id, name, slug, total_products, business_id FROM stores WHERE deleted_at IS NULL');
  
  const c2 = new Client({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_commerce' });
  await c2.connect();
  
  for (const s of stores.rows) {
    const bCount = await c2.query('SELECT count(*) FROM books WHERE store_id = $1', [s.id]);
    console.log(s.id, '|', s.name, '| total_products column:', s.total_products, '| books in commerce:', bCount.rows[0].count);
  }
  
  await c1.end();
  await c2.end();
}

main().catch(console.error);

