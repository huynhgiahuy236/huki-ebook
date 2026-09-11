import React, { useState } from 'react';
import { useToast } from '../../context/ToastContext';

export default function AdminCalendarPage() {
  const { showToast } = useToast();

  const events = [
    {
      id: 'EVT-01',
      title: 'Hội Sách Quốc Tế TP.HCM - Gian Hàng HUKI Hybrid Ebook',
      date: '15/06/2026 - 21/06/2026',
      time: '08:00 - 22:00 Hàng ngày',
      location: 'Công viên Tao Đàn, Quận 1, TP.HCM',
      type: 'offline_fair',
      typeLabel: 'Hội Sách Offline',
      color: 'bg-emerald-500',
      publisher: 'Toàn sàn HUKI x 24 NXB Đối Tác'
    },
    {
      id: 'EVT-02',
      title: 'Mở Bán Early Access: Bộ Sách Trí Tuệ Nhân Tạo 2030',
      date: '18/06/2026',
      time: '00:00 - 23:59',
      location: 'Trực Tuyến Sàn HUKI Store',
      type: 'exclusive_launch',
      typeLabel: 'Ra Mắt Độc Quyền',
      color: 'bg-blue-500',
      publisher: 'First News - Trí Việt'
    },
    {
      id: 'EVT-03',
      title: 'Kỳ Đối Soát Doanh Thu & Giải Ngân VietQR Tháng 6 (Đợt 1)',
      date: '20/06/2026',
      time: '09:00 Sáng',
      location: 'Hệ Thống Tự Động HUKI Pay',
      type: 'finance_settlement',
      typeLabel: 'Đối Soát Tài Chính',
      color: 'bg-amber-500',
      publisher: 'Phòng Kế Toán HUKI'
    },
    {
      id: 'EVT-04',
      title: 'Bảo Trì & Nâng Cấp Cụm Máy Chủ DRM Singapore KMS',
      date: '25/06/2026',
      time: '02:00 - 04:00 Sáng (Dự kiến)',
      location: 'Cloudflare Edge & AWS KMS SG',
      type: 'maintenance',
      typeLabel: 'Bảo Trì Kỹ Thuật',
      color: 'bg-purple-500',
      publisher: 'Đội Ngũ Kỹ Thuật Sàn'
    }
  ];

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto">
      
      {/* 1. TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-semibold text-gray-500">Kế Hoạch &amp; Lịch Trình</span>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
              LỊCH TRÌNH VẬN HÀNH TOÀN SÀN
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-0.5 font-editorial">
            Lịch Sự Kiện Xuất Bản &amp; Hoạt Động Hệ Thống
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Theo dõi tiến độ hội sách offline, đợt mở bán sách bản quyền độc quyền, chu kỳ quyết toán và lịch bảo trì cụm máy chủ DRM.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => showToast('Mở biểu mẫu thêm sự kiện vận hành mới...', 'info')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs transition-all shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add_task</span>
            <span>Tạo Sự Kiện Mới</span>
          </button>
        </div>
      </div>

      {/* 2. EVENT LIST CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {events.map(item => (
          <div key={item.id} className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                  <span className={`w-2 h-2 rounded-full ${item.color}`}></span>
                  {item.typeLabel}
                </span>
                <span className="text-xs font-mono text-gray-400">#{item.id}</span>
              </div>

              <h3 className="text-base font-bold text-gray-900 leading-snug">{item.title}</h3>
              <p className="text-xs text-[#00875A] font-semibold mt-1">Đơn vị chủ trì: {item.publisher}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-gray-400">calendar_month</span>
                <span className="font-semibold text-gray-800">{item.date}</span>
                <span className="text-gray-400">·</span>
                <span>{item.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-gray-400">location_on</span>
                <span>{item.location}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => showToast(`Đã đồng bộ sự kiện ${item.id} vào Google Calendar của ban quản trị`, 'success')}
                className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[15px]">event</span>
                <span>Đồng Bộ Calendar</span>
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
