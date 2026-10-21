'use client';

import React from 'react';
import Link from 'next/link';
import AccountLayout from '@/ui/components/layout/AccountLayout';

/**
 * Route /account/affiliate/dashboard
 * Production runtime implementation: Honest unavailable / in-development state.
 * No mock financial data, no hardcoded KPIs, no fake links, no state switcher.
 */
export default function AffiliateDashboardPage() {
  return (
    <AccountLayout>
      <div className="w-full space-y-6 font-sans p-2 sm:p-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Bảng Điều Khiển Đối Tác Tiếp Thị
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                Chưa mở chính thức
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Trung tâm quản trị hiệu suất, lưu lượng và hoa hồng dành cho Đối tác Tiếp thị HuKi.
            </p>
          </div>

          <Link
            href="/affiliate"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-[16px]">help</span>
            <span>Chính sách chương trình</span>
          </Link>
        </div>

        {/* Primary Status Banner */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-stone-50 via-gray-50 to-amber-50/30 border border-stone-200/90 shadow-2xs">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200">
              <span className="material-symbols-outlined text-[22px]">engineering</span>
            </div>
            <div className="space-y-1.5">
              <h2 className="text-sm font-bold text-gray-900">
                Dịch Vụ Bảng Điều Khiển Chưa Được Kích Hoạt
              </h2>
              <p className="text-xs text-gray-600 leading-relaxed max-w-3xl">
                Tính năng Bảng điều khiển đối tác tiếp thị đang được hoàn thiện và chưa mở chính thức.
                Dữ liệu hiệu suất nhấp chuột, báo cáo chuyển đổi và các chỉ số tài chính sẽ khả dụng
                khi hệ thống chính thức đi vào vận hành.
              </p>
            </div>
          </div>
        </div>

        {/* Informational Policy Specification */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">
            7 Chỉ Số Hiệu Suất Cốt Lõi Dự Kiến
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                label: 'Lượt click hợp lệ',
                desc: 'Tổng số lượt nhấp đã qua sàng lọc bot và giới hạn tần suất.',
                icon: 'ads_click',
              },
              {
                label: 'Chuyển đổi',
                desc: 'Đơn hàng đặt thành công có gắn phiên giới thiệu hợp lệ.',
                icon: 'shopping_bag',
              },
              {
                label: 'Hoa hồng chờ duyệt',
                desc: 'Hoa hồng ghi nhận từ các đơn hàng mới phát sinh thành công.',
                icon: 'hourglass_top',
              },
              {
                label: 'Đang giữ đối soát',
                desc: 'Hoa hồng trong thời gian tạm giữ theo dõi giao nhận và đổi trả.',
                icon: 'lock_clock',
              },
              {
                label: 'Hoa hồng khả dụng',
                desc: 'Hoa hồng đã hoàn tất đối soát và sẵn sàng rút về tài khoản.',
                icon: 'account_balance_wallet',
              },
              {
                label: 'Đã thanh toán (Gross)',
                desc: 'Tổng hoa hồng đã giải ngân thành công qua các kỳ thanh toán.',
                icon: 'payments',
              },
              {
                label: 'Hoa hồng đã thu hồi',
                desc: 'Hoa hồng hoàn trả do đơn hàng bị hủy hoặc phát sinh khiếu nại.',
                icon: 'history_toggle_off',
              },
            ].map((kpi, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-white border border-gray-200/80 shadow-2xs space-y-1"
              >
                <div className="flex items-center justify-between text-gray-400">
                  <span className="material-symbols-outlined text-[18px]">{kpi.icon}</span>
                  <span className="text-[10px] font-mono text-gray-400">--</span>
                </div>
                <span className="text-xs font-bold text-gray-800 block">{kpi.label}</span>
                <p className="text-[11px] text-gray-500 leading-snug">{kpi.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Safe Navigation Actions */}
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span className="text-gray-600">
            Cần tìm hiểu điều kiện tham gia và chính sách tỷ lệ hoa hồng?
          </span>
          <div className="flex items-center gap-2">
            <Link
              href="/affiliate"
              className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold transition-colors"
            >
              Xem Trang Giới Thiệu
            </Link>
            <Link
              href="/"
              className="px-3.5 py-1.5 rounded-lg bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-semibold transition-colors"
            >
              Về Trang Chủ
            </Link>
          </div>
        </div>
      </div>
    </AccountLayout>
  );
}
