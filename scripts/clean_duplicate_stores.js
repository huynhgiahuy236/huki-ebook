const { Client } = require('../platform/node_modules/pg');

async function cleanDuplicateStores() {
  const cBiz = new Client({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_business' });
  const cCom = new Client({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_commerce' });
  await cBiz.connect();
  await cCom.connect();

  console.log('--- CLEANING DUPLICATE GHOST STORES IN HUKI_BUSINESS ---');

  // 1. Nhã Nam:
  // Official store: 'store-002-nhanam-books' (has 96 books)
  // Ghost stores: '840daf2f-0f39-4a11-8bf3-f0cd2f64d9f1', 'fc403d03-51f5-4d64-9958-c3dcbbb3a6bf'
  // Let's delete the ghost stores or deactivate them
  const ghostStores = [
    '840daf2f-0f39-4a11-8bf3-f0cd2f64d9f1',
    'fc403d03-51f5-4d64-9958-c3dcbbb3a6bf',
    'fe9c7279-90ca-42fe-b5ce-f8278a29d4e6', // Duplicate Kim Dong
    '20c71cc4-2f5e-4503-bfb3-532d107ed2ae', // Empty test corp
    'd9910ad0-7a9e-4a73-89af-e49b8d1cfaee',
    'b747d736-59c0-4775-8426-57efc80f0794',
    '54aa74a0-4757-45c7-91fc-1d50c516276b',
    'b2067087-924d-4c3c-b049-9b26895aa461',
    '7acb5c99-2d63-479c-8143-70b99c71c542',
    '7caf501d-57f3-4424-99ab-614ba1ad23b3',
    'ea21aa75-eac7-4168-a985-c13b78247bb2'
  ];

  for (const id of ghostStores) {
    try {
      await cBiz.query('DELETE FROM stores WHERE id = $1', [id]);
      console.log(`Deleted ghost store: ${id}`);
    } catch (err) {
      console.warn(`Could not delete store ${id}, marking inactive:`, err.message);
      await cBiz.query('UPDATE stores SET is_active = false, deleted_at = NOW() WHERE id = $1', [id]);
    }
  }

  // 2. Ensure Official Nhã Nam store has the logo and slug 'nha-nam-books' or 'nha-nam-books-official'
  await cBiz.query(`
    UPDATE stores 
    SET logo = 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80',
        banner = 'https://images.unsplash.com/photo-1507842229451-7f01be837a27?auto=format&fit=crop&w=1200&q=80',
        total_products = 96,
        is_active = true
    WHERE id = 'store-002-nhanam-books'
  `);

  // 3. Ensure Alpha Books has accurate count
  await cBiz.query(`
    UPDATE stores 
    SET total_products = 20,
        is_active = true
    WHERE id = '51c48059-37be-46a2-b4a6-04a8365f8cbd'
  `);

  // 4. Ensure Tri Tue Viet has accurate count
  await cBiz.query(`
    UPDATE stores 
    SET total_products = 95,
        logo = 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=400&q=80',
        banner = 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1200&q=80',
        is_active = true
    WHERE id = '3094e54e-2549-42cc-92fb-14a8f8589277'
  `);

  console.log('✅ Stores deduplication and synchronization complete!');

  const remaining = await cBiz.query('SELECT id, name, slug, total_products, is_active FROM stores WHERE is_active = true');
  console.log('\n--- ACTIVE STORES IN DB ---');
  console.log(remaining.rows);

  await cBiz.end();
  await cCom.end();
}

cleanDuplicateStores().catch(console.error);

