'use client';

import React from 'react';

export interface VerifiedPurchaseBadgeProps {
  /**
   * Optional custom text label (default: "Đã mua hàng")
   */
  label?: string;
  /**
   * Optional product format verified (e.g. "PHYSICAL", "DIGITAL")
   */
  format?: 'PHYSICAL' | 'DIGITAL' | string;
  /**
   * Visual variant: 'pill' | 'compact' | 'subtle'
   */
  variant?: 'pill' | 'compact' | 'subtle';
  /**
   * Custom CSS class name
   */
  className?: string;
}

/**
 * Task 66 — Verified Purchase Badge Component
 * Renders the canonical "Đã mua hàng" badge for authentic reviews
 * verified against completed orders (POL-13 REV-001).
 */
export default function VerifiedPurchaseBadge({
  label = 'Đã mua hàng',
  format,
  variant = 'subtle',
  className = '',
}: VerifiedPurchaseBadgeProps) {
  const formatText =
    format === 'PHYSICAL'
      ? 'Sách In'
      : format === 'DIGITAL'
      ? 'Ebook DRM'
      : format
      ? String(format)
      : null;

  if (variant === 'pill') {
    return (
      <span
        title="Đánh giá từ người mua thực tế đã hoàn tất đơn hàng"
        className={`inline-flex items-center gap-1 bg-[#006953]/10 text-[#006953] border border-[#006953]/25 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-tight select-none shadow-2xs ${className}`}
      >
        <span className="material-symbols-outlined text-[13px] leading-none font-bold">
          verified
        </span>
        <span>{label}</span>
        {formatText && (
          <>
            <span className="text-gray-300">•</span>
            <span className="text-[10px] uppercase font-bold text-[#006953]/90">
              {formatText}
            </span>
          </>
        )}
      </span>
    );
  }

  if (variant === 'compact') {
    return (
      <span
        title="Đánh giá từ người mua thực tế đã hoàn tất đơn hàng"
        className={`inline-flex items-center gap-0.5 text-[#006953] font-semibold text-[11px] select-none ${className}`}
      >
        <span className="material-symbols-outlined text-[13px] leading-none font-bold">
          verified
        </span>
        <span>{label}</span>
      </span>
    );
  }

  // Default subtle variant
  return (
    <span
      title="Đánh giá từ người mua thực tế đã nhận hàng và hoàn tất đơn hàng (POL-13)"
      className={`inline-flex items-center gap-1 text-[#006953] font-medium text-xs select-none ${className}`}
    >
      <span className="material-symbols-outlined text-sm leading-none text-[#006953] font-bold">
        verified
      </span>
      <span className="font-semibold">{label}</span>
      {formatText && (
        <span className="text-[10px] bg-[#006953]/10 text-[#006953] px-1.5 py-0.2 rounded font-bold uppercase">
          {formatText}
        </span>
      )}
    </span>
  );
}
