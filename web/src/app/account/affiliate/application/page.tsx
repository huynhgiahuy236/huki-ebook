'use client';

import React from 'react';
import Link from 'next/link';
import AccountLayout from '@/ui/components/layout/AccountLayout';

/**
 * Route /account/affiliate/application
 * Production runtime implementation: Honest unactivated / lookup-unavailable state.
 * Does not assert whether the user has or does not have a profile since backend lookup is not active.
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
                Chưa thể tra cứu
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
            <span>Chính sách chương trình</span>
          </Link>
        </div>

        {/* Primary Honest Status Card */}
        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-2xs text-center max-w-xl mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto border border-amber-200">
            <span className="material-symbols-outlined text-[30px]">pending</span>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-gray-900">
              Chưa Thể Tải Trạng Thái Hồ Sơ
            </h2>
            <p className="text-xs text-gray-600 leading-relaxed">
              Dịch vụ tra cứu trạng thái hồ sơ đối tác tiếp thị đang được hoàn thiện và chưa mở chính thức.
              Hệ thống hiện tại chưa thể kết nối dịch vụ dữ liệu để kiểm tra tình trạng hồ sơ của bạn.
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

        {/* Informational SLA Timeline (Policy specification only) */}
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            Quy Trình Xét Duyệt Dự Kiến (SLA 24h - 48h làm việc)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-white rounded-lg border border-gray-200/80 space-y-1">
              <span className="font-bold text-gray-800 block">1. Tiếp Nhận Hồ Sơ</span>
              <p className="text-gray-500 text-[11px]">
                Kiểm tra tính đầy đủ của thông tin định danh, danh sách kênh phân phối và cam kết tuân thủ chính sách.
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-gray-200/80 space-y-1">
              <span className="font-bold text-gray-800 block">2. Đánh Giá Kênh</span>
              <p className="text-gray-500 text-[11px]">
                Đội ngũ kiểm duyệt rà soát tính xác thực của kênh truyền thông và nguồn lưu lượng khai báo.
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-gray-200/80 space-y-1">
              <span className="font-bold text-gray-800 block">3. Kích Hoạt Quyền Lợi</span>
              <p className="text-gray-500 text-[11px]">
                Mở quyền tạo liên kết chia sẻ và truy cập Bảng điều khiển hiệu suất khi hồ sơ được phê duyệt.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AccountLayout>
  );
}
