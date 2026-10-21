'use client';

import React from 'react';
import Link from 'next/link';

export default function AffiliateLandingPage() {
  const benefits = [
    {
      icon: 'percent',
      title: 'Hoa hồng hấp dẫn lên đến 20%',
      desc: 'Nhận hoa hồng cao trên từng đơn hàng sách in (8–12%) và nội dung số Ebook / Sách nói (15–20%).',
    },
    {
      icon: 'schedule',
      title: 'Đối soát minh bạch, nhanh chóng',
      desc: 'Thời gian tạm giữ chuẩn xác: Sách in 7 ngày sau khi giao thành công; Sách số (Ebook/Audio) chỉ 24 giờ.',
    },
    {
      icon: 'link',
      title: 'Hệ thống link rút gọn bảo mật',
      desc: 'Đường dẫn chia sẻ an toàn định dạng /r/[shortCode], hỗ trợ gắn mã chiến dịch subId để tối ưu hiệu quả.',
    },
    {
      icon: 'query_stats',
      title: 'Bảng điều khiển 7 KPI chuẩn mực',
      desc: 'Theo dõi chi tiết: Lượt click hợp lệ, Chuyển đổi, Hoa hồng chờ xử lý, Tạm giữ, Khả dụng, Đã thanh toán và Thu hồi.',
    },
  ];

  const steps = [
    {
      step: '01',
      title: 'Đăng ký hồ sơ Đối tác',
      desc: 'Hoàn tất biểu mẫu 4 bước nhanh gọn, kết nối kênh truyền thông xã hội và chọn thể loại sách yêu thích.',
    },
    {
      step: '02',
      title: 'Tạo link & Chia sẻ',
      desc: 'Chọn hàng ngàn đầu sách hay từ các nhà xuất bản uy tín, tạo link rút gọn /r/{shortCode} và chia sẻ đến cộng đồng.',
    },
    {
      step: '03',
      title: 'Nhận hoa hồng trực tiếp',
      desc: 'Đơn hàng được ghi nhận tự động, hoa hồng chuyển vào số dư khả dụng và rút về tài khoản ngân hàng của bạn.',
    },
  ];

  const faqs = [
    {
      q: 'Ai có thể tham gia mạng lưới Đối tác Tiếp thị HuKi?',
      a: 'Tất cả độc giả cá nhân, người sáng tạo nội dung, reviewer sách, blogger hoặc doanh nghiệp truyền thông đều có thể nộp hồ sơ tham gia hoàn toàn miễn phí.',
    },
    {
      q: 'Thời gian đối soát và tạm giữ hoa hồng được tính như thế nào?',
      a: 'Với sách in/vật lý: Thời gian tạm giữ là 7 ngày tính từ lúc đơn hàng chuyển trạng thái DELIVERED. Với Ebook và Sách nói: Tạm giữ 24 giờ sau khi thanh toán thành công. Trường hợp phát sinh khiếu nại/đổi trả, hoa hồng được đóng băng cho đến khi giải quyết xong.',
    },
    {
      q: 'Mã đối tác (Affiliate Code) khác gì với Mã link rút gọn (Short Code)?',
      a: 'Affiliate Code là mã định danh duy nhất của tài khoản bạn (vd: MINH_HUKI). Short Code là mã rút gọn ngẫu nhiên của từng link chia sẻ (vd: b7x9k2q). Link chia sẻ luôn hiển thị định dạng /r/{shortCode} để bảo vệ an toàn và quyền riêng tư của bạn.',
    },
    {
      q: 'Tôi có cần khai báo tài khoản ngân hàng ngay khi đăng ký không?',
      a: 'Không bắt buộc. Bạn có thể chọn hoãn thiết lập thông tin thanh toán (payoutSetupLater) để trải nghiệm tạo link trước, và hoàn tất cài đặt tài khoản ngân hàng trước kỳ rút tiền đầu tiên.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#fcfbf9] text-gray-900 font-sans pb-16">
      {/* Prototype Notice Banner */}
      <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-center text-xs text-amber-900 font-medium flex items-center justify-center gap-1.5">
        <span className="material-symbols-outlined text-[16px] text-amber-700">info</span>
        <span>
          <strong>Thông báo chương trình:</strong> Chương trình Đối tác Tiếp thị HuKi đang trong giai đoạn hoàn thiện chuẩn bị kỹ thuật. Cổng đăng ký sẽ mở tiếp nhận sau khi hạ tầng backend hoàn tất.
        </span>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 border-b border-stone-200/60 bg-gradient-to-b from-emerald-50/40 via-white to-transparent">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/80 border border-emerald-300/60 text-emerald-900 text-xs font-bold shadow-2xs">
            <span className="material-symbols-outlined text-[15px] text-emerald-700">stars</span>
            Chương Trình Đối Tác Tiếp Thị HuKi (Affiliate Marketing)
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight max-w-4xl mx-auto">
            Lan Tỏa Văn Hóa Đọc, <br className="hidden sm:inline" />
            <span className="text-emerald-700">Tạo Thu Nhập Bền Vững</span> Cùng HuKi
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Kết nối độc giả với hàng chục ngàn tựa sách bản quyền, sách nói và ebook chất lượng cao. Nhận hoa hồng minh bạch trên mỗi đơn hàng thành công.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <Link
              href="/account/affiliate/register"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
              <span>Xem Quy Trình Đăng Ký (4 Bước)</span>
            </Link>
          </div>

          <div className="pt-6 flex items-center justify-center gap-6 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-emerald-600 text-[16px]">check_circle</span>
              Miễn phí tham gia
            </span>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-emerald-600 text-[16px]">check_circle</span>
              Đối soát minh bạch
            </span>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-emerald-600 text-[16px]">check_circle</span>
              Hỗ trợ độc quyền
            </span>
          </div>
        </div>
      </section>

      {/* Key Benefits Grid */}
      <section className="py-14 md:py-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-2 mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Quyền Lợi Vượt Trội</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
            Tại Sao Nên Đồng Hành Cùng HuKi?
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {benefits.map((b, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-white border border-stone-200/80 shadow-2xs hover:shadow-sm transition-all flex items-start gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
                <span className="material-symbols-outlined text-[24px]">{b.icon}</span>
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-gray-900">{b.title}</h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3 Simple Steps */}
      <section className="py-14 bg-stone-100/60 border-y border-stone-200/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-2 mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Quy Trình Hoạt Động</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              Chỉ 3 Bước Đơn Giản Để Bắt Đầu
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((s, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-3 relative overflow-hidden"
              >
                <span className="text-3xl font-black text-emerald-700/20 block font-mono">{s.step}</span>
                <h3 className="text-base font-bold text-gray-900">{s.title}</h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-14 md:py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-2 mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Giải Đáp Thắc Mắc</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
            Câu Hỏi Thường Gặp (FAQ)
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((f, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-2"
            >
              <h3 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-700 text-[18px]">help</span>
                {f.q}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 pl-6 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-emerald-800 to-teal-900 text-white text-center space-y-5 shadow-xl relative overflow-hidden">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Sẵn Sàng Trở Thành Đối Tác Tiếp Thị HuKi?
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100 max-w-xl mx-auto">
            Khởi đầu hành trình chia sẻ sách yêu thích và tạo dựng nguồn thu nhập ổn định, minh bạch ngay hôm nay.
          </p>
          <div className="pt-2">
            <Link
              href="/account/affiliate/register"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white text-emerald-900 font-extrabold text-sm shadow-md hover:bg-emerald-50 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
              Nộp Hồ Sơ Đăng Ký Miễn Phí
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
