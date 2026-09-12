import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { businessApi } from '../../api/businessApi';
import { catalogApi } from '../../api/catalogApi';

export default function AdminDashboardPage() {
  const [timeRange, setTimeRange] = useState('Hôm nay');
  const [stats, setStats] = useState({
    publishersCount: 0,
    pendingPublishersCount: 0,
    booksCount: 0,
    publishedBooksCount: 0,
    draftBooksCount: 0,
    drmBooksCount: 0,
    totalStock: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [bizRes, booksRes] = await Promise.allSettled([
          businessApi.getAllBusinesses(),
          catalogApi.getPublicBooks({ limit: 100 })
        ]);

        let pubCount = 0;
        let pendingCount = 0;
        let bCount = 0;
        let pubBCount = 0;
        let draftBCount = 0;
        let drmBCount = 0;
        let tStock = 0;

        if (bizRes.status === 'fulfilled' && bizRes.value?.success && Array.isArray(bizRes.value.data)) {
          const list = bizRes.value.data;
          pubCount = list.length;
          pendingCount = list.filter(b => b.status === 'PENDING_APPROVAL').length;
        }

        if (booksRes.status === 'fulfilled' && booksRes.value?.success && Array.isArray(booksRes.value.data)) {
          const books = booksRes.value.data;
          bCount = books.length;
          pubBCount = books.filter(b => b.status === 'PUBLISHED').length;
          draftBCount = books.filter(b => b.status === 'DRAFT' || !b.status).length;
          drmBCount = books.filter(b => b.format === 'DIGITAL' || b.format === 'BOTH' || b.digitalDetails?.drmEnabled).length;
          tStock = books.reduce((sum, b) => sum + (b.physicalDetails?.stock || 0), 0);
        }

        if (isMounted) {
          setStats({
            publishersCount: pubCount,
            pendingPublishersCount: pendingCount,
            booksCount: bCount,
            publishedBooksCount: pubBCount,
            draftBooksCount: draftBCount,
            drmBooksCount: drmBCount,
            totalStock: tStock,
          });
        }
      } catch (err) {
        console.warn('Failed to load admin stats', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="flex flex-col gap-6 max-w-[1480px] mx-auto">
      
      {/* 1. TOP EXECUTIVE GREETING & PLATFORM CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-semibold text-gray-500">Kính chào Quản trị viên,</span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
              SUPER ADMIN • HUKI HEADQUARTERS
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-0.5 font-editorial">
            Bảng Điều Hành Toàn Sàn HUKI
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Giám sát tổng doanh thu GMV, kiểm duyệt bản quyền số Ebook DRM, điều phối NXB &amp; an ninh nền tảng.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link
            to="/admin/leads"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-900 font-semibold text-xs transition-colors shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px] text-amber-700">how_to_reg</span>
            <span>Duyệt Đăng Ký Mới ({stats.pendingPublishersCount})</span>
          </Link>

          <Link
            to="/admin/publishers"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] hover:bg-gray-50 text-gray-700 font-semibold text-xs transition-colors shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px] text-emerald-700">domain</span>
            <span>Quản Lý NXB ({stats.publishersCount})</span>
          </Link>

          <Link
            to="/admin/tasks"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">verified</span>
            <span>Duyệt Sách Mới ({stats.draftBooksCount})</span>
          </Link>
        </div>
      </div>

      {/* 2. 4 TOP KPI CARDS (PLATFORM-WIDE METRICS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        
        {/* Card 1: Tổng NXB & Tác Giả */}
        <Link 
          to="/admin/publishers"
          className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs flex flex-col justify-between hover:shadow-sm hover:border-[#00875A]/40 transition-all group"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-gray-500 group-hover:text-[#00875A] transition-colors">Đối Tác NXB &amp; Doanh Nghiệp</span>
              <div className="text-2xl sm:text-[28px] font-extrabold text-gray-900 mt-1">{loading ? '…' : stats.publishersCount}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#EBF7F2] text-[#00875A] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[20px]">domain</span>
            </div>
          </div>
          <div className="mt-3.5 flex items-center gap-1.5 text-xs font-bold text-amber-700">
            <span className="material-symbols-outlined text-[16px]">pending_actions</span>
            <span>{stats.pendingPublishersCount} hồ sơ chờ duyệt</span>
          </div>
        </Link>

        {/* Card 2: Tổng Đầu Sách Toàn Sàn */}
        <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs flex flex-col justify-between hover:shadow-sm transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-gray-500">Tổng Đầu Sách Toàn Sàn</span>
              <div className="text-2xl sm:text-[28px] font-extrabold text-gray-900 mt-1">{loading ? '…' : stats.booksCount}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">library_books</span>
            </div>
          </div>
          <div className="mt-3.5 flex items-center gap-1.5 text-xs font-bold text-[#2563EB]">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            <span>{stats.publishedBooksCount} sách đang bán công khai</span>
          </div>
        </div>

        {/* Card 3: Bản Quyền Ebook & DRM */}
        <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs flex flex-col justify-between hover:shadow-sm transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-gray-500">Ấn Phẩm Ebook &amp; DRM</span>
              <div className="text-2xl sm:text-[28px] font-extrabold text-gray-900 mt-1">{loading ? '…' : stats.drmBooksCount}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#FAF5FF] text-[#9333EA] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">security</span>
            </div>
          </div>
          <div className="mt-3.5 flex items-center gap-1.5 text-xs font-bold text-[#9333EA]">
            <span className="material-symbols-outlined text-[16px]">verified</span>
            <span>Bảo vệ quyền tác giả số</span>
          </div>
        </div>

        {/* Card 4: Tổng Kho Sách Giấy */}
        <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs flex flex-col justify-between hover:shadow-sm transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-gray-500">Tổng Tồn Kho Sách Giấy</span>
              <div className="text-2xl sm:text-[28px] font-extrabold text-gray-900 mt-1">{loading ? '…' : stats.totalStock.toLocaleString('vi-VN')}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] text-[#16A34A] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">warehouse</span>
            </div>
          </div>
          <div className="mt-3.5 flex items-center gap-1.5 text-xs font-bold text-[#16A34A]">
            <span className="material-symbols-outlined text-[16px]">inventory</span>
            <span>Cập nhật trực tiếp từ kho NXB</span>
          </div>
        </div>
      </div>

      {/* QUICK ADMIN ACTION STRIP */}
      <div className="bg-gradient-to-r from-[#003B2B] to-[#005E44] text-white rounded-2xl p-4.5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-amber-300 shrink-0">
            <span className="material-symbols-outlined text-[22px]">notification_important</span>
          </div>
          <div>
            <div className="font-bold text-sm text-white">Yêu Cầu Cần Ban Quản Trị Phê Duyệt Ngay:</div>
            <p className="text-xs text-emerald-100/90 mt-0.5">
              12 tựa sách mới chờ mã hóa DRM · 3 NXB nộp hồ sơ xin cấp dấu Official Mall · 2 khiếu nại bản quyền cần xác minh
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            to="/admin/leads"
            className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold backdrop-blur-md transition-all"
          >
            Duyệt NXB Mới
          </Link>
          <Link
            to="/admin/tasks"
            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 text-xs font-bold shadow-xs transition-all"
          >
            Kiểm Duyệt Sách
          </Link>
        </div>
      </div>

      {/* 3. ROW 1 CHARTS (SALES PIPELINE & DEAL STAGES) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* 3.1 SALES PIPELINE (7 Cols - Toàn sàn HUKI) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-gray-900">Tiến Trình Phát Hành &amp; Phễu Doanh Số Sàn</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">Phễu tổng hợp lưu lượng từ các NXB đối tác</p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg">
              <span>Tháng này</span>
              <span className="material-symbols-outlined text-[14px]">expand_more</span>
            </div>
          </div>

          <div className="space-y-3.5 py-2">
            {[
              { stage: 'Độc giả đọc thử Ebook', value: 12400, max: 12400, color: 'bg-[#4ADE80]' },
              { stage: 'Thêm vào giỏ hàng', value: 8320, max: 12400, color: 'bg-[#6EE7B7]' },
              { stage: 'Tạo đơn hàng đặt mua', value: 5400, max: 12400, color: 'bg-[#A7F3D0]' },
              { stage: 'Đang vận chuyển & Cấp DRM', value: 3100, max: 12400, color: 'bg-[#86EFAC]' },
              { stage: 'Giao & Kích hoạt thành công', value: 2080, max: 12400, color: 'bg-[#15803D]' },
            ].map((item, i) => (
              <div key={i} className="flex items-center text-xs font-medium text-gray-700">
                <span className="w-44 sm:w-48 shrink-0 font-semibold truncate">{item.stage}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-4.5 overflow-hidden mx-2 relative">
                  <div 
                    className={`h-full ${item.color} rounded-full transition-all duration-500`}
                    style={{ width: `${(item.value / item.max) * 100}%` }}
                  ></div>
                </div>
                <span className="w-16 text-right font-bold text-gray-900">{item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 3.2 DEAL STAGES (5 Cols Donut Chart - Tỷ trọng doanh thu định dạng) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-gray-900">Cơ Cấu Doanh Thu Theo Định Dạng Sách</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">Tỷ trọng doanh thu theo từng dòng xuất bản</p>
            </div>
            <Link to="/admin/deals" className="text-xs font-bold text-[#00875A] hover:underline">
              Chi tiết
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-around gap-4 py-2">
            {/* SVG Donut */}
            <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="38" stroke="#F1F5F9" strokeWidth="14" fill="none" />
                <circle cx="50" cy="50" r="38" stroke="#00875A" strokeWidth="14" fill="none"
                  strokeDasharray="238.76" strokeDashoffset="0" className="transition-all duration-700" />
                <circle cx="50" cy="50" r="38" stroke="#06B6D4" strokeWidth="14" fill="none"
                  strokeDasharray="238.76" strokeDashoffset="-66.85" className="transition-all duration-700" />
                <circle cx="50" cy="50" r="38" stroke="#3B82F6" strokeWidth="14" fill="none"
                  strokeDasharray="238.76" strokeDashoffset="-126.54" className="transition-all duration-700" />
                <circle cx="50" cy="50" r="38" stroke="#F59E0B" strokeWidth="14" fill="none"
                  strokeDasharray="238.76" strokeDashoffset="-174.29" className="transition-all duration-700" />
                <circle cx="50" cy="50" r="38" stroke="#FB7185" strokeWidth="14" fill="none"
                  strokeDasharray="238.76" strokeDashoffset="-210.1" className="transition-all duration-700" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-xl font-extrabold text-gray-900 leading-tight">5.4k</span>
                <span className="text-[9.5px] text-gray-500 font-semibold uppercase">Giao Dịch Sàn</span>
              </div>
            </div>

            {/* Legend List */}
            <div className="space-y-1.5 text-xs w-full sm:w-auto">
              {[
                { name: 'Sách Giấy In', pct: '28%', color: 'bg-[#00875A]' },
                { name: 'Ebook DRM', pct: '25%', color: 'bg-[#06B6D4]' },
                { name: 'Combo Hybrid', pct: '20%', color: 'bg-[#3B82F6]' },
                { name: 'Audiobook', pct: '15%', color: 'bg-[#F59E0B]' },
                { name: 'Bản Bìa Cứng Limited', pct: '12%', color: 'bg-[#FB7185]' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${item.color}`}></span>
                    <span className="text-gray-600 font-medium">{item.name}</span>
                  </div>
                  <span className="font-bold text-gray-900">{item.pct}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. ROW 2 CHARTS (CUSTOMER ACQUISITION & CONVERSION FUNNEL) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* 4.1 Tăng trưởng Độc giả 6 tháng */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-gray-900">Tăng Trưởng Bạn Đọc Mới Toàn Sàn</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">Số lượng tài khoản bạn đọc mới gia nhập sàn trong 6 tháng qua</p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg">
              <span>Tháng 6/2026</span>
              <span className="material-symbols-outlined text-[14px]">expand_more</span>
            </div>
          </div>

          <div className="relative pt-6 pb-2">
            <div className="h-44 w-full relative">
              <div className="absolute inset-0 flex flex-col justify-between text-[10px] text-gray-400 pointer-events-none">
                <div className="border-b border-gray-100 w-full flex justify-between"><span>10k độc giả</span></div>
                <div className="border-b border-gray-100 w-full flex justify-between"><span>7.5k</span></div>
                <div className="border-b border-gray-100 w-full flex justify-between"><span>5k</span></div>
                <div className="border-b border-gray-100 w-full flex justify-between"><span>2.5k</span></div>
                <div className="border-b border-gray-100 w-full flex justify-between"><span>0</span></div>
              </div>

              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 500 150">
                <defs>
                  <linearGradient id="adminAcqGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22C55E" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#22C55E" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 20 120 Q 70 140 120 100 T 220 90 T 320 60 T 420 30 T 480 20 L 480 150 L 20 150 Z"
                  fill="url(#adminAcqGradient)"
                />
                <path
                  d="M 20 120 Q 70 140 120 100 T 220 90 T 320 60 T 420 30 T 480 20"
                  fill="none"
                  stroke="#16A34A"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <circle cx="420" cy="30" r="5" fill="#16A34A" stroke="#FFFFFF" strokeWidth="2" />
              </svg>

              <div className="absolute top-2 right-14 bg-[#1E293B] text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow-lg flex flex-col items-center">
                <span>7.200 bạn đọc</span>
                <span className="text-[9px] text-gray-400 font-normal">Tháng 6/2026</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] font-semibold text-gray-500 mt-3 px-3">
              <span>Tháng 1</span>
              <span>Tháng 2</span>
              <span>Tháng 3</span>
              <span>Tháng 4</span>
              <span>Tháng 5</span>
              <span>Tháng 6</span>
            </div>
          </div>
        </div>

        {/* 4.2 Phễu Chuyển Đổi Mua Sách Toàn Sàn */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-gray-900">Tỷ Lệ Chuyển Đổi Độc Giả Mua Hàng</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">Tỷ lệ hoàn tất thanh toán từ lượt xem sách</p>
            </div>
            <Link to="/admin/reports" className="text-xs font-bold text-[#00875A] hover:underline">
              Báo cáo
            </Link>
          </div>

          <div className="space-y-2 py-1 flex flex-col items-center">
            <div className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#22C55E] text-white text-xs font-bold shadow-xs">
              <span>Lượt xem sách &amp; Đọc thử</span>
              <div className="flex items-center gap-3">
                <span>43.200</span>
                <span className="text-[10px] text-emerald-100 font-normal">100%</span>
              </div>
            </div>

            <div className="w-[82%] flex items-center justify-between px-3 py-2 rounded-xl bg-[#4ADE80] text-gray-900 text-xs font-bold shadow-xs">
              <span>Thêm giỏ / Wishlist</span>
              <div className="flex items-center gap-3">
                <span>21.600</span>
                <span className="text-[10px] text-gray-700 font-semibold">50%</span>
              </div>
            </div>

            <div className="w-[66%] flex items-center justify-between px-3 py-2 rounded-xl bg-[#86EFAC] text-gray-900 text-xs font-bold shadow-xs">
              <span>Tiến hành Checkout</span>
              <div className="flex items-center gap-3">
                <span>8.640</span>
                <span className="text-[10px] text-gray-700 font-semibold">20%</span>
              </div>
            </div>

            <div className="w-[50%] flex items-center justify-between px-3 py-2 rounded-xl bg-[#15803D] text-white text-xs font-bold shadow-xs">
              <span>Thanh toán thành công</span>
              <div className="flex items-center gap-3">
                <span>4.320</span>
                <span className="text-[10px] text-emerald-200 font-normal">10%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. ROW 3 ACTIVITY WIDGETS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        
        {/* Widget 1: Lịch Trình Ban Quản Trị */}
        <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#00875A] text-[18px]">event_note</span>
              <span>Lịch Sự Kiện &amp; Thẩm Định NXB</span>
            </h2>
            <Link to="/admin/calendar" className="text-xs font-bold text-[#00875A] hover:underline">
              Xem lịch
            </Link>
          </div>

          <div className="space-y-3">
            {[
              { day: '10', month: 'T6', title: 'Thẩm định hồ sơ NXB Văn Học', place: 'Phòng họp trực tuyến', time: '10:00 SA', color: 'bg-emerald-500' },
              { day: '11', month: 'T6', title: 'Bảo trì & nâng cấp DRM Server v2.4', place: 'Cluster Singapore', time: '02:00 CH', color: 'bg-blue-500' },
              { day: '12', month: 'T6', title: 'Họp đối soát doanh thu Q2/2026', place: 'Ban Tài Chính HUKI', time: '11:30 SA', color: 'bg-amber-500' },
              { day: '13', month: 'T6', title: 'Khai mạc Hội Sách Tri Thức 2026', place: 'HUKI Grand Expo', time: '04:00 CH', color: 'bg-purple-500' }
            ].map((task, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs py-1 hover:bg-gray-50 rounded-lg px-1.5 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="text-center w-7 shrink-0">
                    <span className="block font-bold text-gray-900 leading-none">{task.day}</span>
                    <span className="text-[10px] text-gray-400 uppercase">{task.month}</span>
                  </div>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${task.color}`}></span>
                  <div className="min-w-0">
                    <div className="font-bold text-gray-800 truncate">{task.title}</div>
                    <span className="text-[10px] text-gray-400 block truncate">{task.place}</span>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-gray-500 shrink-0">{task.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Widget 2: Khiếu Nại & Yêu Cầu Hỗ Trợ */}
        <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#00875A] text-[18px]">support_agent</span>
              <span>Yêu Cầu &amp; Khiếu Nại Sàn</span>
            </h2>
            <Link to="/admin/support" className="text-xs font-bold text-[#00875A] hover:underline">
              Xử lý
            </Link>
          </div>

          <div className="space-y-3">
            {[
              { name: 'NXB Kim Đồng', msg: 'Yêu cầu mở rộng băng thông phát hành Manga EPUB số lượng lớn...', time: '10:24', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80' },
              { name: 'Nhà sách Nhã Nam', msg: 'Xin cấp quyền mở đợt Pre-order sách giới hạn có chữ ký...', time: 'Hôm qua', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80' },
              { name: 'Độc giả VIP Minh Trí', msg: 'Cần hỗ trợ chuyển đổi thiết bị đọc Ebook DRM thứ 4...', time: 'Hôm qua', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80' },
              { name: 'First News Trí Việt', msg: 'Hoàn tất đối soát hoa hồng tháng 5/2026, xin xuất ủy nhiệm chi.', time: '08/06', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&q=80' }
            ].map((msg, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs py-1 hover:bg-gray-50 rounded-lg px-1.5 transition-colors cursor-pointer">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img src={msg.avatar} alt={msg.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900 truncate">{msg.name}</div>
                    <p className="text-[11px] text-gray-500 truncate">{msg.msg}</p>
                  </div>
                </div>
                <span className="text-[10px] text-gray-400 shrink-0 ml-2 font-medium">{msg.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Widget 3: Nhật Ký Audit Log Quản Trị */}
        <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#00875A] text-[18px]">history_edu</span>
              <span>Nhật Ký Quản Trị (Audit Log)</span>
            </h2>
            <Link to="/admin/settings" className="text-xs font-bold text-[#00875A] hover:underline">
              Chi tiết
            </Link>
          </div>

          <div className="space-y-3">
            {[
              { admin: 'Admin Thẩm Định', action: 'phê duyệt cấp dấu Official Mall cho NXB Trẻ', time: '1h trước', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80' },
              { admin: 'Admin Bản Quyền', action: 'duyệt phát hành 14 đầu sách Ebook DRM mới', time: '3h trước', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&q=80' },
              { admin: 'Kế Toán Trưởng', action: 'chốt bảng đối soát doanh thu 85/15 đợt 1', time: '5h trước', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&q=80' },
              { admin: 'Hệ Thống Tự Động', action: 'kích hoạt chiến dịch Flash Deal đồng giá 19K', time: '1d trước', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80' }
            ].map((act, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs py-1 hover:bg-gray-50 rounded-lg px-1.5 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img src={act.avatar} alt={act.admin} className="w-8 h-8 rounded-full object-cover shrink-0" />
                  <div className="min-w-0">
                    <span className="font-bold text-gray-900">{act.admin} </span>
                    <span className="text-gray-500 text-[11px]">{act.action}</span>
                  </div>
                </div>
                <span className="text-[10px] text-gray-400 shrink-0 ml-2 font-medium">{act.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
