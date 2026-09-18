"use client";

import React, { useState, useEffect } from 'react';
import { catalogApi, toCatalogBook } from '@/ui/api/catalogApi';

interface Voucher {
  code: string;
  title: string;
  description: string;
  discount: string;
  minSpend: number;
  expiresAt: string;
  icon: string;
}

export default function VouchersSection() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [savedCodes, setSavedCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch vouchers from voucherApi when available
    // For now, use placeholder data
    setVouchers([
      {
        code: 'HUKIFREESHIP',
        title: 'Miễn phí vận chuyển 100%',
        description: 'Đơn từ 150.000₫ • Toàn quốc',
        discount: 'FREESHIP',
        minSpend: 150000,
        expiresAt: '31/12/2026',
        icon: 'local_shipping',
      },
      {
        code: 'HUKI25K',
        title: 'Giảm 25.000₫ đơn đầu',
        description: 'Đơn từ 120.000₫ • Khách mới',
        discount: 'GIẢM 25K',
        minSpend: 120000,
        expiresAt: 'Còn 5 ngày',
        icon: 'redeem',
      },
      {
        code: 'HUKICOMBO60',
        title: 'Giảm 60.000₫ khi mua Combo',
        description: 'Áp dụng cho Combo từ 300k',
        discount: 'GIẢM 60K',
        minSpend: 300000,
        expiresAt: '15/10/2026',
        icon: 'auto_awesome',
      },
      {
        code: 'EBOOK50',
        title: 'Giảm 50% mọi Ebook bản quyền',
        description: 'Tối đa 40.000₫',
        discount: 'EBOOK 50%',
        minSpend: 0,
        expiresAt: 'Còn 2 ngày',
        icon: 'menu_book',
      },
    ]);
    setIsLoading(false);
  }, []);

  const handleSaveVoucher = (code: string) => {
    if (savedCodes.includes(code)) return;
    setSavedCodes(prev => [...prev, code]);
    // TODO: Call API to save voucher
  };

  if (isLoading) {
    return (
      <section className="animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  if (vouchers.length === 0) {
    return null;
  }

  return (
    <section className="bg-white rounded-2xl p-3.5 sm:p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#003B2B] text-[20px]">confirmation_number</span>
          <h2 className="text-[14px] sm:text-[15px] font-bold text-gray-900">Mã Giảm Giá & Ưu Đãi</h2>
        </div>
        <span className="text-[12px] text-gray-500 font-semibold">Tự động áp dụng khi thanh toán</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {vouchers.map((voucher) => {
          const isSaved = savedCodes.includes(voucher.code);
          return (
            <div
              key={voucher.code}
              className="bg-gray-50 rounded-xl p-2.5 border border-dashed border-gray-300 flex items-center justify-between gap-2 hover:border-[#003B2B]/50 transition-all"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#003B2B]/10 text-[#003B2B] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">{voucher.icon}</span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] font-bold text-[#003B2B]">{voucher.discount}</span>
                    <span className="text-[10px] font-mono bg-gray-200 px-1 py-0.2 rounded text-gray-600">{voucher.code}</span>
                  </div>
                  <p className="text-[11px] text-gray-600 font-medium truncate">{voucher.title}</p>
                  <span className="text-[9.5px] text-gray-400 block">HSD: {voucher.expiresAt}</span>
                </div>
              </div>

              <button
                onClick={() => handleSaveVoucher(voucher.code)}
                disabled={isSaved}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold shrink-0 transition-all ${
                  isSaved
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-[#003B2B] text-white hover:bg-[#002f22] shadow-sm'
                }`}
              >
                {isSaved ? 'Đã lưu' : 'Lưu mã'}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
