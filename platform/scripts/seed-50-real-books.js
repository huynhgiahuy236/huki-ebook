const { Client } = require('pg');

const SELLER_EMAIL = 'phuongthuy@gmail.com';
const OWNER_USER_ID = '8d501a4d-d846-45bd-8f15-fda4e30cf826';
const STORE_ID = '3094e54e-2549-42cc-92fb-14a8f8589277';

const CATEGORIES_DATA = [
  { id: 'cat-van-hoc', name: 'Văn học', normalizedName: 'van hoc', slug: 'van-hoc', desc: 'Tiểu thuyết, văn học kinh điển, tản văn, trinh thám' },
  { id: 'cat-tam-ly-ky-nang', name: 'Tâm lý & Kỹ năng', normalizedName: 'tam ly & ky nang', slug: 'tam-ly-ky-nang', desc: 'Phát triển bản thân, tâm lý học, giao tiếp, kỹ năng sống' },
  { id: 'cat-kinh-doanh-tech', name: 'Kinh doanh & Tech', normalizedName: 'kinh doanh & tech', slug: 'kinh-doanh-tech', desc: 'Kinh tế, khởi nghiệp, đầu tư, lập trình, công nghệ AI' },
  { id: 'cat-tri-thuc', name: 'Tri thức & Khoa học', normalizedName: 'tri thuc & khoa hoc', slug: 'tri-thuc', desc: 'Lịch sử, triết học, khoa học thường thức, vũ trụ học' },
  { id: 'cat-manga-comic', name: 'Manga & Khác', normalizedName: 'manga & khac', slug: 'manga-comic-khac', desc: 'Manga, comic, light novel, thiếu nhi, giải trí' },
];

const BOOKS_50 = [
  // ==========================================
  // TYPE 1: VĂN HỌC (10 Cuốn)
  // ==========================================
  {
    catId: 'cat-van-hoc',
    title: 'Cây Cam Ngọt Của Tôi',
    slug: 'cay-cam-ngot-cua-toi',
    author: 'José Mauro de Vasconcelos',
    publisher: 'Nhã Nam Books',
    price: 95000,
    coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
    desc: 'Tác phẩm kinh điển cảm động về tuổi thơ nghèo khó nhưng giàu tình yêu thương của chú bé Zezé ở Brazil. Một cuốn sách chạm đến trái tim hàng triệu độc giả toàn cầu.',
    format: 'BOTH',
    pages: 244,
    stock: 120
  },
  {
    catId: 'cat-van-hoc',
    title: 'Nhà Giả Kim (The Alchemist)',
    slug: 'nha-gia-kim-the-alchemist',
    author: 'Paulo Coelho',
    publisher: 'Nhã Nam Books',
    price: 79000,
    coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80',
    desc: 'Hành trình theo đuổi vận mệnh và giấc mơ của chàng chăn cừu Santiago. Khi bạn thực sự mong muốn một điều gì đó, cả vũ trụ sẽ hợp sức giúp bạn đạt được.',
    format: 'BOTH',
    pages: 228,
    stock: 150
  },
  {
    catId: 'cat-van-hoc',
    title: 'Hoàng Tử Bé (Le Petit Prince)',
    slug: 'hoang-tu-be-le-petit-prince',
    author: 'Antoine de Saint-Exupéry',
    publisher: 'Nhã Nam Books',
    price: 68000,
    coverUrl: 'https://images.unsplash.com/photo-1532012164546-f432f2e3edd3?w=600&auto=format&fit=crop&q=80',
    desc: 'Kiệt tác văn học thiếu nhi dành cho người lớn. Bài học sâu sắc về tình bạn, tình yêu và những điều giản dị chỉ có thể cảm nhận bằng trái tim.',
    format: 'BOTH',
    pages: 110,
    stock: 200
  },
  {
    catId: 'cat-van-hoc',
    title: 'Chiến Binh Cầu Vồng',
    slug: 'chien-binh-cau-vong',
    author: 'Andrea Hirata',
    publisher: 'Nhã Nam Books',
    price: 109000,
    coverUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=600&auto=format&fit=crop&q=80',
    desc: 'Câu chuyện phi thường về tinh thần hiếu học của 10 đứa trẻ nghèo trên hòn đảo Belitong (Indonesia) cùng người thầy tận tụy.',
    format: 'PHYSICAL',
    pages: 428,
    stock: 80
  },
  {
    catId: 'cat-van-hoc',
    title: 'Tôi Thấy Hoa Vàng Trên Cỏ Xanh',
    slug: 'toi-thay-hoa-vang-tren-co-xanh',
    author: 'Nguyễn Nhật Ánh',
    publisher: 'Nhà Xuất Bản Trẻ',
    price: 125000,
    coverUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80',
    desc: 'Bức tranh đồng quê tuổi thơ ngọt ngào, hoài niệm với những rung động đầu đời, tình anh em và tình người ấm áp.',
    format: 'BOTH',
    pages: 378,
    stock: 100
  },
  {
    catId: 'cat-van-hoc',
    title: 'Rừng Na Uy (Norwegian Wood)',
    slug: 'rung-na-uy-norwegian-wood',
    author: 'Haruki Murakami',
    publisher: 'Nhã Nam Books',
    price: 135000,
    coverUrl: 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=600&auto=format&fit=crop&q=80',
    desc: 'Tác phẩm kinh điển về nỗi cô đơn, tình yêu, mất mát và sự trưởng thành của thế hệ trẻ Tokyo những năm 1960.',
    format: 'BOTH',
    pages: 552,
    stock: 90
  },
  {
    catId: 'cat-van-hoc',
    title: 'Hai Số Phận (Kane and Abel)',
    slug: 'hai-so-phan-kane-and-abel',
    author: 'Jeffrey Archer',
    publisher: 'Trí Tuệ Việt Books',
    price: 165000,
    coverUrl: 'https://images.unsplash.com/photo-1495640388908-05fa85288e61?w=600&auto=format&fit=crop&q=80',
    desc: 'Hai con người sinh cùng một ngày, một người sinh ra trong nhung lụa nước Mỹ, một người trốn chạy từ trại tập trung Ba Lan, định mệnh đưa họ đối đầu.',
    format: 'BOTH',
    pages: 680,
    stock: 65
  },
  {
    catId: 'cat-van-hoc',
    title: 'Điều Kỳ Diệu Ở Tiệm Tạp Hóa Namiya',
    slug: 'dieu-ky-dieu-o-tiem-tap-hoa-namiya',
    author: 'Keigo Higashino',
    publisher: 'Nhã Nam Books',
    price: 115000,
    coverUrl: 'https://images.unsplash.com/photo-1491841550275-ad7854e35ca6?w=600&auto=format&fit=crop&q=80',
    desc: 'Những lá thư tư vấn vượt không gian và thời gian gắn kết số phận của những con người đang lạc lối tìm thấy niềm tin vào cuộc sống.',
    format: 'BOTH',
    pages: 360,
    stock: 110
  },
  {
    catId: 'cat-van-hoc',
    title: 'Giết Con Chim Nhại (To Kill a Mockingbird)',
    slug: 'giet-con-chim-nhai-to-kill-a-mockingbird',
    author: 'Harper Lee',
    publisher: 'Nhã Nam Books',
    price: 120000,
    coverUrl: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&auto=format&fit=crop&q=80',
    desc: 'Văn học Mỹ kinh điển về công lý, lòng trắc ẩn và sự bao dung qua lăng kính ngây thơ của cô bé Scout.',
    format: 'PHYSICAL',
    pages: 420,
    stock: 75
  },
  {
    catId: 'cat-van-hoc',
    title: 'Những Người Khốn Khổ (Les Misérables)',
    slug: 'nhung-nguoi-khon-kho-les-miserables',
    author: 'Victor Hugo',
    publisher: 'Trí Tuệ Việt Books',
    price: 185000,
    coverUrl: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=600&auto=format&fit=crop&q=80',
    desc: 'Kiệt tác bất hủ của đại văn hào Victor Hugo về hành trình phục thiện của Jean Valjean và tình người cao cả giữa Paris giông bão.',
    format: 'BOTH',
    pages: 820,
    stock: 50
  },

  // ==========================================
  // TYPE 2: TÂM LÝ & KỸ NĂNG (10 Cuốn)
  // ==========================================
  {
    catId: 'cat-tam-ly-ky-nang',
    title: 'Atomic Habits – Thay Đổi Tí Hon Hiệu Quả Bất Ngờ',
    slug: 'atomic-habits-thay-doi-ti-hon',
    author: 'James Clear',
    publisher: 'Trí Tuệ Việt Books',
    price: 149000,
    coverUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80',
    desc: 'Hệ thống xây dựng thói quen tốt và từ bỏ thói quen xấu khoa học, dựa trên quy luật 1% tiến bộ mỗi ngày.',
    format: 'BOTH',
    pages: 350,
    stock: 250
  },
  {
    catId: 'cat-tam-ly-ky-nang',
    title: 'Đắc Nhân Tâm (How To Win Friends & Influence People)',
    slug: 'dac-nhan-tam-how-to-win-friends',
    author: 'Dale Carnegie',
    publisher: 'Trí Tuệ Việt Books',
    price: 86000,
    coverUrl: 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=600&auto=format&fit=crop&q=80',
    desc: 'Nghệ thuật giao tiếp, thấu hiểu và chinh phục lòng người kinh điển nhất mọi thời đại.',
    format: 'BOTH',
    pages: 320,
    stock: 300
  },
  {
    catId: 'cat-tam-ly-ky-nang',
    title: 'Tâm Lý Học Về Tiền (The Psychology of Money)',
    slug: 'tam-ly-hoc-ve-tien-the-psychology-of-money',
    author: 'Morgan Housel',
    publisher: 'Trí Tuệ Việt Books',
    price: 139000,
    coverUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=600&auto=format&fit=crop&q=80',
    desc: '19 câu chuyện ngắn hé lộ cách con người suy nghĩ kỳ quặc về tiền bạc và bài học quản lý tài chính trường tồn.',
    format: 'BOTH',
    pages: 384,
    stock: 180
  },
  {
    catId: 'cat-tam-ly-ky-nang',
    title: 'Tư Duy Nhanh Và Chậm (Thinking, Fast and Slow)',
    slug: 'tu-duy-nhanh-va-cham-thinking-fast-and-slow',
    author: 'Daniel Kahneman',
    publisher: 'Trí Tuệ Việt Books',
    price: 195000,
    coverUrl: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=600&auto=format&fit=crop&q=80',
    desc: 'Giải mã hai hệ thống tư duy chi phối mọi quyết định và phán đoán của con người từ nhà kinh tế học đoạt giải Nobel.',
    format: 'BOTH',
    pages: 610,
    stock: 100
  },
  {
    catId: 'cat-tam-ly-ky-nang',
    title: 'Nghệ Thuật Tinh Tế Của Việc "Kệ Mẹ Nó"',
    slug: 'nghe-thuat-tinh-te-cua-viec-ke-me-no',
    author: 'Mark Manson',
    publisher: 'Trí Tuệ Việt Books',
    price: 105000,
    coverUrl: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=600&auto=format&fit=crop&q=80',
    desc: 'Cách tiếp cận thực tế, thẳng thắn giúp bạn ngừng lo lắng những chuyện không đâu và tập trung vào điều thực sự ý nghĩa.',
    format: 'BOTH',
    pages: 280,
    stock: 140
  },
  {
    catId: 'cat-tam-ly-ky-nang',
    title: 'Deep Work – Làm Ra Làm, Chơi Ra Chơi',
    slug: 'deep-work-lam-ra-lam-choi-ra-choi',
    author: 'Cal Newport',
    publisher: 'Trí Tuệ Việt Books',
    price: 128000,
    coverUrl: 'https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=600&auto=format&fit=crop&q=80',
    desc: 'Quy tắc tập trung sâu đỉnh cao để đạt hiệu suất phi thường trong một thế giới đầy rẫy sự xao nhãng.',
    format: 'BOTH',
    pages: 312,
    stock: 110
  },
  {
    catId: 'cat-tam-ly-ky-nang',
    title: 'Can’t Hurt Me – Vượt Qua Mọi Giới Hạn',
    slug: 'cant-hurt-me-vuot-qua-moi-gioi-han',
    author: 'David Goggins',
    publisher: 'Trí Tuệ Việt Books',
    price: 168000,
    coverUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80',
    desc: 'Làm chủ tâm trí và vượt qua nghịch cảnh cùng cựu lính thủy đánh bộ Navy SEAL kiên cường nhất hành tinh.',
    format: 'PHYSICAL',
    pages: 440,
    stock: 95
  },
  {
    catId: 'cat-tam-ly-ky-nang',
    title: 'Khéo Ăn Nói Sẽ Có Được Thiên Hạ',
    slug: 'kheo-an-noi-se-co-duoc-thien-ha',
    author: 'Trác Nhã',
    publisher: 'Trí Tuệ Việt Books',
    price: 88000,
    coverUrl: 'https://images.unsplash.com/photo-1519791883288-dc8bd696e667?w=600&auto=format&fit=crop&q=80',
    desc: 'Bí quyết giao tiếp thông minh, ứng xử khéo léo trong công việc, tình cảm và cuộc sống thường nhật.',
    format: 'BOTH',
    pages: 368,
    stock: 160
  },
  {
    catId: 'cat-tam-ly-ky-nang',
    title: 'Bí Mật Của May Mắn (Good Luck)',
    slug: 'bi-mat-cua-may-man-good-luck',
    author: 'Álex Rovira',
    publisher: 'Trí Tuệ Việt Books',
    price: 65000,
    coverUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&auto=format&fit=crop&q=80',
    desc: 'Câu chuyện ngụ ngôn đầy cảm hứng về cách tự tạo ra may mắn cho chính cuộc đời mình thông qua sự chuẩn bị kỹ càng.',
    format: 'BOTH',
    pages: 160,
    stock: 130
  },
  {
    catId: 'cat-tam-ly-ky-nang',
    title: 'Dám Bị Ghét (The Courage to be Disliked)',
    slug: 'dam-bi-ghet-the-courage-to-be-disliked',
    author: 'Kishimi Ichiro',
    publisher: 'Nhã Nam Books',
    price: 110000,
    coverUrl: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=600&auto=format&fit=crop&q=80',
    desc: 'Đối thoại triết học dựa trên tâm lý học Adler: Can đảm để tự do, sống đúng với chính mình mà không cần làm hài lòng người khác.',
    format: 'BOTH',
    pages: 336,
    stock: 175
  },

  // ==========================================
  // TYPE 3: KINH DOANH & TECH (10 Cuốn)
  // ==========================================
  {
    catId: 'cat-kinh-doanh-tech',
    title: 'Zero To One – Từ Không Đến Một',
    slug: 'zero-to-one-tu-khong-den-mot',
    author: 'Peter Thiel',
    publisher: 'Trí Tuệ Việt Books',
    price: 129000,
    coverUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&auto=format&fit=crop&q=80',
    desc: 'Bí quyết xây dựng startup đột phá và kiến tạo tương lai độc quyền từ nhà sáng lập PayPal và nhà đầu tư Facebook.',
    format: 'BOTH',
    pages: 260,
    stock: 140
  },
  {
    catId: 'cat-kinh-doanh-tech',
    title: 'Khởi Nghiệp Tinh Gọn (The Lean Startup)',
    slug: 'khoi-nghiep-tinh-gon-the-lean-startup',
    author: 'Eric Ries',
    publisher: 'Trí Tuệ Việt Books',
    price: 138000,
    coverUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80',
    desc: 'Phương pháp luận cốt lõi giúp các doanh nghiệp phát triển sản phẩm nhanh, kiểm chứng giả thuyết và tối ưu nguồn lực.',
    format: 'BOTH',
    pages: 360,
    stock: 120
  },
  {
    catId: 'cat-kinh-doanh-tech',
    title: 'Clean Code – Mã Sạch',
    slug: 'clean-code-ma-sach',
    author: 'Robert C. Martin',
    publisher: 'Trí Tuệ Việt Books',
    price: 245000,
    coverUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80',
    desc: 'Sách gối đầu giường cho lập trình viên về phong cách viết mã chuyên nghiệp, dễ bảo trì và mở rộng.',
    format: 'BOTH',
    pages: 464,
    stock: 90
  },
  {
    catId: 'cat-kinh-doanh-tech',
    title: 'Clean Architecture – Kiến Trúc Sạch',
    slug: 'clean-architecture-kien-truc-sach',
    author: 'Robert C. Martin',
    publisher: 'Trí Tuệ Việt Books',
    price: 260000,
    coverUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80',
    desc: 'Các nguyên tắc thiết kế hệ thống phần mềm tách biệt tầng nghiệp vụ, bền bỉ và sẵn sàng cho kiến trúc Microservices.',
    format: 'BOTH',
    pages: 432,
    stock: 85
  },
  {
    catId: 'cat-kinh-doanh-tech',
    title: 'Designing Data-Intensive Applications',
    slug: 'designing-data-intensive-applications',
    author: 'Martin Kleppmann',
    publisher: 'Trí Tuệ Việt Books',
    price: 320000,
    coverUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80',
    desc: 'Cẩm nang toàn diện về thiết kế hệ thống dữ liệu phân tán: Storage engines, Replication, Partitioning, Transactions, Stream Processing.',
    format: 'BOTH',
    pages: 616,
    stock: 70
  },
  {
    catId: 'cat-kinh-doanh-tech',
    title: 'The Pragmatic Programmer – Lập Trình Viên Thực Dụng',
    slug: 'the-pragmatic-programmer-lap-trinh-vien-thuc-dung',
    author: 'Andrew Hunt',
    publisher: 'Trí Tuệ Việt Books',
    price: 230000,
    coverUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80',
    desc: 'Tư duy thực dụng, kỹ năng nghề nghiệp và lộ trình nâng tầm từ một coder thành một kỹ sư phần mềm xuất chúng.',
    format: 'BOTH',
    pages: 352,
    stock: 80
  },
  {
    catId: 'cat-kinh-doanh-tech',
    title: 'Tỷ Phú Bán Giày (Delivering Happiness)',
    slug: 'ty-phu-ban-giay-delivering-happiness',
    author: 'Tony Hsieh',
    publisher: 'Trí Tuệ Việt Books',
    price: 119000,
    coverUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&auto=format&fit=crop&q=80',
    desc: 'Hành trình xây dựng Zappos thành đế chế bán lẻ tỷ USD với văn hóa phụng sự khách hàng vượt trên mọi kỳ vọng.',
    format: 'BOTH',
    pages: 330,
    stock: 130
  },
  {
    catId: 'cat-kinh-doanh-tech',
    title: 'Nguyên Tắc (Principles for Navigating Big Debt Crises)',
    slug: 'nguyen-tac-principles-ray-dalio',
    author: 'Ray Dalio',
    publisher: 'Trí Tuệ Việt Books',
    price: 290000,
    coverUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&auto=format&fit=crop&q=80',
    desc: 'Bộ quy tắc sống và đầu tư từ nhà sáng lập quỹ đầu cơ lớn nhất thế giới Bridgewater Associates.',
    format: 'BOTH',
    pages: 580,
    stock: 60
  },
  {
    catId: 'cat-kinh-doanh-tech',
    title: 'Trí Tuệ Nhân Tạo 2041 (AI 2041)',
    slug: 'tri-tue-nhan-tao-2041-ai-2041',
    author: 'Kai-Fu Lee',
    publisher: 'Trí Tuệ Việt Books',
    price: 175000,
    coverUrl: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=600&auto=format&fit=crop&q=80',
    desc: '10 viễn cảnh tương lai định hình thế giới trong kỷ nguyên bùng nổ của Trí Tuệ Nhân Tạo và Deep Learning.',
    format: 'BOTH',
    pages: 480,
    stock: 110
  },
  {
    catId: 'cat-kinh-doanh-tech',
    title: 'Marketing Giỏi Phải Kiếm Được Tiền',
    slug: 'marketing-gioi-phai-kiem-duoc-tien',
    author: 'Sergio Zyman',
    publisher: 'Trí Tuệ Việt Books',
    price: 135000,
    coverUrl: 'https://images.unsplash.com/photo-1533750516457-a7f992034fec?w=600&auto=format&fit=crop&q=80',
    desc: 'Chiến lược marketing thực chiến, xóa bỏ sự lãng phí và tập trung vào chỉ số đo lường hiệu quả bán hàng thực tế.',
    format: 'BOTH',
    pages: 310,
    stock: 95
  },

  // ==========================================
  // TYPE 4: TRI THỨC & KHOA HỌC (10 Cuốn)
  // ==========================================
  {
    catId: 'cat-tri-thuc',
    title: 'Sapiens – Lược Sử Loài Người',
    slug: 'sapiens-luoc-su-loai-nguoi',
    author: 'Yuval Noah Harari',
    publisher: 'Nhã Nam Books',
    price: 179000,
    coverUrl: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=600&auto=format&fit=crop&q=80',
    desc: 'Cuốn sách lịch sử vĩ đại dẫn dắt bạn qua 70.000 năm tiến hóa của giống loài Homo Sapiens từ thời săn bắt hái lượm đến kỷ nguyên số.',
    format: 'BOTH',
    pages: 560,
    stock: 200
  },
  {
    catId: 'cat-tri-thuc',
    title: 'Homo Deus – Lược Sử Tương Lai',
    slug: 'homo-deus-luoc-su-tuong-lai',
    author: 'Yuval Noah Harari',
    publisher: 'Nhã Nam Books',
    price: 185000,
    coverUrl: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=600&auto=format&fit=crop&q=80',
    desc: 'Tương lai nhân loại khi công nghệ sinh học và thuật toán AI biến con người thành những sinh vật quyền năng như thần thánh.',
    format: 'BOTH',
    pages: 520,
    stock: 150
  },
  {
    catId: 'cat-tri-thuc',
    title: '21 Bài Học Cho Thế Kỷ 21',
    slug: '21-bai-hoc-cho-the-ky-21',
    author: 'Yuval Noah Harari',
    publisher: 'Nhã Nam Books',
    price: 165000,
    coverUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
    desc: 'Những câu hỏi sống còn về biến đổi khí hậu, chiến tranh thông tin, tự do ý chí và định hình bản sắc cá nhân thời hiện đại.',
    format: 'BOTH',
    pages: 448,
    stock: 130
  },
  {
    catId: 'cat-tri-thuc',
    title: 'Vũ Trụ (Cosmos)',
    slug: 'vu-tru-cosmos-carl-sagan',
    author: 'Carl Sagan',
    publisher: 'Nhã Nam Books',
    price: 210000,
    coverUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=600&auto=format&fit=crop&q=80',
    desc: 'Chuyến du hành kỳ vĩ khám phá 15 tỷ năm tiến hóa của vũ trụ và vị trí nhỏ bé của Trái Đất trong thiên hà bao la.',
    format: 'BOTH',
    pages: 512,
    stock: 90
  },
  {
    catId: 'cat-tri-thuc',
    title: 'Lược Sử Thời Gian (A Brief History of Time)',
    slug: 'luoc-su-thoi-gian-a-brief-history-of-time',
    author: 'Stephen Hawking',
    publisher: 'Trí Tuệ Việt Books',
    price: 115000,
    coverUrl: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=600&auto=format&fit=crop&q=80',
    desc: 'Giải thích bí ẩn về lỗ đen, thuyết tương đối, vụ nổ Big Bang và bản chất của thời gian từ nhà vật lý thiên tài Stephen Hawking.',
    format: 'BOTH',
    pages: 288,
    stock: 140
  },
  {
    catId: 'cat-tri-thuc',
    title: 'Súng, Vi Trùng Và Thép',
    slug: 'sung-vi-trung-va-thep-jared-diamond',
    author: 'Jared Diamond',
    publisher: 'Nhã Nam Books',
    price: 195000,
    coverUrl: 'https://images.unsplash.com/photo-1447069387593-a5de0862481e?w=600&auto=format&fit=crop&q=80',
    desc: 'Kiệt tác nhân loại đoạt giải Pulitzer lý giải vì sao một số nền văn minh lại phát triển vượt trội hơn các nền văn minh khác.',
    format: 'PHYSICAL',
    pages: 640,
    stock: 80
  },
  {
    catId: 'cat-tri-thuc',
    title: 'Muôn Kiếp Nhân Sinh – Tập 1',
    slug: 'muon-kiep-nhan-sinh-tap-1',
    author: 'Nguyên Phong',
    publisher: 'Trí Tuệ Việt Books',
    price: 148000,
    coverUrl: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=600&auto=format&fit=crop&q=80',
    desc: 'Bức tranh nhân quả luân hồi và những bài học tâm linh sâu sắc đúc kết từ tiền kiếp tại Atlantis và Ai Cập cổ đại.',
    format: 'BOTH',
    pages: 416,
    stock: 220
  },
  {
    catId: 'cat-tri-thuc',
    title: 'Hành Trình Về Phương Đông',
    slug: 'hanh-trinh-ve-phuong-dong',
    author: 'Nguyên Phong',
    publisher: 'Trí Tuệ Việt Books',
    price: 98000,
    coverUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&auto=format&fit=crop&q=80',
    desc: 'Chuyến thám hiểm Ấn Độ của phái đoàn khoa học Hoàng gia Anh mở ra cánh cửa tri thức minh triết phương Đông cổ xưa.',
    format: 'BOTH',
    pages: 260,
    stock: 190
  },
  {
    catId: 'cat-tri-thuc',
    title: 'Đại Việt Sử Ký Toàn Thư (Bản Rút Gọn)',
    slug: 'dai-viet-su-ky-toan-thu-ban-rut-gon',
    author: 'Ngô Sĩ Liên',
    publisher: 'Trí Tuệ Việt Books',
    price: 250000,
    coverUrl: 'https://images.unsplash.com/photo-1528164344705-475426879c0d?w=600&auto=format&fit=crop&q=80',
    desc: 'Bộ chính sử vô giá ghi chép toàn bộ tiến trình lịch sử hào hùng dựng nước và giữ nước của dân tộc Việt Nam.',
    format: 'BOTH',
    pages: 720,
    stock: 75
  },
  {
    catId: 'cat-tri-thuc',
    title: 'Thế Giới Phẳng (The World Is Flat)',
    slug: 'the-gioi-phang-the-world-is-flat',
    author: 'Thomas L. Friedman',
    publisher: 'Trí Tuệ Việt Books',
    price: 215000,
    coverUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80',
    desc: 'Tóm lược thế giới thế kỷ 21 trong xu thế toàn cầu hóa và tác động sâu rộng của mạng Internet lên mọi nền kinh tế.',
    format: 'BOTH',
    pages: 816,
    stock: 65
  },

  // ==========================================
  // TYPE 5: MANGA & KHÁC (10 Cuốn)
  // ==========================================
  {
    catId: 'cat-manga-comic',
    title: 'Doraemon – Người Bạn Đến Từ Tương Lai (Tập 1)',
    slug: 'doraemon-tap-1-nguoi-ban-tuong-lai',
    author: 'Fujiko F. Fujio',
    publisher: 'Nhà Xuất Bản Kim Đồng',
    price: 25000,
    coverUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
    desc: 'Chú mèo máy Doraemon cùng những bảo bối thần kỳ mang đến tuổi thơ rực rỡ và những bài học nhân văn sâu sắc cho nhiều thế hệ.',
    format: 'BOTH',
    pages: 192,
    stock: 300
  },
  {
    catId: 'cat-manga-comic',
    title: 'Thám Tử Lừng Danh Conan (Tập 1)',
    slug: 'tham-tu-lung-danh-conan-tap-1',
    author: 'Gosho Aoyama',
    publisher: 'Nhà Xuất Bản Kim Đồng',
    price: 25000,
    coverUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
    desc: 'Khởi đầu vụ án chấn động biến chàng thám tử trung học Kudo Shinichi thành cậu bé tiểu học Edogawa Conan.',
    format: 'BOTH',
    pages: 184,
    stock: 280
  },
  {
    catId: 'cat-manga-comic',
    title: 'One Piece – Khởi Đầu Cuộc Phiêu Lưu (Tập 1)',
    slug: 'one-piece-tap-1-khoi-dau-phieu-luu',
    author: 'Eiichiro Oda',
    publisher: 'Nhà Xuất Bản Kim Đồng',
    price: 28000,
    coverUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    desc: 'Cậu bé Luffy Mũ Rơm giương buồm ra khơi tìm kiếm kho báu huyền thoại One Piece và ước mơ trở thành Vua Hải Tặc.',
    format: 'BOTH',
    pages: 208,
    stock: 350
  },
  {
    catId: 'cat-manga-comic',
    title: 'Dragon Ball – Bảy Viên Ngọc Rồng (Tập 1)',
    slug: 'dragon-ball-bay-vien-ngoc-rong-tap-1',
    author: 'Akira Toriyama',
    publisher: 'Nhà Xuất Bản Kim Đồng',
    price: 28000,
    coverUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    desc: 'Hành trình tầm sư học đạo và tìm kiếm 7 viên ngọc rồng thiêng liêng của Son Goku cùng những người bạn trung thành.',
    format: 'BOTH',
    pages: 190,
    stock: 220
  },
  {
    catId: 'cat-manga-comic',
    title: 'Spy x Family (Tập 1)',
    slug: 'spy-x-family-tap-1',
    author: 'Tatsuya Endo',
    publisher: 'Nhà Xuất Bản Kim Đồng',
    price: 35000,
    coverUrl: 'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=600&auto=format&fit=crop&q=80',
    desc: 'Gia đình điệp viên giả định siêu hài hước giữa chàng điệp viên Twilight, cô vợ sát thủ Yor và cô con gái có siêu năng lực Anya.',
    format: 'BOTH',
    pages: 216,
    stock: 260
  },
  {
    catId: 'cat-manga-comic',
    title: 'Chú Thuật Hồi Chiến – Jujutsu Kaisen (Tập 1)',
    slug: 'jujutsu-kaisen-chu-thuat-hoi-chien-tap-1',
    author: 'Gege Akutami',
    publisher: 'Nhà Xuất Bản Kim Đồng',
    price: 35000,
    coverUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80',
    desc: 'Trận chiến trừ tà cam go của chàng thiếu niên Yuji Itadori khi vô tình nuốt phải ngón tay của Vua Lời Nguyền Sukuna.',
    format: 'BOTH',
    pages: 192,
    stock: 240
  },
  {
    catId: 'cat-manga-comic',
    title: 'Thanh Gươm Diệt Quỷ – Kimetsu No Yaiba (Tập 1)',
    slug: 'kimetsu-no-yaiba-thanh-guom-diet-quy-tap-1',
    author: 'Koyoharu Gotouge',
    publisher: 'Nhà Xuất Bản Kim Đồng',
    price: 35000,
    coverUrl: 'https://images.unsplash.com/photo-1569701813229-33284b643e3c?w=600&auto=format&fit=crop&q=80',
    desc: 'Hành trình gia nhập Đội Diệt Quỷ của Tanjiro để cứu người em gái Nezuko đã bị biến thành quỷ trở lại làm người.',
    format: 'BOTH',
    pages: 192,
    stock: 310
  },
  {
    catId: 'cat-manga-comic',
    title: 'Your Name (Kimi no Na wa) – Light Novel',
    slug: 'your-name-kimi-no-na-wa-light-novel',
    author: 'Makoto Shinkai',
    publisher: 'Nhà Xuất Bản Kim Đồng',
    price: 75000,
    coverUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    desc: 'Tiểu thuyết lãng mạn kỳ ảo về giấc mơ hoán đổi thân xác giữa Mitsuha ở vùng quê hẻo lánh và Taki ở Tokyo phồn hoa.',
    format: 'BOTH',
    pages: 260,
    stock: 180
  },
  {
    catId: 'cat-manga-comic',
    title: 'Dế Mèn Phiêu Lưu Ký (Bản Màu Minh Họa)',
    slug: 'de-men-phieu-luu-ky-ban-mau',
    author: 'Tô Hoài',
    publisher: 'Nhà Xuất Bản Kim Đồng',
    price: 85000,
    coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80',
    desc: 'Tác phẩm văn học thiếu nhi Việt Nam đặc sắc với những bài học cuộc đời ý nghĩa về tình bạn và lòng nhân ái.',
    format: 'BOTH',
    pages: 176,
    stock: 190
  },
  {
    catId: 'cat-manga-comic',
    title: 'Chuyện Con Mèo Dạy Hải Âu Bay',
    slug: 'chuyen-con-meo-day-hai-au-bay',
    author: 'Luis Sepúlveda',
    publisher: 'Nhã Nam Books',
    price: 55000,
    coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
    desc: 'Câu chuyện ấm áp, kỳ diệu về chú mèo mập Zorba giữ trọn lời hứa chăm sóc và dạy một chú chim hải âu tập bay.',
    format: 'BOTH',
    pages: 140,
    stock: 210
  },
];

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function main() {
  const client = new Client({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_commerce' });
  await client.connect();

  try {
    console.log('=== BẮT ĐẦU TẠO 50 CUỐN SÁCH THẬT CHO TÀI KHOẢN phuongthuy@gmail.com ===\n');

    // 1. Ensure Categories exist
    console.log('1. Cập nhật / Tạo 5 Danh mục chính...');
    for (const cat of CATEGORIES_DATA) {
      await client.query(`
        INSERT INTO categories (id, name, normalized_name, slug, description, is_active, updated_at)
        VALUES ($1, $2, $3, $4, $5, true, NOW())
        ON CONFLICT (id) DO UPDATE 
        SET name = EXCLUDED.name, normalized_name = EXCLUDED.normalized_name, slug = EXCLUDED.slug, description = EXCLUDED.description
      `, [cat.id, cat.name, cat.normalizedName, cat.slug, cat.desc]);
    }

    // 2. Cache/Create Authors & Publishers
    const authorsCache = new Map();
    const publishersCache = new Map();

    const authorsRes = await client.query('SELECT id, name, slug FROM authors');
    for (const a of authorsRes.rows) authorsCache.set(a.name, a.id);

    const publishersRes = await client.query('SELECT id, name, slug FROM publishers');
    for (const p of publishersRes.rows) publishersCache.set(p.name, p.id);

    // 3. Process books
    let createdCount = 0;
    let updatedCount = 0;

    for (const book of BOOKS_50) {
      // Ensure Author
      let authorId = authorsCache.get(book.author);
      if (!authorId) {
        const authorSlug = slugify(book.author);
        const normAuthor = slugify(book.author).replace(/-/g, ' ');
        const authorInsert = await client.query(`
          INSERT INTO authors (id, name, normalized_name, slug, is_active, updated_at)
          VALUES (gen_random_uuid(), $1, $2, $3, true, NOW())
          ON CONFLICT (normalized_name) DO UPDATE SET name = EXCLUDED.name
          RETURNING id
        `, [book.author, normAuthor, authorSlug]);
        authorId = authorInsert.rows[0].id;
        authorsCache.set(book.author, authorId);
      }

      // Ensure Publisher
      let publisherId = publishersCache.get(book.publisher);
      if (!publisherId) {
        const pubSlug = slugify(book.publisher);
        const normPub = slugify(book.publisher).replace(/-/g, ' ');
        const pubInsert = await client.query(`
          INSERT INTO publishers (id, name, normalized_name, slug, is_active, updated_at)
          VALUES (gen_random_uuid(), $1, $2, $3, true, NOW())
          ON CONFLICT (normalized_name) DO UPDATE SET name = EXCLUDED.name
          RETURNING id
        `, [book.publisher, normPub, pubSlug]);
        publisherId = pubInsert.rows[0].id;
        publishersCache.set(book.publisher, publisherId);
      }

      // Insert/Upsert Book
      const normalizedTitle = slugify(book.title).replace(/-/g, ' ');
      
      const bookRes = await client.query(`
        INSERT INTO books (
          id, store_id, owner_user_id, title, slug, normalized_title,
          description, price, category_id, author_id, publisher_id,
          format, cover_url, cover_public_id, status, published_at, view_count, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, 'PUBLISHED', NOW(), 120, NOW()
        )
        ON CONFLICT (store_id, slug) DO UPDATE SET
          title = EXCLUDED.title,
          normalized_title = EXCLUDED.normalized_title,
          description = EXCLUDED.description,
          price = EXCLUDED.price,
          category_id = EXCLUDED.category_id,
          author_id = EXCLUDED.author_id,
          publisher_id = EXCLUDED.publisher_id,
          format = EXCLUDED.format,
          cover_url = EXCLUDED.cover_url,
          status = 'PUBLISHED',
          owner_user_id = $2,
          published_at = NOW(),
          updated_at = NOW()
        RETURNING id, (xmax = 0) AS inserted
      `, [
        STORE_ID,
        OWNER_USER_ID,
        book.title,
        book.slug,
        normalizedTitle,
        book.desc,
        book.price,
        book.catId,
        authorId,
        publisherId,
        book.format,
        book.coverUrl,
        'covers/' + book.slug
      ]);

      const bookId = bookRes.rows[0].id;
      const isInserted = bookRes.rows[0].inserted;

      if (isInserted) createdCount++; else updatedCount++;

      // Physical Book Details
      await client.query(`
        INSERT INTO physical_book_details (id, book_id, stock, reserved, weight, dimensions, page_count, physical_enabled, updated_at)
        VALUES (gen_random_uuid(), $1, $2, 0, 350.0, '14.5 x 20.5 cm', $3, true, NOW())
        ON CONFLICT (book_id) DO UPDATE SET
          stock = EXCLUDED.stock,
          page_count = EXCLUDED.page_count,
          physical_enabled = true,
          updated_at = NOW()
      `, [bookId, book.stock, book.pages]);

      // Digital Book Details
      if (book.format === 'BOTH' || book.format === 'DIGITAL') {
        await client.query(`
          INSERT INTO digital_book_details (id, book_id, pdf_key, epub_key, preview_pdf_key, digital_enabled, access_type, updated_at)
          VALUES (gen_random_uuid(), $1, $2, $3, $4, true, 'FREE', NOW())
          ON CONFLICT (book_id) DO UPDATE SET
            digital_enabled = true,
            updated_at = NOW()
        `, [bookId, 'ebooks/' + book.slug + '.pdf', 'ebooks/' + book.slug + '.epub', 'ebooks/previews/' + book.slug + '-preview.pdf']);
      }
    }

    console.log(`\n🎉 HOÀN TẤT THÀNH CÔNG!`);
    console.log(`- Đã tạo mới: ${createdCount} cuốn`);
    console.log(`- Đã cập nhật: ${updatedCount} cuốn`);
    console.log(`- Tổng cộng: 50 cuốn (10 cuốn/thể loại) của seller phuongthuy@gmail.com ở trạng thái PUBLISHED!`);

  } catch (err) {
    console.error('Lỗi khi seed sách:', err);
  } finally {
    await client.end();
  }
}

main();
