import React from 'react';
import { Link } from 'react-router-dom';

export default function SellerRegisterPage() {
  return (
    <div className="w-full bg-[#fbf9f5] text-on-surface font-body-md antialiased min-h-screen py-6">
      <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 lg:px-12 max-w-[1680px] mx-auto w-full">

<div className="flex flex-col md:flex-row md:items-end justify-between pb-8 border-b border-[#e8e5df] gap-4">
<div>
<div className="flex items-center gap-2 text-tertiary font-label-md uppercase tracking-wider mb-2">
<span className="material-symbols-outlined text-[18px]">business_center</span>
<span>Quy trình gia nhập hệ sinh thái xuất bản số HUKI</span>
</div>
<h1 className="font-display-lg text-[36px] lg:text-[42px] leading-[46px] lg:leading-[50px] font-medium text-on-surface tracking-tight">
              Đăng Ký Đối Tác &amp; Hồ Sơ Doanh Nghiệp
            </h1>
<p className="font-body-lg text-body-md text-[#59413c] mt-2 max-w-3xl">
              Hoàn tất thông tin pháp nhân để HUKI thẩm định và cấp chứng nhận quyền tạo gian hàng chính thức trên cổng phân phối sách giấy và sách điện tử bản quyền.
            </p>
</div>
<div className="flex items-center gap-2 bg-[#ffffff] border border-[#e8e5df] px-3.5 py-2 rounded-xl shadow-sm self-start md:self-auto shrink-0">
<span className="w-2 h-2 rounded-full bg-secondary-container animate-pulse"></span>
<span className="font-body-sm text-xs text-on-surface-variant font-medium">Hồ sơ: <strong className="font-title-md text-on-surface">Bản nháp #HK-REG-2026-8802</strong></span>
</div>
</div>

<section className="py-8 my-2">
<div className="relative">

<div className="stepper-line bg-[#e8e5df] w-full"></div>

<div className="stepper-line bg-tertiary" style={{ width: '20%' }}></div>

<div className="relative z-10 grid grid-cols-6 gap-2">

<div className="flex flex-col items-center text-center cursor-pointer group">
<div className="w-9 h-9 rounded-full bg-tertiary text-on-tertiary flex items-center justify-center font-title-md text-xs shadow-sm ring-4 ring-[#fbf9f5]">
<span className="material-symbols-outlined text-[20px]">check</span>
</div>
<span className="font-title-md text-xs text-tertiary mt-2">Bước 1</span>
<span className="font-body-sm text-xs font-medium text-on-surface">Loại Đơn Vị</span>
<span className="font-label-sm text-[11px] text-tertiary font-medium">Đã xác nhận</span>
</div>

<div className="flex flex-col items-center text-center">
<div className="w-9 h-9 rounded-full bg-tertiary text-on-tertiary flex items-center justify-center font-title-md text-sm shadow-md ring-4 ring-[#94f5d6]/40 ring-offset-2 ring-offset-[#fbf9f5]">
                  2
                </div>
<span className="font-title-md text-xs text-tertiary mt-2">Bước 2</span>
<span className="font-title-md text-xs text-on-surface">Thông Tin Doanh Nghiệp</span>
<span className="font-label-sm text-[11px] text-[#b02e1b] bg-[#ffdad4]/60 px-2 py-0.5 rounded-full mt-0.5">Đang thực hiện</span>
</div>

<div className="flex flex-col items-center text-center opacity-70 hover:opacity-100 transition-opacity">
<div className="w-9 h-9 rounded-full bg-surface-container-lowest text-on-surface-variant border border-[#e8e5df] flex items-center justify-center font-title-md text-xs ring-4 ring-[#fbf9f5]">
                  3
                </div>
<span className="font-body-sm text-xs text-on-surface-variant mt-2">Bước 3</span>
<span className="font-body-sm text-xs text-[#59413c]">Người Đại Diện</span>
<span className="font-label-sm text-[11px] text-[#8d706b]">Chưa bắt đầu</span>
</div>

<div className="flex flex-col items-center text-center opacity-70 hover:opacity-100 transition-opacity">
<div className="w-9 h-9 rounded-full bg-surface-container-lowest text-on-surface-variant border border-[#e8e5df] flex items-center justify-center font-title-md text-xs ring-4 ring-[#fbf9f5]">
                  4
                </div>
<span className="font-body-sm text-xs text-on-surface-variant mt-2">Bước 4</span>
<span className="font-body-sm text-xs text-[#59413c]">Liên Hệ &amp; Vận Hành</span>
<span className="font-label-sm text-[11px] text-[#8d706b]">Chưa bắt đầu</span>
</div>

<div className="flex flex-col items-center text-center opacity-70 hover:opacity-100 transition-opacity">
<div className="w-9 h-9 rounded-full bg-surface-container-lowest text-on-surface-variant border border-[#e8e5df] flex items-center justify-center font-title-md text-xs ring-4 ring-[#fbf9f5]">
                  5
                </div>
<span className="font-body-sm text-xs text-on-surface-variant mt-2">Bước 5</span>
<span className="font-body-sm text-xs text-[#59413c]">Hồ Sơ Xác Minh</span>
<span className="font-label-sm text-[11px] text-[#8d706b]">Chưa bắt đầu</span>
</div>

<div className="flex flex-col items-center text-center opacity-70 hover:opacity-100 transition-opacity">
<div className="w-9 h-9 rounded-full bg-surface-container-lowest text-on-surface-variant border border-[#e8e5df] flex items-center justify-center font-title-md text-xs ring-4 ring-[#fbf9f5]">
                  6
                </div>
<span className="font-body-sm text-xs text-on-surface-variant mt-2">Bước 6</span>
<span className="font-body-sm text-xs text-[#59413c]">Xem Lại &amp; Gửi</span>
<span className="font-label-sm text-[11px] text-[#8d706b]">Duyệt hồ sơ</span>
</div>
</div>
</div>
</section>

<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-16">

<div className="lg:col-span-8 bg-surface-container-lowest rounded-2xl border border-[#e8e5df] p-8 lg:p-10 shadow-[0_4px_20px_-2px_rgba(23,32,31,0.04)]">

<div className="bg-surface-container-low border border-[#d2dcda] rounded-xl p-4 flex items-center justify-between mb-8">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-lg bg-tertiary text-on-tertiary flex items-center justify-center shrink-0">
<span className="material-symbols-outlined text-[22px]">corporate_fare</span>
</div>
<div>
<div className="font-label-sm text-[11px] text-[#59413c] uppercase tracking-wider">Đơn vị đăng ký đã chọn</div>
<div className="font-title-md text-sm text-on-surface font-semibold mt-0.5">
                    DOANH NGHIỆP KINH DOANH SÁCH &amp; PHÁT HÀNH
                  </div>
</div>
</div>
<Link className="font-body-sm text-xs font-semibold text-primary hover:underline flex items-center gap-1 shrink-0 ml-4" to="/">
<span>Thay đổi loại đơn vị</span>
<span className="material-symbols-outlined text-[16px]">arrow_forward</span>
</Link>
</div>
<form className="space-y-8" onsubmit="event.preventDefault();">

<div className="border-b border-[#e8e5df] pb-8">
<div className="flex items-center gap-2 mb-1">
<span className="w-2.5 h-2.5 rounded-full bg-tertiary"></span>
<h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">1. Thông Tin Pháp Lý Doanh Nghiệp</h2>
</div>
<p className="font-body-sm text-xs text-[#6b7280] mb-6 pl-4">
                  Cung cấp thông tin đăng ký doanh nghiệp chính xác để xác thực quyền kinh doanh xuất bản phẩm theo quy định Bộ TT&amp;TT.
                </p>
<div className="space-y-5">

<div>
<label className="block font-title-md text-xs text-on-surface mb-2">
                      Tên doanh nghiệp / Tên pháp lý chính thức <span className="text-error">*</span>
</label>
<div className="relative">
<input className="w-full h-12 px-4 rounded-xl border border-[#e8e5df] bg-[#ffffff] font-body-md text-sm text-on-surface focus:border-tertiary focus:ring-1 focus:ring-tertiary transition-all" type="text" value="CÔNG TY TNHH PHÁT HÀNH SÁCH VÀ NỘI DUNG SỐ TRÍ TUỆ VIỆT" />
<span className="absolute right-3.5 top-3 text-tertiary material-symbols-outlined text-[20px]">check_circle</span>
</div>
<p className="font-body-sm text-[12px] text-[#6b7280] mt-1.5 flex items-center gap-1">
<span className="material-symbols-outlined text-[14px]">info</span>
                      Nhập chính xác từng ký tự theo Giấy chứng nhận Đăng ký Doanh nghiệp (ĐKKD).
                    </p>
</div>

<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
<div>
<label className="block font-title-md text-xs text-on-surface mb-2">
                        Mã số doanh nghiệp (MSDN) <span className="text-error">*</span>
</label>
<input className="w-full h-12 px-4 rounded-xl border border-[#e8e5df] bg-[#ffffff] font-body-md text-sm text-on-surface focus:border-tertiary focus:ring-1 focus:ring-tertiary" type="text" value="0318926410" />
</div>
<div>
<div className="flex items-center justify-between mb-2">
<label className="font-title-md text-xs text-on-surface">
                          Mã số thuế (MST) <span className="text-error">*</span>
</label>
<span className="font-label-sm text-[11px] text-tertiary bg-tertiary-container/10 px-2 py-0.5 rounded-md flex items-center gap-1 font-semibold">
<span className="material-symbols-outlined text-[13px]">done</span> Định dạng hợp lệ
                        </span>
</div>
<input className="w-full h-12 px-4 rounded-xl border border-tertiary bg-[#f2fbf9] font-body-md text-sm text-on-surface focus:border-tertiary focus:ring-1 focus:ring-tertiary font-mono" type="text" value="0318926410" />
</div>
</div>

<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
<div>
<label className="block font-title-md text-xs text-on-surface mb-2">
                        Ngày cấp / Ngày thành lập <span className="text-error">*</span>
</label>
<div className="relative">
<input className="w-full h-12 px-4 pl-11 rounded-xl border border-[#e8e5df] bg-[#ffffff] font-body-md text-sm text-on-surface focus:border-tertiary focus:ring-1 focus:ring-tertiary" type="text" value="15/04/2021" />
<span className="absolute left-3.5 top-3 text-[#6b7280] material-symbols-outlined text-[20px]">calendar_today</span>
</div>
</div>
<div>
<label className="block font-title-md text-xs text-on-surface mb-2">
                        Lĩnh vực hoạt động chính <span className="text-error">*</span>
</label>
<div className="relative">
<select className="w-full h-12 px-4 rounded-xl border border-[#e8e5df] bg-[#ffffff] font-body-md text-sm text-on-surface focus:border-tertiary focus:ring-1 focus:ring-tertiary appearance-none pr-10">
<option>Kinh doanh sách, xuất bản phẩm &amp; nội dung số</option>
<option>Nhà xuất bản sách giáo dục &amp; đại học</option>
<option>Đại lý phát hành &amp; phân phối sách nhập khẩu</option>
<option>Tổ hợp dịch thuật và sáng tác độc lập</option>
</select>
<span className="absolute right-3.5 top-3 text-[#6b7280] material-symbols-outlined text-[20px] pointer-events-none">expand_more</span>
</div>
</div>
</div>

<div>
<label className="block font-title-md text-xs text-on-surface mb-2">
                      Website chính thức của doanh nghiệp <span className="text-[#8d706b] font-normal">(Tùy chọn)</span>
</label>
<div className="relative">
<input className="w-full h-12 px-4 pl-11 rounded-xl border border-[#e8e5df] bg-[#ffffff] font-body-md text-sm text-on-surface focus:border-tertiary focus:ring-1 focus:ring-tertiary" type="url" value="https://trituevietbooks.vn" />
<span className="absolute left-3.5 top-3 text-[#6b7280] material-symbols-outlined text-[20px]">language</span>
</div>
</div>

<div>
<div className="flex items-center justify-between mb-2">
<label className="font-title-md text-xs text-on-surface">
                        Mô tả tóm tắt định hướng sách &amp; xuất bản <span className="text-error">*</span>
</label>
<span className="font-label-sm text-[11px] text-[#6b7280]">184 / 500 ký tự</span>
</div>
<textarea className="w-full p-4 rounded-xl border border-[#e8e5df] bg-[#ffffff] font-body-md text-sm text-on-surface focus:border-tertiary focus:ring-1 focus:ring-tertiary" rows="3">Chuyên phân phối các dòng sách kinh tế, tư duy, tâm lý ứng dụng và phát triển bản thân có bản quyền quốc tế và dịch thuật tiếng Việt, kết hợp cả sách giấy cao cấp và ebook có DRM.</textarea>
<p className="font-body-sm text-[12px] text-[#6b7280] mt-1">
                      Nội dung này giúp Ban Thư ký Xuất bản HUKI xem xét danh mục thể loại và cấp hạn mức băng thông phát hành sách điện tử phù hợp.
                    </p>
</div>
</div>
</div>

<div className="border-b border-[#e8e5df] pb-8">
<div className="flex items-center gap-2 mb-1">
<span className="w-2.5 h-2.5 rounded-full bg-tertiary"></span>
<h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">2. Địa Chỉ Đăng Ký Kinh Doanh (Trụ sở chính)</h2>
</div>
<p className="font-body-sm text-xs text-[#6b7280] mb-6 pl-4">
                  Địa chỉ phục vụ đối soát pháp lý hợp đồng phát hành, xuất hóa đơn VAT điện tử và gửi thông báo hành chính.
                </p>
<div className="space-y-5">

<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
<div>
<label className="block font-title-md text-xs text-on-surface mb-2">Tỉnh / Thành phố <span className="text-error">*</span></label>
<div className="relative">
<select className="w-full h-12 px-3 rounded-xl border border-[#e8e5df] bg-[#ffffff] font-body-md text-sm text-on-surface focus:border-tertiary focus:ring-1 focus:ring-tertiary appearance-none pr-9">
<option>TP. Hồ Chí Minh</option>
<option>TP. Hà Nội</option>
<option>TP. Đà Nẵng</option>
<option>TP. Cần Thơ</option>
</select>
<span className="absolute right-2.5 top-3 text-[#6b7280] material-symbols-outlined text-[18px] pointer-events-none">expand_more</span>
</div>
</div>
<div>
<label className="block font-title-md text-xs text-on-surface mb-2">Quận / Huyện <span className="text-error">*</span></label>
<div className="relative">
<select className="w-full h-12 px-3 rounded-xl border border-[#e8e5df] bg-[#ffffff] font-body-md text-sm text-on-surface focus:border-tertiary focus:ring-1 focus:ring-tertiary appearance-none pr-9">
<option>Quận 1</option>
<option>Quận 3</option>
<option>Quận Bình Thạnh</option>
<option>TP. Thủ Đức</option>
</select>
<span className="absolute right-2.5 top-3 text-[#6b7280] material-symbols-outlined text-[18px] pointer-events-none">expand_more</span>
</div>
</div>
<div>
<label className="block font-title-md text-xs text-on-surface mb-2">Phường / Xã <span className="text-error">*</span></label>
<div className="relative">
<select className="w-full h-12 px-3 rounded-xl border border-[#e8e5df] bg-[#ffffff] font-body-md text-sm text-on-surface focus:border-tertiary focus:ring-1 focus:ring-tertiary appearance-none pr-9">
<option>Phường Bến Nghé</option>
<option>Phường Đa Kao</option>
<option>Phường Bến Thành</option>
</select>
<span className="absolute right-2.5 top-3 text-[#6b7280] material-symbols-outlined text-[18px] pointer-events-none">expand_more</span>
</div>
</div>
</div>

<div>
<label className="block font-title-md text-xs text-on-surface mb-2">
                      Địa chỉ chi tiết (Số nhà, tên đường, tòa nhà) <span className="text-error">*</span>
</label>
<input className="w-full h-12 px-4 rounded-xl border border-[#e8e5df] bg-[#ffffff] font-body-md text-sm text-on-surface focus:border-tertiary focus:ring-1 focus:ring-tertiary" type="text" value="Tầng 6, Tòa nhà Văn phòng Tri Thức, 45 Lê Duẩn" />
</div>

<div className="pt-2">
<label className="flex items-start gap-3 cursor-pointer select-none">
<input defaultChecked className="mt-1 w-4 h-4 text-tertiary rounded border-[#8d706b] focus:ring-tertiary" type="checkbox" />
<span className="font-body-md text-sm text-on-surface">
                        Tôi cam kết địa chỉ trụ sở chính trên hoàn toàn trùng khớp với thông tin ghi trong Giấy phép đăng ký kinh doanh và sẵn sàng tiếp nhận kiểm tra thực tế nếu được yêu cầu.
                      </span>
</label>
</div>
</div>
</div>

<div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
<button className="w-full sm:w-auto px-5 py-3 rounded-xl border border-[#e8e5df] bg-surface-container-lowest hover:bg-[#fbf9f5] text-on-surface font-title-md text-xs flex items-center justify-center gap-2 transition-all shadow-sm" type="button">
<span className="material-symbols-outlined text-[18px]">arrow_back</span>
<span>Quay Lại (Bước 1: Loại Đơn Vị)</span>
</button>
<div className="flex items-center gap-3 w-full sm:w-auto">
<button className="w-full sm:w-auto px-5 py-3 rounded-xl border border-[#e8e5df] bg-[#ffffff] hover:bg-surface-container-low text-on-surface font-title-md text-xs transition-all" type="button">
                    Lưu Bản Nháp
                  </button>
<button className="w-full sm:w-auto px-7 py-3 rounded-xl bg-tertiary hover:bg-[#004D38] text-on-tertiary font-title-md text-xs flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(0,105,83,0.3)] hover:shadow-lg transition-all" type="button">
<span>Tiếp Tục: Người Đại Diện</span>
<span className="material-symbols-outlined text-[18px]">arrow_forward</span>
</button>
</div>
</div>
</form>
</div>

<div className="lg:col-span-4 space-y-6 lg:sticky lg:top-28">

<div className="bg-surface-container-lowest border border-[#e8e5df] rounded-2xl p-6 shadow-sm">
<div className="flex items-center justify-between mb-3">
<div className="font-headline-sm text-sm font-semibold text-on-surface">Tiến Độ Hoàn Thành</div>
<span className="font-title-md text-xs text-tertiary font-bold">33%</span>
</div>

<div className="w-full h-2 bg-surface-container rounded-full overflow-hidden mb-4">
<div className="h-full bg-tertiary rounded-full transition-all duration-500" style={{ width: '33%' }}></div>
</div>
<div className="text-xs text-[#6b7280] font-body-sm mb-4">
                Bước 2 trên 6: Nhập thông tin pháp nhân thương mại
              </div>

<div className="space-y-3 pt-3 border-t border-[#e8e5df] text-xs">
<div className="flex items-center gap-2 text-tertiary">
<span className="material-symbols-outlined text-[18px]">check_circle</span>
<span className="font-medium line-through opacity-80">Đã chọn loại hình doanh nghiệp</span>
</div>
<div className="flex items-center gap-2 text-on-surface font-semibold bg-surface-container-low p-2 rounded-lg">
<span className="material-symbols-outlined text-[18px] text-tertiary">radio_button_checked</span>
<span>Đang nhập thông tin pháp lý &amp; trụ sở</span>
</div>
<div className="flex items-center gap-2 text-[#8d706b]">
<span className="material-symbols-outlined text-[18px]">radio_button_unchecked</span>
<span>Người đại diện pháp luật &amp; CCCD</span>
</div>
<div className="flex items-center gap-2 text-[#8d706b]">
<span className="material-symbols-outlined text-[18px]">radio_button_unchecked</span>
<span>Địa chỉ lấy hàng &amp; liên hệ vận hành</span>
</div>
<div className="flex items-center gap-2 text-[#8d706b]">
<span className="material-symbols-outlined text-[18px]">radio_button_unchecked</span>
<span>Bản scan Giấy ĐKKD (PDF/JPG)</span>
</div>
<div className="flex items-center gap-2 text-[#8d706b]">
<span className="material-symbols-outlined text-[18px]">radio_button_unchecked</span>
<span>Giấy ủy quyền / Bản quyền phát hành</span>
</div>
</div>
</div>

<div className="bg-surface-container-lowest border border-[#e8e5df] rounded-2xl p-6 shadow-sm relative overflow-hidden">
<div className="flex items-start gap-3">
<div className="w-8 h-8 rounded-lg bg-surface-container-low text-tertiary flex items-center justify-center shrink-0 mt-0.5">
<span className="material-symbols-outlined text-[20px]">policy</span>
</div>
<div>
<h3 className="font-headline-sm text-sm font-semibold text-on-surface">Tại Sao HUKI Cần Thông Tin Này?</h3>
<p className="font-body-sm text-xs text-[#59413c] mt-2 leading-relaxed">
                    HUKI là sàn thương mại điện tử sách có <strong>bảo hộ bản quyền DRM quốc gia</strong>. Thông tin pháp nhân và mã số thuế giúp hệ thống xác thực người bán chính thống, bảo vệ quyền tác giả và xuất hóa đơn điện tử hợp pháp cho độc giả theo chuẩn quy định.
                  </p>
</div>
</div>
</div>

<div className="bg-[#ffffff] border border-[#e8e5df] rounded-2xl p-6 shadow-sm">
<div className="flex items-start gap-3">
<div className="w-8 h-8 rounded-lg bg-[#ffdad4]/30 text-primary flex items-center justify-center shrink-0 mt-0.5">
<span className="material-symbols-outlined text-[20px]">encrypted</span>
</div>
<div>
<h3 className="font-headline-sm text-sm font-semibold text-on-surface">Cam Kết Bảo Mật 100%</h3>
<p className="font-body-sm text-xs text-[#59413c] mt-2 leading-relaxed">
                    Hồ sơ đăng ký doanh nghiệp của bạn được mã hóa an toàn 256-bit và chỉ phục vụ duy nhất cho mục đích thẩm định gian hàng, tuyệt đối không chia sẻ hay công khai trên sàn giao dịch.
                  </p>
</div>
</div>
</div>

<div className="bg-surface-container-low/70 border border-[#d2dcda] rounded-2xl p-6 shadow-sm">
<h3 className="font-headline-sm text-sm font-semibold text-on-surface mb-3 flex items-center gap-2">
<span className="material-symbols-outlined text-tertiary text-[18px]">contact_phone</span>
<span>Ban Hỗ Trợ Đối Tác B2B</span>
</h3>
<div className="space-y-2.5 text-xs font-body-sm text-on-surface">
<div className="flex items-center justify-between">
<span className="text-[#6b7280]">Hotline thẩm định:</span>
<span className="font-title-md text-tertiary font-bold">1900 8866 (Nhánh 2)</span>
</div>
<div className="flex items-center justify-between">
<span className="text-[#6b7280]">Email tiếp nhận:</span>
<span className="font-title-md text-on-surface select-all">publisher@hukiebook.vn</span>
</div>
<div className="flex items-center justify-between">
<span className="text-[#6b7280]">Thời gian xử lý:</span>
<span className="font-medium text-on-surface">Từ 24h – 48h làm việc</span>
</div>
</div>
<div className="mt-4 pt-3 border-t border-[#d2dcda]">
<Link className="flex items-center gap-1.5 text-tertiary hover:underline text-xs font-title-md" to="/seller/register">
<span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
<span>Tải Sổ tay hướng dẫn đăng ký đối tác (PDF)</span>
</Link>
</div>
</div>
</div>
</div>
      </main>
    </div>
  );
}
