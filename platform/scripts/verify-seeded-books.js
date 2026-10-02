const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_commerce' });
  await client.connect();

  const countRes = await client.query(`
    SELECT c.name as category, count(b.id) as total_books
    FROM categories c 
    JOIN books b ON b.category_id = c.id 
    WHERE b.status = 'PUBLISHED' 
    GROUP BY c.name 
    ORDER BY total_books DESC
  `);
  console.log('=== SỐ LƯỢNG SÁCH THEO THỂ LOẠI ===');
  console.table(countRes.rows);

  const sampleRes = await client.query(`
    SELECT b.title, c.name as category, b.price, b.format, b.cover_url
    FROM books b
    JOIN categories c ON b.category_id = c.id
    WHERE b.status = 'PUBLISHED'
    ORDER BY c.name, b.title
    LIMIT 15
  `);
  console.log('\n=== MẪU 15 CUỐN SÁCH ĐÃ TẠO ===');
  console.table(sampleRes.rows);

  await client.end();
}

main();
