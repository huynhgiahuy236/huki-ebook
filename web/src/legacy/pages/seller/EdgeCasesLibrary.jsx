import React from 'react';
import { Link } from 'react-router-dom';

export default function EdgeCasesLibrary() {
  return (
    <div className="w-full bg-background text-on-surface antialiased min-h-screen py-6">
      <div className="max-w-[1680px] mx-auto px-4 md:px-6 mb-4">
        <div className="bg-primary text-on-primary px-4 py-2.5 rounded-xl flex items-center justify-between shadow-sm">
          <div className="w-full flex items-center justify-between font-body-sm text-body-sm">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-primary-fixed" data-icon="cloud_off">cloud_off</span>
              <span className="font-semibold">Mô phỏng Chế Độ Ngoại Tuyến (Offline Demo):</span>
              <span className="hidden sm:inline">Thay đổi được lưu an toàn trên trình duyệt cục bộ.</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs bg-black/20 px-2 py-0.5 rounded font-mono">Offline-Cache v2.4</span>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-[1680px] mx-auto px-4 md:px-6 py-2 space-y-space-3xl">

<section className="bg-surface-container-lowest p-space-xl rounded-xl border border-outline-variant shadow-sm relative overflow-hidden">
<div className="absolute -right-16 -top-16 w-64 h-64 bg-tertiary-fixed-dim/20 rounded-full blur-3xl pointer-events-none"></div>
<div className="flex flex-col md:flex-row md:items-end justify-between gap-space-lg relative z-10">
<div>
<div className="flex flex-wrap items-center gap-2 mb-3">
<span className="bg-surface-container px-3 py-1 rounded-full text-outline font-label-sm text-label-sm border border-outline-variant flex items-center gap-1.5">
<span className="material-symbols-outlined text-[14px]" data-icon="inventory_2">inventory_2</span>
              HUKI Seller Center
            </span>
<span className="bg-tertiary/10 text-tertiary px-3 py-1 rounded-full font-label-sm text-label-sm border border-tertiary/20 flex items-center gap-1.5">
<span className="material-symbols-outlined text-[14px]" data-icon="verified">verified</span>
              Production-Ready UI Specs
            </span>
<span className="bg-secondary-container/20 text-secondary px-3 py-1 rounded-full font-label-sm text-label-sm border border-secondary-container/30">
              Version 2.4 · 17 Phân Khu Chức Năng
            </span>
</div>
<h1 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight mb-2">
            19.6 THƯ VIỆN TRẠNG THÁI &amp; TRƯỜNG HỢP BIÊN (PRODUCT STATES &amp; EDGE CASES)
          </h1>
<p className="font-body-lg text-body-lg text-on-surface-variant max-w-4xl">
            Hệ thống chuẩn hóa phản hồi giao diện, chu trình kiểm duyệt, xử lý ngoại lệ và đồng bộ dữ liệu cho Trình biên tập sản phẩm HUKI Web. Thiết kế đảm bảo sự phân tách tuyệt đối giữa tính sẵn sàng số hóa (Ebook DRM) và tình trạng kho vận vật lý.
          </p>
</div>
<div className="flex items-center gap-3 shrink-0">
<button className="h-10 px-4 rounded-lg border border-outline-variant bg-surface-container-lowest font-body-sm text-body-sm font-semibold hover:bg-surface-container text-on-surface flex items-center gap-2 shadow-sm transition-all">
<span className="material-symbols-outlined text-[18px]" data-icon="download">download</span>
            Xuất JSON Tokens
          </button>
<button className="h-10 px-4 rounded-lg bg-tertiary text-on-tertiary font-body-sm text-body-sm font-semibold hover:bg-tertiary-container shadow-sm flex items-center gap-2 transition-all">
<span className="material-symbols-outlined text-[18px]" data-icon="play_circle">play_circle</span>
            Mô Phỏng Trạng Thái
          </button>
</div>
</div>
</section>

<section className="space-y-space-md">
<div className="flex items-center justify-between border-b border-outline-variant pb-3">
<div className="flex items-center gap-3">
<span className="w-2.5 h-6 bg-tertiary rounded-full"></span>
<h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
            SECTION A · Hệ Thống Huy Hiệu Vòng Đời Sản Phẩm (Commerce Status Badges)
          </h2>
</div>
<span className="font-label-md text-label-md text-outline">9 Chu Kỳ Định Danh</span>
</div>
<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-space-md">

<div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant shadow-sm flex items-start justify-between">
<div>
<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
<span className="material-symbols-outlined text-[14px]" data-icon="fiber_new">fiber_new</span>
              MỚI (NEW)
            </span>
<h3 className="font-title-md text-title-md mt-2 text-on-surface">Vừa khởi tạo</h3>
<p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Hồ sơ sách vừa được thêm thông qua ISBN hoặc nhập thủ công, chưa lưu nháp.</p>
</div>
<span className="font-mono text-xs text-outline bg-surface-container px-2 py-1 rounded">STATE_01</span>
</div>

<div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant shadow-sm flex items-start justify-between">
<div>
<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300">
<span className="material-symbols-outlined text-[14px]" data-icon="edit_note">edit_note</span>
              BẢN NHÁP (DRAFT)
            </span>
<h3 className="font-title-md text-title-md mt-2 text-on-surface">Lưu trữ cục bộ / Máy chủ</h3>
<p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Đã lưu thông tin cơ bản, chưa gửi lên hội đồng kiểm duyệt nội dung HUKI.</p>
</div>
<span className="font-mono text-xs text-outline bg-surface-container px-2 py-1 rounded">STATE_02</span>
</div>

<div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant shadow-sm flex items-start justify-between">
<div>
<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
<span className="material-symbols-outlined text-[14px]" data-icon="hourglass_top">hourglass_top</span>
              ĐANG CHỜ DUYỆT (PENDING REVIEW)
            </span>
<h3 className="font-title-md text-title-md mt-2 text-on-surface">Khóa chỉnh sửa biên mục</h3>
<p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Đang đối chiếu giấy phép xuất bản, chứng nhận sở hữu tác quyền và tệp mẫu.</p>
</div>
<span className="font-mono text-xs text-outline bg-surface-container px-2 py-1 rounded">STATE_03</span>
</div>

<div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant shadow-sm flex items-start justify-between">
<div>
<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
<span className="material-symbols-outlined text-[14px]" data-icon="check_circle">check_circle</span>
              ĐÃ DUYỆT (APPROVED)
            </span>
<h3 className="font-title-md text-title-md mt-2 text-on-surface">Đạt chuẩn thương mại</h3>
<p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Kiểm duyệt thành công. Nhà bán có thể thiết lập lịch mở bán hoặc kích hoạt ngay.</p>
</div>
<span className="font-mono text-xs text-outline bg-surface-container px-2 py-1 rounded">STATE_04</span>
</div>

<div className="bg-surface-container-lowest p-4 rounded-xl border border-tertiary/40 shadow-sm flex items-start justify-between relative overflow-hidden">
<div className="absolute top-0 right-0 w-12 h-12 bg-tertiary/10 rounded-bl-xl flex items-center justify-center">
<span className="material-symbols-outlined text-tertiary text-[18px]" data-icon="storefront">storefront</span>
</div>
<div>
<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-tertiary text-on-tertiary">
<span className="material-symbols-outlined text-[14px]" data-icon="storefront">storefront</span>
              ĐANG BÁN (PUBLISHED)
            </span>
<h3 className="font-title-md text-title-md mt-2 text-on-surface">Hoạt động công khai</h3>
<p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Độc giả có thể tìm kiếm, đọc thử chương mở đầu và thực hiện giao dịch giỏ hàng.</p>
</div>
</div>

<div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant shadow-sm flex items-start justify-between">
<div>
<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
<span className="material-symbols-outlined text-[14px]" data-icon="visibility_off">visibility_off</span>
              ĐANG ẨN (HIDDEN)
            </span>
<h3 className="font-title-md text-title-md mt-2 text-on-surface">Ẩn khỏi Storefront</h3>
<p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Nhà bán chủ động tạm ẩn để điều chỉnh chính sách giá hoặc chiến dịch truyền thông.</p>
</div>
<span className="font-mono text-xs text-outline bg-surface-container px-2 py-1 rounded">STATE_06</span>
</div>

<div className="bg-surface-container-lowest p-4 rounded-xl border border-red-200 shadow-sm flex items-start justify-between bg-red-50/20">
<div>
<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
<span className="material-symbols-outlined text-[14px]" data-icon="cancel">cancel</span>
              TỪ CHỐI (REJECTED)
            </span>
<h3 className="font-title-md text-title-md mt-2 text-red-900">Không đạt kiểm định</h3>
<p className="font-body-sm text-body-sm text-red-800/80 mt-1">Kèm văn bản lý do từ ban biên tập HUKI. Có thể chỉnh sửa bổ sung để tái đệ trình.</p>
</div>
<span className="font-mono text-xs text-red-700 bg-red-100 px-2 py-1 rounded">STATE_07</span>
</div>

<div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant shadow-sm flex items-start justify-between">
<div>
<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-800 border border-orange-200">
<span className="material-symbols-outlined text-[14px]" data-icon="gavel">gavel</span>
              BỊ HẠN CHẾ (RESTRICTED)
            </span>
<h3 className="font-title-md text-title-md mt-2 text-on-surface">Tranh chấp quyền lực</h3>
<p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Tạm dừng giao dịch do phản hồi khiếu nại bản quyền hoặc thông tư từ Cục Xuất Bản.</p>
</div>
<span className="font-mono text-xs text-outline bg-surface-container px-2 py-1 rounded">STATE_08</span>
</div>

<div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant shadow-sm flex items-start justify-between opacity-80">
<div>
<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-600 border border-stone-300">
<span className="material-symbols-outlined text-[14px]" data-icon="archive">archive</span>
              ĐÃ LƯU TRỮ (ARCHIVED)
            </span>
<h3 className="font-title-md text-title-md mt-2 text-on-surface">Ngưng kinh doanh</h3>
<p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Ấn bản hết hợp đồng độc quyền. Chỉ phục vụ thư viện đọc cho độc giả đã mua trước đó.</p>
</div>
<span className="font-mono text-xs text-outline bg-surface-container px-2 py-1 rounded">STATE_09</span>
</div>
</div>
</section>

<section className="space-y-space-md">
<div className="flex items-center justify-between border-b border-outline-variant pb-3">
<div className="flex items-center gap-3">
<span className="w-2.5 h-6 bg-tertiary rounded-full"></span>
<h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
            SECTION B · Ma Trận Độc Lập 4 Chiều Trạng Thái &amp; Khả Dụng Kép (Dual-Format Matrix)
          </h2>
</div>
<span className="font-label-md text-label-md text-tertiary font-semibold">Nguyên tắc Kiến trúc HUKI #01</span>
</div>

<div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm">
<div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-outline-variant">
<div className="flex items-center gap-4">
<div className="w-16 h-24 rounded-lg bg-surface-container overflow-hidden border border-outline-variant spine-crease shrink-0 shadow-sm">
<img className="w-full h-full object-cover" alt="Bìa cuốn sách Atomic Habits bản tiếng Việt của James Clear tông màu trắng tinh tế với vòng tròn các hạt nguyên tử vàng nghệ thuật thanh lịch cao cấp." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCCUq3qxBdg7Mbk9c4bUQHJGY0ZbANr1YVFuCZ443QtMA4UJoFOytF9cx068HkO-B0NiMD3W43-kMq-aE4lJuCsTrg1MEsWmR5OGI2evn6_Y_OlAyM2orvoTekozrdbTrwzP0JsIkOyXxxvOS5K9-d3U6sFsYN7UoAog2DTtWk-RJulaFi48kfQCJD7KbyxW6Ud7jCHls_fG5kehIC0IO0e8pVEfwBAF8bapDJwFUiPzhv-0iMfVLn71Q" />
</div>
<div>
<div className="flex items-center gap-2">
<span className="text-xs font-mono font-bold text-outline">SKU: HUKI-BK-99214</span>
<span className="text-xs bg-surface-container px-2 py-0.5 rounded text-outline">Bản in &amp; Số Hóa</span>
</div>
<h3 className="font-headline-sm text-headline-sm font-bold text-on-surface mt-0.5">
                Atomic Habits — Thay Đổi Tí Hon, Hiệu Quả Bất Ngờ
              </h3>
<p className="font-body-sm text-body-sm text-on-surface-variant">Tác giả: James Clear · Người dịch: NXB Thế Giới &amp; 1980Books</p>
</div>
</div>

<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
<div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant text-left">
<span className="font-label-sm text-label-sm text-outline block">1. TRẠNG THÁI SẢN PHẨM</span>
<span className="font-title-md text-title-md text-emerald-800 font-bold flex items-center gap-1 mt-1">
<span className="w-2 h-2 rounded-full bg-emerald-500"></span> ĐANG BÁN
              </span>
</div>
<div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant text-left">
<span className="font-label-sm text-label-sm text-outline block">2. TỒN KHO SÁCH GIẤY</span>
<span className="font-title-md text-title-md text-on-surface font-bold flex items-center gap-1 mt-1">
<span className="w-2 h-2 rounded-full bg-blue-500"></span> CÒN HÀNG (112)
              </span>
<span className="text-[11px] text-outline mt-0.5 block">8 cuốn đang giữ hàng</span>
</div>
<div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant text-left">
<span className="font-label-sm text-label-sm text-outline block">3. BẢN QUYỀN SỐ EBOOK</span>
<span className="font-title-md text-title-md text-tertiary font-bold flex items-center gap-1 mt-1">
<span className="w-2 h-2 rounded-full bg-tertiary"></span> SẴN SÀNG (DRM)
              </span>
<span className="text-[11px] text-outline mt-0.5 block">Watermark OK · 48 MB</span>
</div>
<div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant text-left">
<span className="font-label-sm text-label-sm text-outline block">4. MỨC ĐỘ HIỂN THỊ</span>
<span className="font-title-md text-title-md text-on-surface font-bold flex items-center gap-1 mt-1">
<span className="material-symbols-outlined text-[16px] text-gray-700" data-icon="public">public</span> CÔNG KHAI
              </span>
<span className="text-[11px] text-outline mt-0.5 block">Storefront Web &amp; App</span>
</div>
</div>
</div>

<div className="mt-6">
<h4 className="font-title-md text-title-md text-on-surface mb-3 flex items-center gap-2">
<span className="material-symbols-outlined text-[20px] text-tertiary" data-icon="schema">schema</span>
            Hành Vi Khả Dụng Kép Tại Storefront (Customer-Facing Impact)
          </h4>
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

<div className="border border-emerald-300 bg-emerald-50/30 rounded-xl p-4 flex flex-col justify-between">
<div>
<div className="flex items-center justify-between">
<span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">TÌNH HUỐNG A</span>
<span className="material-symbols-outlined text-emerald-600 text-[18px]" data-icon="done_all">done_all</span>
</div>
<div className="mt-3 space-y-1.5 font-body-sm text-body-sm">
<div className="flex items-center gap-1.5 text-emerald-900 font-medium">
<span className="material-symbols-outlined text-[16px]" data-icon="menu_book">menu_book</span> Sách Giấy: <span className="font-bold">Còn Hàng</span>
</div>
<div className="flex items-center gap-1.5 text-emerald-900 font-medium">
<span className="material-symbols-outlined text-[16px]" data-icon="tablet_android">tablet_android</span> Ebook DRM: <span className="font-bold">Sẵn Sàng</span>
</div>
</div>
<div className="mt-3 pt-3 border-t border-emerald-200">
<span className="font-label-sm text-label-sm text-emerald-800 font-bold uppercase block">Kết Quả Hiển Thị:</span>
<p className="font-body-sm text-body-sm text-emerald-950 mt-1">Sản phẩm Đang bán tối đa. Cho phép chọn cả 2 định dạng cùng lúc.</p>
</div>
</div>
<div className="mt-4 bg-emerald-600 text-white text-center py-1.5 rounded text-xs font-semibold">
                [Mua Sách Giấy] + [Đọc Ebook Ngay]
              </div>
</div>

<div className="border-2 border-tertiary bg-surface-container-lowest rounded-xl p-4 flex flex-col justify-between shadow-sm relative">
<div className="absolute -top-2.5 right-3 bg-tertiary text-on-tertiary px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                Giữ Doanh Thu
              </div>
<div>
<div className="flex items-center justify-between">
<span className="text-xs font-mono font-bold text-tertiary bg-tertiary-fixed px-2 py-0.5 rounded">TÌNH HUỐNG B</span>
</div>
<div className="mt-3 space-y-1.5 font-body-sm text-body-sm">
<div className="flex items-center gap-1.5 text-error font-medium">
<span className="material-symbols-outlined text-[16px]" data-icon="close">close</span> Sách Giấy: <span className="font-bold">Hết Hàng (0)</span>
</div>
<div className="flex items-center gap-1.5 text-tertiary font-medium">
<span className="material-symbols-outlined text-[16px]" data-icon="check">check</span> Ebook DRM: <span className="font-bold">Sẵn Sàng</span>
</div>
</div>
<div className="mt-3 pt-3 border-t border-outline-variant">
<span className="font-label-sm text-label-sm text-tertiary font-bold uppercase block">Quy Tắc Biên Mục:</span>
<p className="font-body-sm text-body-sm text-on-surface mt-1 font-medium">
                    Sản phẩm KHÔNG bị ngắt kết nối. Độc giả vẫn bấm mua và đọc Ebook ngay lập tức!
                  </p>
</div>
</div>
<div className="mt-4 bg-tertiary text-on-tertiary text-center py-1.5 rounded text-xs font-semibold flex items-center justify-center gap-1">
<span className="material-symbols-outlined text-[14px]" data-icon="bolt">bolt</span> Mua Ebook Tức Thì (129.000 đ)
              </div>
</div>

<div className="border border-outline-variant bg-surface-container-lowest rounded-xl p-4 flex flex-col justify-between">
<div>
<div className="flex items-center justify-between">
<span className="text-xs font-mono font-bold text-outline bg-surface-container px-2 py-0.5 rounded">TÌNH HUỐNG C</span>
<span className="material-symbols-outlined text-amber-600 text-[18px]" data-icon="warning">warning</span>
</div>
<div className="mt-3 space-y-1.5 font-body-sm text-body-sm">
<div className="flex items-center gap-1.5 text-on-surface font-medium">
<span className="material-symbols-outlined text-[16px] text-emerald-600" data-icon="check">check</span> Sách Giấy: <span className="font-bold">Còn Hàng</span>
</div>
<div className="flex items-center gap-1.5 text-amber-700 font-medium">
<span className="material-symbols-outlined text-[16px]" data-icon="pending">pending</span> Ebook DRM: <span className="font-bold">Chưa Có / Đang Xử Lý</span>
</div>
</div>
<div className="mt-3 pt-3 border-t border-outline-variant">
<span className="font-label-sm text-label-sm text-outline font-bold uppercase block">Kết Quả Hiển Thị:</span>
<p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Chỉ bán Sách Giấy. Nút chọn định dạng Ebook bị khóa kèm badge "Sắp Ra Mắt".</p>
</div>
</div>
<div className="mt-4 bg-surface-container text-on-surface text-center py-1.5 rounded text-xs font-semibold border border-outline-variant">
                Chỉ Giao Sách Giấy
              </div>
</div>

<div className="border border-red-200 bg-red-50/20 rounded-xl p-4 flex flex-col justify-between">
<div>
<div className="flex items-center justify-between">
<span className="text-xs font-mono font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded">TÌNH HUỐNG D</span>
<span className="material-symbols-outlined text-red-600 text-[18px]" data-icon="block">block</span>
</div>
<div className="mt-3 space-y-1.5 font-body-sm text-body-sm">
<div className="flex items-center gap-1.5 text-red-800 font-medium">
<span className="material-symbols-outlined text-[16px]" data-icon="close">close</span> Sách Giấy: <span className="font-bold">Hết Hàng</span>
</div>
<div className="flex items-center gap-1.5 text-red-800 font-medium">
<span className="material-symbols-outlined text-[16px]" data-icon="close">close</span> Ebook DRM: <span className="font-bold">Không Khả Dụng</span>
</div>
</div>
<div className="mt-3 pt-3 border-t border-red-200">
<span className="font-label-sm text-label-sm text-red-800 font-bold uppercase block">Kết Quả Hiển Thị:</span>
<p className="font-body-sm text-body-sm text-red-900 mt-1">Tạm ngưng toàn bộ giao dịch. Nút mua chuyển thành "Thông báo khi có hàng lại".</p>
</div>
</div>
<div className="mt-4 bg-gray-200 text-gray-600 text-center py-1.5 rounded text-xs font-semibold">
                Tạm Hết Hàng Cả Hai Định Dạng
              </div>
</div>
</div>
</div>
</div>
</section>

<section className="space-y-space-md">
<div className="flex items-center justify-between border-b border-outline-variant pb-3">
<div className="flex items-center gap-3">
<span className="w-2.5 h-6 bg-tertiary rounded-full"></span>
<h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
            SECTION C · Cơ Chế Tự Động Lưu (Autosave Engine &amp; Manual Action States)
          </h2>
</div>
<span className="font-label-md text-label-md text-outline">Real-time Background Sync</span>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

<div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between">
<div>
<span className="font-label-sm text-label-sm text-outline uppercase block mb-3">1. Autosave: Đang Lưu</span>
<div className="flex items-center gap-2.5 text-tertiary bg-surface-container-low p-3 rounded-lg border border-outline-variant">
<svg className="animate-spin h-5 w-5 text-tertiary" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
<path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
</svg>
<div className="leading-tight">
<span className="font-body-sm text-body-sm font-semibold block text-on-surface">Đang lưu thay đổi...</span>
<span className="text-[11px] text-outline">Đồng bộ 3 trường vừa sửa</span>
</div>
</div>
</div>
<p className="font-body-sm text-body-sm text-outline mt-3">Debounce 1.500ms sau khi người dùng ngừng gõ phím.</p>
</div>

<div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between">
<div>
<span className="font-label-sm text-label-sm text-outline uppercase block mb-3">2. Autosave: Thành Công</span>
<div className="flex items-center gap-2.5 text-emerald-800 bg-emerald-50/50 p-3 rounded-lg border border-emerald-200">
<span className="material-symbols-outlined text-emerald-600 text-[20px]" data-icon="cloud_done">cloud_done</span>
<div className="leading-tight">
<span className="font-body-sm text-body-sm font-semibold block text-emerald-950">Đã lưu tự động</span>
<span className="text-[11px] text-emerald-700">Lần lưu gần nhất: 10:42:18 hôm nay</span>
</div>
</div>
</div>
<p className="font-body-sm text-body-sm text-outline mt-3">Trạng thái tĩnh tinh tế, không gây nhiễu thị giác người biên tập.</p>
</div>

<div className="bg-surface-container-lowest p-5 rounded-xl border border-amber-300 shadow-sm flex flex-col justify-between bg-amber-50/10">
<div>
<span className="font-label-sm text-label-sm text-amber-800 uppercase block mb-3">3. Autosave: Thất Bại (Mất Mạng)</span>
<div className="flex items-start gap-2.5 text-amber-900 bg-amber-50 p-3 rounded-lg border border-amber-200">
<span className="material-symbols-outlined text-amber-700 text-[20px] shrink-0 mt-0.5" data-icon="cloud_off">cloud_off</span>
<div className="leading-tight">
<span className="font-body-sm text-body-sm font-semibold block text-amber-950">Chưa thể tự động lưu</span>
<span className="text-[11px] text-amber-800 block mt-0.5">Dữ liệu vẫn an toàn trên LocalStorage.</span>
<button className="text-xs font-bold text-amber-900 underline mt-1.5 inline-flex items-center gap-1 hover:text-black">
<span className="material-symbols-outlined text-[13px]" data-icon="refresh">refresh</span> Thử lưu lại
                </button>
</div>
</div>
</div>
<p className="font-body-sm text-body-sm text-outline mt-3">Không chặn thao tác gõ tiếp theo của người bán.</p>
</div>

<div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between">
<div>
<span className="font-label-sm text-label-sm text-outline uppercase block mb-3">4. Nút Thủ Công (Saving State)</span>
<div className="space-y-2">
<button className="w-full h-10 px-4 rounded-lg bg-primary/70 text-on-primary font-body-sm text-body-sm font-semibold flex items-center justify-center gap-2 cursor-not-allowed" disabled="">
<svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
<path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
</svg>
<span>Đang Lưu Thay Đổi...</span>
</button>
<div className="p-2 rounded bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
<span className="material-symbols-outlined text-[16px] text-red-600" data-icon="error">error</span>
<span>Lỗi 500: Máy chủ đang bận xử lý DRM.</span>
</div>
</div>
</div>
<p className="font-body-sm text-body-sm text-outline mt-3">Chặn click lặp lại (double-submission prevention).</p>
</div>
</div>
</section>

<section className="space-y-space-md">
<div className="flex items-center justify-between border-b border-outline-variant pb-3">
<div className="flex items-center gap-3">
<span className="w-2.5 h-6 bg-tertiary rounded-full"></span>
<h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
            SECTION D · Xác Thực Trường Dữ Liệu &amp; Bảng Tóm Tắt Lỗi Kiểm Kê (Validation Showcase)
          </h2>
</div>
<span className="font-label-md text-label-md text-outline">Form Heuristics &amp; Guardrails</span>
</div>
<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

<div className="lg:col-span-7 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm space-y-5">
<h3 className="font-title-md text-title-md text-on-surface flex items-center justify-between">
<span>Trường Nhập Liệu Tiêu Chuẩn Theo Trạng Thái Phản Hồi</span>
<span className="text-xs text-outline font-normal">Tương tác thực tế</span>
</h3>
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">

<div>
<label className="block font-label-md text-label-md font-semibold text-on-surface mb-1">Mã Lưu Kho Cục Bộ (SKU)</label>
<input className="w-full h-11 px-3.5 rounded-lg border border-outline-variant bg-surface-container-lowest font-body-md text-body-md focus:border-tertiary focus:ring-1 focus:ring-tertiary focus:outline-none transition-all placeholder:text-outline/60" placeholder="VD: HUKI-ECO-001" type="text" />
<span className="font-body-sm text-body-sm text-outline mt-1 block">Tùy chọn cho phân loại kho</span>
</div>

<div>
<label className="block font-label-md text-label-md font-semibold text-on-surface mb-1">Số Trang Sách Giấy</label>
<div className="relative">
<input className="w-full h-11 px-3.5 rounded-lg border-2 border-tertiary ring-2 ring-tertiary/15 bg-surface-container-lowest font-body-md text-body-md focus:outline-none transition-all" type="text" value="348" />
<span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-tertiary text-[18px]" data-icon="edit">edit</span>
</div>
<span className="font-body-sm text-body-sm text-tertiary mt-1 block">Đang nhập dữ liệu (Active Focus)</span>
</div>

<div>
<label className="block font-label-md text-label-md font-semibold text-on-surface mb-1">Giá Bìa Niêm Yết</label>
<div className="relative">
<input className="w-full h-11 px-3.5 rounded-lg border border-emerald-500 bg-surface-container-lowest font-body-md text-body-md text-on-surface focus:outline-none pr-9" type="text" value="159.000 đ" />
<span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 text-[20px]" data-icon="check_circle">check_circle</span>
</div>
<span className="font-body-sm text-body-sm text-emerald-700 mt-1 flex items-center gap-1">
                Khớp với cơ sở dữ liệu NXB Thế Giới
              </span>
</div>

<div>
<label className="block font-label-md text-label-md font-semibold text-error mb-1">Giá Bán Khuyến Mãi HUKI</label>
<div className="relative">
<input className="w-full h-11 px-3.5 rounded-lg border-2 border-error bg-red-50/30 font-body-md text-body-md text-error focus:outline-none pr-9" type="text" value="170.000 đ" />
<span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-error text-[20px]" data-icon="error">error</span>
</div>
<span className="font-body-sm text-body-sm text-error mt-1 flex items-center gap-1 font-medium">
                Giá bán không thể lớn hơn giá gốc (159.000 đ)
              </span>
</div>

<div className="md:col-span-2">
<label className="block font-label-md text-label-md font-semibold text-error mb-1">Tên Tác Phẩm / Tiêu Đề Sách *</label>
<div className="relative">
<input className="w-full h-11 px-3.5 rounded-lg border-2 border-error bg-red-50/20 font-body-md text-body-md focus:outline-none pr-9" placeholder="" type="text" />
<span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-error text-[20px]" data-icon="warning">warning</span>
</div>
<span className="font-body-sm text-body-sm text-error mt-1 block font-medium">
                Vui lòng nhập tên tác phẩm chính thức theo giấy phép xuất bản
              </span>
</div>

<div className="md:col-span-2">
<label className="block font-label-md text-label-md font-semibold text-on-surface mb-1 flex items-center gap-1.5">
<span>Mã Tiêu Chuẩn Quốc Tế (ISBN-13)</span>
<span className="bg-surface-container px-2 py-0.5 rounded text-[10px] text-outline font-mono">BẢO MẬT KHÓA</span>
</label>
<div className="relative">
<input className="w-full h-11 px-3.5 rounded-lg border border-outline-variant bg-surface-container/60 font-mono text-body-md text-on-surface-variant cursor-not-allowed pr-10" readOnly type="text" value="978-604-77-9128-4" />
<span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-[20px]" data-icon="lock">lock</span>
</div>
<span className="font-body-sm text-body-sm text-outline mt-1 block">
                Không thể thay đổi sau khi sách đã phát sinh đơn hàng hoặc liên kết mã DRM độc bản.
              </span>
</div>
</div>
</div>

<div className="lg:col-span-5 bg-surface-container-lowest p-6 rounded-2xl border border-red-200 shadow-sm flex flex-col justify-between bg-red-50/10">
<div>
<div className="flex items-center gap-3 pb-4 border-b border-red-200">
<div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-error shrink-0">
<span className="material-symbols-outlined text-[22px]" data-icon="fact_check">fact_check</span>
</div>
<div>
<h3 className="font-headline-sm text-headline-sm font-bold text-red-950">Chưa Thể Gửi Duyệt</h3>
<p className="font-body-sm text-body-sm text-red-800">Còn 4 trường dữ liệu bắt buộc cần hoàn thiện trước khi đệ trình.</p>
</div>
</div>

<div className="mt-4 space-y-3">
<div className="p-3 bg-surface-container-lowest rounded-xl border border-red-200 flex items-center justify-between hover:border-red-400 transition-colors cursor-pointer group">
<div className="flex items-center gap-2.5">
<span className="w-2 h-2 rounded-full bg-error shrink-0"></span>
<div>
<span className="font-body-sm text-body-sm font-semibold text-on-surface block">Ảnh bìa chính</span>
<span className="text-xs text-outline">Độ phân giải tối thiểu 1200 x 1800px</span>
</div>
</div>
<span className="material-symbols-outlined text-[18px] text-outline group-hover:text-primary transition-colors" data-icon="arrow_forward">arrow_forward</span>
</div>
<div className="p-3 bg-surface-container-lowest rounded-xl border border-red-200 flex items-center justify-between hover:border-red-400 transition-colors cursor-pointer group">
<div className="flex items-center gap-2.5">
<span className="w-2 h-2 rounded-full bg-error shrink-0"></span>
<div>
<span className="font-body-sm text-body-sm font-semibold text-on-surface block">Tác giả chưa chọn</span>
<span className="text-xs text-outline">Liên kết tối thiểu 1 tác giả hoặc dịch giả</span>
</div>
</div>
<span className="material-symbols-outlined text-[18px] text-outline group-hover:text-primary transition-colors" data-icon="arrow_forward">arrow_forward</span>
</div>
<div className="p-3 bg-surface-container-lowest rounded-xl border border-red-200 flex items-center justify-between hover:border-red-400 transition-colors cursor-pointer group">
<div className="flex items-center gap-2.5">
<span className="w-2 h-2 rounded-full bg-error shrink-0"></span>
<div>
<span className="font-body-sm text-body-sm font-semibold text-on-surface block">Xung đột giá bán</span>
<span className="text-xs text-error font-medium">Giá bán HUKI cao hơn giá bìa</span>
</div>
</div>
<span className="material-symbols-outlined text-[18px] text-outline group-hover:text-primary transition-colors" data-icon="arrow_forward">arrow_forward</span>
</div>
<div className="p-3 bg-surface-container-lowest rounded-xl border border-red-200 flex items-center justify-between hover:border-red-400 transition-colors cursor-pointer group">
<div className="flex items-center gap-2.5">
<span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
<div>
<span className="font-body-sm text-body-sm font-semibold text-on-surface block">Tệp Ebook DRM</span>
<span className="text-xs text-amber-700">Chưa gắn tệp bản thảo PDF/EPUB</span>
</div>
</div>
<span className="material-symbols-outlined text-[18px] text-outline group-hover:text-primary transition-colors" data-icon="arrow_forward">arrow_forward</span>
</div>
</div>
</div>
<div className="mt-6 pt-4 border-t border-red-200 flex items-center justify-between">
<span className="text-xs text-outline">Tự động làm mới khi sửa</span>
<button className="px-5 py-2.5 rounded-lg bg-surface-container text-outline font-body-sm text-body-sm font-semibold cursor-not-allowed" disabled="">
              Gửi Duyệt Sản Phẩm (Bị Khóa)
            </button>
</div>
</div>
</div>
</section>

<section className="space-y-space-md">
<div className="flex items-center justify-between border-b border-outline-variant pb-3">
<div className="flex items-center gap-3">
<span className="w-2.5 h-6 bg-tertiary rounded-full"></span>
<h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
            SECTION E · Chu Trình Tải Media &amp; Đường Ống Xử Lý DRM (Upload Pipeline)
          </h2>
</div>
<span className="font-label-md text-label-md text-outline">Cover Art &amp; Secure Ebook Engine</span>
</div>

<div>
<div className="flex items-center gap-2 mb-3">
<span className="font-title-md text-title-md font-bold text-on-surface">A. Quy Trình Xử Lý Ảnh Bìa (Book Cover Dropzone States)</span>
<span className="text-xs text-outline">Tỷ lệ 2:3 chuẩn biên mục</span>
</div>
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

<div className="border-2 border-dashed border-outline-variant rounded-xl p-4 bg-surface-container-lowest flex flex-col items-center justify-center text-center h-72 hover:border-tertiary transition-colors cursor-pointer group">
<div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-outline group-hover:text-tertiary group-hover:bg-tertiary-fixed transition-colors">
<span className="material-symbols-outlined text-[24px]" data-icon="cloud_upload">cloud_upload</span>
</div>
<span className="font-title-md text-title-md mt-3 text-on-surface">Kéo thả ảnh bìa</span>
<p className="font-body-sm text-body-sm text-outline mt-1">PNG, JPG tối đa 15MB</p>
<span className="text-[11px] text-tertiary font-semibold mt-3 underline">Chọn tệp từ máy</span>
</div>

<div className="border-2 border-dashed border-tertiary rounded-xl p-4 bg-tertiary/5 flex flex-col items-center justify-center text-center h-72 scale-[1.02] shadow-md transition-transform">
<div className="w-14 h-14 rounded-full bg-tertiary text-on-tertiary flex items-center justify-center animate-bounce">
<span className="material-symbols-outlined text-[28px]" data-icon="download">download</span>
</div>
<span className="font-title-md text-title-md mt-3 text-tertiary font-bold">Thả ảnh vào đây</span>
<p className="font-body-sm text-body-sm text-tertiary mt-1">Sẵn sàng phân tích tỷ lệ</p>
</div>

<div className="border border-outline-variant rounded-xl p-4 bg-surface-container-lowest flex flex-col items-center justify-center text-center h-72">
<div className="w-16 h-24 bg-surface-container rounded border border-outline-variant mb-3 flex items-center justify-center text-outline relative overflow-hidden">
<div className="absolute bottom-0 left-0 right-0 bg-tertiary/20" style={{ height: '68%' }}></div>
<span className="material-symbols-outlined text-[24px] text-tertiary animate-pulse" data-icon="image">image</span>
</div>
<span className="font-body-sm text-body-sm font-semibold text-on-surface">Đang tải: bia-chinh.jpg</span>
<span className="text-xs text-outline mt-0.5">3.4 MB / 5.0 MB (68%)</span>
<div className="w-full bg-surface-container rounded-full h-1.5 mt-3 overflow-hidden">
<div className="bg-tertiary h-1.5 rounded-full" style={{ width: '68%' }}></div>
</div>
<button className="text-xs text-error hover:underline mt-2">Hủy tải</button>
</div>

<div className="border border-outline-variant rounded-xl p-3 bg-surface-container-lowest flex flex-col items-center justify-between text-center h-72 shadow-sm">
<div className="relative w-full flex justify-center pt-2">
<div className="w-24 h-36 rounded-lg bg-surface-container overflow-hidden border border-outline-variant spine-crease shadow">
<img className="w-full h-full object-cover" alt="Bìa cuốn sách văn học kinh điển màu kem nhã nhặn với họa tiết chữ thư pháp mạ đồng tinh tế." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDA8-8YnEl5tOy9QRyr2GJiGKtvj2s5022eRCxXBI-8QoCdQ69_WLNc8vY7VKvEG4is_yrDWCKNl5HC79Pg0adWUZhF8_muzw7D3Cmx_fy4xnjmioVBOP1QBiqS6KbPKIKRZL9nvf1eDcYID_3DYZdRdaycHC35ZPm6qMekIVE6cRw3Gty9YmdrcRdVKD8kHFuOQay3UfD2-c8Ku-l3GlPiODvtvwBjE8pR1lJubapukGuNHc3_ocJImw" />
</div>
<span className="absolute top-0 right-2 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[14px]">
<span className="material-symbols-outlined text-[14px]" data-icon="check">check</span>
</span>
</div>
<div className="w-full">
<span className="font-label-sm text-label-sm text-emerald-800 font-bold block">1800 x 2700 px (Hợp lệ)</span>
<div className="flex items-center justify-center gap-2 mt-2">
<button className="px-2.5 py-1 text-xs border border-outline-variant rounded hover:bg-surface-container flex items-center gap-1">
<span className="material-symbols-outlined text-[14px]" data-icon="crop">crop</span> Cắt ảnh
                </button>
<button className="px-2.5 py-1 text-xs border border-outline-variant rounded text-error hover:bg-red-50 flex items-center gap-1">
<span className="material-symbols-outlined text-[14px]" data-icon="delete">delete</span> Xóa
                </button>
</div>
</div>
</div>

<div className="border border-red-300 rounded-xl p-4 bg-red-50/30 flex flex-col items-center justify-center text-center h-72">
<div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-error">
<span className="material-symbols-outlined text-[24px]" data-icon="warning">warning</span>
</div>
<span className="font-title-md text-title-md mt-2 text-error font-bold">Không thể tải ảnh</span>
<p className="font-body-sm text-body-sm text-red-800 mt-1">Độ phân giải dưới mức chuẩn (chỉ đạt 600x900px).</p>
<button className="mt-3 px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold flex items-center gap-1 shadow-sm">
<span className="material-symbols-outlined text-[14px]" data-icon="refresh">refresh</span> Tải lại ảnh khác
            </button>
</div>
</div>
</div>

<div className="mt-6 pt-6 border-t border-outline-variant">
<div className="flex items-center gap-2 mb-3">
<span className="font-title-md text-title-md font-bold text-on-surface">B. Đường Ống Xử Lý Bản Số Hóa &amp; Bản Quyền DRM (Ebook Pipeline)</span>
<span className="text-xs bg-tertiary/15 text-tertiary px-2 py-0.5 rounded font-mono">DRM-Enclave Engine</span>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

<div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between">
<div>
<div className="flex items-center justify-between mb-2">
<span className="text-xs font-mono text-outline">PIPELINE_01</span>
<span className="text-xs bg-stone-100 text-stone-700 px-2 py-0.5 rounded">Trống</span>
</div>
<h4 className="font-title-md text-title-md font-bold text-on-surface">Chưa Có Nội Dung Ebook</h4>
<p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                Tải lên bản PDF hoặc EPUB đã hoàn thiện dàn trang để hệ thống phân giải mục lục và mã hóa DRM.
              </p>
</div>
<button className="mt-4 w-full h-10 rounded-lg border border-tertiary text-tertiary font-body-sm text-body-sm font-semibold hover:bg-tertiary/5 flex items-center justify-center gap-2">
<span className="material-symbols-outlined text-[18px]" data-icon="upload_file">upload_file</span>
              Tải Lên Tệp Bản Thảo
            </button>
</div>

<div className="bg-surface-container-lowest p-5 rounded-xl border border-tertiary/50 shadow-sm flex flex-col justify-between bg-emerald-50/10">
<div>
<div className="flex items-center justify-between mb-2">
<span className="text-xs font-mono text-tertiary font-bold">PIPELINE_02 · Đang Tải</span>
<span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">72%</span>
</div>
<h4 className="font-title-md text-title-md font-bold text-on-surface">Atomic-Habits-Final.pdf</h4>
<p className="font-body-sm text-body-sm text-outline mt-0.5">48.2 MB · Còn khoảng 18 giây...</p>
<div className="w-full bg-surface-container rounded-full h-2 mt-3 overflow-hidden">
<div className="bg-tertiary h-2 rounded-full" style={{ width: '72%' }}></div>
</div>

<div className="mt-3 p-2 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-900 flex items-start gap-1.5">
<span className="material-symbols-outlined text-[16px] text-tertiary shrink-0 mt-0.5" data-icon="info">info</span>
<span>Bạn vẫn có thể tiếp tục chỉnh sửa các thông tin khác trong khi tệp đang tải.</span>
</div>
</div>
<div className="mt-4 flex items-center justify-between text-xs text-outline pt-2 border-t border-outline-variant">
<span>Đã lưu Metadata trước</span>
<button className="text-error hover:underline">Hủy tệp</button>
</div>
</div>

<div className="bg-surface-container-lowest p-5 rounded-xl border border-secondary-container shadow-sm flex flex-col justify-between bg-amber-50/10">
<div>
<div className="flex items-center justify-between mb-2">
<span className="text-xs font-mono text-secondary font-bold">PIPELINE_03 · Đang Xử Lý</span>
<span className="text-xs bg-amber-100 text-amber-900 px-2 py-0.5 rounded">Server-side</span>
</div>
<h4 className="font-title-md text-title-md font-bold text-on-surface flex items-center gap-2">
<svg className="animate-spin h-4 w-4 text-secondary" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
<path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
</svg>
                Tạo Bản Mã Hóa DRM...
              </h4>
<p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
                Hệ thống đang trích xuất mục lục số, băm chữ ký điện tử Watermark động và nén luồng cho thiết bị đọc di động.
              </p>
</div>
<div className="mt-4 bg-surface-container p-2.5 rounded-lg text-xs text-outline space-y-1 font-mono">
<div>[✓] Kiểm tra tệp không có mã độc</div>
<div className="text-secondary font-semibold">[⏳] Tạo 128-bit DRM Container...</div>
<div className="text-outline/60">[ ] Khởi tạo mẫu đọc thử 10%</div>
</div>
</div>

<div className="bg-surface-container-lowest p-5 rounded-xl border border-emerald-300 shadow-sm flex flex-col justify-between bg-emerald-50/20">
<div>
<div className="flex items-center justify-between mb-2">
<span className="text-xs font-mono text-emerald-800 font-bold">PIPELINE_04</span>
<span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded font-semibold">SẴN SÀNG</span>
</div>
<h4 className="font-title-md text-title-md font-bold text-emerald-950 flex items-center gap-1.5">
<span className="material-symbols-outlined text-[20px] text-emerald-600" data-icon="verified_user">verified_user</span>
                Bản Số Hóa Hợp Lệ
              </h4>
<p className="font-body-sm text-body-sm text-emerald-900 mt-1">
                Atomic-Habits-Final.epub (312 trang · 34 chương)
              </p>
<div className="mt-3 flex flex-wrap gap-1.5">
<span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">DRM Watermark Active</span>
<span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">Đọc thử 3 chương đầu OK</span>
</div>
</div>
<div className="mt-4 pt-3 border-t border-emerald-200 flex items-center justify-between">
<button className="text-xs text-tertiary font-bold hover:underline flex items-center gap-1">
<span className="material-symbols-outlined text-[15px]" data-icon="visibility">visibility</span> Xem Thử Reader
              </button>
<button className="text-xs text-outline hover:text-on-surface">Thay tệp mới</button>
</div>
</div>

<div className="bg-surface-container-lowest p-5 rounded-xl border border-red-300 shadow-sm flex flex-col justify-between bg-red-50/20">
<div>
<div className="flex items-center justify-between mb-2">
<span className="text-xs font-mono text-red-700 font-bold">LỖI BIÊN DỊCH</span>
<span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">Khóa Mật Khẩu</span>
</div>
<h4 className="font-title-md text-title-md font-bold text-red-950 flex items-center gap-1.5">
<span className="material-symbols-outlined text-[20px] text-red-600" data-icon="lock_clock">lock_clock</span>
                Tệp PDF Có Mật Khẩu Bảo Vệ
              </h4>
<p className="font-body-sm text-body-sm text-red-800 mt-1">
                Hệ thống không thể giải mã và gắn watermark độc quyền cho người mua. Vui lòng xuất tệp PDF không mã hóa trước khi tải lên.
              </p>
</div>
<button className="mt-4 w-full h-9 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 flex items-center justify-center gap-1.5">
<span className="material-symbols-outlined text-[16px]" data-icon="file_upload">file_upload</span> Tải Lại Tệp Không Mật Khẩu
            </button>
</div>

<div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between">
<div>
<div className="flex items-center justify-between mb-2">
<span className="text-xs font-mono text-outline">REPLACE_MODE</span>
<span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Cập Nhật Phiên Bản</span>
</div>
<h4 className="font-title-md text-title-md font-bold text-on-surface">Thay Thế Bản Thảo Đang Bán</h4>
<div className="mt-2 text-xs space-y-2">
<div className="p-2 rounded bg-surface-container flex items-center justify-between">
<span className="text-outline">Hiện hành: v2.1 (42MB)</span>
<span className="text-emerald-700 font-semibold">Đang phục vụ</span>
</div>
<div className="p-2 rounded bg-blue-50 border border-blue-200 flex items-center justify-between text-blue-900 font-semibold">
<span>Mới: v2.2-sua-chinh-ta.pdf</span>
<span>Đang tải 89%</span>
</div>
</div>
</div>
<p className="text-[11px] text-outline mt-3">
              Phiên bản cũ vẫn mở bán bình thường cho đến khi phiên bản mới vượt qua khâu kiểm tra DRM.
            </p>
</div>
</div>
</div>
</section>

<section className="space-y-space-md">
<div className="flex items-center justify-between border-b border-outline-variant pb-3">
<div className="flex items-center gap-3">
<span className="w-2.5 h-6 bg-tertiary rounded-full"></span>
<h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
            SECTION F · Ngoại Lệ Mạng, Xung Đột Phiên Làm Việc &amp; Mất Dữ Liệu (Exceptions &amp; Conflicts)
          </h2>
</div>
<span className="font-label-md text-label-md text-outline">High-Resiliency Engineering</span>
</div>
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

<div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm space-y-4">
<div className="flex items-center justify-between">
<h3 className="font-title-md text-title-md text-on-surface font-bold">
              1. Lỗi Khối Thành Phần Độc Lập (Isolated Section-Level Failure)
            </h3>
<span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">Chịu Lỗi Cục Bộ</span>
</div>
<p className="font-body-sm text-body-sm text-on-surface-variant">
            Khi dịch vụ Tác Giả gặp sự cố kết nối, chỉ riêng bộ chọn tác giả hiển thị lỗi và nút thử lại; toàn bộ các trường giá, tên sách, mô tả vẫn gõ và lưu nháp bình thường.
          </p>
<div className="p-4 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/20">
<div className="flex items-start justify-between">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-amber-700 text-[22px]" data-icon="cloud_sync">cloud_sync</span>
<span className="font-title-md text-title-md font-semibold text-amber-950">Bộ Chọn Tác Giả &amp; Dịch Giả</span>
</div>
<button className="px-3 py-1 bg-surface-container-lowest border border-amber-300 rounded text-xs font-semibold text-amber-900 hover:bg-amber-100 flex items-center gap-1 shadow-sm">
<span className="material-symbols-outlined text-[14px]" data-icon="refresh">refresh</span> Thử lại
              </button>
</div>
<p className="font-body-sm text-body-sm text-amber-900 mt-2">
              Không thể tải danh mục gợi ý tác giả từ máy chủ (Mã lỗi: AUTH-503). Các trường khác vẫn hoạt động.
            </p>
</div>
</div>

<div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm space-y-4">
<div className="flex items-center justify-between">
<h3 className="font-title-md text-title-md text-on-surface font-bold">
              2. Hộp Thoại Xung Đột Phiên Làm Việc (Concurrent Edit Conflict)
            </h3>
<span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded font-mono">DIFF_CONFLICT</span>
</div>
<div className="border border-outline-variant rounded-xl p-4 bg-surface-container-low">
<div className="flex items-center gap-2 text-error font-bold font-title-md text-title-md mb-2">
<span className="material-symbols-outlined text-[20px]" data-icon="warning">warning</span>
              Sản Phẩm Đã Được Cập Nhật Ở Phiên Khác
            </div>
<p className="font-body-sm text-body-sm text-on-surface-variant mb-3">
              Tài khoản đồng nghiệp <strong className="text-on-surface">Lê Hoàng (Editor)</strong> vừa cập nhật sản phẩm lúc 10:06. Bạn có bản sửa cục bộ từ 09:42.
            </p>
<div className="grid grid-cols-2 gap-2 text-xs mb-3">
<div className="p-2.5 rounded bg-surface-container-lowest border border-outline-variant">
<span className="text-outline block font-semibold">BẢN ĐANG SỬA CỦA BẠN (LOCAL)</span>
<span className="text-on-surface block mt-1 font-bold">Giá: 129.000 đ</span>
<span className="text-outline">Tồn kho: 120 cuốn</span>
</div>
<div className="p-2.5 rounded bg-emerald-50 border border-emerald-300">
<span className="text-emerald-800 block font-semibold">BẢN MỚI TRÊN SERVER (10:06)</span>
<span className="text-emerald-950 block mt-1 font-bold">Giá: 135.000 đ</span>
<span className="text-emerald-800">Tồn kho: 112 cuốn</span>
</div>
</div>
<div className="flex items-center justify-end gap-2">
<button className="px-3 py-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-xs font-semibold hover:bg-surface-container">
                Tải Lại &amp; Đè Bản Server
              </button>
<button className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container shadow-sm">
                Ghi Đè Bằng Bản Của Tôi
              </button>
</div>
</div>
</div>

<div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm space-y-4">
<div className="flex items-center justify-between">
<h3 className="font-title-md text-title-md text-on-surface font-bold">
              3. Phiên Đăng Nhập Hết Hạn (Session Expired Without Data Loss)
            </h3>
<span className="text-xs bg-slate-200 text-slate-800 px-2 py-0.5 rounded">Security Token</span>
</div>
<div className="border border-outline-variant rounded-xl p-4 bg-surface-container-lowest flex items-start gap-4">
<div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary shrink-0">
<span className="material-symbols-outlined text-[22px]" data-icon="lock_reset">lock_reset</span>
</div>
<div>
<h4 className="font-title-md text-title-md font-bold text-on-surface">Phiên Đăng Nhập Đã Hết Hạn</h4>
<p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                Để bảo vệ quyền sở hữu nhà xuất bản, vui lòng xác thực lại mật khẩu. Toàn bộ nội dung bạn vừa soạn thảo đã được mã hóa lưu tạm trên trình duyệt và không bị mất.
              </p>
<div className="mt-3 flex items-center gap-3">
<button className="px-4 py-2 rounded-lg bg-tertiary text-on-tertiary text-xs font-semibold hover:bg-tertiary-container shadow-sm">
                  Mở Cửa Sổ Đăng Nhập Lại
                </button>
<span className="text-xs text-outline">Tự động giữ nguyên ngữ cảnh trang</span>
</div>
</div>
</div>
</div>

<div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm space-y-4">
<div className="flex items-center justify-between">
<h3 className="font-title-md text-title-md text-on-surface font-bold">
              4. Hộp Thoại Chặn Rời Khỏi Trang (Unsaved Changes Guard)
            </h3>
<span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">Route Guard</span>
</div>
<div className="border border-outline-variant rounded-xl p-4 bg-surface-container-lowest">
<div className="flex items-center gap-2 text-on-surface font-title-md text-title-md font-bold mb-1">
<span className="material-symbols-outlined text-amber-600 text-[20px]" data-icon="help">help</span>
              Bạn Có Thay Đổi Chưa Được Lưu
            </div>
<p className="font-body-sm text-body-sm text-on-surface-variant mb-4">
              Nếu rời khỏi trình biên tập lúc này, các thay đổi tại mục 'Thông Tin Tác Quyền' và 'Tồn Kho' có thể bị hủy bỏ.
            </p>
<div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-outline-variant">
<button className="px-3 py-1.5 rounded-lg border border-red-200 text-error hover:bg-red-50 text-xs font-semibold">
                Bỏ Thay Đổi &amp; Rời Đi
              </button>
<button className="px-3 py-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest hover:bg-surface-container text-xs font-semibold">
                Tiếp Tục Chỉnh Sửa
              </button>
<button className="px-4 py-1.5 rounded-lg bg-tertiary text-on-tertiary text-xs font-semibold hover:bg-tertiary-container shadow-sm">
                Lưu &amp; Thoát
              </button>
</div>
</div>
</div>
</div>
</section>

<section className="space-y-space-md">
<div className="flex items-center justify-between border-b border-outline-variant pb-3">
<div className="flex items-center gap-3">
<span className="w-2.5 h-6 bg-tertiary rounded-full"></span>
<h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
            SECTION G · Phân Quyền Vai Trò &amp; Cảnh Báo Hạn Chế Gian Hàng (RBAC &amp; Suspensions)
          </h2>
</div>
<span className="font-label-md text-label-md text-outline">RBAC Security Boundaries</span>
</div>
<div className="space-y-4">

<div className="p-4 rounded-xl border border-slate-300 bg-slate-100 flex items-center justify-between">
<div className="flex items-center gap-3">
<span className="material-symbols-outlined text-[24px] text-slate-700" data-icon="visibility">visibility</span>
<div>
<h4 className="font-title-md text-title-md font-bold text-slate-900">Chế Độ Chỉ Xem (Read-Only Access)</h4>
<p className="font-body-sm text-body-sm text-slate-700">Tài khoản của bạn thuộc nhóm 'Thực tập sinh / Khách'. Bạn có thể xem cấu trúc dữ liệu nhưng không thể lưu thay đổi hoặc gửi duyệt.</p>
</div>
</div>
<span className="text-xs bg-slate-200 text-slate-800 px-3 py-1 rounded font-semibold font-mono">ROLE: VIEWER</span>
</div>

<div className="p-4 rounded-xl border border-outline-variant bg-surface-container-lowest flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
<div className="flex items-start gap-3">
<div className="p-2 rounded bg-surface-container text-outline">
<span className="material-symbols-outlined text-[20px]" data-icon="price_check">price_check</span>
</div>
<div>
<div className="flex items-center gap-2">
<span className="font-title-md text-title-md font-bold text-on-surface">Phân Khu Giá Bán &amp; Chiết Khấu</span>
<span className="text-[11px] bg-red-100 text-red-800 px-2 py-0.5 rounded font-semibold">Khóa Quyền Hạn</span>
</div>
<p className="font-body-sm text-body-sm text-outline mt-0.5">
                Bạn không có quyền chỉnh sửa giá bán. Vui lòng liên hệ Quản trị viên (Chủ gian hàng) để cấp quyền 'Pricing Specialist'.
              </p>
</div>
</div>
<button className="px-3 py-1.5 rounded-lg border border-outline-variant text-xs font-semibold hover:bg-surface-container text-on-surface shrink-0">
            Yêu cầu cấp quyền
          </button>
</div>

<div className="p-4 rounded-xl border-2 border-orange-300 bg-orange-50/50 flex items-start gap-3">
<span className="material-symbols-outlined text-[24px] text-orange-700 shrink-0 mt-0.5" data-icon="gavel">gavel</span>
<div>
<h4 className="font-title-md text-title-md font-bold text-orange-950">Gian Hàng Đang Trong Chế Độ Tạm Hạn Chế</h4>
<p className="font-body-sm text-body-sm text-orange-900 mt-1">
              Gian hàng đang chờ bổ sung Giấy Phép Hoạt Động Phát Hành Xuất Bản Phẩm theo Nghị định mới. Trong thời gian này, bạn vẫn có thể soạn và lưu bản nháp, nhưng thao tác 'Gửi Duyệt Sản Phẩm Mới' tạm thời bị khóa đến hết ngày 30/11.
            </p>
</div>
</div>
</div>
</section>

<section className="space-y-space-md">
<div className="flex items-center justify-between border-b border-outline-variant pb-3">
<div className="flex items-center gap-3">
<span className="w-2.5 h-6 bg-tertiary rounded-full"></span>
<h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
            SECTION H · Hệ Thống Toast Thông Báo Chuẩn &amp; Trạng Thái Rỗng (Toasts &amp; Empty States)
          </h2>
</div>
<span className="font-label-md text-label-md text-outline">Design Tokens 8px Module</span>
</div>
<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

<div className="lg:col-span-6 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm space-y-3">
<h3 className="font-title-md text-title-md text-on-surface font-bold mb-2">Bộ 4 Toast Phản Hồi Tiêu Chuẩn (Snackbars)</h3>

<div className="p-3.5 rounded-xl bg-surface-container-lowest border border-emerald-200 shadow-md flex items-center justify-between">
<div className="flex items-center gap-3">
<span className="material-symbols-outlined text-emerald-600 text-[22px]" data-icon="check_circle">check_circle</span>
<span className="font-body-sm text-body-sm font-semibold text-on-surface">Đã lưu thông tin sách thành công</span>
</div>
<button className="text-outline hover:text-on-surface text-xs font-semibold">Đóng</button>
</div>

<div className="p-3.5 rounded-xl bg-surface-container-lowest border border-blue-200 shadow-md flex items-center justify-between">
<div className="flex items-center gap-3">
<span className="material-symbols-outlined text-blue-600 text-[22px]" data-icon="info">info</span>
<span className="font-body-sm text-body-sm font-semibold text-on-surface">Đang xử lý mục lục Ebook nền (12 trang còn lại)</span>
</div>
<button className="text-blue-600 hover:underline text-xs font-semibold">Xem chi tiết</button>
</div>

<div className="p-3.5 rounded-xl bg-surface-container-lowest border border-amber-200 shadow-md flex items-center justify-between">
<div className="flex items-center gap-3">
<span className="material-symbols-outlined text-amber-600 text-[22px]" data-icon="warning">warning</span>
<span className="font-body-sm text-body-sm font-semibold text-on-surface">Tồn kho sách giấy sắp hết (còn 2 cuốn khả dụng)</span>
</div>
<button className="text-amber-800 hover:underline text-xs font-semibold">Nhập thêm</button>
</div>

<div className="p-3.5 rounded-xl bg-surface-container-lowest border border-red-200 shadow-md flex items-center justify-between">
<div className="flex items-center gap-3">
<span className="material-symbols-outlined text-error text-[22px]" data-icon="error">error</span>
<span className="font-body-sm text-body-sm font-semibold text-on-surface">Lỗi tải tệp: Kích thước vượt quá 50MB</span>
</div>
<button className="text-error hover:underline text-xs font-semibold">Thử lại</button>
</div>
</div>

<div className="lg:col-span-6 space-y-4">

<div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-sm flex items-center gap-4">
<div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-outline shrink-0">
<span className="material-symbols-outlined text-[24px]" data-icon="search_off">search_off</span>
</div>
<div className="flex-1">
<span className="font-title-md text-title-md font-bold text-on-surface">Không tìm thấy tác giả "Haruki..."?</span>
<p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                Tác giả này chưa có trong thư viện HUKI Ebook. Bạn có thể đề xuất thêm mới.
              </p>
<button className="mt-2 text-xs text-tertiary font-bold hover:underline flex items-center gap-1">
<span className="material-symbols-outlined text-[14px]" data-icon="add_circle">add_circle</span> Đề xuất thêm hồ sơ tác giả mới
              </button>
</div>
</div>

<div className="bg-surface-container-lowest p-5 rounded-2xl border border-dashed border-outline-variant shadow-sm flex items-center justify-between">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded bg-surface-container flex items-center justify-center text-outline">
<span className="material-symbols-outlined text-[20px]" data-icon="collections">collections</span>
</div>
<div>
<span className="font-title-md text-title-md font-semibold text-on-surface">Thư Viện Ảnh Chi Tiết Trống</span>
<p className="font-body-sm text-body-sm text-outline">Thêm tối đa 8 ảnh chụp trang sách, gáy sách hoặc phụ kiện đi kèm.</p>
</div>
</div>
<button className="px-3 py-1.5 rounded-lg border border-outline-variant text-xs font-semibold hover:bg-surface-container">
              Tải Thêm Ảnh
            </button>
</div>
</div>
</div>
</section>

<section className="space-y-space-md">
<div className="flex items-center justify-between border-b border-outline-variant pb-3">
<div className="flex items-center gap-3">
<span className="w-2.5 h-6 bg-tertiary rounded-full"></span>
<h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
            SECTION I · Khung Thích Ứng Màn Hình Nhỏ &amp; Trực Quan Di Động (Mobile 360px Frame System)
          </h2>
</div>
<span className="font-label-md text-label-md text-outline">Mobile Viewport Simulation</span>
</div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">

<div className="mx-auto w-[360px] bg-[#FDFBF7] rounded-[28px] border-4 border-outline-variant p-4 shadow-xl flex flex-col justify-between h-[580px] relative overflow-hidden">

<div>
<div className="flex items-center justify-between text-xs text-outline mb-2 px-1">
<span className="font-bold">09:41</span>
<div className="flex items-center gap-1">
<span className="material-symbols-outlined text-[14px]" data-icon="signal_cellular_alt">signal_cellular_alt</span>
<span className="material-symbols-outlined text-[14px]" data-icon="battery_full">battery_full</span>
</div>
</div>

<div className="bg-primary text-on-primary p-2.5 rounded-lg text-xs flex items-center gap-2 shadow-sm mb-3">
<span className="material-symbols-outlined text-[18px]" data-icon="cloud_off">cloud_off</span>
<span className="leading-tight font-medium">Mất mạng · Bản sửa đang lưu trên máy</span>
</div>
<div className="bg-white p-3 rounded-xl border border-outline-variant shadow-sm space-y-2">
<span className="text-[10px] font-mono font-bold text-tertiary uppercase block">Tệp Ebook DRM</span>
<div className="flex items-center justify-between text-xs">
<span className="font-semibold text-on-surface truncate w-40">Atomic-Habits.epub</span>
<span className="text-tertiary font-bold">78%</span>
</div>
<div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
<div className="bg-tertiary h-1.5 rounded-full" style={{ width: '78%' }}></div>
</div>
<span className="text-[11px] text-outline block">Có thể tiếp tục chỉnh sửa trường khác</span>
</div>
</div>

<div className="bg-white p-3 rounded-xl border border-outline-variant shadow-lg flex items-center justify-between">
<div>
<span className="text-[10px] text-emerald-800 font-bold block">ĐÃ LƯU NHÁP</span>
<span className="text-[11px] text-outline">10:42 AM</span>
</div>
<button className="h-9 px-4 rounded-lg bg-tertiary text-on-tertiary text-xs font-semibold flex items-center gap-1">
<span>Gửi Duyệt</span>
<span className="material-symbols-outlined text-[14px]" data-icon="send">send</span>
</button>
</div>
</div>

<div className="mx-auto w-[360px] bg-[#FDFBF7] rounded-[28px] border-4 border-outline-variant p-4 shadow-xl flex flex-col justify-between h-[580px] relative overflow-hidden">
<div>
<div className="flex items-center justify-between text-xs text-outline mb-2 px-1">
<span className="font-bold">09:41</span>
<span className="material-symbols-outlined text-[14px]" data-icon="battery_full">battery_full</span>
</div>
<div className="p-3 bg-white rounded-xl border border-outline-variant text-xs opacity-40">
              [Nội dung nền bị làm mờ khi mở Bottom Sheet]
            </div>
</div>

<div className="bg-white -mx-4 -mb-4 p-4 rounded-t-2xl border-t-2 border-red-300 shadow-2xl space-y-3">
<div className="w-10 h-1 bg-outline-variant rounded-full mx-auto mb-2"></div>
<div className="flex items-center justify-between">
<span className="font-title-md text-title-md font-bold text-red-950 flex items-center gap-1.5">
<span className="material-symbols-outlined text-error text-[18px]" data-icon="warning">warning</span>
                Còn 3 Mục Cần Hoàn Tất
              </span>
<span className="material-symbols-outlined text-outline text-[18px] cursor-pointer" data-icon="close">close</span>
</div>
<div className="space-y-2 text-xs">
<div className="p-2 rounded-lg bg-red-50 text-red-900 flex items-center justify-between">
<span>Thiếu ảnh bìa chính (2:3)</span>
<span className="material-symbols-outlined text-[14px]" data-icon="chevron_right">chevron_right</span>
</div>
<div className="p-2 rounded-lg bg-red-50 text-red-900 flex items-center justify-between">
<span>Giá bán lớn hơn giá niêm yết</span>
<span className="material-symbols-outlined text-[14px]" data-icon="chevron_right">chevron_right</span>
</div>
<div className="p-2 rounded-lg bg-amber-50 text-amber-900 flex items-center justify-between">
<span>Chưa có tệp bản thảo Ebook</span>
<span className="material-symbols-outlined text-[14px]" data-icon="chevron_right">chevron_right</span>
</div>
</div>
<button className="w-full py-2 bg-surface-container text-outline text-xs font-semibold rounded-lg cursor-not-allowed">
              Chưa Thể Đệ Trình
            </button>
</div>
</div>

<div className="mx-auto w-[360px] bg-[#FDFBF7] rounded-[28px] border-4 border-outline-variant p-4 shadow-xl flex flex-col justify-between h-[580px] relative overflow-hidden">
<div>
<div className="flex items-center justify-between text-xs text-outline mb-2 px-1">
<span className="font-bold">09:41</span>
<span className="material-symbols-outlined text-[14px]" data-icon="battery_full">battery_full</span>
</div>
<div className="bg-white p-3 rounded-xl border border-outline-variant space-y-3">
<div className="flex items-center gap-2">
<div className="w-10 h-14 rounded bg-surface-container overflow-hidden shrink-0 border border-outline-variant spine-crease">
<img className="w-full h-full object-cover" alt="Hình thu nhỏ bìa sách mini trên giao diện điện thoại di động sắc nét với chi tiết thanh nhã." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBGEsw3O49e4OJIZugB2bow3Y4Sh7J-xJuLEfWpjxbqwnKbeil4zpP0PuquhhYyhwtTB5o-dlDZ9z46LECBtpYmGTFuhXHiE9bWZIGQr0s-g9V5HH6v8_0Ej_-KN0uT1mzlzDAa5u24gkaMwciWekRotHBAAYXRCNjmFLqHvTnfdZIaHitY8d8ZFVFNon49Lnb4tnhDlU1ECw87Vu7XqCTdbhtLNEgpRFvZaIRRe4VeiZ82b5Yt5mBIcw" />
</div>
<div>
<span className="font-body-sm text-body-sm font-bold block text-on-surface">Atomic Habits</span>
<span className="text-xs text-emerald-700 font-medium">Bản thảo hợp lệ</span>
</div>
</div>
</div>
</div>

<div className="bg-white p-3 rounded-xl border border-outline-variant shadow-lg space-y-2">
<button className="w-full h-10 rounded-lg bg-tertiary/80 text-on-tertiary text-xs font-semibold flex items-center justify-center gap-2" disabled="">
<svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
<path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
</svg>
<span>Đang Đồng Bộ Máy Chủ...</span>
</button>
<span className="text-[10px] text-center text-outline block">Vui lòng không đóng trình duyệt lúc này</span>
</div>
</div>
</div>
</section>
      </main>
    </div>
  );
}
