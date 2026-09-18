const { Client } = require('pg');

async function main() {
  const businessClient = new Client({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_business' });
  try {
    await businessClient.connect();
    
    // Check tables in huki_business
    const tables = await businessClient.query(`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
    `);
    console.log('Tables in huki_business:', tables.rows.map(r => r.table_name));

    // Check stores and members
    const stores = await businessClient.query(`SELECT * FROM stores`);
    console.log('\nStores:', stores.rows);

    const members = await businessClient.query(`SELECT * FROM store_members`).catch(() => ({ rows: [] }));
    console.log('\nStore Members:', members.rows);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await businessClient.end();
  }
}

main();
