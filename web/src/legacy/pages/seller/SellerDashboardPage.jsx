import React from 'react';
import { Link } from 'react-router-dom';

export default function SellerDashboardPage() {
  return (
    <div className="w-full bg-surface text-on-surface antialiased min-h-screen py-6">
      <main className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

<div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-surface-variant/60">
<div>
<h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-medium">
            Chào buổi sáng, <span className="italic text-tertiary font-serif">Alpha Books</span>
</h1>
<p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Đây là tình hình vận hành và đơn hàng của cửa hàng hôm nay. Tất cả hệ thống cấp quyền Ebook DRM đều vận hành ổn định.
          </p>
</div>
<div className="flex items-center gap-2.5 shrink-0">

<div className="relative">
<select className="appearance-none h-9 pl-3 pr-8 rounded-lg bg-surface-container-lowest border border-surface-variant font-label-md text-label-md text-on-surface font-medium hover:border-outline focus:outline-none focus:border-tertiary cursor-pointer transition-colors shadow-sm">
<option>Hôm nay (07/09)</option>
<option>7 ngày gần nhất (01/09 - 07/09)</option>
<option>30 ngày qua</option>
<option>Tháng này (Tháng 9/2025)</option>
</select>
<span className="material-symbols-outlined absolute right-2.5 top-2.5 text-[16px] text-on-surface-variant pointer-events-none">expand_more</span>
</div>

<button className="flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-surface-container-lowest border border-surface-variant hover:bg-surface-container text-on-surface font-label-md text-label-md font-semibold transition-colors shadow-sm">
<span className="material-symbols-outlined text-[16px]">file_download</span>
<span>Xuất báo cáo</span>
</button>
</div>
</div>

<div>
<div className="flex items-center justify-between mb-3">
<div className="flex items-center gap-2">
<span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
<h2 className="font-title-lg text-title-lg text-on-surface font-semibold">Cần Bạn Xử Lý Ngay</h2>
<span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-medium">28 công việc tồn đọng</span>
</div>
<span className="font-label-sm text-label-sm text-on-surface-variant">Tự động cập nhật mỗi 60 giây</span>
</div>
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

<div className="bg-surface-container-lowest border border-tertiary/30 rounded-xl p-4 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between relative overflow-hidden">
<div className="absolute top-0 right-0 w-16 h-16 bg-tertiary/5 rounded-bl-full pointer-events-none"></div>
<div>
<div className="flex items-center justify-between">
<span className="font-label-md text-label-md text-tertiary font-semibold uppercase tracking-wider flex items-center gap-1">
<span className="material-symbols-outlined text-[16px]">notifications_active</span>
                  Đơn Mới
                </span>
<span className="w-2 h-2 rounded-full bg-tertiary animate-ping"></span>
</div>
<div className="mt-2 flex items-baseline gap-2">
<span className="font-headline-lg text-headline-lg font-bold text-on-surface">12</span>
<span className="font-body-sm text-body-sm text-on-surface-variant">đơn đang chờ xác nhận</span>
</div>
</div>
<div className="mt-4 pt-3 border-t border-surface-variant/60 flex items-center justify-between">
<span className="font-label-sm text-label-sm text-on-surface-variant">Sách giấy: 9 · Ebook: 3</span>
<Link className="font-label-md text-label-md text-tertiary font-semibold flex items-center gap-0.5 group-hover:underline" to="/seller/orders">
                Xử lý đơn <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
</Link>
</div>
</div>

<div className="bg-surface-container-lowest border border-surface-variant rounded-xl p-4 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between">
<div>
<div className="flex items-center justify-between">
<span className="font-label-md text-label-md text-secondary font-semibold uppercase tracking-wider flex items-center gap-1">
<span className="material-symbols-outlined text-[16px]">inventory</span>
                  Cần Chuẩn Bị
                </span>
<span className="material-symbols-outlined text-[18px] text-secondary">pending_actions</span>
</div>
<div className="mt-2 flex items-baseline gap-2">
<span className="font-headline-lg text-headline-lg font-bold text-on-surface">8</span>
<span className="font-body-sm text-body-sm text-on-surface-variant">đơn chờ đóng gói &amp; in mã</span>
</div>
</div>
<div className="mt-4 pt-3 border-t border-surface-variant/60 flex items-center justify-between">
<span className="font-label-sm text-label-sm text-on-surface-variant">Bàn giao trước 16:00</span>
<Link className="font-label-md text-label-md text-on-surface font-semibold flex items-center gap-0.5 group-hover:text-tertiary transition-colors" to="/seller/product/edit-hybrid">
                Xem đơn <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
</Link>
</div>
</div>

<div className="bg-surface-container-lowest border border-secondary-container/40 rounded-xl p-4 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between">
<div>
<div className="flex items-center justify-between">
<span className="font-label-md text-label-md text-secondary font-semibold uppercase tracking-wider flex items-center gap-1">
<span className="material-symbols-outlined text-[16px]">warning</span>
                  Sắp Hết Hàng
                </span>
<span className="px-1.5 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed text-[10px] font-bold">KHO SÁCH</span>
</div>
<div className="mt-2 flex items-baseline gap-2">
<span className="font-headline-lg text-headline-lg font-bold text-secondary">5</span>
<span className="font-body-sm text-body-sm text-on-surface-variant">tựa sách tồn &lt; 5 cuốn</span>
</div>
</div>
<div className="mt-4 pt-3 border-t border-surface-variant/60 flex items-center justify-between">
<span className="font-label-sm text-label-sm text-error font-medium">1 tựa đã hết hẳn</span>
<Link className="font-label-md text-label-md text-secondary font-semibold flex items-center gap-0.5 group-hover:underline" to="/seller/edge-cases">
                Kiểm tra kho <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
</Link>
</div>
</div>

<div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between">
<div>
<div className="flex items-center justify-between">
<span className="font-label-md text-label-md text-primary font-semibold uppercase tracking-wider flex items-center gap-1">
<span className="material-symbols-outlined text-[16px]">security</span>
                  Cần Kiểm Tra
                </span>
<span className="px-1.5 py-0.5 rounded bg-error-container text-on-error-container text-[10px] font-bold">DRM &amp; METADATA</span>
</div>
<div className="mt-2 flex items-baseline gap-2">
<span className="font-headline-lg text-headline-lg font-bold text-primary">3</span>
<span className="font-body-sm text-body-sm text-on-surface-variant">sản phẩm số cần duyệt</span>
</div>
</div>
<div className="mt-4 pt-3 border-t border-surface-variant/60 flex items-center justify-between">
<span className="font-label-sm text-label-sm text-on-surface-variant">2 Ebook lỗi EPUB · 1 thiếu bìa</span>
<Link className="font-label-md text-label-md text-primary font-semibold flex items-center gap-0.5 group-hover:underline" to="/seller/edge-cases">
                Xem sản phẩm <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
</Link>
</div>
</div>
</div>
</div>

<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

<div className="bg-surface-container-lowest border border-surface-variant rounded-xl p-4 shadow-sm flex items-center justify-between">
<div>
<p className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-medium">Doanh Thu 7 Ngày</p>
<p className="font-title-lg text-[22px] font-bold text-on-surface mt-1">12.480.000đ</p>
<div className="flex items-center gap-1 mt-1 text-tertiary font-label-sm text-label-sm font-semibold">
<span className="material-symbols-outlined text-[14px]">trending_up</span>
<span>↑ 8,4%</span>
<span className="text-on-surface-variant font-normal">so với tuần trước</span>
</div>
</div>
<div className="w-11 h-11 rounded-lg bg-surface-container-low text-tertiary flex items-center justify-center">
<span className="material-symbols-outlined text-[24px]">payments</span>
</div>
</div>

<div className="bg-surface-container-lowest border border-surface-variant rounded-xl p-4 shadow-sm flex items-center justify-between">
<div>
<p className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-medium">Tổng Đơn Hàng</p>
<p className="font-title-lg text-[22px] font-bold text-on-surface mt-1">86 đơn</p>
<div className="flex items-center gap-1 mt-1 text-tertiary font-label-sm text-label-sm font-semibold">
<span className="material-symbols-outlined text-[14px]">trending_up</span>
<span>↑ 6,1%</span>
<span className="text-on-surface-variant font-normal">tỷ lệ duyệt 100%</span>
</div>
</div>
<div className="w-11 h-11 rounded-lg bg-surface-container-low text-on-surface flex items-center justify-center">
<span className="material-symbols-outlined text-[24px]">receipt_long</span>
</div>
</div>

<div className="bg-surface-container-lowest border border-surface-variant rounded-xl p-4 shadow-sm flex items-center justify-between">
<div>
<p className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-medium">Sản Phẩm Đã Bán</p>
<p className="font-title-lg text-[22px] font-bold text-on-surface mt-1">112 bản</p>
<div className="flex items-center gap-1 mt-1 font-label-sm text-label-sm text-on-surface-variant">
<span className="text-tertiary font-semibold">68 sách giấy</span>
<span>·</span>
<span className="text-secondary font-semibold">44 ebook số</span>
</div>
</div>
<div className="w-11 h-11 rounded-lg bg-surface-container-low text-secondary flex items-center justify-center">
<span className="material-symbols-outlined text-[24px]">auto_stories</span>
</div>
</div>

<div className="bg-surface-container-lowest border border-surface-variant rounded-xl p-4 shadow-sm flex items-center justify-between">
<div>
<p className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-medium">Tỷ Lệ Hoàn Thành</p>
<p className="font-title-lg text-[22px] font-bold text-on-surface mt-1">96,8%</p>
<div className="flex items-center gap-1 mt-1 text-tertiary font-label-sm text-label-sm font-semibold">
<span className="material-symbols-outlined text-[14px]">check_circle</span>
<span>Đạt chuẩn xuất sắc HUKI</span>
</div>
</div>
<div className="w-11 h-11 rounded-lg bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center">
<span className="material-symbols-outlined text-[24px]">grade</span>
</div>
</div>
</div>

<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

<div className="lg:col-span-8 space-y-6">

<div className="bg-surface-container-lowest border border-surface-variant rounded-2xl p-6 shadow-sm">
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-surface-variant/60">
<div>
<h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold tracking-tight">Doanh Thu &amp; Tăng Trưởng</h3>
<p className="font-body-sm text-body-sm text-on-surface-variant">Phân bổ doanh thu sách in và bản quyền số Ebook DRM 7 ngày qua</p>
</div>

<div className="flex items-center p-1 bg-surface-container-low rounded-lg border border-surface-variant text-label-md font-label-md">
<button className="px-3 py-1 rounded bg-surface-container-lowest shadow-xs text-on-surface font-semibold">Doanh thu</button>
<button className="px-3 py-1 text-on-surface-variant hover:text-on-surface transition-colors">Số lượng đơn</button>
<button className="px-3 py-1 text-on-surface-variant hover:text-on-surface transition-colors">Lượt tải Ebook</button>
</div>
</div>

<div className="mt-4 relative">
<div className="flex items-center justify-between text-label-sm font-label-sm text-on-surface-variant mb-2">
<span>Đơn vị: VNĐ (Triệu)</span>
<div className="flex items-center gap-4">
<div className="flex items-center gap-1.5">
<span className="w-3 h-1 bg-tertiary rounded"></span>
<span>Sách giấy truyền thống</span>
</div>
<div className="flex items-center gap-1.5">
<span className="w-3 h-1 bg-primary rounded"></span>
<span>Ebook bản quyền số</span>
</div>
</div>
</div>

<div className="relative w-full h-[220px]">
<svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 700 200">

<line stroke="#e6f0ee" stroke-dasharray="3 3" stroke-width="1" x1="0" x2="700" y1="20" y2="20"></line>
<line stroke="#e6f0ee" stroke-dasharray="3 3" stroke-width="1" x1="0" x2="700" y1="70" y2="70"></line>
<line stroke="#e6f0ee" stroke-dasharray="3 3" stroke-width="1" x1="0" x2="700" y1="120" y2="120"></line>
<line stroke="#e6f0ee" stroke-width="1" x1="0" x2="700" y1="170" y2="170"></line>

<defs>
<linearGradient id="tertiaryGradient" x1="0%" x2="0%" y1="0%" y2="100%">
<stop offset="0%" stop-color="#006953" stop-opacity="0.18"></stop>
<stop offset="100%" stop-color="#006953" stop-opacity="0.0"></stop>
</linearGradient>
</defs>

<path d="M 30,150 Q 130,135 210,105 T 380,85 T 490,45 T 580,60 T 670,30 L 670,170 L 30,170 Z" fill="url(#tertiaryGradient)"></path>

<path d="M 30,150 Q 130,135 210,105 T 380,85 T 490,45 T 580,60 T 670,30" fill="none" stroke="#006953" stroke-linecap="round" stroke-width="2.5"></path>

<path d="M 30,165 Q 130,155 210,140 T 380,120 T 490,100 T 580,110 T 670,85" fill="none" stroke="#ac2c19" stroke-dasharray="4 4" stroke-linecap="round" stroke-width="2"></path>

<circle className="stroke-surface-container-lowest stroke-2" cx="30" cy="150" fill="#006953" r="3.5"></circle>
<circle className="stroke-surface-container-lowest stroke-2" cx="140" cy="125" fill="#006953" r="3.5"></circle>
<circle className="stroke-surface-container-lowest stroke-2" cx="250" cy="98" fill="#006953" r="3.5"></circle>
<circle className="stroke-surface-container-lowest stroke-2" cx="370" cy="85" fill="#006953" r="3.5"></circle>
<circle className="stroke-surface-container-lowest stroke-2 shadow" cx="490" cy="45" fill="#006953" r="5"></circle>
<circle className="stroke-surface-container-lowest stroke-2" cx="580" cy="60" fill="#006953" r="3.5"></circle>
<circle className="stroke-surface-container-lowest stroke-2" cx="670" cy="30" fill="#006953" r="4"></circle>
</svg>

<div className="absolute top-2 left-[66%] -translate-x-1/2 bg-inverse-surface text-inverse-on-surface px-3 py-2 rounded-lg shadow-xl pointer-events-none text-left z-10">
<div className="flex items-center justify-between gap-3">
<span className="font-label-sm text-label-sm text-surface-variant">Thứ 6, 05/09</span>
<span className="font-label-sm text-label-sm text-tertiary-fixed font-bold">14 đơn</span>
</div>
<p className="font-title-md text-[14px] font-bold text-white mt-0.5">2.140.000đ</p>
<p className="font-label-sm text-[11px] text-tertiary-fixed-dim">Sách giấy: 1.480.000đ · Ebook: 660.000đ</p>
</div>
</div>

<div className="flex items-center justify-between text-label-md font-label-md text-on-surface-variant px-4 mt-2">
<span>01/09</span>
<span>02/09</span>
<span>03/09</span>
<span>04/09</span>
<span className="font-semibold text-tertiary">05/09 (Đỉnh điểm)</span>
<span>06/09</span>
<span>07/09 (Hôm nay)</span>
</div>
</div>

<div className="mt-6 pt-4 border-t border-surface-variant grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
<div className="p-2 rounded-lg bg-surface-container-low/60">
<span className="font-label-sm text-label-sm text-on-surface-variant">Chờ xác nhận</span>
<p className="font-title-lg text-title-lg font-bold text-tertiary mt-0.5">12</p>
</div>
<div className="p-2 rounded-lg bg-surface-container-low/60">
<span className="font-label-sm text-label-sm text-on-surface-variant">Đang chuẩn bị</span>
<p className="font-title-lg text-title-lg font-bold text-secondary mt-0.5">8</p>
</div>
<div className="p-2 rounded-lg bg-surface-container-low/60">
<span className="font-label-sm text-label-sm text-on-surface-variant">Đang giao hàng</span>
<p className="font-title-lg text-title-lg font-bold text-on-surface mt-0.5">21</p>
</div>
<div className="p-2 rounded-lg bg-surface-container-low/60">
<span className="font-label-sm text-label-sm text-on-surface-variant">Đã hoàn tất</span>
<p className="font-title-lg text-title-lg font-bold text-tertiary mt-0.5">156</p>
</div>
<div className="p-2 rounded-lg bg-surface-container-low/60">
<span className="font-label-sm text-label-sm text-on-surface-variant">Đã hủy / Hoàn</span>
<p className="font-title-lg text-title-lg font-bold text-error mt-0.5">4</p>
</div>
</div>
</div>

<div className="bg-surface-container-lowest border border-surface-variant rounded-2xl p-6 shadow-sm">
<div className="flex items-center justify-between pb-4 border-b border-surface-variant/60">
<div>
<div className="flex items-center gap-2">
<h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold tracking-tight">Đơn Hàng Mới Nhất</h3>
<span className="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-bold">187 đơn tổng</span>
</div>
<p className="font-body-sm text-body-sm text-on-surface-variant">Quy trình xử lý đơn tích hợp cả giao vận sách vật lý và cấp quyền đọc Ebook tức thì.</p>
</div>
<div className="flex items-center gap-2">
<button className="px-3 py-1.5 rounded-lg border border-surface-variant text-label-md font-label-md text-on-surface hover:bg-surface-container transition-colors flex items-center gap-1">
<span className="material-symbols-outlined text-[16px]">filter_list</span>
                  Lọc trạng thái
                </button>
</div>
</div>

<div className="overflow-x-auto -mx-6 px-6 mt-3">
<table className="w-full text-left border-collapse">
<thead>
<tr className="border-b border-surface-variant text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
<th className="py-3 px-2 font-semibold">Mã Đơn</th>
<th className="py-3 px-2 font-semibold">Khách Hàng</th>
<th className="py-3 px-2 font-semibold">Sản Phẩm</th>
<th className="py-3 px-2 font-semibold">Định Dạng</th>
<th className="py-3 px-2 font-semibold">Tổng Tiền</th>
<th className="py-3 px-2 font-semibold">Vận Hành / DRM</th>
<th className="py-3 px-2 font-semibold">Thời Gian</th>
<th className="py-3 px-2 font-semibold text-right">Thao Tác</th>
</tr>
</thead>
<tbody className="divide-y divide-surface-variant/60 font-body-sm text-body-sm">

<tr className="hover:bg-surface-container-low/40 transition-colors group">
<td className="py-3.5 px-2 font-semibold text-on-surface font-mono">
                      #HK24090125
                    </td>
<td className="py-3.5 px-2">
<p className="font-medium text-on-surface">Nguyễn Minh</p>
<p className="text-[11px] text-on-surface-variant">0912•••458</p>
</td>
<td className="py-3.5 px-2 max-w-[180px]">
<p className="font-medium text-on-surface truncate">Atomic Habits (x2)</p>
<span className="text-[11px] text-on-surface-variant">Bìa mềm · Tái bản 2024</span>
</td>
<td className="py-3.5 px-2">
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-sm text-[11px] bg-surface-container text-on-surface font-medium border border-surface-variant">
<span className="material-symbols-outlined text-[12px]">menu_book</span>
                        Sách Giấy
                      </span>
</td>
<td className="py-3.5 px-2">
<p className="font-bold text-primary font-mono">278.000đ</p>
<span className="font-label-sm text-[10px] text-tertiary">Đã TT (VNPay)</span>
</td>
<td className="py-3.5 px-2">
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-label-sm text-[11px] bg-secondary-fixed/50 text-on-secondary-fixed-variant font-semibold">
<span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                        Chờ xác nhận
                      </span>
</td>
<td className="py-3.5 px-2 text-on-surface-variant text-[12px]">10 phút trước</td>
<td className="py-3.5 px-2 text-right">
<button className="px-2.5 py-1 rounded-md bg-tertiary text-on-tertiary font-label-md text-label-md font-semibold hover:bg-tertiary-container shadow-xs transition-colors">
                        Xác nhận
                      </button>
</td>
</tr>

<tr className="hover:bg-surface-container-low/40 transition-colors group bg-tertiary-container/5">
<td className="py-3.5 px-2 font-semibold text-on-surface font-mono">
                      #HK24090124
                    </td>
<td className="py-3.5 px-2">
<p className="font-medium text-on-surface">Trần Thu Hà</p>
<p className="text-[11px] text-on-surface-variant">ha.tran•••@gmail.com</p>
</td>
<td className="py-3.5 px-2 max-w-[180px]">
<p className="font-medium text-on-surface truncate">Deep Work: Làm Việc Sâu</p>
<span className="text-[11px] text-tertiary">Đã kích hoạt License key</span>
</td>
<td className="py-3.5 px-2">
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-sm text-[11px] bg-tertiary-fixed text-on-tertiary-fixed font-semibold">
<span className="material-symbols-outlined text-[12px] fill-icon">devices</span>
                        Ebook DRM
                      </span>
</td>
<td className="py-3.5 px-2">
<p className="font-bold text-primary font-mono">79.000đ</p>
<span className="font-label-sm text-[10px] text-tertiary">Đã TT (MoMo)</span>
</td>
<td className="py-3.5 px-2">
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-label-sm text-[11px] bg-tertiary/10 text-tertiary font-semibold">
<span className="material-symbols-outlined text-[13px] fill-icon">check_circle</span>
                        Đã cấp Tủ Sách
                      </span>
</td>
<td className="py-3.5 px-2 text-on-surface-variant text-[12px]">18 phút trước</td>
<td className="py-3.5 px-2 text-right">
<button className="px-2.5 py-1 rounded-md bg-surface-container-lowest border border-surface-variant text-on-surface font-label-md text-label-md font-semibold hover:border-tertiary hover:text-tertiary transition-colors">
                        Chi tiết
                      </button>
</td>
</tr>

<tr className="hover:bg-surface-container-low/40 transition-colors group">
<td className="py-3.5 px-2 font-semibold text-on-surface font-mono">
                      #HK24090123
                    </td>
<td className="py-3.5 px-2">
<p className="font-medium text-on-surface">Lê Hoàng</p>
<p className="text-[11px] text-on-surface-variant">0988•••112 (Đà Nẵng)</p>
</td>
<td className="py-3.5 px-2 max-w-[180px]">
<p className="font-medium text-on-surface truncate">Tâm Lý Học Về Tiền + 1 khác</p>
<span className="text-[11px] text-on-surface-variant">Tư Duy Nhanh &amp; Chậm</span>
</td>
<td className="py-3.5 px-2">
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-sm text-[11px] bg-surface-container text-on-surface font-medium border border-surface-variant">
<span className="material-symbols-outlined text-[12px]">menu_book</span>
                        Sách Giấy
                      </span>
</td>
<td className="py-3.5 px-2">
<p className="font-bold text-primary font-mono">427.000đ</p>
<span className="font-label-sm text-[10px] text-on-surface-variant">COD khi nhận</span>
</td>
<td className="py-3.5 px-2">
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-label-sm text-[11px] bg-surface-container-high text-on-surface font-medium">
<span className="material-symbols-outlined text-[13px]">package_2</span>
                        Đang chuẩn bị
                      </span>
</td>
<td className="py-3.5 px-2 text-on-surface-variant text-[12px]">31 phút trước</td>
<td className="py-3.5 px-2 text-right">
<button className="px-2.5 py-1 rounded-md bg-surface-container-lowest border border-outline text-on-surface font-label-md text-label-md font-semibold hover:bg-surface-container transition-colors">
                        In vận đơn
                      </button>
</td>
</tr>

<tr className="hover:bg-surface-container-low/40 transition-colors group">
<td className="py-3.5 px-2 font-semibold text-on-surface font-mono">
                      #HK24090122
                    </td>
<td className="py-3.5 px-2">
<p className="font-medium text-on-surface">Phan Bảo Anh</p>
<p className="text-[11px] text-on-surface-variant">0903•••890 (Hà Nội)</p>
</td>
<td className="py-3.5 px-2 max-w-[180px]">
<p className="font-medium text-on-surface truncate">Sức Mạnh Của Thói Quen</p>
<span className="text-[11px] text-on-surface-variant">Combo kép tiết kiệm 20%</span>
</td>
<td className="py-3.5 px-2">
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-sm text-[11px] bg-secondary-fixed text-on-secondary-fixed font-semibold">
<span className="material-symbols-outlined text-[12px]">layers</span>
                        Sách + Ebook
                      </span>
</td>
<td className="py-3.5 px-2">
<p className="font-bold text-primary font-mono">215.000đ</p>
<span className="font-label-sm text-[10px] text-tertiary">Đã TT (Thẻ VISA)</span>
</td>
<td className="py-3.5 px-2">
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-label-sm text-[10px] bg-tertiary/10 text-tertiary font-semibold">
                        Ebook: Đã cấp · Sách: Đang giao
                      </span>
</td>
<td className="py-3.5 px-2 text-on-surface-variant text-[12px]">1 giờ trước</td>
<td className="py-3.5 px-2 text-right">
<button className="px-2.5 py-1 rounded-md bg-surface-container-lowest border border-surface-variant text-on-surface font-label-md text-label-md font-semibold hover:text-tertiary transition-colors">
                        Theo dõi
                      </button>
</td>
</tr>
</tbody>
</table>
</div>

<div className="mt-4 pt-3 border-t border-surface-variant/60 flex items-center justify-between text-label-md font-label-md">
<span className="text-on-surface-variant">Hiển thị 4 trong tổng số 187 đơn hàng</span>
<Link className="text-tertiary font-semibold flex items-center gap-1 hover:underline" to="/seller/product/edit-hybrid">
                Xem tất cả 187 đơn hàng <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
</Link>
</div>
</div>
</div>

<div className="lg:col-span-4 space-y-6">

<div className="bg-surface-container-lowest border border-surface-variant rounded-2xl p-5 shadow-sm">
<div className="flex items-center justify-between pb-3 border-b border-surface-variant/60">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-[20px] text-secondary">inventory_2</span>
<h3 className="font-title-lg text-title-lg text-on-surface font-semibold">Cảnh Báo Tồn Kho</h3>
</div>
<span className="px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-secondary-fixed text-on-secondary-fixed font-bold">5 tựa sách</span>
</div>
<p className="font-body-sm text-body-sm text-on-surface-variant mt-2 mb-3">Các đầu sách bán chạy chạm ngưỡng an toàn, hãy nhập thêm kho để tránh hủy đơn.</p>
<div className="space-y-3">

<div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low/50 hover:bg-surface-container-low transition-colors">
<div className="flex items-center gap-2.5 overflow-hidden">
<div className="w-8 h-11 bg-surface-container-high rounded shrink-0 paper-edge flex items-center justify-center font-bold text-xs text-on-surface-variant border border-surface-variant">
                    AH
                  </div>
<div className="truncate">
<p className="font-title-md text-[13px] font-semibold text-on-surface truncate">Atomic Habits</p>
<p className="font-label-sm text-[11px] text-on-surface-variant">Mức tối thiểu: 10 bản</p>
</div>
</div>
<div className="text-right shrink-0">
<span className="px-2 py-0.5 rounded font-label-sm text-label-sm bg-secondary-fixed text-on-secondary-fixed-variant font-bold">Còn 4 cuốn</span>
</div>
</div>

<div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low/50 hover:bg-surface-container-low transition-colors">
<div className="flex items-center gap-2.5 overflow-hidden">
<div className="w-8 h-11 bg-surface-container-high rounded shrink-0 paper-edge flex items-center justify-center font-bold text-xs text-on-surface-variant border border-surface-variant">
                    NGK
                  </div>
<div className="truncate">
<p className="font-title-md text-[13px] font-semibold text-on-surface truncate">Nhà Giả Kim (Bản in đặc biệt)</p>
<p className="font-label-sm text-[11px] text-on-surface-variant">Mức tối thiểu: 8 bản</p>
</div>
</div>
<div className="text-right shrink-0">
<span className="px-2 py-0.5 rounded font-label-sm text-label-sm bg-secondary-fixed text-on-secondary-fixed-variant font-bold">Còn 3 cuốn</span>
</div>
</div>

<div className="flex items-center justify-between p-2.5 rounded-xl bg-error-container/30 border border-error/20">
<div className="flex items-center gap-2.5 overflow-hidden">
<div className="w-8 h-11 bg-error-container rounded shrink-0 flex items-center justify-center font-bold text-xs text-on-error-container">
                    CC
                  </div>
<div className="truncate">
<p className="font-title-md text-[13px] font-semibold text-on-surface truncate">Clean Code (Bản dịch chuẩn)</p>
<p className="font-label-sm text-[11px] text-error">Đang mất doanh thu đơn giấy</p>
</div>
</div>
<div className="text-right shrink-0">
<span className="px-2 py-0.5 rounded font-label-sm text-label-sm bg-error text-on-error font-bold">Hết hàng (0)</span>
</div>
</div>

<div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low/50 hover:bg-surface-container-low transition-colors">
<div className="flex items-center gap-2.5 overflow-hidden">
<div className="w-8 h-11 bg-surface-container-high rounded shrink-0 paper-edge flex items-center justify-center font-bold text-xs text-on-surface-variant border border-surface-variant">
                    4H
                  </div>
<div className="truncate">
<p className="font-title-md text-[13px] font-semibold text-on-surface truncate">Tuần Làm Việc 4 Giờ</p>
<p className="font-label-sm text-[11px] text-on-surface-variant">Mức tối thiểu: 10 bản</p>
</div>
</div>
<div className="text-right shrink-0">
<span className="px-2 py-0.5 rounded font-label-sm text-label-sm bg-secondary-fixed text-on-secondary-fixed-variant font-bold">Còn 6 cuốn</span>
</div>
</div>
</div>
<Link className="mt-4 block text-center py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md font-semibold transition-colors border border-surface-variant" to="/seller/product/create-physical">
              Xem Kho Hàng &amp; Tạo Lệnh Nhập →
            </Link>
</div>

<div className="bg-surface-container-lowest border border-tertiary/20 rounded-2xl p-5 shadow-sm relative overflow-hidden">
<div className="absolute -right-6 -bottom-6 w-28 h-28 bg-tertiary/5 rounded-full pointer-events-none"></div>
<div className="flex items-center justify-between pb-3 border-b border-surface-variant/60">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-[20px] text-tertiary">verified_user</span>
<h3 className="font-title-lg text-title-lg text-on-surface font-semibold">Bản Quyền Số DRM</h3>
</div>
<span className="font-label-sm text-label-sm text-tertiary font-bold">32 Ebook Đang Bán</span>
</div>
<div className="mt-3 space-y-3">
<div className="p-3 rounded-xl bg-surface-container-low/80 border border-surface-variant text-left">
<div className="flex items-start gap-2">
<span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">error</span>
<div>
<p className="font-title-md text-[13px] font-semibold text-on-surface leading-tight">Clean Code (Bản EPUB)</p>
<p className="font-body-sm text-[12px] text-on-surface-variant mt-0.5">Chưa hoàn tất định dạng đọc chuẩn trên ứng dụng HUKI Reader mobile.</p>
<button className="mt-2 text-primary font-label-sm text-label-sm font-bold hover:underline flex items-center gap-0.5">
                      Kiểm tra file &amp; tải lại <span className="material-symbols-outlined text-[13px]">chevron_right</span>
</button>
</div>
</div>
</div>
<div className="p-3 rounded-xl bg-surface-container-low/80 border border-surface-variant text-left">
<div className="flex items-start gap-2">
<span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">hourglass_top</span>
<div>
<p className="font-title-md text-[13px] font-semibold text-on-surface leading-tight">Dẫn Dắt Sự Thay Đổi</p>
<p className="font-body-sm text-[12px] text-on-surface-variant mt-0.5">Hệ thống đang mã hóa chứng chỉ DRM và watermarking chống sao chép trái phép.</p>
<span className="inline-block mt-1 font-label-sm text-[11px] text-secondary font-semibold">Đang xử lý (80%)</span>
</div>
</div>
</div>
</div>
<Link className="mt-4 block text-center py-2 rounded-lg bg-tertiary/10 hover:bg-tertiary/20 text-tertiary font-label-md text-label-md font-semibold transition-colors" to="/seller/product/create-ebook">
              Quản Lý Danh Mục Ebook &amp; Bản Quyền →
            </Link>
</div>

<div className="bg-surface-container-lowest border border-surface-variant rounded-2xl p-5 shadow-sm">
<div className="flex items-center justify-between pb-3 border-b border-surface-variant/60">
<h3 className="font-title-lg text-title-lg text-on-surface font-semibold">Top Sách Bán Chạy</h3>
<span className="font-label-sm text-label-sm text-on-surface-variant">7 ngày qua</span>
</div>
<div className="mt-3 space-y-3">

<div className="flex items-center justify-between">
<div className="flex items-center gap-2.5">
<span className="w-5 h-5 rounded-full bg-secondary-container text-on-secondary-container text-xs font-bold flex items-center justify-center shrink-0">1</span>
<div>
<p className="font-title-md text-[13px] font-semibold text-on-surface">Atomic Habits</p>
<span className="font-label-sm text-[11px] text-tertiary">Combo Sách + Ebook</span>
</div>
</div>
<div className="text-right">
<p className="font-title-md text-[13px] font-bold text-on-surface">42 bản</p>
<p className="font-label-sm text-[11px] text-on-surface-variant font-mono">4.860.000đ</p>
</div>
</div>

<div className="flex items-center justify-between">
<div className="flex items-center gap-2.5">
<span className="w-5 h-5 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-bold flex items-center justify-center shrink-0">2</span>
<div>
<p className="font-title-md text-[13px] font-semibold text-on-surface">Deep Work</p>
<span className="font-label-sm text-[11px] text-primary">Ebook DRM bản quyền</span>
</div>
</div>
<div className="text-right">
<p className="font-title-md text-[13px] font-bold text-on-surface">31 bản</p>
<p className="font-label-sm text-[11px] text-on-surface-variant font-mono">2.449.000đ</p>
</div>
</div>

<div className="flex items-center justify-between">
<div className="flex items-center gap-2.5">
<span className="w-5 h-5 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-bold flex items-center justify-center shrink-0">3</span>
<div>
<p className="font-title-md text-[13px] font-semibold text-on-surface">Tâm Lý Học Về Tiền</p>
<span className="font-label-sm text-[11px] text-on-surface-variant">Sách giấy bìa mềm</span>
</div>
</div>
<div className="text-right">
<p className="font-title-md text-[13px] font-bold text-on-surface">27 bản</p>
<p className="font-label-sm text-[11px] text-on-surface-variant font-mono">4.023.000đ</p>
</div>
</div>
</div>
</div>

<div className="bg-surface-container-lowest border border-surface-variant rounded-2xl p-5 shadow-sm">
<h3 className="font-title-lg text-title-lg text-on-surface font-semibold pb-3 border-b border-surface-variant/60">Hoạt Động Gần Đây</h3>
<div className="mt-4 space-y-3 relative pl-4 border-l-2 border-surface-variant font-body-sm text-[12px]">

<div className="relative">
<span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-tertiary ring-4 ring-surface-container-lowest"></span>
<span className="font-mono text-[11px] text-on-surface-variant">10:42</span>
<p className="text-on-surface font-medium mt-0.5">Đơn hàng <span className="font-mono font-bold">#HK24090125</span> thanh toán thành công qua VNPay.</p>
</div>

<div className="relative">
<span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-secondary ring-4 ring-surface-container-lowest"></span>
<span className="font-mono text-[11px] text-on-surface-variant">10:31</span>
<p className="text-on-surface font-medium mt-0.5">Tồn kho <span className="font-semibold">Atomic Habits</span> giảm xuống mức cảnh báo (4 cuốn).</p>
</div>

<div className="relative">
<span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-tertiary-container ring-4 ring-surface-container-lowest"></span>
<span className="font-mono text-[11px] text-on-surface-variant">10:18</span>
<p className="text-on-surface font-medium mt-0.5">Ebook <span className="font-semibold">Deep Work</span> tự động cấp quyền vào Tủ Sách độc giả Thu Hà.</p>
</div>

<div className="relative">
<span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-on-surface-variant ring-4 ring-surface-container-lowest"></span>
<span className="font-mono text-[11px] text-on-surface-variant">09:55</span>
<p className="text-on-surface font-medium mt-0.5">Sách mới <span className="font-semibold">Tư Duy Phản Biện</span> được ban biên tập HUKI duyệt bán.</p>
</div>
</div>
</div>
</div>
</div>

      </main>
    </div>
  );
}
