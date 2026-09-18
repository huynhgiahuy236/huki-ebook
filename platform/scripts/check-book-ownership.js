const { Client } = require('pg');

async function main() {
  const identityClient = new Client({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_identity' });
  const businessClient = new Client({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_business' });
  const commerceClient = new Client({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_commerce' });

  try {
    await identityClient.connect();
    await businessClient.connect();
    await commerceClient.connect();

    // 1. Get active users in identity
    const usersRes = await identityClient.query(`
      SELECT id, email, role, status FROM users
    `);
    const activeUsers = usersRes.rows;
    console.log('=== TÀI KHOẢN TRONG IDENTITY DATABASE ===');
    console.table(activeUsers);

    // 2. Get stores in business database
    const storesRes = await businessClient.query(`
      SELECT id, name, slug, owner_user_id, status FROM stores
    `).catch(() => businessClient.query(`SELECT id, name, slug, status FROM stores`)).catch(() => ({ rows: [] }));
    console.log('\n=== CỬA HÀNG TRONG BUSINESS DATABASE ===');
    console.table(storesRes.rows);

    // 3. Get books with owner_user_id and store_id in commerce
    const booksRes = await commerceClient.query(`
      SELECT id, title, slug, owner_user_id, store_id, status FROM books ORDER BY created_at DESC
    `);
    console.log('\n=== SÁCH TRONG COMMERCE DATABASE VÀ CHỦ SỞ HỮU ===');
    
    const booksWithUser = booksRes.rows.map(b => {
      const matchedUser = activeUsers.find(u => u.id === b.owner_user_id);
      return {
        bookId: b.id.slice(0, 8) + '...',
        title: b.title.length > 25 ? b.title.slice(0, 22) + '...' : b.title,
        ownerUserId: b.owner_user_id ? b.owner_user_id.slice(0, 8) + '...' : 'NULL',
        ownerEmail: matchedUser ? matchedUser.email : '⚠️ KHÔNG TỒN TẠI (Tài khoản đã xóa)',
        storeId: b.store_id ? b.store_id.slice(0, 8) + '...' : 'NULL',
        status: b.status
      };
    });
    console.table(booksWithUser);

    // Summary counts
    const phuongThuyUser = activeUsers.find(u => u.email === 'phuongthuy@gmail.com');
    const phuongThuyBooks = booksRes.rows.filter(b => phuongThuyUser && b.owner_user_id === phuongThuyUser.id);
    const orphanBooks = booksRes.rows.filter(b => !activeUsers.some(u => u.id === b.owner_user_id));

    console.log('\n=== TỔNG KẾT LIÊN KẾT ===');
    console.log(`- Tài khoản seller đang dùng (phuongthuy@gmail.com - ID: ${phuongThuyUser?.id}): ${phuongThuyBooks.length} cuốn`);
    console.log(`- Sách thuộc tài khoản cũ đã bị xóa (Orphan): ${orphanBooks.length} cuốn`);

  } catch (err) {
    console.error('Lỗi kiểm tra:', err);
  } finally {
    await identityClient.end().catch(() => {});
    await businessClient.end().catch(() => {});
    await commerceClient.end().catch(() => {});
  }
}

main();
