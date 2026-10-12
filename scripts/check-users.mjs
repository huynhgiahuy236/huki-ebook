import { createRequire } from 'module';
const require = createRequire('e:/HuKi/platform/apps/identity-service/node_modules/');
const pg = require('pg');
const { Pool } = pg;

async function checkUsers() {
  const pool = new Pool({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_identity' });
  const users = await pool.query("SELECT password_hash FROM users WHERE email = 'adminhuki@gmail.com'");
  console.log('Admin Hash:', users.rows[0]?.password_hash);
  await pool.end();
}

checkUsers();
