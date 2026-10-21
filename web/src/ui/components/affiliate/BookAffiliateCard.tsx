'use client';

import React from 'react';

export interface BookAffiliateCardProps {
  bookId: string;
  bookTitle: string;
  price?: number;
  estimatedRatePercent?: number;
  isActivated?: boolean;
  activeShortLink?: string | null;
}

/**
 * Presentational card for Book Affiliate sharing.
 * In Phase 1 (no backend), it operates strictly in presentational / unactivated mode.
 * Mounted only in controlled test environments, not on production routes.
 */
export default function BookAffiliateCard({
  bookId: _bookId,
  bookTitle: _bookTitle,
  price = 150000,
  estimatedRatePercent = 10,
  isActivated = false,
  activeShortLink = null,
}: BookAffiliateCardProps) {
  const estimatedCommission = Math.round((price * estimatedRatePercent) / 100);

  return (
    <div className="mt-3.5 p-3.5 bg-gradient-to-br from-gray-50 via-gray-50/50 to-white rounded-2xl border border-gray-200 shadow-2xs">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gray-200 text-gray-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px]">share</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-gray-900">
                Chia sẻ &amp; Nhận hoa hồng
              </span>
              <span className="inline-flex items-center px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 text-[9.5px] font-bold">
                Chưa kích hoạt
              </span>
            </div>
            <p className="text-[11px] text-gray-600 mt-0.5">
              Hoa hồng dự kiến:{' '}
              <strong className="text-gray-700 font-bold text-xs">
                ~{estimatedCommission.toLocaleString('vi-VN')}₫
              </strong>{' '}
              ({estimatedRatePercent}%)
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3">
        {isActivated && activeShortLink ? (
          <div className="flex items-center gap-1.5 p-1.5 bg-white border border-gray-300 rounded-xl">
            <input
              type="text"
              readOnly
              value={activeShortLink}
              className="flex-1 text-[11px] font-mono text-gray-700 bg-transparent border-none outline-none select-all min-w-0"
            />
          </div>
        ) : (
          <div className="p-2.5 rounded-xl bg-gray-100 border border-gray-200 text-center">
            <p className="text-xs font-medium text-gray-600 flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-gray-400">lock</span>
              Tính năng liên kết sách chưa được kích hoạt
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">
              Chỉ mở khi tài khoản có tư cách CTV ACTIVE và sản phẩm được thiết lập chính sách hoa hồng thật.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
