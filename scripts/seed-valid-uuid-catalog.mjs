import { createRequire } from 'module';
import { randomUUID } from 'crypto';
const require = createRequire('e:/HuKi/platform/apps/identity-service/node_modules/');
const pg = require('pg');
const { Pool } = pg;

async function seedValidUuidCatalog() {
  console.log('================================================================');
  console.log('🔧 CẬP NHẬT CSDL SÁCH VỚI CHUẨN UUID HỢP LỆ (100% VALID UUID)');
  console.log('================================================================\n');

  const poolIdent = new Pool({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_identity' });
  const userRes = await poolIdent.query("SELECT id FROM users WHERE email IN ('adminhuki@gmail.com', 'huy@gmail.com') LIMIT 1");
  const ownerUserId = userRes.rows[0]?.id || '0c2009aa-7c18-4f54-919f-ac709881db60';
  await poolIdent.end();

  const pool = new Pool({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_commerce' });

  // 1. Xóa toàn bộ dữ liệu sách, thể loại, tác giả cũ có ID không phải UUID
  await pool.query('DELETE FROM digital_book_details');
  await pool.query('DELETE FROM books');
  await pool.query('DELETE FROM categories');
  await pool.query('DELETE FROM authors');
  await pool.query('DELETE FROM publishers');
  console.log('✅ Đã dọn dẹp các bảng danh mục cũ.');

  // 2. Tạo Categories với UUID chuẩn
  const categoryMap = {
    kinhte: { id: 'c0000001-0000-4000-8000-000000000001', name: 'Kinh Tế - Kinh Doanh', slug: 'kinh-te-kinh-doanh', desc: 'Sách quản trị, khởi nghiệp, tài chính đầu tư' },
    kynang: { id: 'c0000002-0000-4000-8000-000000000002', name: 'Phát Triển Bản Thân', slug: 'phat-trien-ban-than', desc: 'Rèn luyện tư duy, kỹ năng sống và thói quen tích cực' },
    vanhoc: { id: 'c0000003-0000-4000-8000-000000000003', name: 'Văn Học - Tiểu Thuyết', slug: 'van-hoc-tieu-thuyet', desc: 'Tiểu thuyết kinh điển, văn học dịch và tác phẩm đoạt giải' },
    congnghe: { id: 'c0000004-0000-4000-8000-000000000004', name: 'Công Nghệ & Khoa Học', slug: 'cong-nghe-khoa-hoc', desc: 'Lập trình, AI, chuyển đổi số và khoa học tương lai' },
    lichsu: { id: 'c0000005-0000-4000-8000-000000000005', name: 'Lịch Sử - Triết Học', slug: 'lich-su-triet-hoc', desc: 'Nghiên cứu lịch sử nhân loại, triết lý sống và văn hóa' },
    thieunhi: { id: 'c0000006-0000-4000-8000-000000000006', name: 'Sách Thiếu Nhi', slug: 'sach-thieu-nhi', desc: 'Truyện tranh, cổ tích và sách giáo dục kỹ năng cho trẻ' },
  };

  for (const c of Object.values(categoryMap)) {
    await pool.query(`
      INSERT INTO categories (id, name, normalized_name, slug, description, is_active, sort_order, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, true, 1, NOW(), NOW())
    `, [c.id, c.name, c.name.toUpperCase(), c.slug, c.desc]);
  }
  console.log(`✅ Đã tạo 6 Thể loại sách với UUID chuẩn.`);

  // 3. Tạo Authors với UUID chuẩn
  const authorMap = {
    james_clear: { id: 'a0000001-0000-4000-8000-000000000001', name: 'James Clear', slug: 'james-clear', bio: 'Chuyên gia hàng đầu thế giới về thói quen.' },
    dale_carnegie: { id: 'a0000002-0000-4000-8000-000000000002', name: 'Dale Carnegie', slug: 'dale-carnegie', bio: 'Tác giả huyền thoại của Đắc Nhân Tâm.' },
    paulo_coelho: { id: 'a0000003-0000-4000-8000-000000000003', name: 'Paulo Coelho', slug: 'paulo-coelho', bio: 'Tiểu thuyết gia Nhà Giả Kim.' },
    morgan_housel: { id: 'a0000004-0000-4000-8000-000000000004', name: 'Morgan Housel', slug: 'morgan-housel', bio: 'Tác giả Tâm Lý Học Về Tiền.' },
    to_hoai: { id: 'a0000005-0000-4000-8000-000000000005', name: 'Tô Hoài', slug: 'to-hoai', bio: 'Nhà văn lớn của nền văn học Việt Nam.' },
    yuval_harari: { id: 'a0000006-0000-4000-8000-000000000006', name: 'Yuval Noah Harari', slug: 'yuval-noah-harari', bio: 'Tác giả Sapiens.' },
    nguyen_phong: { id: 'a0000007-0000-4000-8000-000000000007', name: 'Nguyên Phong', slug: 'nguyen-phong', bio: 'Dịch giả Muôn Kiếp Nhân Sinh.' },
  };

  for (const a of Object.values(authorMap)) {
    await pool.query(`
      INSERT INTO authors (id, name, normalized_name, slug, bio, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
    `, [a.id, a.name, a.name.toUpperCase(), a.slug, a.bio]);
  }
  console.log(`✅ Đã tạo 7 Tác giả với UUID chuẩn.`);

  // 4. Tạo Publishers với UUID chuẩn
  const publisherMap = {
    tritueviet: { id: 'p0000001-0000-4000-8000-000000000001', name: 'Trí Tuệ Việt Books', slug: 'tri-tue-viet-books', desc: 'Đơn vị phát hành sách chuyên khảo và nội dung số.' },
    kimdong: { id: 'p0000002-0000-4000-8000-000000000002', name: 'Nhà Xuất Bản Kim Đồng', slug: 'nxb-kim-dong', desc: 'NXB sách thiếu nhi và truyện tranh hàng đầu.' },
    nhanam: { id: 'p0000003-0000-4000-8000-000000000003', name: 'Nhã Nam Books', slug: 'nha-nam-books', desc: 'Đơn vị văn hóa truyền thông và sách văn học dịch.' },
    fahasa: { id: 'p0000004-0000-4000-8000-000000000004', name: 'Fahasa', slug: 'fahasa', desc: 'Công ty Cổ phần Phát hành Sách TP. HCM.' },
  };

  for (const p of Object.values(publisherMap)) {
    await pool.query(`
      INSERT INTO publishers (id, name, normalized_name, slug, description, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
    `, [p.id, p.name, p.name.toUpperCase(), p.slug, p.desc]);
  }
  console.log(`✅ Đã tạo 4 Nhà xuất bản với UUID chuẩn.`);

  const storeId = '3094e54e-2549-42cc-92fb-14a8f8589277';

  // 5. Tạo Sách Chuẩn với UUID
  const standardBooks = [
    {
      id: 'b0000001-0000-4000-8000-000000000001',
      title: 'Atomic Habits – Thay Đổi Tí Hon, Hiệu Quả Bất Ngờ',
      slug: 'atomic-habits-thay-doi-ti-hon-hieu-qua-bat-ngo',
      isbn: '978-604-58-9001-1',
      price: 149000,
      format: 'BOTH',
      status: 'PUBLISHED',
      category_id: categoryMap.kynang.id,
      author_id: authorMap.james_clear.id,
      publisher_id: publisherMap.tritueviet.id,
      cover_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
      description: 'Cuốn sách bán chạy số 1 New York Times về nghệ thuật hình thành thói quen tốt và loại bỏ thói quen xấu từng bước một.',
      pdf_key: 'ebooks/atomic-habits.pdf',
      epub_key: 'ebooks/atomic-habits.epub',
    },
    {
      id: 'b0000002-0000-4000-8000-000000000002',
      title: 'Đắc Nhân Tâm – How To Win Friends And Influence People',
      slug: 'dac-nhan-tam',
      isbn: '978-604-58-9002-2',
      price: 88000,
      format: 'BOTH',
      status: 'PUBLISHED',
      category_id: categoryMap.kynang.id,
      author_id: authorMap.dale_carnegie.id,
      publisher_id: publisherMap.tritueviet.id,
      cover_url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80',
      description: 'Tác phẩm bất hủ về nghệ thuật đối nhân xử thế và chinh phục lòng người hay nhất mọi thời đại.',
      pdf_key: 'ebooks/dac-nhan-tam.pdf',
      epub_key: 'ebooks/dac-nhan-tam.epub',
    },
    {
      id: 'b0000003-0000-4000-8000-000000000003',
      title: 'Nhà Giả Kim – The Alchemist',
      slug: 'nha-gia-kim',
      isbn: '978-604-58-9003-3',
      price: 79000,
      format: 'BOTH',
      status: 'PUBLISHED',
      category_id: categoryMap.vanhoc.id,
      author_id: authorMap.paulo_coelho.id,
      publisher_id: publisherMap.nhanam.id,
      cover_url: 'https://images.unsplash.com/photo-1532012164546-f432f2e3dd44?auto=format&fit=crop&w=800&q=80',
      description: 'Một trong những cuốn sách bán chạy nhất lịch sử, câu chuyện truyền cảm hứng về hành trình đi tìm kho báu và sứ mệnh cuộc đời.',
      pdf_key: 'ebooks/nha-gia-kim.pdf',
      epub_key: 'ebooks/nha-gia-kim.epub',
    },
    {
      id: 'b0000004-0000-4000-8000-000000000004',
      title: 'Tâm Lý Học Về Tiền – The Psychology of Money',
      slug: 'tam-ly-hoc-ve-tien',
      isbn: '978-604-58-9004-4',
      price: 139000,
      format: 'DIGITAL',
      status: 'PUBLISHED',
      category_id: categoryMap.kinhte.id,
      author_id: authorMap.morgan_housel.id,
      publisher_id: publisherMap.tritueviet.id,
      cover_url: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?auto=format&fit=crop&w=800&q=80',
      description: 'Những bài học vượt thời gian về sự giàu có, lòng tham và hạnh phúc thông qua lăng kính tâm lý học tài chính.',
      pdf_key: 'ebooks/tam-ly-hoc-ve-tien.pdf',
      epub_key: 'ebooks/tam-ly-hoc-ve-tien.epub',
    },
    {
      id: 'b0000005-0000-4000-8000-000000000005',
      title: 'Sapiens – Lược Sử Loài Người',
      slug: 'sapiens-luoc-su-loai-nguoi',
      isbn: '978-604-58-9005-5',
      price: 189000,
      format: 'BOTH',
      status: 'PUBLISHED',
      category_id: categoryMap.lichsu.id,
      author_id: authorMap.yuval_harari.id,
      publisher_id: publisherMap.nhanam.id,
      cover_url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80',
      description: 'Cuốn sách khám phá toàn diện hành trình tiến hóa của loài người từ thời kỳ đồ đá cho đến kỷ nguyên trí tuệ nhân tạo.',
      pdf_key: 'ebooks/sapiens.pdf',
      epub_key: 'ebooks/sapiens.epub',
    },
    {
      id: 'b0000006-0000-4000-8000-000000000006',
      title: 'Muôn Kiếp Nhân Sinh – Tập 1 & 2',
      slug: 'muon-kiep-nhan-sinh',
      isbn: '978-604-58-9006-6',
      price: 168000,
      format: 'BOTH',
      status: 'PUBLISHED',
      category_id: categoryMap.lichsu.id,
      author_id: authorMap.nguyen_phong.id,
      publisher_id: publisherMap.tritueviet.id,
      cover_url: 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?auto=format&fit=crop&w=800&q=80',
      description: 'Bức tranh sống động về quy luật luân hồi, nhân quả và thức tỉnh tâm linh qua các nền văn minh tiền kiếp.',
      pdf_key: 'ebooks/muon-kiep-nhan-sinh.pdf',
      epub_key: 'ebooks/muon-kiep-nhan-sinh.epub',
    },
    {
      id: 'b0000007-0000-4000-8000-000000000007',
      title: 'Dế Mèn Phiêu Lưu Ký (Bản Màu Nghệ Thuật)',
      slug: 'de-men-phieu-luu-ky',
      isbn: '978-604-58-9007-7',
      price: 65000,
      format: 'BOTH',
      status: 'PUBLISHED',
      category_id: categoryMap.thieunhi.id,
      author_id: authorMap.to_hoai.id,
      publisher_id: publisherMap.kimdong.id,
      cover_url: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=800&q=80',
      description: 'Kiệt tác văn học thiếu nhi Việt Nam đồng hành cùng nhiều thế hệ bạn đọc nhỏ tuổi.',
      pdf_key: 'ebooks/de-men-phieu-luu-ky.pdf',
      epub_key: 'ebooks/de-men-phieu-luu-ky.epub',
    }
  ];

  for (const b of standardBooks) {
    await pool.query(`
      INSERT INTO books (
        id, owner_user_id, store_id, publisher_id, title, slug, normalized_title, isbn, price, format, status, 
        category_id, author_id, cover_url, description, view_count, published_at, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 100, NOW(), NOW(), NOW())
    `, [
      b.id, ownerUserId, storeId, b.publisher_id, b.title, b.slug, b.title.toUpperCase(), b.isbn, b.price, b.format, b.status,
      b.category_id, b.author_id, b.cover_url, b.description
    ]);

    await pool.query(`
      INSERT INTO digital_book_details (
        id, book_id, digital_enabled, access_type, pdf_key, epub_key, preview_pdf_key, created_at, updated_at
      )
      VALUES ($1, $2, true, 'PREMIUM', $3, $4, $3, NOW(), NOW())
    `, [
      `d000000${b.id.slice(-1)}-0000-4000-8000-00000000000${b.id.slice(-1)}`, b.id, b.pdf_key, b.epub_key
    ]);

    console.log(`  📖 + Đã khởi tạo sách: "${b.title}" [${b.format}]`);
  }

  console.log('\n================================================================');
  console.log('🎉 ĐÃ KHỞI TẠO XONG DANH MỤC SÁCH VỚI 100% UUID HỢP LỆ!');
  console.log('================================================================');

  await pool.end();
}

seedValidUuidCatalog();
