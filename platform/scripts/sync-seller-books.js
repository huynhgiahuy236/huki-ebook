const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.COMMERCE_DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/huki_commerce'
  });

  const businessClient = new Client({
    connectionString: process.env.BUSINESS_DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/huki_business'
  });

  try {
    await client.connect();
    await businessClient.connect();

    const PHUONG_THUY_USER_ID = '8d501a4d-d846-45bd-8f15-fda4e30cf826';
    const STORE_ID = '3094e54e-2549-42cc-92fb-14a8f8589277';

    console.log('1. Xóa sách nháp test...');
    await client.query(`DELETE FROM physical_book_details WHERE book_id = '929947e2-9be6-4bab-a8c5-76b70ae181f0'`);
    await client.query(`DELETE FROM digital_book_details WHERE book_id = '929947e2-9be6-4bab-a8c5-76b70ae181f0'`);
    await client.query(`DELETE FROM books WHERE id = '929947e2-9be6-4bab-a8c5-76b70ae181f0'`);
    console.log(' -> Đã xóa cuốn nháp test thành công.');

    console.log('\n2. Chuyển quyền sở hữu 7 cuốn sách chính sang tài khoản Phương Thủy...');
    const updateRes = await client.query(`
      UPDATE books
      SET 
        owner_user_id = $1,
        store_id = $2
      WHERE id IN (
        'b0000001-0000-4000-8000-000000000001',
        'b0000002-0000-4000-8000-000000000002',
        'b0000003-0000-4000-8000-000000000003',
        'b0000004-0000-4000-8000-000000000004',
        'b0000005-0000-4000-8000-000000000005',
        'b0000006-0000-4000-8000-000000000006',
        'b0000007-0000-4000-8000-000000000007'
      )
    `, [PHUONG_THUY_USER_ID, STORE_ID]);
    console.log(` -> Đã cập nhật ${updateRes.rowCount} cuốn sách.`);

    // Cập nhật lại total_products trong bảng stores của huki_business
    await businessClient.query(`
      UPDATE stores
      SET total_products = 7
      WHERE id = $1
    `, [STORE_ID]);
    console.log(' -> Đã đồng bộ total_products = 7 trong bảng stores (huki_business).');

    // Kiểm tra lại danh sách sách của seller
    const checkRes = await client.query(`
      SELECT id, title, slug, price, format, status, owner_user_id, store_id
      FROM books
      WHERE owner_user_id = $1 OR store_id = $2
      ORDER BY created_at ASC
    `, [PHUONG_THUY_USER_ID, STORE_ID]);

    console.log(`\n========================================================================`);
    console.log(`🎉 HOÀN TẤT! DANH SÁCH SÁCH CỦA SELLER PHƯƠNG THỦY (${checkRes.rows.length} CUỐN)`);
    console.log(`========================================================================\n`);
    console.table(checkRes.rows.map((b, i) => ({
      STT: i + 1,
      ID: b.id.slice(0, 8) + '...',
      'Tên Sách': b.title.length > 30 ? b.title.slice(0, 28) + '...' : b.title,
      'Giá': Number(b.price).toLocaleString('vi-VN') + ' đ',
      'Định Dạng': b.format,
      'Trạng Thái': b.status,
      'Owner User ID': b.owner_user_id.slice(0, 8) + '...',
      'Store ID': b.store_id.slice(0, 8) + '...'
    })));

  } catch (err) {
    console.error('Lỗi khi thực hiện:', err);
  } finally {
    await client.end().catch(() => {});
    await businessClient.end().catch(() => {});
  }
}

main();
