const path = require('path');
const crypto = require('crypto');
const { Client } = require(path.resolve(__dirname, '../platform/node_modules/pg'));

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeName(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

const TITLE_TO_AUTHOR = [
  { match: 'Đọc Vị Bất Kỳ Ai', author: 'David J. Lieberman', bio: 'Tiến sĩ tâm lý học, chuyên gia hàng đầu về hành vi con người.' },
  { match: 'Kotler Bàn Về Tiếp Thị', author: 'Philip Kotler', bio: 'Cha đẻ của tiếp thị hiện đại, giáo sư danh dự tại Đại học Northwestern.' },
  { match: 'Facebook Marketing', author: 'MediaZ', bio: 'Đơn vị tiên phong trong lĩnh vực tiếp thị số và truyền thông tại Việt Nam.' },
  { match: 'Tội Ác Và Trừng Phạt', author: 'Fyodor Dostoevsky', bio: 'Đại văn hào người Nga, một trong những cây bút vĩ đại nhất nền văn học thế giới.' },
  { match: 'Đánh Cắp Ý Tưởng', author: 'Austin Kleon', bio: 'Nhà văn kiêm họa sĩ nổi tiếng tại New York Times.' },
  { match: 'Hẹn Bạn Trên Đỉnh Thành Công', author: 'Zig Ziglar', bio: 'Diễn giả truyền cảm hứng và bậc thầy bán hàng hàng đầu thế giới.' },
  { match: 'Vị Giám Đốc Một Phút', author: 'Ken Blanchard & Spencer Johnson', bio: 'Chuyên gia quản trị nhân sự và tâm lý học hành vi.' },
  { match: 'Tử Huyệt Cảm Xúc', author: 'Roy Garn', bio: 'Chuyên gia giao tiếp và nhà nghiên cứu tâm lý học ứng dụng.' },
  { match: 'Chiếc Lexus Và Cây Ô Liu', author: 'Thomas L. Friedman', bio: 'Nhà báo từng 3 lần đoạt giải Pulitzer, tác giả Thế Giới Phẳng.' },
  { match: 'Đừng Bao Giờ Đi Ăn Một Mình', author: 'Keith Ferrazzi', bio: 'Doanh nhân và tác giả sách bán chạy nhất về nghệ thuật kết nối quan hệ.' },
  { match: 'Tư Duy Đột Phá', author: 'Hibino Shozo', bio: 'Giáo sư chuyên ngành thiết kế hệ thống và tư duy sáng tạo.' },
  { match: 'Đọc Vị Khách Hàng', author: 'Michael Aguilar', bio: 'Bậc thầy về kỹ thuật thương lượng và thuyết phục khách hàng.' },
  { match: 'Ngày Xưa Có Một Con Bò', author: 'Camilo Cruz', bio: 'Tiến sĩ tâm lý, diễn giả quốc tế về phát triển bản thân.' },
  { match: 'Nghệ Thuật Bán Hàng Bậc Cao', author: 'Zig Ziglar', bio: 'Diễn giả truyền cảm hứng và bậc thầy bán hàng hàng đầu thế giới.' },
  { match: 'Chiến Thắng Con Quỷ Trong Bạn', author: 'Napoleon Hill', bio: 'Tác giả sách tư duy thành công kinh điển hàng đầu thế giới.' },
  { match: 'Cha Giàu Cha Nghèo', author: 'Robert Kiyosaki', bio: 'Doanh nhân, nhà đầu tư và tác giả bộ sách Dạy Con Làm Giàu.' },
  { match: 'Tuổi Trẻ Đáng Giá Bao Nhiêu', author: 'Rosie Nguyễn', bio: 'Tác giả, giảng viên yoga và người truyền cảm hứng cho giới trẻ Việt Nam.' },
  { match: 'Dám Chấp Nhận', author: 'Bill Newman', bio: 'Diễn giả động lực học nổi tiếng người Úc.' },
  { match: 'Dám Nghĩ Lớn', author: 'David J. Schwartz', bio: 'Giáo sư tại Đại học Bang Georgia, chuyên gia phát triển động lực.' },
  { match: 'Nghĩ Lớn Để Thành Công', author: 'Donald J. Trump & Bill Zanker', bio: 'Doanh nhân tỷ phú và nhà sáng lập chuỗi học viện kỹ năng.' },
  { match: 'Ai Lấy Miếng Pho Mát Của Tôi', author: 'Spencer Johnson', bio: 'Tiến sĩ y khoa và chuyên gia tâm lý học hành vi nổi tiếng.' },
  { match: 'Bí Quyết Gầy Dựng Cơ Nghiệp Bạc Tỷ', author: 'Adam Khoo', bio: 'Doanh nhân triệu phú, diễn giả hàng đầu châu Á.' },
  { match: 'Nghĩ Giàu & Làm Giàu', author: 'Napoleon Hill', bio: 'Tác giả sách tư duy thành công kinh điển hàng đầu thế giới.' },
  { match: 'Làm Chủ Tư Duy Thay Đổi Vận Mệnh', author: 'Adam Khoo', bio: 'Doanh nhân triệu phú, diễn giả hàng đầu châu Á.' },
  { match: 'Trên Đường Băng', author: 'Tony Buổi Sáng', bio: 'Tác giả ẩn danh với những bài viết truyền lửa cho thanh niên Việt.' },
  { match: 'Tôi Tài Giỏi, Bạn Cũng Thế!', author: 'Adam Khoo', bio: 'Doanh nhân triệu phú, diễn giả hàng đầu châu Á.' },
  { match: 'Từ Tốt Đến Vĩ Đại', author: 'Jim Collins', bio: 'Chuyên gia nghiên cứu quản trị kinh doanh tại Stanford.' },
  { match: '12 Tuyệt Kỹ Bán Hàng', author: 'Brian Tracy', bio: 'Diễn giả và chuyên gia đào tạo kỹ năng lãnh đạo, bán hàng hàng đầu.' },
  { match: 'Con Đường Phía Trước', author: 'Bill Gates', bio: 'Nhà đồng sáng lập tập đoàn Microsoft và nhà hoạt động từ thiện.' },
  { match: '1001 Cách Giữ Chân Khách Hàng', author: 'Michael LeBoeuf', bio: 'Tiến sĩ quản trị kinh doanh, cựu giáo sư tại Đại học New Orleans.' },
  { match: '101 Ý Tưởng Quảng Cáo Khôn Ngoan', author: 'Luc Dupont', bio: 'Giáo sư truyền thông tại Đại học Ottawa, Canada.' },
  { match: '7 Thói Quen Để Thành Đạt', author: 'Stephen R. Covey', bio: 'Chuyên gia quản trị, tác giả The 7 Habits of Highly Effective People.' },
  { match: 'Hoàng Tử Bé', author: 'Antoine de Saint-Exupéry', bio: 'Nhà văn và phi công trứ danh người Pháp.' },
  { match: 'Tư Duy Nhanh Và Chậm', author: 'Daniel Kahneman', bio: 'Nhà tâm lý học đoạt giải Nobel Kinh tế năm 2002.' },
  { match: 'Tỷ Phú Bán Giày', author: 'Tony Hsieh', bio: 'Cố CEO Zappos, huyền thoại dịch vụ khách hàng và văn hóa doanh nghiệp.' },
  { match: 'Thế Giới Phẳng', author: 'Thomas L. Friedman', bio: 'Nhà báo từng 3 lần đoạt giải Pulitzer.' },
  { match: 'Đắc Nhân Tâm', author: 'Dale Carnegie', bio: 'Bậc thầy giao tiếp và tác giả cuốn sách đắc nhân tâm mọi thời đại.' },
  { match: 'Cây Cam Ngọt Của Tôi', author: 'José Mauro de Vasconcelos', bio: 'Nhà văn nổi tiếng người Brazil.' },
  { match: 'Hành Trình Về Phương Đông', author: 'Nguyên Phong', bio: 'Bút danh của Giáo sư John Vu (Vũ Văn Du).' },
  { match: 'Tam Ly Hoc Thanh Cong', author: 'Carol S. Dweck', bio: 'Giáo sư tâm lý học tại Đại học Stanford.' },
  { match: 'Test Book', author: 'Nguyễn Văn A', bio: 'Tác giả thử nghiệm hệ thống.' },
  { match: 'Sách Mới Xuất Bản', author: 'Nguyễn Văn A', bio: 'Tác giả thử nghiệm hệ thống.' },
  { match: 'ádasdasdsadsadsadsadsad', author: 'Tác Giả Nổi Tiếng', bio: 'Tác giả cộng tác.' },
  { match: 'sadasdasdasdasd', author: 'Tác Giả Nổi Tiếng', bio: 'Tác giả cộng tác.' },
  { match: 'https://giasuttv', author: 'Tác Giả Nổi Tiếng', bio: 'Tác giả cộng tác.' },
];

const STORE_TO_PUBLISHER = {
  'store-002-nhanam-books': 'p0000003-0000-4000-8000-000000000003', // Nhã Nam Books
  '3094e54e-2549-42cc-92fb-14a8f8589277': 'p0000001-0000-4000-8000-000000000001', // Trí Tuệ Việt Books
  'd2caa7b1-1b82-49b9-be65-1fc6be42e472': 'p0000002-0000-4000-8000-000000000002', // Kim Đồng
  '914a406f-9ae5-49a5-a895-7c60b2114d7c': '0df2754d-576f-4e83-811d-fd4d4ed25eba', // NXB Trẻ
  '51c48059-37be-46a2-b4a6-04a8365f8cbd': '6d9c682e-3107-4d87-9c35-a697c56a6c81', // Alpha Books
  '20eb20a3-1058-4e2e-a043-a208fe6f84ba': 'p0000001-0000-4000-8000-000000000001', // Trí Tuệ Việt Books
};

async function main() {
  const comm = new Client({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_commerce' });
  await comm.connect();

  console.log('--- STARTING COMPREHENSIVE LOCAL DB MIGRATION ---');
  await comm.query('BEGIN');

  try {
    // 1. Migrate s2- books
    console.log('\n[1/5] Migrating s2- books to valid UUIDs...');
    const s2Books = await comm.query("SELECT id FROM books WHERE id LIKE 's2-%'");
    console.log(`Found ${s2Books.rows.length} s2- books.`);

    const idMap = new Map();
    for (const b of s2Books.rows) {
      const oldId = b.id;
      const newId = crypto.randomUUID();
      idMap.set(oldId, newId);

      await comm.query('UPDATE books SET id = $1 WHERE id = $2', [newId, oldId]);
      await comm.query('UPDATE affiliate_commissions SET book_id = $1 WHERE book_id = $2', [newId, oldId]);
    }
    console.log(`Migrated ${idMap.size} books to valid RFC 4122 UUIDs.`);

    // 2. Ensure authors exist
    console.log('\n[2/5] Ensuring all authors exist in authors table...');
    const existingAuthors = await comm.query('SELECT id, name, normalized_name FROM authors');
    const authorNameToId = new Map();
    for (const a of existingAuthors.rows) {
      authorNameToId.set(a.name.toLowerCase().trim(), a.id);
      authorNameToId.set(a.normalized_name.toLowerCase().trim(), a.id);
    }

    for (const mapping of TITLE_TO_AUTHOR) {
      const aName = mapping.author.trim();
      const norm = normalizeName(aName);
      if (!authorNameToId.has(aName.toLowerCase()) && !authorNameToId.has(norm)) {
        const newAuthorId = crypto.randomUUID();
        const slug = slugify(aName);
        await comm.query(`
          INSERT INTO authors (id, name, normalized_name, slug, bio, is_active, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
        `, [newAuthorId, aName, norm, slug, mapping.bio]);
        authorNameToId.set(aName.toLowerCase(), newAuthorId);
        authorNameToId.set(norm, newAuthorId);
        console.log(`Inserted new author: ${aName} (${newAuthorId})`);
      }
    }

    // 3. Map missing author_id in books
    console.log('\n[3/5] Mapping missing author_id in books...');
    const nullAuthors = await comm.query("SELECT id, title, slug FROM books WHERE author_id IS NULL");
    console.log(`Found ${nullAuthors.rows.length} books without author_id.`);

    let mappedAuthorCount = 0;
    for (const b of nullAuthors.rows) {
      const match = TITLE_TO_AUTHOR.find(m => b.title.includes(m.match) || b.slug.includes(m.match));
      if (match) {
        const authorId = authorNameToId.get(match.author.toLowerCase().trim()) || authorNameToId.get(normalizeName(match.author));
        if (authorId) {
          await comm.query('UPDATE books SET author_id = $1 WHERE id = $2', [authorId, b.id]);
          mappedAuthorCount++;
        }
      }
    }
    console.log(`Successfully mapped author_id for ${mappedAuthorCount}/${nullAuthors.rows.length} books.`);

    // 4. Map missing publisher_id in books
    console.log('\n[4/5] Mapping missing publisher_id in books...');
    const nullPubs = await comm.query("SELECT id, title, store_id FROM books WHERE publisher_id IS NULL");
    console.log(`Found ${nullPubs.rows.length} books without publisher_id.`);

    let mappedPubCount = 0;
    for (const b of nullPubs.rows) {
      const pubId = STORE_TO_PUBLISHER[b.store_id] || 'p0000001-0000-4000-8000-000000000001';
      await comm.query('UPDATE books SET publisher_id = $1 WHERE id = $2', [pubId, b.id]);
      mappedPubCount++;
    }
    console.log(`Successfully mapped publisher_id for ${mappedPubCount}/${nullPubs.rows.length} books.`);

    // 5. Clean up book formats: books without digital details/pdf should be PHYSICAL
    console.log('\n[5/5] Reconciling book formats and digital details...');
    const formatReconciled = await comm.query(`
      UPDATE books
      SET format = 'PHYSICAL'
      WHERE format = 'BOTH'
        AND id IN (
          SELECT b.id FROM books b
          LEFT JOIN digital_book_details d ON d.book_id = b.id
          WHERE d.pdf_key IS NULL AND (d.digital_enabled IS NULL OR d.digital_enabled = false)
        )
    `);
    console.log(`Reconciled ${formatReconciled.rowCount} books from BOTH to PHYSICAL.`);

    await comm.query('COMMIT');
    console.log('\n>>> LOCAL DB MIGRATION COMPLETED AND COMMITTED SUCCESSFULLY! <<<');

    // Post-migration verification
    const remainingS2 = await comm.query("SELECT COUNT(*) FROM books WHERE id LIKE 's2-%'");
    const remainingNullAuthors = await comm.query("SELECT COUNT(*) FROM books WHERE author_id IS NULL");
    const remainingNullPubs = await comm.query("SELECT COUNT(*) FROM books WHERE publisher_id IS NULL");
    console.log('\n=== VERIFICATION RESULTS ===');
    console.log(`Remaining s2- books: ${remainingS2.rows[0].count} (Expected: 0)`);
    console.log(`Remaining books with NULL author_id: ${remainingNullAuthors.rows[0].count} (Expected: 0)`);
    console.log(`Remaining books with NULL publisher_id: ${remainingNullPubs.rows[0].count} (Expected: 0)`);

  } catch (err) {
    await comm.query('ROLLBACK');
    console.error('Migration failed, rolled back! Error:', err);
    process.exit(1);
  } finally {
    await comm.end();
  }
}

main().catch(console.error);
