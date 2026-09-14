import { createRequire } from 'module';
const require = createRequire('e:/HuKi/platform/apps/identity-service/node_modules/');
const pg = require('pg');
const { Pool } = pg;

async function cleanAndSeedBooks() {
  console.log('================================================================');
  console.log('📚 DỌN DẸP SÁCH TEST RÁC VÀ KHỞI TẠO DANH MỤC SÁCH CHUẨN');
  console.log('================================================================\n');

  const poolIdent = new Pool({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_identity' });
  const userRes = await poolIdent.query("SELECT id FROM users WHERE email IN ('adminhuki@gmail.com', 'huy@gmail.com') LIMIT 1");
  const ownerUserId = userRes.rows[0]?.id || '0c2009aa-7c18-4f54-919f-ac709881db60';
  await poolIdent.end();

  const pool = new Pool({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_commerce' });

  // 1. Xóa các sách test rác
  const junkTitles = [
    'Digital', 'Low Stock', 'Order Book', 'Owner Book', 'Test Book', 
    'Phase 8 E2E Book 1789362720707', 'Phase 8 E2E Book 1789362666441',
    'Phase 7 Hybrid E2E 1789324861992', 'Phase 7 Hybrid E2E 1789324827216',
    'Sách Thử Nghiệm Vận Hành P7 #2196'
  ];

  await pool.query(`
    DELETE FROM digital_book_details 
    WHERE book_id IN (
      SELECT id FROM books 
      WHERE title = ANY($1::text[]) 
         OR title LIKE '%Test%' 
         OR title LIKE '%E2E%' 
         OR title LIKE '%Phase%'
    )
  `, [junkTitles]);

  const delBooksRes = await pool.query(`
    DELETE FROM books 
    WHERE title = ANY($1::text[]) 
       OR title LIKE '%Test%' 
       OR title LIKE '%E2E%' 
       OR title LIKE '%Phase%'
  `, [junkTitles]);
  console.log(`✅ Đã dọn dẹp ${delBooksRes.rowCount} cuốn sách test rác lặp lại.`);

  // 2. Tạo Danh Mục Chuẩn (Categories)
  const categories = [
    { id: 'cat_kinhte_01', name: 'Kinh Tế - Kinh Doanh', slug: 'kinh-te-kinh-doanh', desc: 'Sách quản trị, khởi nghiệp, tài chính đầu tư' },
    { id: 'cat_kynang_02', name: 'Phát Triển Bản Thân', slug: 'phat-trien-ban-than', desc: 'Rèn luyện tư duy, kỹ năng sống và thói quen tích cực' },
    { id: 'cat_vanhoc_03', name: 'Văn Học - Tiểu Thuyết', slug: 'van-hoc-tieu-thuyet', desc: 'Tiểu thuyết kinh điển, văn học dịch và tác phẩm đoạt giải' },
    { id: 'cat_congnghe_04', name: 'Công Nghệ & Khoa Học', slug: 'cong-nghe-khoa-hoc', desc: 'Lập trình, AI, chuyển đổi số và khoa học tương lai' },
    { id: 'cat_lichsu_05', name: 'Lịch Sử - Triết Học', slug: 'lich-su-triet-hoc', desc: 'Nghiên cứu lịch sử nhân loại, triết lý sống và văn hóa' },
    { id: 'cat_thieunhi_06', name: 'Sách Thiếu Nhi', slug: 'sach-thieu-nhi', desc: 'Truyện tranh, cổ tích và sách giáo dục kỹ năng cho trẻ' },
  ];

  for (const c of categories) {
    await pool.query(`
      INSERT INTO categories (id, name, normalized_name, slug, description, is_active, sort_order, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, true, 1, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET name = $2, slug = $4, description = $5
    `, [c.id, c.name, c.name.toUpperCase(), c.slug, c.desc]);
  }
  console.log(`✅ Đã khởi tạo ${categories.length} danh mục thể loại sách chuẩn.`);

  // 3. Tạo Tác Giả Chuẩn (Authors)
  const authors = [
    { id: 'aut_james_clear', name: 'James Clear', slug: 'james-clear', bio: 'Chuyên gia hàng đầu thế giới về hình thành thói quen và tối ưu hóa hiệu suất.' },
    { id: 'aut_dale_carnegie', name: 'Dale Carnegie', slug: 'dale-carnegie', bio: 'Nhà văn và nhà thuyết trình huyền thoại người Mỹ.' },
    { id: 'aut_paulo_coelho', name: 'Paulo Coelho', slug: 'paulo-coelho', bio: 'Tiểu thuyết gia người Brazil với hơn 350 triệu bản in toàn cầu.' },
    { id: 'aut_morgan_housel', name: 'Morgan Housel', slug: 'morgan-housel', bio: 'Nhà đầu tư mạo hiểm và tác giả bán chạy toàn cầu về tâm lý học tài chính.' },
    { id: 'aut_to_hoai', name: 'Tô Hoài', slug: 'to-hoai', bio: 'Nhà văn lớn của nền văn học hiện đại Việt Nam.' },
    { id: 'aut_yuval_harari', name: 'Yuval Noah Harari', slug: 'yuval-noah-harari', bio: 'Giáo sư lịch sử tại Đại học Hebrew ở Jerusalem.' },
    { id: 'aut_nguyen_phong', name: 'Nguyên Phong', slug: 'nguyen-phong', bio: 'Dịch giả và tác giả nổi tiếng với các tác phẩm tâm linh, triết học phương Đông.' },
  ];

  for (const a of authors) {
    await pool.query(`
      INSERT INTO authors (id, name, normalized_name, slug, bio, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET name = $2, slug = $4, bio = $5
    `, [a.id, a.name, a.name.toUpperCase(), a.slug, a.bio]);
  }
  console.log(`✅ Đã khởi tạo ${authors.length} tác giả nổi tiếng.`);

  // 4. Tạo Nhà Xuất Bản Chuẩn (Publishers)
  const publishers = [
    { id: 'pub_tritueviet_01', name: 'Trí Tuệ Việt Books', slug: 'tri-tue-viet-books', desc: 'Đơn vị phát hành sách chuyên khảo và nội dung số.' },
    { id: 'pub_kimdong_02', name: 'Nhà Xuất Bản Kim Đồng', slug: 'nxb-kim-dong', desc: 'NXB sách thiếu nhi và truyện tranh hàng đầu.' },
    { id: 'pub_nhanam_03', name: 'Nhã Nam Books', slug: 'nha-nam-books', desc: 'Đơn vị văn hóa truyền thông và sách văn học dịch.' },
    { id: 'pub_fahasa_04', name: 'Fahasa', slug: 'fahasa', desc: 'Công ty Cổ phần Phát hành Sách TP. HCM.' },
  ];

  for (const p of publishers) {
    await pool.query(`
      INSERT INTO publishers (id, name, normalized_name, slug, description, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET name = $2, slug = $4, description = $5
    `, [p.id, p.name, p.name.toUpperCase(), p.slug, p.desc]);
  }
  console.log(`✅ Đã khởi tạo ${publishers.length} nhà xuất bản chuẩn.`);

  const storeId = '3094e54e-2549-42cc-92fb-14a8f8589277';

  // 5. Khởi tạo Danh mục Sách Chuẩn (Bestsellers)
  const standardBooks = [
    {
      id: 'book_atomic_habits_001',
      title: 'Atomic Habits – Thay Đổi Tí Hon, Hiệu Quả Bất Ngờ',
      slug: 'atomic-habits-thay-doi-ti-hon-hieu-qua-bat-ngo',
      isbn: '978-604-58-9001-1',
      price: 149000,
      format: 'BOTH',
      status: 'PUBLISHED',
      category_id: 'cat_kynang_02',
      author_id: 'aut_james_clear',
      publisher_id: 'pub_tritueviet_01',
      cover_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
      description: 'Cuốn sách bán chạy số 1 New York Times về nghệ thuật hình thành thói quen tốt và loại bỏ thói quen xấu từng bước một.',
      pdf_key: 'ebooks/atomic-habits.pdf',
      epub_key: 'ebooks/atomic-habits.epub',
    },
    {
      id: 'book_dac_nhan_tam_002',
      title: 'Đắc Nhân Tâm – How To Win Friends And Influence People',
      slug: 'dac-nhan-tam',
      isbn: '978-604-58-9002-2',
      price: 88000,
      format: 'BOTH',
      status: 'PUBLISHED',
      category_id: 'cat_kynang_02',
      author_id: 'aut_dale_carnegie',
      publisher_id: 'pub_tritueviet_01',
      cover_url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80',
      description: 'Tác phẩm bất hủ về nghệ thuật đối nhân xử thế và chinh phục lòng người hay nhất mọi thời đại.',
      pdf_key: 'ebooks/dac-nhan-tam.pdf',
      epub_key: 'ebooks/dac-nhan-tam.epub',
    },
    {
      id: 'book_nha_gia_kim_003',
      title: 'Nhà Giả Kim – The Alchemist',
      slug: 'nha-gia-kim',
      isbn: '978-604-58-9003-3',
      price: 79000,
      format: 'BOTH',
      status: 'PUBLISHED',
      category_id: 'cat_vanhoc_03',
      author_id: 'aut_paulo_coelho',
      publisher_id: 'pub_nhanam_03',
      cover_url: 'https://images.unsplash.com/photo-1532012164546-f432f2e3dd44?auto=format&fit=crop&w=800&q=80',
      description: 'Một trong những cuốn sách bán chạy nhất lịch sử, câu chuyện truyền cảm hứng về hành trình đi tìm kho báu và sứ mệnh cuộc đời.',
      pdf_key: 'ebooks/nha-gia-kim.pdf',
      epub_key: 'ebooks/nha-gia-kim.epub',
    },
    {
      id: 'book_tam_ly_hoc_ve_tien_004',
      title: 'Tâm Lý Học Về Tiền – The Psychology of Money',
      slug: 'tam-ly-hoc-ve-tien',
      isbn: '978-604-58-9004-4',
      price: 139000,
      format: 'DIGITAL',
      status: 'PUBLISHED',
      category_id: 'cat_kinhte_01',
      author_id: 'aut_morgan_housel',
      publisher_id: 'pub_tritueviet_01',
      cover_url: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?auto=format&fit=crop&w=800&q=80',
      description: 'Những bài học vượt thời gian về sự giàu có, lòng tham và hạnh phúc thông qua lăng kính tâm lý học tài chính.',
      pdf_key: 'ebooks/tam-ly-hoc-ve-tien.pdf',
      epub_key: 'ebooks/tam-ly-hoc-ve-tien.epub',
    },
    {
      id: 'book_sapiens_005',
      title: 'Sapiens – Lược Sử Loài Người',
      slug: 'sapiens-luoc-su-loai-nguoi',
      isbn: '978-604-58-9005-5',
      price: 189000,
      format: 'BOTH',
      status: 'PUBLISHED',
      category_id: 'cat_lichsu_05',
      author_id: 'aut_yuval_harari',
      publisher_id: 'pub_nhanam_03',
      cover_url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80',
      description: 'Cuốn sách khám phá toàn diện hành trình tiến hóa của loài người từ thời kỳ đồ đá cho đến kỷ nguyên trí tuệ nhân tạo.',
      pdf_key: 'ebooks/sapiens.pdf',
      epub_key: 'ebooks/sapiens.epub',
    },
    {
      id: 'book_muon_kiep_nhan_sinh_006',
      title: 'Muôn Kiếp Nhân Sinh – Tập 1 & 2',
      slug: 'muon-kiep-nhan-sinh',
      isbn: '978-604-58-9006-6',
      price: 168000,
      format: 'BOTH',
      status: 'PUBLISHED',
      category_id: 'cat_lichsu_05',
      author_id: 'aut_nguyen_phong',
      publisher_id: 'pub_tritueviet_01',
      cover_url: 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?auto=format&fit=crop&w=800&q=80',
      description: 'Bức tranh sống động về quy luật luân hồi, nhân quả và thức tỉnh tâm linh qua các nền văn minh tiền kiếp.',
      pdf_key: 'ebooks/muon-kiep-nhan-sinh.pdf',
      epub_key: 'ebooks/muon-kiep-nhan-sinh.epub',
    },
    {
      id: 'book_de_men_007',
      title: 'Dế Mèn Phiêu Lưu Ký (Bản Màu Nghệ Thuật)',
      slug: 'de-men-phieu-luu-ky',
      isbn: '978-604-58-9007-7',
      price: 65000,
      format: 'BOTH',
      status: 'PUBLISHED',
      category_id: 'cat_thieunhi_06',
      author_id: 'aut_to_hoai',
      publisher_id: 'pub_kimdong_02',
      cover_url: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=800&q=80',
      description: 'Kiệt tác văn học thiếu nhi Việt Nam đồng hành cùng nhiều thế hệ bạn đọc nhỏ tuổi.',
      pdf_key: 'ebooks/de-men-phieu-luu-ky.pdf',
      epub_key: 'ebooks/de-men-phieu-luu-ky.epub',
    }
  ];

  for (const b of standardBooks) {
    // Insert Book
    await pool.query(`
      INSERT INTO books (
        id, owner_user_id, store_id, publisher_id, title, slug, normalized_title, isbn, price, format, status, 
        category_id, author_id, cover_url, description, view_count, published_at, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 100, NOW(), NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET 
        title = $5, slug = $6, price = $9, format = $10, status = $11, 
        category_id = $12, author_id = $13, publisher_id = $4, cover_url = $14, description = $15
    `, [
      b.id, ownerUserId, storeId, b.publisher_id, b.title, b.slug, b.title.toUpperCase(), b.isbn, b.price, b.format, b.status,
      b.category_id, b.author_id, b.cover_url, b.description
    ]);

    // Insert Digital Book Details with 'PREMIUM'
    await pool.query(`
      INSERT INTO digital_book_details (
        id, book_id, digital_enabled, access_type, pdf_key, epub_key, preview_pdf_key, created_at, updated_at
      )
      VALUES ($1, $2, true, 'PREMIUM', $3, $4, $3, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET 
        digital_enabled = true, access_type = 'PREMIUM', pdf_key = $3, epub_key = $4
    `, [
      `dig_${b.id}`, b.id, b.pdf_key, b.epub_key
    ]);

    console.log(`  📖 + Đã khởi tạo sách: "${b.title}" [${b.format}] - ${b.price.toLocaleString('vi-VN')}đ`);
  }

  const finalBooks = await pool.query('SELECT count(*) FROM books');
  console.log(`\n📚 TỔNG SỐ SÁCH SAU KHI DỌN DẸP & KHỞI TẠO: ${finalBooks.rows[0].count} cuốn chuẩn.`);

  await pool.end();
}

cleanAndSeedBooks();
