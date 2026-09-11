import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function SellerCorrection() {
  const [activeSection, setActiveSection] = useState('sec-description');

  const scrollToSection = (id) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const navItems = [
    { id: 'sec-basic', label: '01 Thông Tin Cơ Bản', status: 'done' },
    { id: 'sec-description', label: '02 Mô Tả Sách', status: 'error' },
    { id: 'sec-category', label: '03 Phân Loại & Tác Giả', status: 'done' },
    { id: 'sec-media', label: '04 Ảnh Bìa & Media', status: 'fixed' },
    { id: 'sec-pricing', label: '05 Giá Bán Kép', status: 'done' },
    { id: 'sec-inventory', label: '06 Kho Sách Giấy', status: 'done' },
    { id: 'sec-drm', label: '07 Nội Dung Ebook DRM', status: 'error' },
    { id: 'sec-publish', label: '08 Xuất Bản', status: 'pending' }
  ];

  return (
    <div className="w-full bg-background text-on-surface font-body-md text-body-md antialiased min-h-screen py-6 pb-28">
      <main className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Top Breadcrumbs & Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-theme-border/60 pb-5">
            <div>
              <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-2">
                <Link className="hover:text-primary transition-colors font-semibold" to="/seller/dashboard">Kênh Người Bán</Link>
                <span className="text-theme-border">/</span>
                <Link className="hover:text-primary transition-colors font-semibold" to="/seller/products">Sản Phẩm</Link>
                <span className="text-theme-border">/</span>
                <span className="text-red-600 font-bold">Chỉnh Sửa (Bị Từ Chối)</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-headline-lg text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
                  Atomic Habits – Thay Đổi Tí Hon, Hiệu Quả Bất Ngờ
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-red-100 text-red-700 border border-red-200">
                  TỪ CHỐI DUYỆT
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-2 text-xs text-on-surface-variant">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">upload_file</span>
                  Gửi duyệt: <strong className="text-on-surface font-semibold">06/09/2026 · 14:32</strong>
                </span>
                <span className="text-theme-border hidden sm:inline">•</span>
                <span className="flex items-center gap-1 text-red-600 font-medium">
                  <span className="material-symbols-outlined text-sm">rate_review</span>
                  Phản hồi kiểm duyệt: <strong>07/09/2026 · 08:15</strong>
                </span>
                <span className="text-theme-border hidden sm:inline">•</span>
                <span className="text-primary font-semibold">Thẩm định viên HUKI #08</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-start md:self-center">
              <button className="px-3.5 py-2 bg-surface-container-lowest border border-theme-border hover:border-primary/40 text-on-surface rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer">
                <span className="material-symbols-outlined text-sm">visibility</span>
                <span>Xem Trên Sàn</span>
              </button>
            </div>
          </div>

          {/* Rejection Summary Banner */}
          <div className="bg-red-50/80 border border-red-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 border border-red-300 flex items-center justify-center shrink-0 text-red-600 shadow-2xs">
                <span className="material-symbols-outlined text-2xl">error</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <h2 className="font-headline-sm text-lg font-bold text-red-950">
                    Sản Phẩm Cần Được Khắc Phục Trước Khi Mở Bán
                  </h2>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-200/80 text-red-900 border border-red-300">
                      3 Vấn đề
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      1 Đã xong
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      2 Chưa xử lý
                    </span>
                  </div>
                </div>
                <p className="text-xs text-red-900/90 mt-1.5 leading-relaxed">
                  HUKI chưa thể phê duyệt xuất bản sản phẩm này do một số thông tin và tệp dữ liệu chưa đạt tiêu chuẩn kiểm duyệt nội dung số. Vui lòng khắc phục 3 vấn đề dưới đây theo hướng dẫn chi tiết của ban biên tập để được đưa lên sàn.
                </p>

                <div className="mt-3.5 p-4 bg-surface-container-lowest/90 border-l-4 border-red-500 rounded-r-xl text-xs text-on-surface shadow-2xs">
                  <div className="flex items-center gap-1.5 font-bold text-red-900 text-[11px] uppercase tracking-wider mb-1">
                    <span className="material-symbols-outlined text-sm text-red-600">record_voice_over</span>
                    Ghi chú tổng quan từ Biên tập viên HUKI:
                  </div>
                  <p className="italic text-on-surface-variant leading-relaxed">
                    "Ảnh bìa bị vỡ nét và viền trắng dày; phần giới thiệu sách còn quá sơ sài chưa đủ thông tin cho độc giả; tệp Ebook PDF có cài mật khẩu khiến hệ thống DRM không thể mã hóa đọc thử. Vui lòng cập nhật để HUKI tái thẩm định trong vòng 4-8 giờ làm việc."
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-red-900">
                    <span>Tiến Độ Khắc Phục:</span>
                    <strong className="text-on-surface">1 / 3 vấn đề đã xử lý</strong>
                    <span className="text-on-surface-variant">(33%)</span>
                  </div>
                  <div className="w-full sm:w-64 bg-red-200/70 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-600 h-full rounded-full transition-all duration-500" style={{ width: '33.33%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Layout Grid */}
          <div className="grid grid-cols-12 gap-6 items-start">

            {/* Left Sticky Sub-Nav */}
            <nav className="col-span-12 lg:col-span-2 sticky top-24 bg-surface-container-lowest rounded-2xl p-3.5 border border-theme-border/70 shadow-xs space-y-1.5">
              <p className="px-2.5 py-1 font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
                MỤC NỘI DUNG
              </p>
              {navItems.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                      isActive
                        ? 'bg-primary/10 text-primary border-l-4 border-primary font-bold shadow-2xs'
                        : item.status === 'error'
                        ? 'bg-red-50 text-red-800 border border-red-200 font-bold'
                        : item.status === 'fixed'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                    }`}
                  >
                    <span className="truncate">{item.label}</span>
                    {item.status === 'error' ? (
                      <span className="material-symbols-outlined text-red-600 text-xs animate-bounce">priority_high</span>
                    ) : item.status === 'fixed' || item.status === 'done' ? (
                      <span className="material-symbols-outlined text-emerald-600 text-xs">check_circle</span>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-outline/40"></span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Middle Form & Corrections */}
            <div className="col-span-12 lg:col-span-7 space-y-6">

              {/* Section 1: Thông Tin Cơ Bản */}
              <section className="bg-surface-container-lowest rounded-2xl p-6 border border-theme-border/70 shadow-xs space-y-4" id="sec-basic">
                <div className="flex items-center justify-between pb-3 border-b border-theme-border/60">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center">01</span>
                    <h3 className="font-title-lg text-sm font-bold text-on-surface">Thông Tin Cơ Bản</h3>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    Hợp lệ (Đã duyệt)
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="md:col-span-2">
                    <label className="block font-bold text-on-surface mb-1">Tên Tựa Sách Chính Thức</label>
                    <input className="w-full bg-surface-container-low/50 border border-theme-border rounded-xl px-3.5 py-2 text-on-surface font-semibold focus:outline-none" type="text" defaultValue="Atomic Habits – Thay Đổi Tí Hon, Hiệu Quả Bất Ngờ" />
                  </div>
                  <div>
                    <label className="block font-bold text-on-surface mb-1">Mã Chuẩn Quốc Tế (ISBN-13)</label>
                    <input className="w-full bg-surface-container-low/50 border border-theme-border rounded-xl px-3.5 py-2 text-on-surface font-mono" type="text" defaultValue="978-604-58-9123-4" />
                  </div>
                  <div>
                    <label className="block font-bold text-on-surface mb-1">Ngôn Ngữ Phát Hành</label>
                    <input className="w-full bg-surface-container-low/50 border border-theme-border rounded-xl px-3.5 py-2 text-on-surface" type="text" defaultValue="Tiếng Việt (Bản dịch có bản quyền)" />
                  </div>
                </div>
              </section>

              {/* Section 2: Mô Tả Sách - Issue 1 */}
              <section className="bg-surface-container-lowest rounded-2xl p-6 border-2 border-red-300 shadow-sm space-y-4" id="sec-description">
                <div className="flex items-center justify-between pb-3 border-b border-red-100">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-bold flex items-center justify-center">02</span>
                    <h3 className="font-title-lg text-sm font-bold text-red-950">Mô Tả Sản Phẩm</h3>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-2.5 py-0.5 rounded-full border border-red-300 uppercase tracking-wide">
                    <span className="material-symbols-outlined text-sm">error</span>
                    VẤN ĐỀ 1: CẦN CHỈNH SỬA
                  </span>
                </div>

                <div className="bg-red-50/90 border-l-4 border-red-600 p-4 rounded-r-xl text-xs space-y-1.5 text-red-950">
                  <div className="flex items-center gap-1.5 text-red-900 font-bold mb-1">
                    <span className="material-symbols-outlined text-red-600 text-base">announcement</span>
                    <span>PHẢN HỒI TỪ BAN BIÊN TẬP HUKI (NGÀY 07/09/2026)</span>
                  </div>
                  <p>
                    <strong className="font-semibold text-red-900">Lý do từ chối:</strong> Mô tả hiện tại quá ngắn (chỉ 1 câu gồm 16 từ), chưa cung cấp đủ tóm tắt nội dung, bố cục cuốn sách và 4 định luật cốt lõi theo quy định chuẩn SEO của sàn HUKI.
                  </p>
                  <p className="pt-1 text-red-800">
                    <strong className="font-semibold">Gợi ý khắc phục:</strong> Bổ sung tối thiểu 200 từ nêu bật phương pháp 4 bước thay đổi thói quen (Gợi ý, Thèm muốn, Phản hồi, Phần thưởng).
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-bold text-on-surface text-xs flex items-center gap-1">
                      <span>Nội Dung Giới Thiệu Cuốn Sách</span>
                      <span className="text-red-500">*</span>
                    </label>
                    <button className="text-primary text-xs font-bold flex items-center gap-1 hover:underline cursor-pointer" type="button">
                      <span className="material-symbols-outlined text-sm">auto_fix_high</span>
                      Gợi ý mẫu mô tả chuẩn SEO HUKI
                    </button>
                  </div>

                  <div className="border border-red-300 rounded-t-xl bg-surface-container-low/70 px-3 py-2 flex items-center gap-2 border-b border-red-200">
                    <button className="p-1 hover:bg-surface-container rounded font-bold text-xs" type="button">B</button>
                    <button className="p-1 hover:bg-surface-container rounded italic text-xs" type="button">I</button>
                    <button className="p-1 hover:bg-surface-container rounded underline text-xs" type="button">U</button>
                    <span className="h-4 w-px bg-theme-border mx-1"></span>
                    <span className="text-[11px] text-red-600 font-bold ml-auto">16 / 200 từ tối thiểu (Chưa đạt)</span>
                  </div>

                  <textarea className="w-full bg-red-50/30 border-x border-b border-red-300 rounded-b-xl p-3 text-xs text-on-surface focus:ring-2 focus:ring-red-500 focus:outline-none leading-relaxed resize-none" rows={4} defaultValue="Atomic Habits là cuốn sách giúp người đọc xây dựng thói quen tốt và thay đổi cuộc sống." />

                  <div className="mt-2.5 flex items-start gap-1.5 text-xs text-red-700">
                    <span className="material-symbols-outlined text-sm text-red-600 mt-0.5">warning</span>
                    <span>Cảnh báo: Bạn cần viết thêm ít nhất 184 từ để hệ thống chấp nhận gửi thẩm định lại.</span>
                  </div>
                </div>
              </section>

              {/* Section 4: Ảnh Bìa & Media - Issue 2 (Resolved) */}
              <section className="bg-surface-container-lowest rounded-2xl p-6 border-2 border-emerald-300 shadow-xs space-y-4" id="sec-media">
                <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center">04</span>
                    <h3 className="font-title-lg text-sm font-bold text-on-surface">Ảnh Bìa &amp; Media</h3>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300 uppercase tracking-wide">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    VẤN ĐỀ 2: ĐÃ KHẮC PHỤC
                  </span>
                </div>

                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-950 flex items-start justify-between">
                  <div className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-emerald-700 text-lg shrink-0 mt-0.5">verified</span>
                    <div>
                      <div className="font-bold text-emerald-900">Đã cập nhật bản thay thế đạt chuẩn 1600x2400px (WebP).</div>
                      <p className="text-emerald-800 mt-0.5">Trạng thái này đã được hệ thống tự động kiểm tra và gắn cờ hoàn tất.</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-red-200 rounded-xl p-3.5 bg-red-50/30 flex flex-col items-center text-center">
                    <div className="w-full flex items-center justify-between mb-2 text-[11px]">
                      <span className="font-bold text-red-800">BẢN CŨ BỊ TỪ CHỐI</span>
                      <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold">480 x 720 px</span>
                    </div>
                    <div className="w-28 h-40 relative rounded-lg overflow-hidden shadow-xs border-2 border-dashed border-red-300 mb-2 p-1 bg-white">
                      <img className="w-full h-full object-cover filter blur-[1px] opacity-75" alt="Old low res cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBs28a7wMPvluZP76Tj1Jso3wM2-xTKot3G9q9kilzHKmRgGInC4pQveoBAYvX6st7KmAgd0ewYTYTqnslCMUIwRnWqoq6j7P7hw0F5rfYDeM7nBEUw14KbJ0MJgwkAzpi0LsgoTVsWeMisGYfAhFNcdmvQ-OYCDeZoI0ZTzPlwDKm4nScuYAwLNpmf8yRX9e4QIeSpb04KHZUQrhVW4pPxyQaKk-Levj2qub_dJ7otV-Rf8evdYfuN7Q" />
                    </div>
                    <span className="text-[11px] text-red-600 font-medium">Đã lưu trữ lịch sử</span>
                  </div>

                  <div className="border-2 border-emerald-400 rounded-xl p-3.5 bg-emerald-50/30 flex flex-col items-center text-center relative">
                    <div className="w-full flex items-center justify-between mb-2 text-[11px]">
                      <span className="font-bold text-emerald-900 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs text-emerald-600">check</span>
                        BẢN MỚI TẢI LÊN
                      </span>
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">1600 x 2400 px (WebP)</span>
                    </div>
                    <div className="w-28 h-40 relative rounded-lg overflow-hidden shadow-md border-2 border-emerald-500 mb-2">
                      <img className="w-full h-full object-cover" alt="New high res cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDJSpCaMa241N70ri7GtAwOxnpmmt2krLGB1tembt5DxlCeGY71lYXxZj0yN0VPTLBIAPSijMziI_BScEQo3Yx4oU9sPbCLjgN_HIn3KUaCFtZqDY8uLlMeNA0JjbjBihBzC0BaC16Pbb8JgK27ucP4hbE_qZxCjwanGES2XLr8J04nPMzYTNClYH_HjlkBHZGKSyHwtc5TvsUmME54iXQ1gTLoC5cxMqDHNQk8XsHOgfH5ER-r1pFTDw" />
                    </div>
                    <span className="text-[11px] text-emerald-700 font-bold">✓ Đạt chuẩn hiển thị</span>
                  </div>
                </div>
              </section>

              {/* Section 7: Tệp Ebook DRM - Issue 3 */}
              <section className="bg-surface-container-lowest rounded-2xl p-6 border-2 border-red-300 shadow-sm space-y-4" id="sec-drm">
                <div className="flex items-center justify-between pb-3 border-b border-red-100">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-bold flex items-center justify-center">07</span>
                    <h3 className="font-title-lg text-sm font-bold text-red-950">Tệp Ebook &amp; Bản Quyền DRM</h3>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-2.5 py-0.5 rounded-full border border-red-300 uppercase tracking-wide">
                    <span className="material-symbols-outlined text-sm">error</span>
                    VẤN ĐỀ 3: CẦN CHỈNH SỬA
                  </span>
                </div>

                <div className="bg-red-50/90 border-l-4 border-red-600 p-4 rounded-r-xl text-xs space-y-1.5 text-red-950">
                  <div className="flex items-center gap-1.5 text-red-900 font-bold mb-1">
                    <span className="material-symbols-outlined text-red-600 text-base">lock_clock</span>
                    <span>PHẢN HỒI TỪ HỆ THỐNG KỸ THUẬT DRM HUKI</span>
                  </div>
                  <p>
                    <strong className="font-semibold text-red-900">Lý do từ chối:</strong> Tệp PDF tải lên bị khóa mã hóa bảo vệ bằng mật khẩu (Password Protected). Máy chủ DRM của HUKI không thể bóc tách nội dung và gắn Watermark động theo từng tài khoản.
                  </p>
                  <p className="pt-1 text-red-800">
                    <strong className="font-semibold">Gợi ý khắc phục:</strong> Vui lòng xuất bản lại tệp PDF Master không đặt mật khẩu mở tệp.
                  </p>
                </div>

                <div className="border border-red-300 bg-red-50/40 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center text-red-700">
                      <span className="material-symbols-outlined text-2xl">picture_as_pdf</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-on-surface font-mono">Atomic-Habits-Locked.pdf</span>
                        <span className="bg-red-200 text-red-900 text-[10px] font-bold px-2 py-0.5 rounded">Có Mật Khẩu</span>
                      </div>
                      <div className="text-[11px] text-on-surface-variant mt-0.5">
                        Dung lượng: 48.2 MB · Tải lên ngày: 06/09/2026
                      </div>
                    </div>
                  </div>
                  <button className="text-red-700 hover:text-red-900 p-1.5 rounded-lg hover:bg-red-100 cursor-pointer" title="Xóa tệp hỏng" type="button">
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>

                <div>
                  <label className="block font-bold text-on-surface text-xs mb-2">Tải Lên Tệp Ebook Mới Thay Thế (Không Cài Mật Khẩu)</label>
                  <div className="border-2 border-dashed border-theme-border hover:border-primary rounded-2xl p-6 text-center bg-surface-container-low/40 transition-all cursor-pointer group">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-2xl">upload_file</span>
                    </div>
                    <div className="text-xs font-bold text-on-surface">
                      <span className="text-primary underline">Nhấn để tải lên tệp PDF Master</span> hoặc kéo thả tệp vào đây
                    </div>
                    <p className="text-[11px] text-on-surface-variant mt-1">
                      Hỗ trợ định dạng PDF, EPUB Master không khóa bảo vệ. Dung lượng tối đa: 100MB.
                    </p>
                  </div>
                </div>
              </section>

            </div>

            {/* Right Aside */}
            <aside className="col-span-12 lg:col-span-3 sticky top-24 space-y-5">
              <div className="bg-surface-container-lowest rounded-2xl p-5 border border-theme-border/70 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-theme-border/60">
                  <h4 className="font-title-md text-xs font-bold text-on-surface">Danh Sách Cần Sửa</h4>
                  <span className="text-[11px] font-bold text-red-700">1 / 3 hoàn tất</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-base shrink-0 mt-0.5">check_circle</span>
                    <div>
                      <div className="font-bold text-emerald-950">1. Ảnh bìa chính</div>
                      <div className="text-[11px] text-emerald-800">Đã cập nhật bản HD 1600x2400</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2">
                    <span className="material-symbols-outlined text-red-600 text-base shrink-0 mt-0.5">cancel</span>
                    <div>
                      <div className="font-bold text-red-950">2. Mô tả sản phẩm</div>
                      <div className="text-[11px] text-red-800">Thiếu 184 từ theo quy chuẩn</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2">
                    <span className="material-symbols-outlined text-red-600 text-base shrink-0 mt-0.5">cancel</span>
                    <div>
                      <div className="font-bold text-red-950">3. Tệp Ebook DRM</div>
                      <div className="text-[11px] text-red-800">Tệp PDF cũ bị khóa mật khẩu</div>
                    </div>
                  </div>
                </div>
              </div>
            </aside>

          </div>
      </main>

      {/* Sticky Bottom Bar */}
      <footer className="sticky bottom-0 z-30 bg-surface-container-lowest/95 backdrop-blur-md border-t border-theme-border/70 px-6 sm:px-8 py-3.5 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-on-surface font-semibold">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
          <span>Tiến độ: 1/3 vấn đề đã xử lý</span>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/seller/products" className="px-3.5 py-2 text-xs font-medium text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer">
            Hủy Bỏ Thay Đổi
          </Link>
          <button className="px-4 py-2 rounded-xl border border-theme-border bg-surface-container text-xs font-semibold text-on-surface hover:bg-surface-container-high transition-all shadow-xs cursor-pointer" type="button">
            Lưu Bản Nháp
          </button>

          <button className="px-6 py-2.5 rounded-xl bg-surface-container-highest text-on-surface-variant font-title-md text-xs font-bold tracking-wide transition-all shadow-none cursor-not-allowed flex items-center gap-2" disabled type="button">
            <span className="material-symbols-outlined text-sm">send</span>
            <span>GỬI DUYỆT LẠI (Còn 2 Vấn Đề)</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
