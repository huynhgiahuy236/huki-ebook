const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.COMMERCE_DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/huki_commerce'
});

async function main() {
  try {
    await client.connect();

    // Query books directly
    const booksRes = await client.query(`
      SELECT 
        b.id, 
        b.title, 
        b.slug,
        b.price, 
        b.format, 
        b.status, 
        b.isbn,
        b.cover_url, 
        b.store_id,
        b.owner_user_id,
        b.created_at,
        a.name as author_name,
        c.name as category_name,
        p.name as publisher_name
      FROM books b
      LEFT JOIN authors a ON b.author_id = a.id
      LEFT JOIN categories c ON b.category_id = c.id
      LEFT JOIN publishers p ON b.publisher_id = p.id
      ORDER BY b.created_at DESC
    `);

    const books = booksRes.rows;

    console.log(`\n========================================================================================`);
    console.log(`📊 TỔNG CỘNG: ${books.length} ĐẦU SÁCH TRONG DATABASE LOCAL (huki_commerce)`);
    console.log(`========================================================================================\n`);

    if (books.length === 0) {
      console.log('Hiện tại database local chưa có sách nào.');
    } else {
      console.table(books.map(b => ({
        ID: b.id.slice(0, 8) + '...',
        'Tên Sách': b.title.length > 30 ? b.title.slice(0, 27) + '...' : b.title,
        'Tác Giả': b.author_name || 'N/A',
        'Danh Mục': b.category_name || 'N/A',
        'NXB': b.publisher_name || 'N/A',
        'Giá': Number(b.price).toLocaleString('vi-VN') + ' đ',
        'Định Dạng': b.format,
        'Trạng Thái': b.status
      })));

      console.log('\n--- CHI TIẾT TỪNG ĐẦU SÁCH ---');
      books.forEach((b, i) => {
        console.log(`\n[${i + 1}] ID: ${b.id}`);
        console.log(`    📖 Tiêu đề: ${b.title}`);
        console.log(`    🔗 Slug: ${b.slug}`);
        console.log(`    ✍️ Tác giả: ${b.author_name || 'Chưa cập nhật'}`);
        console.log(`    🏷️ Danh mục: ${b.category_name || 'Chưa phân loại'}`);
        console.log(`    🏢 Nhà xuất bản: ${b.publisher_name || 'Chưa cập nhật'}`);
        console.log(`    💰 Giá: ${Number(b.price).toLocaleString('vi-VN')} đ`);
        console.log(`    📦 Định dạng: ${b.format}`);
        console.log(`    🟢 Trạng thái: ${b.status}`);
        console.log(`    🖼️ Ảnh bìa: ${b.cover_url}`);
        console.log(`    🏪 Store ID: ${b.store_id || 'N/A'}`);
        console.log(`    👤 Owner ID: ${b.owner_user_id || 'N/A'}`);
        console.log(`    🕒 Ngày tạo: ${b.created_at}`);
      });
    }
  } catch (err) {
    console.error('Lỗi khi truy vấn:', err.message);
  } finally {
    await client.end();
  }
}

main();
