// ========================================================
// HUKI EBOOK - Clean Professional UAT Seeder
// Generates verified accounts, stores, and 10 iconic books with REAL covers
// ========================================================
import pg from 'pg';
import bcrypt from 'bcrypt';

const { Client } = pg;

const DB_PASS = process.env.POSTGRES_PASSWORD || 'HukiProductionSecure2026!#';
const DB_HOST = process.env.DATABASE_HOST || 'postgres';

const REAL_BOOKS = [
  {
    title: 'Nhà Giả Kim (The Alchemist)',
    slug: 'nha-gia-kim',
    author: 'Paulo Coelho',
    publisher: 'Nhã Nam Books',
    category: 'Văn học',
    catSlug: 'van-hoc',
    price: 79000,
    coverUrl: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1654371463i/18144590.jpg',
    description: 'Tác phẩm kinh điển toàn cầu về hành trình theo đuổi vận mệnh và lắng nghe tiếng gọi trái tim của chàng chăn cừu Santiago.',
    format: 'BOTH',
    pages: 228,
    stock: 100
  },
  {
    title: 'Cây Cam Ngọt Của Tôi',
    slug: 'cay-cam-ngot-cua-toi',
    author: 'José Mauro de Vasconcelos',
    publisher: 'Nhã Nam Books',
    category: 'Văn học',
    catSlug: 'van-hoc',
    price: 95000,
    coverUrl: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1608620242i/56379564.jpg',
    description: 'Câu chuyện xúc động rơi nước mắt về cậu bé Zezé 5 tuổi với tâm hồn trong trẻo, giàu tình thương giữa cuộc đời nhiều cay đắng.',
    format: 'BOTH',
    pages: 244,
    stock: 80
  },
  {
    title: 'Đắc Nhân Tâm (How to Win Friends and Influence People)',
    slug: 'dac-nhan-tam',
    author: 'Dale Carnegie',
    publisher: 'First News - Trí Việt',
    category: 'Tâm lý & Kỹ năng',
    catSlug: 'tam-ly-ky-nang',
    price: 88000,
    coverUrl: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1360697241i/17351659.jpg',
    description: 'Cuốn sách bán chạy nhất mọi thời đại về nghệ thuật giao tiếp, thấu hiểu lòng người và xây dựng các mối quan hệ bền vững.',
    format: 'BOTH',
    pages: 320,
    stock: 150
  },
  {
    title: 'Hoàng Tử Bé (Le Petit Prince)',
    slug: 'hoang-tu-be',
    author: 'Antoine de Saint-Exupéry',
    publisher: 'Nhã Nam Books',
    category: 'Văn học',
    catSlug: 'van-hoc',
    price: 68000,
    coverUrl: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1367545443i/157993.jpg',
    description: 'Kiệt tác văn học thiếu nhi dành cho người lớn. Bài học sâu sắc: Người ta chỉ thấy rõ bằng trái tim, cái cốt yếu vô hình trong mắt trần.',
    format: 'BOTH',
    pages: 110,
    stock: 200
  },
  {
    title: 'Sapiens: Lược Sử Loài Người',
    slug: 'sapiens-luoc-su-loai-nguoi',
    author: 'Yuval Noah Harari',
    publisher: 'Nhã Nam Books',
    category: 'Tri thức & Khoa học',
    catSlug: 'tri-thuc',
    price: 185000,
    coverUrl: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1700180941i/23692271.jpg',
    description: 'Khám phá hành trình phi thường từ một loài vượn người vô danh trở thành bá chủ hành tinh của giống loài Homo Sapiens.',
    format: 'BOTH',
    pages: 560,
    stock: 65
  },
  {
    title: 'Tư Duy Nhanh Và Chậm (Thinking, Fast and Slow)',
    slug: 'tu-duy-nhanh-va-cham',
    author: 'Daniel Kahneman',
    publisher: 'Nhà Xuất Bản Thế Giới',
    category: 'Tâm lý & Kỹ năng',
    catSlug: 'tam-ly-ky-nang',
    price: 168000,
    coverUrl: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1317793965i/11468377.jpg',
    description: 'Công trình đoạt giải Nobel kinh tế giải mã hai hệ thống định hình cách não bộ con người ra quyết định và những cạm bẫy trực giác.',
    format: 'BOTH',
    pages: 612,
    stock: 50
  },
  {
    title: 'Dế Mèn Phiêu Lưu Ký',
    slug: 'de-men-phieu-luu-ky',
    author: 'Tô Hoài',
    publisher: 'Nhà Xuất Bản Kim Đồng',
    category: 'Manga & Khác',
    catSlug: 'manga-comic-khac',
    price: 55000,
    coverUrl: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1327914902i/10706212.jpg',
    description: 'Tác phẩm văn học thiếu nhi kinh điển của Việt Nam dạy về tinh thần trượng nghĩa, bài học kiêu ngạo và tình bạn chân thành.',
    format: 'PHYSICAL',
    pages: 180,
    stock: 120
  },
  {
    title: 'Cha Giàu Cha Nghèo (Rich Dad Poor Dad)',
    slug: 'cha-giau-cha-ngheo',
    author: 'Robert T. Kiyosaki',
    publisher: 'Nhà Xuất Bản Trẻ',
    category: 'Kinh doanh & Tech',
    catSlug: 'kinh-doanh-tech',
    price: 110000,
    coverUrl: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1388211242i/69571.jpg',
    description: 'Cuốn sách vỡ lòng về giáo dục tài chính, giúp bạn hiểu rõ sự khác biệt giữa tài sản và tiêu sản để đạt tự do tài chính.',
    format: 'BOTH',
    pages: 350,
    stock: 90
  },
  {
    title: 'Chiến Binh Cầu Vồng',
    slug: 'chien-binh-cau-vong',
    author: 'Andrea Hirata',
    publisher: 'Nhã Nam Books',
    category: 'Văn học',
    catSlug: 'van-hoc',
    price: 109000,
    coverUrl: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1398863674i/1362193.jpg',
    description: 'Câu chuyện cảm động về 10 đứa trẻ nghèo trên hòn đảo Belitong (Indonesia) cùng ước mơ con chữ và lòng dũng cảm phi thường.',
    format: 'PHYSICAL',
    pages: 428,
    stock: 75
  },
  {
    title: 'Tội Ác Và Trừng Phạt (Crime and Punishment)',
    slug: 'toi-ac-va-trung-phat',
    author: 'Fyodor Dostoevsky',
    publisher: 'Nhã Nam Books',
    category: 'Văn học',
    catSlug: 'van-hoc',
    price: 175000,
    coverUrl: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1382846449i/7144.jpg',
    description: 'Đỉnh cao văn học tâm lý Nga mô tả sự giằng xé nội tâm ghê gớm giữa tội ác, sự cứu rỗi và công lý của chàng sinh viên Raskolnikov.',
    format: 'BOTH',
    pages: 710,
    stock: 45
  }
];

function slugify(text) {
  return text.toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim().replace(/\s+/g, '-').replace(/-+/g, '-');
}

async function seed() {
  console.log('🚀 Bắt đầu khởi tạo dữ liệu UAT chuẩn mực...');

  const SELLER_USER_ID = '99999999-0000-4000-8000-000000000001';
  const BUYER_USER_ID  = '99999999-0000-4000-8000-000000000002';
  const ADMIN_USER_ID  = '99999999-0000-4000-8000-000000000003';
  const STORE_ID       = '88888888-0000-4000-8000-000000000001';

  // 1. IDENTITY DB
  console.log('\n[1/3] Khởi tạo tài khoản trên huki_uat_identity...');
  const identClient = new Client({ connectionString: `postgresql://postgres:${DB_PASS}@${DB_HOST}:5432/huki_uat_identity` });
  await identClient.connect();
  const pwdHash = await bcrypt.hash('Huki123456!#', 12);

  await identClient.query(`
    INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified_at, created_at, updated_at)
    VALUES 
      ('${ADMIN_USER_ID}', 'admin@huki.com', '${pwdHash}', 'HUKI Super Admin', 'PLATFORM_ADMIN', 'ACTIVE', NOW(), NOW(), NOW()),
      ('${SELLER_USER_ID}', 'seller@huki.com', '${pwdHash}', 'Nguyễn Phương Thúy (Nhà Sách HuKi)', 'BUSINESS', 'ACTIVE', NOW(), NOW(), NOW()),
      ('${BUYER_USER_ID}', 'buyer@huki.com', '${pwdHash}', 'Trần Khách Mua (Test User)', 'USER', 'ACTIVE', NOW(), NOW(), NOW())
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, status = 'ACTIVE'
  `);
  console.log('✅ Đã tạo 3 tài khoản chuẩn: admin@huki.com, seller@huki.com, buyer@huki.com (Pass: Huki123456!#)');
  await identClient.end();

  // 2. BUSINESS DB
  console.log('\n[2/3] Khởi tạo Gian hàng chính hãng trên huki_uat_business...');
  const bizClient = new Client({ connectionString: `postgresql://postgres:${DB_PASS}@${DB_HOST}:5432/huki_uat_business` });
  await bizClient.connect();
  await bizClient.query(`
    INSERT INTO businesses (id, owner_id, name, slug, email, phone, status, tier, verified, description, created_at, updated_at)
    VALUES ('${STORE_ID}', '${SELLER_USER_ID}', 'Nhà Sách HuKi Official', 'nha-sach-huki-official', 'seller@huki.com', '0901234567', 'ACTIVE', 'ENTERPRISE', true, 'Gian hàng phân phối sách chính hãng uy tín hàng đầu của HuKi Ebook.', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, verified = true, status = 'ACTIVE'
  `);
  console.log('✅ Đã tạo Store: "Nhà Sách HuKi Official" (Đã verified)');
  await bizClient.end();

  // 3. COMMERCE DB
  console.log('\n[3/3] Khởi tạo 10 cuốn sách kinh điển trên huki_uat_commerce...');
  const comClient = new Client({ connectionString: `postgresql://postgres:${DB_PASS}@${DB_HOST}:5432/huki_uat_commerce` });
  await comClient.connect();

  // Categories
  const categories = [
    { id: 'cat-van-hoc', name: 'Văn học', slug: 'van-hoc' },
    { id: 'cat-tam-ly-ky-nang', name: 'Tâm lý & Kỹ năng', slug: 'tam-ly-ky-nang' },
    { id: 'cat-kinh-doanh-tech', name: 'Kinh doanh & Tech', slug: 'kinh-doanh-tech' },
    { id: 'cat-tri-thuc', name: 'Tri thức & Khoa học', slug: 'tri-thuc' },
    { id: 'cat-manga-comic', name: 'Manga & Khác', slug: 'manga-comic-khac' }
  ];

  for (const c of categories) {
    await comClient.query(`
      INSERT INTO categories (id, name, normalized_name, slug, description, is_active, updated_at)
      VALUES ($1, $2, $3, $4, $5, true, NOW())
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
    `, [c.id, c.name, slugify(c.name).replace(/-/g, ' '), c.slug, c.name]);
  }

  // Insert Books
  for (const book of REAL_BOOKS) {
    // Author
    const normAuthor = slugify(book.author).replace(/-/g, ' ');
    const autRes = await comClient.query(`
      INSERT INTO authors (id, name, normalized_name, slug, is_active, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, true, NOW())
      ON CONFLICT (normalized_name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `, [book.author, normAuthor, slugify(book.author)]);
    const authorId = autRes.rows[0].id;

    // Publisher
    const normPub = slugify(book.publisher).replace(/-/g, ' ');
    const pubRes = await comClient.query(`
      INSERT INTO publishers (id, name, normalized_name, slug, is_active, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, true, NOW())
      ON CONFLICT (normalized_name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `, [book.publisher, normPub, slugify(book.publisher)]);
    const publisherId = pubRes.rows[0].id;

    // Book
    const normTitle = slugify(book.title).replace(/-/g, ' ');
    const catId = categories.find(c => c.slug === book.catSlug)?.id || categories[0].id;

    const bookRes = await comClient.query(`
      INSERT INTO books (
        id, store_id, owner_user_id, title, slug, normalized_title,
        description, price, category_id, author_id, publisher_id,
        format, cover_url, status, published_at, view_count, updated_at
      )
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'PUBLISHED', NOW(), 120, NOW())
      ON CONFLICT (store_id, slug) DO UPDATE SET
        price = EXCLUDED.price,
        cover_url = EXCLUDED.cover_url,
        status = 'PUBLISHED',
        updated_at = NOW()
      RETURNING id
    `, [
      STORE_ID,
      SELLER_USER_ID,
      book.title,
      book.slug,
      normTitle,
      book.description,
      book.price,
      catId,
      authorId,
      publisherId,
      book.format,
      book.coverUrl
    ]);

    const bookId = bookRes.rows[0].id;

    // Physical details
    await comClient.query(`
      INSERT INTO physical_book_details (id, book_id, stock, reserved, weight, dimensions, page_count, physical_enabled, updated_at)
      VALUES (gen_random_uuid(), $1, $2, 0, 350.0, '14.5 x 20.5 cm', $3, true, NOW())
      ON CONFLICT (book_id) DO UPDATE SET stock = EXCLUDED.stock, physical_enabled = true
    `, [bookId, book.stock, book.pages]);

    // Digital details
    if (book.format === 'BOTH' || book.format === 'DIGITAL') {
      await comClient.query(`
        INSERT INTO digital_book_details (id, book_id, pdf_key, epub_key, preview_pdf_key, digital_enabled, access_type, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, true, 'FREE', NOW())
        ON CONFLICT (book_id) DO UPDATE SET digital_enabled = true
      `, [bookId, 'ebooks/' + book.slug + '.pdf', 'ebooks/' + book.slug + '.epub', 'ebooks/previews/' + book.slug + '-preview.pdf']);
    }

    console.log(`  + Đã tạo sách: [${book.title}] - Bìa thật chuẩn 100%`);
  }

  await comClient.end();
  console.log('\n🎉 HOÀN TẤT SEED UAT THÀNH CÔNG! Sách, Gian hàng, Tài khoản đã sẵn sàng!');
}

seed().catch(err => {
  console.error('Lỗi khi seed UAT:', err);
  process.exit(1);
});

