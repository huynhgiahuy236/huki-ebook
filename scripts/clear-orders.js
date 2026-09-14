/**
 * HUKI EBOOK - Script xóa sạch toàn bộ đơn hàng thử nghiệm
 * Chạy: node scripts/clear-orders.js
 */
let pg;
try {
  pg = require('pg');
} catch {
  pg = require('../platform/node_modules/pg');
}
const { Client } = pg;

async function main() {
  const commClient = new Client({
    connectionString: process.env.COMMERCE_DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/huki_commerce',
  });
  const shipClient = new Client({
    connectionString: process.env.SHIPPING_DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/huki_shipping',
  });

  await commClient.connect();
  await shipClient.connect();

  console.log('🔄 Đang xóa dữ liệu đơn hàng trong database huki_commerce...');
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
    UPDATE physical_book_details SET reserved = 0, stock = 100;
  `);

  console.log('🔄 Đang xóa dữ liệu giao hàng trong database huki_shipping...');
  try {
    await shipClient.query('TRUNCATE TABLE shipments CASCADE;');
  } catch (e) {
    console.log('ℹ️ Shipments note:', e.message);
  }

  const orderCount = await commClient.query('SELECT COUNT(*) FROM orders;');
  const sellerOrderCount = await commClient.query('SELECT COUNT(*) FROM seller_orders;');
  console.log(`✅ Đơn hàng người mua (orders) còn lại: ${orderCount.rows[0].count}`);
  console.log(`✅ Đơn hàng người bán (seller_orders) còn lại: ${sellerOrderCount.rows[0].count}`);

  await commClient.end();
  await shipClient.end();
  console.log('🎉 Đã dọn dẹp sạch toàn bộ đơn hàng thành công!');
}

main().catch((err) => {
  console.error('❌ Lỗi khi dọn dẹp đơn hàng:', err);
  process.exit(1);
});
