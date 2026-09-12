import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';

export default function OrderTrackingPage() {
  const { id = 'HUKI-8892401' } = useParams();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [orderReceived, setOrderReceived] = useState(false);

  const handleConfirmReceived = () => {
    setOrderReceived(true);
    showToast('Xác nhận đã nhận hàng thành công! Bạn nhận được 50 Huki Points tích lũy.', 'success');
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  const handleDownloadVAT = () => {
    showToast('Đang tải xuống Hóa đơn điện tử VAT (PDF)...', 'info');
  };

  const trackingSteps = [
    { id: 1, title: 'Đặt Hàng Thành Công', time: '08/09 09:30', status: 'completed', icon: 'check' },
    { id: 2, title: 'Ebook DRM Đã Kích Hoạt', time: '08/09 09:30', status: 'completed', icon: 'auto_stories' },
    { id: 3, title: 'NXB Đã Đóng Gói', time: '08/09 11:20', status: 'completed', icon: 'inventory_2' },
    { id: 4, title: 'Đang Vận Chuyển', time: '08/09 14:15', status: orderReceived ? 'completed' : 'current', icon: 'local_shipping' },
    { id: 5, title: 'Giao Thành Công', time: orderReceived ? '08/09 16:30' : 'Dự kiến 09/09', status: orderReceived ? 'completed' : 'upcoming', icon: 'home_pin' }
  ];

  const deliveryLogs = [
    { time: '14:15 - 08/09/2026', title: 'Bưu tá đang giao hàng', desc: 'Tài xế Nguyễn Văn Hùng (0982.889.214) đang trên đường giao đến bạn tại Quận 1, TP.HCM.', isCurrent: !orderReceived },
    { time: '11:20 - 08/09/2026', title: 'Rời kho phân loại Tân Bình', desc: 'Kiện hàng đã rời trung tâm khai thác bưu kiện Huki Express Tân Bình.' },
    { time: '09:45 - 08/09/2026', title: 'Đã đóng gói và bàn giao vận chuyển', desc: 'Gian hàng Alpha Books Official Store đã niêm phong hộp carton cao cấp kèm tem niêm phong chống rách.' },
    { time: '09:30 - 08/09/2026', title: 'Xác nhận đơn hàng & Kích hoạt bản quyền số DRM', desc: 'Hệ thống đã cấp chữ ký số DRM cho tài khoản của bạn trên Huki Reader.' }
  ];

  const orderItems = [
    {
      id: 'atomic-habits-hybrid',
      title: 'Atomic Habits - Thay Đổi Tí Hon, Hiệu Quả Bất Ngờ',
      format: 'Combo Sách In + Ebook DRM',
      author: 'James Clear • Alpha Books Official',
      price: 129000,
      quantity: 1,
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA53AnKQnh_CvQZkKdgIVlAr69RGZi-Dy_-3urusFYsOguAICJMpGRsU85cbWni4isxviEEkUKqkRCbJ5ueD-G6ys8WaQ2MMUeOfQc35hhCHTyVW6HvA1qu9GgdWj-79QinbXun6KsdNRBGwwFc8KHlTtm9n-RZ3vb6WH6vSR13XZ9-w18ittfip9My_AtHU9afgpWLiOpFBdWm7G8UW0lwQztO50FOnTqdl0m9-V26JGH-brBYGrO7Cw',
      hasDrm: true
    },
    {
      id: 'deep-work-physical',
      title: 'Deep Work - Làm Ra Làm Chơi Ra Chơi',
      format: 'Sách In Bìa Mềm',
      author: 'Cal Newport • NXB Trẻ',
      price: 95000,
      quantity: 1,
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBUoGOHjQ2hoZxnNvlZMZ0EaHKTarSa9EdssU1WWQ8_CEqlDjPkxJ-Eo73jLzR07vvMUGL3X62Bi5cAkdtSoNOn5msr3ZD-146e8TCkcN3gc-r1IiY2QTqqFwp5vHvs6ZfeOU9kdYkLQvDNXp9QZMPbIJ36ZmGICQZQ0_pAgRFNWe6OKgOLgcrsHoCORCXMiXdnKUs7a0kVDcUW1OZu89Z_pEK89aKwgsjfagK9eqmf-T5_pS96mX9_sw',
      hasDrm: false
    },
    {
      id: 'psychology-of-money',
      title: 'Tâm Lý Học Về Tiền',
      format: 'Sách In Bìa Cứng Đặc Biệt',
      author: 'Morgan Housel • 1980 Books',
      price: 135000,
      quantity: 1,
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBPtM4fEF50qiA3LJT6VRKZ4N7fTPN6jOoxh2ryBnzedt5FA5_VTRim9wYpzGX1LBNImhplf6XFrSgwnvdVFanZ2TEFWln9kRUk0j0FDd54xHUJJql6Lw3bHytmH2n_PbDCsDtu9_o0sUCgc9ZNUl--xR6TmfF825RDGooi07RHZ-74OyLPkpqUkrYgxkbp054QNKTO5hp82EqWyeC1yqcp0rOHERKeBFh7vHjCmZu9qxm5Dvs0BJkEaw',
      hasDrm: false
    }
  ];

  return (
    <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 font-body-md">
      {/* Breadcrumbs */}
      <nav className="flex items-center text-body-sm text-on-surface-variant mb-6 gap-2 flex-wrap">
        <Link to="/" className="hover:text-primary transition-colors">Trang chủ</Link>
        <span>/</span>
        <Link to="/profile" className="hover:text-primary transition-colors">Tài Khoản Độc Giả</Link>
        <span>/</span>
        <span className="text-theme-primary font-semibold">Chi Tiết Đơn Hàng #{id}</span>
      </nav>

      {/* Order Header & Status Card */}
      <div className="bg-theme-surface border border-theme-border p-6 sm:p-8 rounded-3xl shadow-sm mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
              Đơn Hàng #{id}
            </h1>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              orderReceived
                ? 'bg-theme-secondary-subtle text-theme-secondary'
                : 'bg-[#fea619]/20 text-[#855300] border border-[#fea619]/40'
            }`}>
              <span className={`w-2 h-2 rounded-full ${orderReceived ? 'bg-theme-secondary' : 'bg-[#fea619] animate-pulse'}`}></span>
              {orderReceived ? 'ĐÃ GIAO THÀNH CÔNG' : 'ĐANG VẬN CHUYỂN'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-on-surface-variant">
            Thời gian đặt: 08/09/2026 - 09:30:15 | Đơn hàng hỗn hợp: 3 Sách In + 1 Ebook DRM
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleDownloadVAT}
            className="border border-theme-secondary/40 text-theme-secondary hover:bg-theme-secondary-subtle px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">receipt_long</span>
            Tải Hóa Đơn VAT (PDF)
          </button>
          <button
            onClick={handlePrintInvoice}
            className="border border-theme-border text-on-surface hover:bg-theme-bg px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">print</span>
            In Đơn Hàng
          </button>
          <Link
            to="/seller/chat"
            className="bg-theme-primary text-white hover:opacity-90 px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-all"
          >
            <span className="material-symbols-outlined text-sm">support_agent</span>
            Yêu Cầu Hỗ Trợ
          </Link>
        </div>
      </div>

      {/* Real-time 5-Step Logistics Timeline */}
      <div className="bg-theme-surface border border-theme-border p-6 sm:p-8 rounded-3xl shadow-sm mb-8">
        <div className="flex items-center gap-2.5 mb-8">
          <span className="material-symbols-outlined text-theme-secondary text-2xl">local_shipping</span>
          <h2 className="font-editorial text-xl font-bold text-on-surface">
            Hành Trình Giao Hàng & Trạng Thái Bản Quyền Số
          </h2>
        </div>

        {/* Stepper bar */}
        <div className="relative flex flex-col md:flex-row items-center justify-between w-full gap-6 md:gap-0 px-2 sm:px-6">
          <div className="hidden md:block absolute left-12 right-12 top-5 h-1 bg-slate-100 -z-0"></div>
          <div
            className="hidden md:block absolute left-12 top-5 h-1 bg-theme-secondary -z-0 transition-all duration-700"
            style={{ width: orderReceived ? 'calc(100% - 6rem)' : '60%' }}
          ></div>

          {trackingSteps.map(step => {
            const isCompleted = step.status === 'completed';
            const isCurrent = step.status === 'current';
            return (
              <div key={step.id} className="relative z-10 flex flex-row md:flex-col items-center text-left md:text-center gap-3 md:gap-1 max-w-[150px] w-full md:w-auto">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-md ${
                  isCompleted
                    ? 'bg-theme-secondary text-white'
                    : isCurrent
                    ? 'bg-[#fea619] text-[#2a1700] ring-4 ring-[#fea619]/25'
                    : 'bg-slate-100 text-slate-400'
                }`}>
                  <span className={`material-symbols-outlined text-sm ${isCurrent ? 'animate-bounce' : ''}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                    {step.icon}
                  </span>
                </div>
                <div>
                  <span className={`text-xs font-bold block ${isCurrent ? 'text-[#855300]' : 'text-on-surface'}`}>
                    {step.title}
                  </span>
                  <span className="text-[11px] text-on-surface-variant">{step.time}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2-Column Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left (7/12): Shipping Logs + Package Items */}
        <div className="lg:col-span-7 space-y-8">
          {/* Real-time Logistics Log */}
          <div className="bg-theme-surface border border-theme-border p-6 rounded-3xl shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-theme-border">
              <div>
                <h3 className="font-bold text-base text-on-surface">Chi Tiết Vận Chuyển (SPX Express)</h3>
                <p className="text-xs text-on-surface-variant font-mono">Mã vận đơn: SPX-VN-99201488</p>
              </div>
              <span className="bg-theme-secondary-subtle text-theme-secondary text-xs font-bold px-3 py-1 rounded-full">
                Giao hàng tiêu chuẩn 24h
              </span>
            </div>

            <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {deliveryLogs.map((log, index) => (
                <div key={index} className="flex items-start gap-4 relative pl-6">
                  <span className={`absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                    log.isCurrent ? 'bg-[#ac2c19] ring-4 ring-red-100' : 'bg-theme-secondary'
                  }`}></span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-bold ${log.isCurrent ? 'text-[#ac2c19]' : 'text-on-surface'}`}>
                        {log.title}
                      </span>
                      <span className="text-on-surface-variant">{log.time}</span>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">{log.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Package Content & DRM Activation */}
          <div className="bg-theme-surface border border-theme-border p-6 rounded-3xl shadow-sm space-y-4">
            <h3 className="font-bold text-base text-on-surface">Danh Sách Kiện Hàng & Bản Quyền Số (3 sản phẩm)</h3>
            
            <div className="divide-y divide-theme-border">
              {orderItems.map(item => (
                <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <img className="w-16 h-22 object-cover rounded-xl shadow-sm shrink-0" src={item.cover} alt={item.title} />
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-theme-secondary bg-theme-secondary-subtle px-2 py-0.5 rounded-md inline-block">
                        {item.format}
                      </span>
                      <h4 className="font-semibold text-sm text-on-surface leading-snug">{item.title}</h4>
                      <p className="text-xs text-on-surface-variant">{item.author}</p>
                      <span className="text-xs text-slate-500 block">Số lượng: x{item.quantity}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0 space-y-2">
                    <span className="font-bold text-sm text-[#ac2c19] block">{item.price.toLocaleString('vi-VN')}đ</span>
                    {item.hasDrm && (
                      <Link
                        to="/reader"
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-theme-primary hover:opacity-90 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                      >
                        <span className="material-symbols-outlined text-sm">chrome_reader_mode</span>
                        Đọc Ngay
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right (5/12): Delivery Address & Order Summary */}
        <div className="lg:col-span-5 space-y-8">
          {/* Recipient Address */}
          <div className="bg-theme-surface border border-theme-border p-6 rounded-3xl shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-theme-border">
              <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-theme-secondary">location_on</span>
                Địa Chỉ Nhận Hàng
              </h3>
              <span className="text-[11px] bg-theme-secondary-subtle text-theme-secondary px-2 py-0.5 rounded font-medium">Nhà riêng</span>
            </div>
            <div className="text-xs sm:text-sm text-on-surface-variant space-y-1 leading-relaxed">
              <p className="font-bold text-on-surface">Nguyễn Minh Trí • 0918.772.339</p>
              <p>Tòa nhà Bitexco Financial Tower, Số 2 Hải Triều, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh</p>
            </div>
          </div>

          {/* Payment Breakdown */}
          <div className="bg-theme-surface border border-theme-border p-6 rounded-3xl shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-on-surface">Tóm Tắt Thanh Toán</h3>
            <div className="space-y-2 text-xs sm:text-sm text-on-surface-variant">
              <div className="flex justify-between">
                <span>Tổng tiền hàng (3 món)</span>
                <span className="font-medium text-on-surface">359.000đ</span>
              </div>
              <div className="flex justify-between">
                <span>Phí vận chuyển hỏa tốc</span>
                <span className="font-medium text-on-surface">25.000đ</span>
              </div>
              <div className="flex justify-between text-theme-secondary">
                <span>Mã giảm giá NXB Alpha Books (ALPHA20)</span>
                <span>-20.000đ</span>
              </div>
              <div className="flex justify-between text-theme-secondary">
                <span>Khấu trừ Ví Xu Huki (100.000 Xu)</span>
                <span>-100.000đ</span>
              </div>
              <div className="border-t border-theme-border pt-3 flex justify-between items-baseline">
                <span className="font-bold text-sm text-on-surface">Tổng Thực Thanh Toán</span>
                <span className="font-bold text-lg text-[#ac2c19]">264.000đ</span>
              </div>
              <p className="text-[11px] text-slate-500 pt-1">
                Phương thức: <strong>Ví Huki Pay + Thẻ Visa (...8892)</strong> (Đã thanh toán)
              </p>
            </div>

            {/* Quick action buttons */}
            <div className="pt-4 space-y-2">
              {!orderReceived ? (
                <button
                  onClick={handleConfirmReceived}
                  className="w-full py-3 bg-theme-secondary hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  Đã Nhận Được Hàng
                </button>
              ) : (
                <div className="p-3 bg-theme-secondary-subtle text-theme-secondary rounded-xl text-center text-xs font-semibold flex items-center justify-center gap-1.5">
                  <span className="material-symbols-outlined text-base">verified</span>
                  Đã xác nhận nhận hàng
                </div>
              )}

              <Link
                to={`/order/${id}/return`}
                className="w-full py-2.5 bg-theme-secondary-subtle hover:bg-theme-border text-on-surface font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">assignment_return</span>
                Yêu Cầu Đổi Trả / Bảo Hành Sách In (7 Ngày)
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
