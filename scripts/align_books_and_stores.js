// okconst { Client } = require('pg');

// async function main() {
//   const commClient = new Client({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_commerce' });
//   const bizClient = new Client({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_business' });

//   await commClient.connect();
//   await bizClient.connect();

//   console.log('--- 1. Updating store_id for Kim Dong books ---');
//   const kdRes = await commClient.query(
//     `UPDATE books 
//      SET store_id = '501ece69-23b9-4126-9b5e-e3dc206d0c20' 
//      WHERE publisher_id = 'p0000002-0000-4000-8000-000000000002'`
//   );
//   console.log(`Updated ${kdRes.rowCount} Kim Dong books to store_id 501ece69-23b9-4126-9b5e-e3dc206d0c20`);

//   console.log('--- 2. Updating store_id for NXB Tre books ---');
//   const treRes = await commClient.query(
//     `UPDATE books 
//      SET store_id = 'da24d45d-b458-4859-8367-a6c862d4d3a4' 
//      WHERE publisher_id = '0df2754d-576f-4e83-811d-fd4d4ed25eba'`
//   );
//   console.log(`Updated ${treRes.rowCount} NXB Tre books to store_id da24d45d-b458-4859-8367-a6c862d4d3a4`);

//   console.log('--- 3. Syncing total_products in huki_business.stores ---');
//   const stores = await bizClient.query('SELECT id, name FROM stores WHERE deleted_at IS NULL');

//   for (const store of stores.rows) {
//     const countRes = await commClient.query('SELECT count(*) FROM books WHERE store_id = $1', [store.id]);
//     const actualCount = parseInt(countRes.rows[0].count, 10);
//     await bizClient.query('UPDATE stores SET total_products = $1 WHERE id = $2', [actualCount, store.id]);
//     console.log(`Store ${store.name} (${store.id}): total_products set to ${actualCount}`);
//   }

//   await commClient.end();
//   await bizClient.end();
//   console.log('Alignment completed successfully!');
// }

// main().catch(err => {
//   console.error(err);
//   process.exitCode = 1;
// });

