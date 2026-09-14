import { createRequire } from 'module';
const require = createRequire('e:/HuKi/platform/apps/identity-service/node_modules/');
const pg = require('pg');
const { Pool } = pg;

async function checkCatalogTables() {
  const pool = new Pool({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_commerce' });
  const tables = ['digital_book_details', 'categories', 'authors'];
  for (const t of tables) {
    const colRes = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = '${t}'
    `);
    console.log(`Columns in ${t}:`, colRes.rows.map(r => r.column_name));
    const cnt = await pool.query(`SELECT count(*) FROM "${t}"`);
    console.log(`Count in ${t}:`, cnt.rows[0].count);
  }
  await pool.end();
}

checkCatalogTables();
