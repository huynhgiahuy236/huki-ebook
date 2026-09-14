import { createRequire } from 'module';
const require = createRequire('e:/HuKi/platform/apps/identity-service/node_modules/');
const pg = require('pg');
const { Pool } = pg;

async function cleanDatabase() {
  console.log('================================================================');
  console.log('🧹 TIẾN HÀNH DỌN DẸP CSDL LOCAL (CLEANUP & SEED)');
  console.log('================================================================\n');

  // 1. DỌN DẸP HUKI_SHIPPING
  try {
    const pool = new Pool({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_shipping' });
    await pool.query('DELETE FROM delivery_logs');
    await pool.query('DELETE FROM shipments');
    await pool.query('DELETE FROM inbox_events');
    await pool.query('DELETE FROM outbox_events');
    console.log('✅ [huki_shipping]: Đã dọn dẹp sạch sẽ vận đơn và log giao hàng.');
    await pool.end();
  } catch (err) {
    console.log('⚠️ [huki_shipping]:', err.message);
  }

  // 2. DỌN DẸP HUKI_COMMERCE
  try {
    const pool = new Pool({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_commerce' });
    await pool.query('DELETE FROM cart_items');
    await pool.query('DELETE FROM carts');
    await pool.query('DELETE FROM inventory_reservations');
    await pool.query('DELETE FROM inventory_logs');
    await pool.query('DELETE FROM order_status_history');
    await pool.query('DELETE FROM order_items');
    await pool.query('DELETE FROM orders');
    await pool.query('DELETE FROM checkout_sessions');
    await pool.query('DELETE FROM book_accesses');
    await pool.query('DELETE FROM inbox_events');
    console.log('✅ [huki_commerce]: Đã dọn dẹp sạch giỏ hàng rác, đơn hàng test.');
    await pool.end();
  } catch (err) {
    console.log('⚠️ [huki_commerce]:', err.message);
  }

  // 3. DỌN DẸP HUKI_BUSINESS
  try {
    const pool = new Pool({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_business' });
    await pool.query('DELETE FROM business_followers');
    
    // Xóa các doanh nghiệp test rác
    const delBizRes = await pool.query(`
      DELETE FROM businesses 
      WHERE name IN ('Inv Biz', 'Order Biz', 'Cat Biz', 'Approve Test', 'Test')
         OR tax_code LIKE 'TAX1789%'
         OR tax_code LIKE 'TAX%'
         OR name LIKE '%Test%'
         OR name LIKE '%Biz%'
    `);
    console.log(`✅ [huki_business]: Đã xóa ${delBizRes.rowCount} doanh nghiệp test rác.`);

    // Đảm bảo có các Doanh nghiệp mẫu chuẩn, đẹp cho sàn
    const existingStd = await pool.query("SELECT tax_code FROM businesses WHERE tax_code IN ('0318926410', '0101234567', '0302482782', '0301452937')");
    const existingTaxCodes = existingStd.rows.map(r => r.tax_code);

    const standardPublishers = [
      {
        id: 'biz_tritueviet_001',
        name: 'CÔNG TY TNHH PHÁT HÀNH SÁCH VÀ NỘI DUNG SỐ TRÍ TUỆ VIỆT',
        tax_code: '0318926410',
        email: 'contact@trituevietbooks.vn',
        phone: '0908123456',
        address: 'Tầng 6, Tòa nhà Văn phòng Tri Thức, 45 Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
        status: 'PENDING_APPROVAL',
        slug: 'tri-tue-viet-books',
        description: 'Đơn vị phát hành sách chuyên khảo, kinh tế số và sách khoa học công nghệ hàng đầu Việt Nam.',
      },
      {
        id: 'biz_kimdong_002',
        name: 'NHÀ XUẤT BẢN KIM ĐỒNG',
        tax_code: '0101234567',
        email: 'cskh@nxbkimdong.com.vn',
        phone: '02439434730',
        address: '55 Quang Trung, Phường Nguyễn Du, Quận Hai Bà Trưng, Hà Nội',
        status: 'APPROVED',
        slug: 'nxb-kim-dong',
        description: 'Nhà xuất bản sách thiếu nhi và văn học trẻ uy tín lâu năm.',
      },
      {
        id: 'biz_nhanam_003',
        name: 'CÔNG TY CỔ PHẦN VĂN HÓA VÀ TRUYỀN THÔNG NHÃ NAM',
        tax_code: '0302482782',
        email: 'contact@nhanam.vn',
        phone: '02435146875',
        address: '59 Đỗ Quang, Phường Trung Hòa, Quận Cầu Giấy, Hà Nội',
        status: 'APPROVED',
        slug: 'nha-nam-books',
        description: 'Đơn vị phát hành sách văn học dịch và triết học hàng đầu.',
      },
      {
        id: 'biz_fahasa_004',
        name: 'CÔNG TY CỔ PHẦN PHÁT HÀNH SÁCH TP. HCM - FAHASA',
        tax_code: '0301452937',
        email: 'support@fahasa.com',
        phone: '1900636467',
        address: '60-62 Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
        status: 'APPROVED',
        slug: 'fahasa',
        description: 'Hệ thống nhà sách và phát hành xuất bản phẩm toàn quốc.',
      },
      {
        id: 'biz_test_invalid_005',
        name: 'CÔNG TY CỔ PHẦN SÁCH TEST LỖI GIAN LẬN',
        tax_code: '9999888877',
        email: 'fake.test@example.vn',
        phone: '0999999999',
        address: 'Địa chỉ ảo không có thật',
        status: 'PENDING_APPROVAL',
        slug: 'sach-test-loi',
        description: 'Hồ sơ thử nghiệm kịch bản cố tình nhập sai MST để kiểm tra cảnh báo ĐỎ của hệ thống.',
      }
    ];

    for (const pub of standardPublishers) {
      if (!existingTaxCodes.includes(pub.tax_code)) {
        try {
          await pool.query(`
            INSERT INTO businesses (id, name, tax_code, email, phone, address, status, slug, description, owner_id, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'system_seed_owner', NOW(), NOW())
            ON CONFLICT (id) DO NOTHING
          `, [pub.id, pub.name, pub.tax_code, pub.email, pub.phone, pub.address, pub.status, pub.slug, pub.description]);
          console.log(`  + Đã thêm doanh nghiệp chuẩn: ${pub.name} [${pub.status}]`);
        } catch (e) {
          // Bỏ qua nếu đã tồn tại theo ràng buộc khác
        }
      }
    }

    await pool.end();
  } catch (err) {
    console.log('⚠️ [huki_business]:', err.message);
  }

  // 4. DỌN DẸP HUKI_IDENTITY
  try {
    const pool = new Pool({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_identity' });
    await pool.query('DELETE FROM auth_sessions');
    await pool.query('DELETE FROM refresh_tokens');

    // Xóa các user rác và tài khoản được chỉ định (huynhgiahuy236@gmail.com)
    const delUserRes = await pool.query(`
      DELETE FROM users 
      WHERE email = 'huynhgiahuy236@gmail.com'
         OR email LIKE 'user_otp_%'
         OR email LIKE 'dig_%'
         OR email LIKE 'invown_%'
         OR email LIKE 'ordowner_%'
         OR email LIKE 'bowner_%'
         OR email LIKE 'buser_%'
         OR email LIKE 'cowner_%'
         OR (role != 'PLATFORM_ADMIN' AND email LIKE '%@x.com')
         OR (role != 'PLATFORM_ADMIN' AND email LIKE '%@huki-test.vn')
    `);
    console.log(`✅ [huki_identity]: Đã xóa ${delUserRes.rowCount} tài khoản test và email huynhgiahuy236@gmail.com.`);

    const remainingUsers = await pool.query('SELECT email, role FROM users');
    console.log(`  • Danh sách tài khoản còn lại (${remainingUsers.rows.length} tài khoản):`);
    for (const u of remainingUsers.rows) {
      console.log(`     - [${u.role}] ${u.email}`);
    }

    await pool.end();
  } catch (err) {
    console.log('⚠️ [huki_identity]:', err.message);
  }

  console.log('\n================================================================');
  console.log('🎉 ĐÃ DỌN DẸP VÀ CHUẨN HÓA CƠ SỞ DỮ LIỆU THÀNH CÔNG!');
  console.log('================================================================');
}

cleanDatabase();
