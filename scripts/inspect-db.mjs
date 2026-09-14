import { createRequire } from 'module';
const require = createRequire('e:/HuKi/platform/apps/identity-service/node_modules/');
const pg = require('pg');
const { Pool } = pg;

async function inspectDetailed() {
  console.log('================================================================');
  console.log('📊 THỐNG KÊ CHI TIẾT CƠ SỞ DỮ LIỆU LOCAL (POSTGRESQL)');
  console.log('================================================================\n');

  // 1. IDENTITY DB
  try {
    const pool = new Pool({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_identity' });
    const userCount = await pool.query('SELECT count(*) FROM users');
    const roleStats = await pool.query('SELECT role, count(*) as count FROM users GROUP BY role');
    const recentUsers = await pool.query('SELECT id, email, full_name, role, created_at FROM users ORDER BY created_at DESC LIMIT 10');
    
    console.log('👤 [1. CSDL huki_identity]');
    console.log(`  • Tổng số tài khoản (users): ${userCount.rows[0].count} tài khoản`);
    console.log('  • Phân loại theo vai trò (Role):');
    for (const r of roleStats.rows) {
      console.log(`     - ${r.role || 'USER'}: ${r.count} tài khoản`);
    }
    console.log('  • 10 tài khoản đăng ký mới nhất:');
    for (const u of recentUsers.rows) {
      console.log(`     - [${u.role}] ${u.email} (${u.full_name || 'Không tên'}) - ${new Date(u.created_at).toLocaleString('vi-VN')}`);
    }
    await pool.end();
  } catch (err) {
    console.log('Lỗi huki_identity:', err.message);
  }

  // 2. BUSINESS DB
  try {
    const pool = new Pool({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_business' });
    const bizCount = await pool.query('SELECT count(*) FROM businesses');
    const bizStatus = await pool.query('SELECT status, count(*) as count FROM businesses GROUP BY status');
    const recentBiz = await pool.query('SELECT id, name, tax_code, status, created_at FROM businesses ORDER BY created_at DESC LIMIT 10');
    
    let storeCount = { rows: [{ count: 0 }] };
    try {
      storeCount = await pool.query('SELECT count(*) FROM stores');
    } catch {}

    console.log('\n🏢 [2. CSDL huki_business]');
    console.log(`  • Tổng số Doanh nghiệp (businesses): ${bizCount.rows[0].count} doanh nghiệp`);
    console.log(`  • Tổng số Cửa hàng (stores): ${storeCount.rows[0].count} cửa hàng`);
    console.log('  • Phân loại trạng thái Doanh nghiệp:');
    for (const s of bizStatus.rows) {
      console.log(`     - ${s.status}: ${s.count} doanh nghiệp`);
    }
    console.log('  • 10 Doanh nghiệp gần nhất:');
    for (const b of recentBiz.rows) {
      console.log(`     - [${b.status}] ${b.name} (MST: ${b.tax_code || 'N/A'}) - ${new Date(b.created_at).toLocaleString('vi-VN')}`);
    }
    await pool.end();
  } catch (err) {
    console.log('Lỗi huki_business:', err.message);
  }

  // 3. COMMERCE DB
  try {
    const pool = new Pool({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_commerce' });
    const bookCount = await pool.query('SELECT count(*) FROM books');
    const orderCount = await pool.query('SELECT count(*) FROM orders');
    const cartCount = await pool.query('SELECT count(*) FROM carts');
    const digitalCount = await pool.query('SELECT count(*) FROM digital_book_details');
    
    const orderStatus = await pool.query('SELECT status, count(*) as count FROM orders GROUP BY status');
    const recentBooks = await pool.query('SELECT id, title, price, status, format, created_at FROM books ORDER BY created_at DESC LIMIT 5');

    console.log('\n🛒 [3. CSDL huki_commerce]');
    console.log(`  • Tổng số Sách (books): ${bookCount.rows[0].count} cuốn (trong đó ${digitalCount.rows[0].count} chi tiết sách điện tử)`);
    console.log(`  • Tổng số Đơn hàng (orders): ${orderCount.rows[0].count} đơn`);
    console.log(`  • Tổng số Giỏ hàng (carts): ${cartCount.rows[0].count} giỏ`);
    console.log('  • Phân loại trạng thái Đơn hàng:');
    for (const o of orderStatus.rows) {
      console.log(`     - ${o.status}: ${o.count} đơn`);
    }
    console.log('  • 5 Sách mới nhất:');
    for (const bk of recentBooks.rows) {
      console.log(`     - [${bk.status} | ${bk.format}] "${bk.title}" - Giá: ${Number(bk.price || 0).toLocaleString('vi-VN')} đ`);
    }
    await pool.end();
  } catch (err) {
    console.log('Lỗi huki_commerce:', err.message);
  }

  // 4. SHIPPING DB
  try {
    const pool = new Pool({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_shipping' });
    const shipCount = await pool.query('SELECT count(*) FROM shipments');
    const logCount = await pool.query('SELECT count(*) FROM delivery_logs');
    console.log('\n🚚 [4. CSDL huki_shipping]');
    console.log(`  • Tổng số Vận đơn (shipments): ${shipCount.rows[0].count} vận đơn`);
    console.log(`  • Tổng số Nhật ký giao hàng (delivery_logs): ${logCount.rows[0].count} bản ghi`);
    await pool.end();
  } catch (err) {
    console.log('Lỗi huki_shipping:', err.message);
  }

  console.log('\n================================================================');
  console.log('✅ Hoàn tất thống kê chi tiết CSDL!');
}

inspectDetailed();
