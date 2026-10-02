"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import { voucherApi, Voucher, StoreInfo } from '@/ui/api/voucherApi';

export default function VouchersSection() {
  const { isLoggedIn } = (useAuth() || {}) as any;
  const { showToast } = useToast();
  const [vouchers, setVouchers] = useState<(Voucher & { isSaved?: boolean; store?: StoreInfo })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadFeed = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await voucherApi.getHomepageFeed();
      if (res.success && res.data?.vouchers) {
        setVouchers(res.data.vouchers);
      } else {
        setVouchers([]);
      }
    } catch {
      setVouchers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed, isLoggedIn]);

  const handleSaveVoucher = async (v: Voucher) => {
    if (!isLoggedIn) {
      showToast({ title: 'Thông báo', message: 'Vui lòng đăng nhập để lưu voucher vào ví!' }, 'warning');
      return;
    }
    setSavingId(v.id);
    try {
      const res = await voucherApi.saveVoucher(v.id);
      if (res.success) {
        showToast({ title: 'Thành công!', message: `Đã lưu voucher ${v.code} vào Ví của bạn` }, 'success');
        setVouchers((prev) =>
          prev.map((item) => (item.id === v.id ? { ...item, isSaved: true } : item))
        );
      } else {
        showToast({ title: 'Lỗi', message: (res as any)?.message || 'Không thể lưu mã' }, 'error');
      }
    } catch (err: any) {
      showToast({ title: 'Lỗi', message: err?.message || 'Không thể lưu voucher' }, 'error');
    } finally {
      setSavingId(null);
    }
  };

  const formatDiscountBadge = (type: string, value: number) => {
    if (type === 'PERCENTAGE') return `GIẢM ${value}%`;
    if (type === 'FREE_SHIPPING') return 'FREESHIP';
    if (value >= 1000) return `GIẢM ${Math.round(value / 1000)}K`;
    return `GIẢM ${value}đ`;
  };

  const formatExpiry = (expiresAt: string) => {
    try {
      const d = new Date(expiresAt);
      const now = new Date();
      const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) return 'Hôm nay hết hạn';
      if (diffDays <= 3) return `Còn ${diffDays} ngày`;
      return `HSD: ${d.toLocaleDateString('vi-VN')}`;
    } catch {
      return 'HSD: Sắp hết hạn';
    }
  };

  if (isLoading) {
    return (
      <section className="animate-pulse bg-white rounded-2xl p-4 border border-gray-100">
        <div className="h-6 w-48 bg-gray-200 rounded mb-3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  if (vouchers.length === 0) {
    return null;
  }

  return (
    <section className="bg-white rounded-2xl p-3.5 sm:p-4 border border-gray-200/90 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#003B2B] text-[22px]">confirmation_number</span>
          <h2 className="text-[14px] sm:text-[15px] font-bold text-gray-900">Mã Giảm Giá & Ưu Đãi</h2>
          <span className="hidden sm:inline text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            Dành Riêng Cho Bạn
          </span>
        </div>
        <Link
          href="/vouchers"
          className="text-[12px] text-[#003B2B] font-bold hover:underline flex items-center gap-0.5"
        >
          <span>Xem tất cả</span>
          <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {vouchers.slice(0, 4).map((voucher) => {
          const isFreeship = voucher.type === 'FREE_SHIPPING';
          const isStore = voucher.scope === 'STORE';

          return (
            <div
              key={voucher.id}
              className={`rounded-xl p-2.5 border border-dashed flex items-center justify-between gap-2 transition-all hover:shadow-sm ${
                isFreeship
                  ? 'bg-cyan-50/40 border-cyan-300 hover:border-cyan-500'
                  : isStore
                  ? 'bg-amber-50/40 border-amber-300 hover:border-amber-500'
                  : 'bg-emerald-50/40 border-emerald-300 hover:border-emerald-500'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    isFreeship
                      ? 'bg-cyan-100 text-cyan-800'
                      : isStore
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-[#003B2B]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isFreeship ? 'local_shipping' : isStore ? 'storefront' : 'percent'}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11.5px] font-black text-[#003B2B]">
                      {formatDiscountBadge(voucher.type, voucher.value)}
                    </span>
                    <span className="text-[9.5px] font-mono bg-white/90 px-1 py-0.2 rounded border border-gray-200 text-gray-700">
                      {voucher.code}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-700 font-bold truncate mt-0.5" title={voucher.name}>
                    {voucher.store?.name ? `[${voucher.store.name}] ${voucher.name}` : voucher.name}
                  </p>
                  <span className="text-[9.5px] text-gray-400 block">
                    {formatExpiry(voucher.expiresAt)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleSaveVoucher(voucher)}
                disabled={voucher.isSaved || savingId === voucher.id}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold shrink-0 transition-all ${
                  voucher.isSaved
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                    : 'bg-[#003B2B] text-white hover:bg-[#002f22] shadow-sm'
                }`}
              >
                {voucher.isSaved ? 'Đã lưu' : 'Lưu mã'}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

