import React from 'react';
import { Link } from 'react-router-dom';

export default function CommunityPage() {
  return (
    <div className="w-full bg-theme-bg text-on-surface antialiased min-h-screen">



<section 
  style={{ background: 'linear-gradient(to right, var(--theme-hero-from, #004D38), var(--theme-hero-via, #003828), var(--theme-hero-to, #00271C))' }}
  className="relative text-white px-8 py-8 overflow-hidden shadow-sm">

<div className="absolute inset-0 opacity-10 pointer-events-none flex justify-end items-center pr-12">
<span className="material-symbols-outlined text-[260px] select-none text-white transform rotate-12 translate-x-12">menu_book</span>
</div>
<div className="absolute left-1/3 -top-12 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none"></div>
<div className="max-w-[1460px] mx-auto relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
<div>
<div className="flex items-center gap-2 text-tertiary-fixed text-xs tracking-wider uppercase font-label-md mb-2">
<span className="material-symbols-outlined text-[16px]">local_library</span>
<span>Không Gian Tri Thức &amp; Tác Phẩm Số</span>
</div>
<h1 className="font-headline-lg text-3xl lg:text-[34px] tracking-tight font-medium text-white mb-2 font-display-lg">
            MẠNG XÃ HỘI ĐỘC GIẢ HUKI
          </h1>
<p className="font-body-md text-sm lg:text-[15px] text-slate-200 max-w-2xl text-balance">
            Chia sẻ hành trình đọc, review tác phẩm chân thực, tích lũy huy hiệu đọc và gắn kết cùng hơn 48.000 tâm hồn yêu sách trên khắp Việt Nam.
          </p>
</div>

<div className="flex flex-wrap items-center gap-3">
<div className="bg-white/10 backdrop-blur-md border border-white/15 px-4 py-2 rounded-xl flex items-center gap-2.5">
<div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-tertiary-fixed">
<span className="material-symbols-outlined text-[18px]">person</span>
</div>
<div>
<div className="font-title-md text-sm font-semibold text-white">48.5K</div>
<div className="font-label-sm text-[11px] text-slate-300">Độc giả tích cực</div>
</div>
</div>
<div className="bg-white/10 backdrop-blur-md border border-white/15 px-4 py-2 rounded-xl flex items-center gap-2.5">
<div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-300">
<span className="material-symbols-outlined text-[18px]">groups</span>
</div>
<div>
<div className="font-title-md text-sm font-semibold text-white">1.2K</div>
<div className="font-label-sm text-[11px] text-slate-300">CLB Sách</div>
</div>
</div>
<div className="bg-white/10 backdrop-blur-md border border-white/15 px-4 py-2 rounded-xl flex items-center gap-2.5">
<div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-300">
<span className="material-symbols-outlined text-[18px]">rate_review</span>
</div>
<div>
<div className="font-title-md text-sm font-semibold text-white">125K</div>
<div className="font-label-sm text-[11px] text-slate-300">Bài viết &amp; Review</div>
</div>
</div>
</div>
</div>
</section>



<div className="bg-surface-container-lowest border-b border-[#E8ECEA] px-8 sticky top-16 z-30 shadow-[0_2px_8px_-2px_rgba(23,32,31,0.03)]">
<div className="max-w-[1460px] mx-auto flex items-center justify-between py-2.5">
<nav className="flex items-center gap-1 overflow-x-auto no-scrollbar">
<button className="px-4 py-2 rounded-lg font-title-md text-sm bg-huki-mint-bg text-[#006B50] font-semibold flex items-center gap-1.5 transition-colors">
<span className="material-symbols-outlined text-[18px]">auto_awesome</span>
            Dành Cho Bạn
          </button>
<button className="px-4 py-2 rounded-lg font-body-md text-sm text-on-surface-variant hover:text-huki-emerald hover:bg-slate-100 transition-colors flex items-center gap-1.5">
<span className="material-symbols-outlined text-[18px]">person_check</span>
            Đang Theo Dõi
          </button>
<button className="px-4 py-2 rounded-lg font-body-md text-sm text-on-surface-variant hover:text-huki-emerald hover:bg-slate-100 transition-colors flex items-center gap-1.5">
<span className="material-symbols-outlined text-[18px]">stars</span>
            Review Sách
          </button>
<button className="px-4 py-2 rounded-lg font-body-md text-sm text-on-surface-variant hover:text-huki-emerald hover:bg-slate-100 transition-colors flex items-center gap-1.5">
<span className="material-symbols-outlined text-[18px]">question_answer</span>
            Thảo Luận
          </button>
<button className="px-4 py-2 rounded-lg font-body-md text-sm text-on-surface-variant hover:text-huki-emerald hover:bg-slate-100 transition-colors flex items-center gap-1.5">
<span className="material-symbols-outlined text-[18px]">diversity_3</span>
            CLB Sách
          </button>
<button className="px-4 py-2 rounded-lg font-body-md text-sm text-on-surface-variant hover:text-huki-emerald hover:bg-slate-100 transition-colors flex items-center gap-1.5">
<span className="material-symbols-outlined text-[18px] text-huki-amber">local_fire_department</span>
            Thử Thách 2026
          </button>
</nav>
<div className="flex items-center gap-3">
<div className="flex items-center text-xs text-on-surface-variant bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
<span className="material-symbols-outlined text-[16px] text-slate-500 mr-1.5">tune</span>
            Lọc: <span className="font-medium text-on-surface ml-1">Mới nhất</span>
</div>
<button className="px-4 py-2 bg-[#006B50] hover:bg-[#004D38] text-white text-xs font-title-md font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-all">
<span className="material-symbols-outlined text-[16px]">edit_note</span>
            + Tạo bài viết mới
          </button>
</div>
</div>
</div>



<main className="max-w-[1460px] mx-auto w-full px-8 py-6 flex-1">
<div className="grid grid-cols-12 gap-6 items-start">



<div className="col-span-12 lg:col-span-3 space-y-5">

<div className="bg-surface-container-lowest border border-[#E8ECEA] rounded-xl p-5 shadow-[0_4px_20px_-2px_rgba(23,32,31,0.04)]">
<div className="flex items-center gap-3 mb-4">
<img className="w-14 h-14 rounded-full object-cover border-2 border-huki-emerald shadow-sm" alt="Close-up portrait of Minh Tri, an articulate Vietnamese book enthusiast and community leader, smiling serenely with gentle warm backlighting in an intimate scholarly setting." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDlnLDlf-8V0KQzVEEJhqGtNz8sRjXNludFbQbMKbLhAqghUXI_uPUp6Nejx5Ppr5OE_oGb6eQxDRMyHJK6h5eicVWXiJ3EQBeh-l-O1DolMqPZFdmnlsHLBF0buZWgTZVqAP6MU_ttRql3xn-BeQ8XNf3QgT9AB1S0QY8QGXiuZ1msap9wbTnqZqeEGXsFHxfZG0yWC45VJUnvgFNoxzVEcpTjDMhKR-Yl0blONfsDR-mNf84mjWdwIw" />
<div>
<h3 className="font-title-md text-base text-on-surface flex items-center gap-1">
                  Minh Trí
                  <span className="material-symbols-outlined text-[16px] text-huki-amber fill-icon">verified</span>
</h3>
<p className="font-body-sm text-xs text-slate-500">Độc giả tích cực</p>
<div className="inline-flex items-center gap-1 mt-1 bg-amber-50 text-huki-amber border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-label-sm font-semibold">
<span className="material-symbols-outlined text-[12px] fill-icon">workspace_premium</span> Hội viên VIP
                </div>
</div>
</div>

<div className="grid grid-cols-3 gap-2 py-3 border-y border-[#E8ECEA] text-center mb-3">
<div>
<div className="font-title-md text-base font-bold text-huki-emerald">12</div>
<div className="font-label-sm text-[11px] text-slate-500">Đang đọc</div>
</div>
<div className="border-x border-[#E8ECEA]">
<div className="font-title-md text-base font-bold text-on-surface">48</div>
<div className="font-label-sm text-[11px] text-slate-500">Đã đọc</div>
</div>
<div>
<div className="font-title-md text-base font-bold text-on-surface">6</div>
<div className="font-label-sm text-[11px] text-slate-500">CLB</div>
</div>
</div>

<div className="flex items-center justify-between bg-orange-50 border border-orange-100 rounded-lg px-3 py-2 text-xs">
<span className="flex items-center gap-1.5 text-[#C85A00] font-medium">
<span className="text-base">🔥</span> Chuỗi đọc: <strong className="font-semibold">12 ngày liên tục</strong>
</span>
<span className="material-symbols-outlined text-orange-400 text-[18px]">military_tech</span>
</div>
</div>

<div className="bg-surface-container-lowest border border-[#E8ECEA] rounded-xl p-5 shadow-[0_4px_20px_-2px_rgba(23,32,31,0.04)]">
<div className="flex items-center justify-between mb-3">
<div className="flex items-center gap-1.5 font-title-md text-sm text-on-surface">
<span className="material-symbols-outlined text-[20px] text-huki-amber">local_fire_department</span>
<span>Thử Thách Đọc 2026</span>
</div>
<span className="font-label-sm text-xs text-huki-emerald font-semibold bg-huki-mint-bg px-2 py-0.5 rounded">60%</span>
</div>
<div className="flex items-baseline justify-between mb-1.5 text-xs">
<span className="font-body-md text-slate-600">Đã hoàn thành</span>
<span className="font-title-md text-sm font-bold text-on-surface">18 / <span className="text-slate-400 text-xs">30 cuốn</span></span>
</div>

<div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-2">
<div className="bg-[#006B50] h-full rounded-full transition-all duration-500" style={{ width: "60%" }}></div>
</div>
<div className="flex items-center justify-between text-[11px] text-slate-500">
<span>Còn 12 cuốn để cán mốc</span>
<Link className="text-huki-emerald hover:underline font-medium" to="/">Chi tiết</Link>
</div>
</div>

<div className="bg-surface-container-lowest border border-[#E8ECEA] rounded-xl p-5 shadow-[0_4px_20px_-2px_rgba(23,32,31,0.04)]">
<div className="flex items-center justify-between mb-3">
<h4 className="font-title-md text-xs uppercase tracking-wider text-slate-400">Đang Đọc Dở</h4>
<button className="p-1 rounded hover:bg-slate-200 transition-colors" aria-label="Tùy chọn thêm">
<span className="material-symbols-outlined text-[16px] text-slate-400">more_horiz</span>
</button>
</div>
<div className="flex gap-3">
<div className="w-16 h-24 rounded-md overflow-hidden flex-shrink-0 book-spine-crease shadow-md border border-black/10">
<img className="w-full h-full object-cover" alt="High-resolution book cover for The Power of Habit by Charles Duhigg, showcasing crisp editorial typography with warm yellow and emerald paper tones, soft studio illumination." src="https://lh3.googleusercontent.com/aida-public/AB6AXuA6_kDR5YvqOtnJaD3jplgl4UKkeUecXXjJnRQyFkwxxfSP017uZDGRlzP0jNSkOI8dXEcCitjSNGQ-pmQJgA4Gjt4HNdOLN2jLNwlpMq39AUcbCS2Ieo0twYzs3T8ueXqW42seSfIMRRd-QPmh-I2wV2zkLIC28nFKKYcPSlGhFkQ1MHq-4b9XF8YndegrhAPjLv3VXcJrOlTZtIMxbYiyaXbbka5mYYgjcDyN9JS0MzaluKuBzcoPQQ" />
</div>
<div className="flex flex-col justify-between py-0.5 flex-1">
<div>
<h5 className="font-title-md text-xs text-on-surface font-semibold line-clamp-2 leading-snug">
                    Sức Mạnh Của Thói Quen
                  </h5>
<p className="font-body-sm text-[11px] text-slate-500 mt-0.5">Charles Duhigg</p>
</div>
<div>
<div className="flex justify-between text-[11px] text-slate-600 mb-1">
<span>Tiến độ</span>
<span className="font-semibold text-huki-emerald">68%</span>
</div>
<div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-2">
<div className="bg-tertiary-container h-full rounded-full" style={{ width: "68%" }}></div>
</div>
<Link className="inline-flex items-center gap-1 text-[11px] font-title-md font-semibold text-huki-emerald hover:text-huki-emerald-dark" to="/reader">
                    Tiếp tục đọc Chương 4 <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
</Link>
</div>
</div>
</div>
</div>

<div className="bg-surface-container-lowest border border-[#E8ECEA] rounded-xl p-4 shadow-[0_4px_20px_-2px_rgba(23,32,31,0.04)]">
<div className="space-y-1 text-sm font-body-md text-on-surface">
<Link className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#F2FBF9] hover:text-huki-emerald transition-colors" to="/library">
<span className="flex items-center gap-2.5">
<span className="material-symbols-outlined text-[18px] text-slate-500">collections_bookmark</span>
                  Tủ sách của tôi
                </span>
<span className="text-xs text-slate-400">60</span>
</Link>
<Link className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#F2FBF9] hover:text-huki-emerald transition-colors" to="/community">
<span className="flex items-center gap-2.5">
<span className="material-symbols-outlined text-[18px] text-slate-500">bookmark</span>
                  Bài viết đã lưu
                </span>
<span className="text-xs font-semibold bg-emerald-100 text-huki-emerald px-1.5 py-0.5 rounded-full">14</span>
</Link>
<Link className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#F2FBF9] hover:text-huki-emerald transition-colors" to="/community">
<span className="flex items-center gap-2.5">
<span className="material-symbols-outlined text-[18px] text-slate-500">diversity_3</span>
                  CLB của tôi
                </span>
<span className="text-xs text-slate-400">6</span>
</Link>
<Link className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#F2FBF9] hover:text-huki-emerald transition-colors" to="/">
<span className="flex items-center gap-2.5">
<span className="material-symbols-outlined text-[18px] text-slate-500">history</span>
                  Lịch sử đọc
                </span>
<span className="material-symbols-outlined text-[14px] text-slate-400">chevron_right</span>
</Link>
</div>
</div>
</div>



<div className="col-span-12 lg:col-span-6 space-y-6">

<div className="bg-surface-container-lowest border border-[#E8ECEA] rounded-xl p-4 shadow-[0_4px_20px_-2px_rgba(23,32,31,0.04)]">
<div className="flex gap-3 mb-3">
<img className="w-10 h-10 rounded-full object-cover flex-shrink-0" alt="Avatar thumbnail of Minh Tri, young Vietnamese male with thoughtful expression, warm studio lighting, suited for an active reader forum profile." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCp-28SkresEm2cdwsuk2HGNdqtYh0gx0N1s_SekTzRk1c3WKtx242udUTwnH7FQDwEp-d6EKfQPtbsyj5as7rG8V9_UjQIyRydhCwdFr43cvM8Y1bnWZ7p2-2TVss5AhcTkzAR2d-eRs2e0NlxXrf4tl2wrzsQHIoKhm-KWRS83y27s-iHAlvQ0ZAaKjxlFkT7KrWbXOIfCfdYJNp-caF8EQuhhH-uH5VOJYa1eUjE_Wg3Q_OK6qsUkQ" />
<div className="flex-1">
<textarea className="w-full text-sm font-body-md text-on-surface placeholder:text-slate-400 border border-slate-200 rounded-lg p-2.5 focus:border-huki-emerald focus:ring-1 focus:ring-huki-emerald focus:outline-none resize-none bg-[#FAF9F6] focus:bg-white transition-colors" placeholder="Bạn đang đọc gì? Chia sẻ cảm nghĩ hoặc trích dẫn với cộng đồng HUKI..." rows="2"></textarea>
</div>
</div>

<div className="flex items-center justify-between pt-2 border-t border-slate-100">
<div className="flex items-center gap-1.5">
<button className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-huki-emerald hover:bg-huki-mint-bg rounded-md flex items-center gap-1 font-body-sm transition-colors" title="Gắn sách từ thư viện">
<span className="material-symbols-outlined text-[18px] text-[#006B50]">menu_book</span>
<span>Gắn sách</span>
</button>
<button className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-huki-amber hover:bg-amber-50 rounded-md flex items-center gap-1 font-body-sm transition-colors" title="Đánh giá sao">
<span className="material-symbols-outlined text-[18px] text-huki-amber">star</span>
<span>Đánh giá</span>
</button>
<button className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-md flex items-center gap-1 font-body-sm transition-colors" title="Thêm ảnh">
<span className="material-symbols-outlined text-[18px] text-blue-500">photo_camera</span>
<span>Ảnh</span>
</button>
<button className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-md flex items-center gap-1 font-body-sm transition-colors" title="Cập nhật tiến độ đọc">
<span className="material-symbols-outlined text-[18px] text-emerald-500">percent</span>
<span>Tiến độ đọc</span>
</button>
</div>
<button className="px-5 py-1.5 bg-[#006B50] hover:bg-[#004D38] text-white text-xs font-title-md font-semibold rounded-lg shadow-sm transition-all hover:shadow">
                Đăng bài
              </button>
</div>
</div>



<article className="bg-surface-container-lowest border border-[#E8ECEA] rounded-xl p-5 shadow-[0_4px_20px_-2px_rgba(23,32,31,0.04)] space-y-4">

<div className="flex items-center justify-between">
<div className="flex items-center gap-3">
<img className="w-10 h-10 rounded-full object-cover" alt="Portrait photo of Nguyen Minh Anh, a Vietnamese female reader with gentle smile in an airy coffee shop surrounded by bookshelves, soft natural lighting." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAaX07yNdYdhY2C1-cOynexJ0abrpcHFKyYurVxGkYlL2Scd5lhK9tkuM91SaobV8o8lfJxV96cFxzVXx5dyxK-vQg6-xTGkh15DduVQttX4NSVvA5rQbHudOT-Uu_aH4OtzcEPih86I5V0zeuan37JnGItUBdb294phhQ4eeEfbUcGZcwm0tLthDbvfuaHmRjZXY5zD8aKfVi8nWivVILmOAQgm-hzIudnmFipr-v9dOHe3I1P4BvWvQ" />
<div>
<div className="flex items-center gap-1.5">
<span className="font-title-md text-sm text-on-surface font-semibold">Nguyễn Minh Anh</span>
<span className="material-symbols-outlined text-[14px] text-huki-emerald fill-icon">verified</span>
</div>
<div className="flex items-center gap-1.5 text-xs text-slate-400">
<span>2 giờ trước</span>
<span>•</span>
<span className="material-symbols-outlined text-[13px]">public</span>
<span>Công khai</span>
</div>
</div>
</div>
<button className="text-slate-400 hover:text-on-surface p-1 rounded-full">
<span className="material-symbols-outlined text-[20px]">more_horiz</span>
</button>
</div>

<p className="font-body-md text-sm text-on-surface leading-relaxed">
              Cuối cùng cũng đọc xong cuốn này. Phần cuối làm mình suy nghĩ khá nhiều về cách chúng ta nhìn nhận thành công và giá trị bên trong. Thỉnh thoảng vũ trụ sẽ lắng nghe và dẫn lối, miễn là chúng ta kiên trì đi theo tiếng gọi của ước mơ. Rất đáng đọc lại ít nhất 2 lần trong đời! 🌿
            </p>

<div className="bg-[#FAF9F6] border border-[#E8ECEA] rounded-xl p-3.5 flex items-center justify-between gap-4">
<div className="flex items-center gap-3.5">
<div className="w-14 h-20 rounded overflow-hidden flex-shrink-0 book-spine-crease shadow-sm border border-black/10">
<img className="w-full h-full object-cover" alt="Book cover of The Alchemist (Nha Gia Kim) by Paulo Coelho, showing the golden pyramid silhouette against warm desert sands and deep blue night sky." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCl86uXMhw-NHKbolIKVOO_Swxi92v7I5juHCOWN7MBbtX9IzZ-OKHZpxwhFK4AAirpII5r6AnnZZjC_8jZfIX8e4s2IgacqS33TkW5WaPMliTq6XvuQLYmRXTS7BDy1yTlH7_RSG0xQ7r8vSHYIVQ0f0XqE0JT9Qk_AbEzhcwqZwfFL2qygXUUPTWUmxYBBQv7KRWvNDq0XUjjUgsBFq8Pw_DR9CzC7QtU0KwHhZLY_xcFugC5D_9BCg" />
</div>
<div>
<span className="inline-flex items-center gap-1 text-[11px] font-label-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded mb-1">
<span className="material-symbols-outlined text-[12px] fill-icon">check_circle</span> Đã đọc xong 100%
                  </span>
<h4 className="font-title-md text-sm text-on-surface font-semibold">Nhà Giả Kim</h4>
<p className="font-body-sm text-xs text-slate-500">Paulo Coelho</p>
<div className="flex items-center gap-1 mt-1 text-xs">
<div className="flex text-amber-500">
<span className="material-symbols-outlined text-[14px] fill-icon">star</span>
<span className="material-symbols-outlined text-[14px] fill-icon">star</span>
<span className="material-symbols-outlined text-[14px] fill-icon">star</span>
<span className="material-symbols-outlined text-[14px] fill-icon">star</span>
<span className="material-symbols-outlined text-[14px] fill-icon">star_half</span>
</div>
<span className="font-semibold text-on-surface">4.8</span>
<span className="text-slate-400 text-[11px]">(3,420 lượt đánh giá)</span>
</div>
</div>
</div>
<button className="px-3.5 py-1.5 rounded-lg border border-[#006B50] text-[#006B50] hover:bg-[#006B50] hover:text-white text-xs font-title-md font-semibold transition-all">
                Đọc thử
              </button>
</div>

<div className="pt-2 border-t border-slate-100">
<div className="flex items-center justify-between text-xs text-slate-500 mb-3">
<span className="flex items-center gap-1">
<span className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px]">❤</span>
<span className="w-4 h-4 rounded-full bg-[#006B50] text-white flex items-center justify-center text-[10px]">👍</span>
<span className="font-medium text-slate-700 ml-1">128 thích</span>
</span>
<div className="flex gap-3">
<span>24 bình luận</span>
<span>8 chia sẻ</span>
</div>
</div>
<div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-100 text-xs text-slate-600 font-title-md font-medium">
<button className="py-2 hover:bg-slate-50 rounded-lg flex items-center justify-center gap-1.5 transition-colors text-rose-600">
<span className="material-symbols-outlined text-[18px] fill-icon">favorite</span> Thích
                </button>
<button className="py-2 hover:bg-slate-50 rounded-lg flex items-center justify-center gap-1.5 transition-colors">
<span className="material-symbols-outlined text-[18px]">chat_bubble_outline</span> Bình luận
                </button>
<button className="py-2 hover:bg-slate-50 rounded-lg flex items-center justify-center gap-1.5 transition-colors">
<span className="material-symbols-outlined text-[18px]">share</span> Chia sẻ
                </button>
</div>
</div>

<div className="space-y-2.5 pt-2 bg-[#FAF9F6] p-3 rounded-lg border border-slate-100">
<div className="flex gap-2 text-xs">
<img className="w-7 h-7 rounded-full object-cover flex-shrink-0" alt="Portrait avatar of Mai Linh, an expressive Vietnamese woman with warm smile, casual coffee shop background." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDiVLWYLSdWPS1AfTPhALRyhC94QCy7pi41Nf_ERoUySFcdCvsjJmBzrYwGnK_MlgKB-mGaQ0wqEeZSGc48OgCkvih7p7tFk18tEM93nefAjbFVSofeIsUGPh6hl9LKFMXnZGifKaQXox3EcThYbUGcuI9ioh-LGdSBIPFggofWRiW_7q6TOAgtElrp5ohPvJ3fARrp5hrgcHrONED2oqzK5F989XICYNCzuu5GFd_a9ePQ58JKkimgWg" />
<div className="bg-white p-2 rounded-lg border border-slate-200/80 flex-1">
<div className="flex items-center justify-between">
<span className="font-title-md font-semibold text-on-surface">Mai Linh</span>
<span className="text-[10px] text-slate-400">1 giờ trước</span>
</div>
<p className="font-body-sm text-slate-700 mt-0.5">Đoạn cậu bé chăn cừu gặp vua xứ Salem thực sự là bài học lớn về 'Dấu hiệu của Vũ trụ'! Mình đọc 3 lần vẫn thấm.</p>
</div>
</div>
<div className="flex gap-2 text-xs">
<img className="w-7 h-7 rounded-full object-cover flex-shrink-0" alt="Portrait avatar of Hoang Nam, a young professional Vietnamese reader in dark spectacles, clean composition." src="https://lh3.googleusercontent.com/aida-public/AB6AXuA-guw9JXK-P1_C0bhvcrw6vvyJrU6DVTPH_rbbPTszHG5QkTfDbOdudGOIVfJOn8iihL7kdEUUPJSjrx5IA8YQfIFhaSzLmophBe0X7SOzlNXHZQ0FyHEkR3M48kUX0xEx8m8SiB_SgSLYQduuNCgjtFsKrL60wWaY_D2eM7LMcHvKRWhvbL6--aL3dE6VDWMQtME47raZxSbNA9QeMh7ypIwIdXz4bMktzqsqkqZRnAcICLtL8Q5bwQ" />
<div className="bg-white p-2 rounded-lg border border-slate-200/80 flex-1">
<div className="flex items-center justify-between">
<span className="font-title-md font-semibold text-on-surface">Hoàng Nam</span>
<span className="text-[10px] text-slate-400">45 phút trước</span>
</div>
<p className="font-body-sm text-slate-700 mt-0.5">Bạn đọc bản dịch của ai thế? Mình thấy bản dịch của Nhã Nam rất mượt mà.</p>
</div>
</div>
</div>
</article>



<article className="bg-surface-container-lowest border border-[#E8ECEA] rounded-xl p-5 shadow-[0_4px_20px_-2px_rgba(23,32,31,0.04)] space-y-4">

<div className="flex items-center justify-between">
<div className="flex items-center gap-3">
<img className="w-10 h-10 rounded-full object-cover" alt="Portrait photo of Le Thao My, a refined Vietnamese content creator and literature reviewer holding a notebook, gentle natural daylight." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCqP8wtVLtXm2jei8pUngkB6qYjnd00CuahKKcyHJI5Ni__JxXw4RMnZ6IUYgG1cNrZugLHVCUL0p15FepgI_-8wi5IPnZXHfQt0C4NdIJjhYc5khWqFhuJ-hEzeAat1YQbYgMnOS-CJiCHV9zj8Pc71-BbJYBr_2lcdpRK0xkq6w8Fh9CfOMIWmQ4Dc8PO634P8WIeaq8onPWV7Dy3ecpngbsyjmvMDkRUCamIZa73VSFhr3khRFrsmg" />
<div>
<div className="flex items-center gap-2">
<span className="font-title-md text-sm text-on-surface font-semibold">Lê Thảo My</span>
<span className="bg-orange-100 text-orange-700 text-[10px] font-label-sm font-semibold px-2 py-0.5 rounded-full">
                      Review Sách
                    </span>
</div>
<div className="flex items-center gap-1.5 text-xs text-slate-400">
<span>5 giờ trước</span>
<span>•</span>
<span className="text-emerald-700 font-medium flex items-center gap-0.5">
<span className="material-symbols-outlined text-[12px] fill-icon">verified_user</span> Đã mua tại HUKI
                    </span>
</div>
</div>
</div>
<div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
<span className="material-symbols-outlined text-[16px] text-amber-500 fill-icon">star</span>
<span className="font-bold text-xs text-amber-900">4.5 / 5.0</span>
</div>
</div>

<div className="flex items-center gap-3 bg-[#FAF9F6] p-3 rounded-lg border border-[#E8ECEA]">
<div className="w-12 h-16 rounded overflow-hidden flex-shrink-0 book-spine-crease shadow-sm border border-black/10">
<img className="w-full h-full object-cover" alt="Crisp book cover of Atomic Habits by James Clear with minimal typography, clean white and vermillion accents on warm paper texture." src="https://lh3.googleusercontent.com/aida-public/AB6AXuALel0qoczpvGcEvLg2Ptoy4TCRp8cxxS-K9vlTPcNYD-EBvgkbyAyB4iqHhcpnozxNYjOs5wp0mIJEdLyuCHdchHh73Mz98iHYg3hvACD-Ev57aT6yNVT8GWDYmageueDzSbylGWeJ1PbLyP5rBBvYubh81QJnTADNPVebvlp2qljmK2ujex8k34z5V-fVD3wk92o-bwwUQ5vHp_y7AgBGx-7FXJNfdkipZYppi8W9QtpaAGnKbDw6iQ" />
</div>
<div className="flex-1">
<h4 className="font-title-md text-sm text-on-surface font-semibold">Atomic Habits (Thay Đổi Tí Hon, Hiệu Quả Bất Ngờ)</h4>
<p className="font-body-sm text-xs text-slate-500">Tác giả: James Clear • Bestseller Thể loại Năng Suất</p>
</div>
<button className="px-3 py-1 bg-[#006B50] text-white text-xs font-semibold rounded hover:bg-[#004D38] transition-colors">
                Xem sách
              </button>
</div>

<blockquote className="bg-surface-container-low border-l-4 border-huki-amber p-4 rounded-r-lg">
<p className="font-headline-sm text-base italic text-on-surface font-serif leading-relaxed">
                “Thói quen nhỏ tạo nên bước ngoặt phi thường. Chúng ta thường đánh giá quá cao tầm quan trọng của một khoảnh khắc quyết định và đánh giá thấp giá trị của việc cải thiện từng chút một mỗi ngày.”
              </p>
</blockquote>

<p className="font-body-md text-sm text-on-surface leading-relaxed">
              Điểm mình thích nhất ở Atomic Habits là James Clear không viết sáo rỗng theo kiểu hô hào động lực. Ông đưa ra 4 quy luật thực thi rất khoa học: Khiến nó trở nên rõ ràng, hấp dẫn, dễ dàng và tạo cảm giác thỏa mãn ngay. Sau 2 tháng áp dụng phương pháp 'gắn kết thói quen', mình đã duy trì được việc đọc 25 trang sách mỗi tối trước khi ngủ mà không hề thấy mệt mỏi!
            </p>

<div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
<span className="flex items-center gap-1.5 font-medium text-slate-700">
<span className="material-symbols-outlined text-[16px] text-rose-500 fill-icon">favorite</span> 215 thích
              </span>
<span>42 bình luận • 19 đánh dấu lưu</span>
</div>
</article>



<article className="bg-surface-container-lowest border border-[#E8ECEA] rounded-xl p-5 shadow-[0_4px_20px_-2px_rgba(23,32,31,0.04)] space-y-4">

<div className="flex items-center justify-between">
<div className="flex items-center gap-3">
<img alt="Portrait photo of Tran Hoang Long, an intellectual Vietnamese reader and software architect, holding a cup of espresso next to a Kindle paperwhite." className="w-10 h-10 rounded-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBSz3_TlTXm0VoNI-RC8pCBPWVZqaPff990W8It6mddITB_SE6rwT6xWn--zMQkmAAxNoAbBBVoqfGxNbsupcsQANXYyzBroyA9fjKJUBC6qckCAUBTUQOvbp7bRHLexmY-n8d6dmwDIqJZW6l5nLyfGOEqQNKBNEIZrF8oGYjcm5td8HxWOyfL90j1vzJTvgKha_zLcYHNMDxlh1FzT6A2QvVW5PPByedDSoJsqtkUr0GLsj3tqdbRIQ" />
<div>
<div className="flex items-center gap-1.5">
<span className="font-title-md text-sm text-on-surface font-semibold">Trần Hoàng Long</span>
<span className="bg-blue-100 text-blue-700 text-[10px] font-label-sm font-semibold px-2 py-0.5 rounded-full">Thảo Luận</span>
</div>
<div className="text-xs text-slate-400">8 giờ trước • Chủ đề: Trải nghiệm đọc</div>
</div>
</div>
<button className="text-slate-400 hover:text-on-surface p-1">
<span className="material-symbols-outlined text-[20px]">more_horiz</span>
</button>
</div>

<p className="font-body-md text-sm text-on-surface leading-relaxed">
              Bạn thích đọc <strong>sách giấy</strong> hay <strong>Ebook</strong> hơn? Dạo gần đây mình chuyển hẳn sang đọc Ebook trên ứng dụng HUKI vì cực kỳ tiện lợi khi di chuyển máy bay, tra cứu từ vựng và đồng bộ ghi chú lên máy tính. Tuy nhiên mỗi khi về phòng sách, cảm giác lật mở từng trang sách giấy với mùi mực in vẫn có một ma lực khó thay thế. Anh em HUKI thuộc team nào? 📚📱
            </p>

<div className="space-y-2.5 bg-[#FAF9F6] p-4 rounded-xl border border-[#E8ECEA]">
<div className="text-xs font-title-md font-semibold text-slate-600 mb-1 flex items-center justify-between">
<span>Bình chọn cộng đồng (Đã có 1,280 lượt vote)</span>
<span className="text-emerald-700 font-label-sm">Kết thúc sau 2 ngày</span>
</div>

<div className="relative overflow-hidden border border-slate-200 rounded-lg p-3 cursor-pointer hover:border-huki-emerald transition-all bg-white">
<div className="absolute inset-0 bg-emerald-100/40 rounded-lg pointer-events-none" style={{ width: "54%" }}></div>
<div className="relative z-10 flex items-center justify-between text-xs font-title-md">
<span className="flex items-center gap-2 text-on-surface font-medium">
<span className="w-4 h-4 rounded-full border border-slate-400 flex items-center justify-center text-[10px]">✓</span>
                    📖 Team Sách Giấy truyền thống
                  </span>
<span className="font-bold text-huki-emerald">54%</span>
</div>
</div>

<div className="relative overflow-hidden border border-slate-200 rounded-lg p-3 cursor-pointer hover:border-huki-emerald transition-all bg-white">
<div className="absolute inset-0 bg-emerald-100/30 rounded-lg pointer-events-none" style={{ width: "32%" }}></div>
<div className="relative z-10 flex items-center justify-between text-xs font-title-md">
<span className="flex items-center gap-2 text-on-surface font-medium">
<span className="w-4 h-4 rounded-full border border-slate-400"></span>
                    📱 Team Ebook tiện lợi &amp; ghi chú nhanh
                  </span>
<span className="font-bold text-slate-700">32%</span>
</div>
</div>

<div className="relative overflow-hidden border border-slate-200 rounded-lg p-3 cursor-pointer hover:border-huki-emerald transition-all bg-white">
<div className="absolute inset-0 bg-emerald-100/20 rounded-lg pointer-events-none" style={{ width: "14%" }}></div>
<div className="relative z-10 flex items-center justify-between text-xs font-title-md">
<span className="flex items-center gap-2 text-on-surface font-medium">
<span className="w-4 h-4 rounded-full border border-slate-400"></span>
                    ☕ Linh hoạt cả hai tuỳ hoàn cảnh
                  </span>
<span className="font-bold text-slate-700">14%</span>
</div>
</div>
</div>

<div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
<span>340 bình luận sôi nổi</span>
<button className="text-huki-emerald hover:underline font-medium">Xem tất cả bình luận →</button>
</div>
</article>
</div>



<div className="col-span-12 lg:col-span-3 space-y-5">

<div className="bg-surface-container-lowest border border-[#E8ECEA] rounded-xl p-5 shadow-[0_4px_20px_-2px_rgba(23,32,31,0.04)]">
<div className="flex items-center justify-between mb-4">
<h3 className="font-title-md text-sm font-semibold text-on-surface flex items-center gap-1.5">
<span className="material-symbols-outlined text-[18px] text-amber-500 fill-icon">emoji_events</span>
                Top Độc Giả Tuần
              </h3>
<span className="text-[11px] text-slate-400">Tuần 14/2026</span>
</div>
<div className="space-y-3">

<div className="flex items-center justify-between">
<div className="flex items-center gap-2.5">
<span className="text-base font-bold text-amber-500 w-4 text-center">🥇</span>
<img alt="Portrait of Minh Anh, young Vietnamese female top reader avatar with joyful expression and bookshelf background." className="w-8 h-8 rounded-full object-cover border border-amber-300" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAqyHhW4LXQfPRM1Ay4dx7XHykIdRWOLx-aHxgF7fPapgMqUdwpyvn_9srxPh3TMPehJ5Cpi-GSUYNaY-nkXf5DOoNQX2HFeajGyHR6GBKBaAqGOh1w8lsTLtRyPRJZd0REgi_V7D35U1LpXioXY5Yz9XVG9tt4mEIf9reAfkhH703QC-jSNuNVIapjMF0pO6wTQPRvtZKEyf4KpFq2gMJ9b2cNA_13Cm6G07Xt6H8eAZWooNvGDsrW3w" />
<div>
<div className="font-title-md text-xs font-semibold text-on-surface">Minh Anh</div>
<div className="text-[10px] text-slate-400">Hà Nội</div>
</div>
</div>
<span className="font-label-sm text-xs font-bold text-huki-emerald bg-emerald-50 px-2 py-0.5 rounded">5 cuốn</span>
</div>

<div className="flex items-center justify-between">
<div className="flex items-center gap-2.5">
<span className="text-base font-bold text-slate-400 w-4 text-center">🥈</span>
<img alt="Portrait avatar of Gia Huy, young Vietnamese male bibliophile with glasses in a modern campus library." className="w-8 h-8 rounded-full object-cover border border-slate-300" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD5jNYeY5Lh5zt4nPpIMtylJhiwo766hxi3jgaDq9RwOkaYt23OrKHZ_41DVHzBkboxZ6Sb0dtKNBVoumnbDE7Aa8-iJ99lz3KHOFB02Guar7HBafaTOBqV7Cl9lzuA1owG_oHoffzsAn_Xe_IjEc7oOdt-J9Ktl_ljXmElGBKZou9G55KtvcvQHPYGzhesKyHPkLr4H6sckJMuc1ReSSJ-gMZFtuVhdLYHUlLpLLb_pUuwyGZmDLTuJw" />
<div>
<div className="font-title-md text-xs font-semibold text-on-surface">Gia Huy</div>
<div className="text-[10px] text-slate-400">Đà Nẵng</div>
</div>
</div>
<span className="font-label-sm text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">4 cuốn</span>
</div>

<div className="flex items-center justify-between">
<div className="flex items-center gap-2.5">
<span className="text-base font-bold text-amber-700 w-4 text-center">🥉</span>
<img alt="Portrait avatar of Duc Kien, Vietnamese male reader holding an open textbook, pleasant warm lighting." className="w-8 h-8 rounded-full object-cover border border-amber-700/30" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBF2oGpupLJaYRbeDnbFxeSf182zLMETdMdDIj4myEQr0Vr3Ogv-ivrBnDGflVZWb-OjuiD1VX5X-PVWwNKHxTUTpInuotxlBCerzs4-BKhbxUmLZWEdoBY5xC_NuOFMJEuEaXMzK0FXrnrMVOYaIqsW7ShHUVc_5Twk6DDfdg8S7pdrO9t9fzEdxIvhn_jJHeZZs15R2qTdUNV-aJWllG8hLRc7AlOOSEilRuc8bT9k25lR0YRXJiytg" />
<div>
<div className="font-title-md text-xs font-semibold text-on-surface">Đức Kiên</div>
<div className="text-[10px] text-slate-400">TP. Hồ Chí Minh</div>
</div>
</div>
<span className="font-label-sm text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">4 cuốn</span>
</div>

<div className="flex items-center justify-between text-xs">
<div className="flex items-center gap-2.5">
<span className="text-slate-400 font-semibold w-4 text-center">4</span>
<img alt="Avatar photo of Thao Vy, modern Vietnamese female reader with gentle smile in daylight setting." className="w-8 h-8 rounded-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAXahrZFzUjeSjG_otWYwEEASWdDF0lkiSAVdsNFHcOfs9iBxTbYFWIvmDpRZQ-tw5skEges3_c8GgGfl1mG8wXY1gQWw-1JKKmM44ZqMlv0aR9L2NFN1zSRbhyMg-4tAegnOglTv1LYGcGIr_jPwxPd-UC9o1gVTkXsRNI0-OPVzHJr7h3Z6-39qYVlMLRoBAXIOhDJeZort3TKPk9kRczPIxRsEyy0vILNCDNCnrAbAqmQUlQn-BGDA" />
<div className="font-title-md text-xs text-on-surface">Thảo Vy</div>
</div>
<span className="text-slate-500">3 cuốn</span>
</div>

<div className="flex items-center justify-between text-xs">
<div className="flex items-center gap-2.5">
<span className="text-slate-400 font-semibold w-4 text-center">5</span>
<img alt="Avatar photo of Hoang Nam, Vietnamese reader profile photo in urban study environment." className="w-8 h-8 rounded-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBSs4kvZwAfyi5GR5Yungn1PHt7yg9F0_Ft0uqtm7jDSK50jSR67IN63n0vEvPLRuOAGzqMpjDgkE-I63RQSuHwx9QKZS2E26GMzfqc0KereAKrlXWScuKbderyiFGOqBFjuZwPcgSas-ddtkvrxTG7KiTVOuWHGkeyb0j25RqsBwnO6o0gkQUl6w3qfRR8HPJMSfegAx5wts3iXs-MPP_rAbWJPIBD40EJ9OWR32JOq7aRgfL9k8ldlw" />
<div className="font-title-md text-xs text-on-surface">Hoàng Nam</div>
</div>
<span className="text-slate-500">3 cuốn</span>
</div>
</div>
</div>

<div className="bg-surface-container-lowest border border-[#E8ECEA] rounded-xl p-5 shadow-[0_4px_20px_-2px_rgba(23,32,31,0.04)]">
<div className="flex items-center justify-between mb-3">
<h3 className="font-title-md text-sm font-semibold text-on-surface flex items-center gap-1.5">
<span className="material-symbols-outlined text-[18px] text-huki-emerald">calendar_month</span>
                Nhịp Đọc Của Bạn
              </h3>
<span className="text-[10px] text-huki-emerald font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">12 Tuần</span>
</div>

<div className="grid grid-flow-col grid-rows-7 gap-1 p-2 bg-[#FAF9F6] rounded-lg border border-[#E8ECEA] justify-center">

<div className="w-2.5 h-2.5 rounded-sm bg-[#EEF7F4]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#EEF7F4]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#94F5D6]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#EEF7F4]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#78D8BA]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#EEF7F4]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#006B50]"></div>

<div className="w-2.5 h-2.5 rounded-sm bg-[#78D8BA]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#94F5D6]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#EEF7F4]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#006B50]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#004D38]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#78D8BA]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#EEF7F4]"></div>

<div className="w-2.5 h-2.5 rounded-sm bg-[#EEF7F4]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#006B50]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#78D8BA]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#94F5D6]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#EEF7F4]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#EEF7F4]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#004D38]"></div>

<div className="w-2.5 h-2.5 rounded-sm bg-[#006B50]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#006B50]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#78D8BA]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#004D38]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#006B50]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#94F5D6]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#78D8BA]"></div>

<div className="w-2.5 h-2.5 rounded-sm bg-[#EEF7F4]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#EEF7F4]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#94F5D6]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#78D8BA]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#EEF7F4]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#006B50]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#004D38]"></div>

<div className="w-2.5 h-2.5 rounded-sm bg-[#94F5D6]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#78D8BA]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#006B50]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#006B50]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#004D38]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#78D8BA]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#94F5D6]"></div>

<div className="w-2.5 h-2.5 rounded-sm bg-[#EEF7F4]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#94F5D6]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#EEF7F4]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#78D8BA]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#006B50]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#EEF7F4]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#94F5D6]"></div>

<div className="w-2.5 h-2.5 rounded-sm bg-[#78D8BA]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#006B50]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#004D38]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#006B50]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#78D8BA]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#94F5D6]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#004D38]"></div>

<div className="w-2.5 h-2.5 rounded-sm bg-[#EEF7F4]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#78D8BA]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#006B50]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#004D38]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#006B50]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#78D8BA]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#EEF7F4]"></div>

<div className="w-2.5 h-2.5 rounded-sm bg-[#94F5D6]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#EEF7F4]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#78D8BA]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#006B50]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#006B50]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#004D38]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#94F5D6]"></div>

<div className="w-2.5 h-2.5 rounded-sm bg-[#006B50]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#004D38]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#006B50]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#78D8BA]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#94F5D6]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#006B50]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#004D38]"></div>

<div className="w-2.5 h-2.5 rounded-sm bg-[#78D8BA]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#006B50]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#006B50]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#004D38]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#006B50]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#EEF7F4]"></div>
<div className="w-2.5 h-2.5 rounded-sm bg-[#EEF7F4]"></div>
</div>

<div className="flex items-center justify-between text-[11px] text-slate-500 mt-2.5">
<span>Ít</span>
<div className="flex items-center gap-1">
<span className="w-2 h-2 rounded-sm bg-[#EEF7F4]"></span>
<span className="w-2 h-2 rounded-sm bg-[#94F5D6]"></span>
<span className="w-2 h-2 rounded-sm bg-[#78D8BA]"></span>
<span className="w-2 h-2 rounded-sm bg-[#006B50]"></span>
<span className="w-2 h-2 rounded-sm bg-[#004D38]"></span>
</div>
<span>Nhiều</span>
</div>
<p className="font-body-sm text-[11px] text-slate-600 mt-2 text-center">
<strong>34 ngày</strong> có hoạt động đọc trong quý này
            </p>
</div>

<div className="bg-surface-container-lowest border border-[#E8ECEA] rounded-xl p-5 shadow-[0_4px_20px_-2px_rgba(23,32,31,0.04)]">
<h3 className="font-title-md text-sm font-semibold text-on-surface mb-3 flex items-center gap-1.5">
<span className="material-symbols-outlined text-[18px] text-rose-500">trending_up</span>
              Chủ Đề Đang Quan Tâm
            </h3>
<div className="space-y-2.5">
<Link className="block group" to="/">
<div className="flex justify-between items-center text-xs">
<span className="font-title-md font-semibold text-on-surface group-hover:text-huki-emerald transition-colors">
                    #PhátTriểnBảnThân
                  </span>
<span className="text-[11px] text-slate-400">12.4K bài</span>
</div>
<div className="text-[11px] text-slate-500">Kỷ luật, xây dựng thói quen và tư duy</div>
</Link>
<Link className="block group" to="/">
<div className="flex justify-between items-center text-xs">
<span className="font-title-md font-semibold text-on-surface group-hover:text-huki-emerald transition-colors">
                    #ReviewSách
                  </span>
<span className="text-[11px] text-slate-400">8.9K bài</span>
</div>
<div className="text-[11px] text-slate-500">Đánh giá tác phẩm mới phát hành</div>
</Link>
<Link className="block group" to="/">
<div className="flex justify-between items-center text-xs">
<span className="font-title-md font-semibold text-on-surface group-hover:text-huki-emerald transition-colors">
                    #ThửTháchĐọc2026
                  </span>
<span className="text-[11px] text-slate-400">6.2K bài</span>
</div>
<div className="text-[11px] text-slate-500">Nhật ký hoàn thành 30 cuốn/năm</div>
</Link>
<Link className="block group" to="/">
<div className="flex justify-between items-center text-xs">
<span className="font-title-md font-semibold text-on-surface group-hover:text-huki-emerald transition-colors">
                    #CôngNghệAI
                  </span>
<span className="text-[11px] text-slate-400">4.1K bài</span>
</div>
<div className="text-[11px] text-slate-500">Sách tri thức thời đại số</div>
</Link>
</div>
</div>

<div className="bg-surface-container-lowest border border-[#E8ECEA] rounded-xl p-5 shadow-[0_4px_20px_-2px_rgba(23,32,31,0.04)]">
<h3 className="font-title-md text-sm font-semibold text-on-surface mb-3 flex items-center gap-1.5">
<span className="material-symbols-outlined text-[18px] text-huki-emerald">groups</span>
              CLB Có Thể Bạn Quan Tâm
            </h3>
<div className="space-y-3.5">

<div className="flex items-center justify-between">
<div>
<h4 className="font-title-md text-xs font-semibold text-on-surface">CLB Văn Học Kinh Điển</h4>
<p className="font-body-sm text-[11px] text-slate-400">2.4K thành viên • 18 bài/ngày</p>
</div>
<button className="px-2.5 py-1 text-xs font-title-md font-semibold text-[#006B50] bg-huki-mint-bg hover:bg-[#006B50] hover:text-white rounded-md transition-colors">
                  Tham gia
                </button>
</div>

<div className="flex items-center justify-between">
<div>
<h4 className="font-title-md text-xs font-semibold text-on-surface">AI &amp; Kỷ Nguyên Số</h4>
<p className="font-body-sm text-[11px] text-slate-400">1.8K thành viên • 12 bài/ngày</p>
</div>
<button className="px-2.5 py-1 text-xs font-title-md font-semibold text-[#006B50] bg-huki-mint-bg hover:bg-[#006B50] hover:text-white rounded-md transition-colors">
                  Tham gia
                </button>
</div>

<div className="flex items-center justify-between">
<div>
<h4 className="font-title-md text-xs font-semibold text-on-surface">Tâm Lý &amp; Chữa Lành</h4>
<p className="font-body-sm text-[11px] text-slate-400">3.1K thành viên • 25 bài/ngày</p>
</div>
<button className="px-2.5 py-1 text-xs font-title-md font-semibold text-[#006B50] bg-huki-mint-bg hover:bg-[#006B50] hover:text-white rounded-md transition-colors">
                  Tham gia
                </button>
</div>
</div>
</div>

<div className="bg-surface-container-lowest border border-[#E8ECEA] rounded-xl p-4 shadow-[0_4px_20px_-2px_rgba(23,32,31,0.04)]">
<div className="flex items-center gap-3">
<div className="w-12 h-16 rounded overflow-hidden flex-shrink-0 book-spine-crease shadow-sm border border-black/10">
<img alt="Book cover of The Psychology of Money by Morgan Housel with minimalist green and cream design, elegant typography for finance literature." className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDbj0BFswyZls0vALc1YthzmuB1SDYAr0z_z_ZKC3eDYQj_GALoNZHyXyXzkivOy4UM8JDxJDH-9H7oEleMzXJIw9fTuveUvSxwPN22aIEhW2Ud-n4OjiAXDe1xHMYRUAK05gsTRh_dRaLZ77Kc-pwOONIYteU3nIN_0Ea7iwPyApMB-vO0IEK--JdSIIo3uZF93A2RczazCAPy-exJbv6yCl0mK7KDoe27sd6-xnR3X_NP_GORVH_ujw" />
</div>
<div>
<div className="text-[10px] uppercase tracking-wider text-huki-emerald font-label-sm font-semibold">
                  Mọi người đang đọc
                </div>
<h4 className="font-title-md text-xs text-on-surface font-semibold line-clamp-1">
                  Tâm Lý Học Về Tiền
                </h4>
<p className="font-body-sm text-[11px] text-slate-500">Morgan Housel</p>
<div className="flex items-center gap-1 text-[11px] text-slate-600 mt-1">
<span className="material-symbols-outlined text-[14px] text-[#006B50]">trending_up</span>
<span>1.4K người đang đọc tuần này</span>
</div>
</div>
</div>
</div>
</div>
</div>
</main>
    </div>
  );
}
