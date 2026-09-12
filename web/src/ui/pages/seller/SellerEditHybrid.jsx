import React from 'react';
import { Link } from 'react-router-dom';

export default function SellerEditHybrid() {
  return (
    <div className="w-full bg-background text-on-surface antialiased min-h-screen py-6 pb-28 font-body-md text-body-md">
      <main className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-space-lg">

        <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-surface-variant">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link className="inline-flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant hover:text-tertiary transition-colors" to="/">
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
            <button className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-container-lowest border border-surface-variant text-on-surface font-title-md text-xs hover:border-tertiary hover:bg-surface-container-low transition-all shadow-xs">
              <span className="material-symbols-outlined text-base">visibility</span>
              <span>Xem Trước Giao Diện</span>
            </button>
            <Link className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-container-lowest border border-surface-variant text-tertiary font-title-md text-xs hover:border-tertiary hover:bg-tertiary-fixed/20 transition-all shadow-xs" target="_blank" to="/seller/product/edit-hybrid">
              <span className="material-symbols-outlined text-base">open_in_new</span>
              <span>Xem Trên Cửa Hàng</span>
            </Link>
            <button className="p-2 rounded-lg bg-surface-container-lowest border border-surface-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors shadow-xs" title="Tác vụ khác">
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
            <Link className="font-label-sm text-xs text-tertiary hover:underline inline-flex items-center gap-1" to="/seller/edge-cases">
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

              <Link className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-container-lowest border border-tertiary/40 text-tertiary font-semibold shadow-xs" to="/seller/product/edit-hybrid">
                <div className="flex items-center gap-2 truncate">
                  <span className="material-symbols-outlined text-sm">edit_note</span>
                  <span className="truncate">01 Cơ Bản</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-secondary" title="Có thay đổi chờ duyệt"></span>
              </Link>

              <Link className="flex items-center justify-between px-3 py-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest transition-colors" to="/seller/edge-cases">
                <div className="flex items-center gap-2 truncate">
                  <span className="material-symbols-outlined text-sm">category</span>
                  <span className="truncate">02 Tác Giả &amp; Loại</span>
                </div>
                <span className="material-symbols-outlined text-xs text-tertiary font-bold">check</span>
              </Link>

              <Link className="flex items-center justify-between px-3 py-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest transition-colors" to="/library">
                <div className="flex items-center gap-2 truncate">
                  <span className="material-symbols-outlined text-sm">photo_library</span>
                  <span className="truncate">03 Bìa &amp; Media</span>
                </div>
                <span className="material-symbols-outlined text-xs text-secondary font-bold" title="Ảnh mới chờ duyệt">warning</span>
              </Link>

              <Link className="flex items-center justify-between px-3 py-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest transition-colors" to="/">
                <div className="flex items-center gap-2 truncate">
                  <span className="material-symbols-outlined text-sm">sell</span>
                  <span className="truncate">04 Giá Bán Kép</span>
                </div>
                <span className="w-1.5 h-1.5 rounded-full bg-primary" title="Giá mới lưu ngay"></span>
              </Link>

              <Link className="flex items-center justify-between px-3 py-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest transition-colors" to="/">
                <div className="flex items-center gap-2 truncate">
                  <span className="material-symbols-outlined text-sm">inventory_2</span>
                  <span className="truncate">05 Kho Vật Lý</span>
                </div>
                <span className="font-label-sm text-[10px] text-on-surface-variant">112</span>
              </Link>

              <Link className="flex items-center justify-between px-3 py-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest transition-colors" to="/">
                <div className="flex items-center gap-2 truncate">
                  <span className="material-symbols-outlined text-sm">local_shipping</span>
                  <span className="truncate">06 Vận Chuyển</span>
                </div>
                <span className="material-symbols-outlined text-xs text-tertiary font-bold">check</span>
              </Link>

              <Link className="flex items-center justify-between px-3 py-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest transition-colors" to="/">
                <div className="flex items-center gap-2 truncate">
                  <span className="material-symbols-outlined text-sm">lock_reset</span>
                  <span className="truncate">07 Ebook &amp; DRM</span>
                </div>
                <span className="material-symbols-outlined text-xs text-tertiary font-bold">check</span>
              </Link>

              <Link className="flex items-center justify-between px-3 py-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest transition-colors" to="/">
                <div className="flex items-center gap-2 truncate">
                  <span className="material-symbols-outlined text-sm">visibility</span>
                  <span className="truncate">08 Hiển Thị</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-tertiary"></span>
              </Link>
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
                  <input className="w-full bg-surface-container-lowest border-2 border-secondary/40 rounded-lg px-3.5 py-2.5 font-body-md text-body-md text-on-surface focus:outline-none focus:border-tertiary transition-colors" type="text" value="Atomic Habits – Thay Đổi Tí Hon, Hiệu Quả Bất Ngờ (Ấn Bản Kỷ Niệm 2026)" />
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
                <textarea className="w-full bg-surface-container-lowest border border-surface-variant rounded-lg p-3 font-body-md text-xs text-on-surface focus:outline-none focus:border-tertiary transition-colors resize-none" rows="2">Cuốn sách kinh điển hướng dẫn cách thiết lập hệ thống thói quen nhỏ mỗi ngày để tạo nên bứt phá vượt bậc trong sự nghiệp và đời sống.</textarea>
              </div>

              <div className="space-y-1.5">
                <label className="font-title-md text-xs font-semibold text-on-surface">Nội Dung Giới Thiệu Chi Tiết</label>
                <div className="border border-surface-variant rounded-xl overflow-hidden bg-surface-container-lowest">

                  <div className="bg-surface-container-low border-b border-surface-variant px-3 py-1.5 flex items-center gap-1 text-on-surface-variant">
                    <button className="p-1 rounded hover:bg-surface-container hover:text-on-surface" type="button"><span className="material-symbols-outlined text-sm font-bold">format_bold</span></button>
                    <button className="p-1 rounded hover:bg-surface-container hover:text-on-surface" type="button"><span className="material-symbols-outlined text-sm">format_italic</span></button>
                    <div className="h-4 w-px bg-surface-variant mx-1"></div>
                    <button className="px-2 py-0.5 rounded hover:bg-surface-container hover:text-on-surface font-headline-sm text-xs" type="button">H1</button>
                    <button className="px-2 py-0.5 rounded hover:bg-surface-container hover:text-on-surface font-headline-sm text-xs" type="button">H2</button>
                    <div className="h-4 w-px bg-surface-variant mx-1"></div>
                    <button className="p-1 rounded hover:bg-surface-container hover:text-on-surface" type="button"><span className="material-symbols-outlined text-sm">format_list_bulleted</span></button>
                    <button className="p-1 rounded hover:bg-surface-container hover:text-on-surface" type="button"><span className="material-symbols-outlined text-sm">format_quote</span></button>
                    <button className="p-1 rounded hover:bg-surface-container hover:text-on-surface" type="button"><span className="material-symbols-outlined text-sm">link</span></button>
                  </div>
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
                  <input className="w-full bg-surface-container-lowest border border-surface-variant rounded-lg px-2.5 py-2 font-body-sm text-xs text-on-surface focus:outline-none focus:border-tertiary" type="text" value="15/08/2020" />
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
                  <span className="text-[10px] text-outline block mt-0.5 leading-tight">Đã gắn mã ISBN quốc gia</span>
                </div>
                <div>
                  <label className="font-title-md text-xs font-semibold text-on-surface block mb-1">Lần Tái Bản</label>
                  <input className="w-full bg-surface-container-lowest border border-surface-variant rounded-lg px-2.5 py-2 font-body-sm text-xs text-on-surface focus:outline-none focus:border-tertiary" type="text" value="Tái bản lần 3" />
                </div>
                <div>
                  <label className="font-title-md text-xs font-semibold text-on-surface block mb-1">Số Trang</label>
                  <input className="w-full bg-surface-container-lowest border border-surface-variant rounded-lg px-2.5 py-2 font-body-sm text-xs text-on-surface focus:outline-none focus:border-tertiary" type="number" value="320" />
                </div>
                <div>
                  <label className="font-title-md text-xs font-semibold text-on-surface block mb-1">Trọng Lượng (g)</label>
                  <input className="w-full bg-surface-container-lowest border border-surface-variant rounded-lg px-2.5 py-2 font-body-sm text-xs text-on-surface focus:outline-none focus:border-tertiary" type="number" value="350" />
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
                    <option>Tâm Lý Học Hành Vi</option>
                  </select>
                </div>
                <div>
                  <label className="font-title-md text-xs font-semibold text-on-surface block mb-1">Danh Mục Phụ</label>
                  <select className="w-full bg-surface-container-lowest border border-surface-variant rounded-lg px-3 py-2 font-body-sm text-xs text-on-surface focus:outline-none focus:border-tertiary">
                    <option>Thói Quen &amp; Kỷ Luật Bản Thân</option>
                    <option>Năng Suất &amp; Quản Trị Thời Gian</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-title-md text-xs font-semibold text-on-surface">Tác Giả Chính</label>
                    <span className="font-label-sm text-[10px] text-secondary">Cần thẩm định nếu thay đổi</span>
                  </div>
                  <div className="relative">
                    <input className="w-full bg-surface-container-lowest border border-surface-variant rounded-lg px-3 py-2 font-body-sm text-xs text-on-surface focus:outline-none focus:border-tertiary" type="text" value="James Clear" />
                    <span className="material-symbols-outlined absolute right-2.5 top-2.5 text-tertiary text-sm">verified</span>
                  </div>
                </div>
                <div>
                  <label className="font-title-md text-xs font-semibold text-on-surface block mb-1">Nhà Xuất Bản / Đơn Vị Phát Hành</label>
                  <input className="w-full bg-surface-container-low border border-surface-variant rounded-lg px-3 py-2 font-body-sm text-xs text-on-surface-variant cursor-not-allowed" readOnly type="text" value="NXB Thế Giới - Alpha Books" />
                </div>
              </div>

              <div>
                <label className="font-title-md text-xs font-semibold text-on-surface block mb-1">Từ Khóa Tìm Kiếm (Tags)</label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-surface-container-low border border-surface-variant rounded-lg">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-lowest border border-surface-variant text-xs text-on-surface">
                    Thói quen
                    <span className="material-symbols-outlined text-xs hover:text-primary cursor-pointer">close</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-lowest border border-surface-variant text-xs text-on-surface">
                    Năng suất
                    <span className="material-symbols-outlined text-xs hover:text-primary cursor-pointer">close</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-lowest border border-surface-variant text-xs text-on-surface">
                    Phát triển bản thân
                    <span className="material-symbols-outlined text-xs hover:text-primary cursor-pointer">close</span>
                  </span>
                  <input className="bg-transparent border-none text-xs text-on-surface focus:outline-none px-2 py-1 w-24" placeholder="+ Thêm tag..." type="text" />
                </div>
              </div>
            </section>

            <section className="bg-surface-container-lowest border border-surface-variant rounded-2xl p-space-lg shadow-xs space-y-4" id="sec-media">
              <div className="flex items-center justify-between border-b border-surface-variant pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-tertiary/10 text-tertiary flex items-center justify-center font-bold text-xs">03</span>
                  <h3 className="font-title-lg text-title-md font-bold text-on-surface">Ảnh Bìa Chính &amp; Bộ Sưu Tập Media</h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-xs font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">hourglass_top</span>
                  1 ảnh bìa mới chờ duyệt
                </span>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-low border border-surface-variant space-y-3">
                <div className="font-title-md text-xs font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-secondary">compare</span>
                  So Sánh Ảnh Bìa Chính (Main Cover Replacement)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  <div className="p-3 bg-surface-container-lowest rounded-xl border border-surface-variant flex gap-3">
                    <div className="w-20 h-28 flex-shrink-0 rounded-md overflow-hidden relative shadow-xs border border-surface-variant bg-surface-variant">
                      <img className="w-full h-full object-cover" alt="Bìa sách Atomic Habits phiên bản kinh điển màu trắng tinh tế với dòng chữ Atomic Habits to rõ ràng màu đen và các hạt li ti biểu trưng cho thói quen tí hon, phong cách đồ họa phẳng trang nhã của nhà xuất bản sách tri thức Việt Nam." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDW1YMO576xWSH-foR9kAr2D63faOOEx5PGjFdir5nmhGtmSrTDpKD1fINcaXBV7B2VivDkMf0YG5feAaTX8HPPTeyN-w6Mdwzly8PwvZBVwVTglHQJ1oXgRtYgqIETFa5eUUBroiiWS1aoDpN6zBEKL-GAWGtcSsZRlxYNly1gM-6jb0h6Aff1puebj0euDFk4sHXz7KpfOn2ciI7rf9fGiZRqF5D3GWpyBuAxZnAhQeGKO6RyueFMKQ" />
                      <div className="absolute inset-0 book-spine-shadow pointer-events-none"></div>
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-inverse-surface/80 text-inverse-on-surface font-label-sm text-[8px]">LIVE</span>
                    </div>
                    <div className="flex-1 flex flex-col justify-between py-0.5">
                      <div>
                        <div className="font-label-sm text-[10px] text-tertiary font-bold uppercase tracking-wide">Bản Hiện Tại (Đang Bán)</div>
                        <div className="font-title-md text-xs font-semibold text-on-surface mt-0.5">Atomic Habits Classic Cover</div>
                        <div className="font-body-sm text-[11px] text-on-surface-variant mt-0.5">Kích thước: 1200x1800 px · 1.4 MB</div>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] text-tertiary font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                        Khách hàng vẫn đang thấy ảnh này
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-surface-container-lowest rounded-xl border-2 border-secondary/50 flex gap-3 relative shadow-xs">
                    <div className="w-20 h-28 flex-shrink-0 rounded-md overflow-hidden relative shadow-xs border border-secondary/30 bg-surface-variant">
                      <img className="w-full h-full object-cover" alt="Bìa sách Atomic Habits ấn bản đặc biệt 2026 với dải ruy băng mạ vàng sang trọng, phông nền kem ngà thư viện thanh lịch và biểu tượng huy hiệu kỷ niệm xuất bản ấn tượng mang phong cách văn học cao cấp." src="https://lh3.googleusercontent.com/aida-public/AB6AXuA-bwMoEAtNQWYEjXL1jmhRKAWzr_8KazGv2lwGlkxFQLIL3xpVD61UBONTXjOi0n2YAs9G3d2h0vlTYjFw9gjV32509nwfdgupPKG7VCddtv6EPyijlpca3u136n0qCdEaR_R1if8yUU65v30ALL4S0lvyuUE4oj47eycW8_hNrz5JfwQqa06wbtZzGzYX8v31iO-2LZKQYl_lGSD_plk87PVvl0yax_IzVfl5R4X1mDqswEUOAV7y4w" />
                      <div className="absolute inset-0 book-spine-shadow pointer-events-none"></div>
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-secondary text-on-secondary font-label-sm text-[8px] font-bold">CHỜ DUYỆT</span>
                    </div>
                    <div className="flex-1 flex flex-col justify-between py-0.5">
                      <div>
                        <div className="font-label-sm text-[10px] text-secondary font-bold uppercase tracking-wide">Ảnh Đã Tải Lên Mới</div>
                        <div className="font-title-md text-xs font-semibold text-on-surface mt-0.5">Atomic Habits 2026 Edition</div>
                        <div className="font-body-sm text-[11px] text-on-surface-variant mt-0.5">Kích thước: 1600x2400 px · 2.1 MB</div>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <button className="font-label-sm text-[11px] text-tertiary hover:underline font-semibold" type="button">Thay Ảnh Khác</button>
                        <span className="text-surface-variant text-xs">·</span>
                        <button className="font-label-sm text-[11px] text-primary hover:underline" type="button">Hủy Ảnh Mới</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-title-md text-xs font-semibold text-on-surface flex items-center justify-between">
                  <span>Hình Ảnh Bổ Sung &amp; Trang Ruột (Media Gallery)</span>
                  <span className="font-label-sm text-[11px] text-on-surface-variant">4 / 8 ảnh</span>
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">

                  <div className="relative group aspect-square rounded-xl border border-surface-variant bg-surface-container-low overflow-hidden shadow-2xs">
                    <img className="w-full h-full object-cover" alt="Ảnh chụp mặt sau cuốn sách Atomic Habits với tóm tắt nội dung và các lời khen tặng từ các chuyên gia phát triển bản thân hàng đầu trên nền gỗ ấm áp thư viện." src="https://lh3.googleusercontent.com/aida-public/AB6AXuB5P5SkYjvlaEf75ojRiqjeSzwvZ6cWzXke4SMGXWZ_mjJikuhXYcZljiAVvdRyZR9hPsQVKspcxY24B4tcO6uBn27r5rs4XbmHzNCPWCXNdFDZXzOH2YFdQpIR3SVfQ1d_3bsKUVpNtQkylHQNF4ixunpEkg2O1hEAyHORxXaKIcol7hTEgVnb4hZsPsc2DotiBg_sbtufhGKbkGebIpEaac3DZVUPILo3Qr4GSK-kY0g8ynOf5oKjHQ" />
                    <div className="absolute bottom-1 left-1 px-1 py-0.5 rounded bg-inverse-surface/80 text-inverse-on-surface text-[9px] font-label-sm">Mặt sau</div>
                  </div>

                  <div className="relative group aspect-square rounded-xl border border-surface-variant bg-surface-container-low overflow-hidden shadow-2xs">
                    <img className="w-full h-full object-cover" alt="Ảnh chụp cận cảnh gáy sách bìa cứng chỉ khâu chắc chắn của ấn bản sách Atomic Habits thể hiện độ tinh xảo trong gia công và đóng sách nghệ thuật." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAeQBCaVlVjCQQFW6UPEFehdu9FeoOMgOgYofJDHhXofckzaiDdXsHT5lSPiivkoFxpASTJWtgXZN1eshCcLmyYzKYAXl7aGaVk4r3DhLhlrCE_9nz5VN7as05OadGyvQ6yRlKO-UOcZn4sX19oG62wKc5HVSfF0eZf5vY2D7H5JqRNUy8SIPAkSuqO2BU6Gh03QwHtF_AXNQJ8877lcIBVpqxqO-d_kveK7j3P1-zzdk_u5VCYt64G6w" />
                    <div className="absolute bottom-1 left-1 px-1 py-0.5 rounded bg-inverse-surface/80 text-inverse-on-surface text-[9px] font-label-sm">Gáy sách</div>
                  </div>

                  <div className="relative group aspect-square rounded-xl border border-surface-variant bg-surface-container-low overflow-hidden shadow-2xs">
                    <img className="w-full h-full object-cover" alt="Ảnh chụp các trang ruột của sách Atomic Habits thể hiện bảng biểu thói quen và cách bố trí kiểu chữ Việt rõ nét trang nhã trên chất liệu giấy vàng bảo vệ mắt." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBibtGR38k12P3a5G2CEHdTnC6CzXcqToUazPzIDFQT0qtcZ8JIqvsGulbu9hgIV4m7Gwj6LZk5uH1Kvet2FbgudfdMDVlkfuycNTBcD6EpBOuwxdKAGBOfUpHJZS4n5tfnB3auvdFSjxBnieEUkBsBR-a0wTdmtqoMaEtf7IoQC-WNLVRMLF20AVOAgwXV74zfBNA0WFEkgAWSYOE9qAZP0IKOKDC_5vf2vv1LurEO_In2VYjwtpnPEw" />
                    <div className="absolute bottom-1 left-1 px-1 py-0.5 rounded bg-inverse-surface/80 text-inverse-on-surface text-[9px] font-label-sm">Ruột sách</div>
                  </div>

                  <div className="relative group aspect-square rounded-xl border border-surface-variant bg-surface-container-low overflow-hidden shadow-2xs">
                    <img className="w-full h-full object-cover" alt="Hình đồ họa infographic tóm tắt 4 bước xây dựng thói quen trong sách Atomic Habits với tông màu xanh lục bảo và cam đất tinh tế chuẩn mực thiết kế sách." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBcKAcTEE7LQGmK55Vqc5hrHYR4eBdy1uPyP0jwVpjCMqsEnJp8aLMJYHQlIhrUVMvrQL-lnZP653Y2ouLTFxe1TIoYCIjfBYu-mL8FHxnveTYRrKFH5PByO4tUtXp83Xg5YRTLYnGWTMVsPLEjjHQUjZEm1zrcwxyEfYpNZvl5BgMNK4l1IpL9jnh-sjq4ApEN-Lyskpi6X4csTa2EQyu0JKQlIiFnZAmnCO1owebR0Fm1No7iKzvRgA" />
                    <div className="absolute bottom-1 left-1 px-1 py-0.5 rounded bg-inverse-surface/80 text-inverse-on-surface text-[9px] font-label-sm">Infographic</div>
                  </div>

                  <div className="aspect-square rounded-xl border-2 border-dashed border-surface-variant hover:border-tertiary flex flex-col items-center justify-center text-on-surface-variant hover:text-tertiary cursor-pointer transition-colors bg-surface-container-low/50">
                    <span className="material-symbols-outlined text-xl">add_photo_alternate</span>
                    <span className="font-label-sm text-[10px] mt-1">+ Thêm ảnh</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-surface-container-lowest border border-surface-variant rounded-2xl p-space-lg shadow-xs space-y-4" id="sec-pricing">
              <div className="flex items-center justify-between border-b border-surface-variant pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-tertiary/10 text-tertiary flex items-center justify-center font-bold text-xs">04</span>
                  <h3 className="font-title-lg text-title-md font-bold text-on-surface">Chính Sách Giá Bán Kép (Dual Pricing)</h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-xs font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">bolt</span>
                  Giá mới có hiệu lực ngay khi lưu
                </span>
              </div>
              <div className="p-3 bg-surface-container-low rounded-xl text-xs text-on-surface-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary text-base">info</span>
                <span>Giá Sách Giấy và Ebook vận hành độc lập. Bạn có thể khuyến mãi một định dạng mà không ảnh hưởng tới định dạng còn lại.</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div className="p-4 rounded-xl border border-surface-variant bg-surface-container-lowest space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <div className="font-title-md text-xs font-bold text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-tertiary">menu_book</span>
                      GIÁ SÁCH GIẤY (VẬT LÝ)
                    </div>
                    <span className="px-2 py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-label-sm text-[10px] font-bold">GIẢM 25%</span>
                  </div>
                  <div>
                    <label className="font-body-sm text-[11px] text-on-surface-variant block mb-1">Giá Bìa Niêm Yết (Gốc)</label>
                    <div className="relative">
                      <input className="w-full bg-surface-container-low border border-surface-variant rounded-lg px-3 py-2 font-body-sm text-xs text-on-surface pr-8" type="text" value="159.000" />
                      <span className="absolute right-3 top-2 font-body-sm text-xs text-on-surface-variant">đ</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-title-md text-xs font-semibold text-primary">Giá Bán Thực Tế (Khách thanh toán)</label>
                      <span className="text-[10px] font-label-sm text-primary font-semibold">Giá cũ: 129.000đ</span>
                    </div>
                    <div className="relative">
                      <input className="w-full bg-surface-container-lowest border-2 border-primary rounded-lg px-3 py-2 font-title-md text-sm text-primary font-bold pr-8" type="text" value="119.000" />
                      <span className="absolute right-3 top-2.5 font-title-md text-xs text-primary font-bold">đ</span>
                    </div>
                    <p className="font-body-sm text-[11px] text-primary mt-1">
                      ✓ Đang chỉnh sửa giảm thêm 10.000đ. Áp dụng ngay sau khi nhấn Lưu!
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-surface-variant bg-surface-container-lowest space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <div className="font-title-md text-xs font-bold text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-tertiary">tablet_android</span>
                      GIÁ BẢN ĐIỆN TỬ (EBOOK DRM)
                    </div>
                    <span className="px-2 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-[10px] font-bold">TIẾT KIỆM 47%</span>
                  </div>
                  <div>
                    <label className="font-body-sm text-[11px] text-on-surface-variant block mb-1">Giá Ebook Niêm Yết (Gốc)</label>
                    <div className="relative">
                      <input className="w-full bg-surface-container-low border border-surface-variant rounded-lg px-3 py-2 font-body-sm text-xs text-on-surface pr-8" type="text" value="149.000" />
                      <span className="absolute right-3 top-2 font-body-sm text-xs text-on-surface-variant">đ</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-title-md text-xs font-semibold text-tertiary">Giá Bán Ebook Khuyến Mãi</label>
                      <span className="text-[10px] font-label-sm text-on-surface-variant">Giữ nguyên</span>
                    </div>
                    <div className="relative">
                      <input className="w-full bg-surface-container-lowest border border-tertiary rounded-lg px-3 py-2 font-title-md text-sm text-tertiary font-bold pr-8" type="text" value="79.000" />
                      <span className="absolute right-3 top-2.5 font-title-md text-xs text-tertiary font-bold">đ</span>
                    </div>
                    <p className="font-body-sm text-[11px] text-tertiary mt-1">
                      Phí nền tảng DRM HUKI đã bao gồm (15% theo hợp đồng đối tác).
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-surface-container-lowest border border-surface-variant rounded-2xl p-space-lg shadow-xs space-y-4" id="sec-inventory">
              <div className="flex items-center justify-between border-b border-surface-variant pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-tertiary/10 text-tertiary flex items-center justify-center font-bold text-xs">05</span>
                  <h3 className="font-title-lg text-title-md font-bold text-on-surface">Kho Sách Giấy &amp; Kiện Hàng</h3>
                </div>
                <span className="font-label-sm text-xs text-tertiary font-bold">112 cuốn khả dụng</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="font-title-md text-xs font-semibold text-on-surface block mb-1">Mã SKU Sách</label>
                  <input className="w-full bg-surface-container-lowest border border-surface-variant rounded-lg px-3 py-2 font-body-sm text-xs text-on-surface" type="text" value="ATOMIC-HABITS-PHY" />
                </div>
                <div>
                  <label className="font-title-md text-xs font-semibold text-on-surface block mb-1">Tổng Tồn Kho</label>
                  <input className="w-full bg-surface-container-lowest border border-surface-variant rounded-lg px-3 py-2 font-title-md text-xs font-bold text-on-surface" type="number" value="120" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-title-md text-xs font-semibold text-on-surface flex items-center gap-1">
                      Đã Giữ Đơn
                      <span className="material-symbols-outlined text-xs text-outline">lock</span>
                    </label>
                    <span className="font-label-sm text-[9px] text-outline">READONLY</span>
                  </div>
                  <input className="w-full bg-surface-container-low border border-surface-variant rounded-lg px-3 py-2 font-title-md text-xs text-on-surface-variant cursor-not-allowed" readOnly type="number" value="8" />
                </div>
                <div>
                  <label className="font-title-md text-xs font-semibold text-tertiary block mb-1">Khả Dụng</label>
                  <input className="w-full bg-tertiary-fixed/30 border border-tertiary/40 rounded-lg px-3 py-2 font-title-md text-xs font-bold text-tertiary" readOnly type="number" value="112" />
                </div>
              </div>

              <div className="p-3.5 bg-surface-container-low rounded-xl border border-surface-variant space-y-2">
                <div className="font-title-md text-xs font-semibold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">package_2</span>
                  Quy Cách Đóng Gói (Phục vụ tính cước bưu điện &amp; giao vận tự động)
                </div>
                <div className="grid grid-cols-4 gap-2 font-body-sm text-xs">
                  <div>
                    <span className="text-on-surface-variant text-[11px]">Dài (cm)</span>
                    <input className="w-full bg-surface-container-lowest border border-surface-variant rounded-md px-2 py-1 mt-0.5 text-xs" type="number" value="20" />
                  </div>
                  <div>
                    <span className="text-on-surface-variant text-[11px]">Rộng (cm)</span>
                    <input className="w-full bg-surface-container-lowest border border-surface-variant rounded-md px-2 py-1 mt-0.5 text-xs" type="number" value="14" />
                  </div>
                  <div>
                    <span className="text-on-surface-variant text-[11px]">Cao (cm)</span>
                    <input className="w-full bg-surface-container-lowest border border-surface-variant rounded-md px-2 py-1 mt-0.5 text-xs" type="number" value="3" />
                  </div>
                  <div>
                    <span className="text-on-surface-variant text-[11px]">Báo tồn thấp</span>
                    <input className="w-full bg-surface-container-lowest border border-surface-variant rounded-md px-2 py-1 mt-0.5 text-xs text-primary font-semibold" type="number" value="10" />
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-surface-container-lowest border border-surface-variant rounded-2xl p-space-lg shadow-xs space-y-4" id="sec-shipping">
              <div className="flex items-center justify-between border-b border-surface-variant pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-tertiary/10 text-tertiary flex items-center justify-center font-bold text-xs">06</span>
                  <h3 className="font-title-lg text-title-md font-bold text-on-surface">Vận Chuyển Hàng Hóa</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-label-sm text-xs font-semibold text-tertiary">Đang Bật Giao Hàng</span>
                  <div className="w-9 h-5 bg-tertiary rounded-full relative cursor-pointer p-0.5">
                    <div className="w-4 h-4 rounded-full bg-surface-container-lowest translate-x-4 shadow-xs"></div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-title-md text-xs font-semibold text-on-surface block mb-1">Thời Gian Chuẩn Bị Hàng</label>
                  <select className="w-full bg-surface-container-lowest border border-surface-variant rounded-lg px-3 py-2 font-body-sm text-xs text-on-surface">
                    <option>Trong vòng 24h (1 ngày làm việc)</option>
                    <option>Trong vòng 48h (Hàng đặt trước)</option>
                  </select>
                </div>
                <div>
                  <label className="font-title-md text-xs font-semibold text-on-surface block mb-1">Đơn Vị Vận Chuyển Mặc Định</label>
                  <div className="p-2 bg-surface-container-low border border-surface-variant rounded-lg text-xs flex items-center justify-between">
                    <span>HUKI Logistics Express &amp; GHTK</span>
                    <span className="font-label-sm text-tertiary font-semibold">Tự động kết nối</span>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-surface-container-low rounded-xl text-xs text-on-surface-variant flex items-start gap-2">
                <span className="material-symbols-outlined text-secondary text-base mt-0.5">warning</span>
                <p><strong>Lưu ý độc quyền mô hình Kép:</strong> Nếu bạn tắt nút giao hàng Sách Giấy (hoặc khi kho sách giấy về 0), hệ thống sẽ tự động chuyển trang sản phẩm sang trạng thái <em>"Chỉ bán Ebook"</em> để độc giả vẫn có thể mua bản số đọc ngay lập tức mà không làm gián đoạn doanh thu gian hàng.</p>
              </div>
            </section>

            <section className="bg-surface-container-lowest border border-surface-variant rounded-2xl p-space-lg shadow-xs space-y-4" id="sec-drm">
              <div className="flex items-center justify-between border-b border-surface-variant pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-tertiary/10 text-tertiary flex items-center justify-center font-bold text-xs">07</span>
                  <h3 className="font-title-lg text-title-md font-bold text-on-surface">Nội Dung Ebook &amp; Bảo Mật DRM</h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-xs font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">verified</span>
                  DRM V3 SẴN SÀNG
                </span>
              </div>

              <div className="p-4 rounded-xl border border-tertiary/30 bg-tertiary-fixed/15 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-tertiary text-on-tertiary flex items-center justify-center shadow-xs">
                    <span className="material-symbols-outlined">picture_as_pdf</span>
                  </div>
                  <div>
                    <div className="font-title-md text-xs font-bold text-on-surface">Atomic-Habits-Vietnamese-Edition.pdf</div>
                    <div className="font-body-sm text-[11px] text-on-surface-variant flex items-center gap-2 mt-0.5">
                      <span>48.2 MB</span>
                      <span>·</span>
                      <span>Đã mã hóa phân mảnh AES-256</span>
                      <span>·</span>
                      <span className="text-tertiary font-semibold">Tải lên lúc 14:10 15/08/2020</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-surface-variant text-on-surface font-title-md text-xs hover:border-tertiary transition-colors shadow-2xs" type="button">
                    Xem Trước Reader
                  </button>
                  <button className="px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-secondary text-secondary font-title-md text-xs hover:bg-secondary-fixed/30 transition-colors shadow-2xs" type="button">
                    Thay Tệp Ebook Mới
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-body-sm text-xs">
                <div className="p-3 rounded-xl bg-surface-container-low border border-surface-variant flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-tertiary text-lg">water_drop</span>
                  <div>
                    <div className="font-title-md text-xs font-semibold text-on-surface">Dynamic Watermark</div>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">Tự động in chìm mờ Họ tên, Email, SĐT và ID độc giả trên từng trang sách số để chống rò rỉ.</p>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-surface-container-low border border-surface-variant flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-tertiary text-lg">chrome_reader_mode</span>
                  <div>
                    <div className="font-title-md text-xs font-semibold text-on-surface">Bản Đọc Thử Miễn Phí</div>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">Đang cho phép đọc thử 30 trang đầu tiên (Chương 1 &amp; Lời giới thiệu) trực tiếp trên Web Reader.</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input defaultChecked className="rounded text-tertiary focus:ring-tertiary border-surface-variant" disabled id="license" type="checkbox" />
                <label className="font-body-sm text-xs text-on-surface" htmlFor="license">Gian hàng cam kết sở hữu đầy đủ bản quyền phát hành số tại lãnh thổ Việt Nam theo hợp đồng số BK-2020-CLR.</label>
              </div>
            </section>

            <section className="bg-surface-container-lowest border border-surface-variant rounded-2xl p-space-lg shadow-xs space-y-4" id="sec-visibility">
              <div className="flex items-center justify-between border-b border-surface-variant pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-tertiary/10 text-tertiary flex items-center justify-center font-bold text-xs">08</span>
                  <h3 className="font-title-lg text-title-md font-bold text-on-surface">Hiển Thị &amp; Xuất Bản</h3>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-tertiary"></span>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-tertiary/40 bg-tertiary-fixed/10 cursor-pointer">
                  <input defaultChecked className="text-tertiary focus:ring-tertiary" name="visibility" type="radio" />
                  <div>
                    <div className="font-title-md text-xs font-bold text-tertiary">Hiển Thị Công Khai (Đang Kích Hoạt)</div>
                    <div className="font-body-sm text-[11px] text-on-surface-variant">Sản phẩm xuất hiện trên công cụ tìm kiếm, trang tác giả, danh mục và gợi ý AI của HUKI.</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-xl border border-surface-variant bg-surface-container-lowest hover:bg-surface-container-low cursor-pointer transition-colors">
                  <input className="text-tertiary focus:ring-tertiary" name="visibility" type="radio" />
                  <div>
                    <div className="font-title-md text-xs font-semibold text-on-surface">Tạm Ẩn Sản Phẩm</div>
                    <div className="font-body-sm text-[11px] text-on-surface-variant">Không nhận thêm đơn hàng mới. Độc giả đã mua Ebook trước đây vẫn giữ nguyên quyền đọc trên thư viện cá nhân.</div>
                  </div>
                </label>
              </div>
              <div className="pt-2 flex items-center justify-between border-t border-surface-variant">
                <span className="text-xs text-outline">Cần chuyển trạng thái dài hạn?</span>
                <button className="text-xs text-outline hover:text-error flex items-center gap-1 font-medium transition-colors" type="button">
                  <span className="material-symbols-outlined text-sm">archive</span>
                  Lưu Trữ Sản Phẩm (Archive)
                </button>
              </div>
            </section>
          </div>

          <div className="col-span-12 lg:col-span-3 sticky top-[84px] space-y-space-md">

            <div className="bg-surface-container-lowest border border-surface-variant rounded-2xl p-4 shadow-xs space-y-3">
              <div className="font-label-sm text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">
                BẢN ĐANG XUẤT BẢN TRÊN SÀN
              </div>
              <div className="flex gap-3">
                <div className="w-16 h-22 flex-shrink-0 rounded-md overflow-hidden relative shadow-xs border border-surface-variant bg-surface-container">
                  <img className="w-full h-full object-cover" alt="Hình thu nhỏ bìa sách Atomic Habits hiển thị tiêu đề sách và phong cách thiết kế gọn gàng, phù hợp làm thumbnail hiển thị trong bảng điều khiển người bán sách trực tuyến." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCw9dmO3Cfldu8sEf_FhAPZBc-IZjTSK-JNQI5q3zGch-myCYucJq4-K4LUS403CBbPPUv9F8VJanjAXs-RkCbHaWtdoUc1ivTAGTyhhghMYbQu5tG3i2s1LKpM9d3Oc-YySPp7g_6DF94nqHnNrrW4d0VP7EqvAmfscACAjmT5Chvn-8c6Mq0FTmy2CkLZKw0O3Y444XaRzuwtroiMd7qsFsY0pzEPjpQKYJn4rebxqrrHD8id7-h-cw" />
                  <div className="absolute inset-0 book-spine-shadow pointer-events-none"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-[9px] font-bold">ĐANG BÁN</span>
                  <div className="font-title-md text-xs font-bold text-on-surface mt-1 truncate" title="Atomic Habits">Atomic Habits</div>
                  <div className="font-body-sm text-[11px] text-on-surface-variant">James Clear</div>
                  <div className="mt-2 text-xs space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-on-surface-variant">Sách giấy:</span>
                      <span className="font-semibold text-primary">119.000đ</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-on-surface-variant">Ebook:</span>
                      <span className="font-semibold text-tertiary">79.000đ</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-lowest border-2 border-secondary/40 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-title-md text-xs font-bold text-secondary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-secondary">pending_actions</span>
                  3 Thay Đổi Chưa Lưu
                </div>
                <span className="w-2 h-2 rounded-full bg-secondary animate-ping"></span>
              </div>
              <ul className="space-y-2 text-xs font-body-sm">

                <li className="p-2 rounded-lg bg-secondary-fixed/20 border border-secondary/30 flex items-start gap-2">
                  <span className="material-symbols-outlined text-secondary text-sm mt-0.5">warning</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-on-surface text-[11px]">Tên sản phẩm</div>
                    <div className="text-[10px] text-secondary truncate">Thêm hậu tố kỷ niệm 2026</div>
                    <span className="text-[9px] px-1.5 py-0.2 bg-secondary text-on-secondary rounded font-label-sm font-semibold">Cần xét duyệt</span>
                  </div>
                </li>

                <li className="p-2 rounded-lg bg-secondary-fixed/20 border border-secondary/30 flex items-start gap-2">
                  <span className="material-symbols-outlined text-secondary text-sm mt-0.5">warning</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-on-surface text-[11px]">Ảnh bìa chính</div>
                    <div className="text-[10px] text-secondary truncate">Tải lên ấn bản bìa mới</div>
                    <span className="text-[9px] px-1.5 py-0.2 bg-secondary text-on-secondary rounded font-label-sm font-semibold">Cần xét duyệt</span>
                  </div>
                </li>

                <li className="p-2 rounded-lg bg-tertiary-fixed/30 border border-tertiary/30 flex items-start gap-2">
                  <span className="material-symbols-outlined text-tertiary text-sm mt-0.5">check_circle</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-on-surface text-[11px]">Giá Sách Giấy</div>
                    <div className="text-[10px] text-tertiary">129.000đ → 119.000đ</div>
                    <span className="text-[9px] px-1.5 py-0.2 bg-tertiary text-on-tertiary rounded font-label-sm font-semibold">Áp dụng ngay</span>
                  </div>
                </li>
              </ul>
            </div>

            <div className="bg-surface-container-low border border-surface-variant rounded-2xl p-4 shadow-xs space-y-2 text-xs font-body-sm">
              <div className="font-title-md text-xs font-semibold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-tertiary text-sm">shield</span>
                Quy Trình Kiểm Tra Kép HUKI
              </div>
              <p className="text-[11px] text-on-surface-variant leading-relaxed">
                Có <strong>2 thay đổi</strong> thuộc danh mục nhạy cảm cần ban kiểm duyệt HUKI xác nhận bản quyền. Trong thời gian chờ xét duyệt:
              </p>
              <div className="p-2 rounded bg-surface-container-lowest text-[11px] text-tertiary font-medium border border-surface-variant">
                ✓ Bạn đọc vẫn thấy tên sách &amp; ảnh bìa hiện tại.<br />
                ✓ Giá bán mới (119.000đ) có hiệu lực tức thì.
              </div>
            </div>

            <div className="bg-surface-container-lowest border border-surface-variant rounded-2xl p-4 shadow-xs space-y-2.5 text-xs">
              <div className="font-label-sm text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">
                TRẠNG THÁI ĐỊNH DẠNG
              </div>
              <div className="space-y-1.5 font-body-sm">
                <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-tertiary">menu_book</span>
                    <span>Sách Giấy:</span>
                  </div>
                  <span className="font-semibold text-tertiary">Đang bán (112 khả dụng)</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-tertiary">tablet_android</span>
                    <span>Ebook DRM:</span>
                  </div>
                  <span className="font-semibold text-tertiary">Sẵn sàng phân phối</span>
                </div>
              </div>
              <p className="text-[10px] text-on-surface-variant italic leading-tight">
                * Khi Sách Giấy hết tồn kho (0 cuốn), hệ thống sẽ tự động chuyển sang chế độ chỉ bán Ebook mà không ngắt quyền tiếp cận của độc giả.
              </p>
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
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                  <span className="text-secondary font-medium text-[11px]">(2 mục cần ban biên tập duyệt)</span>
                </div>
                <div className="font-body-sm text-[11px] text-on-surface-variant">
                  Tự động lưu bản nháp lúc 09:42 · Phiên bản v3.4.1
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">

              <button className="px-4 py-2 rounded-lg border border-surface-variant text-on-surface font-title-md text-xs hover:bg-surface-container hover:text-primary transition-colors" type="button">
                Bỏ Thay Đổi
              </button>

              <button className="px-4 py-2 rounded-lg bg-surface-container-lowest border border-surface-variant text-on-surface font-title-md text-xs hover:border-tertiary transition-all shadow-xs flex items-center gap-1.5" type="button">
                <span className="material-symbols-outlined text-base">preview</span>
                <span>Xem Trước Thay Đổi</span>
              </button>

              <button className="px-5 py-2.5 rounded-lg bg-tertiary hover:bg-[#005740] text-on-tertiary font-title-md text-xs font-bold shadow-md transition-all flex items-center gap-2 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0" type="button">
                <span className="material-symbols-outlined text-base">send_and_archive</span>
                <span>LƯU &amp; GỬI DUYỆT LẠI (2 mục cần duyệt)</span>
              </button>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
