"use client";

import React from 'react';
import Link from 'next/link';

export default function SellerPortalPage() {
  return (
    <div className="w-full bg-[#FAF8F5] text-on-surface antialiased min-h-screen py-6">
      <main className="flex-1 w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* Hero Section */}
        <section className="grid grid-cols-12 gap-gutter items-center py-space-xl border-b border-[#E8E5DF]">
          <div className="col-span-12 lg:col-span-7 flex flex-col gap-space-md">

            <div className="inline-flex items-center gap-2 bg-[#FAF3EE] border border-outline-variant/60 px-3.5 py-1.5 rounded-full w-fit">
              <span className="material-symbols-outlined text-primary text-[18px]">auto_awesome</span>
              <span className="font-label-sm uppercase tracking-wider text-primary font-bold">KÊNH NGƯỜI BÁN HUKI</span>
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
              <span className="font-label-sm text-tertiary font-semibold">Cổng Đăng Ký Đối Tác Chính Thức</span>
            </div>

            <h1 className="font-display-lg text-[40px] sm:text-[48px] lg:text-[50px] leading-[1.15] text-on-surface tracking-tight font-editorial">
              Đưa Sách Của Bạn Đến Gần Hơn Với <span className="italic text-tertiary font-normal">Độc Giả Tinh Hoa</span>
            </h1>

            <p className="font-body-lg text-[15px] sm:text-[16px] leading-[26px] text-on-surface-variant max-w-[620px]">
              HUKI giúp nhà sách, nhà xuất bản và đơn vị phát hành tiếp cận cộng đồng độc giả yêu sách có sức mua cao, quản lý sản phẩm, vận hành đơn hàng vật lý và bảo mật phân phối ebook trên cùng một hệ sinh thái chuyên biệt.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg bg-tertiary text-white font-title-md text-[15px] hover:bg-[#005140] transition-all shadow-sm hover:shadow-md" href="/seller/register">
                <span className="material-symbols-outlined text-[20px] fill-icon">add_business</span>
                Đăng Ký Bán Hàng Ngay
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
              <Link className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-white border border-[#E8E5DF] text-on-surface font-title-md text-[15px] hover:bg-surface-container transition-all" href="/seller/edge-cases">
                Tìm Hiểu Quy Trình
              </Link>
              <Link className="font-title-md text-[14px] text-primary hover:underline ml-2 flex items-center gap-1" href="/auth/login?redirect=/seller/dashboard">
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
                  <img className="w-full h-full object-cover" alt="Atomic Habits" src="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80" />
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

        {/* Target Partners Section */}
        <section className="py-space-2xl border-b border-[#E8E5DF]">
          <div className="text-center max-w-[720px] mx-auto mb-space-xl">
            <span className="font-label-sm uppercase tracking-wider text-tertiary font-bold">Đối Tác Mục Tiêu</span>
            <h2 className="font-headline-lg text-[34px] text-on-surface mt-1 font-editorial">Ai Có Thể Trở Thành Đối Tác Của HUKI?</h2>
            <p className="font-body-md text-[15px] text-on-surface-variant mt-2">
              Hệ sinh thái mở nhưng chuẩn hóa, thiết kế chuyên biệt cho mọi đơn vị hoạt động chuyên nghiệp trong lĩnh vực xuất bản và phát hành tri thức.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">

            <div className="bg-white rounded-2xl p-6 border border-[#E8E5DF] subtle-paper-shadow flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#FAF3EE] text-primary flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-[26px]">store</span>
                </div>
                <h3 className="font-headline-sm text-[18px] text-on-surface mb-2 font-bold">Nhà Sách Truyền Thống &amp; Độc Lập</h3>
                <p className="font-body-sm text-[13px] leading-[20px] text-on-surface-variant">
                  Các chuỗi nhà sách, hiệu sách độc lập mong muốn mở rộng tệp bạn đọc online, giải quyết tồn kho và bổ sung kênh doanh thu trực tuyến linh hoạt.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#E8E5DF] flex items-center justify-between text-tertiary font-title-md text-[12px]">
                <span>Tối ưu vận hành</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-tertiary/30 subtle-paper-shadow flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-tertiary text-white text-[10px] font-label-sm font-semibold px-2.5 py-0.5 rounded-bl-lg">Ưu tiên kết nối</div>
              <div>
                <div className="w-12 h-12 rounded-xl bg-tertiary/10 text-tertiary flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-[26px]">history_edu</span>
                </div>
                <h3 className="font-headline-sm text-[18px] text-on-surface mb-2 font-bold">Nhà Xuất Bản (NXB)</h3>
                <p className="font-body-sm text-[13px] leading-[20px] text-on-surface-variant">
                  Đơn vị xuất bản trực tiếp phát hành sách in và sở hữu bản quyền số tiêu chuẩn quốc gia. Hỗ trợ khóa bảo mật DRM độc quyền và đối soát minh bạch.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#E8E5DF] flex items-center justify-between text-tertiary font-title-md text-[12px]">
                <span>Bảo vệ bản quyền số</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#E8E5DF] subtle-paper-shadow flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-secondary-container/15 text-secondary flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-[26px]">local_shipping</span>
                </div>
                <h3 className="font-headline-sm text-[18px] text-on-surface mb-2 font-bold">Công Ty Phát Hành Sách</h3>
                <p className="font-body-sm text-[13px] leading-[20px] text-on-surface-variant">
                  Các đơn vị phân phối đại diện tác phẩm, sách dịch và bản quyền tri thức. Tận dụng mạng lưới vận chuyển liên kết toàn quốc với biểu phí trợ giá.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#E8E5DF] flex items-center justify-between text-tertiary font-title-md text-[12px]">
                <span>Giao vận toàn quốc</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#E8E5DF] subtle-paper-shadow flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-surface-container text-on-surface flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-[26px]">business_center</span>
                </div>
                <h3 className="font-headline-sm text-[18px] text-on-surface mb-2 font-bold">Doanh Nghiệp &amp; Học Viện</h3>
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

        {/* Value Prop Section */}
        <section className="py-space-2xl border-b border-[#E8E5DF]" id="value-prop">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-space-xl">
            <div>
              <span className="font-label-sm uppercase tracking-wider text-primary font-bold">Tính Năng Cốt Lõi</span>
              <h2 className="font-headline-lg text-[34px] text-on-surface mt-1 font-editorial">
                Một Nền Tảng Cho Toàn Bộ Hoạt Động Kinh Doanh Sách
              </h2>
            </div>
            <p className="font-body-md text-[14px] text-on-surface-variant max-w-[420px] md:text-right">
              Không còn phải tách rời khâu bán sách giấy với cung cấp bản đọc điện tử. Mọi thứ quy về một màn hình điều khiển duy nhất.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">

            <div className="bg-white rounded-2xl p-6 border border-[#E8E5DF] subtle-paper-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-tertiary/10 text-tertiary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px]">import_contacts</span>
                </div>
                <h4 className="font-title-lg text-[17px] text-on-surface font-bold">Bán Sách Giấy Vật Lý</h4>
              </div>
              <p className="font-body-sm text-[13px] leading-[22px] text-on-surface-variant">
                Tự do quản lý giá bìa, chiết khấu đại lý, số lượng tồn kho theo từng kho hàng và tự động đẩy mã vận đơn đến các đơn vị giao hàng đối tác.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#E8E5DF] subtle-paper-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px]">devices</span>
                </div>
                <h4 className="font-title-lg text-[17px] text-on-surface font-bold">Phân Phối Ebook Bản Quyền</h4>
              </div>
              <p className="font-body-sm text-[13px] leading-[22px] text-on-surface-variant">
                Bảo vệ nội dung bằng công nghệ DRM độc quyền, chống sao chép và tải lậu. Tự động cấp quyền đọc vào HUKI Library và mở mượt mà trên ứng dụng HUKI Reader.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#E8E5DF] subtle-paper-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-secondary-container/20 text-secondary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px]">manage_accounts</span>
                </div>
                <h4 className="font-title-lg text-[17px] text-on-surface font-bold">Quản Lý Gian Hàng &amp; Nhân Sự</h4>
              </div>
              <p className="font-body-sm text-[13px] leading-[22px] text-on-surface-variant">
                Phân quyền chặt chẽ giữa Chủ sở hữu, Quản lý kho, Kế toán và Chăm sóc khách hàng. Kiểm soát lịch sử chỉnh sửa giá và cập nhật tồn kho minh bạch.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#E8E5DF] subtle-paper-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#FAF3EE] text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px]">receipt_long</span>
                </div>
                <h4 className="font-title-lg text-[17px] text-on-surface font-bold">Quản Lý Đơn Hàng Tập Trung</h4>
              </div>
              <p className="font-body-sm text-[13px] leading-[22px] text-on-surface-variant">
                Theo dõi mạch lạc trạng thái từng đơn hàng: Chờ xác nhận, Đang chuẩn bị, Đang giao, Đã hoàn tất và Quản lý đối soát doanh thu theo chu kỳ thanh toán linh hoạt.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#E8E5DF] subtle-paper-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-tertiary-fixed-dim/30 text-tertiary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px]">loyalty</span>
                </div>
                <h4 className="font-title-lg text-[17px] text-on-surface font-bold">Khuyến Mãi &amp; Voucher</h4>
              </div>
              <p className="font-body-sm text-[13px] leading-[22px] text-on-surface-variant">
                Khởi tạo mã giảm giá riêng, tham gia các sự kiện sách HUKI, nhận trợ giá đồng hành từ sàn và tích hợp điểm thưởng kích cầu độc giả.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#E8E5DF] subtle-paper-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-surface-container text-on-surface flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px]">monitoring</span>
                </div>
                <h4 className="font-title-lg text-[17px] text-on-surface font-bold">Báo Cáo &amp; Thấu Hiểu Độc Giả</h4>
              </div>
              <p className="font-body-sm text-[13px] leading-[22px] text-on-surface-variant">
                Trực quan hóa lượng sách bán ra, số trang ebook được đọc thực tế, tác phẩm được bookmark nhiều nhất và mức độ tương tác thảo luận từ cộng đồng.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Box Section */}
        <section className="my-space-2xl">
          <div className="bg-tertiary rounded-3xl p-8 md:p-14 text-white relative overflow-hidden shadow-xl">
            <div className="absolute -right-16 -bottom-16 w-96 h-96 rounded-full bg-white/5 pointer-events-none"></div>
            <div className="relative z-10 max-w-[800px]">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-tertiary-fixed text-[11px] font-label-sm font-semibold mb-4 backdrop-blur-sm">
                <span className="material-symbols-outlined text-[14px]">bolt</span>
                Ưu đãi đối tác: Miễn phí kích hoạt gian hàng
              </span>
              <h2 className="font-display-lg text-[34px] sm:text-[44px] leading-[1.2] font-normal mb-4 font-editorial">
                Sẵn Sàng Đưa Sách Của Bạn Đến Với <span className="italic text-secondary-fixed">Hàng Vạn Độc Giả HUKI?</span>
              </h2>
              <p className="font-body-lg text-[15px] sm:text-[16px] text-[#ECF6F3] max-w-[620px] mb-8">
                Mở rộng kênh bán lẻ, nâng tầm ấn phẩm số và gia nhập mạng lưới các nhà xuất bản hàng đầu tại Việt Nam ngay hôm nay.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Link className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-tertiary font-title-md text-[15px] font-bold hover:bg-[#FAF8F5] transition-all shadow-md" href="/seller/register">
                  <span className="material-symbols-outlined text-[20px] fill-icon">add_business</span>
                  Đăng Ký Mở Gian Hàng Ngay
                </Link>
                <Link className="inline-flex items-center gap-2 px-6 py-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-title-md text-[15px] transition-all backdrop-blur-sm" href="/seller/edge-cases">
                  <span className="material-symbols-outlined text-[20px]">help</span>
                  Xem Hướng Dẫn Chi Tiết
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
