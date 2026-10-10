/**
 * Seed Books for 2 Existing Businesses
 * - Store 1: "Trí Tuệ Việt" (3094e54e-2549-42cc-92fb-14a8f8589277)
 * - Store 2: "New Seller"  (45b83dd0-b54b-48dd-adef-31efc1e540c7)
 *
 * Mỗi store tạo tối thiểu 3 cuốn sách cho MỖI danh mục, với format BOTH (vừa sách giấy vừa ebook)
 * Sách sẽ được insert trực tiếp vào commerce_db với status PUBLISHED
 */
const path = require('path');
const { PrismaClient } = require(path.join('E:/HuKi/platform', 'apps/commerce-service/prisma/generated/client/index.js'));

const prisma = new PrismaClient();

// 2 Stores hiện có
const STORE_1 = {
  id: '3094e54e-2549-42cc-92fb-14a8f8589277',
  ownerId: '8d501a4d-d846-45bd-8f15-fda4e30cf826',
  name: 'Trí Tuệ Việt',
  publisherId: 'p0000001-0000-4000-8000-000000000001', // Trí Tuệ Việt Books
};

const STORE_2 = {
  id: '45b83dd0-b54b-48dd-adef-31efc1e540c7',
  ownerId: '772dad29-47d9-4aba-b3c7-e252733ace41',
  name: 'New Seller',
  publisherId: '0df2754d-576f-4e83-811d-fd4d4ed25eba', // NXB Trẻ
};

// Helper: tạo slug từ title
function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
}

function normalizedTitle(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

// Helper: random ISBN
function randomISBN() {
  return `978-${Math.floor(Math.random() * 9 + 1)}${Math.floor(Math.random() * 1e11)
    .toString()
    .padStart(11, '0')}`;
}

// Ảnh bìa theo category - dùng Unsplash chất lượng cao
const COVERS = {
  'van-hoc': [
    'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80',
  ],
  'kinh-te': [
    'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&auto=format&fit=crop&q=80',
  ],
  'ky-nang': [
    'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1519791883288-dc8bd696e667?w=600&auto=format&fit=crop&q=80',
  ],
  'cong-nghe': [
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=600&auto=format&fit=crop&q=80',
  ],
  'thieu-nhi': [
    'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1629997346995-a0a0d0b33b34?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1626614922810-a1f0c4f1b2f5?w=600&auto=format&fit=crop&q=80',
  ],
  'tam-ly': [
    'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1495640452828-3ddd3a51d4b9?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1535905557558-afc4877a26fc?w=600&auto=format&fit=crop&q=80',
  ],
  'manga': [
    'https://images.unsplash.com/photo-1612036782180-6f0822045d23?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1569701848950-37b3dd88d8b6?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1613376025943-9e4e1b3736a3?w=600&auto=format&fit=crop&q=80',
  ],
  'lich-su': [
    'https://images.unsplash.com/photo-1461360228754-6e81c478b882?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=600&auto=format&fit=crop&q=80',
  ],
};

// ===================================================================
// Định nghĩa sách cho STORE 1: Trí Tuệ Việt (24 cuốn = 8 loại x 3 cuốn)
// ===================================================================
const STORE_1_BOOKS = [
  // VĂN HỌC - 3 cuốn
  {
    title: 'Người Đàn Ông Mang Tên Ove',
    author: 'Fredrik Backman',
    description: 'Câu chuyện cảm động về một ông lão cứng đầu, khó tính nhưng ẩn sâu bên trong là trái tim ấm áp. Một tác phẩm văn học Bắc Âu chạm đến tận cùng cảm xúc.',
    price: 145000,
    originalPrice: 185000,
    categoryId: 'cat-van-hoc',
    cover: COVERS['van-hoc'][0],
    format: 'BOTH',
    stock: 50,
    pageCount: 380,
  },
  {
    title: 'Trăm Năm Cô Đơn (Bản Đặc Biệt)',
    author: 'Gabriel García Márquez',
    description: 'Kiệt tác văn học Mỹ Latin, kể về thế hệ dòng họ Buendía qua một thế kỷ đầy biến động tại làng Macondo huyền thoại. Được trao giải Nobel Văn học 1982.',
    price: 195000,
    originalPrice: 245000,
    categoryId: 'cat-van-hoc',
    cover: COVERS['van-hoc'][1],
    format: 'BOTH',
    stock: 35,
    pageCount: 480,
  },
  {
    title: 'Rừng Na Uy - Norwegian Wood',
    author: 'Haruki Murakami',
    description: 'Câu chuyện tình yêu đầy hoài niệm của Toru Watanabe với Naoko - một cô gái trẻ đầy bí ẩn. Một bản tình ca tuyệt đẹp về tuổi trẻ và sự mất mát.',
    price: 168000,
    originalPrice: 210000,
    categoryId: 'cat-van-hoc',
    cover: COVERS['van-hoc'][2],
    format: 'BOTH',
    stock: 60,
    pageCount: 392,
  },

  // KINH TẾ - 3 cuốn
  {
    title: 'Tâm Lý Học Về Tiền - The Psychology of Money',
    author: 'Morgan Housel',
    description: 'Những bài học về tiền bạc và sự giàu có, được viết bằng những câu chuyện ngắn gọn, dễ hiểu. Cuốn sách giúp bạn thay đổi hoàn toàn cách nhìn về tài chính cá nhân.',
    price: 159000,
    originalPrice: 199000,
    categoryId: 'cat-kinh-doanh-tech',
    cover: COVERS['kinh-te'][0],
    format: 'BOTH',
    stock: 100,
    pageCount: 256,
  },
  {
    title: 'Nhà Đầu Tư Thông Minh - The Intelligent Investor',
    author: 'Benjamin Graham',
    description: 'Cuốn sách gối đầu giường của Warren Buffett, hướng dẫn nguyên tắc đầu tư giá trị và quản lý rủi ro. Bản gốc của mọi chiến lược đầu tư tài chính hiện đại.',
    price: 285000,
    originalPrice: 350000,
    categoryId: 'cat-kinh-doanh-tech',
    cover: COVERS['kinh-te'][1],
    format: 'BOTH',
    stock: 40,
    pageCount: 640,
  },
  {
    title: 'Cha Giàu Cha Nghèo - Rich Dad Poor Dad',
    author: 'Robert Kiyosaki',
    description: 'Câu chuyện về hai người cha với hai quan niệm khác nhau về tiền bạc, dạy bạn cách tư duy để trở nên giàu có và đạt được tự do tài chính.',
    price: 135000,
    originalPrice: 175000,
    categoryId: 'cat-kinh-doanh-tech',
    cover: COVERS['kinh-te'][2],
    format: 'BOTH',
    stock: 80,
    pageCount: 336,
  },

  // KỸ NĂNG SỐNG - 3 cuốn
  {
    title: 'Atomic Habits - Thay Đổi Tí Hon, Hiệu Quả Bất Ngờ',
    author: 'James Clear',
    description: 'Hệ thống phương pháp xây dựng thói quen tích cực, từ những thay đổi nhỏ nhất để tạo nên kết quả vĩ đại. Đã bán hơn 10 triệu bản trên toàn thế giới.',
    price: 189000,
    originalPrice: 235000,
    categoryId: 'cat-tam-ly-ky-nang',
    cover: COVERS['ky-nang'][0],
    format: 'BOTH',
    stock: 120,
    pageCount: 320,
  },
  {
    title: '7 Thói Quen Hiệu Quả - The 7 Habits',
    author: 'Stephen R. Covey',
    description: '7 nguyên tắc vàng để trở nên hiệu quả trong công việc và cuộc sống. Một trong những cuốn sách self-help kinh điển nhất mọi thời đại.',
    price: 215000,
    originalPrice: 268000,
    categoryId: 'cat-tam-ly-ky-nang',
    cover: COVERS['ky-nang'][1],
    format: 'BOTH',
    stock: 70,
    pageCount: 396,
  },
  {
    title: 'Đắc Nhân Tâm - How to Win Friends',
    author: 'Dale Carnegie',
    description: 'Nghệ thuật thu phục lòng người và xây dựng các mối quan hệ. Cuốn sách self-help bán chạy nhất mọi thời đại với hàng triệu bản được xuất bản.',
    price: 125000,
    originalPrice: 158000,
    categoryId: 'cat-tam-ly-ky-nang',
    cover: COVERS['ky-nang'][2],
    format: 'BOTH',
    stock: 150,
    pageCount: 320,
  },

  // CÔNG NGHỆ - 3 cuốn
  {
    title: 'AI 2041: 10 Viễn Cảnh Tương Lai',
    author: 'Kai-Fu Lee',
    description: 'Mười câu chuyện viễn tưởng về tương lai của Trí tuệ nhân tạo, kèm theo phân tích chuyên sâu từ chuyên gia hàng đầu thế giới. Một cái nhìn toàn diện về kỷ nguyên AI.',
    price: 215000,
    originalPrice: 268000,
    categoryId: 'cat-kinh-doanh-tech',
    cover: COVERS['cong-nghe'][0],
    format: 'BOTH',
    stock: 45,
    pageCount: 480,
  },
  {
    title: 'Clean Code - Mã Sạch Thực Chiến',
    author: 'Robert C. Martin',
    description: 'Cẩm nang thiết yếu cho mọi lập trình viên, hướng dẫn viết code sạch, dễ đọc, dễ bảo trì. Từ tác giả huyền thoại "Uncle Bob" với hơn 50 năm kinh nghiệm.',
    price: 245000,
    originalPrice: 320000,
    categoryId: 'cat-kinh-doanh-tech',
    cover: COVERS['cong-nghe'][1],
    format: 'BOTH',
    stock: 30,
    pageCount: 464,
  },
  {
    title: 'Designing Data-Intensive Applications',
    author: 'Martin Kleppmann',
    description: 'Cuốn sách kinh điển về thiết kế hệ thống phân tán và xử lý dữ liệu quy mô lớn. Bắt buộc phải đọc cho các kỹ sư backend và data engineer chuyên nghiệp.',
    price: 320000,
    originalPrice: 420000,
    categoryId: 'cat-kinh-doanh-tech',
    cover: COVERS['cong-nghe'][2],
    format: 'BOTH',
    stock: 25,
    pageCount: 616,
  },

  // THIẾU NHI - 3 cuốn
  {
    title: 'Dế Mèn Phiêu Lưu Ký (Bản Màu Minh Họa 2024)',
    author: 'Tô Hoài',
    description: 'Tác phẩm văn học thiếu nhi kinh điển của Việt Nam, kể về cuộc phiêu lưu của chú Dế Mèn. Bản minh họa màu mới với hình ảnh sống động, hấp dẫn.',
    price: 145000,
    originalPrice: 180000,
    categoryId: 'c0000006-0000-4000-8000-000000000006',
    cover: COVERS['thieu-nhi'][0],
    format: 'BOTH',
    stock: 90,
    pageCount: 256,
  },
  {
    title: 'Hoàng Tử Bé - The Little Prince (Bản Song Ngữ)',
    author: 'Antoine de Saint-Exupéry',
    description: 'Câu chuyện triết lý sâu sắc dành cho mọi lứa tuổi, về tình bạn, tình yêu và ý nghĩa cuộc sống. Bản song ngữ Việt-Anh giúp trẻ học ngoại ngữ.',
    price: 95000,
    originalPrice: 125000,
    categoryId: 'c0000006-0000-4000-8000-000000000006',
    cover: COVERS['thieu-nhi'][1],
    format: 'BOTH',
    stock: 110,
    pageCount: 128,
  },
  {
    title: 'Cây Cam Ngọt Của Tôi (Thiếu Nhi)',
    author: 'José Mauro de Vasconcelos',
    description: 'Câu chuyện cảm động về cậu bé Zeze 5 tuổi với trí thông minh và trái tim nhạy cảm. Một tác phẩm văn học thiếu nhi kinh điển của Brazil.',
    price: 108000,
    originalPrice: 138000,
    categoryId: 'c0000006-0000-4000-8000-000000000006',
    cover: COVERS['thieu-nhi'][2],
    format: 'BOTH',
    stock: 75,
    pageCount: 240,
  },

  // TÂM LÝ - 3 cuốn
  {
    title: 'Tư Duy Nhanh Và Chậm - Thinking, Fast and Slow',
    author: 'Daniel Kahneman',
    description: 'Khám phá hai hệ thống tư duy của con người và cách chúng ảnh hưởng đến quyết định. Tác phẩm đoạt giải Nobel Kinh tế 2002, thay đổi cách chúng ta hiểu về tâm lý.',
    price: 245000,
    originalPrice: 320000,
    categoryId: 'cat-tam-ly-ky-nang',
    cover: COVERS['tam-ly'][0],
    format: 'BOTH',
    stock: 55,
    pageCount: 499,
  },
  {
    title: 'Hiểu Về Trái Tim - Minh Triết Trong Đời Sống',
    author: 'Thích Minh Niệm',
    description: 'Cuốn sách về tâm linh và cuộc sống của Thiền sư Thích Minh Niệm. Hướng dẫn cách tìm bình an trong tâm hồn, sống tỉnh thức và yêu thương.',
    price: 145000,
    originalPrice: 185000,
    categoryId: 'cat-tam-ly-ky-nang',
    cover: COVERS['tam-ly'][1],
    format: 'BOTH',
    stock: 95,
    pageCount: 580,
  },
  {
    title: 'Dám Bị Ghét - The Courage to Be Disliked',
    author: 'Ichiro Kishimi & Fumitake Koga',
    description: 'Cuốn sách theo triết lý Adler, giúp bạn tự do khỏi những ràng buộc của quá khứ, dám sống là chính mình và không cần sự chấp thuận của người khác.',
    price: 118000,
    originalPrice: 148000,
    categoryId: 'cat-tam-ly-ky-nang',
    cover: COVERS['tam-ly'][2],
    format: 'BOTH',
    stock: 85,
    pageCount: 288,
  },

  // MANGA - 3 cuốn
  {
    title: 'Chuyện Con Mèo Dạy Hải Âu Bay (Manga)',
    author: 'Luis Sepúlveda',
    description: 'Phiên bản truyện tranh của cuốn tiểu thuyết nổi tiếng, kể về tình bạn bất ngờ giữa chú mèo Zorba và chim hải âu nhỏ. Tranh minh họa đẹp mắt.',
    price: 85000,
    originalPrice: 110000,
    categoryId: 'cat-manga-comic',
    cover: COVERS['manga'][0],
    format: 'PHYSICAL',
    stock: 60,
    pageCount: 168,
  },
  {
    title: 'One Piece - Tập 1: Romance Dawn (Bản Tiếng Việt)',
    author: 'Eiichiro Oda',
    description: 'Khởi đầu cuộc phiêu lưu của Luffy và băng Mũ Rơm trên Grand Line. Manga bán chạy nhất mọi thời đại, phiên bản tiếng Việt chính thức.',
    price: 28000,
    originalPrice: 35000,
    categoryId: 'cat-manga-comic',
    cover: COVERS['manga'][1],
    format: 'PHYSICAL',
    stock: 200,
    pageCount: 220,
  },
  {
    title: 'Naruto - Tập 1: Uzumaki Naruto (Bản Tiếng Việt)',
    author: 'Masashi Kishimoto',
    description: 'Câu chuyện về cậu bé Naruto mang trong mình con cáo chín đuôi. Tác phẩm manga kinh điển đã chinh phục hàng triệu độc giả trên toàn thế giới.',
    price: 28000,
    originalPrice: 35000,
    categoryId: 'cat-manga-comic',
    cover: COVERS['manga'][2],
    format: 'PHYSICAL',
    stock: 180,
    pageCount: 192,
  },

  // LỊCH SỬ - 3 cuốn
  {
    title: 'Sapiens: Lược Sử Loài Người',
    author: 'Yuval Noah Harari',
    description: 'Câu chuyện về hành trình 70.000 năm tiến hóa của loài người, từ thời kỳ đồ đá đến thời đại AI. Tác phẩm bán chại nhất thế giới đã thay đổi cách chúng ta nhìn lịch sử.',
    price: 235000,
    originalPrice: 295000,
    categoryId: 'c0000005-0000-4000-8000-000000000005',
    cover: COVERS['lich-su'][0],
    format: 'BOTH',
    stock: 50,
    pageCount: 544,
  },
  {
    title: 'Homo Deus: Lược Sử Tương Lai',
    author: 'Yuval Noah Harari',
    description: 'Phần tiếp theo của Sapiens, khám phá tương lai của nhân loại trong kỷ nguyên AI và công nghệ sinh học. Một góc nhìn sâu sắc về định mệnh loài người.',
    price: 245000,
    originalPrice: 310000,
    categoryId: 'c0000005-0000-4000-8000-000000000005',
    cover: COVERS['lich-su'][1],
    format: 'BOTH',
    stock: 40,
    pageCount: 528,
  },
  {
    title: '21 Bài Học Cho Thế Kỷ 21',
    author: 'Yuval Noah Harari',
    description: 'Tập hợp những bài học quý giá về công nghệ, chính trị, tôn giáo và ý nghĩa cuộc sống trong thế kỷ 21. Cuốn sách phải đọc cho ai muốn hiểu thế giới hiện đại.',
    price: 218000,
    originalPrice: 275000,
    categoryId: 'c0000005-0000-4000-8000-000000000005',
    cover: COVERS['lich-su'][2],
    format: 'BOTH',
    stock: 45,
    pageCount: 448,
  },
];

// ===================================================================
// Định nghĩa sách cho STORE 2: New Seller (24 cuốn = 8 loại x 3 cuốn)
// ===================================================================
const STORE_2_BOOKS = [
  // VĂN HỌC - 3 cuốn
  {
    title: 'Nhà Giả Kim - The Alchemist (Bản Đặc Biệt Bìa Cứng)',
    author: 'Paulo Coelho',
    description: 'Câu chuyện về cậu bé chăn cừu Santiago và cuộc hành trình tìm kiếm kho báu. Một trong những cuốn sách bán chạy nhất lịch sử với hơn 200 triệu bản.',
    price: 145000,
    originalPrice: 185000,
    categoryId: 'cat-van-hoc',
    cover: COVERS['van-hoc'][0],
    format: 'BOTH',
    stock: 80,
    pageCount: 228,
  },
  {
    title: 'Ông Già Và Biển Cả - The Old Man and the Sea',
    author: 'Ernest Hemingway',
    description: 'Tác phẩm đoạt giải Nobel Văn học 1954, kể về cuộc chiến đấu kiên cường của ông lão đánh cá với con cá kiếm khổng lồ. Một bản anh hùng ca về ý chí con người.',
    price: 95000,
    originalPrice: 125000,
    categoryId: 'cat-van-hoc',
    cover: COVERS['van-hoc'][1],
    format: 'BOTH',
    stock: 50,
    pageCount: 128,
  },
  {
    title: 'Tôi Thấy Hoa Vàng Trên Cỏ Xanh (Bìa Cứng)',
    author: 'Nguyễn Nhật Ánh',
    description: 'Tác phẩm văn học thiếu nhi kinh điển của Việt Nam, kể về tuổi thơ đầy mơ mộng ở miền quê. Phiên bản bìa cứng đặc biệt với tranh minh họa tuyệt đẹp.',
    price: 168000,
    originalPrice: 210000,
    categoryId: 'cat-van-hoc',
    cover: COVERS['van-hoc'][2],
    format: 'BOTH',
    stock: 100,
    pageCount: 376,
  },

  // KINH TẾ - 3 cuốn
  {
    title: 'Nghĩ Giàu & Làm Giàu - Think and Grow Rich',
    author: 'Napoleon Hill',
    description: 'Cuốn sách self-help bán chạy nhất mọi thời đại với hơn 100 triệu bản, tổng hợp 13 nguyên tắc để đạt được sự giàu có và thành công từ 500+ triệu phú.',
    price: 165000,
    originalPrice: 205000,
    categoryId: 'cat-kinh-doanh-tech',
    cover: COVERS['kinh-te'][0],
    format: 'BOTH',
    stock: 90,
    pageCount: 320,
  },
  {
    title: 'Chiến Tranh Tiền Tệ - Currency Wars',
    author: 'Song Hong Bing',
    description: 'Khám phá lịch sử các cuộc chiến tiền tệ toàn cầu và tác động của chúng đến kinh tế thế giới. Một cuốn sách quan trọng cho ai muốn hiểu về tài chính quốc tế.',
    price: 195000,
    originalPrice: 248000,
    categoryId: 'cat-kinh-doanh-tech',
    cover: COVERS['kinh-te'][1],
    format: 'BOTH',
    stock: 60,
    pageCount: 480,
  },
  {
    title: 'Bước Đi Ngẫu Nhiên Trên Phố Wall',
    author: 'Burton G. Malkiel',
    description: 'Bí quyết đầu tư chứng khoán hiệu quả và bền vững qua thời gian. Cuốn sách giáo khoa kinh điển cho mọi nhà đầu tư từ người mới đến chuyên nghiệp.',
    price: 215000,
    originalPrice: 268000,
    categoryId: 'cat-kinh-doanh-tech',
    cover: COVERS['kinh-te'][2],
    format: 'BOTH',
    stock: 50,
    pageCount: 416,
  },

  // KỸ NĂNG SỐNG - 3 cuốn
  {
    title: 'Nghĩ Nhanh & Chậm Trong Công Việc',
    author: 'Daniel Kahneman',
    description: 'Ứng dụng tâm lý học hành vi vào quyết định kinh doanh, giúp nhà quản lý đưa ra quyết định sáng suốt hơn trong môi trường áp lực cao.',
    price: 195000,
    originalPrice: 245000,
    categoryId: 'cat-tam-ly-ky-nang',
    cover: COVERS['ky-nang'][0],
    format: 'BOTH',
    stock: 40,
    pageCount: 376,
  },
  {
    title: 'Sức Mạnh Của Thói Quen - The Power of Habit',
    author: 'Charles Duhigg',
    description: 'Khám phá khoa học đằng sau thói quen và cách thay đổi chúng để cải thiện cuộc sống, công việc và kinh doanh. Best-seller New York Times 2012.',
    price: 165000,
    originalPrice: 205000,
    categoryId: 'cat-tam-ly-ky-nang',
    cover: COVERS['ky-nang'][1],
    format: 'BOTH',
    stock: 70,
    pageCount: 408,
  },
  {
    title: 'Deep Work - Làm Việc Sâu',
    author: 'Cal Newport',
    description: 'Bí quyết tập trung làm việc sâu trong thời đại kỹ thuật số đầy phân tâm. Cuốn sách thay đổi cách làm việc của hàng triệu chuyên gia trên thế giới.',
    price: 158000,
    originalPrice: 198000,
    categoryId: 'cat-tam-ly-ky-nang',
    cover: COVERS['ky-nang'][2],
    format: 'BOTH',
    stock: 55,
    pageCount: 296,
  },

  // CÔNG NGHỆ - 3 cuốn
  {
    title: 'Chip War: Cuộc Chiến Vi Mạch Toàn Cầu',
    author: 'Chris Miller',
    description: 'Câu chuyện về cuộc chiến địa chính trị xung quanh ngành công nghiệp bán dẫn, từ Đài Loan đến Mỹ và Trung Quốc. Tác phẩm nổi bật nhất năm 2022.',
    price: 245000,
    originalPrice: 305000,
    categoryId: 'cat-kinh-doanh-tech',
    cover: COVERS['cong-nghe'][0],
    format: 'BOTH',
    stock: 40,
    pageCount: 432,
  },
  {
    title: 'System Design Interview - Volume 1',
    author: 'Alex Xu',
    description: 'Cẩm nang thiết yếu cho phỏng vấn thiết kế hệ thống tại các công ty công nghệ lớn. Hơn 100.000 bản được bán trên toàn thế giới.',
    price: 295000,
    originalPrice: 380000,
    categoryId: 'cat-kinh-doanh-tech',
    cover: COVERS['cong-nghe'][1],
    format: 'BOTH',
    stock: 35,
    pageCount: 320,
  },
  {
    title: 'The Pragmatic Programmer',
    author: 'David Thomas & Andrew Hunt',
    description: 'Cuốn sách kinh điển về nghề lập trình, dạy bạn cách trở thành một lập trình viên chuyên nghiệp và xây dựng phần mềm chất lượng cao. Ấn bản 20 năm.',
    price: 268000,
    originalPrice: 340000,
    categoryId: 'cat-kinh-doanh-tech',
    cover: COVERS['cong-nghe'][2],
    format: 'BOTH',
    stock: 30,
    pageCount: 352,
  },

  // THIẾU NHI - 3 cuốn
  {
    title: 'Pipi Tất Dài - Astrid Lindgren',
    author: 'Astrid Lindgren',
    description: 'Câu chuyện về cô bé Pipi mạnh mẽ, độc lập với mái tóc đỏ và đôi tất dài khác biệt. Tác phẩm thiếu nhi kinh điển của Thụy Điển đã chinh phục hàng triệu trẻ em.',
    price: 98000,
    originalPrice: 125000,
    categoryId: 'c0000006-0000-4000-8000-000000000006',
    cover: COVERS['thieu-nhi'][0],
    format: 'BOTH',
    stock: 70,
    pageCount: 224,
  },
  {
    title: 'Winnie-the-Pooh - Gấu Pooh',
    author: 'A.A. Milne',
    description: 'Cuộc phiêu lưu đáng yêu của Gấu Pooh và những người bạn trong Rừng Trăm Mẫu. Tác phẩm thiếu nhi kinh điển đã được yêu thích qua nhiều thế hệ.',
    price: 85000,
    originalPrice: 110000,
    categoryId: 'c0000006-0000-4000-8000-000000000006',
    cover: COVERS['thieu-nhi'][1],
    format: 'BOTH',
    stock: 60,
    pageCount: 160,
  },
  {
    title: 'Alice Ở Xứ Sở Diệu Kỳ',
    author: 'Lewis Carroll',
    description: 'Câu chuyện về cô bé Alice rơi vào thế giới thần tiên đầy màu sắc và những nhân vật kỳ lạ. Tác phẩm fantasy kinh điển đã ảnh hưởng đến văn hóa đại chúng toàn cầu.',
    price: 105000,
    originalPrice: 135000,
    categoryId: 'c0000006-0000-4000-8000-000000000006',
    cover: COVERS['thieu-nhi'][2],
    format: 'BOTH',
    stock: 50,
    pageCount: 192,
  },

  // TÂM LÝ - 3 cuốn
  {
    title: 'Muôn Kiếp Nhân Sinh',
    author: 'Nguyên Phong',
    description: 'Cuốn sách về nhân quả, luân hồi và ý nghĩa của cuộc sống qua góc nhìn tâm linh. Best-seller Việt Nam với hơn 500.000 bản được bán ra.',
    price: 168000,
    originalPrice: 210000,
    categoryId: 'cat-tam-ly-ky-nang',
    cover: COVERS['tam-ly'][0],
    format: 'BOTH',
    stock: 80,
    pageCount: 504,
  },
  {
    title: 'Không Diệt Không Sinh Đừng Sợ Hãi',
    author: 'Thích Nhất Hạnh',
    description: 'Tuyển tập những lời dạy của Thiền sư Thích Nhất Hạnh về sự sống, cái chết và tình thương. Một cuốn sách chữa lành tâm hồn sâu sắc.',
    price: 128000,
    originalPrice: 160000,
    categoryId: 'cat-tam-ly-ky-nang',
    cover: COVERS['tam-ly'][1],
    format: 'BOTH',
    stock: 65,
    pageCount: 392,
  },
  {
    title: 'Trên Đỉnh Phố Wall - One Up On Wall Street',
    author: 'Peter Lynch',
    description: 'Bí quyết đầu tư chứng khoán từ huyền thoại quản lý quỹ Peter Lynch. Cách nhận diện cổ phiếu 10-bagger từ những quan sát thường ngày.',
    price: 195000,
    originalPrice: 245000,
    categoryId: 'cat-tam-ly-ky-nang',
    cover: COVERS['tam-ly'][2],
    format: 'BOTH',
    stock: 45,
    pageCount: 384,
  },

  // MANGA - 3 cuốn
  {
    title: 'Spy X Family - Tập 1 (Bản Tiếng Việt)',
    author: 'Tatsuya Endo',
    description: 'Câu chuyện hài hước về gia đình đặc vụ giả mạo với cô vợ sát thủ và cô con gái có năng lực đọc suy nghĩ. Manga hot nhất 2022-2024.',
    price: 32000,
    originalPrice: 40000,
    categoryId: 'cat-manga-comic',
    cover: COVERS['manga'][0],
    format: 'PHYSICAL',
    stock: 150,
    pageCount: 224,
  },
  {
    title: 'Demon Slayer - Thanh Gươm Diệt Quỷ Tập 1',
    author: 'Koyoharu Gotouge',
    description: 'Câu chuyện cảm động về Tanjiro và hành trình trở thành kiếm sĩ diệt quỷ để cứu em gái. Manga bom tấn đã phá kỷ lục doanh thu.',
    price: 32000,
    originalPrice: 40000,
    categoryId: 'cat-manga-comic',
    cover: COVERS['manga'][1],
    format: 'PHYSICAL',
    stock: 180,
    pageCount: 192,
  },
  {
    title: 'Attack on Titan - Tập 1: Con Chim Để Cứu Thế Giới',
    author: 'Hajime Isayama',
    description: 'Bộ manga huyền thoại về cuộc chiến sinh tồn của nhân loại trước những Titan khổng lồ. Câu chuyện đen tối và đầy bất ngờ.',
    price: 32000,
    originalPrice: 40000,
    categoryId: 'cat-manga-comic',
    cover: COVERS['manga'][2],
    format: 'PHYSICAL',
    stock: 160,
    pageCount: 208,
  },

  // LỊCH SỬ - 3 cuốn
  {
    title: 'Lịch Sử Thế Giới - A History of the World',
    author: 'Andrew Marr',
    description: 'Câu chuyện về hành trình phát triển của nhân loại qua 70.000 năm lịch sử, từ thời kỳ đồ đá cũ đến thế kỷ 21. Được BBC dựng thành phim tài liệu.',
    price: 285000,
    originalPrice: 360000,
    categoryId: 'c0000005-0000-4000-8000-000000000005',
    cover: COVERS['lich-su'][0],
    format: 'BOTH',
    stock: 35,
    pageCount: 608,
  },
  {
    title: 'Sapiens và Tương Lai Của Chúng Ta',
    author: 'Yuval Noah Harari',
    description: 'Phiên bản dành cho thanh thiếu niên của Sapiens, dễ đọc hơn nhưng vẫn đầy đủ những ý tưởng lớn về lịch sử và tương lai nhân loại.',
    price: 195000,
    originalPrice: 245000,
    categoryId: 'c0000005-0000-4000-8000-000000000005',
    cover: COVERS['lich-su'][1],
    format: 'BOTH',
    stock: 50,
    pageCount: 416,
  },
  {
    title: 'Lược Sử Tôn Giáo - A History of God',
    author: 'Karen Armstrong',
    description: 'Hành trình 4.000 năm của các tôn giáo lớn trên thế giới, từ Do Thái giáo, Kitô giáo đến Hồi giáo và Phật giáo. Một tác phẩm uyên bác và cân bằng.',
    price: 245000,
    originalPrice: 310000,
    categoryId: 'c0000005-0000-4000-8000-000000000005',
    cover: COVERS['lich-su'][2],
    format: 'BOTH',
    stock: 30,
    pageCount: 512,
  },
];

// ===================================================================
// Helper: tìm hoặc tạo author
// ===================================================================
const AUTHOR_CACHE = new Map();

async function findOrCreateAuthor(name) {
  if (AUTHOR_CACHE.has(name)) return AUTHOR_CACHE.get(name);
  const normalized = name.toLowerCase().trim();
  let author = await prisma.author.findFirst({ where: { normalizedName: normalized } });
  if (!author) {
    author = await prisma.author.create({
      data: {
        name,
        normalizedName: normalized,
        slug: slugify(name) + '-' + Math.random().toString(36).substring(2, 8),
      },
    });
  }
  AUTHOR_CACHE.set(name, author);
  return author;
}

// ===================================================================
// Main: insert sách
// ===================================================================
async function seedBooksForStore(store, books) {
  console.log(`\n[SEEDING] ${store.name} (${store.id})`);
  let successCount = 0;
  let skippedCount = 0;

  for (const book of books) {
    try {
      // Kiểm tra đã tồn tại chưa
      const slug = slugify(book.title);
      const existing = await prisma.book.findFirst({
        where: { storeId: store.id, slug },
      });
      if (existing) {
        console.log(`  [SKIP] "${book.title}" - đã tồn tại`);
        skippedCount++;
        continue;
      }

      // Tìm/tạo author
      const author = await findOrCreateAuthor(book.author);

      // Tạo sách
      const createdBook = await prisma.book.create({
        data: {
          storeId: store.id,
          ownerUserId: store.ownerId,
          title: book.title,
          slug,
          normalizedTitle: normalizedTitle(book.title),
          isbn: randomISBN(),
          description: book.description,
          price: book.price,
          categoryId: book.categoryId,
          authorId: author.id,
          publisherId: store.publisherId,
          format: book.format,
          coverUrl: book.cover,
          status: 'PUBLISHED',
          publishedAt: new Date(),
          viewCount: Math.floor(Math.random() * 500) + 50,
        },
      });

      // Tạo PhysicalBookDetails nếu cần
      if (book.format === 'PHYSICAL' || book.format === 'BOTH') {
        await prisma.physicalBookDetails.create({
          data: {
            bookId: createdBook.id,
            stock: book.stock,
            reserved: 0,
            weight: 350 + Math.floor(Math.random() * 200),
            dimensions: '14 x 20.5 cm',
            pageCount: book.pageCount,
            physicalEnabled: true,
          },
        });
      }

      // Tạo DigitalBookDetails nếu cần
      if (book.format === 'DIGITAL' || book.format === 'BOTH') {
        await prisma.digitalBookDetails.create({
          data: {
            bookId: createdBook.id,
            digitalEnabled: true,
            accessType: 'FREE',
          },
        });
      }

      console.log(`  [OK] "${book.title}" - ${book.price.toLocaleString('vi-VN')}₫ (${book.format})`);
      successCount++;
    } catch (err) {
      console.error(`  [ERROR] "${book.title}":`, err.message);
    }
  }

  console.log(`[DONE] ${store.name}: ${successCount} thành công, ${skippedCount} bỏ qua`);
  return { successCount, skippedCount };
}

async function main() {
  console.log('=== BẮT ĐẦU SEED SÁCH CHO 2 DOANH NGHIỆP ===\n');
  console.log(`Thời gian: ${new Date().toISOString()}\n`);

  const r1 = await seedBooksForStore(STORE_1, STORE_1_BOOKS);
  const r2 = await seedBooksForStore(STORE_2, STORE_2_BOOKS);

  console.log('\n=== TỔNG KẾT ===');
  console.log(`Store 1 (${STORE_1.name}): ${r1.successCount} cuốn mới, ${r1.skippedCount} bỏ qua`);
  console.log(`Store 2 (${STORE_2.name}): ${r2.successCount} cuốn mới, ${r2.skippedCount} bỏ qua`);
  console.log(`Tổng: ${r1.successCount + r2.successCount} cuốn sách mới được thêm vào DB`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('SEED ERROR:', e);
  process.exit(1);
});
