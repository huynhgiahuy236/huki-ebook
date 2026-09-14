import React from 'react';

/**
 * HUKI EBOOK - Standard Order Item Badge Component
 * Displays clear visual badges for Physical Books, DRM Ebooks, and Hybrid Combos
 */
export default function OrderItemBadge({ format, type, className = '' }) {
  // Normalize format
  const fmt = (format || type || 'PHYSICAL').toUpperCase();

  if (fmt === 'DIGITAL' || fmt === 'EBOOK' || fmt === 'DRM') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0 ${className}`}
        title="Sách điện tử bản quyền DRM - Mở khóa đọc ngay sau khi thanh toán"
      >
        <span className="material-symbols-outlined text-[13px]">bolt</span>
        <span>EBOOK SỐ</span>
      </span>
    );
  }

  if (fmt === 'HYBRID' || fmt === 'BOTH' || fmt === 'COMBO') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0 ${className}`}
        title="Combo Kép: Giao sách in tận nơi + Kích hoạt Ebook tức thì"
      >
        <span className="material-symbols-outlined text-[13px]">inventory_2</span>
        <span>COMBO HYBRID</span>
      </span>
    );
  }

  // Default: Physical book
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0 ${className}`}
      title="Sách in giấy - Đóng gói và giao COD tận nhà"
    >
      <span className="material-symbols-outlined text-[13px]">local_shipping</span>
      <span>SÁCH IN GIAO TẬN NƠI</span>
    </span>
  );
}
