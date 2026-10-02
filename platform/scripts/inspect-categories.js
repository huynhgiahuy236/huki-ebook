const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_commerce' });
  await client.connect();
  const res = await client.query('SELECT id, name, slug, parent_id FROM categories ORDER BY sort_order, name');
  console.table(res.rows);
  await client.end();
}

main();
