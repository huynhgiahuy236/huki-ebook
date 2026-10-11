const { Client } = require('pg');

async function main() {
  const commClient = new Client({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_commerce' });
  const shipClient = new Client({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_shipping' });

  await commClient.connect();
  await shipClient.connect();

  console.log('Truncating order tables in huki_commerce...');
  await commClient.query(`
    TRUNCATE TABLE 
      inventory_reservations, 
      order_status_history, 
      order_items, 
      seller_orders, 
      orders, 
      payments, 
      refunds, 
      checkout_sessions 
    CASCADE;
  `);

  console.log('Truncating shipments in huki_shipping...');
  try {
    await shipClient.query('TRUNCATE TABLE shipments CASCADE;');
  } catch (e) {
    console.log('Shipments note:', e.message);
  }

  const orderCount = await commClient.query('SELECT COUNT(*) FROM orders;');
  const sellerOrderCount = await commClient.query('SELECT COUNT(*) FROM seller_orders;');
  console.log('Orders remaining in Commerce:', orderCount.rows[0].count);
  console.log('Seller Orders remaining in Commerce:', sellerOrderCount.rows[0].count);

  await commClient.end();
  await shipClient.end();
  console.log('Order cleanup completed successfully!');
}

main().catch(console.error);
