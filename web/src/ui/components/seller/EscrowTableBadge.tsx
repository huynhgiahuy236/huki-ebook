"use client";

import React, { useState, useEffect, useRef } from 'react';
import type { SellerEscrowItem } from '@/ui/api/walletApi';
import { ESCROW_CONFIG } from '@/ui/constants/escrowConfig';

export interface EscrowTableBadgeProps {
  item: SellerEscrowItem;
  onAutoRelease?: (item: SellerEscrowItem) => void;
}

/**
 * HUKI EBOOK - Escrow Table Status Badge
 * - Đơn chưa giao: Hiển thị "Đang Vận Chuyển (Tạm Giữ)"
 * - Đơn đã giao: Đếm ngược thời gian thực theo cấu hình ESCROW_CONFIG
 * - Hết thời hạn: Tự động chuyển màu xanh "Đã Vào Ví" và kích hoạt onAutoRelease
 */
export default function EscrowTableBadge({ item, onAutoRelease }: EscrowTableBadgeProps) {
  const isDelivered =
    item.orderStatus === 'DELIVERED' ||
    item.orderStatus === 'COMPLETED' ||
    Boolean(item.deliveredAt);

  const calculateRemaining = () => {
    if (item.escrowStatus === 'RELEASED') return 0;
    if (!isDelivered) return ESCROW_CONFIG.HOLD_DURATION_SECONDS;

    const startTimestamp = new Date(item.deliveredAt || item.orderCreatedAt).getTime();
    if (isNaN(startTimestamp) || startTimestamp <= 0) return ESCROW_CONFIG.HOLD_DURATION_SECONDS;

    const elapsed = Math.floor((Date.now() - startTimestamp) / 1000);
    return Math.max(0, ESCROW_CONFIG.HOLD_DURATION_SECONDS - elapsed);
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

  // 0. ĐƠN ĐÃ HỦY
  if (item.escrowStatus === ('CANCELLED' as any) || item.orderStatus === 'CANCELLED') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
        <span className="material-symbols-outlined text-[13px]">cancel</span>
        <span>Đơn Đã Hủy</span>
      </span>
    );
  }

  // 1. ĐÃ GIẢI NGÂN (Hoàn tất đổi trả hoặc hết thời hạn bảo chứng)
  if (isCompleted || item.escrowStatus === 'RELEASED') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
        <span className="material-symbols-outlined text-[13px]">check_circle</span>
        <span>Đã Vào Ví</span>
      </span>
    );
  }

  // 2. CHỜ SHOP XÁC NHẬN / ĐÓNG GÓI
  if (
    item.escrowStatus === ('PENDING_CONFIRMATION' as any) ||
    item.orderStatus === 'PENDING_CONFIRMATION' ||
    item.orderStatus === 'CONFIRMED' ||
    item.orderStatus === 'PREPARING'
  ) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
        <span className="material-symbols-outlined text-[13px]">inventory_2</span>
        <span>Chờ Đóng Gói</span>
      </span>
    );
  }

  // 3. ĐANG VẬN CHUYỂN
  if (item.escrowStatus === 'PENDING_PAYMENT') {
    const isOnlineUnpaid = item.paymentMethod !== 'COD' && item.paymentStatus !== 'SUCCEEDED';
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
        <span className="material-symbols-outlined text-[13px]">{isOnlineUnpaid ? 'payment' : 'local_shipping'}</span>
        <span>{isOnlineUnpaid ? 'Chờ Thanh Toán' : 'Đang Vận Chuyển'}</span>
      </span>
    );
  }

  // 4. KHIẾU NẠI ĐÓNG BĂNG
  if (item.escrowStatus === 'FROZEN') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
        <span className="material-symbols-outlined text-[13px]">lock</span>
        <span>Đóng Băng Khiếu Nại</span>
      </span>
    );
  }

  // 5. HOLDING NHƯNG CHƯA GIAO XONG
  if (!isDelivered) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
        <span className="material-symbols-outlined text-[13px]">local_shipping</span>
        <span>Đang Vận Chuyển</span>
      </span>
    );
  }

  // 6. ĐÃ GIAO HÀNG VÀ ĐANG ĐẾM NGƯỢC THỜI HẠN BẢO CHỨNG ĐỔI TRẢ
  const formatRemainingTime = (totalSec: number) => {
    if (totalSec >= 86400) {
      const days = Math.floor(totalSec / 86400);
      const hours = Math.floor((totalSec % 86400) / 3600);
      return `${days}d ${hours}h`;
    }
    const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const ss = String(totalSec % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200 font-mono shadow-2xs" title={`Đang trong thời hạn bảo chứng ${ESCROW_CONFIG.DURATION_LABEL}`}>
      <span className="material-symbols-outlined text-[13px] text-purple-600 animate-spin">hourglass_bottom</span>
      <span>Bảo Chứng ({formatRemainingTime(secondsLeft)})</span>
    </span>
  );
}
