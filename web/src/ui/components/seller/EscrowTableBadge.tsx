"use client";

import React, { useState, useEffect, useRef } from 'react';
import type { SellerEscrowItem } from '@/ui/api/walletApi';

export interface EscrowTableBadgeProps {
  item: SellerEscrowItem;
  onAutoRelease?: (item: SellerEscrowItem) => void;
}

/**
 * HUKI EBOOK - Escrow Table Status Badge (Shopee-Standard 2-Minute Return Window)
 * - Đơn chưa giao: Hiển thị "Đang Giao Hàng (Tạm Giữ)"
 * - Đơn đã giao: Đếm ngược thời gian thực (mm:ss) 120 giây (2 phút)
 * - Hết 2 phút: Tự động chuyển màu xanh "Đã Giải Ngân" và kích hoạt onAutoRelease
 */
export default function EscrowTableBadge({ item, onAutoRelease }: EscrowTableBadgeProps) {
  const isDelivered =
    item.orderStatus === 'DELIVERED' ||
    item.orderStatus === 'COMPLETED' ||
    Boolean(item.deliveredAt);

  const calculateRemaining = () => {
    if (item.escrowStatus === 'RELEASED') return 0;
    if (!isDelivered) return 120;

    const startTimestamp = new Date(item.deliveredAt || item.orderCreatedAt).getTime();
    if (isNaN(startTimestamp) || startTimestamp <= 0) return 120;

    const elapsed = Math.floor((Date.now() - startTimestamp) / 1000);
    return Math.max(0, 120 - elapsed);
  };

  const [secondsLeft, setSecondsLeft] = useState<number>(calculateRemaining);
  const [isCompleted, setIsCompleted] = useState<boolean>(
    item.escrowStatus === 'RELEASED' || (isDelivered && calculateRemaining() <= 0)
  );
  const autoTriggeredRef = useRef(false);

  useEffect(() => {
    if (item.escrowStatus === 'RELEASED') {
      setIsCompleted(true);
      setSecondsLeft(0);
    } else {
      const remaining = calculateRemaining();
      setSecondsLeft(remaining);
      if (isDelivered && remaining <= 0) {
        setIsCompleted(true);
      }
    }
  }, [item.escrowStatus, item.orderStatus, item.deliveredAt, isDelivered]);

  useEffect(() => {
    if (isCompleted || !isDelivered || item.escrowStatus !== 'HOLDING') {
      return;
    }

    const timer = setInterval(() => {
      const remaining = calculateRemaining();
      setSecondsLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timer);
        setIsCompleted(true);
        if (!autoTriggeredRef.current) {
          autoTriggeredRef.current = true;
          onAutoRelease?.(item);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isCompleted, isDelivered, item.escrowStatus, onAutoRelease, item]);

  // 1. ĐÃ GIẢI NGÂN (Hoàn tất đổi trả hoặc hết 2 phút)
  if (isCompleted || item.escrowStatus === 'RELEASED') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="material-symbols-outlined text-[13px]">check_circle</span>
        <span>Đã Giải Ngân</span>
      </span>
    );
  }

  // 2. CHỜ THU COD
  if (item.escrowStatus === 'PENDING_PAYMENT') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
        <span className="material-symbols-outlined text-[13px]">local_shipping</span>
        <span>Đang Giao Hàng</span>
      </span>
    );
  }

  // 3. KHIẾU NẠI ĐÓNG BĂNG
  if (item.escrowStatus === 'FROZEN') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
        <span className="material-symbols-outlined text-[13px]">lock</span>
        <span>Khiếu Nại Đóng Băng</span>
      </span>
    );
  }

  // 4. HOLDING NHƯNG CHƯA GIAO XONG
  if (!isDelivered) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
        <span className="material-symbols-outlined text-[13px]">local_shipping</span>
        <span>Đang Giao Hàng (Tạm Giữ)</span>
      </span>
    );
  }

  // 5. ĐÃ GIAO HÀNG VÀ ĐANG ĐẾM NGƯỢC 2 PHÚT ĐỔI TRẢ
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 font-mono shadow-2xs">
      <span className="material-symbols-outlined text-[13px] text-amber-600">hourglass_bottom</span>
      <span>Ký Quỹ Đổi Trả ({mm}:{ss})</span>
    </span>
  );
}
