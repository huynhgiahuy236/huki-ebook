import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { businessApi } from '../../api/businessApi';

export default function AccountStatusPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [business, setBusiness] = useState(user?.business || null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchStatus = async () => {
      try {
        const res = await businessApi.getMyBusiness();
        if (isMounted && res.success && res.data) {
          setBusiness(res.data);
        }
      } catch {
        // Fallback to user.business if any
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchStatus();
    return () => {
      isMounted = false;
    };
  }, []);

  let status = 'NOT_REGISTERED';
  if (user?.role === 'PLATFORM_ADMIN') {
    status = 'PLATFORM_ADMIN';
  } else if (business?.status) {
    status = business.status;
  } else if (user?.role === 'BUSINESS' || user?.hasApprovedBusiness) {
    status = 'APPROVED';
  } else {
    status = 'NOT_REGISTERED';
  }

  useEffect(() => {
    if (!isLoading && status === 'NOT_REGISTERED') {
      navigate('/', { replace: true });
    }
  }, [isLoading, status, navigate]);

  return (
    <div className="min-h-screen bg-[#fbf9f4] text-[#17201f] pb-16">
      {/* Top Header / Breadcrumbs Bar */}
      <div className="bg-white border-b border-[#e8e5df] sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#003b2b] hover:text-[#005140] hover:bg-[#f2fbf9] px-3.5 py-1.5 rounded-xl border border-[#e8e5df] transition-all"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              <span>Về Trang Chủ</span>
            </Link>

            <div className="hidden sm:flex items-center gap-2 text-xs text-[#6b7280]">
              <span>/</span>
              <Link to="/" className="hover:text-[#003b2b] transition-colors">Trang chủ</Link>
              <span>/</span>
              <span className="text-[#17201f] font-semibold">Trạng thái hồ sơ NXB</span>
            </div>
          </div>

          {/* Hotline */}
          <div className="flex items-center gap-2">
            <a
              href="tel:19008866"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6b7280] hover:text-[#003b2b] transition-colors"
            >
              <span className="material-symbols-outlined text-base text-[#003b2b]">support_agent</span>
              <span className="hidden sm:inline">Pháp chế: 1900 8866</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
        {isLoading ? (
          <div className="bg-white rounded-3xl border border-[#e8e5df] p-12 text-center shadow-xs">
            <span className="inline-block w-8 h-8 border-3 border-[#003b2b]/20 border-t-[#003b2b] rounded-full animate-spin mb-3"></span>
            <p className="text-sm font-medium text-[#6b7280]">Đang kiểm tra dữ liệu hồ sơ từ hệ thống...</p>
          </div>
        ) : status === 'NOT_REGISTERED' ? (
          /* State 1: CHƯA ĐĂNG KÝ HỒ SƠ SELLER */
          <div className="space-y-6 animate-fade-in-up">
            <div className="bg-white rounded-3xl border border-[#e8e5df] p-8 sm:p-12 text-center shadow-xs">
              <div className="w-16 h-16 rounded-3xl bg-[#003b2b]/10 text-[#003b2b] flex items-center justify-center mx-auto mb-4 ring-8 ring-[#003b2b]/5">
                <span className="material-symbols-outlined text-3xl">storefront</span>
              </div>

              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6b7280] bg-[#f8f6f1] px-3.5 py-1 rounded-full border border-[#e8e5df] inline-block mb-3">
                Chưa Nộp Hồ Sơ Đối Tác
              </span>

              <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-[#17201f] mb-2 max-w-lg mx-auto">
                Bạn Chưa Có Hồ Sơ Đăng Ký Người Bán &amp; NXB
              </h1>

              <p className="text-xs sm:text-sm text-[#6b7280] max-w-md mx-auto leading-relaxed mb-8">
                Tài khoản của bạn hiện là Độc Giả cá nhân. Hãy đăng ký trở thành Đối tác NXB / Tác giả để phát hành sách giấy và sách số có bảo vệ DRM tới cộng đồng hơn 45.000+ bạn đọc HUKI.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
                <Link
                  to="/seller/register"
                  className="bg-[#003b2b] text-white px-6 py-3.5 rounded-2xl text-xs sm:text-sm font-bold hover:bg-[#005140] transition-all shadow-md flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">how_to_reg</span>
                  <span>Đăng Ký Đối Tác Bán Hàng Ngay</span>
                </Link>
                <Link
                  to="/"
                  className="bg-white border border-[#e8e5df] text-[#17201f] px-5 py-3.5 rounded-2xl text-xs sm:text-sm font-bold hover:bg-[#fbf9f4] transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">auto_stories</span>
                  <span>Về Trang Chủ Đọc Sách</span>
                </Link>
              </div>

              {/* 4 Benefits Pillars */}
              <div className="pt-8 border-t border-[#e8e5df] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
                {[
                  { icon: 'menu_book', title: 'Sách Giấy & Ebook', desc: 'Phát hành đa định dạng linh hoạt' },
                  { icon: 'verified_user', title: 'Bảo Vệ Bản Quyền DRM', desc: 'Mã hóa chống sao chép trái phép' },
                  { icon: 'percent', title: 'Chiết Khấu 85% NXB', desc: 'Mức chia sẻ doanh thu tốt nhất' },
                  { icon: 'monitoring', title: 'Báo Cáo Tự Động', desc: 'Theo dõi dòng tiền thời gian thực' },
                ].map((item, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-[#fbf9f4] border border-[#e8e5df]">
                    <div className="w-8 h-8 rounded-xl bg-[#006953] text-[#94f5d6] flex items-center justify-center mb-2.5">
                      <span className="material-symbols-outlined text-base">{item.icon}</span>
                    </div>
                    <h4 className="text-xs font-bold text-[#17201f] mb-0.5">{item.title}</h4>
                    <p className="text-[11px] text-[#6b7280]">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : status === 'PLATFORM_ADMIN' ? (
          /* State 2: TÀI KHOẢN ADMIN */
          <div className="space-y-6 animate-fade-in-up">
            <div className="bg-white rounded-3xl border border-[#e8e5df] p-8 sm:p-12 text-center shadow-xs">
              <div className="w-16 h-16 rounded-3xl bg-[#003b2b] text-[#94f5d6] flex items-center justify-center mx-auto mb-4 ring-8 ring-[#94f5d6]/20">
                <span className="material-symbols-outlined text-3xl">admin_panel_settings</span>
              </div>

              <span className="text-[11px] font-bold uppercase tracking-wider text-[#006953] bg-[#f2fbf9] px-3.5 py-1 rounded-full border border-[#94f5d6]/40 inline-block mb-3">
                Platform Admin — Quản Trị Hệ Thống
              </span>

              <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-[#17201f] mb-2 max-w-lg mx-auto">
                Tài Khoản Quản Trị Sàn HUKI
              </h1>

              <p className="text-xs sm:text-sm text-[#6b7280] max-w-md mx-auto leading-relaxed mb-8">
                Bạn đang đăng nhập bằng tài khoản Quản trị viên cấp cao. Bạn có toàn quyền xét duyệt hồ sơ đối tác, quản lý người dùng và cấu hình sàn.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/admin/publishers"
                  className="bg-[#003b2b] text-white px-6 py-3.5 rounded-2xl text-xs sm:text-sm font-bold hover:bg-[#005140] transition-all shadow-md flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">approval</span>
                  <span>Duyệt Hồ Sơ Doanh Nghiệp / NXB</span>
                </Link>
                <Link
                  to="/admin"
                  className="bg-white border border-[#e8e5df] text-[#17201f] px-5 py-3.5 rounded-2xl text-xs sm:text-sm font-bold hover:bg-[#fbf9f4] transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">dashboard</span>
                  <span>Bảng Điều Khiển Admin</span>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* State 3: ĐÃ NỘP HỒ SƠ (PENDING_APPROVAL / APPROVED / REJECTED) */
          <div className="space-y-6 animate-fade-in-up">
            
            {/* Top Page Banner */}
            <div className="bg-white rounded-3xl border border-[#e8e5df] p-6 sm:p-8 shadow-xs relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] uppercase tracking-widest font-bold text-[#003b2b] bg-[#f2fbf9] px-3 py-1 rounded-full border border-[#94f5d6]/40">
                      Kênh Người Bán &amp; Đối Tác Xuất Bản
                    </span>
                    {status === 'PENDING_APPROVAL' && (
                      <span className="text-[11px] font-bold text-[#805000] bg-amber-50 border border-amber-200 px-3 py-1 rounded-full flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                        Đang Chờ Duyệt
                      </span>
                    )}
                    {status === 'APPROVED' && (
                      <span className="text-[11px] font-bold text-[#006953] bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">verified</span>
                        Đã Phê Duyệt
                      </span>
                    )}
                    {status === 'REJECTED' && (
                      <span className="text-[11px] font-bold text-[#ac2c19] bg-red-50 border border-red-200 px-3 py-1 rounded-full flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">error</span>
                        Cần Bổ Sung
                      </span>
                    )}
                  </div>

                  <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-[#17201f] leading-snug">
                    {status === 'APPROVED'
                      ? 'Hồ Sơ Doanh Nghiệp Đã Được Kích Hoạt'
                      : status === 'REJECTED'
                      ? 'Yêu Cầu Bổ Sung Hồ Sơ Pháp Lý'
                      : 'Hồ Sơ NXB Đang Trong Tiến Trình Thẩm Định'}
                  </h1>

                  <p className="text-xs sm:text-sm text-[#6b7280] mt-1.5 max-w-2xl leading-relaxed">
                    {status === 'APPROVED'
                      ? 'Đơn vị của bạn đã là Đối tác Cấp 1 chính thức. Bạn có toàn quyền phát hành sách giấy và sách số DRM trên toàn sàn.'
                      : status === 'REJECTED'
                      ? 'Hội đồng thẩm định cần bạn cập nhật lại một số giấy tờ pháp lý trước khi phê duyệt.'
                      : 'Hồ sơ của bạn đã được tiếp nhận thành công. Ban Thư ký & Pháp chế HUKI đang đối soát giấy tờ trong vòng 24–48 giờ làm việc.'}
                  </p>
                </div>

                {/* Primary Quick CTA */}
                <div className="shrink-0 flex flex-wrap gap-2.5">
                  {status === 'APPROVED' ? (
                    <Link
                      to="/seller/dashboard"
                      className="bg-[#003b2b] text-white px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold hover:bg-[#005140] transition-all shadow-md flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-base">dashboard</span>
                      <span>Vào Kênh Người Bán</span>
                    </Link>
                  ) : (
                    <>
                      <Link
                        to="/"
                        className="bg-[#003b2b] text-white px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold hover:bg-[#005140] transition-all shadow-md flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-base">storefront</span>
                        <span>Về Sàn HUKI</span>
                      </Link>
                      <Link
                        to="/seller/register"
                        className="bg-white border border-[#e8e5df] text-[#17201f] px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold hover:bg-[#fbf9f4] transition-all flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-base">edit_document</span>
                        <span>Xem / Sửa Hồ Sơ</span>
                      </Link>
                    </>
                  )}
                </div>
              </div>

              {/* Progress Stepper Bar */}
              <div className="mt-8 pt-6 border-t border-[#e8e5df]">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Step 1 */}
                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#f2fbf9] border border-[#94f5d6]/50">
                    <div className="w-8 h-8 rounded-xl bg-[#006953] text-[#94f5d6] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-lg">check</span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#003b2b]">1. Nộp Hồ Sơ</h4>
                      <p className="text-[11px] text-[#6b7280]">Đã ghi nhận thông tin pháp lý</p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className={`flex items-start gap-3 p-3.5 rounded-2xl border ${
                    status === 'APPROVED'
                      ? 'bg-[#f2fbf9] border-[#94f5d6]/50'
                      : status === 'REJECTED'
                      ? 'bg-red-50/50 border-red-200'
                      : 'bg-amber-50/60 border-amber-200'
                  }`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      status === 'APPROVED'
                        ? 'bg-[#006953] text-[#94f5d6]'
                        : status === 'REJECTED'
                        ? 'bg-[#ac2c19] text-white'
                        : 'bg-amber-500 text-white animate-pulse'
                    }`}>
                      <span className="material-symbols-outlined text-lg">
                        {status === 'APPROVED' ? 'check' : status === 'REJECTED' ? 'close' : 'hourglass_top'}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#17201f]">2. Thẩm Định Pháp Chế</h4>
                      <p className="text-[11px] text-[#6b7280]">
                        {status === 'APPROVED'
                          ? 'Đã thẩm định hợp lệ'
                          : status === 'REJECTED'
                          ? 'Chưa đạt yêu cầu'
                          : 'Đang rà soát giấy tờ'}
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className={`flex items-start gap-3 p-3.5 rounded-2xl border ${
                    status === 'APPROVED'
                      ? 'bg-[#f2fbf9] border-[#94f5d6]/50'
                      : 'bg-[#f8f6f1] border-[#e8e5df] opacity-75'
                  }`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      status === 'APPROVED'
                        ? 'bg-[#006953] text-[#94f5d6]'
                        : 'bg-gray-200 text-gray-500'
                    }`}>
                      <span className="material-symbols-outlined text-lg">
                        {status === 'APPROVED' ? 'verified' : 'lock'}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#17201f]">3. Phê Duyệt Gian Hàng</h4>
                      <p className="text-[11px] text-[#6b7280]">
                        {status === 'APPROVED' ? 'Đã kích hoạt Seller' : 'Chờ hoàn tất bước 2'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Two Column Layout: Business Submitted Details (7 cols) & Support/Documents (5 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Business Submitted Details (7 cols) */}
              <div className="lg:col-span-7 bg-white rounded-3xl border border-[#e8e5df] p-6 sm:p-7 shadow-xs">
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#e8e5df]">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#003b2b] text-xl">domain</span>
                    <h3 className="font-editorial text-lg font-bold text-[#17201f]">
                      Thông Tin Đơn Vị Đã Đăng Ký
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-[#6b7280]">
                    Mã số: {business?.taxCode || '0318926410'}
                  </span>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-gray-100">
                    <span className="text-[#6b7280]">Tên doanh nghiệp / NXB:</span>
                    <span className="font-bold text-[#17201f] text-right">
                      {business?.name || 'CÔNG TY TNHH PHÁT HÀNH SÁCH VÀ NỘI DUNG SỐ TRÍ TUỆ VIỆT'}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-gray-100">
                    <span className="text-[#6b7280]">Mã số thuế (MST):</span>
                    <span className="font-mono font-bold text-[#003b2b]">
                      {business?.taxCode || '0318926410'}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-gray-100">
                    <span className="text-[#6b7280]">Người đại diện pháp luật:</span>
                    <span className="font-semibold text-[#17201f]">
                      {business?.repName || user?.fullName || 'Nguyễn Văn Hùng'}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-gray-100">
                    <span className="text-[#6b7280]">Email liên hệ pháp lý:</span>
                    <span className="font-semibold text-[#17201f]">
                      {business?.email || user?.email || 'publisher@trituevietbooks.vn'}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-gray-100">
                    <span className="text-[#6b7280]">Trụ sở chính:</span>
                    <span className="font-medium text-[#17201f] text-right max-w-sm">
                      {business?.address || 'Tầng 6, Tòa nhà Văn phòng Tri Thức, 45 Lê Duẩn, Quận 1, TP.HCM'}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-gray-100">
                    <span className="text-[#6b7280]">Thời điểm nộp hồ sơ:</span>
                    <span className="font-medium text-[#17201f]">
                      {business?.createdAt ? new Date(business.createdAt).toLocaleString('vi-VN') : 'Hôm nay'}
                    </span>
                  </div>
                </div>

                {/* Bottom Notice */}
                <div className="mt-6 p-4 rounded-2xl bg-[#f8f6f1] border border-[#e8e5df] text-xs text-[#6b7280] flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#003b2b] text-base shrink-0 mt-0.5">verified_user</span>
                  <p className="leading-relaxed text-[11px]">
                    Hồ sơ được mã hóa và bảo mật nghiêm ngặt theo tiêu chuẩn ISO/IEC 27001 của Nền tảng Bản quyền số HuKi.
                  </p>
                </div>
              </div>

              {/* Right Column: Support & Document Checklist (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Submitted Documents Box */}
                <div className="bg-white rounded-3xl border border-[#e8e5df] p-6 shadow-xs">
                  <div className="flex items-center gap-2 pb-3 mb-3 border-b border-[#e8e5df]">
                    <span className="material-symbols-outlined text-[#003b2b] text-xl">folder_special</span>
                    <h3 className="font-editorial text-base font-bold text-[#17201f]">
                      Giấy Tờ Pháp Lý Đính Kèm
                    </h3>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      { icon: 'description', title: 'Giấy phép ĐKKD / Quyết định NXB', status: 'Đã đính kèm', ok: true },
                      { icon: 'shield', title: 'Cam kết bảo hộ bản quyền DRM', status: 'Đã ký điện tử', ok: true },
                      { icon: 'storefront', title: 'Hồ sơ gian hàng & Kho vận', status: 'Đầy đủ', ok: true },
                    ].map((doc, dIdx) => (
                      <div key={dIdx} className="flex items-center justify-between p-3 rounded-xl bg-[#fbf9f4] border border-[#e8e5df] text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="material-symbols-outlined text-base text-[#003b2b]">{doc.icon}</span>
                          <span className="font-medium text-[#17201f]">{doc.title}</span>
                        </div>
                        <span className="text-[10px] font-bold text-[#006953] bg-emerald-50 px-2 py-0.5 rounded-md">
                          {doc.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Support Hotline Card */}
                <div className="bg-gradient-to-br from-[#003b2b] to-[#00241a] rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
                  <div className="relative z-10">
                    <span className="material-symbols-outlined text-3xl text-[#94f5d6] mb-3">headset_mic</span>
                    <h4 className="font-editorial text-lg font-bold mb-1">Cần Hỗ Trợ Xét Duyệt Nhanh?</h4>
                    <p className="text-xs text-white/80 leading-relaxed mb-4">
                      Liên hệ trực tiếp Ban Thư ký &amp; Pháp chế HUKI nếu đơn vị của bạn cần xuất bản sách gấp.
                    </p>
                    <div className="flex flex-col gap-2">
                      <a
                        href="tel:19008866"
                        className="bg-[#94f5d6] text-[#003b2b] py-2.5 px-4 rounded-xl text-xs font-bold hover:bg-white transition-all text-center flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-base">call</span>
                        <span>Hotline: 1900 8866 (Pháp Chế)</span>
                      </a>
                      <a
                        href="mailto:phapche@hukiebook.vn"
                        className="bg-white/10 hover:bg-white/15 text-white py-2 px-4 rounded-xl text-xs font-medium transition-all text-center flex items-center justify-center gap-1.5 border border-white/20"
                      >
                        <span className="material-symbols-outlined text-base">mail</span>
                        <span>phapche@hukiebook.vn</span>
                      </a>
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}
      </main>
    </div>
  );
}

