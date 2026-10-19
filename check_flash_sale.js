const { Client } = require('pg');

async function run() {
  const client = new Client({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_promotion' });
  await client.connect();
  const sales = await client.query('SELECT id, name, scope, status, "startsAt", "endsAt", "registrationStartsAt", "registrationEndsAt" FROM "FlashSale"');
  console.log('FlashSales:', JSON.stringify(sales.rows, null, 2));
  const items = await client.query('SELECT id, "flashSaleId", "bookId", "originalPrice", "salePrice", stock, sold FROM "FlashSaleItem"');
  console.log('FlashSaleItems count:', items.rows.length);
  await client.end();
}

run().catch(console.error);
