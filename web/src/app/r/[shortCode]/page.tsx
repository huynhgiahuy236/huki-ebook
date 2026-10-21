import React from 'react';
import Link from 'next/link';

interface RedirectPageProps {
  params: Promise<{ shortCode: string }>;
}

/**
 * Route /r/[shortCode]: Short link resolver placeholder.
 * In Phase 1, attribution resolution and short-code redirect are NOT active.
 * Real implementation will be connected in Phase 5 when backend lookup,
 * signed nonce, and AttributionSession endpoints are fully deployed.
 */
export default async function AffiliateRedirectPage({ params }: RedirectPageProps) {
  const { shortCode } = await params;

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 text-center shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
          <span className="material-symbols-outlined text-[32px]">link_off</span>
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Liên Kết Chưa Được Kích Hoạt
        </h1>

        <p className="text-xs font-mono text-gray-500 bg-gray-100 py-1 px-2 rounded-md inline-block mb-3">
          Mã liên kết: {shortCode}
        </p>

        <p className="text-sm text-gray-600 leading-relaxed mb-6">
          Dịch vụ phân giải liên kết tiếp thị liên kết và ghi nhận phiên giới thiệu
          đang trong lộ trình phát triển. Hệ thống chưa hỗ trợ chuyển hướng tự động
          cho đến khi các dịch vụ backend hoàn tất.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold transition-colors"
          >
            Về Trang Chủ HuKi
          </Link>
          <Link
            href="/affiliate"
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors"
          >
            Tìm Hiểu Về Tiếp Thị
          </Link>
        </div>
      </div>
    </div>
  );
}
