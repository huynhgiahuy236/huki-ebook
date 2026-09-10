import React from 'react';
import { Link } from 'react-router-dom';

export default function SellerOrdersPage() {
  return (
    <div className="w-full bg-background text-on-surface font-body-md text-body-md antialiased min-h-screen py-6">
      <main className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-space-sm pb-1">
<div>
<h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-medium">Quản Lý Đơn Hàng</h1>
<p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
            Theo dõi, xử lý và phân loại thực hiện đơn hàng cho <strong className="text-on-surface font-semibold">Alpha Books Official</strong>.
          </p>
</div>
<div className="flex items-center gap-space-xs">
<button className="flex items-center gap-space-xs px-space-md py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface font-title-md text-body-sm font-medium hover:border-on-surface transition-all shadow-xs">
<span className="material-symbols-outlined text-[18px] text-on-surface-variant" data-icon="file_download">file_download</span>
<span>Xuất Excel / CSV</span>
</button>
<button className="flex items-center gap-space-xs px-space-md py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface font-title-md text-body-sm font-medium hover:border-on-surface transition-all shadow-xs">
<span className="material-symbols-outlined text-[18px] text-on-surface-variant" data-icon="tune">tune</span>
<span>Bộ Lọc Nâng Cao</span>
</button>
</div>
</div>

<div className="grid grid-cols-2 md:grid-cols-5 gap-space-sm">

<div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-space-md flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
<div className="absolute top-0 left-0 right-0 h-1 bg-secondary-container"></div>
<div className="flex items-center justify-between text-on-surface-variant">
<span className="font-label-md text-label-md font-semibold">Chờ xác nhận</span>
<span className="material-symbols-outlined text-[20px] text-secondary" data-icon="hourglass_top">hourglass_top</span>
</div>
<div className="mt-2 flex items-baseline gap-2">
<span className="font-headline-lg text-headline-lg font-bold text-secondary">12</span>
<span className="font-label-sm text-[11px] text-secondary font-medium">Cần duyệt ngay</span>
</div>
</div>

<div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-space-md flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
<div className="absolute top-0 left-0 right-0 h-1 bg-primary"></div>
<div className="flex items-center justify-between text-on-surface-variant">
<span className="font-label-md text-label-md font-semibold">Đang chuẩn bị kho</span>
<span className="material-symbols-outlined text-[20px] text-primary" data-icon="inventory">inventory</span>
</div>
<div className="mt-2 flex items-baseline gap-2">
<span className="font-headline-lg text-headline-lg font-bold text-on-surface">8</span>
<span className="font-label-sm text-[11px] text-primary font-medium">Bàn giao &lt; 16:00</span>
</div>
</div>

<div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-space-md flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
<div className="absolute top-0 left-0 right-0 h-1 bg-outline"></div>
<div className="flex items-center justify-between text-on-surface-variant">
<span className="font-label-md text-label-md font-semibold">Đang luân chuyển</span>
<span className="material-symbols-outlined text-[20px] text-outline" data-icon="local_shipping">local_shipping</span>
</div>
<div className="mt-2 flex items-baseline gap-2">
<span className="font-headline-lg text-headline-lg font-bold text-on-surface">21</span>
<span className="font-label-sm text-[11px] text-on-surface-variant">GHTK &amp; Viettel</span>
</div>
</div>

<div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-space-md flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
<div className="absolute top-0 left-0 right-0 h-1 bg-tertiary"></div>
<div className="flex items-center justify-between text-on-surface-variant">
<span className="font-label-md text-label-md font-semibold">Giao &amp; DRM Hoàn tất</span>
<span className="material-symbols-outlined text-[20px] text-tertiary" data-icon="task_alt">task_alt</span>
</div>
<div className="mt-2 flex items-baseline gap-2">
<span className="font-headline-lg text-headline-lg font-bold text-tertiary">156</span>
<span className="font-label-sm text-[11px] text-tertiary font-medium">Tháng này (98.2%)</span>
</div>
</div>

<div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-space-md flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
<div className="absolute top-0 left-0 right-0 h-1 bg-error"></div>
<div className="flex items-center justify-between text-on-surface-variant">
<span className="font-label-md text-label-md font-semibold">Cần xử lý hoàn tiền</span>
<span className="material-symbols-outlined text-[20px] text-error" data-icon="error_outline">error_outline</span>
</div>
<div className="mt-2 flex items-baseline gap-2">
<span className="font-headline-lg text-headline-lg font-bold text-error">4</span>
<span className="font-label-sm text-[11px] text-error font-medium">Thu hồi bản quyền</span>
</div>
</div>
</div>

<div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xs overflow-hidden">

<div className="flex items-center gap-space-xs px-space-md pt-2 border-b border-outline-variant overflow-x-auto">
<button className="px-space-md py-3 font-title-md text-body-sm font-semibold border-b-2 border-primary text-primary flex items-center gap-1.5 whitespace-nowrap">
<span>Tất Cả</span>
<span className="text-xs px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-bold">201</span>
</button>
<button className="px-space-md py-3 font-title-md text-body-sm font-medium border-b-2 border-transparent text-on-surface-variant hover:text-on-surface flex items-center gap-1.5 transition-colors whitespace-nowrap">
<span>Chờ Xác Nhận</span>
<span className="text-xs px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-bold">12</span>
</button>
<button className="px-space-md py-3 font-title-md text-body-sm font-medium border-b-2 border-transparent text-on-surface-variant hover:text-on-surface flex items-center gap-1.5 transition-colors whitespace-nowrap">
<span>Đang Chuẩn Bị</span>
<span className="text-xs px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant font-medium">8</span>
</button>
<button className="px-space-md py-3 font-title-md text-body-sm font-medium border-b-2 border-transparent text-on-surface-variant hover:text-on-surface flex items-center gap-1.5 transition-colors whitespace-nowrap">
<span>Chờ Lấy Hàng</span>
<span className="text-xs px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant font-medium">5</span>
</button>
<button className="px-space-md py-3 font-title-md text-body-sm font-medium border-b-2 border-transparent text-on-surface-variant hover:text-on-surface flex items-center gap-1.5 transition-colors whitespace-nowrap">
<span>Đang Giao</span>
<span className="text-xs px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant font-medium">16</span>
</button>
<button className="px-space-md py-3 font-title-md text-body-sm font-medium border-b-2 border-transparent text-on-surface-variant hover:text-on-surface flex items-center gap-1.5 transition-colors whitespace-nowrap">
<span>Hoàn Tất</span>
<span className="text-xs px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant font-medium">156</span>
</button>
<button className="px-space-md py-3 font-title-md text-body-sm font-medium border-b-2 border-transparent text-on-surface-variant hover:text-error flex items-center gap-1.5 transition-colors whitespace-nowrap">
<span>Hủy &amp; Hoàn Tiền</span>
<span className="text-xs px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-medium">4</span>
</button>
</div>

<div className="p-space-md flex flex-wrap items-center justify-between gap-space-sm bg-surface-container-low/40">
<div className="flex flex-wrap items-center gap-space-xs flex-1">

<div className="relative min-w-[340px]">
<span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]" data-icon="search">search</span>
<input className="w-full pl-9 pr-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="Tìm theo mã đơn #HK..., tên người nhận, SĐT, tựa sách..." type="text" />
</div>

<div className="relative">
<select className="appearance-none bg-surface-container-lowest border border-outline-variant text-on-surface rounded-lg pl-3 pr-8 py-2 text-body-sm cursor-pointer hover:border-on-surface focus:outline-none focus:border-primary">
<option>Tất cả định dạng</option>
<option>Sách Giấy Vật Lý</option>
<option>Ebook DRM Kỹ Thuật Số</option>
<option>Combo Hybrid (Giấy + Ebook)</option>
</select>
<span className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-outline" data-icon="expand_more">expand_more</span>
</div>

<div className="relative">
<select className="appearance-none bg-surface-container-lowest border border-outline-variant text-on-surface rounded-lg pl-3 pr-8 py-2 text-body-sm cursor-pointer hover:border-on-surface focus:outline-none focus:border-primary">
<option>Tất cả thanh toán</option>
<option>Đã thanh toán (PayOS / VNPay / Thẻ)</option>
<option>COD (Thu hộ khi nhận)</option>
<option>Đã hoàn tiền</option>
</select>
<span className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-outline" data-icon="expand_more">expand_more</span>
</div>

<div className="relative">
<select className="appearance-none bg-surface-container-lowest border border-outline-variant text-on-surface rounded-lg pl-3 pr-8 py-2 text-body-sm cursor-pointer hover:border-on-surface focus:outline-none focus:border-primary">
<option>Đơn vị vận chuyển</option>
<option>Giao Hàng Tiết Kiệm (GHTK)</option>
<option>Viettel Post Express</option>
<option>Cấp quyền số (Ebook Không Giao)</option>
</select>
<span className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-outline" data-icon="expand_more">expand_more</span>
</div>

<div className="relative">
<select className="appearance-none bg-surface-container-lowest border border-outline-variant text-on-surface rounded-lg pl-3 pr-8 py-2 text-body-sm cursor-pointer hover:border-on-surface focus:outline-none focus:border-primary">
<option>7 ngày gần nhất (01/09 - 07/09)</option>
<option>Hôm nay (07/09)</option>
<option>Tháng này (Tháng 9/2025)</option>
<option>Tùy chọn khoảng ngày...</option>
</select>
<span className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-outline" data-icon="calendar_today">calendar_today</span>
</div>
</div>
<button className="px-3 py-2 rounded-lg text-on-surface-variant hover:text-primary text-body-sm flex items-center gap-1 font-medium transition-colors" title="Đặt lại bộ lọc">
<span className="material-symbols-outlined text-[18px]" data-icon="restart_alt">restart_alt</span>
<span>Đặt lại</span>
</button>
</div>

<div className="px-space-md py-2.5 bg-primary-fixed/40 border-t border-primary/20 flex items-center justify-between">
<div className="flex items-center gap-space-xs text-on-primary-fixed">
<span className="material-symbols-outlined text-[20px] text-primary fill-icon" data-icon="check_circle">check_circle</span>
<span className="font-title-md text-body-sm font-semibold">Đã chọn 3 đơn hàng của Alpha Books</span>
</div>
<div className="flex items-center gap-space-xs">
<button className="px-3 py-1.5 bg-primary hover:bg-primary-container text-on-primary rounded-lg text-body-sm font-medium transition-colors flex items-center gap-1 shadow-xs">
<span className="material-symbols-outlined text-[16px]" data-icon="task">task</span>
<span>Xác nhận hàng loạt</span>
</button>
<button className="px-3 py-1.5 bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container rounded-lg text-body-sm font-medium transition-colors flex items-center gap-1 shadow-xs">
<span className="material-symbols-outlined text-[16px]" data-icon="print">print</span>
<span>In phiếu đóng gói &amp; nhãn</span>
</button>
<button className="px-3 py-1.5 bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container rounded-lg text-body-sm font-medium transition-colors flex items-center gap-1 shadow-xs">
<span className="material-symbols-outlined text-[16px]" data-icon="download">download</span>
<span>Xuất đơn đã chọn</span>
</button>
</div>
</div>

<div className="overflow-x-auto">
<table className="w-full text-left border-collapse">
<thead>
<tr className="border-b border-outline-variant bg-surface-container-low text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">
<th className="py-3.5 pl-space-md pr-2 w-10">
<input defaultChecked className="w-4 h-4 rounded border-outline text-primary focus:ring-primary" type="checkbox" />
</th>
<th className="py-3.5 px-3">Mã Đơn Hàng</th>
<th className="py-3.5 px-3 min-w-[160px]">Khách Hàng</th>
<th className="py-3.5 px-3 min-w-[280px]">Chi Tiết Sản Phẩm</th>
<th className="py-3.5 px-3">Định Dạng</th>
<th className="py-3.5 px-3 text-right">Tổng Tiền (NXB)</th>
<th className="py-3.5 px-3">Thanh Toán</th>
<th className="py-3.5 px-3 min-w-[160px]">Vận Chuyển</th>
<th className="py-3.5 px-3 min-w-[180px]">Trạng Thái Vận Hành</th>
<th className="py-3.5 pr-space-md pl-3 text-right">Thao Tác</th>
</tr>
</thead>
<tbody className="divide-y divide-outline-variant text-body-sm">

<tr className="hover:bg-surface-container-low/60 transition-colors bg-surface-container-lowest">
<td className="py-4 pl-space-md pr-2">
<input defaultChecked className="w-4 h-4 rounded border-outline text-primary focus:ring-primary" type="checkbox" />
</td>
<td className="py-4 px-3 align-top">
<span className="font-title-md text-primary font-bold block">#HK24090125</span>
<span className="font-label-sm text-[11px] text-on-surface-variant block mt-0.5">Sub-order Alpha Books</span>
<span className="text-[11px] text-outline">07/09/2025 14:22</span>
</td>
<td className="py-4 px-3 align-top">
<div className="font-semibold text-on-surface">Nguyễn Minh</div>
<div className="text-[12px] text-on-surface-variant">090***1234</div>
<div className="text-[11px] text-outline truncate max-w-[160px]" title="P. Bến Nghé, Quận 1, TP. Hồ Chí Minh">Q.1, TP. Hồ Chí Minh</div>
</td>
<td className="py-4 px-3 align-top">
<div className="flex items-start gap-space-xs">
<div className="w-10 h-14 bg-surface-container rounded shrink-0 overflow-hidden spine-shadow border border-outline-variant">
<img className="w-full h-full object-cover" alt="Bìa sách Atomic Habits Thay Đổi Tí Hon phong cách tối giản màu trắng ngà và chữ đen, minh họa vòng tròn thói quen bằng chấm đỏ son tinh tế trên nền bìa giấy mỹ thuật." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDW4i-vJnUGxBHdoa-lURmvMIWrZ4jgwdI4F7kNnKyHsGmGvsvsG6gRhsuTXU92dJZSiBdETahoPJY7XhN9dUtBbB-p_jTGcAa7UNS01z0E_EP-pUQHX5M6XXcM2rcMAr_zEjIX68dp7lSVHe3jEFVU8CQ8b_kfPJ7hwY_c7GFqnVskWmNU-wP_AnIHCEee4rr3fpQz9TLFkPQbUPdT11ljnGSl4V7N62L_OJIq2qnrtheCpLRTHzXbyA" />
</div>
<div className="space-y-0.5 min-w-0">
<p className="font-medium text-on-surface truncate max-w-[240px]" title="Atomic Habits - Thay Đổi Tí Hon">Atomic Habits - Thay Đổi Tí Hon <span className="text-on-surface-variant font-normal">x1</span></p>
<p className="font-medium text-on-surface truncate max-w-[240px]" title="Nhà Giả Kim (Tái bản 2024)">Nhà Giả Kim (Tái bản) <span className="text-on-surface-variant font-normal">x1</span></p>
<p className="text-[11px] text-outline italic">2 sản phẩm vật lý từ kho Q9</p>
</div>
</div>
</td>
<td className="py-4 px-3 align-top">
<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-surface-container-high text-on-surface-variant border border-outline-variant">
                    SÁCH GIẤY
                  </span>
</td>
<td className="py-4 px-3 align-top text-right">
<span className="font-title-md text-body-md font-bold text-primary block">278.000đ</span>
<span className="text-[11px] text-outline">Đã trừ chiết khấu</span>
</td>
<td className="py-4 px-3 align-top">
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-tertiary-fixed text-on-tertiary-fixed-variant">
<span className="material-symbols-outlined text-[14px]" data-icon="check_circle">check_circle</span>
                    PayOS / QR
                  </span>
</td>
<td className="py-4 px-3 align-top">
<div className="font-medium text-on-surface">GHTK Tiêu Chuẩn</div>
<div className="text-[11px] text-secondary font-medium flex items-center gap-1 mt-0.5">
<span className="material-symbols-outlined text-[13px]" data-icon="alarm">alarm</span>
                    Hẹn lấy trước 16:00
                  </div>
</td>
<td className="py-4 px-3 align-top">
<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-secondary-fixed text-on-secondary-fixed-variant border border-secondary-container">
<span className="w-1.5 h-1.5 rounded-full bg-secondary animate-ping"></span>
                    Chờ xác nhận
                  </span>
</td>
<td className="py-4 pr-space-md pl-3 align-top text-right space-y-1">
<button className="w-full px-3 py-1.5 bg-primary hover:bg-primary-container text-on-primary rounded-lg text-body-sm font-semibold transition-colors shadow-xs">
                    Xác Nhận Đơn
                  </button>
<div className="flex items-center justify-end gap-1">
<button className="p-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors" title="Xem chi tiết">
<span className="material-symbols-outlined text-[18px]" data-icon="visibility">visibility</span>
</button>
<button className="p-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors" title="In phiếu đóng gói">
<span className="material-symbols-outlined text-[18px]" data-icon="print">print</span>
</button>
</div>
</td>
</tr>

<tr className="hover:bg-surface-container-low/60 transition-colors bg-surface-container-lowest/50">
<td className="py-4 pl-space-md pr-2">
<input defaultChecked className="w-4 h-4 rounded border-outline text-primary focus:ring-primary" type="checkbox" />
</td>
<td className="py-4 px-3 align-top">
<span className="font-title-md text-primary font-bold block">#HK24090124</span>
<span className="font-label-sm text-[11px] text-on-surface-variant block mt-0.5">Sub-order Alpha Books</span>
<span className="text-[11px] text-outline">07/09/2025 14:05</span>
</td>
<td className="py-4 px-3 align-top">
<div className="font-semibold text-on-surface">Trần Thu Hà</div>
<div className="text-[12px] text-on-surface-variant truncate max-w-[150px]">ha.tran***@email.com</div>
<div className="text-[11px] text-tertiary flex items-center gap-0.5 mt-0.5">
<span className="material-symbols-outlined text-[13px]" data-icon="devices">devices</span>
                    HUKI App iOS &amp; Android
                  </div>
</td>
<td className="py-4 px-3 align-top">
<div className="flex items-start gap-space-xs">
<div className="w-10 h-14 bg-surface-container rounded shrink-0 overflow-hidden spine-shadow border border-outline-variant">
<img className="w-full h-full object-cover" alt="Bìa sách Deep Work Làm Ra Làm Chơi Ra Chơi của tác giả Cal Newport với tông màu xanh dương đậm thanh lịch, đồ họa trừu tượng hình đồng hồ cát và ánh sáng tập trung." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAc09dIUD6mKgiOrP8HLNNfCESJ49XlClpWmn7vmpDQuPP7nB1vRTT2LGAEgSUzosKpgSJFQtxCFhD5BVMtnMKHQlSJg57sww1Fi30k_nGkjE9sutIO3VPCokvmpx3PSpK8Y-EIsqi1ET_KoygwNeHpKQlY2YInp1xjd9LbWBTFcQZBcNYlb9oAIB7QVeu_WrZQFKWWEfHQU2P2sJ3uI4v0UFaltlIbsv4kvKtWodx4t3tC53GMEpIv_g" />
</div>
<div className="space-y-0.5 min-w-0">
<p className="font-medium text-on-surface truncate max-w-[240px]" title="Deep Work - Làm Ra Làm Chơi Ra Chơi">Deep Work - Làm Ra Làm Chơi Ra Chơi</p>
<div className="flex items-center gap-1.5">
<span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-tertiary-fixed text-on-tertiary-fixed-variant">DRM V3</span>
<span className="text-[11px] text-outline">SKU: EB-AL-9902</span>
</div>
</div>
</div>
</td>
<td className="py-4 px-3 align-top">
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-tertiary-fixed text-on-tertiary-fixed-variant border border-tertiary-container/30">
<span className="material-symbols-outlined text-[13px]" data-icon="menu_book">menu_book</span>
                    EBOOK SỐ
                  </span>
</td>
<td className="py-4 px-3 align-top text-right">
<span className="font-title-md text-body-md font-bold text-primary block">79.000đ</span>
<span className="text-[11px] text-outline">Không phí ship</span>
</td>
<td className="py-4 px-3 align-top">
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-tertiary-fixed text-on-tertiary-fixed-variant">
<span className="material-symbols-outlined text-[14px]" data-icon="credit_card">credit_card</span>
                    Visa/Mastercard
                  </span>
</td>
<td className="py-4 px-3 align-top">
<span className="text-on-surface-variant font-medium">—</span>
<div className="text-[11px] text-outline">Cấp quyền số tự động</div>
</td>
<td className="py-4 px-3 align-top">
<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-tertiary-fixed text-on-tertiary-fixed-variant">
<span className="material-symbols-outlined text-[14px] text-tertiary" data-icon="cloud_done">cloud_done</span>
                    Đã cấp quyền Tủ Sách
                  </span>
<span className="text-[10px] text-outline block mt-1">Không cần giao vật lý</span>
</td>
<td className="py-4 pr-space-md pl-3 align-top text-right space-y-1">
<button className="w-full px-3 py-1.5 bg-surface-container border border-outline-variant hover:border-primary text-on-surface rounded-lg text-body-sm font-medium transition-colors">
                    Xem Chi Tiết
                  </button>
<button className="w-full px-2 py-1 text-tertiary hover:underline text-[12px] font-medium block text-right">
                    Kiểm tra DRM &gt;
                  </button>
</td>
</tr>

<tr className="hover:bg-surface-container-low/60 transition-colors bg-surface-container-lowest">
<td className="py-4 pl-space-md pr-2">
<input defaultChecked className="w-4 h-4 rounded border-outline text-primary focus:ring-primary" type="checkbox" />
</td>
<td className="py-4 px-3 align-top">
<span className="font-title-md text-primary font-bold block">#HK24090123</span>
<span className="font-label-sm text-[11px] text-on-surface-variant block mt-0.5">Sub-order Alpha Books</span>
<span className="text-[11px] text-outline">07/09/2025 13:40</span>
</td>
<td className="py-4 px-3 align-top">
<div className="font-semibold text-on-surface">Lê Hoàng</div>
<div className="text-[12px] text-on-surface-variant">098***5678</div>
<div className="text-[11px] text-outline truncate max-w-[160px]" title="P. Ô Chợ Dừa, Q. Đống Đa, TP. Hà Nội">Đống Đa, Hà Nội</div>
</td>
<td className="py-4 px-3 align-top">
<div className="flex items-start gap-space-xs">
<div className="w-10 h-14 bg-surface-container rounded shrink-0 overflow-hidden spine-shadow border border-outline-variant">
<img className="w-full h-full object-cover" alt="Bìa sách Bộ Tâm Lý Học Về Tiền và Tư Duy Nhanh Chậm của Daniel Kahneman với thiết kế đồ họa sang trọng tông màu xanh ô liu và vàng kim cổ điển." src="https://lh3.googleusercontent.com/aida-public/AB6AXuC8Jh0dEXxEkPCrf16DxeTwoeeHlbfuASHJQ7spjk6F1-97jHZIqLAWgQkRXCjP_qedPyTFlGbTbP_TOd6Wknf-I-1BqUF8F9-xs9t7eUWrSjb2stGHklNTKK_GYrq5hBKAlUX-QBXvDpX2p9_o4NaLzW44cEa4gBBVTAAHCxt7f6zJzJjj1BK66z4tEspGg_9UNjiGdNyzsDsIot_Qx5HVquKzTah_SamwTjB2tNFTcBTKaTsYPtstvw" />
</div>
<div className="space-y-0.5 min-w-0">
<p className="font-medium text-on-surface truncate max-w-[240px]" title="Bộ Tâm Lý Học Về Tiền + Tư Duy Nhanh Chậm">Bộ Tâm Lý Học Về Tiền + Tư Duy Nhanh Chậm</p>
<p className="text-[11px] text-outline">Bộ boxset 3 cuốn bìa cứng</p>
</div>
</div>
</td>
<td className="py-4 px-3 align-top">
<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-surface-container-high text-on-surface-variant border border-outline-variant">
                    SÁCH GIẤY
                  </span>
</td>
<td className="py-4 px-3 align-top text-right">
<span className="font-title-md text-body-md font-bold text-primary block">427.000đ</span>
<span className="text-[11px] text-secondary font-medium">Thu hộ COD</span>
</td>
<td className="py-4 px-3 align-top">
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-secondary-fixed text-on-secondary-fixed-variant">
<span className="material-symbols-outlined text-[14px]" data-icon="payments">payments</span>
                    COD (Khi nhận)
                  </span>
</td>
<td className="py-4 px-3 align-top">
<div className="font-medium text-on-surface">Viettel Post Express</div>
<div className="text-[11px] text-outline">Đã tạo mã vận đơn</div>
</td>
<td className="py-4 px-3 align-top">
<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary-fixed text-on-primary-fixed-variant border border-primary/20">
<span className="material-symbols-outlined text-[14px]" data-icon="package_2">package_2</span>
                    Đang đóng gói
                  </span>
<span className="text-[10px] text-outline block mt-1">Chờ dán nhãn vận đơn</span>
</td>
<td className="py-4 pr-space-md pl-3 align-top text-right space-y-1">
<button className="w-full px-2.5 py-1.5 bg-surface-container-lowest border border-outline-variant hover:border-primary text-on-surface rounded-lg text-body-sm font-medium transition-colors flex items-center justify-center gap-1 shadow-xs">
<span className="material-symbols-outlined text-[16px]" data-icon="print">print</span>
<span>In Phiếu Đóng Gói</span>
</button>
<button className="w-full px-2 py-1 text-primary hover:underline text-[12px] font-medium block text-right">
                    Bàn giao vận chuyển &gt;
                  </button>
</td>
</tr>

<tr className="hover:bg-surface-container-low/60 transition-colors bg-surface-container-lowest border-l-4 border-primary">
<td className="py-4 pl-space-md pr-2">
<input className="w-4 h-4 rounded border-outline text-primary focus:ring-primary" type="checkbox" />
</td>
<td className="py-4 px-3 align-top">
<div className="flex items-center gap-1">
<span className="font-title-md text-primary font-bold">#HK24090122</span>
<span className="px-1 py-0.2 rounded text-[9px] font-bold bg-primary text-on-primary uppercase">Kép</span>
</div>
<span className="font-label-sm text-[11px] text-on-surface-variant block mt-0.5">Sub-order Alpha Books</span>
<span className="text-[11px] text-outline">07/09/2025 11:18</span>
</td>
<td className="py-4 px-3 align-top">
<div className="font-semibold text-on-surface">Phạm Gia Hân</div>
<div className="text-[12px] text-on-surface-variant">093***9988</div>
<div className="text-[11px] text-outline truncate max-w-[160px]" title="Q. Hải Châu, TP. Đà Nẵng">Hải Châu, Đà Nẵng</div>
</td>
<td className="py-4 px-3 align-top">
<div className="flex items-start gap-space-xs">
<div className="w-10 h-14 bg-surface-container rounded shrink-0 overflow-hidden spine-shadow border border-outline-variant relative">
<img className="w-full h-full object-cover" alt="Bìa sách đặc quyền combo Atomic Habits phiên bản song hành gồm sách bìa mềm và biểu tượng đọc số trên máy tính bảng mang màu sắc tươi sáng, rực rỡ và chuyên nghiệp." src="https://lh3.googleusercontent.com/aida-public/AB6AXuA5tN486Vdx0VxF62Bv18vGh5iWbLnjuq2x93D6DJsBrdVF0sEMLYWXifzPvIkZFr_7v95dLGajovCMHb_KTZF_aFJzyVA6xNhh2QqvDENf23xm1DTeWrPbbiBvCijwHx0aGN6eNKuNKRsM1P1Jnc63CqR9rzSK2MibeWU-s00RdKcURhhRJDWB1s2wXL4z_vFkgWn98SMcGy2rjGEMUps4GGWFuQhwFlaEZ4ey8qmS4660qOjfzPfcqw" />
<span className="absolute bottom-0 inset-x-0 bg-primary/90 text-on-primary text-[9px] text-center font-bold">HYBRID</span>
</div>
<div className="space-y-0.5 min-w-0">
<p className="font-semibold text-on-surface truncate max-w-[240px]" title="Combo Đặc Quyền: Sách Giấy + Ebook Atomic Habits">Combo: Sách Giấy + Ebook Bản Quyền</p>
<p className="text-[11px] text-on-surface-variant">Độc quyền mở bán Alpha Books</p>
</div>
</div>
</td>
<td className="py-4 px-3 align-top">
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-secondary-fixed text-on-secondary-fixed-variant border border-secondary">
<span className="material-symbols-outlined text-[13px]" data-icon="layers">layers</span>
                    COMBO HYBRID
                  </span>
</td>
<td className="py-4 px-3 align-top text-right">
<span className="font-title-md text-body-md font-bold text-primary block">208.000đ</span>
<span className="text-[11px] text-outline">Trọn gói combo</span>
</td>
<td className="py-4 px-3 align-top">
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-tertiary-fixed text-on-tertiary-fixed-variant">
<span className="material-symbols-outlined text-[14px]" data-icon="qr_code_2">qr_code_2</span>
                    VNPay-QR
                  </span>
</td>
<td className="py-4 px-3 align-top">
<div className="font-medium text-on-surface">GHTK (Sách Giấy)</div>
<div className="text-[11px] text-outline font-mono">GHTK-882910</div>
</td>
<td className="py-4 px-3 align-top">

<div className="bg-surface-container-low p-2 rounded-lg border border-outline-variant space-y-1.5">
<div className="flex items-center gap-1.5 text-[11px] text-tertiary font-semibold">
<span className="material-symbols-outlined text-[14px]" data-icon="check_circle">check_circle</span>
<span>Ebook: Đã kích hoạt DRM</span>
</div>
<div className="flex items-center gap-1.5 text-[11px] text-secondary font-semibold">
<span className="w-2 h-2 rounded-full bg-secondary"></span>
<span>Giấy: Chờ bưu tá lấy</span>
</div>
</div>
</td>
<td className="py-4 pr-space-md pl-3 align-top text-right space-y-1">
<button className="w-full px-2.5 py-1.5 bg-surface-container-lowest border border-outline-variant hover:border-primary text-on-surface rounded-lg text-body-sm font-medium transition-colors shadow-xs">
                    Xem Tiến Độ Kép
                  </button>
<button className="w-full px-2 py-1 text-primary hover:underline text-[12px] font-medium block text-right">
                    In Nhãn GHTK &gt;
                  </button>
</td>
</tr>

<tr className="hover:bg-surface-container-low/60 transition-colors bg-surface-container-lowest">
<td className="py-4 pl-space-md pr-2">
<input className="w-4 h-4 rounded border-outline text-primary focus:ring-primary" type="checkbox" />
</td>
<td className="py-4 px-3 align-top">
<span className="font-title-md text-outline font-bold line-through block">#HK24090118</span>
<span className="font-label-sm text-[11px] text-on-surface-variant block mt-0.5">Sub-order Alpha Books</span>
<span className="text-[11px] text-outline">06/09/2025 09:12</span>
</td>
<td className="py-4 px-3 align-top">
<div className="font-semibold text-on-surface">Võ Minh Tuấn</div>
<div className="text-[12px] text-on-surface-variant">091***4433</div>
<div className="text-[11px] text-outline">Người mua hoàn tiền</div>
</td>
<td className="py-4 px-3 align-top">
<div className="flex items-start gap-space-xs opacity-70">
<div className="w-10 h-14 bg-surface-container rounded shrink-0 overflow-hidden spine-shadow border border-outline-variant">
<img className="w-full h-full object-cover" alt="Bìa sách Clean Code Nghệ Thuật Viết Code Sạch của Robert C Martin với bố cục tối giản chữ màu xám và viền xanh công nghệ cao, sách công nghệ lập trình kinh điển." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAKIswV7GC3rsDvT9W8Fx6vf6AgYglughGnXGrBU-NsSCl_VCDpFdqyd3bCoIJJsJYBNoHJEE6OZOoTVFGWTRbRpwP9kh6RTT1zZEznvmv9RgKDCRZwTIjUzI-I6lsfK9slOdRlAmircP5muNR6WdzCI43179Hs_3csfZDsnYQsGwkxUZKsu3mW2qbgBeCYv8aGkLHVhRQkx-dg-uD9ny5U4ZNK0TJsO_483ZDV_C95IUl_uIc6kTX8Vw" />
</div>
<div className="space-y-0.5 min-w-0">
<p className="font-medium text-on-surface truncate max-w-[240px]" title="Clean Code - Nghệ Thuật Viết Code Sạch (Ebook)">Clean Code - Nghệ Thuật Viết Code Sạch</p>
<p className="text-[11px] text-error font-medium">Bản quyền đã hủy</p>
</div>
</div>
</td>
<td className="py-4 px-3 align-top">
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-surface-container text-on-surface-variant">
                    EBOOK SỐ
                  </span>
</td>
<td className="py-4 px-3 align-top text-right">
<span className="font-title-md text-body-md font-bold text-outline line-through block">109.000đ</span>
<span className="text-[11px] text-error font-semibold">-109.000đ</span>
</td>
<td className="py-4 px-3 align-top">
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-error-container text-on-error-container">
<span className="material-symbols-outlined text-[14px]" data-icon="undo">undo</span>
                    Đã hoàn 100%
                  </span>
</td>
<td className="py-4 px-3 align-top">
<span className="text-on-surface-variant font-medium">—</span>
<div className="text-[11px] text-outline">Thu hồi từ xa</div>
</td>
<td className="py-4 px-3 align-top">
<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-error-container text-on-error-container">
<span className="material-symbols-outlined text-[14px]" data-icon="lock_reset">lock_reset</span>
                    Đã thu hồi DRM
                  </span>
<span className="text-[10px] text-outline block mt-1">Yêu cầu từ CSKH HUKI</span>
</td>
<td className="py-4 pr-space-md pl-3 align-top text-right space-y-1">
<button className="px-2 py-1 text-on-surface-variant hover:text-on-surface text-[12px] font-medium block ml-auto">
                    Xem Nhật Ký Thu Hồi
                  </button>
</td>
</tr>

<tr className="hover:bg-surface-container-low/60 transition-colors bg-surface-container-lowest">
<td className="py-4 pl-space-md pr-2">
<input className="w-4 h-4 rounded border-outline text-primary focus:ring-primary" type="checkbox" />
</td>
<td className="py-4 px-3 align-top">
<span className="font-title-md text-primary font-bold block">#HK24090115</span>
<span className="font-label-sm text-[11px] text-on-surface-variant block mt-0.5">Sub-order Alpha Books</span>
<span className="text-[11px] text-outline">05/09/2025 16:50</span>
</td>
<td className="py-4 px-3 align-top">
<div className="font-semibold text-on-surface">Đặng Phương Nam</div>
<div className="text-[12px] text-on-surface-variant">097***1122</div>
<div className="text-[11px] text-outline truncate max-w-[160px]" title="P. Dịch Vọng, Q. Cầu Giấy, TP. Hà Nội">Cầu Giấy, Hà Nội</div>
</td>
<td className="py-4 px-3 align-top">
<div className="flex items-start gap-space-xs">
<div className="w-10 h-14 bg-surface-container rounded shrink-0 overflow-hidden spine-shadow border border-outline-variant">
<img className="w-full h-full object-cover" alt="Bìa sách Sức Mạnh Của Thói Quen màu vàng tươi sáng, chữ đen nổi bật trên nền giấy in sắc nét, phong cách bìa sách kinh doanh phát triển bản thân nổi tiếng." src="https://lh3.googleusercontent.com/aida-public/AB6AXuA7keA4hzyxqm4PDqixSwI3c2QE-CFJsXHres2YAzA_zKyrRrzrYFmANpmkhtDkwFYwF-HZdSYkxQ6reNuPn0qjjf3SplmG1BfZnBcCTtUHO03w60n-qnhKADDMYkMgdcAceXZWMGwxIU3mtiwXA4i7e4wjbYNMvII0l9a_7r3KcocsJ-hWId9hf3V3NLa1u0Rqn3DoFQ3kR5MZciC78Tre5FyTEgd_3R_Dy5xRNPRe999JCO1KOTnsMw" />
</div>
<div className="space-y-0.5 min-w-0">
<p className="font-medium text-on-surface truncate max-w-[240px]" title="Sức Mạnh Của Thói Quen (Tái bản)">Sức Mạnh Của Thói Quen <span className="text-on-surface-variant font-normal">x2</span></p>
<p className="text-[11px] text-outline">Bìa mềm chuẩn NXB</p>
</div>
</div>
</td>
<td className="py-4 px-3 align-top">
<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-surface-container-high text-on-surface-variant border border-outline-variant">
                    SÁCH GIẤY
                  </span>
</td>
<td className="py-4 px-3 align-top text-right">
<span className="font-title-md text-body-md font-bold text-primary block">196.000đ</span>
<span className="text-[11px] text-outline">Đã thanh toán</span>
</td>
<td className="py-4 px-3 align-top">
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-tertiary-fixed text-on-tertiary-fixed-variant">
<span className="material-symbols-outlined text-[14px]" data-icon="check_circle">check_circle</span>
                    PayOS
                  </span>
</td>
<td className="py-4 px-3 align-top">
<div className="font-medium text-on-surface">GHTK Giao Nhanh</div>
<div className="text-[11px] text-outline font-mono">GHTK-771822</div>
</td>
<td className="py-4 px-3 align-top">
<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-surface-container-highest text-on-surface-variant border border-outline-variant">
<span className="material-symbols-outlined text-[14px] text-outline" data-icon="local_shipping">local_shipping</span>
                    Đang giao hàng
                  </span>
<span className="text-[10px] text-outline block mt-1">Dự kiến phát 08/09</span>
</td>
<td className="py-4 pr-space-md pl-3 align-top text-right space-y-1">
<button className="w-full px-2.5 py-1.5 bg-surface-container-lowest border border-outline-variant hover:border-primary text-on-surface rounded-lg text-body-sm font-medium transition-colors shadow-xs">
                    Theo Dõi Vận Đơn
                  </button>
<button className="w-full px-2 py-1 text-on-surface-variant hover:text-on-surface text-[12px] font-medium block text-right">
                    Xem chi tiết &gt;
                  </button>
</td>
</tr>
</tbody>
</table>
</div>

<div className="px-space-md py-3.5 bg-surface-container-low/40 border-t border-outline-variant flex flex-col sm:flex-row items-center justify-between gap-space-sm">
<div className="text-body-sm text-on-surface-variant">
            Hiển thị <span className="font-semibold text-on-surface">1 - 6</span> trên tổng số <span className="font-semibold text-on-surface">201</span> đơn hàng của <strong className="text-on-surface">Alpha Books Official</strong>
</div>

<div className="flex items-center gap-1">
<button className="p-1.5 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed" disabled="">
<span className="material-symbols-outlined text-[18px]" data-icon="chevron_left">chevron_left</span>
</button>
<button className="w-8 h-8 rounded-lg bg-primary text-on-primary font-semibold text-body-sm shadow-xs">1</button>
<button className="w-8 h-8 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container font-medium text-body-sm transition-colors">2</button>
<button className="w-8 h-8 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container font-medium text-body-sm transition-colors">3</button>
<span className="px-1 text-outline">...</span>
<button className="w-8 h-8 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container font-medium text-body-sm transition-colors">11</button>
<button className="p-1.5 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container transition-colors">
<span className="material-symbols-outlined text-[18px]" data-icon="chevron_right">chevron_right</span>
</button>
</div>
</div>
</div>

<div className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/80 flex items-start gap-space-sm text-on-surface-variant">
<span className="material-symbols-outlined text-primary text-[22px] shrink-0 mt-0.5" data-icon="security">security</span>
<div className="text-body-sm space-y-0.5">
<p className="font-semibold text-on-surface">Chính Sách Bảo Mật &amp; Phân Tách Đơn Hàng Nhiều Gian Hàng (HUKI Multi-Vendor Policy)</p>
<p className="text-on-surface-variant">
            Mỗi đối tác chỉ quản lý phần đơn hàng (Sub-order) thuộc phạm vi gian hàng của mình. Với các đơn mua gộp giỏ hàng đa nhà xuất bản, hệ thống HUKI tự động tách vận đơn, đối soát tiền tệ và chuyển giao kho độc lập. Doanh thu sau chiết khấu sàn và địa chỉ giao hàng được bảo mật tự động theo chuẩn HUKI B2B.
          </p>
</div>
</div>
      </main>
    </div>
  );
}
