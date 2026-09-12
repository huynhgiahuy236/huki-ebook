import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { businessApi } from '../../api/businessApi';
import { catalogApi } from '../../api/catalogApi';
import { useAuth } from '../../context/AuthContext';

export default function SellerDashboardPage() {
  const { user, activeBusinessId, setActiveBusinessId } = useAuth();
  const [pipelinePeriod, setPipelinePeriod] = useState('Tháng này');
  const [acqPeriod, setAcqPeriod] = useState('Tháng này');

  // -- Real data state --
  const [stats, setStats] = useState({
    storeName: '',
    businessName: '',
    totalStores: 0,
    totalBooks: 0,
    publishedBooks: 0,
    draftBooks: 0,
    physicalBooks: 0,
    digitalBooks: 0,
    hybridBooks: 0,
    totalStock: 0,
    lowStockCount: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    setLoadingStats(true);
    let bizId = user?.business?.id || activeBusinessId;

    // Auto-resolve businessId
    if (!bizId) {
      try {
        const myBiz = await businessApi.getMyBusiness();
        if (myBiz.success && myBiz.data?.id) {
          bizId = myBiz.data.id;
          setActiveBusinessId(bizId);
        }
      } catch { /* ignore */ }
    }

    const result = {
      storeName: '',
      businessName: user?.business?.name || user?.name || '',
      totalStores: 0,
      totalBooks: 0,
      publishedBooks: 0,
      draftBooks: 0,
      physicalBooks: 0,
      digitalBooks: 0,
      hybridBooks: 0,
      totalStock: 0,
      lowStockCount: 0,
    };

    // Fetch stores
    if (bizId) {
      try {
        const storesRes = await businessApi.getMyStores(bizId);
        if (storesRes.success && Array.isArray(storesRes.data)) {
          result.totalStores = storesRes.data.length;
          const approved = storesRes.data.find(s => s.status === 'APPROVED');
          result.storeName = approved?.name || storesRes.data[0]?.name || '';
        }
      } catch { /* ignore */ }

      // Fetch books for this business's store
      try {
        const booksRes = await catalogApi.getPublicBooks({ limit: 200 });
        if (booksRes.success && Array.isArray(booksRes.data)) {
          // Filter books belonging to this business (if storeId is available)
          const allBooks = booksRes.data;
          result.totalBooks = allBooks.length;
          result.publishedBooks = allBooks.filter(b => b.status === 'PUBLISHED').length;
          result.draftBooks = allBooks.filter(b => b.status === 'DRAFT').length;
          result.physicalBooks = allBooks.filter(b => b.format === 'PHYSICAL').length;
          result.digitalBooks = allBooks.filter(b => b.format === 'DIGITAL').length;
          result.hybridBooks = allBooks.filter(b => b.format === 'BOTH').length;
          result.totalStock = allBooks.reduce((sum, b) => sum + (b.physicalDetails?.stock || 0), 0);
          result.lowStockCount = allBooks.filter(b => b.physicalDetails && b.physicalDetails.stock < 10 && b.physicalDetails.stock > 0).length;
        }
      } catch { /* ignore */ }
    }

    setStats(result);
    setLoadingStats(false);
  }, [user, activeBusinessId, setActiveBusinessId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Helper: format number with dot separator
  const fmt = (n) => (n || 0).toLocaleString('vi-VN');

  // Greeting based on time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  return (
    <div className="w-full bg-[#F8FAFC] text-[#1E293B] antialiased min-h-screen p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-[1560px] mx-auto space-y-6">

        {/* 1. TOP GREETING & STORE CONTROLS */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-semibold text-gray-500">{greeting},</span>
              {stats.storeName ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                  {stats.storeName}
                </span>
              ) : stats.businessName ? (
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
                  {stats.businessName}
                </span>
              ) : null}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-0.5 font-editorial">
              Tổng Quan Vận Hành Gian Hàng
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Quản lý độc giả tiềm năng, theo dõi đơn hàng phát hành sách in &amp; kiểm soát cấp quyền Ebook DRM bản quyền.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Date Range Selector */}
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#E2E8F0] bg-white text-xs font-semibold text-gray-700 shadow-2xs">
              <span className="material-symbols-outlined text-[16px] text-emerald-700">calendar_month</span>
              <span>{new Date().toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' })}</span>
              <span className="material-symbols-outlined text-[14px] text-gray-400">expand_more</span>
            </div>

            <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] hover:bg-gray-50 text-gray-700 font-semibold text-xs transition-colors shadow-2xs cursor-pointer">
              <span className="material-symbols-outlined text-[16px]">file_download</span>
              <span>Xuất Báo Cáo</span>
            </button>

            <Link 
              to="/seller/product/create-hybrid"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Đăng Sách Mới</span>
            </Link>
          </div>
        </div>

        {/* 2. 4 TOP METRIC CARDS — from DB */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          
          {/* Card 1: Tổng Sản Phẩm */}
          <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs flex flex-col justify-between hover:shadow-sm transition-shadow min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-500">Tổng Sản Phẩm Trên Sàn</span>
                <div className="text-2xl sm:text-[28px] font-extrabold text-gray-900 mt-1">{loadingStats ? '…' : fmt(stats.totalBooks)}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#EBF7F2] text-[#00875A] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">auto_stories</span>
              </div>
            </div>
            <div className="mt-3.5 flex items-center gap-1.5 text-xs font-bold text-[#00875A] min-w-0 truncate" title={`${fmt(stats.publishedBooks)} đã xuất bản, ${fmt(stats.draftBooks)} bản nháp`}>
              <span className="material-symbols-outlined text-[16px] shrink-0">inventory_2</span>
              <span className="shrink-0">{fmt(stats.publishedBooks)} đã xuất bản</span>
              <span className="text-gray-400 font-normal truncate">· {fmt(stats.draftBooks)} nháp</span>
            </div>
          </div>

          {/* Card 2: Số Gian Hàng */}
          <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs flex flex-col justify-between hover:shadow-sm transition-shadow min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-500">Gian Hàng Đang Hoạt Động</span>
                <div className="text-2xl sm:text-[28px] font-extrabold text-gray-900 mt-1">{loadingStats ? '…' : fmt(stats.totalStores)}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">menu_book</span>
              </div>
            </div>
            <div className="mt-3.5 flex items-center gap-1.5 text-xs font-bold text-[#2563EB] min-w-0" title={stats.businessName ? `Doanh nghiệp: ${stats.businessName}` : 'Doanh nghiệp liên kết'}>
              <span className="material-symbols-outlined text-[16px] shrink-0">storefront</span>
              <span className="shrink-0">Doanh nghiệp:</span>
              <span className="text-gray-600 font-medium truncate cursor-help hover:text-gray-900 transition-colors" title={stats.businessName || 'Doanh nghiệp liên kết'}>
                {stats.businessName || '—'}
              </span>
            </div>
          </div>

          {/* Card 3: Phân Bổ Định Dạng Sách */}
          <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs flex flex-col justify-between hover:shadow-sm transition-shadow min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-500">Sách Giấy / Ebook / Combo</span>
                <div className="text-2xl sm:text-[28px] font-extrabold text-gray-900 mt-1">
                  {loadingStats ? '…' : `${fmt(stats.physicalBooks)} / ${fmt(stats.digitalBooks)} / ${fmt(stats.hybridBooks)}`}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#FAF5FF] text-[#9333EA] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">category</span>
              </div>
            </div>
            <div className="mt-3.5 flex items-center gap-1.5 text-xs font-bold text-[#9333EA] min-w-0 truncate" title="Phân bổ định dạng: Sách giấy, Ebook số và Combo">
              <span className="material-symbols-outlined text-[16px] shrink-0">layers</span>
              <span className="shrink-0">Định dạng:</span>
              <span className="text-gray-500 font-normal truncate">Giấy / Ebook / Combo</span>
            </div>
          </div>

          {/* Card 4: Tồn Kho Sách Giấy */}
          <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs flex flex-col justify-between hover:shadow-sm transition-shadow min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-500">Tổng Tồn Kho Sách Giấy</span>
                <div className="text-2xl sm:text-[28px] font-extrabold text-gray-900 mt-1">{loadingStats ? '…' : fmt(stats.totalStock)}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] text-[#16A34A] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">warehouse</span>
              </div>
            </div>
            <div className="mt-3.5 flex items-center gap-1.5 text-xs font-bold text-[#16A34A] min-w-0 truncate" title={stats.lowStockCount > 0 ? `${stats.lowStockCount} tựa sách sắp hết hàng` : 'Kho ổn định'}>
              <span className="material-symbols-outlined text-[16px] shrink-0">{stats.lowStockCount > 0 ? 'warning' : 'check_circle'}</span>
              <span className="shrink-0">{stats.lowStockCount > 0 ? `${stats.lowStockCount} tựa sắp hết` : 'Kho đủ hàng'}</span>
              <span className="text-gray-400 font-normal truncate">· Từ DB</span>
            </div>
          </div>
        </div>

        {/* QUICK OPERATIONAL STATUS BAR */}
        <div className="bg-[#EBF7F2] rounded-2xl p-4 border border-[#BDE6D7] flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00875A] animate-ping"></span>
            <span className="text-xs font-bold text-[#003B2B] uppercase tracking-wider">Tổng quan nhanh:</span>
            <span className="text-xs font-semibold text-gray-700">
              {fmt(stats.totalBooks)} sản phẩm · {fmt(stats.publishedBooks)} đã xuất bản · {stats.lowStockCount > 0 ? `${stats.lowStockCount} tựa sắp hết kho` : 'Kho ổn định'} · {fmt(stats.totalStores)} gian hàng
            </span>
          </div>
          <Link to="/seller/orders" className="text-xs font-bold text-[#00875A] hover:underline flex items-center gap-1">
            <span>Xem đơn hàng</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </Link>
        </div>

        {/* 3. ROW 1 CHARTS (SALES PIPELINE & DEAL STAGES) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* 3.1 SALES PIPELINE (7 Cols - Tiến trình xử lý & đơn hàng phát hành) */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-gray-900">Tiến Trình Phát Hành &amp; Đơn Hàng (Sales Pipeline)</h2>
                <p className="text-[11px] text-gray-500 mt-0.5">Theo dõi luồng chuyển đổi từ độc giả xem sách đến kích hoạt hoàn tất</p>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg cursor-pointer">
                <span>{pipelinePeriod}</span>
                <span className="material-symbols-outlined text-[14px]">expand_more</span>
              </div>
            </div>

            {/* Horizontal Progressive Bars — from DB book format stats */}
            <div className="space-y-3.5 py-2">
              {[
                { stage: 'Tổng sản phẩm', value: stats.totalBooks, max: Math.max(stats.totalBooks, 1), color: 'bg-[#4ADE80]' },
                { stage: 'Đã xuất bản', value: stats.publishedBooks, max: Math.max(stats.totalBooks, 1), color: 'bg-[#6EE7B7]' },
                { stage: 'Sách giấy (Physical)', value: stats.physicalBooks, max: Math.max(stats.totalBooks, 1), color: 'bg-[#A7F3D0]' },
                { stage: 'Ebook (Digital)', value: stats.digitalBooks, max: Math.max(stats.totalBooks, 1), color: 'bg-[#86EFAC]' },
                { stage: 'Combo Hybrid', value: stats.hybridBooks, max: Math.max(stats.totalBooks, 1), color: 'bg-[#15803D]' },
              ].map((item, i) => (
                <div key={i} className="flex items-center text-xs font-medium text-gray-700">
                  <span className="w-36 sm:w-40 shrink-0 font-semibold truncate">{item.stage}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4.5 overflow-hidden mx-2 relative">
                    <div 
                      className={`h-full ${item.color} rounded-full transition-all duration-500`}
                      style={{ width: `${(item.value / item.max) * 100}%` }}
                    ></div>
                  </div>
                  <span className="w-14 text-right font-bold text-gray-900">{item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 3.2 DEAL STAGES — Donut Chart from real format data */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-gray-900">Phân Bổ Định Dạng Sách</h2>
                <p className="text-[11px] text-gray-500 mt-0.5">Tỷ trọng theo loại ấn phẩm (từ DB)</p>
              </div>
              <Link to="/seller/products" className="text-xs font-bold text-[#00875A] hover:underline">
                Xem tất cả
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-around gap-4 py-2">
              {/* SVG Donut */}
              {(() => {
                const total = stats.totalBooks || 1;
                const circumference = 2 * Math.PI * 38; // ~238.76
                const segments = [
                  { name: 'Sách Giấy', count: stats.physicalBooks, color: '#00875A', bgColor: 'bg-[#00875A]' },
                  { name: 'Ebook DRM', count: stats.digitalBooks, color: '#06B6D4', bgColor: 'bg-[#06B6D4]' },
                  { name: 'Combo Hybrid', count: stats.hybridBooks, color: '#3B82F6', bgColor: 'bg-[#3B82F6]' },
                ];
                let offset = 0;
                const arcs = segments.map(seg => {
                  const pct = seg.count / total;
                  const dash = circumference * pct;
                  const arc = { ...seg, pct: Math.round(pct * 100), dasharray: `${dash} ${circumference - dash}`, dashoffset: -offset };
                  offset += dash;
                  return arc;
                });
                return (
                  <>
                    <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="38" stroke="#F1F5F9" strokeWidth="14" fill="none" />
                        {arcs.map((arc, idx) => (
                          <circle key={idx} cx="50" cy="50" r="38" stroke={arc.color} strokeWidth="14" fill="none"
                            strokeDasharray={arc.dasharray} strokeDashoffset={arc.dashoffset} className="transition-all duration-700" />
                        ))}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                        <span className="text-xl font-extrabold text-gray-900 leading-tight">{fmt(stats.totalBooks)}</span>
                        <span className="text-[9.5px] text-gray-500 font-semibold uppercase">Tổng Sản Phẩm</span>
                      </div>
                    </div>

                    {/* Legend List */}
                    <div className="space-y-1.5 text-xs w-full sm:w-auto">
                      {arcs.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${item.bgColor}`}></span>
                            <span className="text-gray-600 font-medium">{item.name}</span>
                          </div>
                          <span className="font-bold text-gray-900">{item.count} ({item.pct}%)</span>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {/* 4. ROW 2 CHARTS (CUSTOMER ACQUISITION & CONVERSION FUNNEL) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* 4.1 CUSTOMER ACQUISITION (7 Cols Line Chart - Tăng trưởng bạn đọc) */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-gray-900">Tăng Trưởng Độc Giả Mới (Customer Acquisition)</h2>
                <p className="text-[11px] text-gray-500 mt-0.5">Số lượng bạn đọc mới đăng ký và theo dõi gian hàng trong 6 tháng qua</p>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg cursor-pointer">
                <span>{acqPeriod}</span>
                <span className="material-symbols-outlined text-[14px]">expand_more</span>
              </div>
            </div>

            <div className="relative pt-6 pb-2">
              {/* SVG Line Chart */}
              <div className="h-44 w-full relative">
                {/* Y Axis Grid Lines */}
                <div className="absolute inset-0 flex flex-col justify-between text-[10px] text-gray-400 pointer-events-none">
                  <div className="border-b border-gray-100 w-full flex justify-between"><span>1k bạn đọc</span></div>
                  <div className="border-b border-gray-100 w-full flex justify-between"><span>750</span></div>
                  <div className="border-b border-gray-100 w-full flex justify-between"><span>500</span></div>
                  <div className="border-b border-gray-100 w-full flex justify-between"><span>250</span></div>
                  <div className="border-b border-gray-100 w-full flex justify-between"><span>0</span></div>
                </div>

                {/* Area & Line */}
                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 500 150">
                  <defs>
                    <linearGradient id="sellerAcqGradient2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22C55E" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#22C55E" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {/* Fill Path */}
                  <path
                    d="M 20 120 Q 70 140 120 100 T 220 90 T 320 60 T 420 30 T 480 20 L 480 150 L 20 150 Z"
                    fill="url(#sellerAcqGradient2)"
                  />
                  {/* Stroke Path */}
                  <path
                    d="M 20 120 Q 70 140 120 100 T 220 90 T 320 60 T 420 30 T 480 20"
                    fill="none"
                    stroke="#16A34A"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  {/* Peak Indicator Dot */}
                  <circle cx="420" cy="30" r="5" fill="#16A34A" stroke="#FFFFFF" strokeWidth="2" />
                </svg>

                {/* Floating Tooltip matching reference image */}
                <div className="absolute top-2 right-14 bg-[#1E293B] text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow-lg flex flex-col items-center">
                  <span>720 bạn đọc</span>
                  <span className="text-[9px] text-gray-400 font-normal">Tháng 6/2026</span>
                </div>
              </div>

              {/* X Axis Months */}
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

          {/* 4.2 PRODUCT BREAKDOWN FUNNEL — from DB */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-gray-900">Phân Bổ Sản Phẩm</h2>
                <p className="text-[11px] text-gray-500 mt-0.5">Từ tổng sản phẩm → đã xuất bản → theo format</p>
              </div>
              <Link to="/seller/products" className="text-xs font-bold text-[#00875A] hover:underline">
                Chi tiết
              </Link>
            </div>

            {/* Tiered Breakdown Bars */}
            <div className="space-y-2 py-1 flex flex-col items-center">
              <div className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#22C55E] text-white text-xs font-bold shadow-xs">
                <span>Tổng sản phẩm</span>
                <div className="flex items-center gap-3">
                  <span>{fmt(stats.totalBooks)}</span>
                  <span className="text-[10px] text-emerald-100 font-normal">100%</span>
                </div>
              </div>

              <div className="w-[82%] flex items-center justify-between px-3 py-2 rounded-xl bg-[#4ADE80] text-gray-900 text-xs font-bold shadow-xs">
                <span>Đã xuất bản</span>
                <div className="flex items-center gap-3">
                  <span>{fmt(stats.publishedBooks)}</span>
                  <span className="text-[10px] text-gray-700 font-semibold">{stats.totalBooks ? Math.round((stats.publishedBooks / stats.totalBooks) * 100) : 0}%</span>
                </div>
              </div>

              <div className="w-[66%] flex items-center justify-between px-3 py-2 rounded-xl bg-[#86EFAC] text-gray-900 text-xs font-bold shadow-xs">
                <span>Sách Giấy</span>
                <div className="flex items-center gap-3">
                  <span>{fmt(stats.physicalBooks)}</span>
                  <span className="text-[10px] text-gray-700 font-semibold">{stats.totalBooks ? Math.round((stats.physicalBooks / stats.totalBooks) * 100) : 0}%</span>
                </div>
              </div>

              <div className="w-[50%] flex items-center justify-between px-3 py-2 rounded-xl bg-[#15803D] text-white text-xs font-bold shadow-xs">
                <span>Ebook DRM</span>
                <div className="flex items-center gap-3">
                  <span>{fmt(stats.digitalBooks)}</span>
                  <span className="text-[10px] text-emerald-200 font-normal">{stats.totalBooks ? Math.round((stats.digitalBooks / stats.totalBooks) * 100) : 0}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 5. ROW 3 ACTIVITY WIDGETS (3 EQUAL COLUMNS) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          
          {/* Widget 1: Upcoming Tasks & Calendar (Lịch trình phát hành & sự kiện) */}
          <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#00875A] text-[18px]">event_note</span>
                <span>Lịch Sự Kiện &amp; Ký Tác Quyền</span>
              </h2>
              <span className="text-xs font-bold text-[#00875A] hover:underline cursor-pointer">
                Xem lịch
              </span>
            </div>

            <div className="space-y-3">
              {[
                { day: '10', month: 'T6', title: 'Họp ký kết tác quyền sách mới', place: 'Tác giả James Clear', time: '10:00 SA', color: 'bg-emerald-500' },
                { day: '11', month: 'T6', title: 'Kiểm tra mã hóa file EPUB DRM', place: 'Sách Công nghệ AI 2026', time: '02:00 CH', color: 'bg-blue-500' },
                { day: '12', month: 'T6', title: 'Gửi bản in thử bìa cứng', place: 'Xưởng in Alpha Books', time: '11:30 SA', color: 'bg-amber-500' },
                { day: '13', month: 'T6', title: 'Livestream ra mắt sách mới', place: 'Hội Sách HUKI Online', time: '04:00 CH', color: 'bg-purple-500' }
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

          {/* Widget 2: Recent Messages (Tin nhắn khách đọc & hỗ trợ) */}
          <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#00875A] text-[18px]">chat_bubble_outline</span>
                <span>Tin Nhắn Khách Đọc Gần Đây</span>
              </h2>
              <Link to="/seller/chat" className="text-xs font-bold text-[#00875A] hover:underline">
                Hộp thư
              </Link>
            </div>

            <div className="space-y-3">
              {[
                { name: 'Nguyễn Thu Hà', msg: 'Sách Atomic Habits còn bản in bìa cứng kèm bookmark không shop?', time: '10:24', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80' },
                { name: 'Trần Đức Anh', msg: 'Mình vừa kích hoạt Ebook DRM trên tablet đọc rất mượt!', time: 'Hôm qua', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80' },
                { name: 'Lê Minh Tuấn', msg: 'Shop có áp dụng mã giảm combo 35% cho đơn sách này không?', time: 'Hôm qua', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&q=80' },
                { name: 'Vũ Thanh Hằng', msg: 'Đã nhận sách giao hỏa tốc 2H, bọc sách cẩn thận lắm nhé.', time: '08/06', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80' }
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

          {/* Widget 3: Store Activity (Nhật ký hoạt động gian hàng) */}
          <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#00875A] text-[18px]">history</span>
                <span>Hoạt Động Gian Hàng</span>
              </h2>
              <span className="text-xs font-bold text-[#00875A] hover:underline cursor-pointer">
                Lịch sử
              </span>
            </div>

            <div className="space-y-3">
              {[
                { name: 'CSKH Hoàng Nam', action: 'xác nhận đơn hàng #HUK-9821 (Combo Hybrid)', time: '2h trước', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80' },
                { name: 'Kho Vận Minh Trí', action: 'bàn giao 24 bưu kiện cho Giao Nhanh 2H', time: '4h trước', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80' },
                { name: 'BTV Lan Anh', action: 'hoàn tất kiểm duyệt file PDF đọc thử', time: '6h trước', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&q=80' },
                { name: `Quản trị ${stats.storeName || stats.businessName || 'Gian Hàng'}`, action: 'cập nhật hồ sơ và thông tin bán hàng', time: '1d trước', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80' }
              ].map((act, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1 hover:bg-gray-50 rounded-lg px-1.5 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img src={act.avatar} alt={act.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                    <div className="min-w-0">
                      <span className="font-bold text-gray-900">{act.name} </span>
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
    </div>
  );
}
