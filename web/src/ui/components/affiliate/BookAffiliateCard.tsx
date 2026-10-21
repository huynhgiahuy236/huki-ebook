'use client';

import React from 'react';

export interface BookAffiliateCardProps {
  bookId: string;
  bookTitle: string;
}

/**
 * Presentational card for Book Affiliate sharing (Phase 1).
 *
 * SPECIFICATION & GOVERNANCE:
 * - In Phase 1, this component is purely unactivated/presentational.
 * - Does not accept price, rate, or activeShortLink.
 * - Absolutely NO frontend calculations of commission, NO Math.round, NO money arithmetic.
 * - When implemented for real in Phase 5–6:
 *     1. UI will receive `estimatedCommissionAmount` calculated directly by backend services.
 *     2. Backend applies commission base, policy snapshot, and Math.floor per AFF-DEC.
 *     3. Frontend must never calculate financial figures locally.
 * - Component is NOT mounted on production /book/[id] routes in Phase 1.
 */
export default function BookAffiliateCard({
  bookId: _bookId,
  bookTitle: _bookTitle,
}: BookAffiliateCardProps) {
  return (
    <div className="mt-3.5 p-3.5 bg-gradient-to-br from-gray-50 via-gray-50/50 to-white rounded-2xl border border-gray-200 shadow-2xs font-sans">
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
            <p className="text-[10.5px] text-gray-500 mt-0.5">
              Tỷ lệ và mức hoa hồng sẽ được hệ thống xác định theo chính sách bán hàng khi tính năng mở chính thức.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <div className="p-2.5 rounded-xl bg-gray-100 border border-gray-200 text-center">
          <p className="text-xs font-medium text-gray-600 flex items-center justify-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-gray-400">lock</span>
            Tính năng chia sẻ tiếp thị chưa được kích hoạt
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Liên kết chia sẻ sẽ chỉ khả dụng khi tài khoản có tư cách đối tác hợp lệ và sản phẩm được thiết lập chính sách hoa hồng.
          </p>
        </div>
      </div>
    </div>
  );
}
