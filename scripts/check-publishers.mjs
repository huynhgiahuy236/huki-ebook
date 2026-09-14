import { createRequire } from 'module';
const require = createRequire('e:/HuKi/platform/apps/identity-service/node_modules/');
const pg = require('pg');
const { Pool } = pg;

async function checkPublishers() {
  const pool = new Pool({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_commerce' });
  const colRes = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'publishers'
  `);
  console.log('Columns in publishers:', colRes.rows.map(r => r.column_name));
  const pubs = await pool.query('SELECT * FROM publishers');
  console.log('Existing publishers in huki_commerce:', pubs.rows);
  await pool.end();
}

checkPublishers();
