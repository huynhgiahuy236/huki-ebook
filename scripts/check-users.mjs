import { createRequire } from 'module';
const require = createRequire('e:/HuKi/platform/apps/identity-service/node_modules/');
const pg = require('pg');
const { Pool } = pg;

async function checkUsers() {
  const pool = new Pool({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_identity' });
  const users = await pool.query('SELECT id, email, role FROM users LIMIT 5');
  console.log('Sample Users:', users.rows);
  await pool.end();
}

checkUsers();
