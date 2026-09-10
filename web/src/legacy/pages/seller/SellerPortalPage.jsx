import React from 'react';
import { Link } from 'react-router-dom';

export default function SellerPortalPage() {
  return (
    <div className="w-full bg-[#FAF8F5] text-on-surface antialiased min-h-screen py-6">
      <main className="flex-1 w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8">

<section className="grid grid-cols-12 gap-gutter items-center py-space-xl border-b border-[#E8E5DF]">
<div className="col-span-12 lg:col-span-7 flex flex-col gap-space-md">

<div className="inline-flex items-center gap-2 bg-[#FAF3EE] border border-outline-variant/60 px-3.5 py-1.5 rounded-full w-fit">
<span className="material-symbols-outlined text-primary text-[18px]">auto_awesome</span>
<span className="font-label-sm uppercase tracking-wider text-primary font-bold">KÊNH NGƯỜI BÁN HUKI</span>
<span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
<span className="font-label-sm text-tertiary font-semibold">Cổng Đăng Ký Đối Tác Chính Thức</span>
</div>

<h1 className="font-display-lg text-[40px] sm:text-[48px] lg:text-[50px] leading-[1.15] text-on-surface tracking-tight">
            Đưa Sách Của Bạn Đến Gần Hơn Với <span className="italic text-tertiary font-normal">Độc Giả Tinh Hoa</span>
</h1>

<p className="font-body-lg text-[15px] sm:text-[16px] leading-[26px] text-on-surface-variant max-w-[620px]">
            HUKI giúp nhà sách, nhà xuất bản và đơn vị phát hành tiếp cận cộng đồng độc giả yêu sách có sức mua cao, quản lý sản phẩm, vận hành đơn hàng vật lý và bảo mật phân phối ebook trên cùng một hệ sinh thái chuyên biệt.
          </p>

<div className="flex flex-wrap items-center gap-4 pt-2">
<Link className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg bg-tertiary text-white font-title-md text-[15px] hover:bg-[#005140] transition-all shadow-sm hover:shadow-md" to="/seller/edge-cases">
<span className="material-symbols-outlined text-[20px] fill-icon">add_business</span>
              Đăng Ký Bán Hàng Ngay
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
</Link>
<Link className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-white border border-[#E8E5DF] text-on-surface font-title-md text-[15px] hover:bg-surface-container transition-all" to="/seller/product/edit-hybrid">
              Tìm Hiểu Quy Trình
            </Link>
<Link className="font-title-md text-[14px] text-primary hover:underline ml-2 flex items-center gap-1" to="/profile">
              Đã có tài khoản người bán? Đăng nhập →
            </Link>
</div>

<div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-6 pt-4 border-t border-[#E8E5DF] max-w-[640px]">
<div className="flex items-center gap-2 text-on-surface font-body-sm text-[13px]">
<span className="w-4 h-4 rounded-full bg-tertiary-fixed flex items-center justify-center text-tertiary text-[11px] font-bold shrink-0">✓</span>
<span>Đăng ký trực tuyến minh bạch &amp; nhanh chóng</span>
</div>
<div className="flex items-center gap-2 text-on-surface font-body-sm text-[13px]">
<span className="w-4 h-4 rounded-full bg-tertiary-fixed flex items-center justify-center text-tertiary text-[11px] font-bold shrink-0">✓</span>
<span>Hỗ trợ cả Sách Giấy &amp; Ebook DRM-free / Bản quyền</span>
</div>
<div className="flex items-center gap-2 text-on-surface font-body-sm text-[13px]">
<span className="w-4 h-4 rounded-full bg-tertiary-fixed flex items-center justify-center text-tertiary text-[11px] font-bold shrink-0">✓</span>
<span>Quản lý đơn hàng &amp; tồn kho tập trung</span>
</div>
<div className="flex items-center gap-2 text-on-surface font-body-sm text-[13px]">
<span className="w-4 h-4 rounded-full bg-tertiary-fixed flex items-center justify-center text-tertiary text-[11px] font-bold shrink-0">✓</span>
<span>Kết nối tức thì vào Tủ Sách cá nhân bạn đọc</span>
</div>
</div>
</div>

<div className="col-span-12 lg:col-span-5 relative mt-6 lg:mt-0">
<div className="relative bg-white rounded-2xl p-6 border border-[#E8E5DF] subtle-paper-shadow">

<div className="flex items-center justify-between pb-4 border-b border-[#E8E5DF]">
<div className="flex items-center gap-2.5">
<div className="w-8 h-8 rounded-lg bg-[#FAF3EE] text-primary flex items-center justify-center">
<span className="material-symbols-outlined text-[20px]">dashboard</span>
</div>
<div>
<h4 className="font-title-md text-[14px] text-on-surface">Trung Tâm Điều Hành NXB</h4>
<p className="font-label-sm text-[11px] text-[#8D706B]">Cửa hàng: <strong className="text-tertiary">First News - Trí Việt</strong></p>
</div>
</div>
<span className="px-2.5 py-1 rounded-full text-[11px] font-label-sm font-semibold bg-tertiary/10 text-tertiary border border-tertiary/20">
                ● Gian hàng chính thức
              </span>
</div>

<div className="grid grid-cols-3 gap-3 my-4">
<div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#E8E5DF]/70">
<span className="font-label-sm text-[11px] text-[#8D706B]">Đơn hoàn tất</span>
<p className="font-headline-sm text-[20px] font-bold text-tertiary mt-0.5">156</p>
<span className="text-[10px] text-tertiary font-label-sm">+18% tuần này</span>
</div>
<div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#E8E5DF]/70">
<span className="font-label-sm text-[11px] text-[#8D706B]">Tồn kho sách</span>
<p className="font-headline-sm text-[20px] font-bold text-on-surface mt-0.5">124</p>
<span className="text-[10px] text-[#8D706B] font-label-sm">Đầu sách sẵn kho</span>
</div>
<div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#E8E5DF]/70">
<span className="font-label-sm text-[11px] text-[#8D706B]">Lượt đọc Ebook</span>
<p className="font-headline-sm text-[20px] font-bold text-primary mt-0.5">1.840</p>
<span className="text-[10px] text-primary font-label-sm">DRM kích hoạt</span>
</div>
</div>

<div className="bg-surface-container-low/50 rounded-xl p-3.5 border border-[#E8E5DF] flex gap-4 items-center">
<div className="w-16 h-22 rounded-md bg-[#FAF8F5] overflow-hidden relative flex-shrink-0 spine-crease border border-[#E8E5DF]">
<img className="w-full h-full object-cover" alt="A clean modern book cover artwork titled Atomic Habits displayed in high-end editorial lighting with crisp typography and warm ivory accents suited for a Vietnamese premium digital bookstore showcase." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBdWMeXEblshUvrgkN1PQxMN_YSC3gCIhoCCaxXM20STtBCOmo2_rTchmZDem61NrJWNeo5u5wVlI2PlZx60J_g_YKfi9UjhYNH27HHLmxz1VftG1CiJtBX-Tst6ZlEkRh_S-VeaexV3vo_PrXnTr_JlnecmuQ-Wcym_0pTTN7JBBDHOF-svSHiyOhXYuLGYQ5FYxNbbZW9xfiopaUzRj9560MH2_s8SyMh372C9JpuYpGzOyFOPEyRJg" />
</div>
<div className="flex-1 min-w-0">
<div className="flex items-center gap-2 mb-1 flex-wrap">
<span className="px-2 py-0.5 rounded text-[10px] font-label-sm font-semibold bg-primary/10 text-primary">Sách Giấy + Ebook</span>
<span className="text-[11px] text-tertiary font-semibold flex items-center gap-0.5">
<span className="material-symbols-outlined text-[13px]">lock</span> Bản quyền số
                  </span>
</div>
<h5 className="font-title-md text-[14px] text-on-surface leading-tight truncate">Atomic Habits - Thay Đổi Tí Hon</h5>
<p className="font-body-sm text-[12px] text-[#8D706B] truncate">James Clear · Bản dịch độc quyền</p>
<div className="flex items-center justify-between mt-2 pt-2 border-t border-[#E8E5DF]">
<span className="font-title-md text-[14px] text-primary">129.000 đ</span>
<span className="text-[11px] font-label-sm text-tertiary bg-white px-2 py-0.5 rounded border border-[#E8E5DF]">
                    Đồng bộ HUKI Reader ✓
                  </span>
</div>
</div>
</div>

<div className="absolute -bottom-4 -left-4 bg-white px-4 py-2.5 rounded-xl border border-[#E8E5DF] shadow-lg flex items-center gap-3">
<div className="w-7 h-7 rounded-full bg-secondary-container/20 text-secondary flex items-center justify-center shrink-0">
<span className="material-symbols-outlined text-[16px]">sync_saved_locally</span>
</div>
<div>
<p className="font-title-md text-[12px] text-on-surface">Đồng bộ tức thì 0.8s</p>
<p className="font-label-sm text-[10px] text-[#8D706B]">Đơn hàng tự động nạp vào Tủ Sách</p>
</div>
</div>
</div>
</div>
</section>

<section className="py-space-2xl border-b border-[#E8E5DF]">
<div className="text-center max-w-[720px] mx-auto mb-space-xl">
<span className="font-label-sm uppercase tracking-wider text-tertiary font-bold">Đối Tác Mục Tiêu</span>
<h2 className="font-headline-lg text-[34px] text-on-surface mt-1">Ai Có Thể Trở Thành Đối Tác Của HUKI?</h2>
<p className="font-body-md text-[15px] text-on-surface-variant mt-2">
            Hệ sinh thái mở nhưng chuẩn hóa, thiết kế chuyên biệt cho mọi đơn vị hoạt động chuyên nghiệp trong lĩnh vực xuất bản và phát hành tri thức.
          </p>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">

<div className="bg-white rounded-2xl p-6 border border-[#E8E5DF] subtle-paper-shadow hover-lift flex flex-col justify-between">
<div>
<div className="w-12 h-12 rounded-xl bg-[#FAF3EE] text-primary flex items-center justify-center mb-4">
<span className="material-symbols-outlined text-[26px]">store</span>
</div>
<h3 className="font-headline-sm text-[18px] text-on-surface mb-2">Nhà Sách Truyền Thống &amp; Độc Lập</h3>
<p className="font-body-sm text-[13px] leading-[20px] text-on-surface-variant">
                Các chuỗi nhà sách, hiệu sách độc lập mong muốn mở rộng tệp bạn đọc online, giải quyết tồn kho và bổ sung kênh doanh thu trực tuyến linh hoạt.
              </p>
</div>
<div className="mt-6 pt-4 border-t border-[#E8E5DF] flex items-center justify-between text-tertiary font-title-md text-[12px]">
<span>Tối ưu vận hành</span>
<span className="material-symbols-outlined text-[16px]">arrow_forward</span>
</div>
</div>

<div className="bg-white rounded-2xl p-6 border border-tertiary/30 subtle-paper-shadow hover-lift flex flex-col justify-between relative overflow-hidden">
<div className="absolute top-0 right-0 bg-tertiary text-white text-[10px] font-label-sm font-semibold px-2.5 py-0.5 rounded-bl-lg">Ưu tiên kết nối</div>
<div>
<div className="w-12 h-12 rounded-xl bg-tertiary/10 text-tertiary flex items-center justify-center mb-4">
<span className="material-symbols-outlined text-[26px]">history_edu</span>
</div>
<h3 className="font-headline-sm text-[18px] text-on-surface mb-2">Nhà Xuất Bản (NXB)</h3>
<p className="font-body-sm text-[13px] leading-[20px] text-on-surface-variant">
                Đơn vị xuất bản trực tiếp phát hành sách in và sở hữu bản quyền số tiêu chuẩn quốc gia. Hỗ trợ khóa bảo mật DRM độc quyền và đối soát minh bạch.
              </p>
</div>
<div className="mt-6 pt-4 border-t border-[#E8E5DF] flex items-center justify-between text-tertiary font-title-md text-[12px]">
<span>Bảo vệ bản quyền số</span>
<span className="material-symbols-outlined text-[16px]">arrow_forward</span>
</div>
</div>

<div className="bg-white rounded-2xl p-6 border border-[#E8E5DF] subtle-paper-shadow hover-lift flex flex-col justify-between">
<div>
<div className="w-12 h-12 rounded-xl bg-secondary-container/15 text-secondary flex items-center justify-center mb-4">
<span className="material-symbols-outlined text-[26px]">local_shipping</span>
</div>
<h3 className="font-headline-sm text-[18px] text-on-surface mb-2">Công Ty Phát Hành Sách</h3>
<p className="font-body-sm text-[13px] leading-[20px] text-on-surface-variant">
                Các đơn vị phân phối đại diện tác phẩm, sách dịch và bản quyền tri thức. Tận dụng mạng lưới vận chuyển liên kết toàn quốc với biểu phí trợ giá.
              </p>
</div>
<div className="mt-6 pt-4 border-t border-[#E8E5DF] flex items-center justify-between text-tertiary font-title-md text-[12px]">
<span>Giao vận toàn quốc</span>
<span className="material-symbols-outlined text-[16px]">arrow_forward</span>
</div>
</div>

<div className="bg-white rounded-2xl p-6 border border-[#E8E5DF] subtle-paper-shadow hover-lift flex flex-col justify-between">
<div>
<div className="w-12 h-12 rounded-xl bg-surface-container text-on-surface flex items-center justify-center mb-4">
<span className="material-symbols-outlined text-[26px]">business_center</span>
</div>
<h3 className="font-headline-sm text-[18px] text-on-surface mb-2">Doanh Nghiệp &amp; Học Viện</h3>
<p className="font-body-sm text-[13px] leading-[20px] text-on-surface-variant">
                Tổ chức giáo dục, studio sáng tạo nội dung, trường học phát hành giáo trình chuyên khảo, báo cáo nghiên cứu và sách chuyên ngành bản quyền.
              </p>
</div>
<div className="mt-6 pt-4 border-t border-[#E8E5DF] flex items-center justify-between text-tertiary font-title-md text-[12px]">
<span>Phân phối tổ chức</span>
<span className="material-symbols-outlined text-[16px]">arrow_forward</span>
</div>
</div>
</div>
</section>

<section className="py-space-2xl border-b border-[#E8E5DF]" id="value-prop">
<div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-space-xl">
<div>
<span className="font-label-sm uppercase tracking-wider text-primary font-bold">Tính Năng Cốt Lõi</span>
<h2 className="font-headline-lg text-[34px] text-on-surface mt-1">
              Một Nền Tảng Cho Toàn Bộ Hoạt Động Kinh Doanh Sách
            </h2>
</div>
<p className="font-body-md text-[14px] text-on-surface-variant max-w-[420px] md:text-right">
            Không còn phải tách rời khâu bán sách giấy với cung cấp bản đọc điện tử. Mọi thứ quy về một màn hình điều khiển duy nhất.
          </p>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">

<div className="bg-white rounded-2xl p-6 border border-[#E8E5DF] subtle-paper-shadow hover-lift">
<div className="flex items-center gap-3 mb-3">
<div className="w-10 h-10 rounded-lg bg-tertiary/10 text-tertiary flex items-center justify-center shrink-0">
<span className="material-symbols-outlined text-[22px]">import_contacts</span>
</div>
<h4 className="font-title-lg text-[17px] text-on-surface">Bán Sách Giấy Vật Lý</h4>
</div>
<p className="font-body-sm text-[13px] leading-[22px] text-on-surface-variant">
              Tự do quản lý giá bìa, chiết khấu đại lý, số lượng tồn kho theo từng kho hàng và tự động đẩy mã vận đơn đến Viettel Post, GHN, GHTK chỉ bằng 1 cú nhấp chuột.
            </p>
</div>

<div className="bg-white rounded-2xl p-6 border border-[#E8E5DF] subtle-paper-shadow hover-lift">
<div className="flex items-center gap-3 mb-3">
<div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
<span className="material-symbols-outlined text-[22px]">devices</span>
</div>
<h4 className="font-title-lg text-[17px] text-on-surface">Phân Phối Ebook Bản Quyền</h4>
</div>
<p className="font-body-sm text-[13px] leading-[22px] text-on-surface-variant">
              Bảo vệ nội dung bằng công nghệ DRM độc quyền, chống sao chép và tải lậu. Tự động cấp quyền đọc vào HUKI Library và mở mượt mà trên ứng dụng HUKI Reader.
            </p>
</div>

<div className="bg-white rounded-2xl p-6 border border-[#E8E5DF] subtle-paper-shadow hover-lift">
<div className="flex items-center gap-3 mb-3">
<div className="w-10 h-10 rounded-lg bg-secondary-container/20 text-secondary flex items-center justify-center shrink-0">
<span className="material-symbols-outlined text-[22px]">manage_accounts</span>
</div>
<h4 className="font-title-lg text-[17px] text-on-surface">Quản Lý Gian Hàng &amp; Nhân Sự</h4>
</div>
<p className="font-body-sm text-[13px] leading-[22px] text-on-surface-variant">
              Phân quyền chặt chẽ giữa Chủ sở hữu, Quản lý kho, Kế toán và Chăm sóc khách hàng. Kiểm soát lịch sử chỉnh sửa giá và cập nhật tồn kho minh bạch.
            </p>
</div>

<div className="bg-white rounded-2xl p-6 border border-[#E8E5DF] subtle-paper-shadow hover-lift">
<div className="flex items-center gap-3 mb-3">
<div className="w-10 h-10 rounded-lg bg-[#FAF3EE] text-primary flex items-center justify-center shrink-0">
<span className="material-symbols-outlined text-[22px]">receipt_long</span>
</div>
<h4 className="font-title-lg text-[17px] text-on-surface">Quản Lý Đơn Hàng Tập Trung</h4>
</div>
<p className="font-body-sm text-[13px] leading-[22px] text-on-surface-variant">
              Theo dõi mạch lạc trạng thái từng đơn hàng: Chờ xác nhận, Đang chuẩn bị, Đang giao, Đã hoàn tất và Quản lý đối soát doanh thu theo chu kỳ thanh toán linh hoạt.
            </p>
</div>

<div className="bg-white rounded-2xl p-6 border border-[#E8E5DF] subtle-paper-shadow hover-lift">
<div className="flex items-center gap-3 mb-3">
<div className="w-10 h-10 rounded-lg bg-tertiary-fixed-dim/30 text-tertiary flex items-center justify-center shrink-0">
<span className="material-symbols-outlined text-[22px]">loyalty</span>
</div>
<h4 className="font-title-lg text-[17px] text-on-surface">Khuyến Mãi &amp; Chiến Dịch Sách</h4>
</div>
<p className="font-body-sm text-[13px] leading-[22px] text-on-surface-variant">
              Khởi tạo mã giảm giá riêng, tham gia các ngày hội sách HUKI BookFair, nhận trợ giá đồng hành từ sàn và tích hợp điểm thưởng BookPoint kích cầu độc giả.
            </p>
</div>

<div className="bg-white rounded-2xl p-6 border border-[#E8E5DF] subtle-paper-shadow hover-lift">
<div className="flex items-center gap-3 mb-3">
<div className="w-10 h-10 rounded-lg bg-surface-container text-on-surface flex items-center justify-center shrink-0">
<span className="material-symbols-outlined text-[22px]">monitoring</span>
</div>
<h4 className="font-title-lg text-[17px] text-on-surface">Báo Cáo &amp; Thấu Hiểu Độc Giả</h4>
</div>
<p className="font-body-sm text-[13px] leading-[22px] text-on-surface-variant">
              Trực quan hóa lượng sách bán ra, số trang ebook được đọc thực tế, tác phẩm được bookmark nhiều nhất và mức độ tương tác thảo luận từ cộng đồng.
            </p>
</div>
</div>
</section>

<section className="py-space-2xl border-b border-[#E8E5DF]">
<div className="text-center max-w-[760px] mx-auto mb-space-xl">
<span className="font-label-sm uppercase tracking-wider text-tertiary font-bold">Vòng Lặp Giá Trị</span>
<h2 className="font-headline-lg text-[34px] text-on-surface mt-1">
            Hệ Sinh Thái Khác Biệt: "Không Chỉ Là Một Nơi Bán Sách"
          </h2>
<p className="font-body-md text-[15px] text-on-surface-variant mt-2">
            Khác biệt lớn nhất của HUKI là sự gắn kết khép kín giữa Giao dịch thương mại - Tủ sách cá nhân - Trình đọc số - Mạng xã hội bạn đọc.
          </p>
</div>

<div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E8E5DF] subtle-paper-shadow mb-space-xl overflow-x-auto">
<div className="flex items-center justify-between min-w-[760px] relative">

<div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-tertiary via-primary to-tertiary -z-0 opacity-25"></div>

<div className="relative z-10 flex flex-col items-center text-center max-w-[120px]">
<div className="w-13 h-13 rounded-2xl bg-[#FAF8F5] border-2 border-tertiary flex items-center justify-center text-tertiary shadow-sm mb-2 p-3">
<span className="material-symbols-outlined text-[24px]">storefront</span>
</div>
<span className="font-title-md text-[13px] text-on-surface leading-snug">Gian Hàng Đối Tác</span>
<span className="font-label-sm text-[10px] text-[#8D706B] mt-0.5">NXB đăng tải</span>
</div>
<span className="material-symbols-outlined text-outline-variant text-[20px] relative z-10">chevron_right</span>

<div className="relative z-10 flex flex-col items-center text-center max-w-[120px]">
<div className="w-13 h-13 rounded-2xl bg-[#FAF8F5] border-2 border-primary flex items-center justify-center text-primary shadow-sm mb-2 p-3">
<span className="material-symbols-outlined text-[24px]">menu_book</span>
</div>
<span className="font-title-md text-[13px] text-on-surface leading-snug">Sách Giấy &amp; Ebook</span>
<span className="font-label-sm text-[10px] text-[#8D706B] mt-0.5">Định dạng đa dạng</span>
</div>
<span className="material-symbols-outlined text-outline-variant text-[20px] relative z-10">chevron_right</span>

<div className="relative z-10 flex flex-col items-center text-center max-w-[120px]">
<div className="w-13 h-13 rounded-2xl bg-[#FAF8F5] border-2 border-secondary-container flex items-center justify-center text-secondary shadow-sm mb-2 p-3">
<span className="material-symbols-outlined text-[24px]">travel_explore</span>
</div>
<span className="font-title-md text-[13px] text-on-surface leading-snug">Độc Giả Khám Phá</span>
<span className="font-label-sm text-[10px] text-[#8D706B] mt-0.5">AI gợi ý đúng tệp</span>
</div>
<span className="material-symbols-outlined text-outline-variant text-[20px] relative z-10">chevron_right</span>

<div className="relative z-10 flex flex-col items-center text-center max-w-[120px]">
<div className="w-13 h-13 rounded-2xl bg-[#FAF8F5] border-2 border-tertiary flex items-center justify-center text-tertiary shadow-sm mb-2 p-3">
<span className="material-symbols-outlined text-[24px]">payments</span>
</div>
<span className="font-title-md text-[13px] text-on-surface leading-snug">Mua &amp; Thanh Toán</span>
<span className="font-label-sm text-[10px] text-[#8D706B] mt-0.5">Cổng PayOS tức thì</span>
</div>
<span className="material-symbols-outlined text-outline-variant text-[20px] relative z-10">chevron_right</span>

<div className="relative z-10 flex flex-col items-center text-center max-w-[120px]">
<div className="w-13 h-13 rounded-2xl bg-[#FAF8F5] border-2 border-primary flex items-center justify-center text-primary shadow-sm mb-2 p-3">
<span className="material-symbols-outlined text-[24px]">local_library</span>
</div>
<span className="font-title-md text-[13px] text-on-surface leading-snug">Tủ Sách &amp; Reader</span>
<span className="font-label-sm text-[10px] text-[#8D706B] mt-0.5">Đọc không gián đoạn</span>
</div>
<span className="material-symbols-outlined text-outline-variant text-[20px] relative z-10">chevron_right</span>

<div className="relative z-10 flex flex-col items-center text-center max-w-[120px]">
<div className="w-13 h-13 rounded-2xl bg-tertiary text-white flex items-center justify-center shadow-md mb-2 p-3">
<span className="material-symbols-outlined text-[24px]">forum</span>
</div>
<span className="font-title-md text-[13px] text-tertiary font-bold leading-snug">Review &amp; Lan Tỏa</span>
<span className="font-label-sm text-[10px] text-[#8D706B] mt-0.5">Viral tự nhiên</span>
</div>
</div>
</div>

<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
<div className="p-5 rounded-xl bg-white border border-[#E8E5DF]">
<span className="font-label-sm text-tertiary font-bold">01 / KHÁM PHÁ</span>
<h4 className="font-title-md text-[15px] text-on-surface mt-1 mb-1.5">Độc Giả Khám Phá</h4>
<p className="font-body-sm text-[12px] text-on-surface-variant">Sách xuất hiện trên bảng xếp hạng, danh mục tuyển chọn của biên tập viên và thuật toán gợi ý cá nhân hóa.</p>
</div>
<div className="p-5 rounded-xl bg-white border border-[#E8E5DF]">
<span className="font-label-sm text-primary font-bold">02 / MUA SÁCH</span>
<h4 className="font-title-md text-[15px] text-on-surface mt-1 mb-1.5">Mua Sắm Tiện Lợi</h4>
<p className="font-body-sm text-[12px] text-on-surface-variant">Quy trình 1-Click Checkout, thanh toán QR PayOS mượt mà, hỗ trợ giao hàng tận nhà nhanh chóng.</p>
</div>
<div className="p-5 rounded-xl bg-white border border-[#E8E5DF]">
<span className="font-label-sm text-secondary font-bold">03 / ĐỌC TỨC THÌ</span>
<h4 className="font-title-md text-[15px] text-on-surface mt-1 mb-1.5">Đọc Ngay Không Chờ Đợi</h4>
<p className="font-body-sm text-[12px] text-on-surface-variant">Với đơn hàng có Ebook, bạn đọc đọc ngay trên điện thoại hoặc máy tính bảng khi đơn hàng vật lý đang xuất kho.</p>
</div>
<div className="p-5 rounded-xl bg-white border border-[#E8E5DF]">
<span className="font-label-sm text-tertiary font-bold">04 / LAN TỎA</span>
<h4 className="font-title-md text-[15px] text-on-surface mt-1 mb-1.5">Thảo Luận &amp; Đánh Giá</h4>
<p className="font-body-sm text-[12px] text-on-surface-variant">Bạn đọc trích dẫn câu hay, viết cảm nhận và chấm điểm sao, tạo hiệu ứng truyền miệng tích cực cho tác phẩm.</p>
</div>
</div>
</section>

<section className="py-space-2xl border-b border-[#E8E5DF]">
<div className="text-center max-w-[700px] mx-auto mb-space-xl">
<span className="font-label-sm uppercase tracking-wider text-primary font-bold">Mô Hình Linh Hoạt</span>
<h2 className="font-headline-lg text-[34px] text-on-surface mt-1">Các Loại Sản Phẩm Được Hỗ Trợ</h2>
<p className="font-body-md text-[15px] text-on-surface-variant mt-2">
            Lựa chọn phân phối từng định dạng riêng lẻ hoặc kết hợp gói giải pháp độc quyền để tăng giá trị trung bình trên mỗi đơn hàng.
          </p>
</div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">

<div className="bg-white rounded-2xl p-7 border border-[#E8E5DF] subtle-paper-shadow hover-lift flex flex-col justify-between">
<div>
<div className="flex items-center justify-between mb-4">
<span className="w-12 h-12 rounded-xl bg-[#FAF8F5] p-3 text-on-surface border border-[#E8E5DF] flex items-center justify-center">
<span className="material-symbols-outlined text-[24px]">menu_book</span>
</span>
<span className="font-label-sm text-[11px] font-semibold bg-surface-container px-2.5 py-1 rounded text-on-surface">Vật lý</span>
</div>
<h3 className="font-headline-sm text-[20px] text-on-surface mb-2">Sách Giấy Truyền Thống</h3>
<p className="font-body-sm text-[13px] text-on-surface-variant mb-4">
                Thích hợp cho các ấn bản in giới hạn, sách mỹ thuật bìa cứng, sách thiếu nhi và tuyển tập văn học.
              </p>
<ul className="space-y-2 text-[12px] font-body-sm text-on-surface">
<li className="flex items-center gap-2">
<span className="text-tertiary font-bold">✓</span> Quản lý theo mã SKU / ISBN chính xác
                </li>
<li className="flex items-center gap-2">
<span className="text-tertiary font-bold">✓</span> Đồng bộ tồn kho thời gian thực
                </li>
<li className="flex items-center gap-2">
<span className="text-tertiary font-bold">✓</span> Kết nối trực tiếp đơn vị giao nhận
                </li>
<li className="flex items-center gap-2">
<span className="text-tertiary font-bold">✓</span> Hỗ trợ in phiếu đóng gói và hóa đơn
                </li>
</ul>
</div>
<div className="mt-6 pt-4 border-t border-[#E8E5DF] text-center">
<span className="font-title-md text-[13px] text-tertiary">Chi phí hoa hồng tối ưu sàn</span>
</div>
</div>

<div className="bg-white rounded-2xl p-7 border border-[#E8E5DF] subtle-paper-shadow hover-lift flex flex-col justify-between">
<div>
<div className="flex items-center justify-between mb-4">
<span className="w-12 h-12 rounded-xl bg-tertiary/10 p-3 text-tertiary border border-tertiary/20 flex items-center justify-center">
<span className="material-symbols-outlined text-[24px]">tablet_mac</span>
</span>
<span className="font-label-sm text-[11px] font-semibold bg-tertiary/10 px-2.5 py-1 rounded text-tertiary">Nội dung số</span>
</div>
<h3 className="font-headline-sm text-[20px] text-on-surface mb-2">Ebook Kỹ Thuật Số (DRM)</h3>
<p className="font-body-sm text-[13px] text-on-surface-variant mb-4">
                Mô hình kinh doanh không phụ thuộc vào chi phí in ấn và lưu kho. Lợi nhuận biên cực cao.
              </p>
<ul className="space-y-2 text-[12px] font-body-sm text-on-surface">
<li className="flex items-center gap-2">
<span className="text-tertiary font-bold">✓</span> Không lo tồn kho hay trượt giá giấy
                </li>
<li className="flex items-center gap-2">
<span className="text-tertiary font-bold">✓</span> Kích hoạt tức thì vào Tủ Sách độc giả
                </li>
<li className="flex items-center gap-2">
<span className="text-tertiary font-bold">✓</span> Công nghệ mã hóa chống tải lậu
                </li>
<li className="flex items-center gap-2">
<span className="text-tertiary font-bold">✓</span> Đọc đa nền tảng: iOS, Android, Web
                </li>
</ul>
</div>
<div className="mt-6 pt-4 border-t border-[#E8E5DF] text-center">
<span className="font-title-md text-[13px] text-tertiary">Tỷ lệ chia sẻ doanh thu hấp dẫn</span>
</div>
</div>

<div className="bg-[#FAF6F0] rounded-2xl p-7 border-2 border-primary subtle-paper-shadow hover-lift flex flex-col justify-between relative">
<div className="absolute -top-3.5 right-6 bg-primary text-white font-label-sm text-[11px] font-semibold px-3 py-1 rounded-full shadow-sm">
              Độc quyền HUKI
            </div>
<div>
<div className="flex items-center justify-between mb-4">
<span className="w-12 h-12 rounded-xl bg-primary/10 p-3 text-primary border border-primary/20 flex items-center justify-center">
<span className="material-symbols-outlined text-[24px]">layers</span>
</span>
<span className="font-label-sm text-[11px] font-semibold bg-primary/10 px-2.5 py-1 rounded text-primary">Combo Hybrid</span>
</div>
<h3 className="font-headline-sm text-[20px] text-on-surface mb-2">Combo Sách Giấy + Ebook</h3>
<p className="font-body-sm text-[13px] text-on-surface-variant mb-4">
                Giải pháp trải nghiệm trọn vẹn: Vừa có sách đẹp để sưu tầm trên kệ, vừa có bản số đọc ngay trên đường đi làm.
              </p>
<ul className="space-y-2 text-[12px] font-body-sm text-on-surface">
<li className="flex items-center gap-2">
<span className="text-primary font-bold">✓</span> Đọc trước bản số trong lúc chờ giao hàng
                </li>
<li className="flex items-center gap-2">
<span className="text-primary font-bold">✓</span> Nâng cao giá trị đơn hàng trung bình (AOV)
                </li>
<li className="flex items-center gap-2">
<span className="text-primary font-bold">✓</span> Tăng tỷ lệ hoàn tất thanh toán trước
                </li>
<li className="flex items-center gap-2">
<span className="text-primary font-bold">✓</span> Khuyến khích bạn đọc review sớm
                </li>
</ul>
</div>
<div className="mt-6 pt-4 border-t border-primary/20 text-center">
<span className="font-title-md text-[13px] text-primary font-bold">Mô hình được yêu thích nhất</span>
</div>
</div>
</div>
</section>

<section className="py-space-2xl border-b border-[#E8E5DF]" id="onboarding">
<div className="text-center max-w-[700px] mx-auto mb-space-xl">
<span className="font-label-sm uppercase tracking-wider text-tertiary font-bold">Khởi Đầu Dễ Dàng</span>
<h2 className="font-headline-lg text-[34px] text-on-surface mt-1">
            Bắt Đầu Bán Hàng Trên HUKI Với 4 Bước Tinh Gọn
          </h2>
<p className="font-body-md text-[15px] text-on-surface-variant mt-2">
            Mọi thủ tục xét duyệt và thiết lập gian hàng được số hóa toàn diện, sẵn sàng mở bán trong vòng 48 giờ làm việc.
          </p>
</div>
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter relative">

<div className="bg-white rounded-2xl p-6 border border-[#E8E5DF] subtle-paper-shadow relative">
<span className="font-headline-lg text-[36px] font-bold text-tertiary/20 absolute top-4 right-4">01</span>
<div className="w-10 h-10 rounded-lg bg-tertiary/10 text-tertiary flex items-center justify-center mb-4">
<span className="material-symbols-outlined text-[20px]">badge</span>
</div>
<h4 className="font-title-lg text-[16px] text-on-surface mb-2">Đăng Ký Doanh Nghiệp</h4>
<p className="font-body-sm text-[13px] text-on-surface-variant">
              Cung cấp thông tin pháp nhân, giấy phép ĐKKD hoặc giấy phép xuất bản và thông tin người đại diện pháp luật.
            </p>
<div className="mt-4 pt-3 border-t border-[#E8E5DF] text-[11px] font-label-sm text-[#8D706B]">
              Thời gian: 5 phút thao tác
            </div>
</div>

<div className="bg-white rounded-2xl p-6 border border-[#E8E5DF] subtle-paper-shadow relative">
<span className="font-headline-lg text-[36px] font-bold text-tertiary/20 absolute top-4 right-4">02</span>
<div className="w-10 h-10 rounded-lg bg-tertiary/10 text-tertiary flex items-center justify-center mb-4">
<span className="material-symbols-outlined text-[20px]">verified_user</span>
</div>
<h4 className="font-title-lg text-[16px] text-on-surface mb-2">Xác Minh Hồ Sơ</h4>
<p className="font-body-sm text-[13px] text-on-surface-variant">
              Bộ phận kiểm duyệt HUKI rà soát tính hợp lệ của giấy tờ và ký hợp đồng nguyên tắc hợp tác điện tử.
            </p>
<div className="mt-4 pt-3 border-t border-[#E8E5DF] text-[11px] font-label-sm text-tertiary font-semibold">
              Xử lý: Trong 24 - 48 giờ
            </div>
</div>

<div className="bg-white rounded-2xl p-6 border border-[#E8E5DF] subtle-paper-shadow relative">
<span className="font-headline-lg text-[36px] font-bold text-tertiary/20 absolute top-4 right-4">03</span>
<div className="w-10 h-10 rounded-lg bg-tertiary/10 text-tertiary flex items-center justify-center mb-4">
<span className="material-symbols-outlined text-[20px]">palette</span>
</div>
<h4 className="font-title-lg text-[16px] text-on-surface mb-2">Thiết Lập Gian Hàng</h4>
<p className="font-body-sm text-[13px] text-on-surface-variant">
              Tùy chỉnh ảnh bìa, avatar thương hiệu, liên kết tài khoản ngân hàng nhận doanh thu và thêm nhân viên quản lý.
            </p>
<div className="mt-4 pt-3 border-t border-[#E8E5DF] text-[11px] font-label-sm text-[#8D706B]">
              Tự do tùy biến giao diện
            </div>
</div>

<div className="bg-white rounded-2xl p-6 border border-[#E8E5DF] subtle-paper-shadow relative">
<span className="font-headline-lg text-[36px] font-bold text-tertiary/20 absolute top-4 right-4">04</span>
<div className="w-10 h-10 rounded-lg bg-tertiary text-white flex items-center justify-center mb-4">
<span className="material-symbols-outlined text-[20px]">rocket_launch</span>
</div>
<h4 className="font-title-lg text-[16px] text-on-surface mb-2">Đăng Sản Phẩm &amp; Mở Bán</h4>
<p className="font-body-sm text-[13px] text-on-surface-variant">
              Đăng tải mục sách, định giá, tải tệp ebook được mã hóa và tiếp cận ngay 50.000+ độc giả hoạt động tích cực.
            </p>
<div className="mt-4 pt-3 border-t border-[#E8E5DF] text-[11px] font-label-sm text-primary font-bold">
              Bắt đầu nhận doanh thu
            </div>
</div>
</div>
<div className="mt-8 text-center">
<Link className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg bg-tertiary text-white font-title-md text-[15px] hover:bg-[#005140] transition-all shadow-sm" to="/seller/edge-cases">
            Bắt Đầu Bước 01 Ngay Bây Giờ
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
</Link>
</div>
</section>

<section className="py-space-2xl border-b border-[#E8E5DF]">
<div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-space-xl">
<div>
<span className="font-label-sm uppercase tracking-wider text-primary font-bold">Trải Nghiệm Thực Tế</span>
<h2 className="font-headline-lg text-[34px] text-on-surface mt-1">Giao Diện Quản Trị Tối Giản &amp; Mạnh Mẽ</h2>
</div>
<div className="flex items-center gap-2 text-[13px] font-title-md text-tertiary bg-white border border-[#E8E5DF] px-3.5 py-1.5 rounded-lg w-fit">
<span className="w-2 h-2 rounded-full bg-tertiary"></span>
            HUKI Seller Studio v2.4
          </div>
</div>
<div className="grid grid-cols-12 gap-gutter">

<div className="col-span-12 lg:col-span-7 bg-white rounded-2xl p-6 border border-[#E8E5DF] subtle-paper-shadow">
<div className="flex items-center justify-between pb-4 border-b border-[#E8E5DF] mb-5">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-tertiary text-[20px]">local_shipping</span>
<h4 className="font-title-lg text-[16px] text-on-surface">Bảng Điều Hành Đơn Hàng</h4>
</div>
<span className="font-label-sm text-[11px] text-[#8D706B]">Hôm nay, 24 Tháng 10</span>
</div>
<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
<div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/40 text-center">
<span className="font-label-sm text-[11px] text-[#8D706B]">Đơn mới</span>
<p className="font-headline-sm text-[22px] font-bold text-primary mt-1">12</p>
</div>
<div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/40 text-center">
<span className="font-label-sm text-[11px] text-[#8D706B]">Đang chuẩn bị</span>
<p className="font-headline-sm text-[22px] font-bold text-secondary mt-1">8</p>
</div>
<div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/40 text-center">
<span className="font-label-sm text-[11px] text-[#8D706B]">Đang giao</span>
<p className="font-headline-sm text-[22px] font-bold text-on-surface mt-1">21</p>
</div>
<div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/40 text-center">
<span className="font-label-sm text-[11px] text-[#8D706B]">Hoàn tất</span>
<p className="font-headline-sm text-[22px] font-bold text-tertiary mt-1">156</p>
</div>
</div>

<div className="overflow-x-auto border border-[#E8E5DF] rounded-xl">
<table className="w-full text-left text-[12px] min-w-[450px]">
<thead className="bg-[#FAF8F5] border-b border-[#E8E5DF] text-[#8D706B] font-label-sm">
<tr>
<th className="p-3">Mã đơn</th>
<th className="p-3">Sản phẩm</th>
<th className="p-3">Hình thức</th>
<th className="p-3">Tổng tiền</th>
<th className="p-3">Trạng thái</th>
</tr>
</thead>
<tbody className="divide-y divide-[#E8E5DF]">
<tr>
<td className="p-3 font-medium text-tertiary">#HK-9821</td>
<td className="p-3">Atomic Habits + Ebook</td>
<td className="p-3"><span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold text-[10px]">Combo</span></td>
<td className="p-3 font-semibold">129.000 đ</td>
<td className="p-3"><span className="text-tertiary font-semibold">Đã nạp Tủ Sách</span></td>
</tr>
<tr>
<td className="p-3 font-medium text-tertiary">#HK-9820</td>
<td className="p-3">Tâm Lý Học Về Tiền</td>
<td className="p-3"><span className="px-2 py-0.5 rounded bg-surface-container text-on-surface text-[10px]">Sách giấy</span></td>
<td className="p-3 font-semibold">165.000 đ</td>
<td className="p-3"><span className="text-secondary font-semibold">Đang đóng gói</span></td>
</tr>
</tbody>
</table>
</div>
</div>

<div className="col-span-12 lg:col-span-5 bg-white rounded-2xl p-6 border border-[#E8E5DF] subtle-paper-shadow flex flex-col justify-between">
<div>
<div className="flex items-center justify-between pb-4 border-b border-[#E8E5DF] mb-4">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-primary text-[20px]">edit_document</span>
<h4 className="font-title-lg text-[16px] text-on-surface">Quản Lý Trạng Thái Ấn Bản</h4>
</div>
<span className="px-2 py-0.5 rounded-full text-[10px] font-label-sm font-semibold bg-tertiary/10 text-tertiary">
                  Đang mở bán
                </span>
</div>

<div className="flex gap-4 p-3 bg-[#FAF8F5] rounded-xl border border-[#E8E5DF] mb-4">
<div className="w-14 h-20 bg-surface-container rounded spine-crease overflow-hidden flex-shrink-0">
<img className="w-full h-full object-cover" alt="Close up photograph of a Vietnamese translated book cover displayed on an elegant desk with warm ambient wood tones and studio lighting, representing digital seller management catalog." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCZtB83cFlGOz3gYJGnGGwOHMjtj2D4E2RGqutZXDYfUV4rBXRIRxm7LTyliD1rn2PmVgpbCraW5aVnrPuJ92D3cb0KPWZ6n-q3CH1z0pJEyrnekDvVUzgrR8vfuPUXwqgLD_gaj1ABSzHadtzGY0YjRIHDKeqFdLT1ew8s0hwDR-0DCFKAD2FC4lzZDdsZbBwUtkIeKvzB25sDE98p6lHE5iFN7qW8dlXXlLhzOdNkNqee9CDMbV37xg" />
</div>
<div className="min-w-0">
<h5 className="font-title-md text-[14px] text-on-surface leading-tight truncate">Atomic Habits - Bản dịch First News &amp; Huki Ebook</h5>
<p className="font-body-sm text-[11px] text-[#8D706B] mt-0.5">Mã ISBN: 978-604-58-9123-4</p>
<p className="font-title-md text-[13px] text-primary mt-2">Giá niêm yết: 129.000 đ</p>
</div>
</div>

<div className="space-y-2 text-[12px]">
<div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low border border-[#E8E5DF]">
<span className="flex items-center gap-1.5 text-on-surface">
<span className="material-symbols-outlined text-[16px] text-tertiary shrink-0">lock</span>
                    Khóa DRM Bản Quyền Số:
                  </span>
<strong className="text-tertiary font-semibold">Đã kích hoạt</strong>
</div>
<div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low border border-[#E8E5DF]">
<span className="flex items-center gap-1.5 text-on-surface">
<span className="material-symbols-outlined text-[16px] text-secondary shrink-0">inventory_2</span>
                    Tồn kho vật lý (Kho HCM):
                  </span>
<strong className="text-on-surface font-semibold">48 bản sẵn sàng</strong>
</div>
<div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low border border-[#E8E5DF]">
<span className="flex items-center gap-1.5 text-on-surface">
<span className="material-symbols-outlined text-[16px] text-primary shrink-0">cloud_sync</span>
                    Tự động đồng bộ HUKI Reader:
                  </span>
<strong className="text-primary font-semibold">Bật tức thì</strong>
</div>
</div>
</div>
<button className="w-full mt-4 py-2.5 rounded-lg bg-surface-container text-on-surface font-title-md text-[13px] hover:bg-outline-variant/30 transition-colors flex items-center justify-center gap-1.5">
<span className="material-symbols-outlined text-[16px]">settings</span>
              Chỉnh sửa thông tin ấn phẩm
            </button>
</div>
</div>
</section>

<section className="py-space-2xl border-b border-[#E8E5DF]">
<div className="text-center max-w-[700px] mx-auto mb-space-xl">
<span className="font-label-sm uppercase tracking-wider text-tertiary font-bold">Giải Đáp Minh Bạch</span>
<h2 className="font-headline-lg text-[34px] text-on-surface mt-1">Câu Hỏi Thường Gặp Của Đối Tác</h2>
<p className="font-body-md text-[15px] text-on-surface-variant mt-2">
            Những băn khoăn phổ biến nhất của các nhà xuất bản và đơn vị phát hành trước khi hòa nhập hệ sinh thái HUKI.
          </p>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-gutter max-w-[1100px] mx-auto">

<div className="bg-white rounded-2xl p-6 border border-[#E8E5DF] subtle-paper-shadow">
<h4 className="font-title-md text-[15px] text-on-surface flex items-start gap-2">
<span className="material-symbols-outlined text-primary text-[20px] flex-shrink-0 mt-0.5">help</span>
              Điều kiện để đơn vị được mở gian hàng trên HUKI là gì?
            </h4>
<p className="font-body-sm text-[13px] text-on-surface-variant mt-2 pl-7">
              Đối tác cần là pháp nhân doanh nghiệp, hộ kinh doanh có mã số thuế hợp lệ, kèm giấy phép xuất bản hoặc hợp đồng phân phối sách có bản quyền hợp pháp theo quy định của Cục Xuất bản và Bộ TT&amp;TT Việt Nam.
            </p>
</div>

<div className="bg-white rounded-2xl p-6 border border-[#E8E5DF] subtle-paper-shadow">
<h4 className="font-title-md text-[15px] text-on-surface flex items-start gap-2">
<span className="material-symbols-outlined text-primary text-[20px] flex-shrink-0 mt-0.5">help</span>
              Tôi có thể chỉ bán sách giấy hoặc chỉ bán Ebook được không?
            </h4>
<p className="font-body-sm text-[13px] text-on-surface-variant mt-2 pl-7">
              Hoàn toàn được. HUKI hỗ trợ linh hoạt 3 chế độ: Chỉ sách giấy, Chỉ ebook số, hoặc Combo tích hợp. Bạn có thể bật tắt từng định dạng cho từng đầu sách tùy thuộc vào quyền phân phối sở hữu.
            </p>
</div>

<div className="bg-white rounded-2xl p-6 border border-[#E8E5DF] subtle-paper-shadow">
<h4 className="font-title-md text-[15px] text-on-surface flex items-start gap-2">
<span className="material-symbols-outlined text-primary text-[20px] flex-shrink-0 mt-0.5">help</span>
              Thời gian đối soát và thanh toán doanh thu diễn ra như thế nào?
            </h4>
<p className="font-body-sm text-[13px] text-on-surface-variant mt-2 pl-7">
              HUKI đối soát tự động vào ngày 1 và ngày 15 hàng tháng. Doanh thu sau khi trừ phí hoa hồng sàn sẽ được chuyển trực tiếp vào tài khoản ngân hàng chính thức của doanh nghiệp trong 2 ngày làm việc tiếp theo.
            </p>
</div>

<div className="bg-white rounded-2xl p-6 border border-[#E8E5DF] subtle-paper-shadow">
<h4 className="font-title-md text-[15px] text-on-surface flex items-start gap-2">
<span className="material-symbols-outlined text-primary text-[20px] flex-shrink-0 mt-0.5">help</span>
              Ebook được bảo vệ chống sao chép và tải lậu như thế nào?
            </h4>
<p className="font-body-sm text-[13px] text-on-surface-variant mt-2 pl-7">
              Mỗi bản đọc đều được mã hóa bằng chuẩn DRM độc quyền của HUKI, kèm dấu vân tay số (dynamic watermarking) chứa mã định danh người mua. Người dùng chỉ có thể đọc trong ứng dụng HUKI Reader, chống sao chép hay in ấn trái phép.
            </p>
</div>

<div className="bg-white rounded-2xl p-6 border border-[#E8E5DF] subtle-paper-shadow">
<h4 className="font-title-md text-[15px] text-on-surface flex items-start gap-2">
<span className="material-symbols-outlined text-primary text-[20px] flex-shrink-0 mt-0.5">help</span>
              Một tài khoản gian hàng có thể phân quyền cho nhiều nhân viên không?
            </h4>
<p className="font-body-sm text-[13px] text-on-surface-variant mt-2 pl-7">
              Có. Hệ thống hỗ trợ phân quyền vai trò không giới hạn: Quản trị viên (Admin), Quản lý đơn hàng đóng gói, Nhân viên chăm sóc khách hàng và Kế toán phụ trách báo cáo tài chính.
            </p>
</div>

<div className="bg-white rounded-2xl p-6 border border-[#E8E5DF] subtle-paper-shadow">
<h4 className="font-title-md text-[15px] text-on-surface flex items-start gap-2">
<span className="material-symbols-outlined text-primary text-[20px] flex-shrink-0 mt-0.5">help</span>
              Cơ chế cấp quyền đọc Ebook vào Tủ Sách độc giả hoạt động ra sao?
            </h4>
<p className="font-body-sm text-[13px] text-on-surface-variant mt-2 pl-7">
              Ngay khi cổng thanh toán (PayOS, Thẻ nội địa, Ví điện tử) trả về trạng thái thành công, hệ thống tự động kích hoạt license Ebook và đưa sách thẳng vào mục "Tủ Sách" của tài khoản độc giả trong vòng dưới 1 giây.
            </p>
</div>
</div>
</section>

<section className="my-space-2xl">
<div className="bg-tertiary rounded-3xl p-8 md:p-14 text-white relative overflow-hidden shadow-xl">

<div className="absolute -right-16 -bottom-16 w-96 h-96 rounded-full bg-white/5 pointer-events-none"></div>
<div className="absolute right-40 top-0 w-64 h-64 rounded-full bg-[#13846A]/20 pointer-events-none"></div>
<div className="relative z-10 max-w-[800px]">
<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-tertiary-fixed text-[11px] font-label-sm font-semibold mb-4 backdrop-blur-sm">
<span className="material-symbols-outlined text-[14px]">bolt</span>
              Ưu đãi đối tác: Miễn phí phí kích hoạt gian hàng quý 4/2025
            </span>
<h2 className="font-display-lg text-[34px] sm:text-[44px] leading-[1.2] font-normal mb-4">
              Sẵn Sàng Đưa Sách Của Bạn Đến Với <span className="italic text-secondary-fixed">Hàng Vạn Độc Giả HUKI?</span>
</h2>
<p className="font-body-lg text-[15px] sm:text-[16px] text-[#ECF6F3] max-w-[620px] mb-8">
              Mở rộng kênh bán lẻ, nâng tầm ấn phẩm số và gia nhập mạng lưới các nhà xuất bản hàng đầu tại Việt Nam ngay hôm nay.
            </p>
<div className="flex flex-wrap items-center gap-4">
<Link className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-tertiary font-title-md text-[15px] font-bold hover:bg-[#FAF8F5] transition-all shadow-md" to="/seller/product/edit-hybrid">
<span className="material-symbols-outlined text-[20px] fill-icon">add_business</span>
                Đăng Ký Mở Gian Hàng Ngay
              </Link>
<Link className="inline-flex items-center gap-2 px-6 py-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-title-md text-[15px] transition-all backdrop-blur-sm" to="/seller/edge-cases">
<span className="material-symbols-outlined text-[20px]">download</span>
                Tải Bộ Tài Liệu Hướng Dẫn (PDF)
              </Link>
</div>
<div className="mt-8 pt-6 border-t border-white/15 flex flex-wrap items-center gap-4 sm:gap-6 text-[13px] text-[#ECF6F3]">
<span className="flex items-center gap-1.5">
<span className="material-symbols-outlined text-[16px] text-secondary-fixed">support_agent</span>
                Chuyên viên hỗ trợ NXB: <strong className="text-white">1900 8866 (Nhánh 2)</strong>
</span>
<span className="hidden sm:inline">•</span>
<span className="flex items-center gap-1.5">
<span className="material-symbols-outlined text-[16px] text-secondary-fixed">mail</span>
                Email đối tác: <strong className="text-white">publisher@hukiebook.vn</strong>
</span>
</div>
</div>
</div>
</section>
      </main>
    </div>
  );
}
