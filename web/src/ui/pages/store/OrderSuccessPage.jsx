import React from 'react';
import { Link } from 'react-router-dom';

export default function OrderSuccessPage() {
  return (
    <div className="w-full bg-background text-on-surface font-body-md min-h-screen py-8">
      <main className="w-full max-w-[1280px] mx-auto px-4 md:px-6 flex flex-col gap-10">
        <nav aria-label="Tiến trình thanh toán" className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl px-8 py-4 shadow-sm">
<ol className="flex items-center justify-between max-w-3xl mx-auto relative">

<div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-[2px] bg-tertiary z-0"></div>

<li className="flex flex-col items-center relative z-10">
<div className="w-8 h-8 rounded-full bg-tertiary text-on-tertiary flex items-center justify-center font-label-md font-bold shadow-sm">
<span className="material-symbols-outlined text-[18px]" data-icon="check">check</span>
</div>
<span className="mt-1.5 font-label-md text-on-surface">Giỏ hàng</span>
</li>

<li className="flex flex-col items-center relative z-10">
<div className="w-8 h-8 rounded-full bg-tertiary text-on-tertiary flex items-center justify-center font-label-md font-bold shadow-sm">
<span className="material-symbols-outlined text-[18px]" data-icon="check">check</span>
</div>
<span className="mt-1.5 font-label-md text-on-surface">Thông tin</span>
</li>

<li className="flex flex-col items-center relative z-10">
<div className="w-8 h-8 rounded-full bg-tertiary text-on-tertiary flex items-center justify-center font-label-md font-bold shadow-sm">
<span className="material-symbols-outlined text-[18px]" data-icon="check">check</span>
</div>
<span className="mt-1.5 font-label-md text-on-surface">Thanh toán</span>
</li>

<li className="flex flex-col items-center relative z-10">
<div className="w-8 h-8 rounded-full bg-tertiary text-on-tertiary ring-4 ring-tertiary/20 flex items-center justify-center font-label-md font-bold shadow-sm">
<span className="material-symbols-outlined text-[18px] fill-icon" data-icon="check_circle">check_circle</span>
</div>
<span className="mt-1.5 font-title-md text-body-sm text-tertiary">Hoàn tất</span>
</li>
</ol>
</nav>

<section className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-8 lg:p-10 shadow-sm text-center flex flex-col items-center relative overflow-hidden">

<div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-tertiary/5 rounded-full blur-3xl pointer-events-none"></div>

<div className="w-16 h-16 rounded-full bg-tertiary/10 border border-tertiary/30 text-tertiary flex items-center justify-center mb-4">
<span className="material-symbols-outlined text-[36px] fill-icon" data-icon="task_alt">task_alt</span>
</div>
<h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
          Thanh Toán Thành Công!
        </h1>
<p className="font-body-lg text-on-surface-variant max-w-xl mt-2">
          Cảm ơn bạn đã mua sách tại HUKI. Đơn hàng của bạn đã được xác nhận và đang được các nhà sách đối tác xử lý cẩn thận.
        </p>

<div className="mt-5 flex flex-wrap items-center justify-center gap-3">
<div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-container-low border border-surface-variant">
<span className="font-body-md text-on-surface-variant">Mã đơn hàng:</span>
<span className="font-title-md text-on-surface tracking-wide" id="order-code">#HUKI2609071842</span>
<button className="text-tertiary hover:text-on-surface p-1 rounded transition-colors" onClick={() => { navigator.clipboard.writeText('HUKI2609071842'); alert('Đã sao chép mã đơn hàng!'); }} title="Sao chép">
<span className="material-symbols-outlined text-[18px]" data-icon="content_copy">content_copy</span>
</button>
</div>
<span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-tertiary/10 text-tertiary font-label-md">
<span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
            Đã thanh toán (PayOS)
          </span>
</div>

<div className="mt-6 pt-6 border-t border-surface-variant w-full max-w-3xl flex flex-wrap items-center justify-around gap-4 text-body-sm text-on-surface-variant">
<div>
<span className="block text-on-surface-variant/80 font-label-sm">Phương thức:</span>
<span className="font-title-md text-on-surface flex items-center gap-1 justify-center mt-0.5">
<span className="material-symbols-outlined text-[16px] text-tertiary" data-icon="qr_code_2">qr_code_2</span>
              PayOS (VietQR)
            </span>
</div>
<div className="hidden sm:block h-6 w-[1px] bg-surface-variant"></div>
<div>
<span className="block text-on-surface-variant/80 font-label-sm">Thời gian thanh toán:</span>
<span className="font-title-md text-on-surface mt-0.5 block">07/09/2026 · 11:24</span>
</div>
<div className="hidden sm:block h-6 w-[1px] bg-surface-variant"></div>
<div>
<span className="block text-on-surface-variant/80 font-label-sm">Tổng thanh toán:</span>
<span className="font-title-md text-primary text-[17px] mt-0.5 block">461.000đ</span>
</div>
<div className="hidden sm:block h-6 w-[1px] bg-surface-variant"></div>
<div>
<span className="block text-on-surface-variant/80 font-label-sm">Hóa đơn điện tử:</span>
<span className="font-title-md text-on-surface mt-0.5 block">Đã gửi kien***@gmail.com</span>
</div>
</div>
</section>

<section className="grid grid-cols-1 lg:grid-cols-2 gap-6">

<div className="bg-surface-container-lowest border border-outline-variant/70 rounded-2xl p-6 lg:p-7 flex flex-col justify-between shadow-sm relative">
<div>
<div className="flex items-start justify-between gap-4">
<div className="flex items-center gap-3">
<div className="w-12 h-12 rounded-xl bg-surface-container text-on-surface flex items-center justify-center">
<span className="material-symbols-outlined text-[26px]" data-icon="local_shipping">local_shipping</span>
</div>
<div>
<span className="font-label-sm uppercase tracking-wider text-on-surface-variant">Đơn hàng hiện vật</span>
<h3 className="font-title-lg text-title-lg text-on-surface">Sách Giấy Đang Được Chuẩn Bị</h3>
</div>
</div>
<span className="px-2.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm font-semibold">
                3 cuốn · 2 kiện
              </span>
</div>
<p className="font-body-md text-on-surface-variant mt-4">
              Các nhà sách đối tác đã nhận được đơn hàng và đang đóng gói cẩn thận để bàn giao cho đơn vị vận chuyển tiêu chuẩn.
            </p>

<div className="mt-5 p-4 rounded-xl bg-surface-container-low border border-surface-variant flex flex-col gap-3">
<div className="flex items-center gap-2 font-body-sm text-on-surface">
<span className="material-symbols-outlined text-tertiary text-[20px]" data-icon="event_available">event_available</span>
<span><strong>Dự kiến nhận hàng:</strong> 09/09 – 12/09/2026</span>
</div>
<div className="flex items-start gap-2 font-body-sm text-on-surface-variant">
<span className="material-symbols-outlined text-on-surface-variant text-[20px] flex-shrink-0 mt-0.5" data-icon="location_on">location_on</span>
<div>
<strong className="text-on-surface">Lê Đức Kiên</strong> · 09••••••••<br />
                  12 Nguyễn Văn Bảo, Phường Hạnh Thông, Quận Gò Vấp, TP. Hồ Chí Minh
                </div>
</div>
</div>
</div>
<div className="mt-6 pt-4 border-t border-surface-variant flex items-center justify-between">
<button className="h-11 px-5 rounded-lg border border-tertiary text-tertiary hover:bg-tertiary/5 font-title-md text-body-sm flex items-center gap-2 transition-colors">
<span className="material-symbols-outlined text-[18px]" data-icon="local_shipping">local_shipping</span>
              Theo Dõi Đơn Hàng
            </button>
<span className="text-body-sm text-on-surface-variant">Giao bởi Viettel Post &amp; GHN</span>
</div>
</div>

<div className="bg-[#f0f9f6] border border-tertiary/30 rounded-2xl p-6 lg:p-7 flex flex-col justify-between shadow-sm relative overflow-hidden">
<div className="absolute top-0 right-0 w-32 h-32 bg-tertiary/10 rounded-full blur-2xl pointer-events-none"></div>
<div>
<div className="flex items-start justify-between gap-4">
<div className="flex items-center gap-3">
<div className="w-12 h-12 rounded-xl bg-tertiary text-on-tertiary flex items-center justify-center shadow-sm">
<span className="material-symbols-outlined text-[26px] fill-icon" data-icon="menu_book">menu_book</span>
</div>
<div>
<span className="font-label-sm uppercase tracking-wider text-tertiary font-semibold">Tài nguyên số Huki</span>
<h3 className="font-title-lg text-title-lg text-on-surface">Ebook Đã Sẵn Sàng Trong Tủ Sách!</h3>
</div>
</div>
<span className="px-2.5 py-1 rounded-full bg-tertiary text-on-tertiary font-label-sm font-semibold flex items-center gap-1">
<span className="material-symbols-outlined text-[14px]" data-icon="lock_open">lock_open</span>
                Kích hoạt ngay
              </span>
</div>
<p className="font-body-md text-on-surface-variant mt-4">
              Bản quyền số vĩnh viễn đã được cấp thành công vào tài khoản <strong className="text-on-surface font-medium">kien***@gmail.com</strong> trên hệ sinh thái ứng dụng và web reader của HUKI.
            </p>

<div className="mt-5 p-3.5 rounded-xl bg-surface-container-lowest border border-tertiary/20 flex items-center gap-4 shadow-sm">
<div className="w-14 h-20 rounded-md overflow-hidden flex-shrink-0 spine-crease bg-surface-container border border-surface-variant shadow">
<img className="w-full h-full object-cover" alt="Editorial book cover photograph for Deep Work by Cal Newport, scholarly minimalist aesthetic with warm ivory background and deep charcoal typographic title, clean spine crease shadow overlay, high-end Vietnamese publication design." src="https://lh3.googleusercontent.com/aida-public/AB6AXuB_3oFQQ0COlSWVlT3EZesSWfAtXv1YVkKaGiznuKgJH_fFivK405_dBbTi3dukWOkCbF7AKVcF1ztkXfC36q86IK1y4qxSZfbmahN6cW5Y5Bp-N34LBghafXWVQ9iZ3Ub6P7xhdVpCvm67AhZ73aZ2TXGvrd2XTGBly2rDOghMvXTIZJbQkQM05P8RW9DiBGU6Pq2b2wQO8y_Lft0Vvg7113fByAEOOjrVNvq5kSNN-GlGun0tE3XcxA" />
</div>
<div className="flex-1 min-w-0">
<div className="flex items-center gap-2">
<span className="px-1.5 py-0.5 rounded bg-tertiary/10 text-tertiary font-label-sm text-[10px]">Ebook (EPUB)</span>
<span className="font-label-sm text-on-surface-variant">Không giới hạn đọc offline</span>
</div>
<h4 className="font-title-md text-body-md text-on-surface truncate mt-1">Deep Work – Làm Ra Làm, Chơi Ra Chơi</h4>
<p className="font-body-sm text-on-surface-variant">Tác giả: Cal Newport · NXB Trẻ &amp; Alpha Books</p>
</div>
</div>
</div>
<div className="mt-6 pt-4 border-t border-tertiary/20 flex flex-wrap items-center justify-between gap-3">
<Link className="h-11 px-6 rounded-lg bg-tertiary hover:bg-[#005240] text-on-tertiary font-title-md text-body-sm flex items-center gap-2 transition-all shadow-sm" to="/reader">
              Đọc Ngay Bây Giờ
              <span className="material-symbols-outlined text-[18px]" data-icon="arrow_forward">arrow_forward</span>
</Link>
<Link className="font-title-md text-body-sm text-tertiary hover:underline flex items-center gap-1" to="/library">
              Mở Tủ Sách Của Tôi
              <span className="material-symbols-outlined text-[16px]" data-icon="open_in_new">open_in_new</span>
</Link>
</div>
</div>
</section>

<div className="flex items-center justify-center -mt-2">
<Link className="font-body-md text-on-surface-variant hover:text-primary flex items-center gap-1 transition-colors" to="/">
<span className="material-symbols-outlined text-[18px]" data-icon="west">west</span>
          Tiếp tục mua sắm các tựa sách khác trên HUKI
        </Link>
</div>



<section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

<div className="lg:col-span-8 flex flex-col gap-6">
<div className="flex items-center justify-between border-b border-surface-variant pb-3">
<h2 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
<span className="material-symbols-outlined text-tertiary text-[24px]" data-icon="inventory_2">inventory_2</span>
              Chi Tiết Đơn Hàng Theo Nhà Xuất Bản &amp; Đối Tác
            </h2>
<span className="font-body-sm text-on-surface-variant">2 nhà bán lẻ</span>
</div>

<div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl overflow-hidden shadow-sm">

<div className="bg-surface-container-low px-5 py-3.5 border-b border-surface-variant flex flex-wrap items-center justify-between gap-3">
<div className="flex items-center gap-2.5">
<span className="material-symbols-outlined text-primary text-[20px]" data-icon="store">store</span>
<span className="font-title-md text-body-md text-on-surface">Alpha Books Official</span>
<span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-label-sm">Chính Hãng</span>
<span className="text-surface-dim">•</span>
<span className="font-body-sm text-on-surface-variant">Mã phụ: #HUKI-AB-1842</span>
</div>
<span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm flex items-center gap-1 font-semibold">
<span className="material-symbols-outlined text-[14px]" data-icon="hourglass_top">hourglass_top</span>
                Đang chuẩn bị hàng
              </span>
</div>

<div className="p-5 flex flex-col divide-y divide-surface-variant">

<div className="py-4 first:pt-0 last:pb-0 flex items-start gap-4">
<div className="w-16 h-24 rounded-lg overflow-hidden flex-shrink-0 spine-crease bg-surface-container border border-surface-variant shadow-sm">
<img className="w-full h-full object-cover" alt="Editorial book cover photograph of Atomic Habits Vietnamese edition with white background, yellow-orange abstract microdots, clean typography, soft library ambient lighting, subtle book spine texture." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDBansMhYOtg3m8uwPM9tYbABOAWqFiGJWbIkAHD8zlz0p63yT-w4XdiitY70Pqo08r68qZE_f7NVKVn32WPJB8Nyw13iLqneaJ6d56DNmrhLKwtcBkEGY_bIq36KgOJRIwZrjOqVZaemgWQvsjFJbDPrzGwd6I0MMxUGJQAp_MC6odl9Hftpkb7UTPgwiAPddbO7RUOlJAF6sT9ZuilwUff44ZoQqIYME5bukeJoPUGDj38X6o2znkYw" />
</div>
<div className="flex-1 min-w-0">
<div className="flex items-start justify-between gap-2">
<div>
<h4 className="font-title-md text-body-md text-on-surface">Atomic Habits – Thay Đổi Tí Hon, Hiệu Quả Bất Ngờ</h4>
<p className="font-body-sm text-on-surface-variant mt-0.5">Tác giả: James Clear</p>
</div>
<span className="font-title-md text-body-md text-on-surface flex-shrink-0">129.000đ</span>
</div>
<div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-body-sm">
<div className="flex items-center gap-2">
<span className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-label-sm">Sách giấy (Bìa mềm)</span>
<span className="text-on-surface-variant">Số lượng: x1</span>
</div>
<span className="inline-flex items-center gap-1 text-on-surface-variant font-label-sm">
<span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                      Đang chuẩn bị sách tại kho
                    </span>
</div>
</div>
</div>

<div className="py-4 first:pt-0 last:pb-0 flex items-start gap-4">
<div className="w-16 h-24 rounded-lg overflow-hidden flex-shrink-0 spine-crease bg-surface-container border border-surface-variant shadow-sm">
<img className="w-full h-full object-cover" alt="Editorial cover of Deep Work Cal Newport in crisp Vietnamese translation, minimalist warm background, dark typography, digital preview badge, high literary elegance." src="https://lh3.googleusercontent.com/aida-public/AB6AXuANnrDPPiP33MiTotgyvHl2BGpXAUZPI9r9Z7hupeAby6xnAkETDv1LZZKgy4PSLu9y16UkB7tgO9cmuXhrHPdFgTesUeaH3pyfzTQ9KlLJAgJKXc18EqJd4Mhv_owaUiz8FjzGI8hZ07qvDqH5CQ_cfiKlKPMoaxNWB_Q3KtXj-xgpxjjGHG0O8LJgKs9590hmbAiXiNbZfln6HPJ1SSQWu8NvYCnY7xEnBf8lNuOXv2kOFtcoSS9UgA" />
</div>
<div className="flex-1 min-w-0">
<div className="flex items-start justify-between gap-2">
<div>
<h4 className="font-title-md text-body-md text-on-surface">Deep Work – Làm Ra Làm, Chơi Ra Chơi</h4>
<p className="font-body-sm text-on-surface-variant mt-0.5">Tác giả: Cal Newport</p>
</div>
<span className="font-title-md text-body-md text-on-surface flex-shrink-0">79.000đ</span>
</div>
<div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-body-sm">
<div className="flex items-center gap-2">
<span className="px-2 py-0.5 rounded bg-tertiary/10 text-tertiary font-label-sm">Ebook bản quyền số</span>
<span className="text-on-surface-variant">Số lượng: x1</span>
</div>
<span className="inline-flex items-center gap-1 text-tertiary font-label-sm font-semibold">
<span className="material-symbols-outlined text-[15px]" data-icon="check_circle">check_circle</span>
                      Đã cấp quyền đọc tức thì
                    </span>
</div>
</div>
</div>
</div>

<div className="bg-surface-container-low/50 px-5 py-3 border-t border-surface-variant flex items-center justify-between text-body-sm">
<span className="text-on-surface-variant flex items-center gap-1.5">
<span className="material-symbols-outlined text-[18px]" data-icon="local_shipping">local_shipping</span>
                Phương thức vận chuyển sách giấy: Giao hàng tiêu chuẩn
              </span>
<span className="font-title-md text-on-surface">25.000đ</span>
</div>
</div>

<div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl overflow-hidden shadow-sm">

<div className="bg-surface-container-low px-5 py-3.5 border-b border-surface-variant flex flex-wrap items-center justify-between gap-3">
<div className="flex items-center gap-2.5">
<span className="material-symbols-outlined text-primary text-[20px]" data-icon="store">store</span>
<span className="font-title-md text-body-md text-on-surface">Nhà Sách HUKI Partner – First News Trí Việt</span>
<span className="px-2 py-0.5 rounded bg-tertiary/10 text-tertiary font-label-sm">Đối Tác Uy Tín</span>
<span className="text-surface-dim">•</span>
<span className="font-body-sm text-on-surface-variant">Mã phụ: #HUKI-HP-1843</span>
</div>
<span className="px-2.5 py-0.5 rounded-full bg-surface-container-highest text-on-surface font-label-sm flex items-center gap-1 font-medium">
<span className="material-symbols-outlined text-[14px]" data-icon="done">done</span>
                Đã xác nhận đơn
              </span>
</div>

<div className="p-5">

<div className="flex items-start gap-4">
<div className="w-16 h-24 rounded-lg overflow-hidden flex-shrink-0 spine-crease bg-surface-container border border-surface-variant shadow-sm">
<img className="w-full h-full object-cover" alt="Editorial book cover photograph of Psychology of Money Vietnamese translation, soft warm parchment paper textured background, elegant serif title in dark emerald ink, studio lighting." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDmwUC85OFpm1hCBeBow5IobLrU-51yfTG6ElU3ETuHBcgSGMKv9q6PdHuC2XE1mO6zmNhYcsXC_UB7Bye-FYbAkpv824eYGfar-inQ4pJ3mzo1ZbHR4V6s9eFbPxRO1LStnynysaDGqkGvQzYNFU1VWRjjR5FCl8TETq0JWErPkjdvsQntvxNWqhO2ZNqat2q9-8MHm95aRwyLGDGUPTx2EYyqnnTUayPwnw2r_nOarHGVBeZr8_-yNw" />
</div>
<div className="flex-1 min-w-0">
<div className="flex items-start justify-between gap-2">
<div>
<h4 className="font-title-md text-body-md text-on-surface">Tâm Lý Học Về Tiền (The Psychology of Money)</h4>
<p className="font-body-sm text-on-surface-variant mt-0.5">Tác giả: Morgan Housel</p>
</div>
<div className="text-right">
<span className="font-title-md text-body-md text-on-surface block">298.000đ</span>
<span className="font-body-sm text-on-surface-variant text-[12px]">149.000đ / cuốn</span>
</div>
</div>
<div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-body-sm">
<div className="flex items-center gap-2">
<span className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-label-sm">Sách giấy (Bìa mềm)</span>
<span className="text-on-surface-variant">Số lượng: x2</span>
</div>
<span className="inline-flex items-center gap-1 text-on-surface-variant font-label-sm">
<span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                      Đang đóng gói kiện hàng
                    </span>
</div>
</div>
</div>
</div>

<div className="bg-surface-container-low/50 px-5 py-3 border-t border-surface-variant flex items-center justify-between text-body-sm">
<span className="text-on-surface-variant flex items-center gap-1.5">
<span className="material-symbols-outlined text-[18px]" data-icon="local_shipping">local_shipping</span>
                Phương thức vận chuyển sách giấy: Giao hàng tiết kiệm
              </span>
<span className="font-title-md text-on-surface">20.000đ</span>
</div>
</div>
</div>

<div className="lg:col-span-4 flex flex-col gap-6">
<div className="border-b border-surface-variant pb-3">
<h2 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
<span className="material-symbols-outlined text-primary text-[24px]" data-icon="receipt">receipt</span>
              Tóm Tắt Thanh Toán
            </h2>
</div>

<div className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-6 shadow-sm flex flex-col gap-4">
<div className="flex items-center justify-between text-body-md">
<span className="text-on-surface-variant">Tổng tiền hàng (4 sản phẩm)</span>
<span className="font-body-md text-on-surface">506.000đ</span>
</div>
<div className="flex items-center justify-between text-body-md">
<span className="text-on-surface-variant flex items-center gap-1">
                Voucher &amp; Ưu đãi VIP Bạc
                <span className="material-symbols-outlined text-primary text-[16px]" data-icon="sell">sell</span>
</span>
<span className="font-body-md text-primary font-medium">-90.000đ</span>
</div>
<div className="flex items-center justify-between text-body-md">
<span className="text-on-surface-variant">Phí vận chuyển (2 nhà sách)</span>
<span className="font-body-md text-on-surface">45.000đ</span>
</div>
<div className="h-[1px] bg-surface-variant my-1"></div>
<div className="flex items-baseline justify-between">
<div>
<span className="font-title-lg text-title-lg text-on-surface block">Tổng Đã Thanh Toán</span>
<span className="font-label-sm text-tertiary">PayOS • Giao dịch hoàn tất</span>
</div>
<span className="font-headline-md text-headline-md font-bold text-primary">461.000đ</span>
</div>

<div className="mt-4 p-3.5 rounded-lg bg-surface-container-low border border-surface-variant text-body-sm flex items-start gap-2.5">
<span className="material-symbols-outlined text-tertiary text-[20px] flex-shrink-0 mt-0.5" data-icon="description">description</span>
<div>
<strong className="text-on-surface font-title-md">Hóa đơn điện tử e-VAT:</strong>
<p className="text-on-surface-variant text-[12px] mt-0.5">
                  Hóa đơn VAT điện tử sẽ được xuất và gửi tự động về email <span className="font-medium text-on-surface">kien***@gmail.com</span> trong vòng 24 giờ.
                </p>
</div>
</div>

<div className="mt-3 flex flex-col gap-2">
<button className="w-full h-10 rounded-lg bg-surface-container hover:bg-surface-variant text-on-surface font-title-md text-body-sm flex items-center justify-center gap-2 transition-colors">
<span className="material-symbols-outlined text-[18px]" data-icon="print">print</span>
                In Biên Lai Đơn Hàng
              </button>
<button className="w-full h-10 rounded-lg text-tertiary hover:bg-tertiary/5 font-title-md text-body-sm flex items-center justify-center gap-1 transition-colors">
<span className="material-symbols-outlined text-[18px]" data-icon="support_agent">support_agent</span>
                Cần hỗ trợ về đơn hàng này?
              </button>
</div>
</div>

<div className="p-4 rounded-xl bg-surface-container-low/60 border border-surface-variant flex items-center gap-3">
<span className="material-symbols-outlined text-tertiary text-[28px]" data-icon="security">security</span>
<div className="text-body-sm">
<span className="font-title-md text-on-surface block">Cam Kết Độc Quyền HUKI</span>
<span className="text-on-surface-variant text-[12px]">Đổi trả sách giấy trong 7 ngày nếu lỗi in ấn. Ebook cam kết bản quyền chính chủ 100%.</span>
</div>
</div>
</div>
</section>



<section className="bg-surface-container-lowest border border-outline-variant/70 rounded-2xl p-8 shadow-sm">
<div className="max-w-2xl">
<span className="font-label-sm uppercase tracking-wider text-tertiary font-semibold">Hệ sinh thái đọc HUKI</span>
<h2 className="font-headline-md text-headline-md text-on-surface mt-1">
            Hành Trình Đọc Của Bạn Bắt Đầu Từ Đây
          </h2>
<p className="font-body-md text-on-surface-variant mt-1.5">
            Dù đọc ebook tức thì hay đón chờ sách giấy về tận tay, bạn đã là một phần của cộng đồng yêu sách HUKI.
          </p>
</div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">

<div className="p-5 rounded-xl bg-surface-container-low border border-surface-variant flex flex-col justify-between">
<div>
<div className="w-10 h-10 rounded-lg bg-tertiary/10 text-tertiary flex items-center justify-center font-bold mb-4 font-headline-sm">
                1
              </div>
<h3 className="font-title-lg text-title-md text-on-surface">Mở Ebook Đọc Ngay</h3>
<p className="font-body-sm text-on-surface-variant mt-2">
                Trải nghiệm trình đọc hiện đại Huki Reader trên trình duyệt web hoặc ứng dụng di động iOS/Android không cần tải file nặng.
              </p>
</div>
<Link className="mt-4 font-title-md text-body-sm text-tertiary hover:underline flex items-center gap-1" to="/reader">
              Khám phá Web Reader
              <span className="material-symbols-outlined text-[16px]" data-icon="arrow_forward">arrow_forward</span>
</Link>
</div>

<div className="p-5 rounded-xl bg-surface-container-low border border-surface-variant flex flex-col justify-between">
<div>
<div className="w-10 h-10 rounded-lg bg-tertiary/10 text-tertiary flex items-center justify-center font-bold mb-4 font-headline-sm">
                2
              </div>
<h3 className="font-title-lg text-title-md text-on-surface">Đồng Bộ &amp; Ghi Chú</h3>
<p className="font-body-sm text-on-surface-variant mt-2">
                Highlight các đoạn văn tâm đắc, lưu trích dẫn và đồng bộ trang đang đọc liền mạch giữa điện thoại, máy tính bảng và laptop.
              </p>
</div>
<Link className="mt-4 font-title-md text-body-sm text-tertiary hover:underline flex items-center gap-1" to="/library">
              Xem Tủ Sách Cá Nhân
              <span className="material-symbols-outlined text-[16px]" data-icon="arrow_forward">arrow_forward</span>
</Link>
</div>

<div className="p-5 rounded-xl bg-surface-container-low border border-surface-variant flex flex-col justify-between">
<div>
<div className="w-10 h-10 rounded-lg bg-tertiary/10 text-tertiary flex items-center justify-center font-bold mb-4 font-headline-sm">
                3
              </div>
<h3 className="font-title-lg text-title-md text-on-surface">Thảo Luận &amp; Viết Review</h3>
<p className="font-body-sm text-on-surface-variant mt-2">
                Tham gia phòng đọc ảo cùng 48.000+ thành viên mê sách, trao đổi góc nhìn và nhận điểm thưởng cho mỗi bài review chất lượng.
              </p>
</div>
<Link className="mt-4 font-title-md text-body-sm text-tertiary hover:underline flex items-center gap-1" to="/community">
              Ghé Mạng Xã Hội Sách
              <span className="material-symbols-outlined text-[16px]" data-icon="arrow_forward">arrow_forward</span>
</Link>
</div>
</div>

<div className="mt-8 p-4 rounded-xl bg-surface-container flex flex-wrap items-center justify-between gap-4">
<div className="flex items-center gap-3">
<span className="material-symbols-outlined text-primary text-[28px]" data-icon="celebration">celebration</span>
<div>
<span className="font-title-md text-body-md text-on-surface block">Chia sẻ cuốn sách mới bạn vừa sở hữu</span>
<span className="font-body-sm text-on-surface-variant">Lan tỏa cảm hứng đọc sách cùng bạn bè trên Mạng xã hội HUKI</span>
</div>
</div>
<button className="h-10 px-5 rounded-lg bg-primary hover:bg-[#922313] text-on-primary font-title-md text-body-sm flex items-center gap-2 transition-colors shadow-sm">
<span className="material-symbols-outlined text-[18px]" data-icon="share">share</span>
            Đăng Lên Bảng Tin Huki
          </button>
</div>
</section>



<section className="flex flex-col gap-5">
<div className="flex items-end justify-between">
<div>
<span className="font-label-sm uppercase tracking-wider text-on-surface-variant">Gợi ý riêng cho bạn</span>
<h2 className="font-headline-md text-headline-md text-on-surface mt-0.5">Có Thể Bạn Cũng Thích</h2>
</div>
<Link className="font-title-md text-body-sm text-tertiary hover:underline flex items-center gap-1" to="/">
            Xem thêm tựa sách phát triển bản thân
            <span className="material-symbols-outlined text-[18px]" data-icon="arrow_forward">arrow_forward</span>
</Link>
</div>
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">

<div className="bg-surface-container-lowest border border-outline-variant/60 rounded-[18px] p-4 flex flex-col justify-between shadow-sm hover:-translate-y-1 hover:shadow-md transition-all group">
<div>
<div className="w-full aspect-[2/3] rounded-[6px] overflow-hidden spine-crease bg-surface-container border border-surface-variant mb-3 relative">
<img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="Editorial book cover photograph for Thinking Fast and Slow Vietnamese translation, classic cream paper texture, bold deep navy and red typography, elegant minimal layout." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBXa7qYn1TUzA_yAyIlnPhRjoVrmm17bbiOS17USprDHKp_sRzj5FbOnd7C2SNyf8YewdBwnLdtESLvx6MNn_zaDVIEG3udqTjbin8VtQBAdrx_KBkeHIfu-8T1we9ANP_Sv4-IapyELF9lY98phWi4-VT9ijvgT6r8yXh6mv8XMF6lX0fMzvHXC8BzsCp08Jy6k0VY6bJLK9nTnPY_I1YTmwvxDnGs7XaohMTrSc4OdqTfLKQhhAx4Pg" />
<span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-secondary-container/90 text-on-secondary-container font-label-sm font-bold shadow-sm">
                  Bestseller
                </span>
</div>
<h4 className="font-title-md text-title-md text-on-surface line-clamp-2 group-hover:text-primary transition-colors">Tư Duy Nhanh Và Chậm</h4>
<p className="font-body-sm text-on-surface-variant mt-1">Daniel Kahneman</p>
</div>
<div className="mt-3 pt-3 border-t border-surface-variant flex items-center justify-between">
<div className="flex items-center gap-1">
<span className="material-symbols-outlined text-[#F59E0B] text-[16px] fill-icon" data-icon="star">star</span>
<span className="font-label-md text-on-surface font-semibold">4.9</span>
<span className="font-body-sm text-on-surface-variant text-[11px]">(3.1k)</span>
</div>
<div className="text-right">
<span className="font-title-md text-primary block leading-none">165.000đ</span>
</div>
</div>
</div>

<div className="bg-surface-container-lowest border border-outline-variant/60 rounded-[18px] p-4 flex flex-col justify-between shadow-sm hover:-translate-y-1 hover:shadow-md transition-all group">
<div>
<div className="w-full aspect-[2/3] rounded-[6px] overflow-hidden spine-crease bg-surface-container border border-surface-variant mb-3 relative">
<img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="Editorial book cover photograph for The 7 Habits of Highly Effective People Vietnamese edition, deep forest green and ivory aesthetic, classic serif author text, soft studio shadow." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDYtvP2M9UB_pqhxMH0FKHkB4mluayMiPW30kpN__XK1bSBZ-pt4_maLlXrMTra6OLQ4nk-FfdYt5hL9l10rbyqERlNvSpymYz5py9idrrkK32tnWh6EusNH1fc42REUeoidauWrPzKmjDc_3sayhEuGaIdkNao223p-Y7A6c0NQfsE9b41JResNEfg92pQGgbo9PFnCfxIwN9-YoQvqhb3P-y2V1GwPbacI2Y3IVjKcQAFFRUOiUjo8g" />
</div>
<h4 className="font-title-md text-title-md text-on-surface line-clamp-2 group-hover:text-primary transition-colors">7 Thói Quen Để Thành Đạt</h4>
<p className="font-body-sm text-on-surface-variant mt-1">Stephen R. Covey</p>
</div>
<div className="mt-3 pt-3 border-t border-surface-variant flex items-center justify-between">
<div className="flex items-center gap-1">
<span className="material-symbols-outlined text-[#F59E0B] text-[16px] fill-icon" data-icon="star">star</span>
<span className="font-label-md text-on-surface font-semibold">4.8</span>
<span className="font-body-sm text-on-surface-variant text-[11px]">(2.4k)</span>
</div>
<div className="text-right">
<span className="font-title-md text-primary block leading-none">148.000đ</span>
</div>
</div>
</div>

<div className="bg-surface-container-lowest border border-outline-variant/60 rounded-[18px] p-4 flex flex-col justify-between shadow-sm hover:-translate-y-1 hover:shadow-md transition-all group">
<div>
<div className="w-full aspect-[2/3] rounded-[6px] overflow-hidden spine-crease bg-surface-container border border-surface-variant mb-3 relative">
<img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="Editorial book cover of Dac Nhan Tam How to Win Friends and Influence People First News edition, warm maroon red with golden foil typography, timeless classic aesthetic." src="https://lh3.googleusercontent.com/aida-public/AB6AXuABSIYswWqdzcglBGFGBhDxNa9ahssQPRwa9EsFaLQ9FPh19BjygnqzqJJu-Mnn4mKLh-IcJhFb23HKRwVUb5uGj3vQbTn2B-B2o9Fp80mpdkkxaNhUFH_vpQO5Fg_-EerowpP9T3HQAeVPbeAma1ltQqgrlelf9HqYlvh69wcCNemFexkjHoabPBAOWNXhuB4Mw45gAxSGzge8B6iY2iaYcQlD97j9uUK5Qiy4Yyl9SriEQfpkYDMoZQ" />
<span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-primary/15 text-primary font-label-sm font-bold shadow-sm">
                  Kinh Điển
                </span>
</div>
<h4 className="font-title-md text-title-md text-on-surface line-clamp-2 group-hover:text-primary transition-colors">Đắc Nhân Tâm (Khổ Lớn)</h4>
<p className="font-body-sm text-on-surface-variant mt-1">Dale Carnegie</p>
</div>
<div className="mt-3 pt-3 border-t border-surface-variant flex items-center justify-between">
<div className="flex items-center gap-1">
<span className="material-symbols-outlined text-[#F59E0B] text-[16px] fill-icon" data-icon="star">star</span>
<span className="font-label-md text-on-surface font-semibold">5.0</span>
<span className="font-body-sm text-on-surface-variant text-[11px]">(12k)</span>
</div>
<div className="text-right">
<span className="font-title-md text-primary block leading-none">88.000đ</span>
</div>
</div>
</div>

<div className="bg-surface-container-lowest border border-outline-variant/60 rounded-[18px] p-4 flex flex-col justify-between shadow-sm hover:-translate-y-1 hover:shadow-md transition-all group">
<div>
<div className="w-full aspect-[2/3] rounded-[6px] overflow-hidden spine-crease bg-surface-container border border-surface-variant mb-3 relative">
<img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="Editorial book cover of The Lean Startup Vietnamese translation, crisp modern minimal blue circle motif on ivory paper, business publication styling." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBX4Kd4G8iNHQlfF7K5cYKsiyOVqxeKAjWTmdYZNmsl2XwtRt5LbwHOa10Cm2k8Ks83vdrK1LYqrzl4TjNG_UjLLJO8YAXTf-o9kinqaBLbxQi36ETbetNY83YBHoDUTu9AqyLAqJwSwk0EFtmqxqq7Za5zYlruIt0WnBekbSGVkLTkAurg4ZslQRdxslzp8ZUhvp4o1DslKhg72GeRNQbQt72uWrVThFoqGnqRu-ApFxw6BirgD4sZ_Q" />
</div>
<h4 className="font-title-md text-title-md text-on-surface line-clamp-2 group-hover:text-primary transition-colors">Khởi Nghiệp Tinh Gọn</h4>
<p className="font-body-sm text-on-surface-variant mt-1">Eric Ries</p>
</div>
<div className="mt-3 pt-3 border-t border-surface-variant flex items-center justify-between">
<div className="flex items-center gap-1">
<span className="material-symbols-outlined text-[#F59E0B] text-[16px] fill-icon" data-icon="star">star</span>
<span className="font-label-md text-on-surface font-semibold">4.7</span>
<span className="font-body-sm text-on-surface-variant text-[11px]">(980)</span>
</div>
<div className="text-right">
<span className="font-title-md text-primary block leading-none">125.000đ</span>
</div>
</div>
</div>

<div className="bg-surface-container-lowest border border-outline-variant/60 rounded-[18px] p-4 flex flex-col justify-between shadow-sm hover:-translate-y-1 hover:shadow-md transition-all group">
<div>
<div className="w-full aspect-[2/3] rounded-[6px] overflow-hidden spine-crease bg-surface-container border border-surface-variant mb-3 relative">
<img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="Editorial book cover photograph of Sapiens A Brief History of Humankind Vietnamese edition, earth tones, handprint motif, high contrast refined typography." src="https://lh3.googleusercontent.com/aida-public/AB6AXuC2H3l5c7_JP2T-qUtp7DCY42wLc1tMDdyQtRiGNH8LsvYEqbyEo-qNhVf3Y-KZ7Q487upiQuJrXSnZxfwkuBjlnOUhC1ckdcF1tq3pOW3BN48BgA7QIETZbXRTXLru6om1zQx1itIhe8B9R80sk9RnkV5_68mjjA7MX-1fEj0FAiAaHcySuAI3OFkRnGBT7ggCfz9PSVO64-R_x7QgsvkfhnbJvxNjkHVXfNnXcJ0fyKqOB3TYw8ZYHQ" />
<span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-tertiary/15 text-tertiary font-label-sm font-bold shadow-sm">
                  Top Đọc
                </span>
</div>
<h4 className="font-title-md text-title-md text-on-surface line-clamp-2 group-hover:text-primary transition-colors">Sapiens – Lược Sử Loài Người</h4>
<p className="font-body-sm text-on-surface-variant mt-1">Yuval Noah Harari</p>
</div>
<div className="mt-3 pt-3 border-t border-surface-variant flex items-center justify-between">
<div className="flex items-center gap-1">
<span className="material-symbols-outlined text-[#F59E0B] text-[16px] fill-icon" data-icon="star">star</span>
<span className="font-label-md text-on-surface font-semibold">4.9</span>
<span className="font-body-sm text-on-surface-variant text-[11px]">(5.2k)</span>
</div>
<div className="text-right">
<span className="font-title-md text-primary block leading-none">189.000đ</span>
</div>
</div>
</div>
</div>
</section>
      </main>
    </div>
  );
}
