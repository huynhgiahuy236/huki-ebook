import { createRequire } from 'module';
const require = createRequire('e:/HuKi/platform/apps/identity-service/node_modules/');
const pg = require('pg');
const { Pool } = pg;

async function inspectBooks() {
  const pool = new Pool({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_commerce' });
  const colRes = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'books'
  `);
  console.log('Columns in books table:', colRes.rows.map(r => r.column_name));

  const booksRes = await pool.query('SELECT * FROM books ORDER BY created_at DESC');
  console.log(`\n📚 TỔNG SỐ SÁCH TRONG DATABASE: ${booksRes.rows.length} cuốn`);
  for (const b of booksRes.rows) {
    console.log(`- [${b.status} | ${b.format}] "${b.title}" | Giá: ${Number(b.price || 0).toLocaleString('vi-VN')}đ | ID: ${b.id}`);
  }

  await pool.end();
}

inspectBooks();
