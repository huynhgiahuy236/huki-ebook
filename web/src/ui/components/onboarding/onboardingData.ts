export interface PrimaryGoal {
  id: string;
  icon: string;
  title: string;
  desc: string;
}

export interface GenreItem {
  id: string;
  name: string;
  icon: string;
  category: string;
}

export interface BookFormatOption {
  id: string;
  name: string;
  desc: string;
  icon: string;
}

export interface ReaderThemeOption {
  id: 'LIGHT' | 'DARK' | 'SEPIA';
  name: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

export const ONBOARDING_GOALS: PrimaryGoal[] = [
  { id: 'read_digital', icon: 'auto_stories', title: 'Đọc Ebook & Sách số', desc: 'Đọc trên app/web, ghi chú & highlight tiện lợi' },
  { id: 'buy_physical', icon: 'inventory_2', title: 'Mua sách in truyền thống', desc: 'Sách giấy bìa cứng, giao hàng tận nhà' },
  { id: 'author_creator', icon: 'history_edu', title: 'Tác giả & Tự xuất bản', desc: 'Chia sẻ tác phẩm và tiếp cận độc giả' },
  { id: 'merchant_seller', icon: 'storefront', title: 'Chủ shop & Kinh doanh', desc: 'Mở gian hàng bán sách và phân phối ấn phẩm' },
  { id: 'community_social', icon: 'forum', title: 'Review & Thảo luận sách', desc: 'Tham gia Book Club và chia sẻ cảm nhận' },
];

export const ONBOARDING_CATEGORIES = [
  'Tất cả',
  'Văn học',
  'Tâm lý & Kỹ năng',
  'Kinh doanh & Tech',
  'Tri thức',
  'Manga & Khác',
];

export const ONBOARDING_GENRES: GenreItem[] = [
  // Văn học
  { id: 'lit_classic', name: 'Văn học kinh điển', icon: '🏛️', category: 'Văn học' },
  { id: 'lit_vietnam', name: 'Văn học Việt Nam', icon: '🇻🇳', category: 'Văn học' },
  { id: 'lit_romance', name: 'Ngôn tình & Lãng mạn', icon: '💖', category: 'Văn học' },
  { id: 'lit_thriller', name: 'Trinh thám & Bí ẩn', icon: '🕵️', category: 'Văn học' },
  { id: 'lit_scifi', name: 'Khoa học viễn tưởng', icon: '🚀', category: 'Văn học' },
  { id: 'lit_fantasy', name: 'Kỳ ảo & Phiêu lưu', icon: '🐉', category: 'Văn học' },
  { id: 'lit_short', name: 'Tản văn & Truyện ngắn', icon: '☕', category: 'Văn học' },
  { id: 'lit_poetry', name: 'Thơ ca đương đại', icon: '🪶', category: 'Văn học' },

  // Tâm lý & Kỹ năng
  { id: 'self_help', name: 'Phát triển bản thân', icon: '🌱', category: 'Tâm lý & Kỹ năng' },
  { id: 'psychology', name: 'Tâm lý học ứng dụng', icon: '🧠', category: 'Tâm lý & Kỹ năng' },
  { id: 'mindfulness', name: 'Chữa lành & Thiền định', icon: '🧘', category: 'Tâm lý & Kỹ năng' },
  { id: 'communication', name: 'Giao tiếp & Đàm phán', icon: '🗣️', category: 'Tâm lý & Kỹ năng' },
  { id: 'productivity', name: 'Quản lý thời gian', icon: '⚡', category: 'Tâm lý & Kỹ năng' },
  { id: 'parenting', name: 'Nuôi dạy con cái', icon: '👶', category: 'Tâm lý & Kỹ năng' },

  // Kinh doanh & Tech
  { id: 'biz_startup', name: 'Khởi nghiệp & Đổi mới', icon: '💡', category: 'Kinh doanh & Tech' },
  { id: 'biz_invest', name: 'Đầu tư & Chứng khoán', icon: '📈', category: 'Kinh doanh & Tech' },
  { id: 'biz_finance', name: 'Tài chính cá nhân', icon: '💰', category: 'Kinh doanh & Tech' },
  { id: 'biz_marketing', name: 'Marketing & Bán hàng', icon: '🎯', category: 'Kinh doanh & Tech' },
  { id: 'tech_ai', name: 'Trí tuệ nhân tạo (AI)', icon: '🤖', category: 'Kinh doanh & Tech' },
  { id: 'tech_coding', name: 'Lập trình & Kỹ thuật', icon: '💻', category: 'Kinh doanh & Tech' },

  // Tri thức
  { id: 'history_world', name: 'Lịch sử thế giới', icon: '🌍', category: 'Tri thức' },
  { id: 'history_vn', name: 'Lịch sử Việt Nam', icon: '📜', category: 'Tri thức' },
  { id: 'philosophy', name: 'Triết học & Tư tưởng', icon: '🦉', category: 'Tri thức' },
  { id: 'science_pop', name: 'Khoa học thường thức', icon: '🔬', category: 'Tri thức' },
  { id: 'biography', name: 'Tiểu sử & Hồi ký', icon: '👤', category: 'Tri thức' },

  // Manga & Khác
  { id: 'comic_manga', name: 'Manga & Comic', icon: '🎨', category: 'Manga & Khác' },
  { id: 'light_novel', name: 'Light Novel', icon: '🌸', category: 'Manga & Khác' },
  { id: 'health_cuisine', name: 'Sức khỏe & Ẩm thực', icon: '🥗', category: 'Manga & Khác' },
  { id: 'foreign_lang', name: 'Học ngoại ngữ', icon: '🌐', category: 'Manga & Khác' },
];

export const ONBOARDING_FORMATS: BookFormatOption[] = [
  { id: 'epub', name: 'Ebook (EPUB)', desc: 'Tùy chỉnh cỡ chữ, font, đọc trên mọi màn hình', icon: 'smartphone' },
  { id: 'pdf', name: 'Tài liệu PDF', desc: 'Giữ nguyên dàn trang gốc & hình ảnh minh họa', icon: 'description' },
  { id: 'audio', name: 'Sách nói (Audio)', desc: 'Nghe sách mọi lúc khi di chuyển hay làm việc', icon: 'headphones' },
  { id: 'paper', name: 'Sách in giấy', desc: 'Cầm nắm trang sách thật & lưu giữ trên kệ', icon: 'menu_book' },
];

export const ONBOARDING_THEMES: ReaderThemeOption[] = [
  { id: 'LIGHT', name: 'Trắng Sáng', bgClass: 'bg-white', textClass: 'text-[#17201f]', borderClass: 'border-gray-200' },
  { id: 'SEPIA', name: 'Giấy Sepia', bgClass: 'bg-[#f5ebd7]', textClass: 'text-[#5f4b32]', borderClass: 'border-[#dfd3bc]' },
  { id: 'DARK', name: 'Đen Tuyền', bgClass: 'bg-[#181a1b]', textClass: 'text-[#e8e6e3]', borderClass: 'border-gray-800' },
];

export const READING_DAILY_TARGETS = [
  { id: 15, label: '15 phút', desc: 'Nhẹ nhàng khởi đầu' },
  { id: 30, label: '30 phút', desc: 'Tạo thói quen tốt' },
  { id: 60, label: '60 phút', desc: 'Mọt sách chuyên sâu' },
  { id: 0, label: 'Linh hoạt', desc: 'Đọc khi rảnh rỗi' },
];

export const READING_YEARLY_TARGETS = [
  { id: 6, label: '6 cuốn / năm', desc: '~2 tháng / cuốn' },
  { id: 12, label: '12 cuốn / năm', desc: 'Chuẩn 1 cuốn / tháng' },
  { id: 24, label: '24+ cuốn / năm', desc: 'Thử thách chuyên sâu' },
];

export const READING_TIME_PREFERENCES = [
  { id: 'MORNING', label: 'Sáng sớm', icon: 'wb_sunny' },
  { id: 'NOON', label: 'Nghỉ trưa', icon: 'wb_twilight' },
  { id: 'NIGHT', label: 'Buổi tối', icon: 'bedtime' },
];
