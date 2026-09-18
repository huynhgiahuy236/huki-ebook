"use client";

import React from 'react';
import { useToast } from '@/ui/context/ToastContext';

export function AdminIntegrationsView() {
  const { showToast } = useToast();

  const services = [
    {
      id: 'INT-01',
      name: 'VietQR Banking Gateway',
      provider: 'VietinBank / Napas 247',
      category: 'Cổng Thanh Toán Tức Thì',
      status: 'operational',
      statusLabel: 'Hoạt Động Ổn Định',
      uptime: '99.98%',
      latency: '120ms',
      icon: 'qr_code_scanner',
    },
    {
      id: 'INT-02',
      name: 'VNPAY-QR E-Commerce Gateway',
      provider: 'VNPAY Vietnam',
      category: 'Cổng Thẻ & Ví Điện Tử',
      status: 'operational',
      statusLabel: 'Hoạt Động Ổn Định',
      uptime: '99.95%',
      latency: '180ms',
      icon: 'credit_card',
    },
    {
      id: 'INT-03',
      name: 'Giao Hàng Nhanh (GHN Express)',
      provider: 'GHN API v2',
      category: 'Vận Chuyển Toàn Quốc',
      status: 'operational',
      statusLabel: 'Hoạt Động Ổn Định',
      uptime: '99.90%',
      latency: '240ms',
      icon: 'local_shipping',
    },
    {
      id: 'INT-04',
      name: 'Viettel Post Shipping API',
      provider: 'Tập Đoàn Viettel',
      category: 'Vận Chuyển Huyện Đảo',
      status: 'operational',
      statusLabel: 'Hoạt Động Ổn Định',
      uptime: '99.99%',
      latency: '150ms',
      icon: 'local_post_office',
    },
    {
      id: 'INT-05',
      name: 'Tổng Cục Thuế - e-Invoice API',
      provider: 'VNPT e-Invoice',
      category: 'Hóa Đơn Điện Tử GTGT',
      status: 'operational',
      statusLabel: 'Hoạt Động Ổn Định',
      uptime: '99.80%',
      latency: '310ms',
      icon: 'receipt_long',
    },
    {
      id: 'INT-06',
      name: 'Cloudflare R2 CDN Storage',
      provider: 'Cloudflare Global Edge',
      category: 'Hạ Tầng Tải Ebook',
      status: 'operational',
      statusLabel: 'Hoạt Động Ổn Định',
      uptime: '100%',
      latency: '8ms',
      icon: 'cloud',
    },
  ];

  const handlePingTest = (name: string) => {
    showToast?.(`Đang gửi tín hiệu kiểm tra Ping đến ${name}... Phản hồi 200 OK!`, 'success');
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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight font-editorial mt-1">
            Kết Nối Dịch Vụ Đối Tác (Third-Party Integrations)
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-3xl">
            Kiểm tra trạng thái kết nối Webhook, API Gateway ngân hàng, đơn vị vận chuyển và hệ thống xuất hóa đơn điện tử tự động.
          </p>
        </div>
      </div>

      {/* 2. INTEGRATION CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((svc) => (
          <div key={svc.id} className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px]">{svc.icon}</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  {svc.statusLabel}
                </span>
              </div>

              <div className="mt-3">
                <h3 className="font-bold text-gray-900 text-sm">{svc.name}</h3>
                <div className="text-xs text-gray-500 mt-0.5">{svc.provider}</div>
                <div className="text-[11px] text-cyan-700 font-semibold mt-1">{svc.category}</div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div>
                  <div className="text-[10px] text-gray-400 font-medium">Uptime</div>
                  <div className="font-bold text-gray-900">{svc.uptime}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 font-medium">Độ Trễ</div>
                  <div className="font-bold text-emerald-600">{svc.latency}</div>
                </div>
              </div>

              <button
                onClick={() => handlePingTest(svc.name)}
                className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-[11px] transition-colors cursor-pointer"
              >
                Ping Test
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminIntegrationsView;
