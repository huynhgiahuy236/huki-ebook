import React, { useState } from 'react';
import { useToast } from '../../context/ToastContext';

export default function AdminReportsPage() {
  const { showToast } = useToast();
  const [timeRange, setTimeRange] = useState('Tháng 6/2026');

  const categories = [
    { name: 'Kinh Tế - Đầu Tư - Khởi Nghiệp', revenue: '₫843.200.000', share: 34, growth: '+28.4%', color: 'bg-[#00875A]' },
    { name: 'Văn Học - Tiểu Thuyết - Tản Văn', revenue: '₫694.400.000', share: 28, growth: '+15.2%', color: 'bg-[#06B6D4]' },
    { name: 'Tâm Lý - Kỹ Năng Sống', revenue: '₫446.400.000', share: 18, growth: '+19.8%', color: 'bg-[#3B82F6]' },
    { name: 'Thiếu Nhi & Truyện Tranh', revenue: '₫297.600.000', share: 12, growth: '+8.6%', color: 'bg-[#F59E0B]' },
    { name: 'Công Nghệ - AI & Khoa Học', revenue: '₫198.400.000', share: 8, growth: '+42.1%', color: 'bg-[#8B5CF6]' }
  ];

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto">
      
      {/* 1. TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-semibold text-gray-500">Trung Tâm Dữ Liệu &amp; Phân Tích</span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
              BÁO CÁO TOÀN DIỆN THỊ TRƯỜNG SÁCH 2026
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-0.5 font-editorial">
            Báo Cáo Phân Tích Thị Phần &amp; Hành Vi Độc Giả
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Tổng hợp dữ liệu bán lẻ sách in, tỷ lệ đọc Ebook DRM, chu kỳ giữ chân bạn đọc và cơ cấu doanh thu theo thể loại.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] text-xs font-semibold text-gray-700 shadow-2xs focus:outline-none focus:border-[#00875A]"
          >
            <option value="Tháng 6/2026">Tháng 6/2026</option>
            <option value="Quý 2/2026">Quý 2/2026</option>
            <option value="Năm 2026">Cả Năm 2026</option>
          </select>

          <button
            onClick={() => showToast('Đang tải xuống bộ báo cáo toàn diện (PDF + Excel)...', 'success')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs transition-all shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">file_download</span>
            <span>Xuất Trọn Bộ Báo Cáo</span>
          </button>
        </div>
      </div>

      {/* 2. CATEGORY MARKET SHARE & FORMAT RATIO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Category Breakdown */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-gray-900">Thị Phần Doanh Thu Theo Thể Loại</h2>
              <p className="text-[11px] text-gray-500">Tỷ lệ đóng góp vào tổng GMV ₫2.48 tỷ</p>
            </div>
            <span className="text-xs font-bold text-[#00875A]">5 Thể Loại Chính</span>
          </div>

          <div className="space-y-4 py-2">
            {categories.map((cat, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${cat.color}`}></span>
                    <span className="font-bold text-gray-800">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-gray-900">{cat.revenue}</span>
                    <span className="text-[11px] text-emerald-600 font-bold">{cat.growth}</span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div 
                    className={`h-full ${cat.color} rounded-full transition-all duration-700`}
                    style={{ width: `${cat.share}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Format Comparison & Retention */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-gray-900 mb-1">Tỷ Lệ Giữ Chân Độc Giả (Retention)</h2>
            <p className="text-[11px] text-gray-500 mb-4">Độc giả quay lại đọc sách trên App/Web HUKI sau khi mua</p>

            <div className="grid grid-cols-3 gap-3 text-center mb-6">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] uppercase font-bold text-emerald-700">D1 (Ngày 1)</span>
                <div className="text-2xl font-black text-emerald-900 mt-1">68.4%</div>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                <span className="text-[10px] uppercase font-bold text-blue-700">D7 (7 Ngày)</span>
                <div className="text-2xl font-black text-blue-900 mt-1">44.2%</div>
              </div>
              <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
                <span className="text-[10px] uppercase font-bold text-purple-700">D30 (30 Ngày)</span>
                <div className="text-2xl font-black text-purple-900 mt-1">31.8%</div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-2">
            <div className="font-bold text-gray-900">Nhận Định Chuyên Gia Phân Tích:</div>
            <p className="text-gray-600 text-[11px] leading-relaxed">
              Mô hình Hybrid (Mua sách giấy tặng bản Ebook đọc tức thì) giúp tỷ lệ mở sách ngay trong ngày đầu tăng <strong>+35%</strong> so với sách in thông thường.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
