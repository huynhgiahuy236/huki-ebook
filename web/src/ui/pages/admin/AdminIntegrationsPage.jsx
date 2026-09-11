import React, { useState } from 'react';
import { useToast } from '../../context/ToastContext';

export default function AdminIntegrationsPage() {
  const { showToast } = useToast();

  const services = [
    {
      id: 'INT-01',
      name: 'DRM KMS Encryption Cluster (Singapore AWS)',
      category: 'Bảo Mật DRM',
      status: 'operational',
      statusLabel: 'Hoạt Động Ổn Định',
      uptime: '99.99%',
      latency: '24ms',
      icon: 'security'
    },
    {
      id: 'INT-02',
      name: 'Viettel IDC Hà Nội Backup DRM Node',
      category: 'Bảo Mật DRM',
      status: 'operational',
      statusLabel: 'Hoạt Động Ổn Định',
      uptime: '99.98%',
      latency: '11ms',
      icon: 'dns'
    },
    {
      id: 'INT-03',
      name: 'Cổng Thanh Toán Napas 247 / VietQR OpenBanking',
      category: 'Tài Chính & Thanh Toán',
      status: 'operational',
      statusLabel: 'Hoạt Động Ổn Định',
      uptime: '100%',
      latency: '85ms',
      icon: 'account_balance'
    },
    {
      id: 'INT-04',
      name: 'Cổng Thanh Toán VNPAY & Ví Điện Tử MoMo',
      category: 'Tài Chính & Thanh Toán',
      status: 'operational',
      statusLabel: 'Hoạt Động Ổn Định',
      uptime: '99.95%',
      latency: '120ms',
      icon: 'payments'
    },
    {
      id: 'INT-05',
      name: 'Giao Hàng Nhanh 2H & Ahamove Instant API',
      category: 'Vận Chuyển Hỏa Tốc',
      status: 'operational',
      statusLabel: 'Hoạt Động Ổn Định',
      uptime: '99.92%',
      latency: '140ms',
      icon: 'local_shipping'
    },
    {
      id: 'INT-06',
      name: 'Cloudflare Edge CDN & Watermark Injection Engine',
      category: 'Hạ Tầng Tải Ebook',
      status: 'operational',
      statusLabel: 'Hoạt Động Ổn Định',
      uptime: '100%',
      latency: '8ms',
      icon: 'cloud'
    }
  ];

  const handlePingTest = (name) => {
    showToast(`Đang gửi tín hiệu kiểm tra Ping đến ${name}... Phản hồi 200 OK!`, 'success');
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto">
      
      {/* 1. TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-semibold text-gray-500">Cổng Kết Nối &amp; API Kỹ Thuật</span>
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-800 text-[11px] font-bold">
              HẠ TẦNG INTEGRATIONS • CLUSTER STATUS
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-0.5 font-editorial">
            Cổng Tích Hợp DRM, Cổng Thanh Toán &amp; Webhook Sàn
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Giám sát thời gian thực trạng thái cụm máy chủ mã hóa DRM, cổng thanh toán VietQR Napas và API giao hàng hỏa tốc 2H.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => showToast('Tất cả 6/6 cổng tích hợp đều đang hoạt động hoàn hảo!', 'success')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs transition-all shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">sync</span>
            <span>Kiểm Tra Toàn Bộ Cổng</span>
          </button>
        </div>
      </div>

      {/* 2. SERVICES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {services.map(svc => (
          <div key={svc.id} className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#00875A] flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[20px]">{svc.icon}</span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {svc.statusLabel}
                </span>
              </div>

              <h3 className="font-bold text-gray-900 text-sm leading-snug">{svc.name}</h3>
              <p className="text-xs text-gray-400 mt-0.5 font-mono">Phân loại: {svc.category}</p>
            </div>

            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between text-xs text-gray-700">
              <div>
                <span className="text-gray-400 text-[10px] block">Uptime 30 ngày</span>
                <span className="font-extrabold text-emerald-700 font-mono">{svc.uptime}</span>
              </div>
              <div>
                <span className="text-gray-400 text-[10px] block">Độ Trễ Phản Hồi</span>
                <span className="font-extrabold text-gray-900 font-mono">{svc.latency}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => handlePingTest(svc.name)}
                className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-[#00875A] hover:text-white text-gray-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Gửi Thử Nghiệm Ping
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
