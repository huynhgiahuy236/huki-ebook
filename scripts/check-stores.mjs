import { createRequire } from 'module';
const require = createRequire('e:/HuKi/platform/apps/identity-service/node_modules/');
const pg = require('pg');
const { Pool } = pg;

async function checkStores() {
  const poolBiz = new Pool({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_business' });
  const stores = await poolBiz.query('SELECT id, name, business_id FROM stores');
  console.log('Stores in huki_business:', stores.rows);
  await poolBiz.end();
}

checkStores();
