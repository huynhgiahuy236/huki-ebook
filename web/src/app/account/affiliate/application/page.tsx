'use client';

import React from 'react';
import Link from 'next/link';
import AccountLayout from '@/ui/components/layout/AccountLayout';

/**
 * Route /account/affiliate/application
 * Production runtime implementation: Honest unavailable / no-profile state.
 * No hardcoded profiles, no fake status switcher, no setTimeout.
 * Real application tracking will be integrated in Phase 3 when backend review APIs are deployed.
 */
export default function AffiliateApplicationStatusPage() {
  return (
    <AccountLayout>
      <div className="w-full space-y-6 font-sans p-2 sm:p-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Tiến Độ Hồ Sơ Tiếp Thị Liên Kết
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                Chưa có hồ sơ
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Theo dõi tình trạng phê duyệt và phản hồi từ ban quản trị nền tảng HuKi.
            </p>
          </div>

          <Link
            href="/affiliate"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-[16px]">info</span>
            <span>Điều kiện tham gia</span>
          </Link>
        </div>

        {/* Primary Honest Status Card */}
        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-2xs text-center max-w-xl mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 text-gray-500 flex items-center justify-center mx-auto border border-gray-200">
            <span className="material-symbols-outlined text-[30px]">assignment_late</span>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-gray-900">
              Chưa Tìm Thấy Hồ Sơ Đăng Ký
            </h2>
            <p className="text-xs text-gray-600 leading-relaxed">
              Bạn hiện chưa có hồ sơ đăng ký đối tác tiếp thị nào trên hệ thống,
              hoặc cổng tiếp nhận hồ sơ chính thức đang trong quá trình chuẩn bị kỹ thuật (Giai đoạn 3).
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
            <Link
              href="/account/affiliate/register"
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors"
            >
              Xem Mẫu Đăng Ký Đối Tác
            </Link>
            <Link
              href="/affiliate"
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors"
            >
              Chính Sách Chương Trình
            </Link>
          </div>
        </div>

        {/* Informational SLA Timeline (Policy specification only, no fake data) */}
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            Quy Trình Xét Duyệt Tiêu Chuẩn (SLA 24h - 48h làm việc)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-white rounded-lg border border-gray-200/80 space-y-1">
              <span className="font-bold text-gray-800 block">1. Nộp Hồ Sơ (PENDING)</span>
              <p className="text-gray-500 text-[11px]">
                Kiểm tra thông tin định danh, danh sách kênh phân phối và cam kết tuân thủ chính sách nội dung.
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-gray-200/80 space-y-1">
              <span className="font-bold text-gray-800 block">2. Đánh Giá Kênh (REVIEW)</span>
              <p className="text-gray-500 text-[11px]">
                Đội ngũ kiểm duyệt rà soát tính xác thực của kênh quảng bá và nguồn lưu lượng khai báo.
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-gray-200/80 space-y-1">
              <span className="font-bold text-gray-800 block">3. Kích Hoạt (ACTIVE)</span>
              <p className="text-gray-500 text-[11px]">
                Cấp quyền tạo liên kết rút gọn, mở truy cập Bảng điều khiển hiệu suất và theo dõi hoa hồng.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AccountLayout>
  );
}
