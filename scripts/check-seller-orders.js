/**
 * HUKI EBOOK - Script kiểm tra tài khoản, doanh nghiệp, sách và đơn hàng seller trong DB
 * Chạy: node scripts/check-seller-orders.js
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
  const busClient = new Client({
    connectionString: process.env.BUSINESS_DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/huki_business',
  });
  const idClient = new Client({
    connectionString: process.env.IDENTITY_DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/huki_identity',
  });

  await commClient.connect();
  await busClient.connect();
  await idClient.connect();

  console.log('\n--- 👥 USERS (huki_identity) ---');
  const users = await idClient.query('SELECT id, email, role, status FROM users;');
  console.table(users.rows);

  console.log('\n--- 🏢 BUSINESSES (huki_business) ---');
  const businesses = await busClient.query('SELECT * FROM businesses;');
  console.table(businesses.rows);

  console.log('\n--- 📚 BOOKS (huki_commerce) ---');
  const books = await commClient.query('SELECT id, title, owner_user_id, store_id FROM books;');
  console.table(books.rows);

  console.log('\n--- 📦 SELLER ORDERS (huki_commerce) ---');
  const sellerOrders = await commClient.query('SELECT id, code, owner_user_id, status, grand_total, created_at FROM seller_orders ORDER BY created_at DESC;');
  console.table(sellerOrders.rows);

  console.log('\n--- 🛒 BUYER ORDERS (huki_commerce) ---');
  const orders = await commClient.query('SELECT id, code, user_id, status, payment_method, grand_total, created_at FROM orders ORDER BY created_at DESC;');
  console.table(orders.rows);

  await commClient.end();
  await busClient.end();
  await idClient.end();
}

main().catch((err) => {
  console.error('❌ Lỗi khi kiểm tra dữ liệu:', err);
  process.exit(1);
});
