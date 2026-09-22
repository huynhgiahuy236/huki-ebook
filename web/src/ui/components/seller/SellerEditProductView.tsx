"use client";

import React, { useState } from 'react';
import Link from 'next/link';

export default function SellerEditProductView() {
  const [activeSection, setActiveSection] = useState('sec-basic');

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="w-full bg-background text-on-surface antialiased min-h-screen py-6 pb-28 font-body-md text-body-md">
      <main className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-space-lg">

        <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-surface-variant">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link className="inline-flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant hover:text-tertiary transition-colors" href="/seller/products">
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                <span>Sản Phẩm</span>
              </Link>
              <span className="text-surface-variant text-xs">·</span>
              <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-[11px] font-bold tracking-wide">ĐANG BÁN</span>
              <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface font-label-sm text-[11px] font-semibold border border-surface-variant">SÁCH GIẤY + EBOOK</span>
            </div>
            <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">Chỉnh Sửa Sản Phẩm</h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              Cập nhật và quản lý thông tin sản phẩm của Alpha Books Official. Cập nhật lần cuối: <span className="font-medium text-on-surface">07/09/2026 · 09:42</span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-container-lowest border border-surface-variant text-tertiary font-title-md text-xs hover:border-tertiary hover:bg-tertiary-fixed/20 transition-all shadow-xs" target="_blank" href="/seller/product/edit-hybrid">
              <span className="material-symbols-outlined text-base">open_in_new</span>
              <span>Xem Trên Cửa Hàng</span>
            </Link>
            <button className="p-2 rounded-lg bg-surface-container-lowest border border-surface-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors shadow-xs cursor-pointer" title="Tác vụ khác">
              <span className="material-symbols-outlined text-base">more_horiz</span>
            </button>
          </div>
        </section>

        <section className="p-4 rounded-xl bg-tertiary-fixed/30 border border-tertiary/20 flex items-start gap-3.5">
          <div className="w-8 h-8 rounded-lg bg-tertiary text-on-tertiary flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-lg">verified_user</span>
          </div>
          <div className="flex-1">
            <div className="font-title-md text-sm font-semibold text-tertiary flex items-center gap-2">
              Sản phẩm đang được bán công khai trên HUKI
              <span className="font-label-sm text-[10px] px-2 py-0.5 bg-surface-container-lowest rounded text-on-surface-variant border border-surface-variant">Live Protection</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface mt-0.5 leading-relaxed">
              Một số thay đổi quan trọng (như <strong>Tên sách</strong>, <strong>Tác giả</strong>, <strong>Ảnh bìa chính</strong>) sẽ cần được ban biên tập HUKI duyệt lại trước khi áp dụng công khai, trong khi các bản đang bán vẫn duy trì phục vụ độc giả bình thường mà không bị gián đoạn doanh thu.
            </p>
          </div>
        </section>

        <section className="bg-surface-container-lowest border border-surface-variant rounded-2xl p-space-md shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 mb-3 border-b border-surface-variant">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-outline">lock</span>
                <h2 className="font-title-lg text-title-md font-bold text-on-surface">Định Dạng Sản Phẩm (Format)</h2>
                <span className="font-label-sm text-[10px] px-2 py-0.5 rounded bg-surface-container text-on-surface-variant border border-surface-variant">Đã Khóa Chỉnh Sửa</span>
              </div>
              <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
                Sản phẩm đã phát sinh giao dịch và cấp quyền đọc số. Không thể chuyển đổi hoặc xóa định dạng.
              </p>
            </div>
            <Link className="font-label-sm text-xs text-tertiary hover:underline inline-flex items-center gap-1" href="/seller/edge-cases">
              <span>Liên hệ hỗ trợ thay đổi mô hình</span>
              <span className="material-symbols-outlined text-xs">arrow_forward</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

            <div className="p-3 rounded-xl border border-surface-variant bg-surface-container-low/40 opacity-60 cursor-not-allowed flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant">
                  <span className="material-symbols-outlined">menu_book</span>
                </div>
                <div>
                  <div className="font-title-md text-xs font-semibold text-on-surface">CHỈ SÁCH GIẤY</div>
                  <div className="font-body-sm text-[11px] text-on-surface-variant">Vận chuyển vật lý qua bưu cục</div>
                </div>
              </div>
              <span className="material-symbols-outlined text-sm text-on-surface-variant">lock</span>
            </div>

            <div className="p-3 rounded-xl border border-surface-variant bg-surface-container-low/40 opacity-60 cursor-not-allowed flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant">
                  <span className="material-symbols-outlined">tablet_android</span>
                </div>
                <div>
                  <div className="font-title-md text-xs font-semibold text-on-surface">CHỈ EBOOK (DRM)</div>
                  <div className="font-body-sm text-[11px] text-on-surface-variant">Phát hành số tức thì</div>
                </div>
              </div>
              <span className="material-symbols-outlined text-sm text-on-surface-variant">lock</span>
            </div>

            <div className="p-3 rounded-xl border-2 border-tertiary bg-tertiary-fixed/20 relative shadow-xs">
              <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-tertiary text-on-tertiary font-label-sm text-[10px] font-bold flex items-center gap-1 shadow-xs">
                <span className="material-symbols-outlined text-[12px]">lock</span>
                <span>ĐANG HOẠT ĐỘNG (DUAL FORMAT)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-tertiary text-on-tertiary flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined">auto_stories</span>
                </div>
                <div>
                  <div className="font-title-md text-xs font-bold text-tertiary">SÁCH GIẤY + EBOOK KÉP</div>
                  <div className="font-body-sm text-[11px] text-on-surface">Đồng bộ 2 định dạng trong một trang mua hàng</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-12 gap-space-lg items-start">

          <div className="col-span-12 lg:col-span-2 sticky top-[84px] space-y-1">
            <div className="px-3 py-2 font-label-sm text-[11px] font-bold text-on-surface-variant tracking-wider uppercase">
              THÔNG TIN SẢN PHẨM
            </div>
            <nav className="space-y-1 font-body-sm text-xs">
              {[
                { id: 'sec-basic', label: '01 Cơ Bản', icon: 'edit_note' },
                { id: 'sec-taxonomy', label: '02 Tác Giả & Loại', icon: 'category' },
                { id: 'sec-media', label: '03 Bìa & Media', icon: 'photo_library' },
                { id: 'sec-pricing', label: '04 Giá Bán Kép', icon: 'sell' },
                { id: 'sec-inventory', label: '05 Kho Vật Lý', icon: 'inventory_2' },
                { id: 'sec-shipping', label: '06 Vận Chuyển', icon: 'local_shipping' },
                { id: 'sec-drm', label: '07 Ebook & DRM', icon: 'lock_reset' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToSection(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors cursor-pointer text-left ${
                    activeSection === item.id 
                      ? 'bg-surface-container-lowest border border-tertiary/40 text-tertiary font-semibold shadow-xs' 
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="material-symbols-outlined text-sm">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </div>
                </button>
              ))}
            </nav>
            <div className="pt-4 border-t border-surface-variant">
              <div className="p-3 bg-surface-container rounded-xl text-xs space-y-1">
                <div className="font-semibold text-on-surface flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs text-tertiary">tips_and_updates</span>
                  Quy Chuẩn Duyệt
                </div>
                <p className="text-[11px] text-on-surface-variant leading-normal">
                  Thời gian kiểm duyệt thông tin thay đổi thường mất từ 2-6 giờ làm việc.
                </p>
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-7 space-y-space-lg">

            <section className="bg-surface-container-lowest border border-surface-variant rounded-2xl p-space-lg shadow-xs space-y-4" id="sec-basic">
              <div className="flex items-center justify-between border-b border-surface-variant pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-tertiary/10 text-tertiary flex items-center justify-center font-bold text-xs">01</span>
                  <h3 className="font-title-lg text-title-md font-bold text-on-surface">Thông Tin Cơ Bản</h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-xs font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">history_edu</span>
                  Thay đổi cần xét duyệt
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-title-md text-xs font-semibold text-on-surface flex items-center gap-1">
                    Tên Sách Công Khai <span className="text-primary">*</span>
                  </label>
                  <span className="text-[11px] font-label-sm text-secondary font-medium">Bản hiện tại trên sàn: "Atomic Habits – Thay Đổi Tí Hon, Hiệu Quả Bất Ngờ"</span>
                </div>
                <div className="relative">
                  <input className="w-full bg-surface-container-lowest border-2 border-secondary/40 rounded-lg px-3.5 py-2.5 font-body-md text-body-md text-on-surface focus:outline-none focus:border-tertiary transition-colors" type="text" defaultValue="Atomic Habits – Thay Đổi Tí Hon, Hiệu Quả Bất Ngờ (Ấn Bản Kỷ Niệm 2026)" />
                  <span className="absolute right-3 top-3 text-secondary material-symbols-outlined text-base" title="Đã sửa so với bản đang phát hành">info</span>
                </div>
                <p className="font-body-sm text-[11px] text-secondary flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">sync_alt</span>
                  Đã thay đổi: Bổ sung hậu tố "(Ấn Bản Kỷ Niệm 2026)" — Bản đang bán vẫn giữ tên cũ cho đến khi duyệt.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-title-md text-xs font-semibold text-on-surface">Tóm Tắt Ngắn (Hiển thị thẻ xem nhanh)</label>
                  <span className="font-label-sm text-[11px] text-on-surface-variant">112 / 300 ký tự</span>
                </div>
                <textarea className="w-full bg-surface-container-lowest border border-surface-variant rounded-lg p-3 font-body-md text-xs text-on-surface focus:outline-none focus:border-tertiary transition-colors resize-none" rows={2} defaultValue="Cuốn sách kinh điển hướng dẫn cách thiết lập hệ thống thói quen nhỏ mỗi ngày để tạo nên bứt phá vượt bậc trong sự nghiệp và đời sống." />
              </div>

              <div className="space-y-1.5">
                <label className="font-title-md text-xs font-semibold text-on-surface">Nội Dung Giới Thiệu Chi Tiết</label>
                <div className="border border-surface-variant rounded-xl overflow-hidden bg-surface-container-lowest">
                  <div className="p-3 text-xs leading-relaxed text-on-surface max-h-36 overflow-y-auto custom-scrollbar font-body-sm space-y-2">
                    <p><strong>Atomic Habits – Thay đổi tí hon, hiệu quả bất ngờ</strong> của tác giả James Clear là một trong những tác phẩm tâm lý học hành vi thực hành xuất sắc nhất thế giới với hơn 15 triệu bản đã được bán ra.</p>
                    <p>Bạn không thể vươn tới tầm cao của mục tiêu, bạn chỉ rơi xuống bằng với trình độ của các hệ thống thói quen bạn xây dựng. Ấn bản kỷ niệm đặc biệt bổ sung sơ đồ thực hành 30 ngày cải tiến năng suất.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="font-title-md text-xs font-semibold text-on-surface block mb-1">Ngôn Ngữ</label>
                  <select className="w-full bg-surface-container-lowest border border-surface-variant rounded-lg px-2.5 py-2 font-body-sm text-xs text-on-surface focus:outline-none focus:border-tertiary">
                    <option>Tiếng Việt</option>
                    <option>Tiếng Anh (Song ngữ)</option>
                  </select>
                </div>
                <div>
                  <label className="font-title-md text-xs font-semibold text-on-surface block mb-1">Ngày Xuất Bản</label>
                  <input className="w-full bg-surface-container-lowest border border-surface-variant rounded-lg px-2.5 py-2 font-body-sm text-xs text-on-surface focus:outline-none focus:border-tertiary" type="text" defaultValue="15/08/2020" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-title-md text-xs font-semibold text-on-surface flex items-center gap-1">
                      Mã ISBN
                      <span className="material-symbols-outlined text-xs text-outline">lock</span>
                    </label>
                    <span className="font-label-sm text-[9px] text-outline font-semibold">KHÓA</span>
                  </div>
                  <input className="w-full bg-surface-container-low border border-surface-variant rounded-lg px-2.5 py-2 font-body-sm text-xs text-on-surface-variant cursor-not-allowed select-none" readOnly type="text" value="978-604-58-9123-4" />
                </div>
              </div>
            </section>

            <section className="bg-surface-container-lowest border border-surface-variant rounded-2xl p-space-lg shadow-xs space-y-4" id="sec-taxonomy">
              <div className="flex items-center justify-between border-b border-surface-variant pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-tertiary/10 text-tertiary flex items-center justify-center font-bold text-xs">02</span>
                  <h3 className="font-title-lg text-title-md font-bold text-on-surface">Phân Loại Sách &amp; Tác Giả</h3>
                </div>
                <span className="material-symbols-outlined text-tertiary font-bold">check_circle</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-title-md text-xs font-semibold text-on-surface block mb-1">Danh Mục Chính</label>
                  <select className="w-full bg-surface-container-lowest border border-surface-variant rounded-lg px-3 py-2 font-body-sm text-xs text-on-surface focus:outline-none focus:border-tertiary">
                    <option>Phát Triển Bản Thân</option>
                    <option>Kinh Doanh &amp; Khởi Nghiệp</option>
                  </select>
                </div>
                <div>
                  <label className="font-title-md text-xs font-semibold text-on-surface block mb-1">Tác Giả Chính</label>
                  <input className="w-full bg-surface-container-lowest border border-surface-variant rounded-lg px-3 py-2 font-body-sm text-xs text-on-surface focus:outline-none focus:border-tertiary" type="text" defaultValue="James Clear" />
                </div>
              </div>
            </section>

          </div>

          <div className="col-span-12 lg:col-span-3 space-y-4">
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-surface-variant shadow-xs space-y-3">
              <div className="font-title-md text-xs font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-tertiary">verified_user</span>
                Quy Trình Kiểm Tra Kép HUKI
              </div>
              <p className="text-[11px] text-on-surface-variant leading-relaxed">
                Có <strong>2 thay đổi</strong> thuộc danh mục nhạy cảm cần ban kiểm duyệt HUKI xác nhận bản quyền.
              </p>
              <div className="p-2 rounded bg-surface-container-lowest text-[11px] text-tertiary font-medium border border-surface-variant">
                ✓ Bạn đọc vẫn thấy tên sách &amp; ảnh bìa hiện tại.<br />
                ✓ Giá bán mới có hiệu lực tức thì.
              </div>
            </div>
          </div>
        </div>

        <footer className="fixed bottom-0 left-0 right-0 z-50 bg-surface-container-lowest/95 backdrop-blur-md border-t border-surface-variant shadow-lg h-[70px]">
          <div className="max-w-[1680px] w-full mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-secondary-fixed/40 flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-lg">cloud_sync</span>
              </div>
              <div>
                <div className="font-title-md text-xs font-bold text-on-surface flex items-center gap-2">
                  <span>3 thay đổi chưa lưu</span>
                </div>
                <div className="font-body-sm text-[11px] text-on-surface-variant">
                  Tự động lưu bản nháp lúc 09:42 · Phiên bản v3.4.1
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/seller/products" className="px-4 py-2 rounded-lg border border-surface-variant text-on-surface font-title-md text-xs hover:bg-surface-container transition-colors">
                Bỏ Thay Đổi
              </Link>
              <button className="px-5 py-2.5 rounded-lg bg-tertiary hover:opacity-90 text-white font-title-md text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer" type="button">
                <span className="material-symbols-outlined text-base">send_and_archive</span>
                <span>LƯU &amp; GỬI DUYỆT LẠI</span>
              </button>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
